import { useState } from "react";
import { ImagePlus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface CoverPreset {
  id: string;
  name: string;
  gradient: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "srmap-blue",
    name: "SRM Navy & Indigo",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3963c6 100%)",
  },
  {
    id: "cyber-violet",
    name: "Electric Violet",
    gradient: "linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #9333ea 100%)",
  },
  {
    id: "emerald-campus",
    name: "Emerald Campus",
    gradient: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)",
  },
  {
    id: "sunset-glow",
    name: "Golden Sunset",
    gradient: "linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f59e0b 100%)",
  },
  {
    id: "aurora",
    name: "Northern Aurora",
    gradient: "linear-gradient(135deg, #0f766e 0%, #0284c7 50%, #4f46e5 100%)",
  },
  {
    id: "deep-space",
    name: "Deep Space",
    gradient: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
  },
];

interface BlogCoverPickerProps {
  coverUrl: string | null;
  onSelectCover: (url: string | null) => void;
  onRequestUpload: () => void;
  uploading?: boolean;
}

export function BlogCoverPicker({
  coverUrl,
  onSelectCover,
  onRequestUpload,
  uploading = false,
}: BlogCoverPickerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isGradient = coverUrl?.startsWith("gradient:") ?? false;
  const gradientStyle = isGradient ? coverUrl?.replace("gradient:", "") : null;

  return (
    <div className="relative group/cover w-full">
      {coverUrl ? (
        <div className="relative w-full h-44 sm:h-60 md:h-72 rounded-2xl overflow-hidden border border-border/60 shadow-sm transition-all">
          {isGradient ? (
            <div
              className="w-full h-full"
              style={{ background: gradientStyle || "" }}
            />
          ) : (
            <img
              src={coverUrl}
              alt="Post cover"
              className="w-full h-full object-cover"
            />
          )}

          {/* Action buttons overlaid on hover */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2 bg-background/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-border/50 shadow-md opacity-90 sm:opacity-0 group-hover/cover:opacity-100 transition-opacity">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 px-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Change Cover
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3">
                <CoverOptionsContent
                  onSelectPreset={(preset) => {
                    onSelectCover(`gradient:${preset.gradient}`);
                    setPopoverOpen(false);
                  }}
                  onRequestUpload={() => {
                    setPopoverOpen(false);
                    onRequestUpload();
                  }}
                  uploading={uploading}
                />
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2 gap-1"
              onClick={() => onSelectCover(null)}
              title="Remove cover"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-2 pb-1 flex items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 px-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all"
              >
                <ImagePlus className="h-3.5 w-3.5 text-primary" />
                Add cover image
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <CoverOptionsContent
                onSelectPreset={(preset) => {
                  onSelectCover(`gradient:${preset.gradient}`);
                  setPopoverOpen(false);
                }}
                onRequestUpload={() => {
                  setPopoverOpen(false);
                  onRequestUpload();
                }}
                uploading={uploading}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

function CoverOptionsContent({
  onSelectPreset,
  onRequestUpload,
  uploading,
}: {
  onSelectPreset: (preset: CoverPreset) => void;
  onRequestUpload: () => void;
  uploading?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-border/50">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Choose Cover
        </h4>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="presets" className="text-xs">
            Gradients
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">
            Upload Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="pt-3">
          <div className="grid grid-cols-3 gap-2">
            {COVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="group relative h-16 rounded-lg overflow-hidden border border-border/50 hover:border-primary transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                style={{ background: preset.gradient }}
                onClick={() => onSelectPreset(preset)}
                title={preset.name}
              >
                <span className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs py-0.5 text-[9px] font-medium text-white truncate px-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="pt-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-20 border-dashed flex flex-col gap-1.5 items-center justify-center text-xs text-muted-foreground hover:text-foreground"
            onClick={onRequestUpload}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 text-primary" />
            <span>Upload from device</span>
            <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP up to 5MB</span>
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
