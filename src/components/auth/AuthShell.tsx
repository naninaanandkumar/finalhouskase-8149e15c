import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import houskaseLogo from "@/assets/houskase-logo.jpg.asset.json";

const SLIDES = [
  "https://ik.imagekit.io/houskase/Sports%20Towels%20&%20Gym%20Essentials.png?updatedAt=1782815871832",
  "https://ik.imagekit.io/houskase/Dry%20&%20Wet%20Tissues.png?updatedAt=1782815871769",
  "https://ik.imagekit.io/houskase/Kitchen%20Care%20Combo.png?updatedAt=1782815871806",
  "https://ik.imagekit.io/houskase/Ultra%20Non-Woven%20Cloth%20Roll.png?updatedAt=1782815871791",
  "https://ik.imagekit.io/houskase/Kitchen%20Cleaning%20Essentials.png?updatedAt=1782815871763",
];

const BRAND = "#AD1E2A";

interface Props {
  mode: "login" | "signup";
  children: ReactNode;
}

function Tabs({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-full bg-secondary p-1">
      <Link
        to="/login"
        className={`rounded-full py-2.5 text-center text-sm font-bold transition-colors ${
          mode === "login" ? "text-white shadow-sm" : "text-muted-foreground"
        }`}
        style={mode === "login" ? { backgroundColor: BRAND } : undefined}
      >
        Login
      </Link>
      <Link
        to="/signup"
        className={`rounded-full py-2.5 text-center text-sm font-bold transition-colors ${
          mode === "signup" ? "text-white shadow-sm" : "text-muted-foreground"
        }`}
        style={mode === "signup" ? { backgroundColor: BRAND } : undefined}
      >
        Signup
      </Link>
    </div>
  );
}

export function AuthShell({ mode, children }: Props) {
  const [idx, setIdx] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Login stays app-like and fixed; signup can scroll on small phones so CTA remains visible.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = mode === "signup" ? "auto" : "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  if (isMobile) {
    return (
      <div className={mode === "signup" ? "min-h-[100dvh] flex flex-col" : "fixed inset-0 flex flex-col overflow-hidden"} style={{ backgroundColor: BRAND }}>
        {/* Hero — logo only (clickable, returns to home). Meets 44×44 tap-target
            guidance and shows a premium hover/active state with a soft ring. */}
        <div className="flex flex-col items-center justify-center pt-10 pb-6 shrink-0">
          <Link
            to="/"
            aria-label="Go to Houskase home"
            className="group h-24 w-24 min-h-11 min-w-11 rounded-full bg-white flex items-center justify-center ring-2 ring-white/40 overflow-hidden shadow-lg transition-all duration-200 hover:ring-white/80 hover:shadow-2xl hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            <img
              src={houskaseLogo.url}
              alt="Houskase"
              width={80}
              height={80}
              loading="eager"
              decoding="sync"
              // @ts-ignore - fetchpriority is valid HTML
              fetchpriority="high"
              className="h-20 w-20 object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>
        </div>


        {/* White sheet with form */}
        <div
          className={`flex-1 bg-background rounded-t-[32px] px-5 pt-6 ${mode === "signup" ? "pb-9" : "pb-24"} shadow-[0_-8px_30px_rgba(0,0,0,0.15)] overflow-y-auto`}
          style={{ minHeight: 500 }}
        >
          <Tabs mode={mode} />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        {/* Left — tabbed form */}
        <div className="flex items-center justify-center px-4 sm:px-8 md:px-14 lg:px-20 py-8 md:py-12 bg-background overflow-y-auto">
          <div className="w-full max-w-xl">
            <Tabs mode={mode} />
            {children}
          </div>
        </div>

        {/* Right — slider */}
        <div className="hidden md:flex relative bg-secondary items-center justify-center overflow-hidden">
          {SLIDES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={i !== idx}
            />
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === idx ? "w-6" : "w-2 bg-white/70"
                }`}
                style={i === idx ? { backgroundColor: BRAND, width: "1.5rem" } : undefined}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
