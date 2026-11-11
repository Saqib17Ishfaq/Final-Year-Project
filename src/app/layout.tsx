import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { clinicConfig } from "../../config/clinic.config";
import ThemeInjector from "@/components/theme-injector";
import PwaRegister from "@/components/pwa-register";
import StartupGate from "@/components/startup-gate";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pageTitle = clinicConfig.meta.title || clinicConfig.name;

export const metadata: Metadata = {
  title: {
    default: pageTitle,
    template: `%s | ${pageTitle}`,
  },
  description: clinicConfig.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: clinicConfig.logo.favicon,
    shortcut: clinicConfig.logo.favicon,
    apple: clinicConfig.logo.favicon,
  },
};

export const viewport: Viewport = {
  themeColor: clinicConfig.meta.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StartupGate>
          <ThemeInjector />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster richColors position="top-right" />
          <PwaRegister />
        </StartupGate>
      </body>
    </html>
  );
}
