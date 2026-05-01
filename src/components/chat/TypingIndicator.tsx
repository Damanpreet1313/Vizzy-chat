"use client";

export const TypingIndicator = () => (
  <div className="flex gap-3.5 py-2.5">
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[14px]"
      style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 14px rgba(59,130,246,0.3)" }}>
      ✦
    </div>
    <div className="flex-1 min-w-0">
      <div className="mb-[5px] flex items-baseline gap-2">
        <span className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>Vizzy</span>
      </div>
      <div className="flex items-center gap-1 py-1">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span key={i} className="inline-block h-[7px] w-[7px] rounded-full"
            style={{ background: "var(--accent-color)", animation: `typeDot 1.4s ease-in-out ${delay}s infinite` }} />
        ))}
      </div>
    </div>
  </div>
);
