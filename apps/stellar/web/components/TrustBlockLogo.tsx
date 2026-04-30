import { cn } from "@/lib/utils";

export function TrustBlockLogoMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 48 48"
			fill="none"
			aria-hidden="true"
			className={cn("h-5 w-5", className)}
		>
			<defs>
				<linearGradient id="tb-logo-gradient" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
					<stop stopColor="#B7F34D" />
					<stop offset="1" stopColor="#60A5FA" />
				</linearGradient>
			</defs>
			<path
				d="M24 4L40 10V22C40 32.5 33.2 41.8 24 44C14.8 41.8 8 32.5 8 22V10L24 4Z"
				fill="url(#tb-logo-gradient)"
			/>
			<path
				d="M18.8 24.2L22.2 27.6L29.8 19.8"
				stroke="#061012"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15 16.8H33"
				stroke="#061012"
				strokeOpacity="0.55"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}
