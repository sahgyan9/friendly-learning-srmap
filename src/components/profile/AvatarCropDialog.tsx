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

/**
 * Square crop for a profile photo.
 *
 * Avatars are the one place a crop tool genuinely earns its keep. The frame is
 * always a circle at a fixed size, so something has to be discarded no matter
 * what — and until now the middle of the picture won automatically, which is
 * how a group photo becomes a stranger's shoulder and a full-body shot becomes
 * a torso. The person in the photo is the only one who knows which part matters.
 *
 * Post images deliberately do NOT get this. Nothing forces them into a shape,
 * so there is nothing to decide; asking someone to crop one would be handing
 * them a chore to solve a problem that no longer exists.
 *
 * Hand-rolled rather than pulling in react-easy-crop. The interaction is a pan
 * and a zoom over a fixed square, the export is one drawImage call, and the
 * whole thing is smaller than the dependency would be.
 */

/** Stored size. Twice the largest avatar rendered anywhere, for retina screens. */
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

interface AvatarCropDialogProps {
  /** The chosen file. The dialog is open whenever this is set. */
  file: File | null;
  onCancel: () => void;
  onCropped: (file: File) => void | Promise<void>;
  /** True while the caller uploads, so the buttons can be held. */
  saving?: boolean;
}

interface Natural {
  width: number;
  height: number;
}

export function AvatarCropDialog({ file, onCancel, onCropped, saving }: AvatarCropDialogProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  // An object URL rather than a FileReader data URL: it is created instantly
  // whatever the file size, where a base64 read of a 12MP photo visibly stalls.
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

  const frameSize = frameRef.current?.clientWidth ?? 0;

  /**
   * The scale at which the image exactly covers the square. Everything else is
   * measured from here, so zoom = 1 always means "no gaps at the edges" no
   * matter how tall or wide the original is.
   */
  const baseScale =
    natural && frameSize
      ? Math.max(frameSize / natural.width, frameSize / natural.height)
      : 1;

  const displayScale = baseScale * zoom;
  const displayWidth = natural ? natural.width * displayScale : 0;
  const displayHeight = natural ? natural.height * displayScale : 0;

  /**
   * Keeps the square covered. Panning past an edge would leave a transparent
   * wedge that gets exported into the avatar as a hard corner, which is a much
   * more confusing result than simply not being able to drag any further.
   */
  const clamp = useCallback(
    (next: { x: number; y: number }) => {
      if (!natural || !frameSize) return next;

      const minX = Math.min(0, frameSize - displayWidth);
      const minY = Math.min(0, frameSize - displayHeight);

      return {
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      };
    },
    [natural, frameSize, displayWidth, displayHeight],
  );

  // Re-centre whenever the image or the zoom changes the geometry underneath
  // the current offset, or a zoom-out leaves the picture pinned to one corner.
  useEffect(() => {
    setOffset((current) => clamp(current));
  }, [clamp]);

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const size = frameRef.current?.clientWidth ?? 0;
    const cover = Math.max(size / image.naturalWidth, size / image.naturalHeight);

    setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    // Start centred, which for most photos is where the face already is.
    setOffset({
      x: (size - image.naturalWidth * cover) / 2,
      y: (size - image.naturalHeight * cover) / 2,
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
    if (!file || !natural || !src || !frameSize) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.src = src;
    try {
      await image.decode();
    } catch {
      // Decoding cannot really fail here — the same URL is already displayed
      // on screen — but exporting an empty canvas would silently replace
      // someone's photo with a white square, so bail instead.
      return;
    }

    // The visible square, converted back into the source image's own pixels.
    const sourceX = -offset.x / displayScale;
    const sourceY = -offset.y / displayScale;
    const sourceSize = frameSize / displayScale;

    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return;

    await onCropped(
      new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() }),
    );
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={(next) => !next && !saving && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Position your photo</DialogTitle>
          <DialogDescription>
            Drag to move, and zoom in or out. Whatever is inside the circle is what people see.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={frameRef}
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative mx-auto aspect-square w-full max-w-[18rem] cursor-grab touch-none overflow-hidden rounded-lg bg-muted active:cursor-grabbing"
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
                // Hidden until measured, or it flashes at full size first.
                visibility: natural ? "visible" : "hidden",
              }}
            />
          )}

          {/* The circle is an overlay rather than a clip, so the parts being
              cut are dimmed but still visible. Seeing what is about to be lost
              is the difference between positioning a photo and guessing. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg"
            style={{
              // `closest-side` is doing real work. A radial-gradient sizes
              // itself to the farthest corner by default, so 50% landed at
              // ~71% of the half-width and the dimmed area sat well outside
              // the white ring — it looked like more of the photo would
              // survive than actually does. closest-side pins 100% to the
              // half-width, which is exactly the inscribed circle below.
              background:
                "radial-gradient(circle closest-side at center, transparent 0, transparent 99%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/70"
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
            Use this photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AvatarCropDialog;
