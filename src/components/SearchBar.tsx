
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { useDebounce } from "@/hooks/useDebounce";
import type { Mentor } from "@/types/mentor";
import SearchInput from "./search/SearchInput";
import SearchButton from "./search/SearchButton";
import PopularTags from "./search/PopularTags";
import SearchToggle from "./search/SearchToggle";

interface SearchBarProps {
  onSearch: (query: string, results?: Mentor[]) => void;
  onGeminiSearch: (mentors: Mentor[]) => void;
}

const SearchBar = ({ onSearch, onGeminiSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isGeminiSearching, setIsGeminiSearching] = useState(false);
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(false);
  const { toast } = useToast();
  
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
      toast({
        title: "Empty search",
        description: "Please enter a search query first",
        variant: "destructive",
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
        toast({
          title: "Search failed",
          description: "Couldn't connect to Gemini AI. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        console.error("Gemini API error:", data.error);
        toast({
          title: "AI search error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.mentors && data.mentors.length > 0) {
        console.log("AI Search returned mentors:", data.mentors);
        onGeminiSearch(data.mentors);
        toast({
          title: "AI Search Results",
          description: `Found ${data.mentors.length} mentors that match your query`,
        });
      } else {
        toast({
          title: "No results found",
          description: "Try a different search term or browse all mentors",
        });
        onGeminiSearch([]); // Pass empty array to clear results
      }
    } catch (err) {
      console.error("Error during Gemini search:", err);
      toast({
        title: "Search error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeminiSearching(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    if (isAiSearchEnabled) {
      setTimeout(() => handleGeminiSearch(), 100);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-10">
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
      
      <div className="mt-3 flex items-center justify-between px-1">
        <PopularTags onTagClick={handleTagClick} />
        <SearchToggle 
          isEnabled={isAiSearchEnabled}
          onChange={setIsAiSearchEnabled}
        />
      </div>
    </div>
  );
};

export default SearchBar;
