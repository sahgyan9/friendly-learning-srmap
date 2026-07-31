import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Mail } from "lucide-react";
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
import { markMentorWelcomed } from "@/integrations/supabase/services/welcome-emails";
import { buildWelcomeEmail } from "./welcome-email";

/**
 * Length past which the Gmail compose URL stops being reliable. Browsers cap
 * URL length and Gmail itself trims very long query params without warning —
 * the draft simply opens with the end missing.
 */
const MAILTO_SAFE_LENGTH = 1800;

interface WelcomeEmailButtonProps {
  mentorId?: string | null;
  mentorName: string;
  mentorEmail?: string | null;
  /** ISO timestamp when this mentor was recorded as welcomed, if they were. */
  sentAt?: string | null;
  onMarkedSent?: () => void;
}

/**
 * Sends a newly approved mentor their welcome, through the admin's own mail
 * client rather than the server.
 *
 * The queued/Resend path needs a domain whose DNS we control, and
 * `srmap.edu.in` belongs to the university — mail sent as that address would be
 * rejected. Opening the admin's own Gmail sidesteps the problem entirely: they
 * press send, so the message genuinely comes from their college address, with
 * no DNS records and no verified domain involved.
 *
 * The trade is that it is one click per mentor. At the volume this site
 * approves people, that is a fair price for mail that actually arrives.
 */
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
  const [handedOff, setHandedOff] = useState(false);
  const [marking, setMarking] = useState(false);

  // Reseed when the dialog opens on a different application, or the second
  // mentor you approve gets the first one's name.
  useEffect(() => {
    if (!open) return;
    const next = buildWelcomeEmail(mentorName);
    setSubject(next.subject);
    setBody(next.body);
    setHandedOff(false);
  }, [open, mentorName]);

  const tooLongForMailto = subject.length + body.length > MAILTO_SAFE_LENGTH;

  const openMailClient = () => {
    if (!mentorEmail) return;
    // Gmail's own compose URL, not mailto:. A mailto: link depends on the OS
    // having a default mail app registered to handle it — on a machine
    // without one, Chrome just opens a blank tab and does nothing. This goes
    // straight into Gmail's web compose in the signed-in account instead,
    // which is what actually gets used here.
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

  /**
   * Nothing here can see whether Gmail actually sent anything — the draft
   * leaves the browser and that is the end of our visibility. So the admin
   * says, and we record what they said. Guessing from the click would mark
   * people welcomed who were never written to.
   */
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
    toast.success(`Marked ${mentorName} as welcomed`);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${mentorEmail ?? ""}\nSubject: ${subject}\n\n${body}`);
      toast.success("Copied — paste it into Gmail");
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
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

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome {mentorName}</DialogTitle>
          <DialogDescription>
            This opens Gmail with the message ready to send. You press send, so it comes from your
            address — edit anything below first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              rows={16}
              className="font-sans text-sm"
            />
          </div>

          {tooLongForMailto && (
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              This is long enough that some mail clients will cut it off when opened from a link.
              Use <strong>Copy</strong> and paste it into Gmail instead.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={openMailClient} className="flex-1">
              <ExternalLink className="mr-2 h-4 w-4" />
              {handedOff ? "Open again in Gmail" : "Open in Gmail"}
            </Button>
            <Button variant="outline" onClick={copyAll}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>

          {/* Appears only after the draft has been handed over, so it cannot be
              pressed by someone who has not opened anything yet. */}
          {handedOff && !sentAt && mentorId && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Did you send it?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This page can't tell — your mail app handles the sending. Confirm and{" "}
                {mentorName.split(" ")[0]} won't show up as waiting any more.
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
            Nothing is sent from this site — it only hands the draft to Gmail.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeEmailButton;
