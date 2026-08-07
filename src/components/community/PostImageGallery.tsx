import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostImageGalleryProps {
  images: string[];
  title: string;
  onImageClick?: (src: string, index: number) => void;
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Smart, LinkedIn-style multi-image slider and auto-arranger.
 *
 * Provides LinkedIn's exact document/carousel experience:
 * - 1/N pill counter badge in top-right.
 * - Floating white Next (>) and Prev (<) navigation buttons on hover/touch.
 * - Non-cropping object-contain container on dark backdrop (no text cut off).
 */
export function PostImageGallery({
  images,
  title,
  onImageClick,
  variant = "full",
  className,
}: PostImageGalleryProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  if (!images || images.length === 0) return null;

  const count = images.length;
  const isCompact = variant === "compact";

  const handleNextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlide((prev) => (prev < count - 1 ? prev + 1 : 0));
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlide((prev) => (prev > 0 ? prev - 1 : count - 1));
  };

  // Compact Homepage Rail view — LinkedIn Carousel Slider
  if (isCompact) {
    return (
      <div className={cn("group/slider relative flex h-48 sm:h-52 w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-zinc-950/90 dark:bg-black/95 select-none", className)}>
        {/* Active Image (object-contain so no text is cut off) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(images[activeSlide], activeSlide);
          }}
          className="h-full w-full cursor-zoom-in focus-visible:outline-none"
          aria-label={`View image ${activeSlide + 1} of ${count} for "${title}"`}
        >
          <img
            src={images[activeSlide]}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain transition-all duration-300"
          />
        </button>

        {/* Multi-image LinkedIn Carousel Controls */}
        {count > 1 && (
          <>
            {/* Top Right Counter Badge (1/4) */}
            <span className="absolute top-2 right-2 rounded-full bg-black/80 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md shadow-md">
              {activeSlide + 1}/{count}
            </span>

            {/* Prev (<) Floating Button */}
            {activeSlide > 0 && (
              <button
                type="button"
                onClick={handlePrevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-all hover:bg-white hover:scale-110 active:scale-95 focus:outline-none"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}

            {/* Next (>) Floating Button */}
            {activeSlide < count - 1 && (
              <button
                type="button"
                onClick={handleNextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-all hover:bg-white hover:scale-110 active:scale-95 focus:outline-none"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  // Single Image Layout
  if (count === 1) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-zinc-950/90 dark:bg-black/95", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(images[0], 0);
          }}
          className="group/img relative flex min-h-[220px] max-h-[480px] w-full items-center justify-center cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View full size image for "${title}"`}
        >
          <img
            src={images[0]}
            alt=""
            loading="lazy"
            className="mx-auto h-auto max-h-[480px] w-auto max-w-full rounded-xl object-contain"
          />
          <span
            aria-hidden
            className="absolute bottom-3 right-3 rounded-lg bg-black/60 p-2 text-white opacity-80 backdrop-blur-sm transition-opacity group-hover/img:opacity-100"
          >
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
      </div>
    );
  }

  // 2 Images Layout (50/50 Split)
  if (count === 2) {
    return (
      <div className={cn("grid h-72 sm:h-80 grid-cols-2 gap-1.5 overflow-hidden rounded-xl border border-border/60 bg-muted/20", className)}>
        {images.map((src, index) => (
          <button
            key={src + index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick?.(src, index);
            }}
            className="group/img relative flex h-full w-full items-center justify-center overflow-hidden cursor-zoom-in bg-zinc-950/90 dark:bg-black/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View image ${index + 1} of 2 for "${title}"`}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
            />
          </button>
        ))}
      </div>
    );
  }

  // 3 Images Layout (Main left 60%, 2 stacked right 40%)
  if (count === 3) {
    return (
      <div className={cn("grid h-80 sm:h-96 grid-cols-5 gap-1.5 overflow-hidden rounded-xl border border-border/60 bg-muted/20", className)}>
        {/* Hero Left (60%) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(images[0], 0);
          }}
          className="group/img relative col-span-3 flex h-full w-full items-center justify-center overflow-hidden cursor-zoom-in bg-zinc-950/90 dark:bg-black/95 focus-visible:outline-none"
          aria-label={`View main image for "${title}"`}
        >
          <img
            src={images[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-102"
          />
        </button>

        {/* Stacked Right (40%) */}
        <div className="col-span-2 flex flex-col gap-1.5 h-full">
          {images.slice(1, 3).map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick?.(src, index + 1);
              }}
              className="group/img relative h-[calc(50%-3px)] w-full overflow-hidden cursor-zoom-in bg-zinc-900/60 focus-visible:outline-none"
              aria-label={`View image ${index + 2} of 3 for "${title}"`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover/img:scale-105"
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 4+ Images LinkedIn Layout (Main left 60%, 3 stacked right 40% with optional +N badge)
  const remainingCount = count - 4;

  return (
    <div className={cn("grid h-96 sm:h-[440px] grid-cols-5 gap-1.5 overflow-hidden rounded-xl border border-border/60 bg-muted/20", className)}>
      {/* Main Hero Image on Left (60% width) - object-contain ensures no title/text is cut off */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick?.(images[0], 0);
        }}
        className="group/img relative col-span-3 flex h-full w-full items-center justify-center overflow-hidden cursor-zoom-in bg-zinc-950/90 dark:bg-black/95 focus-visible:outline-none"
        aria-label={`View main image for "${title}"`}
      >
        <img
          src={images[0]}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-102"
        />
      </button>

      {/* 3 Stacked Right Images (40% width) */}
      <div className="col-span-2 flex flex-col gap-1.5 h-full">
        {images.slice(1, 4).map((src, index) => {
          const actualIndex = index + 1;
          const isLastSlot = index === 2 && count >= 4;
          const hasMore = isLastSlot && remainingCount > 0;

          return (
            <button
              key={src + index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick?.(src, actualIndex);
              }}
              className="group/img relative h-[calc(33.333%-2px)] w-full overflow-hidden cursor-zoom-in bg-zinc-900/60 focus-visible:outline-none"
              aria-label={`View image ${actualIndex + 1} of ${count} for "${title}"`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover/img:scale-105"
              />
              {hasMore && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/65 font-bold text-white text-xl sm:text-2xl backdrop-blur-[2px] transition-bg group-hover/img:bg-black/75">
                  +{remainingCount + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PostImageGallery;
