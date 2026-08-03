import { useEffect, useState } from "react";
import { Facebook, Instagram, Linkedin, Youtube, MessageCircle } from "lucide-react";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  whatsapp?: string;
}

import { supabase } from "@/integrations/supabase/client";

export function SocialRail() {
  const [social, setSocial] = useState<SocialLinks>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "store").maybeSingle();
      const v = data?.value as any;
      if (v) {
        setSocial({
          facebook: v.socialFacebook || "",
          instagram: v.socialInstagram || "",
          youtube: v.socialYoutube || "",
          linkedin: v.socialLinkedin || "",
          whatsapp: v.socialWhatsapp || "",
        });
      }
    })();
  }, []);

  const items = [
    { key: "Instagram", icon: Instagram, url: social.instagram },
    { key: "Facebook", icon: Facebook, url: social.facebook },
    { key: "YouTube", icon: Youtube, url: social.youtube },
    { key: "LinkedIn", icon: Linkedin, url: social.linkedin },
    { key: "WhatsApp", icon: MessageCircle, url: social.whatsapp },
  ].filter((i) => i.url && i.url !== "#");

  if (items.length === 0) return null;

  return (
    <div className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col gap-px rounded-l-lg overflow-hidden shadow-lg">
      {items.map(({ key, icon: Icon, url }) => (
        <a
          key={key}
          href={url as string}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={key}
          className="bg-card border border-border border-r-0 p-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
