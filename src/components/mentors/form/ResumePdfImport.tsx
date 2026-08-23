import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MentorFormData } from "@/hooks/useMentorForm";

interface ResumePdfImportProps {
  onImported: (data: Partial<MentorFormData>) => void;
}

const MAX_SIZE_MB = 10;

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

const ResumePdfImport = ({ onImported }: ResumePdfImportProps) => {
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
      const pdfBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke(
        "parse-linkedin-pdf",
        { body: { pdfBase64, mimeType: file.type } },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.data) throw new Error("No data returned");

      const extracted = data.data as Partial<MentorFormData>;

      // Only pass non-empty fields so we don't overwrite existing input with ""
      const filtered: Partial<MentorFormData> = {};
      (Object.keys(extracted) as (keyof MentorFormData)[]).forEach((key) => {
        const val = extracted[key];
        if (typeof val === "string" && val.trim()) {
          (filtered as Record<string, string>)[key] = val.trim();
        }
      });

      onImported(filtered);
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

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
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
          className="shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ResumePdfImport;
