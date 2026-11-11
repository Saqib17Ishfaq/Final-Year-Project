import { clinicConfig } from "../../config/clinic.config";

export type StoredUser = { id?: string; name: string; email: string; image?: string; role?: string } | null;

const KEY = clinicConfig.name.toLowerCase().replace(/\s+/g, "_") + "_user";

export function getStoredUser(): StoredUser {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === "string" && typeof parsed.email === "string") {
      return { id: parsed.id, name: parsed.name, email: parsed.email, image: parsed.image, role: parsed.role };
    }
  } catch {
    return null;
  }
  return null;
}

export function setStoredUser(user: { id?: string; name: string; email: string; image?: string; role?: string }) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
