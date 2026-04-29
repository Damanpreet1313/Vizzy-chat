import { ChatInterface } from "@/components/chat/ChatInterface";
import { Sidebar, MobileSidebarTrigger } from "@/components/sidebar/Sidebar";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile header — only visible below lg */}
        <header
          className="lg:hidden h-14 px-4 flex items-center justify-between shrink-0 border-b border-border/50 bg-[hsl(var(--sidebar-background))]"
        >
          <div className="flex items-center gap-3">
            <MobileSidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm text-gradient">Vizzy Chat</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
