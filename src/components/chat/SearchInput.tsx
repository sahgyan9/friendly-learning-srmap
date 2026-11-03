
import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery?: (query: string) => void;
}

const SearchInput = ({ searchQuery, setSearchQuery }: SearchInputProps) => {
  return (
    <div className="relative group">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
        placeholder="Search conversations…"
        aria-label="Search messages"
        className={[
          "w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-base md:text-sm",
          "placeholder:text-muted-foreground text-foreground",
          "outline-none transition-colors duration-150",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
        ].join(" ")}
      />
    </div>
  );
};

export default SearchInput;
