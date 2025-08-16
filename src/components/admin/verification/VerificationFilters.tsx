import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

interface VerificationFiltersProps {
  onFiltersChange: (filters: VerificationFilters) => void;
  totalResults: number;
  filteredResults: number;
}

export interface VerificationFilters {
  search: string;
  department: string;
  university: string;
  cgpaRange: string;
  yearOfStudies: string;
}

const VerificationFilters = ({ 
  onFiltersChange, 
  totalResults, 
  filteredResults 
}: VerificationFiltersProps) => {
  const [filters, setFilters] = useState<VerificationFilters>({
    search: '',
    department: '',
    university: '',
    cgpaRange: '',
    yearOfStudies: ''
  });

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const updateFilter = (key: keyof VerificationFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: VerificationFilters = {
      search: '',
      department: '',
      university: '',
      cgpaRange: '',
      yearOfStudies: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, email, or skills..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {Object.values(filters).filter(v => v !== '').length}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center space-x-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {isFiltersOpen && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <Select value={filters.department} onValueChange={(value) => updateFilter('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Information Technology">Information Technology</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Chemical">Chemical</SelectItem>
                  <SelectItem value="Biotechnology">Biotechnology</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">CGPA Range</label>
              <Select value={filters.cgpaRange} onValueChange={(value) => updateFilter('cgpaRange', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All CGPA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All CGPA</SelectItem>
                  <SelectItem value="9.0-10.0">9.0 - 10.0</SelectItem>
                  <SelectItem value="8.0-8.9">8.0 - 8.9</SelectItem>
                  <SelectItem value="7.0-7.9">7.0 - 7.9</SelectItem>
                  <SelectItem value="6.0-6.9">6.0 - 6.9</SelectItem>
                  <SelectItem value="below-6.0">Below 6.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Year of Studies</label>
              <Select value={filters.yearOfStudies} onValueChange={(value) => updateFilter('yearOfStudies', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All years</SelectItem>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                  <SelectItem value="Masters">Masters</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">University</label>
              <Input
                placeholder="Filter by university"
                value={filters.university}
                onChange={(e) => updateFilter('university', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {(hasActiveFilters || filters.search) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md">
          <span>
            Showing {filteredResults} of {totalResults} applications
          </span>
          {hasActiveFilters && (
            <div className="flex items-center space-x-2">
              <span>Active filters:</span>
              <div className="flex space-x-1">
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{filters.search.length > 20 ? filters.search.substring(0, 20) + '...' : filters.search}"
                  </Badge>
                )}
                {filters.department && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.department}
                  </Badge>
                )}
                {filters.cgpaRange && (
                  <Badge variant="secondary" className="text-xs">
                    CGPA: {filters.cgpaRange}
                  </Badge>
                )}
                {filters.yearOfStudies && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.yearOfStudies}
                  </Badge>
                )}
                {filters.university && (
                  <Badge variant="secondary" className="text-xs">
                    Uni: {filters.university}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationFilters;
