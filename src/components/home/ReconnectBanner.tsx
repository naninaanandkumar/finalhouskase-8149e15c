import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

interface ReconnectBannerProps {
  visible: boolean;
}

export function ReconnectBanner({ visible }: ReconnectBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-destructive/10 border-b border-destructive/20 overflow-hidden"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm text-destructive">
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span>Backend reconnecting... Data may be temporarily unavailable.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
