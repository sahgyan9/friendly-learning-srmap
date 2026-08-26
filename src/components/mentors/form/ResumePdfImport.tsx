import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MentorFormData } from "@/hooks/useMentorForm";
import { extractPdfText } from "@/lib/pdfTextExtract";

interface ResumePdfImportProps {
  onImported: (data: Partial<MentorFormData>) => void;
  /** "basic" skips the tagline/outcomes/AMA/ideal-mentees fields this caller
   * doesn't read, so Gemini generates less and returns faster. Defaults to
   * "full" for callers (like the profile setup studio) that use all of it. */
  fields?: "basic" | "full";
  /** Overrides the button label (default "Upload PDF"). */
  buttonLabel?: string;
  /** Layout mode: 'card' renders the full dashed box; 'button' renders just the trigger button. Default: 'card' */
  variant?: "card" | "button";
  className?: string;
}

const MAX_SIZE_MB = 10;
const REQUEST_TIMEOUT_MS = 45000;
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

const ResumePdfImport = ({
  onImported,
  fields = "full",
  buttonLabel = "Upload PDF",
  variant = "card",
  className = "",
}: ResumePdfImportProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be reselected
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`PDF must be smaller than ${MAX_SIZE_MB}MB`);
      return;
    }

    setIsLoading(true);
    const loadingId = toast.loading("Reading your PDF...");

    try {
      const extractedText = await extractPdfText(file);
      const useTextMode = extractedText.length >= MIN_TEXT_CHARS_FOR_TEXT_MODE;

      // Text mode skips the base64 upload entirely -- most resumes are plain
      // text underneath, so this is both the fast path and the common one.
      // Only a scanned/image-only PDF needs the full-file fallback below.
      const body = useTextMode
        ? { pdfText: extractedText, mimeType: file.type, fields }
        : { pdfBase64: await fileToBase64(file), mimeType: file.type, fields };

      const { data, error } = await supabase.functions.invoke(
        "parse-linkedin-pdf",
        { body },
      );

      if (error) {
        let msg = error.message;
        try {
          if ("context" in error && typeof (error as any).context?.json === "function") {
            const errJson = await (error as any).context.json();
            if (errJson?.error) msg = errJson.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.data) throw new Error("No data returned from parser");

      const extracted = data.data as Record<string, any>;

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

      onImported(filtered as Partial<MentorFormData>);
      toast.success("Profile imported! Please review and complete missing fields.", {
        id: loadingId,
      });
    } catch (err: unknown) {
      console.error("Resume import failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to parse PDF";
      toast.error(msg, { id: loadingId });
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "button") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
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
              Parsing PDF...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {buttonLabel}
            </>
          )}
        </Button>
      </>
    );
  }

  return (
    <div className={`rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Import from your resume or LinkedIn PDF</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload whichever PDF you already have and we'll auto-fill the form.
              <br />
              <span className="opacity-80">
                No LinkedIn PDF? LinkedIn → Your Profile → More → Save to PDF
              </span>
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
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
  );
};

export default ResumePdfImport;
