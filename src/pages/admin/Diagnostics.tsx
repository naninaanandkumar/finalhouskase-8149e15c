import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, ShieldCheck, Image as ImageIcon, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface FilterResult {
  id: string;
  name: string;
  type: 'Product' | 'Category' | 'Hero' | 'Blog';
  reason: string;
  status: string;
}

export default function AdminDiagnostics() {
  const [results, setResults] = useState<FilterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults: FilterResult[] = [];

    // Check Products
    const { data: products } = await supabase.from("products").select("id, name, is_active");
    products?.forEach(p => {
      if (!p.is_active) {
        newResults.push({ id: p.id, name: p.name, type: 'Product', reason: 'is_active is false', status: 'Hidden' });
      }
    });

    // Check Categories
    const { data: categories } = await supabase.from("categories").select("id, name, is_active");
    categories?.forEach(c => {
      if (!c.is_active) {
        newResults.push({ id: c.id, name: c.name, type: 'Category', reason: 'is_active is false', status: 'Hidden' });
      }
    });

    // Check Hero Slides
    const { data: hero } = await supabase.from("hero_slides").select("id, title, is_active");
    hero?.forEach(h => {
      if (!h.is_active) {
        newResults.push({ id: h.id, name: h.title, type: 'Hero', reason: 'is_active is false', status: 'Hidden' });
      }
    });

    // Check Blog Posts
    const { data: blogs } = await supabase.from("blog_posts").select("id, title, is_published");
    blogs?.forEach(b => {
      if (!b.is_published) {
        newResults.push({ id: b.id, name: b.title, type: 'Blog', reason: 'is_published is false', status: 'Draft' });
      }
    });

    setResults(newResults);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const filteredResults = results.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Health & Status Panel</h1>
          <p className="text-muted-foreground">Identify records being filtered out from the storefront</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search diagnostics..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-card border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.filter(r => r.type === 'Product').length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive Banners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.filter(r => r.type === 'Hero').length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-slate-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Blog Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.filter(r => r.type === 'Blog').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Filtered Records</CardTitle>
          <CardDescription>Records with status that prevents them from appearing in public sections</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Running diagnostics...</TableCell></TableRow>
              ) : filteredResults.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">All systems go! No records are currently hidden.</TableCell></TableRow>
              ) : (
                filteredResults.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell><Badge variant="outline">{res.type}</Badge></TableCell>
                    <TableCell className="font-medium">{res.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{res.reason}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                        {res.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
