import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Eye, PenLine, Search, Sparkles } from "lucide-react";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
import { useAuth } from "@/context/AuthContext";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const BLOG_CATEGORIES = [
  "All",
  "Hackathons",
  "Tech & Dev",
  "Campus Life",
  "Placements",
  "Academics",
  "Projects",
  "Research",
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Blogs = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filterTag = selectedCategory === "All" ? undefined : selectedCategory.toLowerCase();
  const { posts, loading } = useBlogPosts({
    search: search.trim() || undefined,
    tag: filterTag,
    limit: 30,
  });

  return (
    <>
      <SEOHead
        title="Community Blog | Friendly Learning SRMAP"
        description="Long-form writing by SRM AP students and mentors — hackathon recaps, course notes, and campus life, written by the people living it."
        canonical={`${PRIMARY_DOMAIN}/blogs`}
      />

      <div className="min-h-screen flex flex-col bg-background">
        {/* Standard Brand Hero Header (§8 in Brand Guidelines) */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-emerald-500/5 via-background to-background">
          {/* Decorative ambient blobs */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />

          <div className="container mx-auto px-4 pb-6 pt-20 sm:pt-24">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Pill label */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <PenLine className="h-3.5 w-3.5" />
                Community Blog
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
                    Stories & Insights from Campus
                  </h1>
                  <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                    Written by SRM AP students and mentors. Share hackathon recaps, project walkthroughs, exam strategies, and honest campus experiences.
                  </p>
                </div>

                <div className="shrink-0">
                  <Button asChild size="lg" className="shadow-md font-semibold gap-2">
                    <Link to="/blogs/write">
                      <PenLine className="h-4 w-4" />
                      {user ? "Write a Story" : "Sign in to Write"}
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 container mx-auto px-4 py-8">
          {/* Search and Category Filter Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
            {/* Search Input */}
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stories, topics, authors..."
                className="pl-9 h-10 bg-background/80"
              />
            </div>

            {/* Category Filter Pills */}
            <HorizontalScroller ariaLabel="Community blog categories" className="pb-1">
              <div className="flex items-center gap-1.5">
                {BLOG_CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </HorizontalScroller>
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-5 overflow-hidden">
                  <Skeleton className="h-40 w-full mb-4 rounded-lg" />
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-6 w-4/5 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center max-w-lg mx-auto my-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {search || selectedCategory !== "All" ? "No stories found" : "No stories published yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {search || selectedCategory !== "All"
                  ? "Try adjusting your search terms or filter category."
                  : "Be the first SRM AP student or mentor to share your thoughts with the community."}
              </p>
              <Button asChild>
                <Link to="/blogs/write">
                  <PenLine className="mr-2 h-4 w-4" />
                  Write the First Story
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const isGradient = post.cover_image_url?.startsWith("gradient:") ?? false;
                const gradientStyle = isGradient ? post.cover_image_url?.replace("gradient:", "") : null;

                return (
                  <Card
                    key={post.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40"
                  >
                    {/* Top Accent Gradient Line */}
                    <CardAccentBorder gradient="emerald" />

                    {/* Card Hover Glow Overlay (§9.2 in Brand Guidelines) */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/4 to-transparent" />

                    <Link to={`/blogs/${post.slug}`} className="flex flex-col h-full">
                      {/* Cover Banner */}
                      {post.cover_image_url && (
                        <div className="relative h-44 w-full overflow-hidden bg-muted">
                          {isGradient ? (
                            <div className="h-full w-full" style={{ background: gradientStyle || "" }} />
                          ) : (
                            <img
                              src={post.cover_image_url}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                        </div>
                      )}

                      {/* Content Details */}
                      <div className="flex-1 p-5 flex flex-col">
                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="mb-2.5 flex flex-wrap gap-1.5">
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[11px] font-normal bg-secondary/80 text-foreground/80 hover:bg-secondary"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <h2 className="mb-2 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
                          {post.title}
                        </h2>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <p className="mb-4 line-clamp-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}

                        {/* Footer Meta */}
                        <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={post.author_image ?? undefined} alt="" />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(post.author_name ?? "Student")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground truncate max-w-[110px]">
                              {post.author_name ?? "Student"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
                            {post.view_count > 0 && (
                              <span className="flex items-center gap-1">
                                <span>·</span>
                                <Eye className="h-3 w-3" />
                                {post.view_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Blogs;
