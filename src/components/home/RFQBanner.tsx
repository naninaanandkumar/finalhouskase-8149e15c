import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Phone, Mail, MessageSquare } from "lucide-react";

export function RFQBanner() {
  return (
    <section className="py-16 md:py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: CTA Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-6">
              <FileText className="h-4 w-4" />
              Get Custom Pricing
            </div>
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Place Your Order?
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-lg">
              Submit your requirements and receive a detailed quotation with GST invoice, 
              payment terms, and delivery timeline within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/rfq">
                <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent-hover shadow-accent">
                  Request Quotation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="tel:+919266129195">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Phone className="mr-2 h-5 w-5" />
                  Call: +91 92661 29195
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Right: Contact Options */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <div className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Submit RFQ Online</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Fill out our online form with your requirements
              </p>
              <Link to="/rfq" className="text-accent font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Go to RFQ Form <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-bold text-foreground mb-2">WhatsApp Us</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Quick queries? Message us directly
              </p>
              <a 
                href="https://wa.me/919266129195" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-success font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                Chat on WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Call Sales Team</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Speak directly with our sales team
              </p>
              <a 
                href="tel:+919266129195"
                className="text-primary font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                +91 92661 29195 <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-retail/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-retail" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Email Us</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Send detailed requirements via email
              </p>
              <a 
                href="mailto:sales@houskase.com"
                className="text-retail font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                sales@houskase.com <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
