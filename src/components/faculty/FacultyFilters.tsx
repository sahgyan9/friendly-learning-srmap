import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  departments: string[];
  selected: string | null;
  onSelect: (dept: string | null) => void;
}

const FacultyFilters = ({ search, onSearchChange, departments, selected, onSelect }: Props) => {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search faculty by name or department…"
          className="pl-9"
        />
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          <Badge
            variant={selected === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onSelect(null)}
          >
            All
          </Badge>
          {departments.map((d) => (
            <Badge
              key={d}
              variant={selected === d ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onSelect(d)}
            >
              {d}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default FacultyFilters;
