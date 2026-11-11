"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole } from "@/lib/role-storage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const role = getStoredRole();
    if (role === "admin") router.replace("/admin");
    else if (role === "staff") router.replace("/receptionist");
    else if (role === "dentist") router.replace("/dentist");
    else router.replace("/login");
  }, [router]);

  return null;
}
