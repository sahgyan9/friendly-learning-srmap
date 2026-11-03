import React, { useEffect, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getDynamicRelatedSearches } from "@/integrations/supabase/services/related-searches";

interface RelatedSearchesProps {
  query: string;
  onSelectQuery: (q: string) => void;
  className?: string;
}

export const RelatedSearches: React.FC<RelatedSearchesProps> = ({
  query,
  onSelectQuery,
  className,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    const fetchSearches = async () => {
      setIsLoading(true);
      try {
        const results = await getDynamicRelatedSearches(trimmed);
        if (isMounted) {
          setSuggestions(results);
        }
      } catch (error) {
        console.error("Failed to load related searches", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce the fetching slightly so we don't spam RPC calls while typing
    const timer = setTimeout(fetchSearches, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  if (!trimmed || (suggestions.length === 0 && !isLoading)) return null;

  return (
    <section className={cn("border-t border-border pt-6", className)} aria-busy={isLoading}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Related searches</h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {isLoading && suggestions.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-10 rounded-lg" />
            ))
          : suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuery(item)}
                className="group flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            ))}
      </div>
    </section>
  );
};

export default RelatedSearches;
