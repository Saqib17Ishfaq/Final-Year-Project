"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clinicConfig } from "../../config/clinic.config";
import { AppLogo } from "./shared/app-logo";

type StartupPhase = "checking" | "starting" | "ready" | "degraded";

type StartupContextValue = {
  phase: StartupPhase;
  isReady: boolean;
};

const StartupContext = createContext<StartupContextValue | null>(null);

export function useStartupStatus() {
  const context = useContext(StartupContext);
  if (!context) {
    return { phase: "ready" as StartupPhase, isReady: true };
  }
  return context;
}

function StartupOverlay({ phase }: { phase: StartupPhase }) {
  if (phase === "ready" || phase === "degraded") return null;

  const title = "Starting OrthoAI";
  const subtitle = "Loading the clinic workspace and checking the analysis backend.";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-white/90 p-6 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto mb-5 flex h-20 w-full items-center justify-center">
          <AppLogo className="h-full w-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-[var(--primary)]" />
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          boot sequence active
        </p>
      </div>
    </div>
  );
}

export default function StartupGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<StartupPhase>("checking");
  const resolvedRef = useRef(false);

  const contextValue = useMemo(
    () => ({ phase, isReady: phase === "ready" || phase === "degraded" }),
    [phase]
  );

  useEffect(() => {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "");
    if (!backendBase) {
      setPhase("degraded");
      return;
    }

    let mounted = true;
    let startupTimer: number | undefined;
    let degradeTimer: number | undefined;

    const ping = async () => {
      if (resolvedRef.current) return;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(`${backendBase}/`, { cache: "no-store", signal: controller.signal });
        if (!mounted) return;
        if (response.ok) {
          resolvedRef.current = true;
          window.clearTimeout(startupTimer);
          setPhase("ready");
          return;
        }
      } catch {
        // Retry until we either recover or move into degraded mode.
      } finally {
        window.clearTimeout(timeout);
      }
    };

    startupTimer = window.setTimeout(() => {
      if (mounted) setPhase((current) => (current === "checking" ? "starting" : current));
    }, 800);

    degradeTimer = window.setTimeout(() => {
      if (mounted && !resolvedRef.current) {
        resolvedRef.current = true;
        setPhase("degraded");
      }
    }, 12000);

    void ping();
    const retryId = window.setInterval(() => {
      if (mounted) void ping();
    }, 4000);

    return () => {
      mounted = false;
      window.clearTimeout(startupTimer);
      window.clearTimeout(degradeTimer);
      window.clearInterval(retryId);
    };
  }, []);

  return (
    <StartupContext.Provider value={contextValue}>
      {children}
      <StartupOverlay phase={phase} />
    </StartupContext.Provider>
  );
}