
import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from "lucide-react";

interface SearchButtonProps {
  isAiSearchEnabled: boolean;
  isGeminiSearching: boolean;
  onAiSearch: () => void;
  onRegularSearch: () => void;
}

const SearchButton = ({ 
  isAiSearchEnabled, 
  isGeminiSearching, 
  onAiSearch, 
  onRegularSearch 
}: SearchButtonProps) => {
  if (isAiSearchEnabled) {
    return (
      <Button
        type="button"
        variant="default"
        className="ml-2 flex items-center gap-1.5"
        onClick={onAiSearch}
        disabled={isGeminiSearching}
      >
        <Sparkles className="h-4 w-4" />
        AI Search
        {isGeminiSearching && (
          <span className="ml-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      variant="default"
      className="ml-2 flex items-center gap-1.5"
      onClick={onRegularSearch}
    >
      <Zap className="h-4 w-4" />
      Search
    </Button>
  );
};

export default SearchButton;
