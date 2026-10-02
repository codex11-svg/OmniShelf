import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async redirects() {
		return [
			{
				source: "/shop",
				destination: "/marketplace",
				permanent: false,
			},
		];
	},
};

export default nextConfig;
