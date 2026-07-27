import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { SEOHead, SchemaGenerators } from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MessageSquare,
  Phone,
  Mail,
  FileText,
  ShoppingCart,
  Truck,
  CreditCard,
  Shield,
  RotateCcw,
  HelpCircle,
  Send,
  CheckCircle2,
  Headphones,
  Clock,
} from "lucide-react";
import { VoiceAssistant } from "@/components/voice/VoiceAssistant";

const faqCategories = [
  {
    title: "Orders & Purchasing",
    icon: ShoppingCart,
    faqs: [
      { question: "How do I place a bulk order?", answer: "You can place bulk orders directly through our products page. Select the items, choose your quantity (meeting the MOQ), and proceed to checkout. For very large orders, we recommend using our RFQ (Request for Quotation) system for better pricing." },
      { question: "What is MOQ (Minimum Order Quantity)?", answer: "MOQ is the minimum number of units you need to purchase. We have different MOQs for shop buyers (wholesale) and retail buyers. Shop buyers typically have higher MOQs but get better per-unit pricing." },
      { question: "Can I get a custom quote for large orders?", answer: 'Yes! Use our RFQ system to submit a request. Go to the "Request Quote" page, add the products you need, specify quantities and your target price, and our team will respond with a competitive quote within 2-8 hours.' },
      { question: "How do I track my order?", answer: "Log into your dashboard and navigate to the Orders tab. You can see the status of all your orders including pending, confirmed, processing, shipped, and delivered statuses." },
    ],
  },
  {
    title: "Shipping & Delivery",
    icon: Truck,
    faqs: [
      { question: "What are the shipping charges?", answer: "Shipping charges vary based on order weight, volume, and delivery location. For bulk orders, we offer competitive freight rates. Shipping costs are calculated at checkout." },
      { question: "How long does delivery take?", answer: "Standard delivery takes 5-7 business days within India. For remote areas, it may take up to 10 business days. Express shipping options are available at additional cost." },
      { question: "Do you deliver pan-India?", answer: "Yes, we deliver across India and also ship to 20+ countries internationally. Our logistics network covers all major industrial hubs and cities." },
    ],
  },
  {
    title: "Payment & Invoicing",
    icon: CreditCard,
    faqs: [
      { question: "What payment methods do you accept?", answer: "We accept bank transfers (NEFT/RTGS), UPI, credit/debit cards, and net banking. For bulk orders, we also offer credit terms for verified businesses." },
      { question: "Can I get a GST invoice?", answer: "Yes, we provide GST-compliant invoices for all orders. Make sure your GST number is updated in your profile for accurate invoicing." },
      { question: "Do you offer credit terms?", answer: "Yes, we offer 30/60/90 day credit terms for verified businesses with a good track record. Contact our sales team for credit term discussions." },
    ],
  },
  {
    title: "Returns & Warranty",
    icon: RotateCcw,
    faqs: [
      { question: "What is your return policy?", answer: "We accept returns within 7 days of delivery for manufacturing defects or wrong items. The product must be unused and in original packaging." },
      { question: "How do I initiate a return?", answer: "Contact our support team via chat or email with your order number and reason for return. Our team will guide you through the process." },
      { question: "Do products come with warranty?", answer: "Yes, most products come with manufacturer warranty. Warranty duration varies by product category. Check individual product pages for specific warranty information." },
    ],
  },
  {
    title: "Account & Registration",
    icon: Shield,
    faqs: [
      { question: "How do I register as a buyer?", answer: 'Click on "Login" and then "Sign Up" to create your account. You can register as either a shop (wholesale) buyer or retail buyer.' },
      { question: "What is the difference between Shop and Retail buyers?", answer: "Shop buyers are wholesale/business buyers who purchase in larger quantities and get better pricing. Retail buyers can purchase in smaller quantities at retail pricing." },
    ],
  },
  {
    title: "RFQ (Request for Quotation)",
    icon: FileText,
    faqs: [
      { question: "What is the RFQ process?", answer: "RFQ allows you to request custom pricing for bulk orders. Browse products, add them to your RFQ cart with desired quantities, submit the request, and our team will respond with a detailed quotation." },
      { question: "How long does it take to get a quote?", answer: "We typically respond to RFQ requests within 2-8 business hours. Complex requirements may take up to 1-2 business days." },
    ],
  },
];

const contactOptions = [
  { icon: MessageSquare, title: "Live Chat", description: "Chat with our support team in real-time", action: "/chat", buttonText: "Start Chat", isLink: true },
  { icon: Phone, title: "Call Us", description: "Mon-Sat, 9:00 AM - 6:00 PM IST", action: "tel:+919266129195", buttonText: "+91 92661 29195", isLink: false },
  { icon: Mail, title: "Email Support", description: "We respond within 24 hours", action: "mailto:sales@houskase.com", buttonText: "sales@houskase.com", isLink: false },
];

