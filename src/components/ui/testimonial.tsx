import * as React from "react"
import { motion, PanInfo, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Testimonial {
  id: number | string
  name: string
  avatar: string
  description: string
}

interface TestimonialCarouselProps
  extends React.HTMLAttributes<HTMLDivElement> {
  testimonials: Testimonial[]
  showArrows?: boolean
  showDots?: boolean
}

const TestimonialCarousel = React.forwardRef<
  HTMLDivElement,
  TestimonialCarouselProps
>(
  (
    { className, testimonials, showArrows = true, showDots = true, ...props },
    ref,
  ) => {
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const [exitX, setExitX] = React.useState(0)

    const handleDragEnd = (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: PanInfo,
    ) => {
      if (Math.abs(info.offset.x) > 100) {
        setExitX(info.offset.x)
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % testimonials.length)
          setExitX(0)
        }, 200)
      }
    }

    const handleNext = () => {
      setExitX(-200)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        setExitX(0)
      }, 200)
    }

    const handlePrev = () => {
      setExitX(200)
      setTimeout(() => {
        setCurrentIndex(
          (prev) => (prev - 1 + testimonials.length) % testimonials.length,
        )
        setExitX(0)
      }, 200)
    }

    return (
      <div
        ref={ref}
        className={cn("relative w-full py-8", className)}
        {...props}
      >
        <div className="relative h-[320px] w-full flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {testimonials.map((testimonial, index) => {
              const isCurrentCard = index === currentIndex
              const isPrevCard =
                index === (currentIndex + 1) % testimonials.length
              const isNextCard =
                index === (currentIndex + 2) % testimonials.length

              if (!isCurrentCard && !isPrevCard && !isNextCard) return null

              return (
                <motion.div
                  key={testimonial.id}
                  className={cn(
                    "absolute w-[300px] md:w-[360px] rounded-2xl bg-card border border-border p-6 shadow-lg cursor-grab active:cursor-grabbing",
                    isCurrentCard && "z-30",
                    isPrevCard && "z-20",
                    isNextCard && "z-10",
                  )}
                  initial={{
                    scale: isCurrentCard ? 1 : 0.9,
                    y: isCurrentCard ? 0 : 20,
                    opacity: isCurrentCard ? 1 : 0.6,
                  }}
                  animate={{
                    scale: isCurrentCard ? 1 : isPrevCard ? 0.95 : 0.9,
                    y: isCurrentCard ? 0 : isPrevCard ? 10 : 20,
                    x: exitX && isCurrentCard ? exitX : 0,
                    opacity: isCurrentCard ? 1 : isPrevCard ? 0.7 : 0.4,
                    rotateZ: isCurrentCard
                      ? exitX
                        ? exitX * 0.03
                        : 0
                      : isPrevCard
                        ? -2
                        : 2,
                  }}
                  exit={{ x: exitX, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  drag={isCurrentCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={isCurrentCard ? handleDragEnd : undefined}
                >
                  {showArrows && isCurrentCard && (
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-3">
                      <button
                        onClick={handlePrev}
                        className="h-10 w-10 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors"
                      >
                        ←
                      </button>
                      <button
                        onClick={handleNext}
                        className="h-10 w-10 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors"
                      >
                        →
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center gap-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                    />
                    <h4 className="font-semibold text-lg text-foreground">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                      {testimonial.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {showDots && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  },
)
TestimonialCarousel.displayName = "TestimonialCarousel"

export { TestimonialCarousel, type Testimonial }
