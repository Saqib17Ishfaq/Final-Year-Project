import { clinicConfig } from "../../config/clinic.config";

export type UserRole = "admin" | "dentist" | "staff";

const KEY = clinicConfig.name.toLowerCase().replace(/\s+/g, "_") + "_role";

export function getStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(KEY);
  if (value === "dentist" || value === "staff" || value === "admin") return value as UserRole;
  return null;
}

export function setStoredRole(role: UserRole) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, role);
}

export function clearStoredRole() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