function ContactForm() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(Date.now());

  const validate = () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const message = form.message.trim();
    if (name.length < 2) e.name = "Please enter your full name (min 2 characters).";
    else if (name.length > 100) e.name = "Name must be under 100 characters.";
    if (!email) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = "Please enter a valid email address.";
    else if (email.length > 255) e.email = "Email is too long.";
    if (phone && !/^[+\d\s\-()]{7,20}$/.test(phone)) e.phone = "Please enter a valid phone number.";
    if (form.subject.length > 200) e.subject = "Subject must be under 200 characters.";
    if (message.length < 10) e.message = "Message should be at least 10 characters.";
    else if (message.length > 2000) e.message = "Message must be under 2000 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }
    // Bot: honeypot filled OR submitted in < 2s
    if (form.website || Date.now() - startedAt < 2000) {
      setSubmitted(true);
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-form", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          honeypot: form.website,
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      console.error("Contact form error:", err);
      const msg = err?.message?.includes("Too many")
        ? "You've submitted too many inquiries. Please try again in a few minutes."
        : "Please try again or email us directly at sales@houskase.com.";
      toast({ title: "Failed to send", description: msg, variant: "destructive" });
    }
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-display font-bold text-foreground">Thank you! Inquiry received.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Our team will contact you shortly — typically within <strong>2–8 hours</strong> (Mon–Sat, 9 AM–6 PM IST).
          A confirmation email is on its way to <strong>{form.email}</strong>.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
            setErrors({});
            setSubmitted(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  const set = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: "" }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Honeypot (hidden from users) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">Full Name *</Label>
          <Input id="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" aria-invalid={!!errors.name} maxLength={100} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm">Email *</Label>
          <Input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" aria-invalid={!!errors.email} maxLength={255} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm">Phone</Label>
          <Input id="phone" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 9876543210" aria-invalid={!!errors.phone} maxLength={20} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-sm">Subject</Label>
          <Input id="subject" value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="How can we help?" aria-invalid={!!errors.subject} maxLength={200} />
          {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-sm">Message *</Label>
        <Textarea id="message" value={form.message} onChange={e => set("message", e.target.value)} placeholder="Describe your query..." rows={4} aria-invalid={!!errors.message} maxLength={2000} />
        <div className="flex items-center justify-between">
          {errors.message ? <p className="text-xs text-destructive">{errors.message}</p> : <span />}
          <p className="text-xs text-muted-foreground">{form.message.length}/2000</p>
        </div>
      </div>
      <Button type="submit" className="bg-accent hover:bg-accent-hover w-full sm:w-auto" disabled={sending}>
        <Send className="h-4 w-4 mr-2" />
        {sending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Help & FAQ"
        description="Find answers to common questions about ordering, shipping, payments, and returns on Houskase."
        keywords="VendorHub help, FAQ, B2B marketplace support, shipping, returns, payment"
        jsonLd={SchemaGenerators.faqPage(
          faqCategories.flatMap(s => s.faqs)
        )}
      />
      <Header />

      <main className="pb-20">
        <section className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(135deg,hsl(var(--primary-foreground)/0.16)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="container relative mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-16">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Headphones className="h-4 w-4" />
                Houskase Care
              </div>
              <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-tight md:text-5xl">
                Help, support and order guidance
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/82 md:text-base">
                Quick answers for orders, shipping, payments, returns and bulk requirements — with direct access to the Houskase support team.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary" className="rounded px-5">
                  <Link to="/chat"><MessageSquare className="mr-2 h-5 w-5" />Start Chat</Link>
                </Button>
                <Button asChild size="lg" className="rounded border border-primary-foreground/25 bg-primary-foreground/10 px-5 text-primary-foreground hover:bg-primary-foreground/18">
                  <a href="tel:+919266129195"><Phone className="mr-2 h-5 w-5" />Call Support</a>
                </Button>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid gap-3 rounded-lg border border-primary-foreground/18 bg-primary-foreground/10 p-4 backdrop-blur">
              {[
                { icon: Clock, label: "Support Hours", value: "Mon–Sat, 9 AM–6 PM" },
                { icon: Phone, label: "Phone", value: "+91 92661 29195" },
                { icon: Mail, label: "Email", value: "sales@houskase.com" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-md bg-primary-foreground/10 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-primary-foreground/70">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4">
          {/* FAQ + Contact Form - Two Column */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12 mt-10">
            {/* FAQ - 3 cols */}
            <div className="lg:col-span-3">
              <div className="mb-6 px-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Support Library</p>
                <h2 className="text-2xl font-display font-bold text-foreground">Frequently Asked Questions</h2>
              </div>
              {faqCategories.map((category, catIdx) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + catIdx * 0.05 }}
                  className="mb-5 rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center">
                      <category.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">{category.title}</h3>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, faqIdx) => (
                      <AccordionItem key={faqIdx} value={`${catIdx}-${faqIdx}`} className="border-border">
                        <AccordionTrigger className="text-left text-sm font-medium hover:text-accent">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              ))}
            </div>

            {/* Contact Form - 2 cols */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg border border-border p-6 sticky top-5 shadow-card">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Send className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground mb-1">Contact Us</h2>
                <p className="text-sm text-muted-foreground mb-5">Have a specific question? Send us a message.</p>
                <ContactForm />
              </div>
            </div>
          </div>

          {/* Still Need Help Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="relative w-full mt-8 overflow-hidden rounded-xl border border-border shadow-lg"
            style={{
              backgroundImage: "url('https://ik.imagekit.io/houskase/Banner.png')",
              backgroundSize: "cover",
              backgroundPosition: "right center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-5 items-center">
              <div className="md:col-span-3 p-8 md:p-12 bg-gradient-to-r from-background/95 via-background/90 to-background/40 md:from-background/95 md:via-background/85 md:to-transparent">
                <CheckCircle2 className="h-10 w-10 mb-3 text-accent" />
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-2 text-foreground">Still have questions?</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Our support team is here to help. Start a live chat for instant assistance or send us an email.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/chat">
                    <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-accent-foreground">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Start Live Chat
                    </Button>
                  </Link>
                  <Link to="/rfq">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      <FileText className="mr-2 h-5 w-5" />
                      Submit RFQ
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden md:block md:col-span-2" aria-hidden />
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
      <VoiceAssistant />
    </div>
  );
}
