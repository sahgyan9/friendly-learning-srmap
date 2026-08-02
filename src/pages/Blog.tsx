import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBlogDate, getSortedBlogPosts } from "@/data/blog-posts";

const Blog = () => {
    const posts = getSortedBlogPosts();

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Friendly Learning SRMAP Blog",
        "description":
            "Practical guides for SRM AP students on choosing electives, finding hackathon teammates, and getting academic help.",
        "url": `${PRIMARY_DOMAIN}/blog`,
        "publisher": {
            "@type": "Organization",
            "name": "Friendly Learning SRMAP",
            "logo": `${PRIMARY_DOMAIN}/og-image.png`
        },
        "blogPost": posts.map((post) => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "datePublished": post.date,
            "url": `${PRIMARY_DOMAIN}/blog/${post.slug}`
        }))
    };

    return (
        <>
            <SEOHead
                title={ROUTE_META["/blog"].title}
                description={ROUTE_META["/blog"].description}
                keywords="srm ap student guides, srmap electives, hackathon teammates srm ap, study help srmap, friendly learning blog"
                canonical={`${PRIMARY_DOMAIN}/blog`}
                structuredData={structuredData}
            />

            <div className="min-h-screen">
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="mx-auto max-w-3xl">
                            <header className="mb-12 text-center">
                                <h1 className="mb-4 text-4xl font-bold tracking-tight">Guides for SRM AP students</h1>
                                <p className="text-lg text-muted-foreground">
                                    Short, practical writing on the decisions that actually shape a semester.
                                </p>
                            </header>

                            <div className="mb-16 grid gap-5">
                                {posts.map((post) => (
                                    <Card key={post.slug} className="group transition-all hover:-translate-y-0.5 hover:shadow-lg">
                                        <article className="p-6">
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                {post.tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="font-normal">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>

                                            <h2 className="mb-2 text-2xl font-bold leading-snug tracking-tight">
                                                <Link to={`/blog/${post.slug}`} className="transition-colors group-hover:text-primary">
                                                    {post.title}
                                                </Link>
                                            </h2>

                                            <p className="mb-4 text-muted-foreground">{post.excerpt}</p>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                                    {post.readingMinutes} min read
                                                </span>
                                                <Link
                                                    to={`/blog/${post.slug}`}
                                                    className="ml-auto flex items-center gap-1 font-medium text-primary"
                                                >
                                                    Read
                                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                </Link>
                                            </div>
                                        </article>
                                    </Card>
                                ))}
                            </div>

                            <div className="rounded-xl border bg-muted/40 p-8 text-center">
                                <h2 className="mb-2 text-2xl font-bold">Got a question these don't answer?</h2>
                                <p className="mb-6 text-muted-foreground">
                                    Ask it on Posts — every SRM AP student can post and reply.
                                </p>
                                <Button asChild size="lg">
                                    <Link to="/community-posts">Go to Posts</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default Blog;
