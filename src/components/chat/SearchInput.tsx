
import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery?: (query: string) => void;
}

const SearchInput = ({ searchQuery, setSearchQuery }: SearchInputProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <input 
        type="text" 
        placeholder="Search messages..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
        className="w-full pl-10 p-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
};

export default SearchInput;
