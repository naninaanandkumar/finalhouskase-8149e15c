import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** Rendered on the far right, vertically centered with the title (e.g. "View All" link) */
  action?: ReactNode;
}

export function SectionHeading({ title, subtitle, action }: SectionHeadingProps) {
  if (action) {
    return (
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground whitespace-nowrap leading-none">
            {title}
          </h2>
          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
          <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
          <div className="shrink-0 leading-none flex items-center">{action}</div>
        </div>
        {subtitle && <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className="text-center mb-4 sm:mb-6">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <span className="h-px flex-1 max-w-[80px] sm:max-w-[180px] bg-gradient-to-r from-transparent to-accent/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground whitespace-nowrap">
          {title}
        </h2>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="h-px flex-1 max-w-[80px] sm:max-w-[180px] bg-gradient-to-l from-transparent to-accent/60" />
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
