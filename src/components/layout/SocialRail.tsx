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
    {
      key: "Instagram",
      icon: Instagram,
      url: social.instagram,
      style: {
        background: "linear-gradient(45deg,#F58529 0%,#DD2A7B 45%,#8134AF 75%,#515BD4 100%)",
        color: "#fff",
      } as React.CSSProperties,
    },
    { key: "Facebook", icon: Facebook, url: social.facebook, style: { background: "#1877F2", color: "#fff" } },
    { key: "YouTube", icon: Youtube, url: social.youtube, style: { background: "#FF0000", color: "#fff" } },
    { key: "LinkedIn", icon: Linkedin, url: social.linkedin, style: { background: "#0A66C2", color: "#fff" } },
    { key: "WhatsApp", icon: MessageCircle, url: social.whatsapp, style: { background: "#25D366", color: "#fff" } },
  ].filter((i) => i.url && i.url !== "#");

  if (items.length === 0) return null;

  return (
    <div className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col gap-px rounded-l-lg overflow-hidden shadow-lg">
      {items.map(({ key, icon: Icon, url, style }) => (
        <a
          key={key}
          href={url as string}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={key}
          style={style}
          className="p-2.5 transition-transform hover:scale-105"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

