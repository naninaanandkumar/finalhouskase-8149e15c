import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  FileText, Clock, Shield, Truck, CreditCard, 
  Headphones, ArrowRight, CheckCircle2 
} from "lucide-react";

const benefits = [
  {
    icon: FileText,
    title: "Easy RFQ Process",
    description: "Submit your requirements and get quotes within 24 hours. No hidden charges.",
    color: "bg-accent",
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "All products undergo strict quality checks. ISO 9001:2015 certified processes.",
    color: "bg-success",
  },
  {
    icon: CreditCard,
    title: "Flexible Payment",
    description: "Multiple payment options including NEFT, RTGS, and credit terms for verified buyers.",
    color: "bg-retail",
  },
  {
    icon: Truck,
    title: "Reliable Delivery",
    description: "Pan-India delivery with real-time tracking. Export services to 20+ countries.",
    color: "bg-shop",
  },
  {
    icon: Clock,
    title: "Quick Response",
    description: "Dedicated account managers ensure fast communication and order processing.",
    color: "bg-warning",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "Technical support for product selection and custom requirements.",
    color: "bg-primary",
  },
];

const processSteps = [
  { step: 1, title: "Submit RFQ", description: "Share your requirements" },
  { step: 2, title: "Get Quote", description: "Receive pricing within 24hrs" },
  { step: 3, title: "Confirm Order", description: "Review & approve quotation" },
  { step: 4, title: "Receive Goods", description: "Track & receive delivery" },
];

export function BenefitsSection() {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Why Choose Us</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
            Benefits of Working With Us
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We make B2B procurement simple, transparent, and hassle-free
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <benefit.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-hero rounded-2xl p-8 md:p-12"
        >
          <div className="text-center mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-primary-foreground mb-2">
              How It Works
            </h3>
            <p className="text-primary-foreground/80">
              Simple 4-step process to get your order
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-10">
            {processSteps.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.15 }}
                className="text-center relative"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 shadow-accent">
                  <span className="text-xl md:text-2xl font-bold text-accent-foreground">{item.step}</span>
                </div>
                <h4 className="font-semibold text-primary-foreground text-sm md:text-base mb-1">
                  {item.title}
                </h4>
                <p className="text-primary-foreground/70 text-xs md:text-sm">
                  {item.description}
                </p>
                {idx < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-0.5 bg-primary-foreground/20" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/rfq">
              <Button size="lg" className="bg-accent hover:bg-accent-hover shadow-accent">
                Start Your RFQ Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
