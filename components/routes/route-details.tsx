"use client"

import type { Route } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, Truck, MapPin, Clock, Fuel, Package, Navigation, Building2 } from "lucide-react"

interface RouteDetailsProps {
  route: Route
  onClose: () => void
}

export function RouteDetails({ route, onClose }: RouteDetailsProps) {
  const sortedStops = [...(route.stops || [])].sort((a, b) => a.stop_order - b.stop_order)
  const totalLoad = sortedStops.reduce((sum, s) => sum + (s.customer?.demand_pallet || 0), 0)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{route.vehicle?.plate}</h3>
            <p className="text-sm text-muted-foreground">{route.depot?.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30">
        <div className="p-3 rounded-lg bg-background">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs">Mesafe</span>
          </div>
          <p className="font-semibold">{route.total_distance_km?.toFixed(1)} km</p>
        </div>
        <div className="p-3 rounded-lg bg-background">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">Sure</span>
          </div>
          <p className="font-semibold">{Math.round(route.total_duration_min || 0)} dk</p>
        </div>
        <div className="p-3 rounded-lg bg-background">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Fuel className="w-3.5 h-3.5" />
            <span className="text-xs">Yakit</span>
          </div>
          <p className="font-semibold">{route.fuel_cost?.toLocaleString("tr-TR")} TL</p>
        </div>
        <div className="p-3 rounded-lg bg-background">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="w-3.5 h-3.5" />
            <span className="text-xs">Yuk</span>
          </div>
          <p className="font-semibold">{totalLoad} palet</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-4 border-b border-border">
        <h4 className="text-sm font-medium mb-3">Maliyet Dagilimi</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sabit Maliyet</span>
            <span>{route.fixed_cost?.toLocaleString("tr-TR")} TL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mesafe Maliyeti</span>
            <span>{route.distance_cost?.toLocaleString("tr-TR")} TL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Yakit Maliyeti</span>
            <span>{route.fuel_cost?.toLocaleString("tr-TR")} TL</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Toplam</span>
            <span className="text-primary">{route.total_cost?.toLocaleString("tr-TR")} TL</span>
          </div>
        </div>
      </div>

      {/* Route Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-medium mb-4">Rota Detayi ({sortedStops.length} durak)</h4>

        <div className="relative">
          {/* Start - Depot */}
          <div className="flex gap-3 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="w-0.5 h-6 bg-border" />
            </div>
            <div className="flex-1 pt-1">
              <p className="font-medium">{route.depot?.name}</p>
              <p className="text-sm text-muted-foreground">Baslangic</p>
            </div>
          </div>

          {/* Stops */}
          {sortedStops.map((stop, index) => (
            <div key={stop.id} className="flex gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border-2 border-primary">
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                {index < sortedStops.length - 1 && <div className="w-0.5 h-full min-h-[60px] bg-border" />}
              </div>
              <div className="flex-1 pt-1 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{stop.customer?.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{stop.customer?.address}</p>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {stop.customer?.demand_pallet} palet
                  </Badge>
                </div>
                {stop.distance_from_prev && (
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {stop.distance_from_prev.toFixed(1)} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(stop.duration_from_prev || 0)} dk
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* End - Return to Depot */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-4 bg-border" />
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 pt-5">
              <p className="font-medium">{route.depot?.name}</p>
              <p className="text-sm text-muted-foreground">Bitis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border">
        <Button className="w-full bg-transparent" variant="outline">
          <Navigation className="w-4 h-4 mr-2" />
          Navigasyonu Baslat
        </Button>
      </div>
    </div>
  )
}
