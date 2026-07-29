import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, EyeOff, ExternalLink, Star, UserRound } from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FacultyRatingModal } from "@/components/faculty/FacultyRatingModal";
import { FacultyReviewsList } from "@/components/faculty/FacultyReviewsList";
import { StarRating } from "@/components/faculty/StarRating";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  RATING_CRITERIA,
  getFacultyBySlug,
  getFacultyReviews,
  getFacultyTagCounts,
  type Faculty,
  type FacultyReview,
} from "@/integrations/supabase/services/faculty";

/** Maps each rating criterion to its denormalised average on the faculty row. */
const CRITERION_AVERAGES: Record<string, (faculty: Faculty) => number> = {
  teaching: (faculty) => faculty.avg_teaching,
  grading: (faculty) => faculty.avg_grading,
  helpfulness: (faculty) => faculty.avg_helpfulness,
};

const FacultyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [reviews, setReviews] = useState<FacultyReview[]>([]);
  const [tagCounts, setTagCounts] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    const { data } = await getFacultyBySlug(slug);

    if (!data) {
      navigate("/faculty", { replace: true });
      return;
    }

    setFaculty(data);
    setLoading(false);

    setLoadingReviews(true);
    const [{ data: reviewData }, { data: tags }] = await Promise.all([
      getFacultyReviews(data.id),
      getFacultyTagCounts(data.id),
    ]);
    setReviews(reviewData);
    setTagCounts(tags);
    setLoadingReviews(false);
  }, [slug, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !faculty) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-4 px-4 py-8 pt-24">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="flex gap-6 pt-6">
              <Skeleton className="h-32 w-32 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasRatings = faculty.rating_count > 0;
  const canonical = `${PRIMARY_DOMAIN}/faculty/${faculty.slug}`;
  const ownReview = reviews.find((review) => review.is_own);

  // Distribution of overall scores, bucketed to whole stars.
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => Math.round(Number(review.overall)) === star).length,
  }));

  return (
    <>
      <SEOHead
        title={`${faculty.name} — Reviews & Ratings | SRM AP Faculty`}
        description={
          hasRatings
            ? `${faculty.name} (${faculty.department}) is rated ${Number(faculty.avg_overall).toFixed(1)}/5 by ${faculty.rating_count} SRM AP students on teaching, grading fairness and helpfulness.`
            : `Read and write anonymous student reviews for ${faculty.name}, ${faculty.department} at SRM University-AP.`
        }
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Faculty Ratings", url: `${PRIMARY_DOMAIN}/faculty` },
          { name: faculty.name, url: canonical },
        ])}
      />

      <div className="min-h-screen bg-background">

        <div className="container mx-auto max-w-4xl px-4 py-8 pt-24">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 gap-1.5">
            <Link to="/faculty">
              <ArrowLeft className="h-4 w-4" />
              All faculty
            </Link>
          </Button>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-muted sm:mx-0">
                  {faculty.image_url ? (
                    <img
                      src={faculty.image_url}
                      alt={faculty.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserRound className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <h1 className="text-2xl font-bold">{faculty.name}</h1>
                    <p className="text-sm text-muted-foreground">
                      {[faculty.designation, faculty.department].filter(Boolean).join(" · ")}
                    </p>
                    {faculty.school && (
                      <p className="text-xs text-muted-foreground">{faculty.school}</p>
                    )}
                  </div>

                  {hasRatings ? (
                    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-baseline sm:gap-3">
                      <span className="text-4xl font-bold tabular-nums">
                        {Number(faculty.avg_overall).toFixed(1)}
                      </span>
                      <div>
                        <StarRating value={Number(faculty.avg_overall)} />
                        <p className="text-xs text-muted-foreground">
                          {faculty.rating_count} anonymous{" "}
                          {faculty.rating_count === 1 ? "rating" : "ratings"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No ratings yet — yours would be the first.
                    </p>
                  )}

                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Button onClick={() => setShowRatingModal(true)}>
                      <Star className="mr-1.5 h-4 w-4" />
                      {ownReview ? "Edit your rating" : "Rate this faculty"}
                    </Button>

                    {faculty.profile_url && (
                      <Button asChild variant="outline">
                        <a href={faculty.profile_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Official profile
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasRatings && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <h2 className="text-sm font-semibold">Rated on</h2>
                  {RATING_CRITERIA.map((criterion) => {
                    const value = Number(CRITERION_AVERAGES[criterion.key](faculty));
                    return (
                      <div key={criterion.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{criterion.label}</span>
                          <span className="font-semibold tabular-nums">{value.toFixed(1)}</span>
                        </div>
                        <Progress value={(value / 5) * 100} className="h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 pt-6">
                  <h2 className="text-sm font-semibold">Score distribution</h2>
                  {distribution.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 tabular-nums text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                      <Progress
                        value={reviews.length ? (count / reviews.length) * 100 : 0}
                        className="h-1.5 flex-1"
                      />
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {tagCounts.length > 0 && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h2 className="mb-3 text-sm font-semibold">What students say most</h2>
                <div className="flex flex-wrap gap-2">
                  {tagCounts.map(({ tag, count }) => (
                    <Badge key={tag} variant="secondary" className="gap-1.5">
                      {tag}
                      <span className="tabular-nums opacity-60">{count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h2>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              All reviews are anonymous
            </span>
          </div>

          <FacultyReviewsList reviews={reviews} loading={loadingReviews} />
        </div>

        <Footer />
      </div>

      <FacultyRatingModal
        faculty={faculty}
        open={showRatingModal}
        onOpenChange={setShowRatingModal}
        onSubmitted={load}
      />
    </>
  );
};

export default FacultyDetail;
