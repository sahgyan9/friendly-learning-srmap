import React, { useRef, useState, useCallback } from "react";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply?: () => void;
  disabled?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 44; // px needed to trigger reply
const MAX_SWIPE = 68; // maximum px drag distance

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  onReply,
  disabled = false,
  className,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !onReply) return;
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      isHorizontal.current = null;
      setHasTriggeredHaptic(false);
      setIsSwiping(true);
    },
    [disabled, onReply]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwiping || disabled || !onReply) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;

      // Determine horizontal vs vertical intent on first significant movement (> 6px)
      if (isHorizontal.current === null) {
        if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
          isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0;
        }
      }

      // If not swiping right, ignore
      if (isHorizontal.current !== true) {
        return;
      }

      if (deltaX > 0) {
        const clamped = Math.min(deltaX * 0.55, MAX_SWIPE);
        setTranslateX(clamped);

        if (clamped >= SWIPE_THRESHOLD && !hasTriggeredHaptic) {
          setHasTriggeredHaptic(true);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(15);
            } catch {}
          }
        } else if (clamped < SWIPE_THRESHOLD && hasTriggeredHaptic) {
          setHasTriggeredHaptic(false);
        }
      }
    },
    [isSwiping, disabled, onReply, hasTriggeredHaptic]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    isHorizontal.current = null;

    if (translateX >= SWIPE_THRESHOLD && onReply) {
      onReply();
    }

    setTranslateX(0);
    setHasTriggeredHaptic(false);
  }, [isSwiping, translateX, onReply]);

  const progress = Math.min(translateX / SWIPE_THRESHOLD, 1);
  const isTriggered = translateX >= SWIPE_THRESHOLD;

  return (
    <div
      className={cn("relative touch-pan-y select-none", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* WhatsApp-Style Circular Reply Indicator behind the message */}
      {translateX > 4 && (
        <div
          className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-opacity"
          style={{
            transform: `translateY(-50%) translateX(${Math.min(translateX * 0.35, 20)}px) scale(${0.75 + progress * 0.35})`,
            opacity: Math.min(progress * 1.3, 1),
          }}
        >
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150",
              isTriggered
                ? "bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30"
                : "bg-muted/90 text-muted-foreground border border-border/80 shadow-xs"
            )}
          >
            <Reply className="h-3.5 w-3.5" />
          </div>
        </div>
      )}

      {/* Sliding message container with elastic snapback */}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping
            ? "none"
            : "transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {children}
      </div>
    </div>
  );
};
