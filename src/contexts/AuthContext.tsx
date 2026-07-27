import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppRole = "admin" | "shop" | "retail";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  gst_number: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string; buyer_type?: AppRole }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydrationRequestRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const currentRoleRef = useRef<AppRole | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    currentRoleRef.current = role;
  }, [role]);

  const fetchProfile = async (userId: string, clearExisting = true): Promise<AppRole | null> => {
    try {
      if (clearExisting) {
        setProfile(null);
        setRole(null);
      }
      let nextRole: AppRole | null = null;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      } else if (profileData) {
        setProfile(profileData as Profile);
      }

      

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (roleError) {
        console.error("Error fetching role:", roleError);
      } else if (roleData && roleData.length > 0) {
        // Check for admin first, then shop/retail
        const roles = roleData.map(r => r.role as AppRole);
        if (roles.includes("admin")) {
          nextRole = "admin";
        } else if (roles.includes("shop")) {
          nextRole = "shop";
        } else if (roles.includes("retail")) {
          nextRole = "retail";
        }
      }
      setRole(nextRole);
      return nextRole;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async (nextSession: Session | null, showLoader: boolean) => {
      const requestId = ++hydrationRequestRef.current;
      const nextUser = nextSession?.user ?? null;
      const sameReadyUser = Boolean(
        nextUser && currentUserIdRef.current === nextUser.id && currentRoleRef.current
      );

      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setRole(null);
        if (mounted && requestId === hydrationRequestRef.current) setIsLoading(false);
        return;
      }

      if (showLoader && !sameReadyUser) setIsLoading(true);

      try {
        await fetchProfile(nextUser.id, !sameReadyUser);
      } finally {
        if (mounted && requestId === hydrationRequestRef.current) setIsLoading(false);
      }
    };

    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        const nextUser = nextSession?.user ?? null;
        const sameReadyUser = Boolean(
          nextUser && currentUserIdRef.current === nextUser.id && currentRoleRef.current
        );

        if ((event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && sameReadyUser) {
          setSession(nextSession);
          setUser(nextUser);
          fetchProfile(nextUser.id, false).catch((error) => console.error("Background profile refresh failed:", error));
          return;
        }

        setTimeout(() => {
          void hydrateSession(nextSession, !sameReadyUser);
        }, 0);
      }
    );

    // Check for existing session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session restore failed:", error);
          await supabase.auth.signOut({ scope: "local" });
          await hydrateSession(null, true);
        } else {
          await hydrateSession(session, true);
        }
      } catch (error) {
        console.error("Session bootstrap error:", error);
        await supabase.auth.signOut({ scope: "local" });
        await hydrateSession(null, true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string; buyer_type?: AppRole }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: metadata?.full_name,
          },
        },
      });

      if (error) throw error;

      // Note: User role will be assigned by admin manually
      // This is intentional for B2B security
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account. Admin will assign your role.",
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Clear local state instantly for snappy UX
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    // Fire-and-forget network sign out (won't block UI)
    supabase.auth.signOut().catch((err) => console.error("signOut error:", err));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin: role === "admin",
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}