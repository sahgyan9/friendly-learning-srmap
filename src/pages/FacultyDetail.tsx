import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FacultyRatingModal } from "@/components/faculty/FacultyRatingModal";
import { FacultyReviewsList } from "@/components/faculty/FacultyReviewsList";
import FacultyHeroHeader from "@/components/faculty-profile/FacultyHeroHeader";
import FacultyQuickStatsStrip from "@/components/faculty-profile/FacultyQuickStatsStrip";
import FacultyResearchShowcase from "@/components/faculty-profile/FacultyResearchShowcase";
import FacultyStudentSentimentCard from "@/components/faculty-profile/FacultyStudentSentimentCard";
import FacultyCoursesSection from "@/components/faculty-profile/FacultyCoursesSection";
import SimilarFacultySection from "@/components/faculty-profile/SimilarFacultySection";

import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  getFacultyBySlug,
  getFacultyReviews,
  getFacultyTagCounts,
  type Faculty,
  type FacultyReview,
} from "@/integrations/supabase/services/faculty";

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
        <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8 pt-24">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasRatings = faculty.rating_count > 0;
  const interests = [...(faculty.interests ?? []), ...(faculty.research_areas ?? [])];
  const canonical = `${PRIMARY_DOMAIN}/faculty/${faculty.slug}`;
  const ownReview = Boolean(reviews.find((review) => review.is_own));

  // Distribution of overall scores, bucketed to whole stars
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => Math.round(Number(review.overall)) === star).length,
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.08,
      },
    },
  };

  return (
    <>
      <SEOHead
        title={`${faculty.name} Profile, Ratings & Research — SRM AP`}
        description={
          hasRatings
            ? `${faculty.name} (${faculty.department}) is rated ${Number(faculty.avg_overall).toFixed(1)}/5 by ${faculty.rating_count} SRM AP students on teaching, grading fairness and helpfulness.`
            : `Explore research specializations, email, and anonymous student reviews for ${faculty.name}, ${faculty.department} at SRM University-AP.`
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
        <div className="container mx-auto max-w-5xl px-4 py-8 pt-24 pb-16">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-6 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate("/faculty");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            All faculty directory
          </Button>

          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 1. HERO HEADER */}
            <FacultyHeroHeader
              faculty={faculty}
              ownReview={ownReview}
              onRateClick={() => setShowRatingModal(true)}
            />

            {/* 2. AT-A-GLANCE STATS STRIP */}
            <FacultyQuickStatsStrip
              faculty={faculty}
              interestsCount={interests.length}
            />

            {/* 3. RESEARCH DOMAINS & SPECIALIZATIONS */}
            <FacultyResearchShowcase
              interests={interests}
              researchDetails={faculty.research_details}
              department={faculty.department}
            />

            {/* 4. COURSES & SUBJECTS TAUGHT */}
            <FacultyCoursesSection
              reviews={reviews}
              department={faculty.department}
            />

            {/* 5. STUDENT SENTIMENT & CRITERIA RADAR */}
            <FacultyStudentSentimentCard
              faculty={faculty}
              tagCounts={tagCounts}
              distribution={distribution}
            />

            {/* 6. ANONYMOUS REVIEWS SECTION */}
            <section className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Student Reviews
                  {reviews.length > 0 && (
                    <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {reviews.length}
                    </span>
                  )}
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
                  All reviews are strictly anonymous
                </span>
              </div>

              <FacultyReviewsList reviews={reviews} loading={loadingReviews} />
            </section>

            {/* 7. SIMILAR FACULTY DISCOVERY */}
            <SimilarFacultySection
              currentFacultyId={faculty.id}
              department={faculty.department}
            />
          </motion.div>
        </div>

        <Footer />
      </div>

      {/* Review / Rating Modal */}
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
