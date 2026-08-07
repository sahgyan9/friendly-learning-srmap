import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  /** Single image URL or null. Backwards compatible. */
  src?: string | null;
  /** Array of image URLs for gallery mode. */
  images?: string[];
  /** Index of initial image to display (defaults to 0). */
  initialIndex?: number;
  onClose: () => void;
  /** Used for accessible title. */
  title?: string;
}

export function ImageLightbox({
  src,
  images,
  initialIndex = 0,
  onClose,
  title,
}: ImageLightboxProps) {
  const imageList = images && images.length > 0 ? images : src ? [src] : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Stabilize effect key so inline array references do not reset index on re-render
  const imagesKey = imageList.join(",");
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, imagesKey]);

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
    },
    [imageList.length],
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
    },
    [imageList.length],
  );

  useEffect(() => {
    if (imageList.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageList.length, handlePrev, handleNext]);

  const activeSrc = imageList[currentIndex] || null;

  return (
    <Dialog open={Boolean(activeSrc)} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        {/* Backdrop — tapping anywhere on the dark screen closes the lightbox */}
        <DialogOverlay
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md cursor-pointer"
        />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-0 border-0 bg-transparent shadow-none focus:outline-none pointer-events-none max-w-[98vw] sm:max-w-[95vw]"
          onPointerDownOutside={onClose}
        >
          <DialogTitle className="sr-only">{title ?? "Post image"}</DialogTitle>

          {activeSrc && (
            <div
              className="relative mx-auto flex flex-col items-center justify-center max-h-[90vh] w-fit max-w-[92vw] pointer-events-auto cursor-default select-none"
              onClick={(event) => event.stopPropagation()}
            >
              {/* White Close (X) Button positioned top-right on the image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute right-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow-xl backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                aria-label="Close image viewer"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>

              {/* Lightbox Main Image */}
              <img
                key={activeSrc}
                src={activeSrc}
                alt={title ? `${title} - image ${currentIndex + 1}` : "Full view"}
                className="mx-auto max-h-[82vh] w-auto max-w-full rounded-xl object-contain select-none shadow-2xl"
              />

              {/* White Navigation controls around the image */}
              {imageList.length > 1 && (
                <>
                  {/* Left Arrow Button */}
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow-xl backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                    onClick={handlePrev}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
                  </button>

                  {/* Right Arrow Button */}
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow-xl backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                    onClick={handleNext}
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                  </button>

                  {/* Counter Pill */}
                  <div className="mt-3 flex items-center gap-2 rounded-full bg-black/80 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-lg border border-white/10 select-none">
                    <span>
                      {currentIndex + 1} / {imageList.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export default ImageLightbox;
