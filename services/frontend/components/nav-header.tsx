'use client';
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet } from "lucide-react";
import { AssistantTrigger } from "@/components/assistant/assistant-trigger";

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Find active tab value based on route, defaulting to 'twin'
  const activeTab = pathname.split('/')[1] || 'twin';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b bg-background">
      <div className="flex items-center gap-2 w-[180px]">
        {/* Spacer for flex balancing */}
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={(val) => router.push(`/${val}`)}
        className="hidden md:block"
      >
        <TabsList className="bg-transparent h-10 p-0 flex gap-8">
          <TabsTrigger value="twin" className="rounded-none px-0 pb-0 border-none !bg-transparent !shadow-none text-muted-foreground data-[state=active]:text-foreground uppercase tracking-wider text-[11px] font-bold">Digital Twin</TabsTrigger>
          <TabsTrigger value="simulation" className="rounded-none px-0 pb-0 border-none !bg-transparent !shadow-none text-muted-foreground data-[state=active]:text-foreground uppercase tracking-wider text-[11px] font-bold">Physical Simulation</TabsTrigger>
          <TabsTrigger value="industry" className="rounded-none px-0 pb-0 border-none !bg-transparent !shadow-none text-muted-foreground data-[state=active]:text-foreground uppercase tracking-wider text-[11px] font-bold">Industry Engine</TabsTrigger>
          <TabsTrigger value="cloud-data" className="rounded-none px-0 pb-0 border-none !bg-transparent !shadow-none text-muted-foreground data-[state=active]:text-foreground uppercase tracking-wider text-[11px] font-bold">Cloud Data</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="w-[180px] flex justify-end">
        <AssistantTrigger />
      </div>
    </header>
  );
}
