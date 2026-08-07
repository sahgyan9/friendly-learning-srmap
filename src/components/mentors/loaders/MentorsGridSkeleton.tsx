
import MentorCardSkeleton from "./MentorCardSkeleton";

interface MentorsGridSkeletonProps {
  count?: number;
}

const MentorsGridSkeleton = ({ count = 8 }: MentorsGridSkeletonProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <MentorCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default MentorsGridSkeleton;
