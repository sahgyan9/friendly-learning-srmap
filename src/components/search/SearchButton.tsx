import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

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
        className="ml-2 h-11"
        onClick={onAiSearch}
        isLoading={isGeminiSearching}
      >
        {!isGeminiSearching && <Search aria-hidden />}
        {isGeminiSearching ? "Searching" : "Search"}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      className="ml-2 h-11"
      onClick={onRegularSearch}
    >
      <Search aria-hidden />
      Search
    </Button>
  );
};

export default SearchButton;
