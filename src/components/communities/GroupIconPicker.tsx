import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Sparkles, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadCommunityPostImage } from "@/integrations/supabase/services/community-posts";

/**
 * Preset icons are drawn client-side as tiny inline SVGs rather than files in
 * storage — a rounded-square gradient with one Lucide glyph baked in, the
 * same look CommunityAvatar falls back to, except the owner picks the
 * combination instead of it being hashed from the slug. Encoded as a data:
 * URL, so a pick is just a string in `cover_image` and needs nothing new
 * server-side.
 *
 * The glyph markup is the path data straight out of each lucide-react icon
 * module (24x24 viewBox, stroke-based) rather than an emoji character, so a
 * chosen icon matches the line-art icons used everywhere else on a group's
 * card instead of clashing with them.
 */
const PRESET_HUES = [8, 32, 52, 96, 140, 168, 190, 212, 240, 266, 292, 320];
const PRESET_ICONS: { name: string; paths: string }[] = [
  { name: "Rocket", paths: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>' },
  { name: "Target", paths: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { name: "Flame", paths: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
  { name: "Lightbulb", paths: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>' },
  { name: "Zap", paths: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>' },
  { name: "Palette", paths: '<circle cx="13.5" cy="6.5" r=".5" fill="white"/><circle cx="17.5" cy="10.5" r=".5" fill="white"/><circle cx="8.5" cy="7.5" r=".5" fill="white"/><circle cx="6.5" cy="12.5" r=".5" fill="white"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>' },
  { name: "Brain", paths: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>' },
  { name: "Sprout", paths: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>' },
  { name: "Trophy", paths: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>' },
  { name: "Gamepad", paths: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>' },
  { name: "Satellite", paths: '<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>' },
  { name: "Puzzle", paths: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>' },
  { name: "Star", paths: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>' },
  { name: "Wrench", paths: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
  { name: "Book", paths: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>' },
  { name: "Headphones", paths: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>' },
];

function presetIconUrl(hue: number, iconPaths: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue} 62% 46%)'/>` +
    `<stop offset='1' stop-color='hsl(${(hue + 24) % 360} 58% 38%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='128' height='128' rx='28' fill='url(#g)'/>` +
    `<svg x='32' y='32' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${iconPaths}</svg>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRESETS = PRESET_ICONS.map((icon, index) => ({
  name: icon.name,
  hue: PRESET_HUES[index % PRESET_HUES.length],
  url: presetIconUrl(PRESET_HUES[index % PRESET_HUES.length], icon.paths),
}));

function buildGeminiPrompt(name: string, description: string): string {
  const subject = name.trim() || "a student group";
  const context = description.trim().slice(0, 220);
  return (
    `Design a simple, modern square app icon for a student group called "${subject}".` +
    (context ? ` The group is about: ${context}.` : "") +
    ` Flat vector style, one bold central subject, vibrant colours, no text or letters, ` +
    `works well as a small rounded-square icon.`
  );
}

type Mode = "presets" | "paste" | "ai";

interface GroupIconPickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Used only to draft the Gemini prompt. */
  name: string;
  description: string;
}

export function GroupIconPicker({ value, onChange, name, description }: GroupIconPickerProps) {
  const [mode, setMode] = useState<Mode>("presets");
  const [urlInput, setUrlInput] = useState("");
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadCommunityPostImage(file);
      onChange(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload that image");
    } finally {
      setUploading(false);
    }
  };

  const applyUrl = (raw: string) => {
    const url = raw.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Paste a link that starts with http:// or https://");
      return;
    }

    setCheckingUrl(true);
    const img = new Image();
    img.onload = () => {
      setCheckingUrl(false);
      onChange(url);
      setUrlInput("");
    };
    img.onerror = () => {
      setCheckingUrl(false);
      toast.error("That link didn't load as an image");
    };
    img.src = url;
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    }

    const text = event.clipboardData?.getData("text");
    if (text) {
      event.preventDefault();
      applyUrl(text);
    }
  };

  const promptDraft = buildGeminiPrompt(name, description);

  const openGemini = async () => {
    try {
      await navigator.clipboard.writeText(promptDraft);
      toast.success("Prompt copied — paste it into Gemini", {
        description: "Opening gemini.google.com in a new tab.",
      });
    } catch {
      toast.message("Copy the prompt below, then paste it into Gemini");
    }
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-background">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
              aria-label="Remove icon"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Optional. Without one, the group gets an automatic colour from its name.
        </p>
      </div>

      <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
        {(
          [
            { id: "presets" as const, label: "Presets" },
            { id: "paste" as const, label: "Paste or upload" },
            { id: "ai" as const, label: "Generate with AI" },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={cn(
              "flex-1 rounded px-2 py-1.5 font-medium transition-colors",
              mode === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "presets" && (
        <div className="grid grid-cols-8 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.url)}
              className={cn(
                "aspect-square overflow-hidden rounded-lg transition-transform hover:scale-105",
                "ring-1 ring-inset ring-white/15",
                value === preset.url && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              aria-label={`Use ${preset.name} icon`}
            >
              <img src={preset.url} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}

      {mode === "paste" && (
        <div className="space-y-2">
          <div
            tabIndex={0}
            onPaste={handlePaste}
            className="flex min-h-20 cursor-text flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {uploading || checkingUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Click here, then paste (Ctrl/Cmd+V) an image copied from Google Images or anywhere else</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyUrl(urlInput);
                }
              }}
              placeholder="...or paste an image link here"
              disabled={checkingUrl}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => applyUrl(urlInput)}
              disabled={checkingUrl || !urlInput.trim()}
            >
              {checkingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Or upload a file from this device"}
          </Button>
        </div>
      )}

      {mode === "ai" && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Opens Gemini in a new tab with this prompt copied to your clipboard — paste it there, then paste the
            image it makes back here.
          </p>
          <Textarea value={promptDraft} readOnly rows={3} className="text-xs text-muted-foreground" />
          <Button type="button" variant="secondary" size="sm" onClick={openGemini} className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            Copy prompt & open Gemini
          </Button>
        </div>
      )}
    </div>
  );
}

export default GroupIconPicker;
