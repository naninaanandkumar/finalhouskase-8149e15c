 import { useState } from "react";
 import { Link } from "react-router-dom";
 import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
   SheetFooter,
 } from "@/components/ui/sheet";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { FileText, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
 import { useRFQCart } from "@/hooks/useRFQCart";
 import { cn } from "@/lib/utils";
 
 interface RFQCartSheetProps {
   children: React.ReactNode;
 }
 
 export function RFQCartSheet({ children }: RFQCartSheetProps) {
   const { items, itemCount, updateQuantity, removeFromCart } = useRFQCart();
   const [open, setOpen] = useState(false);
 
   return (
     <Sheet open={open} onOpenChange={setOpen}>
       <SheetTrigger asChild>{children}</SheetTrigger>
       <SheetContent className="w-full sm:max-w-lg flex flex-col">
         <SheetHeader className="pb-4 border-b">
           <SheetTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5 text-accent" />
             RFQ Cart
             {itemCount > 0 && (
               <Badge variant="secondary" className="ml-2">
                 {itemCount} items
               </Badge>
             )}
           </SheetTitle>
           <SheetDescription>
             Products you want to request quotation for
           </SheetDescription>
         </SheetHeader>
 
         {items.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
             <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
               <ShoppingBag className="h-10 w-10 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground mb-4">Your RFQ cart is empty</p>
             <p className="text-sm text-muted-foreground mb-6">
               Browse products and click "Request Quote" to add items
             </p>
             <Button variant="outline" onClick={() => setOpen(false)} asChild>
               <Link to="/products">Browse Products</Link>
             </Button>
           </div>
         ) : (
           <>
             <ScrollArea className="flex-1 py-4">
               <div className="space-y-4">
                 {items.map((item) => (
                   <div
                     key={item.id}
                     className="flex gap-4 p-3 rounded-xl border bg-card"
                   >
                     <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                       <img
                         src={item.product?.images?.[0] || "/placeholder.svg"}
                         alt={item.product?.name || "Product"}
                         className="w-full h-full object-cover"
                       />
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="font-medium text-sm truncate">
                         {item.product?.name || "Unknown Product"}
                       </h4>
                       {item.variation && (
                         <p className="text-xs text-muted-foreground">
                           {item.variation.size && `Size: ${item.variation.size}`}
                           {item.variation.size && item.variation.color && " • "}
                           {item.variation.color && `Color: ${item.variation.color}`}
                         </p>
                       )}
                       <div className="flex items-center gap-2 mt-2">
                         <div className="flex items-center bg-secondary rounded-lg">
                           <button
                             onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                             className="p-1.5 hover:bg-muted rounded-l-lg transition-colors"
                           >
                             <Minus className="h-3 w-3" />
                           </button>
                           <span className="px-3 text-sm font-medium">{item.quantity}</span>
                           <button
                             onClick={() => updateQuantity(item.id, item.quantity + 1)}
                             className="p-1.5 hover:bg-muted rounded-r-lg transition-colors"
                           >
                             <Plus className="h-3 w-3" />
                           </button>
                         </div>
                         <button
                           onClick={() => removeFromCart(item.id)}
                           className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </ScrollArea>
 
             <SheetFooter className="pt-4 border-t flex-col gap-3">
               <div className="w-full text-center text-sm text-muted-foreground">
                 {itemCount} products selected for quotation
               </div>
               <Button
                 className="w-full bg-gradient-accent hover:opacity-90"
                 size="lg"
                 onClick={() => setOpen(false)}
                 asChild
               >
                 <Link to="/rfq">
                   <FileText className="h-5 w-5 mr-2" />
                   Submit RFQ Request
                 </Link>
               </Button>
             </SheetFooter>
           </>
         )}
       </SheetContent>
     </Sheet>
   );
 }