import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, src, images]);

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
    },
    [imageList.length],
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
    },
    [imageList.length],
  );

  useEffect(() => {
    if (imageList.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handlePrev();
      } else if (event.key === "ArrowRight") {
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
        className="max-w-[96vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[92vw]"
        onClick={onClose}
      >
        <DialogTitle className="sr-only">{title ?? "Post image"}</DialogTitle>

        {activeSrc && (
          <div
            className="relative mx-auto flex flex-col items-center justify-center max-h-[88vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={activeSrc}
              alt={title ? `${title} - image ${currentIndex + 1}` : "Full view"}
              className="mx-auto max-h-[82vh] w-auto max-w-full rounded-lg object-contain select-none shadow-2xl"
            />

            {/* Navigation controls if multiple images */}
            {imageList.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80 border border-white/20 shadow-md backdrop-blur-sm"
                  onClick={handlePrev}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80 border border-white/20 shadow-md backdrop-blur-sm"
                  onClick={handleNext}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                <div className="mt-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
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
