import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MobileDialog = DialogPrimitive.Root;

const MobileDialogTrigger = DialogPrimitive.Trigger;

const MobileDialogPortal = DialogPrimitive.Portal;

const MobileDialogClose = DialogPrimitive.Close;

const MobileDialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
MobileDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const MobileDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    position?: "bottom" | "center" | "top";
  }
>(({ className, children, showCloseButton = true, position = "bottom", ...props }, ref) => (
  <MobileDialogPortal>
    <MobileDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid w-full gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // Mobile-first positioning
        position === "bottom" && [
          "bottom-0 left-0 right-0",
          "rounded-t-lg border-b-0",
          "max-h-[85vh] overflow-y-auto",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          // Safe area support
          "pb-[env(safe-area-inset-bottom)]"
        ],
        position === "center" && [
          "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
          "max-w-lg max-h-[90vh] overflow-y-auto",
          "rounded-lg mx-4",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        ],
        position === "top" && [
          "top-0 left-0 right-0",
          "rounded-b-lg border-t-0",
          "max-h-[85vh] overflow-y-auto",
          "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          // Safe area support
          "pt-[env(safe-area-inset-top)]"
        ],
        // Desktop fallback
        "sm:rounded-lg sm:max-w-lg sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
        "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
        "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center -m-2">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </MobileDialogPortal>
));
MobileDialogContent.displayName = DialogPrimitive.Content.displayName;

const MobileDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
MobileDialogHeader.displayName = "MobileDialogHeader";

const MobileDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0",
      // Mobile-optimized button layout
      "gap-2",
      className
    )}
    {...props}
  />
);
MobileDialogFooter.displayName = "MobileDialogFooter";

const MobileDialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
MobileDialogTitle.displayName = DialogPrimitive.Title.displayName;

const MobileDialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
MobileDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  MobileDialog,
  MobileDialogPortal,
  MobileDialogOverlay,
  MobileDialogClose,
  MobileDialogTrigger,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogFooter,
  MobileDialogTitle,
  MobileDialogDescription,
};
