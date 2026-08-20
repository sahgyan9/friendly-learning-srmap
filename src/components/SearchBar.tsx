
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { useDebounce } from "@/hooks/useDebounce";
import type { Mentor } from "@/types/mentor";
import SearchInput from "./search/SearchInput";
import SearchButton from "./search/SearchButton";

interface SearchBarProps {
  onSearch: (query: string, results?: Mentor[]) => void;
  onGeminiSearch: (mentors: Mentor[]) => void;
}

const SearchBar = ({ onSearch, onGeminiSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isGeminiSearching, setIsGeminiSearching] = useState(false);
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(false);

  // Use debounced value for search to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);

  // Dynamic search using the debounced query
  useEffect(() => {
    if (!isAiSearchEnabled && debouncedQuery.trim()) {
      handleDynamicSearch(debouncedQuery);
    }
  }, [debouncedQuery, isAiSearchEnabled]);
  
  // Function to handle dynamic search
  const handleDynamicSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearch("");
      return;
    }
    
    try {
      const { data, error } = await searchMentors(searchQuery);
      
      if (error) {
        console.error("Search error:", error);
        return;
      }
      
      onSearch(searchQuery, data || []);
    } catch (err) {
      console.error("Error during search:", err);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAiSearchEnabled) {
      handleGeminiSearch();
    } else {
      handleDynamicSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery("");
    onSearch("");
  };

  const handleGeminiSearch = async () => {
    if (!query.trim()) {
      toast.error("Empty search", {
        description: "Please enter a search query first",
      });
      return;
    }

    setIsGeminiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query: query.trim(), types: ['mentor'], limit: 12 }
      });

      if (error) {
        console.error("Semantic search error:", error);
        toast.error("Search failed", {
          description: "Couldn't connect to AI search. Please try again.",
        });
        return;
      }

      if (data.error) {
        console.error("AI search error:", data.error);
        toast.error("AI search error", {
          description: data.error,
        });
        return;
      }

      const mentorHits = (data.mentors || []) as Array<{ entity_id: string }>;
      if (mentorHits.length > 0) {
        const ids = mentorHits.map(m => m.entity_id);
        const { data: mentorsData, error: mentorsError } = await supabase
          .from('mentors')
          .select('*')
          .in('id', ids);

        if (!mentorsError && mentorsData) {
          // Preserve semantic similarity order
          const idOrder = new Map(ids.map((id, index) => [id, index]));
          const sortedMentors = (mentorsData as unknown as Mentor[]).sort(
            (a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999)
          );
          onGeminiSearch(sortedMentors);
          toast.success("AI Search Results", {
            description: `Found ${sortedMentors.length} mentors matching your request`,
          });
          return;
        }
      }

      toast("No matching mentors found", {
        description: "Try broader keywords or browse by department",
      });
      onGeminiSearch([]);
    } catch (err) {
      console.error("Error during AI search:", err);
      toast.error("Search error", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsGeminiSearching(false);
    }
  };

  return (
    <div className="w-full mb-4">
      <form 
        onSubmit={handleSubmit}
        className="relative flex items-center transition-all duration-300 group"
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          onClear={clearSearch}
        />

        <SearchButton
          isAiSearchEnabled={isAiSearchEnabled}
          isGeminiSearching={isGeminiSearching}
          onAiSearch={handleGeminiSearch}
          onRegularSearch={() => handleDynamicSearch(query)}
        />
      </form>
    </div>
  );
};

export default SearchBar;
