import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
import { Building2, Store, ArrowLeft, Loader2, UserPlus } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 
 export default function AdminUserCreate() {
   const navigate = useNavigate();
   const [isCreating, setIsCreating] = useState(false);
   const { toast } = useToast();
 
   const [formData, setFormData] = useState({
     email: "",
     password: "",
     full_name: "",
     company_name: "",
     phone: "",
     buyer_type: "shop" as "shop" | "retail",
   });
 
   const handleCreateUser = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!formData.email || !formData.password) {
       toast({
         title: "Error",
         description: "Email and password are required",
         variant: "destructive",
       });
       return;
     }
 
     setIsCreating(true);
     try {
       const { data, error } = await supabase.functions.invoke("admin-create-user", {
         body: {
           email: formData.email,
           password: formData.password,
           full_name: formData.full_name,
           company_name: formData.company_name,
           phone: formData.phone,
           buyer_type: formData.buyer_type,
         },
       });
 
       if (error) throw error;
 
       toast({
         title: "User Created Successfully",
         description: `${formData.email} has been created as a ${formData.buyer_type === "shop" ? "Wholesale" : "Retail"} buyer.`,
       });
 
       navigate("/admin/users");
     } catch (error: any) {
       console.error("Error creating user:", error);
       toast({
         title: "Error",
         description: error.message || "Failed to create user",
         variant: "destructive",
       });
     }
     setIsCreating(false);
   };
 
   return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/users")}
          className="shrink-0 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Create New Buyer
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a new Shop or Retail buyer account
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">New Account</span>
        </div>
      </div>

      <form onSubmit={handleCreateUser} className="space-y-8">
        {/* Buyer Type Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Select Buyer Type</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, buyer_type: "shop" }))}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left",
                formData.buyer_type === "shop"
                  ? "border-shop bg-shop/5 shadow-sm"
                  : "border-border hover:border-shop/50 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                formData.buyer_type === "shop" ? "bg-shop/10" : "bg-muted"
              )}>
                <Building2 className={cn(
                  "h-6 w-6",
                  formData.buyer_type === "shop" ? "text-shop" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <span className={cn(
                  "text-base font-semibold block",
                  formData.buyer_type === "shop" ? "text-shop" : "text-foreground"
                )}>
                  Shop (Wholesale)
                </span>
                <span className="text-sm text-muted-foreground">
                  Bulk pricing & lower MOQ
                </span>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, buyer_type: "retail" }))}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left",
                formData.buyer_type === "retail"
                  ? "border-retail bg-retail/5 shadow-sm"
                  : "border-border hover:border-retail/50 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                formData.buyer_type === "retail" ? "bg-retail/10" : "bg-muted"
              )}>
                <Store className={cn(
                  "h-6 w-6",
                  formData.buyer_type === "retail" ? "text-retail" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <span className={cn(
                  "text-base font-semibold block",
                  formData.buyer_type === "retail" ? "text-retail" : "text-foreground"
                )}>
                  Retailer
                </span>
                <span className="text-sm text-muted-foreground">
                  Flexible quantities
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Account Details Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Account Details</h2>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="buyer@company.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                required
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Details</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                placeholder="ABC Trading Co."
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate("/admin/users")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isCreating}
            className={cn(
              "min-w-[180px]",
              formData.buyer_type === "shop" ? "bg-gradient-shop" : "bg-gradient-retail"
            )}
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Buyer Account
          </Button>
        </div>
      </form>
    </motion.div>
   );
 }