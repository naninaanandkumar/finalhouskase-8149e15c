import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { SEOHead } from "@/components/SEOHead";

export default function Chat() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Chat Support" description="Get instant support from Houskase team. Ask about products, pricing, and orders." />
      <Header />
      
      <main className="pt-0 pb-0">
        <div className="container mx-auto px-4">
          <ChatInterface />
        </div>
      </main>

      <Footer />
    </div>
  );
}