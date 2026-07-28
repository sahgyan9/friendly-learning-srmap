import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { formatBlogDate, getBlogPost, getSortedBlogPosts } from "@/data/blog-posts";
import NotFound from "./NotFound";

/**
 * The blog index has always linked to /blog/:slug, but no such route existed —
 * every "Read more" landed on the 404 page. This is that route.
 */
const BlogPost = () => {
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? getBlogPost(slug) : undefined;

    // An unknown slug is a genuine 404. Rendering the page in place keeps the
    // bad URL visible instead of bouncing to a path that isn't a real route.
    if (!post) return <NotFound />;

    const url = `${PRIMARY_DOMAIN}/blog/${post.slug}`;
    const others = getSortedBlogPosts().filter((other) => other.slug !== post.slug).slice(0, 2);

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "datePublished": post.date,
        "dateModified": post.date,
        "keywords": post.tags.join(", "),
        "image": `${PRIMARY_DOMAIN}/og-image.png`,
        "author": { "@type": "Organization", "name": "Friendly Learning SRMAP" },
        "publisher": {
            "@type": "Organization",
            "name": "Friendly Learning SRMAP",
            "logo": { "@type": "ImageObject", "url": `${PRIMARY_DOMAIN}/og-image.png` }
        },
        "mainEntityOfPage": { "@type": "WebPage", "@id": url }
    };

    return (
        <>
            <SEOHead
                title={`${post.title} | Friendly Learning SRMAP`}
                description={post.excerpt}
                keywords={post.tags.join(", ").toLowerCase()}
                canonical={url}
                ogType="article"
                structuredData={articleSchema}
            />
            <StructuredData
                data={getBreadcrumbSchema([
                    { name: "Home", url: `${PRIMARY_DOMAIN}/` },
                    { name: "Blog", url: `${PRIMARY_DOMAIN}/blog` },
                    { name: post.title, url }
                ])}
            />

            <div className="min-h-screen">
                <Navbar />
                <main className="pb-16 pt-24">
                    <div className="container px-4 md:px-6">
                        <article className="mx-auto max-w-2xl">
                            <Link
                                to="/blog"
                                className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                All guides
                            </Link>

                            <header className="mb-10">
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {post.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="font-normal">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>

                                <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                                    {post.title}
                                </h1>

                                <p className="mb-5 text-lg leading-relaxed text-muted-foreground">
                                    {post.standfirst}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
                                    <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" aria-hidden />
                                        {post.readingMinutes} min read
                                    </span>
                                </div>
                            </header>

                            <div className="space-y-10">
                                {post.sections.map((section, index) => (
                                    <section key={section.heading ?? index} className="space-y-4">
                                        {section.heading && (
                                            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                                                {section.heading}
                                            </h2>
                                        )}

                                        {section.body?.map((paragraph, pIndex) => (
                                            <p key={pIndex} className="leading-relaxed text-muted-foreground">
                                                {paragraph}
                                            </p>
                                        ))}

                                        {section.list && (
                                            <ul className="space-y-2.5 pl-1">
                                                {section.list.map((item, lIndex) => (
                                                    <li key={lIndex} className="flex gap-3 leading-relaxed text-muted-foreground">
                                                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>
                                ))}
                            </div>

                            {post.cta && (
                                <div className="mt-12 rounded-xl border bg-muted/40 p-6 text-center">
                                    <Button asChild size="lg">
                                        <Link to={post.cta.to}>
                                            {post.cta.label}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            )}

                            {others.length > 0 && (
                                <aside className="mt-16 border-t pt-8">
                                    <h2 className="mb-4 text-lg font-bold">Keep reading</h2>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {others.map((other) => (
                                            <Card key={other.slug} className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
                                                <Link to={`/blog/${other.slug}`} className="block p-5">
                                                    <h3 className="mb-1.5 font-semibold leading-snug transition-colors group-hover:text-primary">
                                                        {other.title}
                                                    </h3>
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                                        {other.excerpt}
                                                    </p>
                                                </Link>
                                            </Card>
                                        ))}
                                    </div>
                                </aside>
                            )}
                        </article>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default BlogPost;
