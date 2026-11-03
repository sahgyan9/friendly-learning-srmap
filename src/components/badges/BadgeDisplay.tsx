import { useState } from "react";
import { Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import BadgeCard from "./BadgeCard";
import { useBadges } from "@/hooks/useBadges";

interface BadgeDisplayProps {
  userId: string;
  showAll?: boolean;
}

const CATEGORIES = ['all', 'performance', 'expertise', 'contribution', 'special'];

const BadgeDisplay = ({ userId }: BadgeDisplayProps) => {
  const { userBadges, getUserBadgesByCategory } = useBadges(userId);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredBadges = selectedCategory === 'all'
    ? userBadges
    : getUserBadgesByCategory(selectedCategory);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Badge category">
          {CATEGORIES.map((category) => {
            const selected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "h-8 rounded-md border px-3 text-xs font-medium capitalize transition-colors duration-150",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {category}
              </button>
            );
          })}
        </div>

        {filteredBadges.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge.badge_type}
                awarded={true}
                awardedDate={badge.awarded_at}
                showDescription={true}
                size="md"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Award className="h-5 w-5 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              {selectedCategory === 'all'
                ? "No badges earned yet."
                : `No ${selectedCategory} badges earned yet.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BadgeDisplay;
