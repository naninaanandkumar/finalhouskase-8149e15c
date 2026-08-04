import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { SignedImage } from "@/components/common/SignedImage";
import { supabase } from "@/integrations/supabase/client";

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
        title={post ? `${post.title} — Houskase Blog` : "Blog — Houskase"}
        description={post?.excerpt || "Read the latest from the Houskase blog."}
      />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-8 max-w-3xl">
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
            <div className="mt-5 space-y-4 text-sm sm:text-base leading-relaxed text-foreground/90">
              {post.content.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="whitespace-pre-line">{para}</p>
              ))}
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