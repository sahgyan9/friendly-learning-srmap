import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coverImageOf } from "./article-prose";

interface BlogCoverPickerProps {
  coverUrl: string | null;
  onSelectCover: (url: string | null) => void;
  onRequestUpload: () => void;
  uploading?: boolean;
}

/**
 * Cover slot above the title. Covers are photos only; older posts may still
 * carry a `gradient:` preset, which readers no longer see, so it is shown here
 * as a plain notice the author can replace or remove.
 */
export function BlogCoverPicker({
  coverUrl,
  onSelectCover,
  onRequestUpload,
  uploading = false,
}: BlogCoverPickerProps) {
  const image = coverImageOf(coverUrl);
  const isLegacyCover = Boolean(coverUrl) && !image;

  if (!coverUrl) {
    return (
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 h-9 gap-2 px-2 text-muted-foreground hover:text-foreground"
          onClick={onRequestUpload}
          isLoading={uploading}
        >
          {!uploading && <ImagePlus className="h-4 w-4" />}
          {uploading ? "Uploading cover…" : "Add cover"}
        </Button>
      </div>
    );
  }

  const actions = (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 bg-background"
        onClick={onRequestUpload}
        isLoading={uploading}
      >
        {!uploading && <Upload className="h-3.5 w-3.5" />}
        Replace
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 bg-background text-muted-foreground hover:text-destructive"
        onClick={() => onSelectCover(null)}
        disabled={uploading}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove
      </Button>
    </div>
  );

  if (isLegacyCover) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          This post has a colour cover from the old editor, which readers no longer see. Upload a photo or remove it.
        </p>
        {actions}
      </div>
    );
  }

  return (
    <figure className="relative overflow-hidden rounded-lg border border-border bg-muted">
      <img src={image ?? undefined} alt="Post cover" className="aspect-[16/9] w-full object-cover" />
      <div className="absolute bottom-3 right-3">{actions}</div>
    </figure>
  );
}
