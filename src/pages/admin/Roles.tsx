import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldOff, UserCog } from "lucide-react";

type Role = "admin" | "shop" | "retail";
interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roles: Role[];
}

export default function AdminRoles() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_users_with_roles");
    if (error) {
      toast({ title: "Failed to load users", description: error.message, variant: "destructive" });
    } else {
      setUsers((data as UserRow[]) || []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grant = async (user_id: string, role: Role) => {
    setBusy(user_id + role);
    const { error } = await supabase.from("user_roles").insert({ user_id, role });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: `Granted ${role}` });
    setBusy(null); load();
  };
  const revoke = async (user_id: string, role: Role) => {
    setBusy(user_id + role);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: `Revoked ${role}` });
    setBusy(null); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><UserCog className="h-6 w-6" />Role Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Assign or revoke <strong>admin</strong>, <strong>shop</strong> and <strong>retail</strong> roles. Admins can upload product/category/banner images and manage all content.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users have signed up yet.</p>
          ) : (
            <div className="divide-y">
              {users.map(u => (
                <div key={u.user_id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-[180px]">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="flex gap-1 mt-1">
                      {u.roles.length === 0 ? <Badge variant="outline">no role</Badge> : u.roles.map(r => <Badge key={r}>{r}</Badge>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["admin","shop","retail"] as Role[]).map(role => {
                      const has = u.roles.includes(role);
                      const loadingThis = busy === u.user_id + role;
                      return (
                        <Button key={role} size="sm" variant={has ? "destructive" : "outline"}
                          disabled={loadingThis}
                          onClick={() => has ? revoke(u.user_id, role) : grant(u.user_id, role)}>
                          {loadingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : has ? <ShieldOff className="h-3.5 w-3.5 mr-1" /> : <Shield className="h-3.5 w-3.5 mr-1" />}
                          {has ? `Revoke ${role}` : `Grant ${role}`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}