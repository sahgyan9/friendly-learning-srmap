import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { formatBlogDate, getSortedBlogPosts } from "@/data/blog-posts";

const PostMeta = ({ date, minutes }: { date: string; minutes: number }) => (
    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground tabular">
        <time dateTime={date}>{formatBlogDate(date)}</time>
        <span aria-hidden>·</span>
        <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {minutes} min read
        </span>
    </div>
);

const Blog = () => {
    const posts = getSortedBlogPosts();
    const [featured, ...rest] = posts;

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

            <div className="flex min-h-screen flex-col bg-background">
                <main className="flex-1 pb-20 pt-24 sm:pt-28">
                    <div className="container max-w-3xl px-4 md:px-6">
                        <header className="mb-10 border-b border-border pb-8">
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                                Guides for SRM AP students
                            </h1>
                            <p className="mt-2 text-muted-foreground">
                                Short, practical writing on the decisions that actually shape a semester.
                            </p>
                        </header>

                        {featured && (
                            <article className="animate-fade-up">
                                <Link to={`/blog/${featured.slug}`} className="group block rounded-lg">
                                    <p className="mb-3 text-sm font-medium text-muted-foreground">
                                        Latest{featured.tags[0] && <> · <span className="text-primary">{featured.tags[0]}</span></>}
                                    </p>
                                    <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground underline-offset-4 decoration-foreground/30 group-hover:underline md:text-3xl">
                                        {featured.title}
                                    </h2>
                                    <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{featured.excerpt}</p>
                                    <PostMeta date={featured.date} minutes={featured.readingMinutes} />
                                </Link>
                            </article>
                        )}

                        {rest.length > 0 && (
                            <ul className="mt-10 divide-y divide-border border-t border-border">
                                {rest.map((post, index) => (
                                    <li
                                        key={post.slug}
                                        className="animate-fade-up"
                                        style={{ animationDelay: `${(index + 1) * 35}ms`, animationFillMode: "both" }}
                                    >
                                        <Link
                                            to={`/blog/${post.slug}`}
                                            className="group -mx-3 block rounded-lg px-3 py-6 transition-colors duration-150 hover:bg-accent/60"
                                        >
                                            {post.tags.length > 0 && (
                                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{post.tags.join(" · ")}</p>
                                            )}
                                            <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground underline-offset-4 decoration-foreground/30 group-hover:underline">
                                                {post.title}
                                            </h2>
                                            <p className="mt-1.5 line-clamp-2 text-muted-foreground">{post.excerpt}</p>
                                            <PostMeta date={post.date} minutes={post.readingMinutes} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <aside className="mt-16 flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="font-semibold text-foreground">Got a question these don't answer?</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Ask it on Posts. Every SRM AP student can post and reply.
                                </p>
                            </div>
                            <Button asChild className="shrink-0">
                                <Link to="/posts">Go to Posts</Link>
                            </Button>
                        </aside>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default Blog;
