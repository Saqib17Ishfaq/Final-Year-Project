import { NextResponse } from "next/server";
import { clinicConfig } from "../../../config/clinic.config";

export async function GET() {
  const manifest = {
    name: `${clinicConfig.name} Clinic System`,
    short_name: clinicConfig.name,
    start_url: "/dentist",
    scope: "/",
    display_override: ["standalone", "minimal-ui"],
    display: "standalone",
    orientation: "landscape",
    background_color: "#ffffff",
    theme_color: clinicConfig.meta.themeColor,
    description: "AI-powered dental diagnostic system",
    icons: [
      { src: "/favicon.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon.png", sizes: "512x512", type: "image/png" },
      { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
