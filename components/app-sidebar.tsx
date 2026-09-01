"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Home, Network, Settings2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/network", label: "Network", icon: Network },
  { href: "/minecraft", label: "Minecraft", icon: Gamepad2 },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="localhouse-sidebar">
      <SidebarHeader className="localhouse-sidebar-header">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="LocalHouse" render={<Link href="/" aria-label="LocalHouse home" />}>
              <span className="sidebar-brand-mark">L</span>
              <span className="sidebar-brand-name">localhouse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} render={<Link href={item.href} />}>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
