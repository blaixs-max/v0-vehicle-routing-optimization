"use client"

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
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Harita", icon: MapPin },
  { href: "/depots", label: "Depolar", icon: Warehouse },
  { href: "/vehicles", label: "Araçlar", icon: Truck },
  { href: "/customers", label: "Müşteriler", icon: Users },
  { href: "/routes", label: "Rotalar", icon: Route },
  { href: "/optimize", label: "Optimizasyon", icon: Zap },
  { href: "/reports", label: "Raporlar", icon: BarChart3 },
]

const bottomNavItems = [
  { href: "/settings", label: "Ayarlar", icon: Settings },
  { href: "/help", label: "Yardım", icon: HelpCircle },
]

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const NavLink = ({ item, isActive }: { item: (typeof navItems)[0]; isActive: boolean }) => {
    const Icon = item.icon

    const linkContent = (
      <Link href={item.href} className="block">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent",
            isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
            collapsed && "justify-center px-2",
          )}
        >
          <Icon
            className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-sidebar-foreground/70")}
          />
          {!collapsed && (
            <span
              className={cn("text-sm font-medium", isActive ? "text-primary-foreground" : "text-sidebar-foreground")}
            >
              {item.label}
            </span>
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
      <aside
        className={cn(
          "relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Route className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold text-sidebar-foreground">RouteOpt</span>
                <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">VRP Solver</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {!collapsed && (
            <p className="px-3 py-2 text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Ana Menü
            </p>
          )}
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-card shadow-md hover:bg-secondary z-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Version */}
        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border">
            <p className="text-[10px] text-sidebar-foreground/40 text-center">v2.0.0 - MDCVRP</p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
