"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AppSidebar from "@/components/shared/app-sidebar";
import { Menu, LogOut, Settings } from "lucide-react";
import { branding } from "@/config/branding";
import { RoleProvider, useRole } from "@/components/providers/role-provider";
import { getStoredUser, clearStoredUser } from "@/lib/user-storage";
import { getStoredRole, clearStoredRole, type UserRole } from "@/lib/role-storage";
import { usePathname, useRouter } from "next/navigation";
import BackendStatus from "@/components/shared/backend-status";
import { AppLogo } from "@/components/shared/app-logo";
import dynamic from "next/dynamic";

const OnboardingTour = dynamic(
  () => import("@/components/features/onboarding/onboarding-tour"),
  { ssr: false }
);

const SECTION_ROLE: Record<string, UserRole> = {
  admin: "admin",
  dentist: "dentist",
  receptionist: "staff",
};

const defaultRouteForRole = (role: UserRole) => {
  if (role === "admin") return "/admin";
  if (role === "dentist") return "/dentist";
  return "/receptionist";
};

const deriveSection = (pathname: string) => {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/dentist")) return "dentist";
  if (pathname.startsWith("/receptionist")) return "receptionist";
  return null;
};

const derivePageTitle = (pathname: string) => {
  if (pathname === "/admin") return "Admin Dashboard";
  if (pathname === "/admin/users") return "User Management";
  if (pathname === "/admin/settings") return "Admin Settings";
  if (pathname === "/dentist") return "Dentist Dashboard";
  if (pathname === "/dentist/schedule") return "Schedule";
  if (pathname === "/dentist/patients") return "Patients";
  if (pathname.startsWith("/dentist/patients/")) return "Patient Details";
  if (pathname === "/dentist/xray-lab") return "X-Ray Lab";
  if (pathname.startsWith("/dentist/xray-lab/")) return "X-Ray Analysis";
  if (pathname === "/dentist/settings") return "Settings";
  if (pathname === "/receptionist") return "Receptionist Dashboard";
  if (pathname === "/receptionist/appointments") return "Appointments";
  if (pathname === "/receptionist/patients") return "Patients";
  if (pathname === "/receptionist/settings") return "Settings";
  return "";
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // State for Desktop Sidebar
  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccessChecked(false);
    setHasAccess(false);

    const role = getStoredRole();
    if (!role) {
      router.replace("/login");
      setAccessChecked(true);
      return;
    }

    const section = deriveSection(pathname);
    if (section) {
      const requiredRole = SECTION_ROLE[section];
      const allowed = role === requiredRole || role === "admin";
      if (!allowed) {
        router.replace(defaultRouteForRole(role));
        setAccessChecked(true);
        return;
      }
    }

    setHasAccess(true);
    setAccessChecked(true);
  }, [pathname, router]);

  useEffect(() => {
    const stored = getStoredUser();
    setUserName(stored?.name ?? null);
    setUserEmail(stored?.email ?? null);
    setUserImage(stored?.image ?? null);
    setUserRole(stored?.role ?? null);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileMenu]);

  const handleLogout = useCallback(() => {
    clearStoredUser();
    clearStoredRole();
    setShowProfileMenu(false);
    router.push("/login");
  }, [router]);

  const initials = useMemo(() => {
    const source = userName || userEmail || "";
    const parts = source.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [userName, userEmail]);

  const pageTitle = useMemo(() => derivePageTitle(pathname), [pathname]);

  if (!accessChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground bg-background">
        Checking access...
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <RoleProvider>
    <div className="flex min-h-screen w-full bg-background relative">
      
      {/* --- MOBILE SIDEBAR (Overlay) --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-card h-full shadow-xl animate-in slide-in-from-left duration-200">
            {/* Mobile Sidebar has Close Button */}
            <AppSidebar onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR (Push/Collapse) --- */}
      {/* Only render the container if open or animating. For simplicity, we use CSS transform. */}
      <aside
        className={`hidden md:block fixed inset-y-0 z-30 transition-all duration-300 border-r border-border bg-card overflow-hidden shadow-lg ${
          isDesktopSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full opacity-0"
        }`}
      >
         <div className="w-64 h-full"> 
            {/* Desktop Sidebar has Close Button */}
            <AppSidebar onClose={() => setDesktopSidebarOpen(false)} />
         </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isDesktopSidebarOpen ? "md:ml-64" : "md:ml-0"
        }`}
      >
        <BackendStatus />
        {/* HEADER */}
        <header className="relative flex items-center justify-between h-16 px-4 border-b border-border bg-card sticky top-0 z-20">
           <div className="flex items-center gap-3">
             
             {/* HAMBURGER BUTTON */}
             {/* Only visible if the sidebar is CLOSED (Desktop) or ALWAYS on Mobile (since mobile sidebar is overlay) */}
             {/* Logic: 
                 - Mobile: Always show (unless menu open, but menu is overlay so z-index covers it) 
                 - Desktop: Show ONLY if !isDesktopSidebarOpen 
             */}
              <button
               id="tour-sidebar-toggle"
               onClick={() => {
                 if (window.innerWidth < 768) {
                   setIsMobileMenuOpen(true);
                 } else {
                   setDesktopSidebarOpen(true);
                 }
               }}
               className={`min-h-[44px] min-w-[44px] touch-manipulation p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                 // Hide on desktop if sidebar is open
                 isDesktopSidebarOpen ? "md:hidden" : "block"
               }`}
             >
               <Menu className="w-6 h-6" />
             </button>
             
             {/* Branding / Logo */}
             <div className="flex items-center">
               <AppLogo className="h-12 sm:h-14" />
             </div>
           </div>

           {pageTitle ? (
             <div
               className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-bold hidden md:block"
               style={{ color: '#8c62c2' }}
             >
               {pageTitle}
             </div>
           ) : null}

           <div className="relative" id="tour-profile-menu" ref={profileMenuRef}>
             <button
               onClick={() => setShowProfileMenu((v) => !v)}
               className="flex items-center gap-2 focus:outline-none"
             >
               <div className="text-right leading-tight hidden sm:block">
                 <p className="text-sm font-semibold text-foreground">{userName || ""}</p>
                 <p className="text-xs text-muted-foreground">{userEmail || ""}</p>
               </div>
               {userImage ? (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img
                   src={userImage}
                   alt={userName || "Profile"}
                   className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 hover:ring-primary/40 transition"
                 />
               ) : (
                 <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs ring-2 ring-primary/20 hover:ring-primary/40 transition cursor-pointer">
                   {initials || ""}
                 </div>
               )}
             </button>

             {/* Profile Dropdown */}
             {showProfileMenu && (
               <div className="absolute right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                 <div className="p-4 border-b border-border">
                   <div className="flex items-center gap-3">
                     {userImage ? (
                       // eslint-disable-next-line @next/next/no-img-element
                       <img
                         src={userImage}
                         alt={userName || "Profile"}
                         className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                       />
                     ) : (
                       <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                         {initials || ""}
                       </div>
                     )}
                     <div className="min-w-0">
                       <p className="font-semibold text-foreground truncate">{userName || "User"}</p>
                       <p className="text-xs text-muted-foreground truncate">{userEmail || ""}</p>
                       {userRole && (
                         <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                           {userRole}
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
                 <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        const section = deriveSection(pathname);
                        router.push(section === 'admin' ? '/admin/settings' : section === 'receptionist' ? '/receptionist/settings' : '/dentist/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
               </div>
             )}
           </div>
        </header>

        <div id="tour-dashboard-card" className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
    <OnboardingTour role={deriveSection(pathname) === 'receptionist' ? 'staff' : deriveSection(pathname) || 'dentist'} openSidebar={() => setDesktopSidebarOpen(true)} />
    </RoleProvider>
  );
}