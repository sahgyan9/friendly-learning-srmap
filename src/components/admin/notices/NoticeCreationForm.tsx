import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  createNotice,
  parseNoticeFromText,
  parseNoticeFromImage,
  triggerEmbedding,
} from "@/integrations/supabase/services/notices";

interface NoticeCreationFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "holiday_change", label: "Holiday Change" },
  { value: "academic_calendar", label: "Academic Calendar" },
  { value: "exam", label: "Exam" },
  { value: "event", label: "Event" },
  { value: "administrative", label: "Administrative" },
  { value: "general", label: "General" },
] as const;

const MAX_IMAGE_MB = 8;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const todayIso = () => new Date().toISOString().slice(0, 10);

const NoticeCreationForm = ({ onCancel, onSuccess }: NoticeCreationFormProps) => {
  const [pastedText, setPastedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "general" as (typeof CATEGORIES)[number]["value"],
    reference_no: "",
    issued_date: todayIso(),
    effective_date: "",
    summary: "",
    content: "",
  });

  const applyParsed = (parsed: Awaited<ReturnType<typeof parseNoticeFromText>>) => {
    setFormData({
      title: parsed.title || "",
      category: CATEGORIES.some((c) => c.value === parsed.category)
        ? (parsed.category as (typeof CATEGORIES)[number]["value"])
        : "general",
      reference_no: parsed.reference_no || "",
      issued_date: parsed.issued_date || todayIso(),
      effective_date: parsed.effective_date || "",
      summary: parsed.summary || "",
      content: parsed.content || "",
    });
    toast.success("Parsed — review the fields below before publishing");
  };

  const handleParseText = async () => {
    if (!pastedText.trim()) {
      toast.error("Paste the circular text first");
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseNoticeFromText(pastedText);
      applyParsed(parsed);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to parse notice text"));
    } finally {
      setParsing(false);
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_IMAGE_MB}MB`);
      return;
    }

    setParsing(true);
    try {
      const imageBase64 = await fileToBase64(file);
      const parsed = await parseNoticeFromImage(imageBase64, file.type);
      applyParsed(parsed);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to parse notice image"));
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim() || !formData.issued_date) {
      toast.error("Title, issued date, and content are required");
      return;
    }

    setSubmitting(true);
    try {
      await createNotice({
        title: formData.title.trim(),
        category: formData.category,
        reference_no: formData.reference_no.trim() || null,
        issued_date: formData.issued_date,
        effective_date: formData.effective_date || null,
        summary: formData.summary.trim() || null,
        content: formData.content.trim(),
      });

      triggerEmbedding();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to publish notice"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Parse with AI
          </CardTitle>
          <CardDescription>
            Paste the circular text, or upload a photo of it — the fields below get filled in for you to review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste the circular text here..."
            rows={5}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleParseText} disabled={parsing}>
              {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Parse Text
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              disabled={parsing}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload Photo Instead
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notice Details</CardTitle>
          <CardDescription>Review and edit before publishing — this is what gets saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. EID-Milad-un-Nabi holiday moved to 26th August"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: (typeof CATEGORIES)[number]["value"]) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_no">Reference No.</Label>
                <Input
                  id="reference_no"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  placeholder="SRMAP/Reg. Off/Circular/02/2026-27"
                />
              </div>

              <div>
                <Label htmlFor="issued_date">Issued Date</Label>
                <Input
                  id="issued_date"
                  type="date"
                  value={formData.issued_date}
                  onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="effective_date">Effective Date (optional)</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="summary">Summary</Label>
              <Input
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="One-sentence plain-English summary"
              />
            </div>

            <div>
              <Label htmlFor="content">Full Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full body of the notice"
                rows={8}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish Notice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoticeCreationForm;
