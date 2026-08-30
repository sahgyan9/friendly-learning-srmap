import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

// Sources that have already decoded successfully in this tab.
//
// Radix's Image does not render an <img> at all until it has preloaded the
// source through a throwaway `new Image()`, and it starts that over from
// scratch on every mount. Nothing in this app keeps a route mounted across a
// tab switch, so returning to Messages or the feed re-ran the gate for every
// avatar on screen and each one blinked back to its initials first — even
// though the bytes were sitting in cache and came back in a millisecond.
//
// Remembering the sources that already worked lets a remount paint them
// immediately instead of waiting to re-discover what we know.
const loadedImageSources = new Set<string>()

// Bounded so a long session scrolling a big feed cannot grow this without
// limit. A Set iterates in insertion order, so the first key is the oldest.
const MAX_REMEMBERED_SOURCES = 400

function rememberLoadedSource(src: string) {
  if (loadedImageSources.size >= MAX_REMEMBERED_SOURCES) {
    const oldest = loadedImageSources.values().next()
    if (!oldest.done) {
      loadedImageSources.delete(oldest.value)
    }
  }
  loadedImageSources.add(src)
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, onLoadingStatusChange, onError, ...props }, ref) => {
  const src = typeof props.src === "string" && props.src !== "" ? props.src : undefined

  const [isKnownLoaded, setIsKnownLoaded] = React.useState(
    () => src !== undefined && loadedImageSources.has(src)
  )

  React.useEffect(() => {
    setIsKnownLoaded(src !== undefined && loadedImageSources.has(src))
  }, [src])

  if (src !== undefined && isKnownLoaded) {
    return (
      // Absolutely positioned rather than in flow, so it covers the fallback
      // that Radix is still rendering underneath — bypassing the preload gate
      // means bypassing the status this Root's Fallback keys off. The Root is
      // `relative` and this is opaque and object-cover, so the initials never
      // show through and nothing moves.
      <img
        ref={ref}
        loading="eager"
        decoding="async"
        {...props}
        src={src}
        className={cn(
          "absolute inset-0 aspect-square h-full w-full object-cover",
          className
        )}
        onError={(event) => {
          // The object went away (a replaced avatar whose old file was
          // deleted). Forget it and hand the element back to Radix, which
          // will fail the same way and show the fallback properly.
          loadedImageSources.delete(src)
          setIsKnownLoaded(false)
          onError?.(event)
        }}
      />
    )
  }

  return (
    // `object-cover` is not decoration. The box is forced square, and an <img>
    // defaults to `object-fit: fill`, so every portrait photo was being squashed
    // to fit — a 3024x4032 phone picture drawn into 28x28 loses a quarter of its
    // height, which on a face is the difference between someone and a caricature
    // of them. A few call sites had already worked this out and passed
    // `object-cover` by hand; the ones that hadn't were quietly distorting.
    <AvatarPrimitive.Image
      ref={ref}
      // Defaults, not overrides: 29 of the 30 call sites never set these, so
      // avatars across every list/card/feed were loaded eagerly regardless of
      // scroll position. A call site that needs eager loading (e.g. a lone
      // above-the-fold profile photo) can still pass loading="eager" and win,
      // since {...props} is spread after these.
      loading="lazy"
      decoding="async"
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
      onError={onError}
      onLoadingStatusChange={(status) => {
        if (status === "loaded" && src !== undefined) {
          rememberLoadedSource(src)
        }
        onLoadingStatusChange?.(status)
      }}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarFallback, AvatarImage }

