
import { Skeleton } from "@/components/ui/skeleton";

const MentorCardSkeleton = () => (
  <div className="bg-card rounded-xl p-6 shadow-sm border border-border h-[260px]">
    <div className="flex items-start gap-4">
      <Skeleton className="w-16 h-16 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
    <div className="mt-4 mb-5">
      <Skeleton className="h-4 w-16 mb-2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
    <div className="flex gap-2 mt-4">
      <Skeleton className="h-10 flex-1 rounded-md" />
      <Skeleton className="h-10 flex-1 rounded-md" />
    </div>
  </div>
);

export default MentorCardSkeleton;
