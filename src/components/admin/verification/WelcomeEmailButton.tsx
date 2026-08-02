import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Eye, FileText, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { markMentorWelcomed } from "@/integrations/supabase/services/welcome-emails";
import { buildWelcomeEmail, firstNameFrom } from "./welcome-email";

const MAILTO_SAFE_LENGTH = 1800;

interface WelcomeEmailButtonProps {
  mentorId?: string | null;
  mentorName: string;
  mentorEmail?: string | null;
  /** ISO timestamp when this mentor was recorded as welcomed, if they were. */
  sentAt?: string | null;
  onMarkedSent?: () => void;
}

const WelcomeEmailButton = ({
  mentorId,
  mentorName,
  mentorEmail,
  sentAt,
  onMarkedSent,
}: WelcomeEmailButtonProps) => {
  const [open, setOpen] = useState(false);
  const template = buildWelcomeEmail(mentorName);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [html, setHtml] = useState(template.html);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [handedOff, setHandedOff] = useState(false);
  const [marking, setMarking] = useState(false);

  const displayName = mentorName.trim() || "this mentor";

  useEffect(() => {
    if (!open) return;
    const next = buildWelcomeEmail(mentorName);
    setSubject(next.subject);
    setBody(next.body);
    setHtml(next.html);
    setHandedOff(false);
  }, [open, mentorName]);

  const tooLongForMailto = subject.length + body.length > MAILTO_SAFE_LENGTH;

  const openMailClient = () => {
    if (!mentorEmail) return;
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: mentorEmail,
      su: subject,
      body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank");
    setHandedOff(true);
  };

  const confirmSent = async () => {
    if (!mentorId) return;
    setMarking(true);
    const { error } = await markMentorWelcomed(mentorId);
    setMarking(false);

    if (error) {
      toast.error(error.message || "Could not record that. The email still went.");
      return;
    }

    setOpen(false);
    onMarkedSent?.();
    toast.success(`Marked ${displayName} as welcomed`);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${mentorEmail ?? ""}\nSubject: ${subject}\n\n${body}`);
      toast.success("Copied plain text email format!");
    } catch {
      toast.error("Could not copy plain text. Please select manually.");
    }
  };

  const copyStyledEmail = async () => {
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error("Rich clipboard not supported");
      }
      // Writing both MIME types means Gmail's compose box (a rich-text editor)
      // renders the styled version on paste, while an editor that only
      // understands plain text still gets something sensible.
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([body], { type: "text/plain" }),
        }),
      ]);
      toast.success("Copied the styled email — paste it into the Gmail body to send it as designed.");
    } catch {
      // Safari and locked-down browsers can't write rich clipboard content.
      // The raw source is still worth having — for a code editor, or for the
      // automated send pipeline later — so fall back to that.
      try {
        await navigator.clipboard.writeText(html);
        toast.error("Your browser can't paste rich formatting — copied the raw HTML source instead.");
      } catch {
        toast.error("Could not copy the email.");
      }
    }
  };

  if (!mentorEmail) {
    return (
      <Button variant="outline" size="sm" disabled title="No email address on this application">
        <Mail className="mr-2 h-4 w-4" />
        No email on file
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={sentAt ? "ghost" : "outline"} size="sm">
          {sentAt ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              Welcomed
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send welcome email
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome {displayName}</DialogTitle>
          <DialogDescription>
            Mentors are automatically approved upon registration. Preview or edit the styled welcome message below.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "edit" | "preview")}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="edit" className="gap-2">
                <FileText className="h-4 w-4" />
                Edit / Mailto Draft
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Rich Visual Email Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="edit" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input value={mentorEmail} readOnly className="bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="welcome-subject">Subject</Label>
              <Input
                id="welcome-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="welcome-body">Message</Label>
              <Textarea
                id="welcome-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={14}
                className="font-sans text-sm"
              />
            </div>

            {tooLongForMailto && (
              <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                This message is long enough that some mail clients will cut it off when opened from a link.
                Use <strong>Copy Plain Text</strong> and paste it directly into your mail app.
              </p>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="overflow-hidden rounded-xl border bg-slate-100 p-2 dark:bg-slate-900">
              <iframe
                title="Email Preview"
                srcDoc={html}
                className="h-[450px] w-full rounded-lg border-0 bg-white"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">To send the styled version:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>Click <strong>Copy Styled Email</strong> below.</li>
              <li>Click <strong>Open in Gmail</strong>, then select all in the body (Ctrl/Cmd+A).</li>
              <li>Paste (Ctrl/Cmd+V) — the design replaces the plain-text draft.</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={copyStyledEmail} className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Copy Styled Email
            </Button>
            <Button variant="outline" onClick={openMailClient}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {handedOff ? "Open again in Gmail" : "Open in Gmail"}
            </Button>
            <Button variant="outline" onClick={copyText}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Plain Text
            </Button>
          </div>

          {handedOff && !sentAt && mentorId && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Did you send it?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This page can't tell — your mail app handles the sending. Confirm and{" "}
                {firstNameFrom(mentorName) || "they"} won't show up as waiting any more.
              </p>
              <Button size="sm" className="mt-2" onClick={confirmSent} disabled={marking}>
                {marking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Yes, mark as sent
              </Button>
            </div>
          )}

          {sentAt && (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Recorded as welcomed on {new Date(sentAt).toLocaleDateString()}. Sending again is
              fine — it won't be recorded twice.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Opening Gmail hands the draft to your signed-in browser email address.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeEmailButton;
