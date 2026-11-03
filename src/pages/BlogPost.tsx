import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
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

            <div className="flex min-h-screen flex-col bg-background">
                <main className="flex-1 pb-20 pt-20 sm:pt-24">
                    <div className="container px-4 md:px-6">
                        <article className="mx-auto max-w-[680px]">
                            <Link
                                to="/blog"
                                className="-ml-2 mb-10 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                All guides
                            </Link>

                            <header className="mb-10 flex flex-col gap-5 animate-fade-up">
                                {post.tags[0] && <p className="text-sm font-medium text-primary">{post.tags[0]}</p>}

                                <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-5xl">
                                    {post.title}
                                </h1>

                                <p className="text-xl leading-relaxed text-muted-foreground">{post.standfirst}</p>

                                <div className="mt-2 flex items-center gap-3 border-y border-border py-4 text-sm text-muted-foreground tabular">
                                    <span className="font-medium text-foreground">Friendly Learning SRMAP</span>
                                    <span aria-hidden>·</span>
                                    <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                                    <span aria-hidden>·</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" aria-hidden />
                                        {post.readingMinutes} min read
                                    </span>
                                </div>
                            </header>

                            <div className="text-[1.0625rem] leading-[1.7] text-foreground/90 sm:text-lg sm:leading-[1.7]">
                                {post.sections.map((section, index) => (
                                    <section key={section.heading ?? index} className="mt-10 first:mt-0">
                                        {section.heading && (
                                            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
                                                {section.heading}
                                            </h2>
                                        )}

                                        {section.body?.map((paragraph, pIndex) => (
                                            <p key={pIndex} className="my-5 first:mt-0">
                                                {paragraph}
                                            </p>
                                        ))}

                                        {section.list && (
                                            <ul className="my-5 list-disc space-y-2 pl-6 marker:text-muted-foreground">
                                                {section.list.map((item, lIndex) => (
                                                    <li key={lIndex} className="pl-1">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>
                                ))}
                            </div>

                            {post.tags.length > 0 && (
                                <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
                                    {post.tags.map((tag) => (
                                        <li key={tag}>
                                            <span className="inline-flex rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                                                {tag}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {post.cta && (
                                <div className="mt-12 flex justify-center border-t border-border pt-10">
                                    <Button asChild size="lg">
                                        <Link to={post.cta.to}>
                                            {post.cta.label}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            )}

                            {others.length > 0 && (
                                <aside className="mt-16 border-t border-border pt-8">
                                    <h2 className="mb-2 text-sm font-medium text-muted-foreground">Keep reading</h2>
                                    <ul className="divide-y divide-border">
                                        {others.map((other) => (
                                            <li key={other.slug}>
                                                <Link
                                                    to={`/blog/${other.slug}`}
                                                    className="group -mx-3 flex items-start justify-between gap-4 rounded-lg px-3 py-5 transition-colors duration-150 hover:bg-accent/60"
                                                >
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold leading-snug text-foreground underline-offset-4 decoration-foreground/30 group-hover:underline">
                                                            {other.title}
                                                        </h3>
                                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{other.excerpt}</p>
                                                    </div>
                                                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" aria-hidden />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
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
