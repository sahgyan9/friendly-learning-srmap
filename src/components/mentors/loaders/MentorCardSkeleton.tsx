import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors MentorCard: avatar row, bio, skill chips, footer with rating and action. */
const MentorCardSkeleton = () => (
  <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-card">
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3.5 w-2/5" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  </div>
);

export default MentorCardSkeleton;
