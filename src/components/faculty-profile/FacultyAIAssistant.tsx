import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Send,
  BookOpen,
  GraduationCap,
  MapPin,
  X,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { CampusAIOverview } from "@/components/search/CampusAIOverview";
import type { Faculty } from "@/integrations/supabase/services/faculty";
import { cn } from "@/lib/utils";

interface FacultyAIAssistantProps {
  faculty: Faculty;
}

const PROMPT_CHIPS = [
  {
    label: "Research papers & specializations",
    icon: Sparkles,
    suffix: "research specializations, publications, and laboratory work",
  },
  {
    label: "Courses & subjects taught",
    icon: BookOpen,
    suffix: "courses and subjects taught at SRM University-AP",
  },
  {
    label: "Office hours & guidance",
    icon: MapPin,
    suffix: "office location, cabin, and student project guidance suitability",
  },
  {
    label: "Course expectations",
    icon: GraduationCap,
    suffix: "teaching style and course expectations",
  },
];

export function FacultyAIAssistant({ faculty }: FacultyAIAssistantProps) {
  const [inputQuery, setInputQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const handleAsk = (queryText: string, label?: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    const fullQuery = `${faculty.name} ${faculty.department || ""} ${trimmed}`.trim();
    setActiveQuery(fullQuery);
    setActiveLabel(label || trimmed);
  };

  const handleClear = () => {
    setActiveQuery(null);
    setActiveLabel(null);
    setInputQuery("");
  };

  return (
    <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs transition-all duration-300">
      <CardAccentBorder gradient="rose" />

      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-500/5 blur-3xl" />

      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-2xs shrink-0">
              <CampusBrainIcon className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Ask CampusBrain about {faculty.name}
                </h2>
                <Badge variant="outline" className="text-3xs text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5">
                  AI Grounded
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Grounded answers synthesized from verified directory data, research specializations, and campus publications.
              </p>
            </div>
          </div>

          {activeQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="self-end sm:self-center text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Inline Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputQuery);
          }}
          className="relative flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask anything about Dr. ${faculty.name.split(" ").slice(-1)[0]}'s research papers, course expectations, or office hours...`}
              className="w-full rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-500/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => setInputQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!inputQuery.trim()}
            className="h-10 px-4 gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs shrink-0"
          >
            <span>Ask</span>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>

        {/* Quick Question Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-3xs font-medium text-muted-foreground uppercase tracking-wider mr-1">
            Suggested:
          </span>
          {PROMPT_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isCurrent = activeLabel === chip.label;

            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleAsk(chip.suffix, chip.label)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer",
                  isCurrent
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs"
                    : "border-border/70 bg-background hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3 text-rose-500 shrink-0" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Synthesized AI Overview Response */}
        {activeQuery && (
          <div className="pt-3 border-t border-border/60 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                <span>Answering: &ldquo;{activeLabel}&rdquo;</span>
              </div>

              <Link
                to={`/search?q=${encodeURIComponent(activeQuery)}`}
                className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
              >
                <span>View in full CampusBrain search</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <CampusAIOverview query={activeQuery} className="shadow-none border-border/70" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
