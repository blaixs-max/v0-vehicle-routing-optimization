"use client"

import { useState } from "react"
import type { VroomOptimizationResult, VroomRouteResult } from "@/lib/vroom/types"
import type { Depot } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Route,
  Clock,
  Fuel,
  DollarSign,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react"
import { DEPOT_COLORS } from "@/lib/constants"

interface VroomResultsProps {
  result: VroomOptimizationResult
  depots: Depot[]
}

export function VroomResults({ result, depots }: VroomResultsProps) {
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())

  const toggleRoute = (vehicleId: string) => {
    const newExpanded = new Set(expandedRoutes)
    if (newExpanded.has(vehicleId)) {
      newExpanded.delete(vehicleId)
    } else {
      newExpanded.add(vehicleId)
    }
    setExpandedRoutes(newExpanded)
  }

  const exportResults = () => {
    const data = JSON.stringify(result, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vroom-optimization-${new Date().toISOString().split("T")[0]}.json`
    a.click()
  }

  if (!result.success) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <XCircle className="h-6 w-6" />
            <div>
              <h3 className="font-medium">Optimizasyon Başarısız</h3>
              <p className="text-sm">{result.error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Route className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Rota</p>
                <p className="text-2xl font-bold">{result.summary.totalRoutes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Mesafe</p>
                <p className="text-2xl font-bold">{result.summary.totalDistance.toFixed(0)} km</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Süre</p>
                <p className="text-2xl font-bold">{Math.round(result.summary.totalDuration / 60)} saat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Maliyet</p>
                <p className="text-2xl font-bold">{result.summary.totalCost.toLocaleString("tr-TR")} TL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Maliyet Dağılımı</CardTitle>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {result.summary.computationTimeMs} ms
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Fuel className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-sm text-muted-foreground">Yakıt</p>
              <p className="font-semibold">{result.summary.fuelCost.toLocaleString("tr-TR")} TL</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Route className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-sm text-muted-foreground">Mesafe</p>
              <p className="font-semibold">{result.summary.distanceCost.toLocaleString("tr-TR")} TL</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Truck className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-sm text-muted-foreground">Sabit</p>
              <p className="font-semibold">{result.summary.fixedCost.toLocaleString("tr-TR")} TL</p>
            </div>
          </div>

          {result.summary.unassignedCount > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm">{result.summary.unassignedCount} müşteri atanamadı (kapasite yetersiz)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Rotalar ({result.routes.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={exportResults}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {result.routes.map((route) => (
              <RouteCard
                key={route.vehicleId}
                route={route}
                expanded={expandedRoutes.has(route.vehicleId)}
                onToggle={() => toggleRoute(route.vehicleId)}
                depots={depots}
              />
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

interface RouteCardProps {
  route: VroomRouteResult
  expanded: boolean
  onToggle: () => void
  depots: Depot[]
}

function RouteCard({ route, expanded, onToggle, depots }: RouteCardProps) {
  const depot = depots.find((d) => d.id === route.depotId)
  const depotColor = depot ? DEPOT_COLORS[depot.city] : null

  return (
    <div className="border-b last:border-b-0">
      <button onClick={onToggle} className="w-full p-4 hover:bg-muted/50 transition-colors text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: depotColor?.primary || "#6b7280" }}
            >
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{route.vehiclePlate}</span>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: depotColor?.primary,
                    color: depotColor?.primary,
                  }}
                >
                  {route.depotName}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>{route.stops.length} durak</span>
                <span>{route.distance} km</span>
                <span>{route.duration} dk</span>
                <span>{route.load} palet</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold">{route.cost.toLocaleString("tr-TR")} TL</span>
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="ml-5 pl-5 border-l-2 space-y-3">
            {/* Start from depot */}
            <div className="relative">
              <div
                className="absolute -left-[25px] w-4 h-4 rounded-full border-2 bg-background"
                style={{ borderColor: depotColor?.primary }}
              />
              <p className="text-sm font-medium">{route.depotName} (Başlangıç)</p>
            </div>

            {route.stops.map((stop, index) => (
              <div key={stop.customerId} className="relative">
                <div
                  className="absolute -left-[25px] w-4 h-4 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: depotColor?.primary || "#6b7280" }}
                >
                  {index + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{stop.customerName}</p>
                  <p className="text-xs text-muted-foreground">{stop.address}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>+{stop.distanceFromPrev} km</span>
                    <span>{stop.arrivalTime} dk'da varış</span>
                    <span>{stop.load} palet yüklü</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Return to depot */}
            <div className="relative">
              <div
                className="absolute -left-[25px] w-4 h-4 rounded-full border-2 bg-background"
                style={{ borderColor: depotColor?.primary }}
              />
              <p className="text-sm font-medium">{route.depotName} (Dönüş)</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Yakıt Maliyeti</p>
              <p className="font-medium">{route.fuelCost.toLocaleString("tr-TR")} TL</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mesafe Maliyeti</p>
              <p className="font-medium">{route.distanceCost.toLocaleString("tr-TR")} TL</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sabit Maliyet</p>
              <p className="font-medium">{route.fixedCost.toLocaleString("tr-TR")} TL</p>
            </div>
            <div>
              <p className="text-muted-foreground">Toplam</p>
              <p className="font-semibold">{route.cost.toLocaleString("tr-TR")} TL</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
