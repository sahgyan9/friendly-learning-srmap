import { useState } from "react";
import { Link } from "react-router-dom";
import { PenLine, Search } from "lucide-react";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useBlogPosts } from "@/hooks/useBlogPosts";

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
  const { posts, loading } = useBlogPosts({ search: search.trim() || undefined, limit: 30 });

  return (
    <>
      <SEOHead
        title="Community Blog | Friendly Learning SRMAP"
        description="Long-form writing by SRM AP students and mentors — hackathon recaps, course notes, and campus life, written by the people living it."
        canonical={`${PRIMARY_DOMAIN}/blogs`}
      />

      <div className="min-h-screen">
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl">
              <header className="mb-10 text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight">Community Blog</h1>
                <p className="mb-6 text-lg text-muted-foreground">
                  Written by SRM AP students and mentors — not the team. Anyone signed in can publish a post.
                </p>
                <Button asChild size="lg">
                  <Link to="/blogs/write">
                    <PenLine className="mr-2 h-4 w-4" />
                    {user ? "Write a post" : "Sign in to write a post"}
                  </Link>
                </Button>
              </header>

              <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search community posts..."
                  className="pl-9"
                />
              </div>

              {loading ? (
                <div className="grid gap-5">
                  {[0, 1, 2].map((i) => (
                    <Card key={i} className="p-6">
                      <Skeleton className="mb-3 h-4 w-20" />
                      <Skeleton className="mb-2 h-6 w-4/5" />
                      <Skeleton className="h-4 w-full" />
                    </Card>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-xl border bg-muted/40 p-10 text-center">
                  <p className="text-muted-foreground">
                    {search ? "No posts match that search yet." : "No posts published yet — be the first to write one."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {posts.map((post) => (
                    <Card key={post.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <Link to={`/blogs/${post.slug}`} className="flex flex-col sm:flex-row">
                        {post.cover_image_url && (
                          <div className="aspect-video w-full shrink-0 overflow-hidden bg-muted sm:aspect-square sm:w-40">
                            <img
                              src={post.cover_image_url}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                        )}
                        <article className="flex-1 p-6">
                          {post.tags.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {post.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <h2 className="mb-2 text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
                            {post.title}
                          </h2>
                          {post.excerpt && <p className="mb-3 line-clamp-2 text-muted-foreground">{post.excerpt}</p>}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={post.author_image ?? undefined} alt="" />
                              <AvatarFallback className="text-4xs">{getInitials(post.author_name ?? "Student")}</AvatarFallback>
                            </Avatar>
                            <span>{post.author_name ?? "Student"}</span>
                            <span aria-hidden>·</span>
                            <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
                          </div>
                        </article>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Blogs;
