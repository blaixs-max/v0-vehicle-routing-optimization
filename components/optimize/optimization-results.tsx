"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Depot, Vehicle, Customer } from "@/types/database"
import type { OptimizationResult } from "@/lib/vrp/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, Clock, Route, Truck, AlertTriangle, Save, Loader2, Fuel, Banknote } from "lucide-react"
import { DEPOT_COLORS } from "@/lib/constants"

interface OptimizationResultsProps {
  result: OptimizationResult
  depots: Depot[]
  vehicles: Vehicle[]
  customers: Customer[]
}

export function OptimizationResults({ result, depots, vehicles, customers }: OptimizationResultsProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveRoutes() {
    setSaving(true)

    try {
      const supabase = createClient()

      for (const route of result.routes) {
        // Create route record
        const { data: routeData } = await supabase
          .from("routes")
          .insert({
            vehicle_id: route.vehicleId,
            depot_id: route.depotId,
            route_date: new Date().toISOString().split("T")[0],
            total_distance_km: route.totalDistance,
            total_duration_min: route.totalDuration,
            total_pallets: route.totalLoad,
            total_kg: route.totalKg,
            total_cost: route.totalCost,
            fuel_cost: route.fuelCost,
            distance_cost: route.distanceCost,
            fixed_cost: route.fixedCost,
            status: "planned",
            optimized_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (routeData) {
          // Create route stops
          const stops = route.stops.map((customerId, index) => ({
            route_id: routeData.id,
            customer_id: customerId,
            stop_order: index + 1,
            status: "pending",
          }))

          await supabase.from("route_stops").insert(stops)

          // Update customer status
          await supabase.from("customers").update({ status: "assigned" }).in("id", route.stops)

          // Update vehicle status
          await supabase.from("vehicles").update({ status: "in_route" }).eq("id", route.vehicleId)
        }
      }

      setSaved(true)
    } catch (error) {
      console.error("Failed to save routes:", error)
    } finally {
      setSaving(false)
    }
  }

  const getVehicle = (id: string) => vehicles.find((v) => v.id === id)
  const getDepot = (id: string) => depots.find((d) => d.id === id)
  const getCustomer = (id: string) => customers.find((c) => c.id === id)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Kullanılan Araç</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.totalVehiclesUsed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Toplam Mesafe</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.totalDistance.toFixed(1)} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Toplam Maliyet</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.totalCost.toLocaleString()} TL</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Hesaplama Süresi</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.computationTimeMs} ms</p>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Optimizasyon Tamamlandı</CardTitle>
            </div>
            <Badge variant="outline">{result.algorithm}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {result.unassignedCustomers.length > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{result.unassignedCustomers.length} müşteri atanamadı</span>
                </div>
              )}
            </div>
            <Button onClick={saveRoutes} disabled={saving || saved}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Kaydedildi
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Rotaları Kaydet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Routes Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rota Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">Liste Görünümü</TabsTrigger>
              <TabsTrigger value="table">Tablo Görünümü</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4 space-y-4">
              {result.routes.map((route, index) => {
                const vehicle = getVehicle(route.vehicleId)
                const depot = getDepot(route.depotId)

                return (
                  <Card
                    key={index}
                    className="border-l-4"
                    style={{ borderLeftColor: DEPOT_COLORS[depot?.city || ""]?.primary }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              style={{
                                backgroundColor: DEPOT_COLORS[depot?.city || ""]?.primary,
                                color: "white",
                              }}
                            >
                              {depot?.city}
                            </Badge>
                            <span className="font-mono font-medium">{vehicle?.plate}</span>
                            <Badge variant="outline">{vehicle?.vehicle_type === "tir" ? "TIR" : "Kamyon"}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{route.stops.length} durak</span>
                            <span>{route.totalDistance.toFixed(1)} km</span>
                            <span>
                              {Math.floor(route.totalDuration / 60)}s {route.totalDuration % 60}dk
                            </span>
                            <span>{route.totalLoad} palet</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{route.totalCost.toLocaleString()} TL</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Fuel className="h-3 w-3" />
                              {route.fuelCost.toLocaleString()} TL
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Teslimat Sırası:</p>
                        <div className="flex flex-wrap gap-1">
                          {route.stops.map((stopId, stopIndex) => {
                            const customer = getCustomer(stopId)
                            return (
                              <Badge key={stopId} variant="secondary" className="text-xs">
                                {stopIndex + 1}. {customer?.name?.slice(0, 20)}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Depo</TableHead>
                    <TableHead>Araç</TableHead>
                    <TableHead>Durak</TableHead>
                    <TableHead>Mesafe</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Yük</TableHead>
                    <TableHead>Yakıt</TableHead>
                    <TableHead>Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.routes.map((route, index) => {
                    const vehicle = getVehicle(route.vehicleId)
                    const depot = getDepot(route.depotId)
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: DEPOT_COLORS[depot?.city || ""]?.primary,
                              color: DEPOT_COLORS[depot?.city || ""]?.primary,
                            }}
                          >
                            {depot?.city}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{vehicle?.plate}</TableCell>
                        <TableCell>{route.stops.length}</TableCell>
                        <TableCell>{route.totalDistance.toFixed(1)} km</TableCell>
                        <TableCell>
                          {Math.floor(route.totalDuration / 60)}s {route.totalDuration % 60}dk
                        </TableCell>
                        <TableCell>{route.totalLoad} palet</TableCell>
                        <TableCell>{route.fuelCost.toLocaleString()} TL</TableCell>
                        <TableCell className="font-medium">{route.totalCost.toLocaleString()} TL</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
