"use client";

import type { ComponentType } from "react";

import { ViewState } from "@/app/page";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  currentView,
  onSelect,
}: {
  items: Array<{
    title: string;
    view: ViewState;
    icon: ComponentType<{ className?: string }>;
  }>;
  currentView: ViewState;
  onSelect: (view: ViewState) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={currentView === item.view} onClick={() => onSelect(item.view)}>
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
