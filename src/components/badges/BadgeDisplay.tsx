import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BadgeCard from "./BadgeCard";
import { useBadges } from "@/hooks/useBadges";

interface BadgeDisplayProps {
  userId: string;
  showAll?: boolean;
}

const BadgeDisplay = ({ userId, showAll = false }: BadgeDisplayProps) => {
  const { userBadges, getUserBadgesByCategory } = useBadges(userId);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'performance', 'expertise', 'contribution', 'special'];
  
  const filteredBadges = selectedCategory === 'all' 
    ? userBadges
    : getUserBadgesByCategory(selectedCategory);

  return (
    <Card>
      <CardContent className="p-6">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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

        {/* Empty state */}
        {filteredBadges.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {selectedCategory === 'all'
                ? "No badges earned yet"
                : `No ${selectedCategory} badges earned yet`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BadgeDisplay;
