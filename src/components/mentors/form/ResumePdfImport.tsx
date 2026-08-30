import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MentorFormData } from "@/hooks/useMentorForm";
import { extractDocumentText } from "@/lib/pdfTextExtract";
import PdfParsingModal, { type ParsingStage } from "./PdfParsingModal";
import {
  startParsingSession,
  updateParsingProgress,
  completeParsingSession,
  failParsingSession,
  markParsingSessionApplied,
  clearParsingSession,
  getActiveParsingSession,
  subscribeToParsingSession,
} from "@/lib/resumeParserSession";

interface ResumePdfImportProps {
  onImported: (data: Record<string, any>) => void;
  /** "basic" skips the tagline/outcomes/AMA/ideal-mentees/projects fields this caller
   * doesn't read, so Gemini generates less and returns faster. Defaults to
   * "full" for callers (like the profile setup studio) that use all of it. */
  fields?: "basic" | "full";
  /** Overrides the button label (default "Upload Resume"). */
  buttonLabel?: string;
  /** Layout mode: 'card' renders the full dashed box; 'button' renders just the trigger button. Default: 'card' */
  variant?: "card" | "button";
  className?: string;
}

const MAX_SIZE_MB = 10;
// Below this, treat extraction as having failed (scanned/image-only PDF) and
// fall back to uploading the raw file for Gemini's document-vision path.
const MIN_TEXT_CHARS_FOR_TEXT_MODE = 120;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:application/pdf;base64,"
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ACCEPTED_FILE_TYPES =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ResumePdfImport = ({
  onImported,
  fields = "full",
  buttonLabel = "Upload Resume",
  variant = "card",
  className = "",
}: ResumePdfImportProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parsing Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [parsingStage, setParsingStage] = useState<ParsingStage>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync with active background session if present
  useEffect(() => {
    const active = getActiveParsingSession();
    if (active && active.status === "parsing") {
      setFileName(active.fileName);
      setFileSizeBytes(active.fileSizeBytes);
      setParsingStage(active.stage);
      setModalOpen(true);
      setIsLoading(true);
    }

    const unsubscribe = subscribeToParsingSession((session) => {
      if (!session) {
        setIsLoading(false);
        return;
      }
      if (session.status === "parsing") {
        setFileName(session.fileName);
        setFileSizeBytes(session.fileSizeBytes);
        setParsingStage(session.stage);
        setIsLoading(true);
      } else if (session.status === "error") {
        setParsingStage("error");
        setErrorMessage(session.errorMessage || "Failed to parse resume");
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be reselected
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx");

    if (!isPdf && !isDocx) {
      toast.error("Please upload a PDF or Word (.docx) document");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be smaller than ${MAX_SIZE_MB}MB`);
      return;
    }

    setFileName(file.name);
    setFileSizeBytes(file.size);
    setErrorMessage("");
    setParsingStage("reading");
    setModalOpen(true);
    setIsLoading(true);

    // Initialize global session tracking for background & navigation resilience
    startParsingSession(file.name, file.size);

    try {
      // Step 1: Extract text from PDF or Word (.docx) document
      const { text: extractedText, fileType } = await extractDocumentText(file);

      setParsingStage("analyzing");
      updateParsingProgress("analyzing", 55, "Extracting skills, domains & projects...");

      let body: Record<string, any>;
      if (fileType === "docx") {
        if (!extractedText || extractedText.length < 20) {
          throw new Error(
            "Could not extract readable text from this Word document. Please ensure it has text or export to PDF."
          );
        }
        body = { pdfText: extractedText, mimeType: "text/plain", fields };
      } else {
        const useTextMode = extractedText.length >= MIN_TEXT_CHARS_FOR_TEXT_MODE;
        body = useTextMode
          ? { pdfText: extractedText, mimeType: file.type, fields }
          : { pdfBase64: await fileToBase64(file), mimeType: file.type, fields };
      }

      // Step 2 & 3: Run Gemini AI parser on Edge Function with automatic retry on network drops
      updateParsingProgress("synthesizing", 76, "Synthesizing bio, outcomes & AMA topics...");

      let extractedData: Record<string, any> | null = null;
      let lastErr: unknown = null;
      const MAX_RETRIES = 2;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke("parse-linkedin-pdf", { body });

          if (error) {
            let msg = error.message;
            try {
              if ("context" in error && typeof (error as any).context?.json === "function") {
                const errJson = await (error as any).context.json();
                if (errJson?.error) msg = errJson.error;
              }
            } catch {}

            // Don't retry on auth or explicit validation errors
            if (msg.includes("Authentication required") || msg.includes("PDF is too large")) {
              throw new Error(msg);
            }
            throw new Error(msg);
          }

          if (data?.error) throw new Error(data.error);
          if (!data?.data) throw new Error("No data returned from parser");

          extractedData = data.data as Record<string, any>;
          break;
        } catch (callErr: any) {
          lastErr = callErr;
          const isNetworkError =
            callErr?.message?.includes("Failed to send a request") ||
            callErr?.message?.includes("Failed to fetch") ||
            callErr?.message?.includes("NetworkError") ||
            callErr?.name === "FunctionsFetchError";

          if (isNetworkError && attempt < MAX_RETRIES) {
            console.warn(`Resume parser attempt ${attempt} network error, retrying in 1.5s...`);
            updateParsingProgress("synthesizing", 80, "Re-connecting to AI parser...");
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          break;
        }
      }

      if (!extractedData) {
        let msg = lastErr instanceof Error ? lastErr.message : "Failed to parse document";
        if (
          msg.includes("Failed to send a request") ||
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("FunctionsFetchError")
        ) {
          msg =
            "Connection to the AI resume parser was interrupted or timed out. Please check your internet connection and try again.";
        }
        throw new Error(msg);
      }

      setParsingStage("synthesizing");

      const extracted = extractedData;

      // Clean skills to strip degree titles or institution names if any slipped through
      if (extracted.skills) {
        const rawSkills: string[] = Array.isArray(extracted.skills)
          ? extracted.skills
          : typeof extracted.skills === "string"
          ? extracted.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        const isDegreeOrInstitution = (s: string) => {
          const lower = s.toLowerCase().trim();
          return (
            lower.startsWith("b.s") ||
            lower.startsWith("b.tech") ||
            lower.startsWith("m.tech") ||
            lower.startsWith("m.sc") ||
            lower.startsWith("bachelor") ||
            lower.startsWith("master") ||
            lower.startsWith("specialis") ||
            lower.startsWith("specializ") ||
            lower.includes("degree") ||
            lower.includes("srm university") ||
            lower.includes("srm ap") ||
            lower === "student"
          );
        };

        const cleanedSkills = rawSkills.filter((s) => !isDegreeOrInstitution(s));
        extracted.skills = cleanedSkills.join(", ");
      }

      // Structure projects (ensure ID, trimmed fields, up to 6 items max)
      if (Array.isArray(extracted.projects)) {
        extracted.projects = extracted.projects
          .map((p: any) => {
            if (!p || typeof p !== "object") return null;
            const title = typeof p.title === "string" ? p.title.trim() : "";
            const description = typeof p.description === "string" ? p.description.trim() : "";
            const link = typeof p.link === "string" && p.link.trim() ? p.link.trim() : undefined;
            if (!title) return null;
            return {
              id: p.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}_${Math.random()}`),
              title: title.slice(0, 60),
              description:
                description.slice(0, 200) || "Project built during coursework or hackathons.",
              link: link && /^https?:\/\//i.test(link) ? link : link ? `https://${link}` : undefined,
            };
          })
          .filter(Boolean)
          .slice(0, 6);
      }

      // Structure experiences (ensure ID, trimmed fields, up to 6 items max)
      if (Array.isArray(extracted.experiences)) {
        extracted.experiences = extracted.experiences
          .map((e: any) => {
            if (!e || typeof e !== "object") return null;
            const title = typeof e.title === "string" ? e.title.trim() : "";
            const organization =
              typeof e.organization === "string" ? e.organization.trim() : undefined;
            const period = typeof e.period === "string" ? e.period.trim() : undefined;
            if (!title) return null;
            return {
              id: e.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}_${Math.random()}`),
              title: title.slice(0, 60),
              organization: organization ? organization.slice(0, 60) : undefined,
              period: period ? period.slice(0, 30) : undefined,
            };
          })
          .filter(Boolean)
          .slice(0, 6);
      }

      setParsingStage("finalizing");
      updateParsingProgress("finalizing", 97, "Validating fields & preparing profile draft...");

      // Only pass non-empty fields so we don't overwrite existing input with ""
      const filtered: Record<string, any> = {};
      Object.keys(extracted).forEach((key) => {
        const val = extracted[key];
        if (Array.isArray(val) && val.length > 0) {
          filtered[key] = val;
        } else if (typeof val === "string" && val.trim()) {
          filtered[key] = val.trim();
        } else if (val !== undefined && val !== null) {
          filtered[key] = val;
        }
      });

      // Save to global session storage so it persists even if user navigates away
      completeParsingSession(filtered);

      // Show success stage on modal
      setParsingStage("success");

      // Wait a moment for celebratory animation to complete before applying
      setTimeout(() => {
        setModalOpen(false);
        markParsingSessionApplied();
        onImported(filtered);
        toast.success("Resume parsed successfully! AI drafted your skills, projects & bio.");
      }, 750);
    } catch (err: unknown) {
      console.error("Resume import failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to parse document";
      setErrorMessage(msg);
      setParsingStage("error");
      failParsingSession(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PdfParsingModal
        open={modalOpen}
        fileName={fileName}
        fileSizeBytes={fileSizeBytes}
        stage={parsingStage}
        errorMessage={errorMessage}
        onRetry={() => {
          clearParsingSession();
          setModalOpen(false);
          setTimeout(() => inputRef.current?.click(), 150);
        }}
        onClose={() => {
          setModalOpen(false);
        }}
      />

      {variant === "button" ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className={`shrink-0 gap-1.5 font-bold ${className}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {buttonLabel}
              </>
            )}
          </Button>
        </>
      ) : (
        <div
          className={`rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 ${className}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Import from your resume (PDF or Word .docx)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload your resume PDF or Word document and we'll auto-fill the form.
                  <br />
                  <span className="opacity-80">
                    Supports LinkedIn PDF exports and standard .docx / .pdf resumes.
                  </span>
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={handleFile}
            />

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              className="shrink-0 gap-1.5 font-bold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {buttonLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ResumePdfImport;
