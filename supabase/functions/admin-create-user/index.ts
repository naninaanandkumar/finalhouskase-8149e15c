 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface CreateUserRequest {
   email: string;
   password: string;
   full_name?: string;
   company_name?: string;
   phone?: string;
   buyer_type: "shop" | "retail";
 }
 
 serve(async (req: Request) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller using anon client with their token
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !caller) {
      console.error("Auth error:", userError);
      throw new Error("Authentication failed");
    }

    // Create admin client with service role for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
 
     // Check if caller is admin
    const { data: adminRole } = await adminClient
       .from("user_roles")
       .select("role")
       .eq("user_id", caller.id)
       .eq("role", "admin")
       .single();
 
     if (!adminRole) {
       throw new Error("Only admins can create users");
     }
 
     // Parse request body
     const body: CreateUserRequest = await req.json();
     const { email, password, full_name, company_name, phone, buyer_type } = body;
 
     if (!email || !password || !buyer_type) {
       throw new Error("Email, password, and buyer_type are required");
     }
 
     // Runtime allow-list: never let a caller-supplied value grant admin roles.
     const ALLOWED_BUYER_TYPES = ["shop", "retail"] as const;
     if (!ALLOWED_BUYER_TYPES.includes(buyer_type as typeof ALLOWED_BUYER_TYPES[number])) {
       throw new Error("Invalid buyer_type. Allowed values: shop, retail");
     }
 
     // Create the user
     const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
       email,
       password,
       email_confirm: true, // Auto-confirm email
       user_metadata: { full_name },
     });
 
     if (createError) {
       throw createError;
     }
 
     if (!newUser.user) {
       throw new Error("Failed to create user");
     }
 
     const userId = newUser.user.id;
 
    // Upsert profile with additional info (profile might be created by trigger)
    const { error: profileError } = await adminClient
       .from("profiles")
      .upsert({
        user_id: userId,
        email: email,
         full_name,
         company_name,
         phone,
      }, { onConflict: 'user_id' });
 
     if (profileError) {
       console.error("Profile update error:", profileError);
     }
 
     // Assign buyer role
     const { error: roleError } = await adminClient.from("user_roles").insert({
       user_id: userId,
       role: buyer_type,
     });
 
     if (roleError) {
       console.error("Role assignment error:", roleError);
       throw new Error("Failed to assign user role");
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         user_id: userId,
         message: `User ${email} created successfully as ${buyer_type} buyer`,
       }),
       {
         status: 200,
         headers: { "Content-Type": "application/json", ...corsHeaders },
       }
     );
   } catch (error: any) {
     console.error("Error in admin-create-user:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 400,
       headers: { "Content-Type": "application/json", ...corsHeaders },
     });
   }
 });