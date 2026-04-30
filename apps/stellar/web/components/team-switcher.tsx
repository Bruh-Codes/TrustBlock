"use client";

import type { ComponentType } from "react";
import { Sparkles } from "lucide-react";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher({
	teams,
}: {
	teams: Array<{
		name: string;
		logo: ComponentType<{ className?: string }>;
		plan: string;
	}>;
}) {
	const activeTeam = teams[0];

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					className="h-14 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/35"
				>
					<div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#b7f34d] via-[#8fe96f] to-[#60a5fa] text-[#061012] shadow-[0_8px_22px_rgba(96,165,250,0.35)]">
						<activeTeam.logo className="h-6 w-6" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{activeTeam.name}</span>
						<span className="truncate text-xs text-sidebar-foreground/75">
							{activeTeam.plan}
						</span>
					</div>
					<div className="ml-auto inline-flex items-center gap-1 rounded-full border border-sidebar-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/75">
						<Sparkles className="h-3 w-3" />
						Live
					</div>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
