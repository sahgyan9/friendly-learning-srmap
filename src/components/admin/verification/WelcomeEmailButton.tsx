import { useEffect, useState } from "react";
import { Copy, ExternalLink, Mail } from "lucide-react";
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
import { buildWelcomeEmail } from "./welcome-email";

/**
 * Length past which a `mailto:` link stops being reliable. Browsers and mail
 * clients each impose their own cap and none of them warn — the mail simply
 * opens with the end missing.
 */
const MAILTO_SAFE_LENGTH = 1800;

interface WelcomeEmailButtonProps {
  mentorName: string;
  mentorEmail?: string | null;
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
const WelcomeEmailButton = ({ mentorName, mentorEmail }: WelcomeEmailButtonProps) => {
  const [open, setOpen] = useState(false);
  const template = buildWelcomeEmail(mentorName);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  // Reseed when the dialog opens on a different application, or the second
  // mentor you approve gets the first one's name.
  useEffect(() => {
    if (!open) return;
    const next = buildWelcomeEmail(mentorName);
    setSubject(next.subject);
    setBody(next.body);
  }, [open, mentorName]);

  const tooLongForMailto = subject.length + body.length > MAILTO_SAFE_LENGTH;

  const openMailClient = () => {
    if (!mentorEmail) return;
    const link = `mailto:${mentorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(link, "_self");
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
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Send welcome email
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome {mentorName}</DialogTitle>
          <DialogDescription>
            This opens your own email app with the message ready. You press send, so it comes from
            your address — edit anything below first.
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
              Open in my email app
            </Button>
            <Button variant="outline" onClick={copyAll}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Nothing is sent from this site — it only hands the draft to your mail app.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeEmailButton;
