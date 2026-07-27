import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import authBg from "@/assets/auth-bg.jpg.asset.json";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
        {/* Left — form (centered) */}
        <div className="flex items-center justify-center px-4 sm:px-8 md:px-14 lg:px-20 py-6 overflow-y-auto">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Right — product image, full-bleed, shown from tablet and up */}
        <div
          className="hidden md:block relative bg-no-repeat bg-cover bg-center h-full"
          style={{ backgroundImage: `url(${authBg.url})` }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-black/10" />
        </div>
      </div>
    </div>
  );
}