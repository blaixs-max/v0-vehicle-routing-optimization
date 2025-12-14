"use client"

import type { Route } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, MapPin, Clock, Package, ChevronRight } from "lucide-react"

interface RoutesListProps {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect: (route: Route) => void
}

export function RoutesList({ routes, selectedRoute, onRouteSelect }: RoutesListProps) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Truck className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Henuz rota bulunmuyor</p>
        <p className="text-sm">Optimizasyon sayfasindan yeni rotalar olusturun</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {routes.map((route) => {
        const isSelected = selectedRoute?.id === route.id
        const stopCount = route.stops?.length || 0
        const totalLoad = route.stops?.reduce((sum, s) => sum + (s.customer?.demand_pallet || 0), 0) || 0

        return (
          <Card
            key={route.id}
            className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
            onClick={() => onRouteSelect(route)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{route.vehicle?.plate || "Arac"}</p>
                    <p className="text-xs text-muted-foreground">{route.vehicle?.vehicle_type}</p>
                  </div>
                </div>
                <Badge variant={route.status === "completed" ? "default" : "secondary"}>
                  {route.status === "completed"
                    ? "Tamamlandi"
                    : route.status === "in_progress"
                      ? "Devam Ediyor"
                      : "Planli"}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    Mesafe
                  </span>
                  <span className="font-medium">{route.total_distance_km?.toFixed(1)} km</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Sure
                  </span>
                  <span className="font-medium">{Math.round(route.total_duration_min || 0)} dk</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Package className="w-3.5 h-3.5" />
                    Yuk
                  </span>
                  <span className="font-medium">{totalLoad} palet</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{stopCount}</span> durak
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{route.total_cost?.toLocaleString("tr-TR")} TL</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
