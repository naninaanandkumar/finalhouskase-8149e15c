import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { SignedImage } from "@/components/common/SignedImage";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  author: string | null;
  published_at: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, author, published_at")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog — Houskase Home & Cleaning Tips"
        description="Guides, tips and stories from Houskase on towels, tissues and everyday cleaning essentials for Indian homes and businesses."
      />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Blog</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tips, guides and stories from the Houskase team.</p>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">No blog posts published yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-shadow"
              >
                <div className="aspect-[16/9] bg-secondary overflow-hidden">
                  <SignedImage src={post.cover_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {post.author ? ` · ${post.author}` : ""}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-foreground line-clamp-2">{post.title}</h2>
                  {post.excerpt && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}