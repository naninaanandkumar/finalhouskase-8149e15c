import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Plus, Search, MoreHorizontal, Mail, Phone, ShieldCheck, ShieldOff, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserDetailSheet } from "@/components/admin/UserDetailSheet";

interface UserData {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  gst_number: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterField, setFilterField] = useState<"all" | "email" | "full_name" | "company_name" | "phone" | "gst_number">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (debouncedQuery) {
        const q = `%${debouncedQuery}%`;
        if (filterField === "all") {
          query = query.or(
            `email.ilike.${q},full_name.ilike.${q},company_name.ilike.${q},phone.ilike.${q},gst_number.ilike.${q}`
          );
        } else {
          query = query.ilike(filterField, q);
        }
      }

      const { data: profiles, error, count } = await query;
      if (error) throw error;
      const list = (profiles || []) as UserData[];
      setUsers(list);
      setTotalCount(count ?? list.length);
      setActiveCount(list.filter((u) => u.is_active).length);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debouncedQuery, filterField]);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !currentActive }).eq("user_id", userId);
      if (error) throw error;
      toast({ title: currentActive ? "User Deactivated" : "User Activated", description: `User has been ${currentActive ? "deactivated" : "activated"}.` });
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
    }
  };

  const filteredUsers = users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Customers</h1>
        <Button onClick={() => navigate("/admin/users/new")} className="bg-gradient-accent gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value as typeof filterField)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-48"
            >
              <option value="all">All fields</option>
              <option value="email">Email</option>
              <option value="full_name">Full Name</option>
              <option value="company_name">Company Name</option>
              <option value="phone">Phone</option>
              <option value="gst_number">GST Number</option>
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  filterField === "all"
                    ? "Search email, name, company, phone, GST..."
                    : `Search by ${filterField.replace("_", " ")}...`
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Customers ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No customers found</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedUserId(user.user_id); setDetailOpen(true); }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name || "—"}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</p>
                            {user.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{user.company_name || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="secondary" className="bg-success/10 text-success"><ShieldCheck className="h-3 w-3 mr-1" />Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive"><ShieldOff className="h-3 w-3 mr-1" />Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleActive(user.user_id, user.is_active)}>
                                {user.is_active ? (
                                  <><ShieldOff className="h-4 w-4 mr-2 text-destructive" />Deactivate</>
                                ) : (
                                  <><ShieldCheck className="h-4 w-4 mr-2 text-success" />Activate</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailSheet userId={selectedUserId} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
