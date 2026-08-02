import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ImageLightboxProps {
  /** The image to show. Null closes it. */
  src: string | null;
  onClose: () => void;
  /** Used for the accessible title, since the image itself has no caption. */
  title?: string;
}

/**
 * Full-screen view of a post image.
 *
 * The feed caps images at 512px so that one picture cannot take over the
 * scroll. That is right for scanning and wrong for reading: a lot of what gets
 * posted here is a photograph of a timetable, a screenshot of an error, or a
 * poster with small print, and at 512px none of it is legible. Rather than
 * choose between a feed you can scan and images you can read, this gives both.
 *
 * Built on the existing Dialog so the focus trap, Escape, scroll lock and
 * backdrop click all come from Radix. Hand-rolling an overlay gets three of
 * those four wrong.
 */
export function ImageLightbox({ src, onClose, title }: ImageLightboxProps) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(next) => !next && onClose()}>
      {/* The chrome is stripped back to nothing: no card, no padding, no
          border. Anything else is furniture around the one thing being
          looked at. */}
      <DialogContent
        className="max-w-[96vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[92vw]"
        onClick={onClose}
      >
        <DialogTitle className="sr-only">{title ?? "Post image"}</DialogTitle>

        {src && (
          <img
            src={src}
            alt={title ?? ""}
            // Clicking the backdrop closes; clicking the picture should not,
            // or a mis-aimed tap while panning around dismisses it.
            onClick={(event) => event.stopPropagation()}
            className="mx-auto max-h-[88vh] w-auto max-w-full rounded-lg object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageLightbox;
