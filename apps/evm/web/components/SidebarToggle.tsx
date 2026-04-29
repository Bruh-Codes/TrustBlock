"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarToggle() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 z-[80] hidden rounded-full border-border/70 bg-background/95 shadow-sm md:flex",
        isExpanded ? "left-[calc(var(--sidebar-width)-0.875rem)]" : "left-[calc(var(--sidebar-width-icon)-0.875rem)]"
      )}
    >
      {isExpanded ? <ChevronsLeft /> : <ChevronsRight />}
    </Button>
  );
}

export function MobileSidebarToggle() {
  const { isMobile, openMobile, toggleSidebar } = useSidebar();

  if (!isMobile || openMobile) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Open sidebar"
      onClick={toggleSidebar}
      className="fixed top-4 left-0 z-[80] rounded-r-full rounded-l-none border-border/70 bg-background/95 shadow-sm md:hidden"
    >
      <ChevronsRight />
    </Button>
  );
}
