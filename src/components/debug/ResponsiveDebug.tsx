import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export function ResponsiveDebug() {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
      <Card className="bg-black/80 text-white text-[10px] py-1 px-2 border-none">
        <CardContent className="p-0">
          <span className="block sm:hidden">Phone (Base)</span>
          <span className="hidden sm:block md:hidden">Tablet (SM)</span>
          <span className="hidden md:block lg:hidden">Tablet/Small Desktop (MD)</span>
          <span className="hidden lg:block xl:hidden">Desktop (LG)</span>
          <span className="hidden xl:block">Large Desktop (XL)</span>
        </CardContent>
      </Card>
    </div>
  );
}
