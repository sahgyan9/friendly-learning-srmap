import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent
        className="max-w-[98vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[95vw] focus:outline-none"
        onClick={onClose}
      >
        <DialogTitle className="sr-only">{title ?? "Post image"}</DialogTitle>

        {activeSrc && (
          <div
            className="relative mx-auto flex flex-col items-center justify-center max-h-[90vh] w-full"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-10 right-2 z-50 rounded-full bg-black/70 p-2 text-white/90 hover:bg-black hover:text-white backdrop-blur-md transition-all focus:outline-none"
              aria-label="Close image lightbox"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Lightbox Main Image */}
            <img
              key={activeSrc}
              src={activeSrc}
              alt={title ? `${title} - image ${currentIndex + 1}` : "Full view"}
              className="mx-auto max-h-[82vh] w-auto max-w-full rounded-lg object-contain select-none shadow-2xl"
            />

            {/* Navigation controls if multiple images */}
            {imageList.length > 1 && (
              <>
                {/* Left Arrow Button */}
                <button
                  type="button"
                  className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black/90 hover:scale-110 active:scale-95 border border-white/20 shadow-xl backdrop-blur-md transition-all focus:outline-none"
                  onClick={handlePrev}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                </button>

                {/* Right Arrow Button */}
                <button
                  type="button"
                  className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black/90 hover:scale-110 active:scale-95 border border-white/20 shadow-xl backdrop-blur-md transition-all focus:outline-none"
                  onClick={handleNext}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                </button>

                {/* Counter Pill */}
                <div className="mt-3 flex items-center gap-2 rounded-full bg-black/80 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-lg border border-white/10">
                  <span>
                    {currentIndex + 1} / {imageList.length}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageLightbox;
