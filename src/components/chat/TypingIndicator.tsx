"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const TypingIndicator = () => {
  return (
    <div className="flex w-full gap-3 flex-row animate-slideUpIn">
      <Avatar className="h-8 w-8 mt-0.5 shrink-0 ring-2 ring-border">
        <AvatarImage src="/bot-avatar.png" />
        <AvatarFallback
          className="text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}
        >
          AI
        </AvatarFallback>
      </Avatar>

      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3 border border-border/60 shadow-sm bg-card"
      >
        {[0, 0.18, 0.36].map((delay, i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-primary/70"
            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.65, repeat: Infinity, delay, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
};
