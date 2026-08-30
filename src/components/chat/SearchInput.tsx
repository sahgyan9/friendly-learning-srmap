
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
          "w-full rounded-xl border border-border/80 bg-background/80 dark:border-white/10 dark:bg-white/5 py-2 pl-9 pr-3 text-base md:text-sm shadow-2xs",
          "placeholder:text-muted-foreground/75 text-foreground",
          "outline-none transition-all duration-200",
          "focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20",
          "backdrop-blur-sm",
        ].join(" ")}
      />
    </div>
  );
};

export default SearchInput;
