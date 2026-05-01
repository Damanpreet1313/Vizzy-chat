import { ChatInterface } from "@/components/chat/ChatInterface";
import { Sidebar, MobileSidebarTrigger } from "@/components/sidebar/Sidebar";
import { UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar />

      <main className="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex h-[54px] shrink-0 items-center gap-3 border-b px-4"
          style={{ background: "rgba(13,13,13,0.85)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
          <MobileSidebarTrigger />
          <span className="flex-1 text-[14px] font-semibold" style={{ color: "var(--text1)" }}>VizzyChat</span>
          <UserButton />
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
