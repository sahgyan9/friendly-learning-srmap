import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Faculty } from "@/integrations/supabase/services/faculty";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const FacultyCard = ({ faculty }: { faculty: Faculty }) => {
  return (
    <Link to={`/faculty/${faculty.id}`} className="block group">
      <Card className="p-5 h-full transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={faculty.profile_image || undefined} alt={faculty.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials(faculty.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
              {faculty.name}
            </h3>
            {faculty.designation && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {faculty.designation}
              </p>
            )}
            <p className="text-xs text-foreground/70 mt-1 truncate">{faculty.department}</p>
            {faculty.school && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{faculty.school}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <Star
              className={`h-4 w-4 ${
                faculty.rating_count > 0
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
            <span className="text-sm font-medium">
              {faculty.rating_count > 0 ? Number(faculty.avg_rating).toFixed(1) : "—"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {faculty.rating_count} {faculty.rating_count === 1 ? "rating" : "ratings"}
          </span>
        </div>
      </Card>
    </Link>
  );
};

export default FacultyCard;
