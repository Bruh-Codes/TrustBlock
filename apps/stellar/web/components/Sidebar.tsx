"use client";

import * as React from "react";
import {
	GalleryVerticalEnd,
	LayoutDashboard,
	ListChecks,
	PlusCircle,
	ShieldCheck,
} from "lucide-react";

import { ViewState } from "@/app/page";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarToggle } from "@/components/SidebarToggle";
import { TeamSwitcher } from "@/components/team-switcher";
import { TrustBlockLogoMark } from "@/components/TrustBlockLogo";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";

const data = {
	user: {
		name: "TrustBlock Ops",
		email: "ops@trustblock.app",
	},
	teams: [
		{
			name: "TrustBlock",
			logo: TrustBlockLogoMark,
			plan: "Stellar Escrow",
		},
	],
	navMain: [
		{
			title: "Overview",
			view: "overview" as ViewState,
			icon: LayoutDashboard,
		},
		{
			title: "New Escrow",
			view: "create" as ViewState,
			icon: PlusCircle,
		},
		{
			title: "Ledger",
			view: "transactions" as ViewState,
			icon: ListChecks,
		},
	],
};

export function AppSidebar({
	currentView,
	setCurrentView,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	currentView: ViewState;
	setCurrentView: (view: ViewState) => void;
}) {
	return (
		<Sidebar collapsible="icon" variant="sidebar" {...props}>
			<SidebarToggle />
			<SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain
					items={data.navMain}
					currentView={currentView}
					onSelect={setCurrentView}
				/>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
