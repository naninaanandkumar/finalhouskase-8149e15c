import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { SignedImage } from "@/components/common/SignedImage";
import { supabase } from "@/integrations/supabase/client";
import { BlogContent } from "@/components/blog/BlogContent";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  tags: string[] | null;
  published_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      setPost((data as Post) || null);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={post ? post.meta_title || `${post.title} — Houskase Blog` : "Blog — Houskase"}
        description={
          post?.meta_description ||
          post?.excerpt ||
          "Read the latest from the Houskase blog."
        }
        canonical={post ? post.canonical_url || `${window.location.origin}/blog/${post.slug}` : undefined}
        ogType="article"
        ogImage={post?.cover_image || undefined}
        keywords={post?.tags?.join(", ")}
        jsonLd={
          post
            ? {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: post.title,
                description: post.meta_description || post.excerpt || undefined,
                image: post.cover_image || undefined,
                datePublished: post.published_at,
                author: { "@type": "Person", name: post.author || "Houskase" },
                publisher: { "@type": "Organization", name: "Houskase" },
                mainEntityOfPage: {
                  "@type": "WebPage",
                  "@id": post.canonical_url || `${window.location.origin}/blog/${post.slug}`,
                },
                keywords: post.tags?.join(", "),
              }
            : undefined
        }
      />
      <Header />
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : !post ? (
          <p className="py-20 text-center text-sm text-muted-foreground">This post could not be found.</p>
        ) : (
          <article className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{post.title}</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              {post.author ? ` · ${post.author}` : ""}
            </p>
            {post.cover_image && (
              <div className="mt-4 rounded-xl overflow-hidden border border-border">
                <SignedImage src={post.cover_image} alt={post.title} className="w-full object-cover" />
              </div>
            )}
            <div className="mt-5">
              <BlogContent content={post.content} />
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span key={t} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{t}</span>
                ))}
              </div>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}