import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, UserRound, ExternalLink } from "lucide-react";
import { useSRMAPFaculty } from "@/hooks/useSRMAPFaculty";

interface SRMAPFacultyRatingTemplateProps {
  limit?: number;
  searchQuery?: string;
  onRateClick?: (facultySlug: string, facultyName: string) => void;
}

export function SRMAPFacultyRatingTemplate({
  limit = 8,
  searchQuery = "",
  onRateClick,
}: SRMAPFacultyRatingTemplateProps) {
  const { faculty, loading, error } = useSRMAPFaculty();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const filteredFaculty = faculty.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.department.toLowerCase().includes(query) ||
      item.slug.toLowerCase().includes(query)
    );
  });

  const visibleFaculty = filteredFaculty.slice(0, limit);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Rate SRMAP Physics Faculty</h2>
          <p className="text-sm text-muted-foreground">
            Auto-synced from SRMAP website. New faculty entries appear automatically after refresh.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Live Sync
        </Badge>
      </div>

      {visibleFaculty.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          {searchQuery.trim() ? "No faculty match your search." : "No faculty found right now."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {visibleFaculty.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <UserRound className="h-9 w-9 text-muted-foreground" />
                )}
              </div>

              <CardHeader className="pb-1 px-3 pt-2">
                <h3 className="text-sm font-semibold leading-tight line-clamp-2">{item.name}</h3>
                <p className="text-[11px] text-muted-foreground">{item.department}</p>
              </CardHeader>

              <CardContent className="pt-0 px-3" />

              <CardFooter className="mt-auto flex gap-1.5 px-3 pb-3 pt-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onRateClick?.(item.slug, item.name)}
                >
                  <Star className="mr-1 h-3 w-3" />
                  Rate
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => window.open(item.profileUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default SRMAPFacultyRatingTemplate;
