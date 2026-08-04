import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** Rendered on the far right, vertically centered with the title (e.g. "View All" link) */
  action?: ReactNode;
}

export function SectionHeading({ title, subtitle, action }: SectionHeadingProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="relative flex items-center justify-center gap-3 sm:gap-4">
        <span className="h-px flex-1 max-w-[80px] sm:max-w-[180px] bg-gradient-to-r from-transparent to-accent/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground whitespace-nowrap leading-none text-center">
          {title}
        </h2>
        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
        <span className="h-px flex-1 max-w-[80px] sm:max-w-[180px] bg-gradient-to-l from-transparent to-accent/60" />

        {action && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 leading-none hidden sm:flex items-center">
            {action}
          </div>
        )}
      </div>
      {action && <div className="mt-2 flex justify-center sm:hidden">{action}</div>}
      {subtitle && <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground text-center">{subtitle}</p>}
    </div>
  );
}
