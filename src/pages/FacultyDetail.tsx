import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Star, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  facultyService,
  type Faculty,
  type FacultyRating,
  type MyFacultyRating,
} from "@/integrations/supabase/services/faculty";
import FacultyRatingModal from "@/components/faculty/FacultyRatingModal";
import FacultyReviewsList from "@/components/faculty/FacultyReviewsList";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

const FacultyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [reviews, setReviews] = useState<FacultyRating[]>([]);
  const [myRating, setMyRating] = useState<MyFacultyRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    const [f, rs, mine] = await Promise.all([
      facultyService.getFaculty(id),
      facultyService.getFacultyRatings(id),
      user ? facultyService.getMyRating(id, user.id) : Promise.resolve(null),
    ]);
    setFaculty(f);
    setReviews(rs);
    setMyRating(mine);
    setReviewsLoading(false);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async () => {
    if (!user || !id || !myRating) return;
    if (!confirm("Delete your rating?")) return;
    try {
      await facultyService.deleteMyRating(id, user.id);
      toast.success("Your rating has been deleted");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Faculty not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/faculty"><ArrowLeft className="h-4 w-4 mr-2" />Back to Faculty</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${faculty.name} — Rate Anonymously | Friendly Learning`}
        description={`Read anonymous ratings and reviews for ${faculty.name}, ${faculty.designation || "faculty"} in ${faculty.department} at SRM University AP.`}
      />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/faculty"><ArrowLeft className="h-4 w-4 mr-2" />All faculty</Link>
        </Button>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="h-20 w-20">
              <AvatarImage src={faculty.profile_image || undefined} alt={faculty.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials(faculty.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{faculty.name}</h1>
              {faculty.designation && (
                <p className="text-muted-foreground mt-0.5">{faculty.designation}</p>
              )}
              <p className="text-sm font-medium mt-2">{faculty.department}</p>
              {faculty.school && <p className="text-xs text-muted-foreground">{faculty.school}</p>}

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <Star
                    className={`h-5 w-5 ${
                      faculty.rating_count > 0
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="font-semibold">
                    {faculty.rating_count > 0 ? Number(faculty.avg_rating).toFixed(1) : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({faculty.rating_count} {faculty.rating_count === 1 ? "rating" : "ratings"})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            {myRating ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Your rating: </span>
                  <span className="font-medium">{myRating.rating}/5</span>
                  {myRating.comment && (
                    <span className="text-muted-foreground"> — "{myRating.comment.slice(0, 80)}{myRating.comment.length > 80 ? "…" : ""}"</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
                <Star className="h-4 w-4 mr-2" /> Rate this faculty anonymously
              </Button>
            )}
          </div>
        </Card>

        <section>
          <h2 className="text-lg font-semibold mb-4">Anonymous reviews</h2>
          <FacultyReviewsList reviews={reviews} isLoading={reviewsLoading} />
        </section>

        <FacultyRatingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          facultyId={faculty.id}
          facultyName={faculty.name}
          existing={myRating}
          onSubmitted={refresh}
        />
      </div>
    </>
  );
};

export default FacultyDetail;
