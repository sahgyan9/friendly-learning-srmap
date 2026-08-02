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
 * storage — a rounded-square gradient with one emoji baked in, the same look
 * CommunityAvatar falls back to, except the owner picks the combination
 * instead of it being hashed from the slug. Encoded as a data: URL, so a
 * pick is just a string in `cover_image` and needs nothing new server-side.
 */
const PRESET_HUES = [8, 32, 52, 96, 140, 168, 190, 212, 240, 266, 292, 320];
const PRESET_EMOJI = ["🚀", "🎯", "🔥", "💡", "⚡", "🎨", "🧠", "🌱", "🏆", "🎮", "🛰️", "🧩", "🌟", "🛠️", "📚", "🎧"];

function presetIconUrl(hue: number, emoji: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue} 62% 46%)'/>` +
    `<stop offset='1' stop-color='hsl(${(hue + 24) % 360} 58% 38%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='128' height='128' rx='28' fill='url(#g)'/>` +
    `<text x='64' y='80' font-size='60' text-anchor='middle'>${emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRESETS = PRESET_EMOJI.map((emoji, index) => ({
  emoji,
  hue: PRESET_HUES[index % PRESET_HUES.length],
  url: presetIconUrl(PRESET_HUES[index % PRESET_HUES.length], emoji),
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
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted">
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
              key={preset.emoji}
              type="button"
              onClick={() => onChange(preset.url)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-lg transition-transform hover:scale-105",
                "ring-1 ring-inset ring-white/15",
                value === preset.url && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              style={{
                background: `linear-gradient(140deg, hsl(${preset.hue} 62% 46%), hsl(${(preset.hue + 24) % 360} 58% 38%))`,
              }}
              aria-label={`Use ${preset.emoji} icon`}
            >
              {preset.emoji}
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
