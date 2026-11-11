"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { setStoredRole, type UserRole } from "@/lib/role-storage";
import { setStoredUser } from "@/lib/user-storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clinicConfig } from "../../../config/clinic.config";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body.error || "Login failed");
      }
        const role = (body.data?.role || "dentist") as UserRole;
        setStoredRole(role);
        if (body.data?.name && body.data?.email) {
          setStoredUser({ id: body.data.id, name: body.data.name, email: body.data.email, image: body.data.image, role: body.data.role });
        }
        if (role === "admin") {
          router.replace("/admin");
        } else if (role === "staff") {
          router.replace("/receptionist");
        } else {
          router.replace("/dentist");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setError(message);
      toast.error(message, {
        description: message.includes("revoked") ? "Your access has been disabled by an admin." : "Please check your credentials and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      {mounted && (
        <button
          onClick={() => setTheme((resolvedTheme || theme) === "dark" ? "light" : "dark")}
          className="absolute top-4 right-4 p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
          aria-label="Toggle dark mode"
        >
          {(resolvedTheme || theme) === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      )}
      <Card className="w-full max-w-xl p-8 shadow-xl border border-border space-y-6 z-10">
        <div className="space-y-2 text-center">
          <div className="mx-auto relative h-32 w-full max-w-[480px] sm:max-w-[560px]">
            <AppLogo className="h-full w-full" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Sign in</h1>
          <p className="text-muted-foreground text-sm">Enter your clinic credentials to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-sm text-foreground">Email</label>
            <input
              className="w-full border border-border bg-background text-foreground rounded px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dentist@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-foreground">Password</label>
            <input
              className="w-full border border-border bg-background text-foreground rounded px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

      </Card>
    </main>
  );
}
