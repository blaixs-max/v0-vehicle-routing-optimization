"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  Warehouse,
  Truck,
  Users,
  Route,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart3,
  MapPin,
  HelpCircle,
  Bell,
  Search,
  Package,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Harita", icon: MapPin },
  { href: "/orders", label: "Siparisler", icon: Package },
  { href: "/depots", label: "Depolar", icon: Warehouse },
  { href: "/vehicles", label: "Araclar", icon: Truck },
  { href: "/customers", label: "Musteriler", icon: Users },
  { href: "/optimize", label: "Optimizasyon", icon: Zap },
  { href: "/routes", label: "Rotalar", icon: Route },
  { href: "/reports", label: "Raporlar", icon: BarChart3 },
]

const bottomNavItems = [
  { href: "/settings", label: "Ayarlar", icon: Settings },
  { href: "/help", label: "Yardim", icon: HelpCircle },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const NavLink = ({ item, isActive }: { item: (typeof navItems)[0]; isActive: boolean }) => {
    const Icon = item.icon

    const linkContent = (
      <Link href={item.href} className="block">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-white/10",
            isActive && "bg-emerald-600 text-white hover:bg-emerald-700",
            collapsed && "justify-center px-2",
          )}
        >
          <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
          {!collapsed && (
            <span className={cn("text-sm font-medium", isActive ? "text-white" : "text-slate-300")}>{item.label}</span>
          )}
        </div>
      </Link>
    )

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkContent
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-100">
        {/* Sidebar */}
        <aside
          className={cn(
            "relative flex flex-col bg-slate-900 transition-all duration-300",
            collapsed ? "w-[68px]" : "w-60",
          )}
        >
          {/* Logo */}
          <div
            className={cn(
              "flex items-center h-14 border-b border-slate-700",
              collapsed ? "justify-center px-2" : "px-4",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600">
                <Route className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">RouteOpt</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">VRP Solver</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
            {!collapsed && (
              <p className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Menu</p>
            )}
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </nav>

          {/* Bottom Navigation */}
          <div className="p-2 border-t border-slate-700 space-y-0.5">
            {bottomNavItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </div>

          {/* Collapse Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-3 top-16 h-6 w-6 rounded-full border border-slate-300 bg-white shadow-md hover:bg-slate-50 z-10"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>

          {/* Version */}
          {!collapsed && (
            <div className="p-3 border-t border-slate-700">
              <p className="text-[10px] text-slate-600 text-center">v2.0.0</p>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ara..."
                  className="w-64 h-9 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              <div className="h-8 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                  A
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">Admin</p>
                  <p className="text-xs text-slate-500">Yonetici</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
