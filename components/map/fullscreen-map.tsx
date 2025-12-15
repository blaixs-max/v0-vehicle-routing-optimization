"use client"

import { useEffect, useRef, useState } from "react"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import type { MockRoute } from "@/lib/mock-data"
import { mockCustomers, mockDepots } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Warehouse, Users, Layers, Route } from "lucide-react"

interface FullscreenMapProps {
  depots: Depot[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes?: MockRoute[]
  selectedRoute?: MockRoute | null
  loading: boolean
}

const ROUTE_COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
]

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}

export function FullscreenMap({
  depots,
  vehicles,
  customers,
  routes = [],
  selectedRoute,
  loading,
}: FullscreenMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<{ depots: any; vehicles: any; customers: any; routes: any } | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [showDepots, setShowDepots] = useState(true)
  const [showVehicles, setShowVehicles] = useState(true)
  const [showCustomers, setShowCustomers] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script")
      script.id = "leaflet-js"
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.onload = () => setMapReady(true)
      document.head.appendChild(script)
    } else if ((window as any).L) {
      setMapReady(true)
    }
  }, [])

  // Harita olustur
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    const L = (window as any).L
    if (!L) return

    mapInstanceRef.current = L.map(mapRef.current).setView([39.9334, 32.8597], 6)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapInstanceRef.current)

    layersRef.current = {
      depots: L.layerGroup().addTo(mapInstanceRef.current),
      vehicles: L.layerGroup().addTo(mapInstanceRef.current),
      customers: L.layerGroup().addTo(mapInstanceRef.current),
      routes: L.layerGroup().addTo(mapInstanceRef.current),
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [mapReady])

  // Markerlari guncelle
  useEffect(() => {
    if (!mapReady || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    // Depo layer
    layersRef.current.depots.clearLayers()
    if (showDepots) {
      depots.forEach((depot) => {
        const icon = L.divIcon({
          className: "custom-icon",
          html: `<div style="background:#1E40AF;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/></svg>
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        L.marker([depot.lat, depot.lng], { icon })
          .bindPopup(`<strong>${depot.name}</strong><br/>${depot.city}<br/>Kapasite: ${depot.capacity} palet`)
          .addTo(layersRef.current!.depots)
      })
    }

    // Customer layer
    layersRef.current.customers.clearLayers()
    if (showCustomers) {
      customers.forEach((customer) => {
        // Secili rotadaki musteri mi kontrol et
        const isInSelectedRoute = selectedRoute?.stops?.some((s) => s.customer_id === customer.id)
        const stopInfo = selectedRoute?.stops?.find((s) => s.customer_id === customer.id)

        const bgColor = isInSelectedRoute ? "#10B981" : "#F97316"
        const size = isInSelectedRoute ? 28 : 20

        const icon = L.divIcon({
          className: "custom-icon",
          html: `<div style="background:${bgColor};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">
            ${isInSelectedRoute ? stopInfo?.order || stopInfo?.sequence || "" : ""}
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        L.marker([customer.lat, customer.lng], { icon })
          .bindPopup(
            `<strong>${customer.name}</strong><br/>${customer.address}<br/>Talep: ${customer.demand_pallet} palet`,
          )
          .addTo(layersRef.current!.customers)
      })
    }
  }, [depots, customers, showDepots, showCustomers, showVehicles, mapReady, selectedRoute])

  useEffect(() => {
    if (!mapReady || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    layersRef.current.routes.clearLayers()

    if (!showRoutes) return

    const routesToDraw = selectedRoute ? [selectedRoute] : routes

    routesToDraw.forEach((route, routeIndex) => {
      const color = selectedRoute ? "#10B981" : ROUTE_COLORS[routeIndex % ROUTE_COLORS.length]

      // Depo koordinatlarini al
      const depot = depots.find((d) => d.id === route.depot_id) || mockDepots.find((d) => d.id === route.depot_id)
      if (!depot) return

      let polylinePoints: [number, number][] = []

      if (route.geometry && typeof route.geometry === "string" && route.geometry.length > 0) {
        try {
          polylinePoints = decodePolyline(route.geometry)
        } catch (e) {
          console.error("Geometry decode error:", e)
        }
      }

      // Geometry yoksa veya decode basarisizsa, durak noktalarini kullan
      if (polylinePoints.length === 0) {
        polylinePoints = [[depot.lat, depot.lng]]

        if (route.stops && Array.isArray(route.stops)) {
          route.stops.forEach((stop) => {
            // Oncelikle stop'un kendi koordinatlarini kullan
            if (stop.lat && stop.lng && stop.lat !== 0 && stop.lng !== 0) {
              polylinePoints.push([stop.lat, stop.lng])
            } else {
              // Yoksa customer'dan bul
              const customer =
                customers.find((c) => c.id === stop.customer_id) || mockCustomers.find((c) => c.id === stop.customer_id)
              if (customer) {
                polylinePoints.push([customer.lat, customer.lng])
              }
            }
          })
        }

        // Depoya don
        polylinePoints.push([depot.lat, depot.lng])
      }

      // Polyline ciz
      if (polylinePoints.length > 1) {
        const polyline = L.polyline(polylinePoints, {
          color: color,
          weight: selectedRoute ? 5 : 3,
          opacity: selectedRoute ? 0.9 : 0.7,
          dashArray: route.geometry ? null : "10, 5", // Gercek yol ise duz cizgi, yoksa kesikli
        }).addTo(layersRef.current!.routes)

        // Secili rotaya zoom
        if (selectedRoute && polylinePoints.length > 1) {
          mapInstanceRef.current?.fitBounds(polyline.getBounds(), { padding: [50, 50] })
        }
      }

      if (selectedRoute && route.stops && Array.isArray(route.stops)) {
        route.stops.forEach((stop, index) => {
          let lat = stop.lat
          let lng = stop.lng

          // Koordinat yoksa customer'dan bul
          if (!lat || !lng || lat === 0 || lng === 0) {
            const customer =
              customers.find((c) => c.id === stop.customer_id) || mockCustomers.find((c) => c.id === stop.customer_id)
            if (customer) {
              lat = customer.lat
              lng = customer.lng
            }
          }

          if (lat && lng && lat !== 0 && lng !== 0) {
            const stopName =
              stop.customer_name ||
              customers.find((c) => c.id === stop.customer_id)?.name ||
              mockCustomers.find((c) => c.id === stop.customer_id)?.name ||
              `Durak ${index + 1}`

            // Durak marker'i
            const stopIcon = L.divIcon({
              className: "custom-stop-icon",
              html: `
                <div style="position:relative;">
                  <div style="background:#10B981;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">
                    ${stop.order || stop.sequence || index + 1}
                  </div>
                  <div style="position:absolute;top:36px;left:50%;transform:translateX(-50%);background:white;padding:2px 6px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;font-size:11px;font-weight:500;color:#374151;">
                    ${stopName}
                  </div>
                </div>
              `,
              iconSize: [32, 60],
              iconAnchor: [16, 16],
            })

            L.marker([lat, lng], { icon: stopIcon })
              .bindPopup(`
                <strong>${stop.order || stop.sequence || index + 1}. ${stopName}</strong><br/>
                ${stop.address || ""}<br/>
                Varis: ${stop.arrival_time || "-"}<br/>
                Talep: ${stop.demand || 0} palet
              `)
              .addTo(layersRef.current!.routes)
          }
        })

        // Depo marker'i ekle (baslangic/bitis)
        const depotIcon = L.divIcon({
          className: "custom-depot-icon",
          html: `
            <div style="position:relative;">
              <div style="background:#1E40AF;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/></svg>
              </div>
              <div style="position:absolute;top:44px;left:50%;transform:translateX(-50%);background:#1E40AF;color:white;padding:2px 8px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;font-size:11px;font-weight:600;">
                ${depot.name}
              </div>
            </div>
          `,
          iconSize: [40, 70],
          iconAnchor: [20, 20],
        })

        L.marker([depot.lat, depot.lng], { icon: depotIcon })
          .bindPopup(`<strong>${depot.name}</strong><br/>Baslangic/Bitis Noktasi`)
          .addTo(layersRef.current!.routes)
      }
    })
  }, [routes, selectedRoute, depots, customers, showRoutes, mapReady])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Filter Controls */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Button variant="secondary" size="icon" onClick={() => setShowFilters(!showFilters)} className="shadow-lg">
          <Layers className="w-4 h-4" />
        </Button>

        {showFilters && (
          <Card className="absolute top-12 right-0 p-4 w-52 shadow-lg">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showDepots} onCheckedChange={(checked) => setShowDepots(checked as boolean)} />
                <Warehouse className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Depolar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showCustomers} onCheckedChange={(checked) => setShowCustomers(checked as boolean)} />
                <Users className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Musteriler</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showRoutes} onCheckedChange={(checked) => setShowRoutes(checked as boolean)} />
                <Route className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Rotalar</span>
              </label>
            </div>
          </Card>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-[1000]">
        <Card className="p-2 bg-white/90 backdrop-blur text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-8 h-1 bg-emerald-500 rounded"></div>
              <span>Gercek Yol</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-8 h-1 bg-emerald-500 rounded"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #10B981 0px, #10B981 5px, transparent 5px, transparent 10px)",
                }}
              ></div>
              <span>Tahmini Yol</span>
            </div>
          </div>
        </Card>
      </div>

      {(loading || !mapReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}
