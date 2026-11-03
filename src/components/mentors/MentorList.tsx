import { SearchX } from "lucide-react";
import MentorCard from "@/components/MentorCard";
import MentorCardSkeleton from "@/components/mentors/loaders/MentorCardSkeleton";
import { Mentor } from "@/types/mentor";

interface MentorListProps {
  isLoading: boolean;
  mentors: Mentor[];
  isAiSearch: boolean;
  /** Shown in the empty state so the one way out is next to the message. */
  onReset?: () => void;
}

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
/** Only the first row or two get a staggered entrance; later cards just appear. */
const STAGGERED = 6;

const MentorList = ({ isLoading, mentors, isAiSearch, onReset }: MentorListProps) => {
  if (isLoading) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Loading mentors">
        {Array.from({ length: 6 }).map((_, index) => (
          <MentorCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center animate-fade-in">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <SearchX className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h3 className="text-base font-semibold">No mentors match this filter</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another topic or a different search term.
          </p>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Show all mentors
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {isAiSearch && (
        <p className="mb-4 text-sm text-muted-foreground">
          Ranked by how closely each profile matches your search.
        </p>
      )}

      <div className={GRID}>
        {mentors.map((mentor, index) => (
          <div
            key={mentor.id}
            className="min-w-0 animate-fade-up"
            style={index < STAGGERED ? { animationDelay: `${index * 35}ms`, animationFillMode: "both" } : undefined}
          >
            <MentorCard mentor={mentor} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MentorList;
