"use client"

import { useEffect, useRef, useState } from "react"
import type { Depot, Customer } from "@/lib/types"
import type { OptimizedRoute } from "@/lib/vroom/client"

const DEPOT_COLORS: Record<string, { marker: string; secondary: string }> = {
  Istanbul: { marker: "#1E40AF", secondary: "#3B82F6" },
  Ankara: { marker: "#DC2626", secondary: "#EF4444" },
  Izmir: { marker: "#059669", secondary: "#10B981" },
}

const ROUTE_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
]

interface LeafletMapProps {
  depots?: Depot[]
  customers?: Customer[]
  routes?: OptimizedRoute[]
  selectedRouteId?: string
  onRouteSelect?: (route: OptimizedRoute | null) => void
  onCustomerSelect?: (customer: Customer | null) => void
  onDepotSelect?: (depot: Depot | null) => void
  showDepots?: boolean
  showCustomers?: boolean
  showRoutes?: boolean
  height?: string
  className?: string
}

export function LeafletMap({
  depots = [],
  customers = [],
  routes = [],
  selectedRouteId,
  onRouteSelect,
  onCustomerSelect,
  onDepotSelect,
  showDepots = true,
  showCustomers = true,
  showRoutes = true,
  height = "100%",
  className = "",
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<{ depots: any; customers: any; routes: any } | null>(null)
  const [mapReady, setMapReady] = useState(false)

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

    mapInstanceRef.current = L.map(mapRef.current, {
      center: [39.9334, 32.8597],
      zoom: 6,
      zoomControl: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(mapInstanceRef.current)

    layersRef.current = {
      depots: L.layerGroup().addTo(mapInstanceRef.current),
      customers: L.layerGroup().addTo(mapInstanceRef.current),
      routes: L.layerGroup().addTo(mapInstanceRef.current),
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        layersRef.current = null
      }
    }
  }, [mapReady])

  // Depolari guncelle
  useEffect(() => {
    if (!mapReady || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    const layer = layersRef.current.depots
    layer.clearLayers()
    if (!showDepots) return

    depots.forEach((depot) => {
      const color = DEPOT_COLORS[depot.city]?.marker || "#1E40AF"
      const icon = L.divIcon({
        className: "custom-depot-icon",
        html: `
          <div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/></svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker([depot.lat, depot.lng], { icon })
        .bindPopup(`
          <div style="min-width:180px;">
            <h3 style="font-weight:bold;margin:0 0 8px;">${depot.name}</h3>
            <p style="color:#666;margin:0 0 4px;font-size:12px;">${depot.address || depot.city}</p>
            <p style="margin:0;font-size:12px;"><strong>Kapasite:</strong> ${depot.capacity_pallets || depot.capacity} palet</p>
          </div>
        `)
        .addTo(layer)

      if (onDepotSelect) {
        marker.on("click", () => onDepotSelect(depot))
      }
    })
  }, [depots, showDepots, onDepotSelect, mapReady])

  // Musterileri guncelle
  useEffect(() => {
    if (!mapReady || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    const layer = layersRef.current.customers
    layer.clearLayers()
    if (!showCustomers) return

    customers.forEach((customer) => {
      const depot = depots.find((d) => d.id === customer.assigned_depot_id)
      const color = depot ? DEPOT_COLORS[depot.city]?.secondary || "#F97316" : "#F97316"

      const marker = L.circleMarker([customer.lat, customer.lng], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(`
          <div style="min-width:160px;">
            <h4 style="font-weight:bold;margin:0 0 4px;">${customer.name}</h4>
            <p style="color:#666;margin:0 0 4px;font-size:11px;">${customer.address}</p>
            <p style="margin:0;font-size:11px;"><strong>Talep:</strong> ${customer.demand_pallets || customer.demand_pallet} palet</p>
            <p style="margin:0;font-size:11px;"><strong>Oncelik:</strong> ${customer.priority}/5</p>
          </div>
        `)
        .addTo(layer)

      if (onCustomerSelect) {
        marker.on("click", () => onCustomerSelect(customer))
      }
    })
  }, [customers, depots, showCustomers, onCustomerSelect, mapReady])

  // Rotalari guncelle
  useEffect(() => {
    if (!mapReady || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    const layer = layersRef.current.routes
    layer.clearLayers()
    if (!showRoutes || routes.length === 0) return

    routes.forEach((route, index) => {
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
      const isSelected = selectedRouteId === route.vehicleId
      const opacity = selectedRouteId ? (isSelected ? 1 : 0.3) : 0.7
      const weight = isSelected ? 5 : 3

      const depot = depots.find((d) => d.id === route.depotId)
      if (!depot) return

      const coords: [number, number][] = [[depot.lat, depot.lng]]
      route.stops.forEach((stop) => coords.push([stop.lat, stop.lng]))
      coords.push([depot.lat, depot.lng])

      const polyline = L.polyline(coords, {
        color,
        weight,
        opacity,
        dashArray: isSelected ? undefined : "5, 10",
      }).addTo(layer)

      if (onRouteSelect) {
        polyline.on("click", () => onRouteSelect(route))
      }

      route.stops.forEach((stop) => {
        const icon = L.divIcon({
          className: "custom-stop-icon",
          html: `
            <div style="background:${color};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);font-size:11px;font-weight:bold;color:white;opacity:${opacity};">
              ${stop.stopOrder}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        L.marker([stop.lat, stop.lng], { icon })
          .bindPopup(`
            <div style="min-width:160px;">
              <h4 style="font-weight:bold;margin:0 0 4px;">${stop.customerName}</h4>
              <p style="color:#666;margin:0 0 4px;font-size:11px;">${stop.address}</p>
              <p style="margin:0;font-size:11px;"><strong>Durak:</strong> #${stop.stopOrder}</p>
              <p style="margin:0;font-size:11px;"><strong>Talep:</strong> ${stop.demand} palet</p>
            </div>
          `)
          .addTo(layer)
      })
    })

    const allCoords: [number, number][] = []
    depots.forEach((d) => allCoords.push([d.lat, d.lng]))
    routes.forEach((r) => r.stops.forEach((s) => allCoords.push([s.lat, s.lng])))

    if (allCoords.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(allCoords, { padding: [50, 50] })
    }
  }, [routes, depots, selectedRouteId, showRoutes, onRouteSelect, mapReady])

  return (
    <div className={`relative ${className}`} style={{ height, width: "100%", minHeight: "400px" }}>
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}
