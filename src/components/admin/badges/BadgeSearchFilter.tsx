
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface BadgeSearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
}

const BadgeSearchFilter = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange
}: BadgeSearchFilterProps) => {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1">
        <Label htmlFor="search" className="text-sm font-medium">
          Search Badges
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="search"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="min-w-[200px]">
        <Label htmlFor="category" className="text-sm font-medium">
          Filter by Category
        </Label>
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Achievement">Achievement</SelectItem>
            <SelectItem value="Participation">Participation</SelectItem>
            <SelectItem value="Excellence">Excellence</SelectItem>
            <SelectItem value="Recognition">Recognition</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BadgeSearchFilter;
