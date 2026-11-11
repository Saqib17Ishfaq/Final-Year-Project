"use client"

import Link from "next/link"
import { Users, Settings, Activity, Stethoscope, Users as UsersIcon } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management Card */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 flex flex-col h-full">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">User Management</h3>
          <p className="text-sm text-muted-foreground flex-1 mb-6">
            Add dentists, staff, and admins. Revoke access when needed.
          </p>
          <Link 
            href="/admin/users" 
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm relative z-10"
          >
            Manage Users
          </Link>
        </div>

        {/* Settings Card */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 flex flex-col h-full">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Settings className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Settings</h3>
          <p className="text-sm text-muted-foreground flex-1 mb-6">
            Clinic and platform configuration.
          </p>
          <Link 
            href="/admin/settings" 
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm relative z-10"
          >
            Open Settings
          </Link>
        </div>

        {/* Dashboards Card */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 flex flex-col h-full lg:col-span-1 md:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Dashboards</h3>
          <p className="text-sm text-muted-foreground flex-1 mb-6">
            Jump into dentist or staff views for testing.
          </p>
          <div className="grid grid-cols-2 gap-3 w-full">
            <Link 
              href="/dentist" 
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800 relative z-10"
            >
              <Stethoscope className="w-4 h-4" />
              Dentist
            </Link>
            <Link 
              href="/receptionist" 
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800 relative z-10"
            >
              <UsersIcon className="w-4 h-4" />
              Staff
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
