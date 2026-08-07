import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostImageGalleryProps {
  images: string[];
  title: string;
  onImageClick?: (src: string, index: number) => void;
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Smart, LinkedIn-style multi-image auto-arranger.
 *
 * Automatically adapts image layout based on count:
 * - 1 image: Hero view bounded with high resolution display.
 * - 2 images: Balanced 50/50 vertical split gallery.
 * - 3 images: 60% Hero main left + 2 stacked right.
 * - 4 images: 60% Hero main left + 3 stacked right (LinkedIn signature layout).
 * - 5+ images: 60% Hero main left + 3 stacked right with +N badge overlay.
 */
export function PostImageGallery({
  images,
  title,
  onImageClick,
  variant = "full",
  className,
}: PostImageGalleryProps) {
  if (!images || images.length === 0) return null;

  const count = images.length;
  const isCompact = variant === "compact";

  // Compact Homepage Rail view
  if (isCompact) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border border-border/60 bg-muted/20", className)}>
        <img
          src={images[0]}
          alt=""
          loading="lazy"
          className="h-28 w-full object-cover"
        />
        {count > 1 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md shadow-md">
            +{count - 1} more
          </span>
        )}
      </div>
    );
  }

  // Single Image Layout
  if (count === 1) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-black/5 dark:bg-black/20", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(images[0], 0);
          }}
          className="group/img relative mx-auto block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="group/img relative h-full w-full overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View image ${index + 1} of 2 for "${title}"`}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
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
          className="group/img relative col-span-3 h-full w-full overflow-hidden cursor-zoom-in focus-visible:outline-none"
          aria-label={`View main image for "${title}"`}
        >
          <img
            src={images[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
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
              className="group/img relative h-[calc(50%-3px)] w-full overflow-hidden cursor-zoom-in focus-visible:outline-none"
              aria-label={`View image ${index + 2} of 3 for "${title}"`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
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
      {/* Main Hero Image on Left (60% width) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick?.(images[0], 0);
        }}
        className="group/img relative col-span-3 h-full w-full overflow-hidden cursor-zoom-in focus-visible:outline-none"
        aria-label={`View main image for "${title}"`}
      >
        <img
          src={images[0]}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
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
              className="group/img relative h-[calc(33.333%-2px)] w-full overflow-hidden cursor-zoom-in focus-visible:outline-none"
              aria-label={`View image ${actualIndex + 1} of ${count} for "${title}"`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
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
