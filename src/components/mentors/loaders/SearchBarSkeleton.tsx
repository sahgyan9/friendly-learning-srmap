
import { Skeleton } from "@/components/ui/skeleton";

const SearchBarSkeleton = () => (
  <div className="w-full max-w-3xl mx-auto mb-10">
    <div className="flex items-center gap-2">
      <Skeleton className="h-12 flex-1 rounded-xl" />
      <Skeleton className="h-12 w-24 rounded-md" />
      <Skeleton className="h-12 w-32 rounded-md" />
    </div>
    <div className="mt-2 flex gap-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-28" />
    </div>
  </div>
);

export default SearchBarSkeleton;
