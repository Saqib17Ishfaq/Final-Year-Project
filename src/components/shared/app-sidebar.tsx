"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, LayoutDashboard, Calendar, Users, FileDigit, Settings, LogOut, Sun, Moon } from "lucide-react";
import { navigation } from "@/config/branding";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRole } from "@/components/providers/role-provider";
import { clearStoredUser } from "@/lib/user-storage";

interface AppSidebarProps {
  className?: string;
  onClose?: () => void; 
}

// Map string icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Calendar,
  Users,
  FileDigit,
  Settings,
  LogOut
};

export default function AppSidebar({ className = "", onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { role, clearRole } = useRole();
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setMounted(true);
    }
  }, []);

  const isActive = (path: string) => pathname === path;

  const links = role ? navigation.sidebar[role] ?? [] : [];

  const sections = useMemo(() => {
    if (role !== "admin") {
      return [{ title: null, items: links }];
    }

    const adminLinks = links.filter((link) => link.href.startsWith("/admin"));
    const dentistLinks = links.filter((link) => link.href.startsWith("/dentist"));
    const receptionistLinks = links.filter((link) => link.href.startsWith("/receptionist"));
    const miscLinks = links.filter(
      (link) =>
        !link.href.startsWith("/admin") &&
        !link.href.startsWith("/dentist") &&
        !link.href.startsWith("/receptionist")
    );

    return [
      { title: "Admin", items: adminLinks },
      { title: "Dentist View", items: dentistLinks },
      { title: "Staff View", items: receptionistLinks },
      { title: "Other", items: miscLinks },
    ].filter((section) => section.items.length > 0);
  }, [links, role]);
  
  return (
    <div className={`flex h-full flex-col bg-background text-foreground border-r border-border ${className}`}>
      <div className="flex h-16 items-center justify-end border-b border-border px-4 flex-shrink-0">
        {/* Close Button - Visible on ALL screens now */}
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:bg-secondary p-1 rounded transition-colors"
            title="Close Sidebar"
          >
             <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {sections.map((section, index) => (
          <div key={section.title || `section-${index}`} className="space-y-1">
            {section.title ? (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
            ) : null}
            {section.items.map((link) => {
              const Icon = iconMap[link.icon] || LayoutDashboard;
              const active = isActive(link.href);
              // Map routes to tour IDs for the onboarding tour
              const tourIdMap: Record<string, string> = {
                // Dentist
                '/dentist': 'tour-dentist-dashboard-nav',
                '/dentist/schedule': 'tour-schedule-nav',
                '/dentist/patients': 'tour-patients-nav',
                '/dentist/xray-lab': 'tour-xray-lab-nav',
                '/dentist/model-transparency': 'tour-about-ai-nav',
                // Staff (Receptionist)
                '/receptionist': 'tour-staff-dashboard-nav',
                '/receptionist/appointments': 'tour-appointments-nav',
                '/receptionist/patients': 'tour-staff-patients-nav',
                // Admin
                '/admin': 'tour-admin-dashboard-nav',
                '/admin/users': 'tour-admin-users-nav',
                '/admin/settings': 'tour-admin-settings-nav',
              };
              const tourId = tourIdMap[link.href];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  id={tourId}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      
      <div className="border-t border-border p-4 flex-shrink-0 space-y-2">
        {mounted && (
          <button 
            onClick={() => setTheme((resolvedTheme || theme) === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {(resolvedTheme || theme) === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {(resolvedTheme || theme) === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        )}

        <button
          onClick={() => {
            clearRole();
            clearStoredUser();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
