"use client";

import { createContext, useContext, useEffect, useState, useRef, useSyncExternalStore } from "react";
import { getStoredRole, setStoredRole, clearStoredRole, type UserRole } from "@/lib/role-storage";

type RoleContextValue = {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

// Use useSyncExternalStore for initial state to avoid setState in effect
function useInitialRole(): UserRole | null {
  return useSyncExternalStore(
    () => () => {}, // No-op subscribe
    () => getStoredRole(), // Client
    () => null // Server
  );
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const initialRole = useInitialRole();
  const [role, setRoleState] = useState<UserRole | null>(initialRole);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Only sync once on mount if needed
    if (!mountedRef.current) {
      mountedRef.current = true;
      const storedRole = getStoredRole();
      if (storedRole !== role) {
        setRoleState(storedRole);
      }
    }
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setStoredRole(newRole);
    setRoleState(newRole);
  };

  const clearRoleFn = () => {
    clearStoredRole();
    setRoleState(null);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole: clearRoleFn }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
