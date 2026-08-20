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

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
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
  />
))
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

export { Avatar, AvatarImage, AvatarFallback }
