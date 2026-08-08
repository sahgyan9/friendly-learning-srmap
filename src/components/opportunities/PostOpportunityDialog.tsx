import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPPORTUNITY_KINDS,
  createOpportunity,
  type NewOpportunity,
  type OpportunityKind,
} from "@/integrations/supabase/services/opportunities";

const BLANK: NewOpportunity = {
  title: "",
  organiser: "",
  kind: "hackathon",
  description: "",
  tags: [],
  isOnline: true,
  location: "",
  registerBy: "",
  externalUrl: "",
  teamMin: "",
  teamMax: "",
};

/**
 * Post an opportunity.
 *
 * Only `title` is required. Every extra field is one more reason to abandon the
 * form, and a listing with just a name and a deadline is still worth far more to
 * the next student than the listing nobody posted. The fields that matter most
 * for being *found* — deadline and topics — are the two the copy nudges toward.
 */
const PostOpportunityDialog = ({ onPosted }: { onPosted: () => void }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewOpportunity>(BLANK);
  const [tagText, setTagText] = useState("");

  const set = <K extends keyof NewOpportunity>(key: K, value: NewOpportunity[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    const { data, error } = await createOpportunity({
      ...form,
      // Split late rather than on every keystroke, so a half-typed tag is not
      // committed while the person is still typing it.
      tags: tagText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setSaving(false);

    if (error || !data) {
      toast.error("Could not post it", {
        description: error?.message ?? "Please try again.",
      });
      return;
    }

    toast.success("Posted", {
      description: `"${data.title}" is live. It becomes searchable within a few minutes.`,
    });
    setForm(BLANK);
    setTagText("");
    setOpen(false);
    onPosted();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(BLANK);
          setTagText("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Post an opportunity
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post an opportunity</DialogTitle>
          <DialogDescription>
            Anything students can enter — a hackathon, a competition, an internship. Registration
            stays on the organiser's site; this is so people here can find it and team up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="opportunity-title">Title</Label>
            <Input
              id="opportunity-title"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Smart India Hackathon 2026"
              maxLength={140}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opportunity-organiser">Organiser</Label>
              <Input
                id="opportunity-organiser"
                value={form.organiser}
                onChange={(event) => set("organiser", event.target.value)}
                placeholder="Who is running it"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opportunity-kind">Type</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => value && set("kind", value as OpportunityKind)}
              >
                <SelectTrigger id="opportunity-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_KINDS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opportunity-description">What is it?</Label>
            <Textarea
              id="opportunity-description"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="A couple of lines. What the problem statements look like, who can enter, what you win."
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opportunity-tags">Topics</Label>
            <Input
              id="opportunity-tags"
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="Machine Learning, Web Development, IoT"
            />
            <p className="text-xs text-muted-foreground">
              Comma separated. These are what someone searching “I want to build something with
              AI” actually matches against.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opportunity-deadline">Register by</Label>
              <Input
                id="opportunity-deadline"
                type="date"
                value={form.registerBy}
                onChange={(event) => set("registerBy", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Listings disappear once this passes.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opportunity-url">Registration link</Label>
              <Input
                id="opportunity-url"
                value={form.externalUrl}
                onChange={(event) => set("externalUrl", event.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <Label htmlFor="opportunity-online" className="cursor-pointer">
                Online
              </Label>
              <p className="text-xs text-muted-foreground">Turn off to name a venue.</p>
            </div>
            <Switch
              id="opportunity-online"
              checked={form.isOnline}
              onCheckedChange={(checked) => set("isOnline", checked)}
            />
          </div>

          {!form.isOnline && (
            <div className="space-y-1.5">
              <Label htmlFor="opportunity-location">Where</Label>
              <Input
                id="opportunity-location"
                value={form.location}
                onChange={(event) => set("location", event.target.value)}
                placeholder="SRM AP campus, Amaravati"
                maxLength={120}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opportunity-team-min">Smallest team</Label>
              <Input
                id="opportunity-team-min"
                type="number"
                min={1}
                max={100}
                value={form.teamMin}
                onChange={(event) => set("teamMin", event.target.value)}
                placeholder="2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opportunity-team-max">Largest team</Label>
              <Input
                id="opportunity-team-max"
                type="number"
                min={1}
                max={100}
                value={form.teamMax}
                onChange={(event) => set("teamMax", event.target.value)}
                placeholder="6"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || form.title.trim().length < 4}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostOpportunityDialog;
