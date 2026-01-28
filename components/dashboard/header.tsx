"use client"

import { Bell, Search, Sun, Moon, Plus, RefreshCw, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDepotStore } from "@/lib/depot-store"
import { useDepots } from "@/lib/hooks/use-depot-data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

export function DashboardHeader() {
  const [isDark, setIsDark] = useState(false)
  const selectedDepotId = useDepotStore((state) => state.selectedDepotId)
  const { data: depots } = useDepots()
  const selectedDepot = depots?.find((d) => d.id === selectedDepotId)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 gap-4">
      {/* Left Section - Depot & Search */}
      <div className="flex items-center gap-3 flex-1">
        {selectedDepot && (
          <Badge variant="outline" className="h-9 gap-2 px-3 text-sm font-medium border-primary/30 bg-primary/5">
            <Building2 className="h-4 w-4 text-primary" />
            {selectedDepot.name}
          </Badge>
        )}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Müşteri, araç veya rota ara..."
            className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Hızlı Ekle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Yeni Sipariş</DropdownMenuItem>
            <DropdownMenuItem>Yeni Müşteri</DropdownMenuItem>
            <DropdownMenuItem>Yeni Araç</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-primary font-medium">
              <RefreshCw className="h-4 w-4 mr-2" />
              Rota Optimize Et
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Bildirimler
              <Badge variant="secondary" className="text-[10px]">
                3 yeni
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-sm">Optimizasyon Tamamlandı</span>
              <span className="text-xs text-muted-foreground">12 rota oluşturuldu - 5 dk önce</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-sm">Yeni Sipariş</span>
              <span className="text-xs text-muted-foreground">Kadıköy bölgesi - 15 dk önce</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-sm">Araç Uyarısı</span>
              <span className="text-xs text-muted-foreground">34 ABC 123 bakım zamanı - 1 saat önce</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border mx-1" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-foreground">A</span>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">Admin</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Yönetici</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Ayarlar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Çıkış Yap</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
