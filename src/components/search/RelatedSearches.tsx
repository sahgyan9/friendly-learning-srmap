import React from "react";
import { Search, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelatedSearchesProps {
  query: string;
  onSelectQuery: (q: string) => void;
  className?: string;
}

export const RelatedSearches: React.FC<RelatedSearchesProps> = ({
  query,
  onSelectQuery,
  className,
}) => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Generate dynamic, contextually relevant query variations
  const suggestions: string[] = [];

  const lower = trimmed.toLowerCase();
  if (lower.includes("machine learning") || lower.includes("ml") || lower.includes("ai")) {
    suggestions.push("Machine learning faculty SRM AP");
    suggestions.push("Python & PyTorch mentors");
    suggestions.push("AI & Data Science project groups");
    suggestions.push("Computer Vision research faculty");
    suggestions.push("SIH AI & ML hackathon teams");
    suggestions.push("NLP student discussions");
  } else if (lower.includes("web") || lower.includes("react") || lower.includes("frontend") || lower.includes("full stack")) {
    suggestions.push("Full stack web dev mentors");
    suggestions.push("React & Next.js student groups");
    suggestions.push("Hackathon frontend teammates");
    suggestions.push("Web development project posts");
    suggestions.push("Backend & Node.js mentors");
  } else if (lower.includes("faculty") || lower.includes("prof") || lower.includes("dr")) {
    suggestions.push("Computer Science faculty list");
    suggestions.push("Electronics & Communication professors");
    suggestions.push("Top reviewed faculty SRM AP");
    suggestions.push("Faculty research interests directory");
    suggestions.push("Mechanical engineering faculty");
  } else if (lower.includes("mentor") || lower.includes("senior")) {
    suggestions.push("Senior mentors in CSE");
    suggestions.push("Competitive programming mentors");
    suggestions.push("4th year alumni mentors");
    suggestions.push("DSA and algorithms guidance");
    suggestions.push("How to request a mentor");
  } else if (lower.includes("hackathon") || lower.includes("sih") || lower.includes("contest")) {
    suggestions.push("Smart India Hackathon teams SRM AP");
    suggestions.push("Open hackathon teammate requests");
    suggestions.push("Competitive coding opportunities");
    suggestions.push("Hackathon preparation guide");
  } else if (lower.includes("group") || lower.includes("club") || lower.includes("community")) {
    suggestions.push("Student project groups SRM AP");
    suggestions.push("Coding clubs & societies");
    suggestions.push("Research study groups");
    suggestions.push("Create a new student group");
  } else {
    suggestions.push(`${trimmed} faculty`);
    suggestions.push(`${trimmed} mentors`);
    suggestions.push(`${trimmed} project groups`);
    suggestions.push(`${trimmed} campus posts`);
    suggestions.push(`Ask CampusMind about ${trimmed}`);
  }

  const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 6);

  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/40 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Related Campus Searches</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {uniqueSuggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuery(item)}
            className="group flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/60 hover:bg-accent/70 hover:border-primary/30 p-2.5 text-left text-xs font-medium text-foreground/90 transition-all duration-150 shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
              <span className="truncate group-hover:text-foreground">{item}</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedSearches;
