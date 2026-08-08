import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";
import { SectionHeading } from "./SectionHeading";
import { Button } from "@/components/ui/button";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  author: string | null;
  published_at: string;
}

export function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, author, published_at")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false })
        .limit(4);
      if (!cancelled) setPosts((data as BlogPost[]) || []);
    };
    fetchPosts();
    const channel = supabase
      .channel("blog_posts_home")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, fetchPosts)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="py-8 sm:py-10 bg-background">
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading title="From Our Blog" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-shadow"
            >
              <div className="aspect-[16/9] bg-secondary overflow-hidden">
                <SignedImage
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {post.author ? ` · ${post.author}` : ""}
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground line-clamp-2">{post.title}</h3>
                {post.excerpt && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-5 text-center">
          <Link to="/blog">
            <Button variant="outline" className="text-sm">View all posts</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}