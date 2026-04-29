import { SignUp } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export default function Page() {
  return (
    <div
      className="flex h-screen w-screen items-center justify-center bg-background"
    >
      {/* Background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(129,140,248,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30"
            style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gradient">Vizzy Chat</h1>
            <p className="text-sm text-muted-foreground mt-1">Create your account</p>
          </div>
        </div>

        {/* Clerk card */}
        <div
          className="w-full rounded-2xl border border-border overflow-hidden shadow-2xl"
          style={{ background: "hsl(231 28% 14%)" }}
        >
          <SignUp />
        </div>
      </div>
    </div>
  );
}
