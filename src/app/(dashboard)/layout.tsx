import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (<TooltipProvider delayDuration={300}><div className="flex h-screen overflow-hidden bg-background"><Sidebar /><main className="flex-1 overflow-hidden">{children}</main></div></TooltipProvider>);
}
