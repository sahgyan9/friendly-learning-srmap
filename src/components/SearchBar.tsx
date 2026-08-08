
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
      const { data, error } = await supabase.functions.invoke('gemini-search', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error("Gemini search error:", error);
        toast.error("Search failed", {
          description: "Couldn't connect to Gemini AI. Please try again.",
        });
        return;
      }

      if (data.error) {
        console.error("Gemini API error:", data.error);
        toast.error("AI search error", {
          description: data.error,
        });
        return;
      }

      if (data.mentors && data.mentors.length > 0) {
        console.log("AI Search returned mentors:", data.mentors);
        onGeminiSearch(data.mentors);
        toast.success("AI Search Results", {
          description: `Found ${data.mentors.length} mentors that match your query`,
        });
      } else {
        toast("No results found", {
          description: "Try a different search term or browse all mentors",
        });
        onGeminiSearch([]); // Pass empty array to clear results
      }
    } catch (err) {
      console.error("Error during Gemini search:", err);
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
