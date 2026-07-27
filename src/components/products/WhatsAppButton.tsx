import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppButtonProps {
  productName: string;
  productUrl?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

// Business WhatsApp number
const WHATSAPP_NUMBER = "919266129195";

export function WhatsAppButton({ 
  productName, 
  productUrl,
  variant = "outline",
  size = "default",
  className 
}: WhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    const url = productUrl || window.location.href;
    const message = encodeURIComponent(
      `Hi, I'm interested in this product:\n\n*${productName}*\n\n${url}\n\nPlease provide more details.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsAppClick}
      className={className}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      WhatsApp
    </Button>
  );
}

export function WhatsAppIconButton({ 
  productName, 
  productUrl,
  className 
}: WhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    const url = productUrl || window.location.href;
    const message = encodeURIComponent(
      `Hi, I'm interested in this product:\n\n*${productName}*\n\n${url}\n\nPlease provide more details.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleWhatsAppClick}
      className={className}
      title="Chat on WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}
