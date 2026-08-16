import React, { useEffect, useState } from "react";
import { Search, ChevronRight, Loader2 } from "lucide-react";
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
    <div className={cn("rounded-2xl border border-border/40 bg-card/40 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Related Campus Searches</h3>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-2" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {isLoading && suggestions.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-10 rounded-xl bg-muted/40 animate-pulse border border-border/20" />
            ))
          : suggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectQuery(item)}
                className="group flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/60 hover:bg-accent/70 hover:border-primary/30 p-2.5 text-left text-xs font-medium text-foreground/90 transition-all duration-150 shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                  <span className="truncate group-hover:text-foreground">{item}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
      </div>
    </div>
  );
};

export default RelatedSearches;

