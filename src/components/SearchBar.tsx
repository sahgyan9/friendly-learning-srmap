import { useState, useEffect, useRef } from "react";
import { Search, Sparkles, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetPortal,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onGeminiSearch: (query: string) => void;
}

interface SearchFilters {
  department?: string;
  skills?: string[];
  rating?: number;
}

const departments = [
  "All Departments",
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Physics",
  "Mathematics",
  "Chemistry",
  "Biology",
];

const SearchBar = ({ onSearch, onGeminiSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    onSearch(query, {
      ...filters,
      skills: selectedSkills,
    });
  };

  const handleGeminiSearch = () => {
    if (query.trim()) {
      onGeminiSearch(query);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  useEffect(() => {
    // Auto-focus search input on desktop
    if (window.innerWidth >= 768 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search mentors by name, skills, or department..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 h-12 rounded-xl"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="w-full sm:w-80">
                <SheetHeader>
                  <SheetTitle>Search Filters</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select
                      value={filters.department || ""}
                      onValueChange={(value) =>
                        setFilters({ ...filters, department: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="Add a skill and press Enter"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            addSkill(input.value);
                            input.value = "";
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <AnimatePresence>
                        {selectedSkills.map((skill) => (
                          <motion.div
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge
                              variant="secondary"
                              className="px-2 py-1 cursor-pointer"
                              onClick={() => removeSkill(skill)}
                            >
                              {skill}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minimum Rating</label>
                    <Select
                      value={filters.rating?.toString() || ""}
                      onValueChange={(value) =>
                        setFilters({ ...filters, rating: Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select minimum rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 3, 3.5, 4, 4.5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            {rating === 0 ? "Any rating" : `${rating}+ stars`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      handleSearch();
                      setIsFilterOpen(false);
                    }}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="default"
            size="lg"
            className="w-full sm:w-auto gap-2"
            onClick={handleGeminiSearch}
            disabled={!query.trim()}
          >
            <Sparkles className="h-4 w-4" />
            AI Search
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      <AnimatePresence>
        {(selectedSkills.length > 0 ||
          filters.department ||
          filters.rating) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap gap-2"
            >
              {filters.department && (
                <Badge
                  variant="outline"
                  className="px-2 py-1 cursor-pointer"
                  onClick={() =>
                    setFilters({ ...filters, department: undefined })
                  }
                >
                  {filters.department}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.rating && (
                <Badge
                  variant="outline"
                  className="px-2 py-1 cursor-pointer"
                  onClick={() => setFilters({ ...filters, rating: undefined })}
                >
                  {filters.rating}+ stars
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {selectedSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="px-2 py-1 cursor-pointer"
                  onClick={() => removeSkill(skill)}
                >
                  {skill}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {(selectedSkills.length > 0 ||
                filters.department ||
                filters.rating) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setSelectedSkills([]);
                      setFilters({});
                    }}
                  >
                    Clear all
                  </Button>
                )}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
