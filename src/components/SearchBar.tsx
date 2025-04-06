
import { useState, useEffect, useCallback } from "react";
import { Search, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Mentor } from "@/types/mentor";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onGeminiSearch: (mentors: Mentor[]) => void;
}

const SearchBar = ({ onSearch, onGeminiSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isGeminiSearching, setIsGeminiSearching] = useState(false);
  const { toast } = useToast();
  
  const placeholders = [
    "Search for mentors by name or skills...",
    "Who can help me with Python?",
    "Find a mentor for Data Structures",
    "Looking for help with Circuit Design",
  ];

  // Memoize the search callback to prevent infinite loops
  const handleSearchChange = useCallback((q: string) => {
    onSearch(q);
  }, [onSearch]);

  // Update search results as user types - with dependency array to prevent infinite loops
  useEffect(() => {
    handleSearchChange(query);
  }, [query, handleSearchChange]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const clearSearch = () => {
    setQuery("");
    // onSearch(""); - this is now handled by the effect
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
        
        <Button 
          type="submit"
          className="ml-2 px-6"
        >
          Search
        </Button>

        <Button
          type="button"
          variant="outline"
          className="ml-2 flex items-center gap-1.5 text-primary border-primary hover:bg-primary/10"
          onClick={handleGeminiSearch}
          disabled={isGeminiSearching}
        >
          <Sparkles className="h-4 w-4" />
          AI Search
          {isGeminiSearching && (
            <span className="ml-1 h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          )}
        </Button>
      </form>
      
      <div className="mt-2 flex flex-wrap gap-2 px-1">
        <span className="text-sm text-muted-foreground">Popular:</span>
        {["Python", "Data Structures", "Machine Learning", "Web Development"].map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setQuery(tag);
            }}
            className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
