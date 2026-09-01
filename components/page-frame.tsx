import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function PageFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="app-shell">
        <AppSidebar />
        <SidebarInset className="main-area-shell">
          <div className="main-area secondary-main">
            <header className="page-header"><div className="header-leading"><SidebarTrigger className="sidebar-trigger" aria-label="Toggle sidebar" /><h1>{title}</h1></div></header>
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
