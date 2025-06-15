
import { useState, useEffect } from "react";
import { Search, XCircle } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

const SearchInput = ({ value, onChange, onClear }: SearchInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const placeholders = [
    "Search for mentors...",
    "Who can help me with Python?",
    "Find a mentor for Data Structures",
    "Looking for help with Circuit Design",
  ];

  // Rotate through placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <div className="relative flex-1">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
        <Search className="h-5 w-5" />
      </div>
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholders[placeholderIndex]}
        className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
      
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
