import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, Phone, Mail, Clock, CheckCircle, Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Upload, X, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRFQCart } from "@/hooks/useRFQCart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEOHead } from "@/components/SEOHead";

export default function RFQ() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: rfqItems, itemCount, isLoading: isCartLoading, updateQuantity, removeFromCart, clearCart } = useRFQCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [buyerType, setBuyerType] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).filter(file => {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      // Max 5 files
      if (attachments.length >= 5) {
        toast({
          title: "Too many files",
          description: "Maximum 5 files allowed",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...newFiles].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (rfqId: string): Promise<string[]> => {
    if (attachments.length === 0) return [];

    const uploadedUrls: string[] = [];
    const folder = user?.id || `anonymous-${Date.now()}`;

    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${rfqId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('rfq-attachments')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }

      if (data) {
        uploadedUrls.push(data.path);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot bot detection
    if (honeypot) {
      setSubmitted(true);
      return;
    }

    // Client-side rate limiting (1 submission per 60 seconds)
    const now = Date.now();
    if (now - lastSubmitTime < 60000) {
      toast({
        title: "Please wait",
        description: "You can submit another RFQ after 1 minute.",
        variant: "destructive",
      });
      return;
    }
    
    if (rfqItems.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please add products to your RFQ cart before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setLastSubmitTime(now);

    try {
      const form = formRef.current;
      if (!form) return;

      const formData = new FormData(form);
      const fullName = formData.get("name") as string;
      const companyName = formData.get("company") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const gstNumber = formData.get("gst") as string;
      const message = formData.get("message") as string;

      // Generate RFQ number
      const rfqNumber = `RFQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Calculate total quantity
      const totalQuantity = rfqItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Get product names
      const productNames = rfqItems.map(item => item.product?.name || "Unknown").join(", ");

      // Insert RFQ into database
      const { data: rfqData, error: rfqError } = await supabase
        .from("rfq_requests")
        .insert({
          rfq_number: rfqNumber,
          full_name: fullName,
          company_name: companyName,
          email: email,
          phone: phone || null,
          gst_number: gstNumber || null,
          buyer_type: buyerType as "shop" | "retail" || null,
          product_name: productNames.length > 100 ? `${rfqItems.length} products` : productNames,
          quantity: totalQuantity,
          message: message || null,
          user_id: user?.id || null,
          status: "pending",
        })
        .select()
        .single();

      if (rfqError) throw rfqError;

      // Upload attachments
      if (attachments.length > 0) {
        setIsUploading(true);
        const uploadedUrls = await uploadAttachments(rfqData.id);
        if (uploadedUrls.length > 0) {
          await supabase
            .from("rfq_requests")
            .update({ attachments: uploadedUrls })
            .eq("id", rfqData.id);
        }
        setIsUploading(false);
      }

      // Insert RFQ items
      const rfqItemsToInsert = rfqItems.map(item => ({
        rfq_id: rfqData.id,
        product_id: item.product_id,
        variation_id: item.variation_id,
        product_name: item.product?.name || "Unknown Product",
        product_image: item.product?.images?.[0] || null,
        variation_details: item.variation 
          ? `${item.variation.size || ""} ${item.variation.color || ""}`.trim() 
          : null,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("rfq_items")
        .insert(rfqItemsToInsert);

      if (itemsError) {
        console.error("Error inserting RFQ items:", itemsError);
      }

      // Call edge function to send notification email
      try {
        await supabase.functions.invoke("send-rfq-notification", {
          body: {
            rfqNumber: rfqNumber,
            fullName: fullName,
            companyName: companyName,
            email: email,
            phone: phone,
            productName: productNames,
            quantity: totalQuantity,
            message: message,
            buyerType: buyerType,
            itemCount: rfqItems.length,
            gstNumber: gstNumber,
          },
        });
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
      }

      // Clear the RFQ cart after successful submission
      await clearCart();

      setSubmitted(true);
      toast({
        title: "RFQ Submitted!",
        description: `Your request ${rfqNumber} has been received. We'll respond within 24 hours.`,
      });
    } catch (error) {
      console.error("Error submitting RFQ:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-4 pb-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-4">
                RFQ Submitted Successfully!
              </h1>
              <p className="text-muted-foreground mb-8">
                Thank you for your request. Our team will review your quotation request and respond within 24 hours with custom pricing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => setSubmitted(false)} variant="outline">
                  Submit Another RFQ
                </Button>
                <Link to="/products">
                  <Button className="bg-gradient-accent">
                    Browse Products
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Request for Quotation (RFQ)" description="Submit bulk order requests and get competitive pricing on Houskase industrial products." />
      <Header />
      
      <main className="pt-4 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <FileText className="h-4 w-4" />
              Request For Quotation
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Get a <span className="text-accent">Custom Quote</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select products, specify your requirements, and receive custom B2B pricing. Our team responds within 24 hours.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
            {/* Products Cart Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <Card className="shadow-card lg:sticky lg:top-36">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-accent" />
                      Products for Quote ({itemCount})
                      {isCartLoading && rfqItems.length > 0 && (
                        <span className="text-xs text-muted-foreground font-normal animate-pulse ml-1">
                          refreshing…
                        </span>
                      )}
                    </span>
                    {rfqItems.length > 0 && (
                      <Link to="/products">
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add More
                        </Button>
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isCartLoading && rfqItems.length === 0 ? (
                    <div className="p-4 space-y-4" aria-live="polite" aria-busy="true">
                      <p className="sr-only">Loading products…</p>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl border bg-card animate-pulse">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                            <div className="h-6 bg-muted rounded w-24 mt-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : rfqItems.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-foreground font-medium mb-2">Your RFQ cart is empty</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Open any product and tap <span className="font-medium">"Ask for Bulk Qty Quote"</span> to add it here.
                      </p>
                      <Link to="/products">
                        <Button className="bg-gradient-accent">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Browse Products
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] w-full">
                      <div className="p-4 space-y-4 w-full">
                        {rfqItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 p-3 rounded-xl border bg-card w-full min-w-0"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={item.product?.images?.[0] || "/placeholder.svg"}
                                alt={item.product?.name || "Product"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <h4 className="font-medium text-sm line-clamp-2 break-words pr-1">
                                {item.product?.name || "Unknown Product"}
                              </h4>
                              {item.variation && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.variation.size && `Size: ${item.variation.size}`}
                                  {item.variation.size && item.variation.color && " • "}
                                  {item.variation.color && `Color: ${item.variation.color}`}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <div className="flex items-center bg-secondary rounded-lg">
                                  <button
                                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                    className="p-1.5 hover:bg-muted rounded-l-lg transition-colors"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="px-3 text-sm font-medium">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="p-1.5 hover:bg-muted rounded-r-lg transition-colors"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-7"
            >
              <div className="bg-card rounded-2xl shadow-card border border-border p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Contact Information</h2>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  {/* Honeypot field - hidden from users, catches bots */}
                  <div className="absolute opacity-0 pointer-events-none -z-10" aria-hidden="true" tabIndex={-1}>
                    <label htmlFor="website_url">Website</label>
                    <input
                      type="text"
                      id="website_url"
                      name="website_url"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" name="name" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name *</Label>
                      <Input id="company" name="company" placeholder="Your Company Ltd." required />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" name="email" type="email" placeholder="john@company.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone / WhatsApp</Label>
                      <Input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gst">GST Number (Optional)</Label>
                      <Input id="gst" name="gst" placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyer-type">Buyer Type *</Label>
                      <Select value={buyerType} onValueChange={setBuyerType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select buyer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shop">Wholesaler / Distributor</SelectItem>
                          <SelectItem value="retail">Retailer / Reseller</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Additional Requirements</Label>
                    <Textarea 
                      id="message" 
                      name="message"
                      placeholder="Tell us more about your requirements: customization needs, preferred delivery date, packaging specifications, etc."
                      rows={4}
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Attachments (Optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload drawings, specifications, or reference documents (Max 5 files, 10MB each)
                    </p>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, XLS, JPG, PNG (max 10MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                      />
                    </div>

                    {/* Attached Files List */}
                    {attachments.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
                            <File className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="p-1 hover:bg-destructive/10 rounded text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {rfqItems.length > 0 && (
                    <div className="bg-secondary/50 rounded-xl p-4 border">
                      <h3 className="font-medium mb-2">Request Summary</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Products: {rfqItems.length}</p>
                        <p>Total Quantity: {itemCount} units</p>
                        {attachments.length > 0 && (
                          <p>Attachments: {attachments.length} file(s)</p>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-accent hover:opacity-90 gap-2"
                    disabled={isSubmitting || rfqItems.length === 0}
                  >
                    {isSubmitting ? (
                      isUploading ? "Uploading files..." : "Submitting..."
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Submit RFQ Request
                      </>
                    )}
                  </Button>

                  {rfqItems.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Add products to your RFQ cart before submitting
                    </p>
                  )}
                </form>

                {/* How it works */}
                <div className="mt-8 pt-8 border-t">
                  <h3 className="font-semibold mb-4">How RFQ Works</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                        <span className="font-bold text-accent-foreground">1</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Select products & submit form</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                        <span className="font-bold text-accent-foreground">2</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Receive custom quotation</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                        <span className="font-bold text-accent-foreground">3</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Approve & place order</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Response within 24 hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>+91 92661 29195</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
