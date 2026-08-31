import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * Free-aspect crop for a blog cover/body image — the same pan-and-zoom-over-
 * a-fixed-frame mechanics as AvatarCropDialog (hand-rolled canvas rather than
 * a dependency), generalized from a fixed circle to a chosen rectangle. A
 * blog image benefits from a crop step the way an avatar does: whatever is
 * inside the frame is what every reader sees, so the part that matters
 * should be a choice, not whatever a "cover" fit happened to keep.
 */

const ASPECTS = [
  { label: "Landscape", value: 16 / 9 },
  { label: "Square", value: 1 },
  { label: "Portrait", value: 4 / 5 },
] as const;

const OUTPUT_MAX_EDGE = 1600;
const MAX_ZOOM = 3;

interface BlogImageCropDialogProps {
  file: File | null;
  onCancel: () => void;
  onCropped: (file: File) => void | Promise<void>;
  saving?: boolean;
}

interface Natural {
  width: number;
  height: number;
}

export function BlogImageCropDialog({ file, onCancel, onCropped, saving }: BlogImageCropDialogProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [aspect, setAspect] = useState<number>(ASPECTS[0].value);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frameWidth = frameRef.current?.clientWidth ?? 0;
  const frameHeight = frameRef.current?.clientHeight ?? 0;

  const baseScale =
    natural && frameWidth && frameHeight
      ? Math.max(frameWidth / natural.width, frameHeight / natural.height)
      : 1;

  const displayScale = baseScale * zoom;
  const displayWidth = natural ? natural.width * displayScale : 0;
  const displayHeight = natural ? natural.height * displayScale : 0;

  const clamp = useCallback(
    (next: { x: number; y: number }) => {
      if (!natural || !frameWidth || !frameHeight) return next;
      const minX = Math.min(0, frameWidth - displayWidth);
      const minY = Math.min(0, frameHeight - displayHeight);
      return {
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      };
    },
    [natural, frameWidth, frameHeight, displayWidth, displayHeight],
  );

  useEffect(() => {
    setOffset((current) => clamp(current));
  }, [clamp, aspect]);

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const width = frameRef.current?.clientWidth ?? 0;
    const height = frameRef.current?.clientHeight ?? 0;
    const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight);

    setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    setOffset({
      x: (width - image.naturalWidth * cover) / 2,
      y: (height - image.naturalHeight * cover) / 2,
    });
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const onDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset(
      clamp({
        x: drag.originX + (event.clientX - drag.startX),
        y: drag.originY + (event.clientY - drag.startY),
      }),
    );
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const confirm = async () => {
    if (!file || !natural || !src || !frameWidth || !frameHeight) return;

    const outputWidth = aspect >= 1 ? OUTPUT_MAX_EDGE : Math.round(OUTPUT_MAX_EDGE * aspect);
    const outputHeight = aspect >= 1 ? Math.round(OUTPUT_MAX_EDGE / aspect) : OUTPUT_MAX_EDGE;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.src = src;
    try {
      await image.decode();
    } catch {
      return;
    }

    const sourceX = -offset.x / displayScale;
    const sourceY = -offset.y / displayScale;
    const sourceWidth = frameWidth / displayScale;
    const sourceHeight = frameHeight / displayScale;

    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;

    await onCropped(new File([blob], "blog-image.jpg", { type: "image/jpeg", lastModified: Date.now() }));
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={(next) => !next && !saving && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Position your image</DialogTitle>
          <DialogDescription>Drag to move, zoom in or out, and pick a shape. Whatever is inside the frame is what readers see.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1.5">
          {ASPECTS.map((option) => (
            <Button
              key={option.label}
              type="button"
              size="sm"
              variant={aspect === option.value ? "secondary" : "outline"}
              onClick={() => setAspect(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div
          ref={frameRef}
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ aspectRatio: aspect }}
          className="relative mx-auto w-full max-w-md cursor-grab touch-none overflow-hidden rounded-lg bg-muted active:cursor-grabbing"
        >
          {src && (
            <img
              src={src}
              alt=""
              onLoad={onImageLoad}
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                left: offset.x,
                top: offset.y,
                width: displayWidth || undefined,
                height: displayHeight || undefined,
                visibility: natural ? "visible" : "hidden",
              }}
            />
          )}
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 rounded-lg border-2 border-white/70")}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            value={[zoom]}
            onValueChange={([next]) => setZoom(next)}
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            disabled={!natural}
            aria-label="Zoom"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!natural || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Use this image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BlogImageCropDialog;
