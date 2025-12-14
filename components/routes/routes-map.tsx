"use client"

import { useEffect, useRef, useState } from "react"
import type { Route, Depot } from "@/lib/types"

// Rota renkleri
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

interface RoutesMapProps {
  routes: Route[]
  depots: Depot[]
  selectedRoute: Route | null
  onRouteSelect: (route: Route | null) => void
}

export function RoutesMap({ routes, depots, selectedRoute, onRouteSelect }: RoutesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Leaflet CSS ekle
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    // Leaflet JS ekle
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstanceRef.current)

    layersRef.current = L.layerGroup().addTo(mapInstanceRef.current)

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [mapReady])

  // Markerlari ve rotalari guncelle
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    layersRef.current.clearLayers()

    // Depo markerlari
    depots.forEach((depot) => {
      const depotIcon = L.divIcon({
        className: "custom-depot-icon",
        html: `
          <div style="
            background: #1E40AF;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([depot.lat, depot.lng], { icon: depotIcon })
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${depot.name}</strong><br/>
            <span style="color: #666;">${depot.city}</span><br/>
            <small>Kapasite: ${depot.capacity} palet</small>
          </div>
        `)
        .addTo(layersRef.current)
    })

    // Rota cizimi
    routes.forEach((route, index) => {
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
      const isSelected = selectedRoute?.id === route.id
      const opacity = selectedRoute ? (isSelected ? 1 : 0.3) : 0.7
      const weight = isSelected ? 5 : 3

      if (!route.stops || route.stops.length === 0) return

      const coordinates: [number, number][] = []

      if (route.depot) {
        coordinates.push([route.depot.lat, route.depot.lng])
      }

      const sortedStops = [...route.stops].sort((a, b) => a.stop_order - b.stop_order)
      sortedStops.forEach((stop) => {
        if (stop.customer) {
          coordinates.push([stop.customer.lat, stop.customer.lng])
        }
      })

      if (route.depot) {
        coordinates.push([route.depot.lat, route.depot.lng])
      }

      const polyline = L.polyline(coordinates, {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: isSelected ? undefined : "5, 10",
      })

      polyline.on("click", () => onRouteSelect(route))
      polyline.addTo(layersRef.current)

      sortedStops.forEach((stop, stopIndex) => {
        if (!stop.customer) return

        const customerIcon = L.divIcon({
          className: "custom-customer-icon",
          html: `
            <div style="
              background: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              font-size: 11px;
              font-weight: bold;
              color: white;
              opacity: ${opacity};
            ">
              ${stopIndex + 1}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        L.marker([stop.customer.lat, stop.customer.lng], { icon: customerIcon })
          .bindPopup(`
            <div style="min-width: 180px;">
              <strong>${stop.customer.name}</strong><br/>
              <span style="color: #666; font-size: 12px;">${stop.customer.address}</span><br/>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;"/>
              <small>
                <strong>Durak:</strong> #${stop.stop_order}<br/>
                <strong>Talep:</strong> ${stop.customer.demand_kg} kg / ${stop.customer.demand_pallet} palet
              </small>
            </div>
          `)
          .on("click", () => onRouteSelect(route))
          .addTo(layersRef.current)
      })
    })

    // Bounds fit
    if (routes.length > 0 && routes.some((r) => r.stops && r.stops.length > 0)) {
      const allCoords: [number, number][] = []
      depots.forEach((d) => allCoords.push([d.lat, d.lng]))
      routes.forEach((r) => {
        r.stops?.forEach((s) => {
          if (s.customer) allCoords.push([s.customer.lat, s.customer.lng])
        })
      })
      if (allCoords.length > 0) {
        mapInstanceRef.current?.fitBounds(allCoords, { padding: [50, 50] })
      }
    }
  }, [routes, depots, selectedRoute, onRouteSelect, mapReady])

  return (
    <div className="relative w-full h-full" style={{ minHeight: "400px" }}>
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}
