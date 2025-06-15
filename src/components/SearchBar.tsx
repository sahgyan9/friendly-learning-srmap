
import { useState, useEffect } from "react";
import { Search, XCircle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { useDebounce } from "@/hooks/useDebounce";
import type { Mentor } from "@/types/mentor";
import { Switch } from "@/components/ui/switch";

interface SearchBarProps {
  onSearch: (query: string, results?: Mentor[]) => void;
  onGeminiSearch: (mentors: Mentor[]) => void;
}

const SearchBar = ({ onSearch, onGeminiSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isGeminiSearching, setIsGeminiSearching] = useState(false);
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(false);
  const { toast } = useToast();
  
  // Use debounced value for search to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);
  
  const placeholders = [
    "Search for mentors...",
    "Who can help me with Python?",
    "Find a mentor for Data Structures",
    "Looking for help with Circuit Design",
  ];

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

  // Rotate through placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <div className="w-full max-w-3xl mx-auto mb-10">
      <form 
        onSubmit={handleSubmit}
        className="relative flex items-center transition-all duration-300 group"
      >
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Search className="h-5 w-5" />
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholders[placeholderIndex]}
            className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {isAiSearchEnabled ? (
          <Button
            type="button"
            variant="default"
            className="ml-2 flex items-center gap-1.5"
            onClick={handleGeminiSearch}
            disabled={isGeminiSearching}
          >
            <Sparkles className="h-4 w-4" />
            AI Search
            {isGeminiSearching && (
              <span className="ml-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
            )}
          </Button>
        ) : (
          <Button
            type="submit"
            variant="default"
            className="ml-2 flex items-center gap-1.5"
          >
            <Zap className="h-4 w-4" />
            Search
          </Button>
        )}
      </form>
      
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Popular:</span>
          {["Python", "Data Structures", "Machine Learning", "Web Development"].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                if (isAiSearchEnabled) {
                  setTimeout(() => handleGeminiSearch(), 100);
                }
              }}
              className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Enable AI Search</span>
          <Switch 
            checked={isAiSearchEnabled}
            onCheckedChange={setIsAiSearchEnabled}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
