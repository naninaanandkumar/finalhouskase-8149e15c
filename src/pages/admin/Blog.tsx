import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ArrowLeft, Loader2, FileText, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";
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
  is_published: boolean;
  sort_order: number;
  published_at: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  author: "",
  tags: "",
  is_published: true,
  sort_order: "0",
  meta_title: "",
  meta_description: "",
  canonical_url: "",
};

export default function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("blog_posts").select("*").order("sort_order").order("published_at", { ascending: false });
    setPosts((data as Post[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openForm = (p?: Post) => {
    if (p) {
      setEditing(p);
      setForm({
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || "",
        content: p.content || "",
        cover_image: p.cover_image || "",
        author: p.author || "",
        tags: (p.tags || []).join(", "),
        is_published: p.is_published,
        sort_order: String(p.sort_order ?? 0),
        meta_title: p.meta_title || "",
        meta_description: p.meta_description || "",
        canonical_url: p.canonical_url || "",
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug || form.title),
      excerpt: form.excerpt || null,
      content: form.content,
      cover_image: form.cover_image || null,
      author: form.author || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      is_published: form.is_published,
      sort_order: parseInt(form.sort_order) || 0,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      canonical_url: form.canonical_url.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload);
    setIsSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Post updated" : "Post created" });
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Post deleted" });
    load();
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-display font-bold">{editing ? "Edit Post" : "New Blog Post"}</h1>
        </div>
        <Card className="shadow-card">
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto from title" /></div>
            </div>
            <div className="space-y-2"><Label>Short summary</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content *</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
                  {showPreview ? "Hide preview" : "Preview"}
                </Button>
              </div>
              <Textarea rows={14} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Write your post. Leave a blank line between paragraphs." />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Formatting: <code>## Heading</code>, <code>### Sub heading</code>, <code>- bullet</code>, <code>1. numbered</code>,
                {" "}<code>&gt; quote</code>, <code>**bold**</code>, <code>[text](link)</code>, <code>![caption](image-url)</code>,
                {" "}<code>---</code> divider, and an icon grid:
                {" "}<code>:::grid</code> … <code>Title :: description</code> … <code>:::</code>
              </p>
              {showPreview && (
                <div className="rounded-lg border border-border bg-background p-4 max-h-[500px] overflow-y-auto">
                  <BlogContent content={form.content} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cover image</Label>
              <ImageUpload value={form.cover_image} onChange={(url) => setForm((p) => ({ ...p, cover_image: url }))} bucket="product-images" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Author</Label><Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.is_published} onCheckedChange={(c) => setForm((p) => ({ ...p, is_published: c }))} /></div>
            <div className="rounded-lg border border-border p-4 space-y-4">
              <p className="text-sm font-semibold">SEO</p>
              <div className="space-y-2">
                <Label>SEO title</Label>
                <Input value={form.meta_title} onChange={(e) => setForm((p) => ({ ...p, meta_title: e.target.value }))} placeholder="Leave blank to use the post title" />
                <p className="text-xs text-muted-foreground">{form.meta_title.length}/60 characters</p>
              </div>
              <div className="space-y-2">
                <Label>Meta description</Label>
                <Textarea rows={2} value={form.meta_description} onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))} placeholder="Leave blank to use the short summary" />
                <p className="text-xs text-muted-foreground">{form.meta_description.length}/160 characters</p>
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input value={form.canonical_url} onChange={(e) => setForm((p) => ({ ...p, canonical_url: e.target.value }))} placeholder={`/blog/${slugify(form.slug || form.title) || "your-post-slug"}`} />
                <p className="text-xs text-muted-foreground">Leave blank to auto-use the post URL.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-gradient-accent">{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Blog</h1>
          <p className="text-muted-foreground text-sm">Posts appear on the homepage and the /blog page</p>
        </div>
        <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />New Post</Button>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No posts yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Cover</TableHead><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><SignedImage src={p.cover_image} alt="" className="w-20 h-12 object-cover rounded" /></TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.author || "—"}</TableCell>
                    <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${p.is_published ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.is_published ? "Published" : "Draft"}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openForm(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => {
                          await supabase.from("blog_posts").update({ is_published: !p.is_published }).eq("id", p.id);
                          load();
                        }}>
                          {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}