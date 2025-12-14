"use client"

import { useEffect, useState, useRef } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { mockDepots, mockCustomers } from "@/lib/mock-data"
import { DEPOT_COLORS, MAP_CENTER, TILE_PROVIDERS } from "@/lib/constants"
import type { Depot, Customer } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ZoomIn, ZoomOut, Maximize2, Filter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

let L: typeof import("leaflet") | null = null

export function DashboardMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [depots, setDepots] = useState<Depot[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDepots, setSelectedDepots] = useState<string[]>([])
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured()) {
        setDepots(mockDepots)
        setCustomers(mockCustomers)
        setSelectedDepots(mockDepots.map((d) => d.id))
        setLoading(false)
        return
      }

      const supabase = createClient()
      if (!supabase) {
        setDepots(mockDepots)
        setCustomers(mockCustomers)
        setSelectedDepots(mockDepots.map((d) => d.id))
        setLoading(false)
        return
      }

      try {
        const [depotsRes, customersRes] = await Promise.all([
          supabase.from("depots").select("*").eq("status", "active"),
          supabase.from("customers").select("*"),
        ])

        if (depotsRes.data) {
          setDepots(depotsRes.data)
          setSelectedDepots(depotsRes.data.map((d) => d.id))
        }
        if (customersRes.data) setCustomers(customersRes.data)
      } catch (error) {
        setDepots(mockDepots)
        setCustomers(mockCustomers)
        setSelectedDepots(mockDepots.map((d) => d.id))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (!mapRef.current || loading) return

    async function initMap() {
      if (typeof window === "undefined") return

      const leaflet = await import("leaflet")
      L = leaflet.default || leaflet

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
      }

      const map = L.map(mapRef.current!, {
        center: [MAP_CENTER.lat, MAP_CENTER.lng],
        zoom: MAP_CENTER.zoom,
        zoomControl: false,
      })

      const tileProvider = TILE_PROVIDERS.cartoDB || TILE_PROVIDERS.osm
      L.tileLayer(tileProvider.url, {
        attribution: tileProvider.attribution,
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [loading])

  useEffect(() => {
    if (!mapReady || !L || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    map.eachLayer((layer: any) => {
      if (layer instanceof L!.Marker || layer instanceof L!.CircleMarker) {
        map.removeLayer(layer)
      }
    })

    const createDepotIcon = (city: string) => {
      const color = DEPOT_COLORS[city]?.primary || "#22c55e"
      return L!.divIcon({
        className: "custom-depot-icon",
        html: `
          <div style="
            background: ${color};
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
    }

    depots
      .filter((d) => selectedDepots.includes(d.id))
      .forEach((depot) => {
        const marker = L!.marker([depot.lat, depot.lng], { icon: createDepotIcon(depot.city) }).addTo(map)

        marker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: ${DEPOT_COLORS[depot.city]?.primary || "#22c55e"}">${depot.name}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${depot.address}</div>
          <div style="display: flex; gap: 12px; font-size: 11px;">
            <span><strong>Kapasite:</strong> ${depot.capacity_pallets || depot.capacity}</span>
          </div>
        </div>
      `)
      })

    const filteredCustomers = customers.filter((c) => selectedDepots.includes(c.assigned_depot_id || ""))

    filteredCustomers.forEach((customer) => {
      const depot = depots.find((d) => d.id === customer.assigned_depot_id)
      const color = depot ? DEPOT_COLORS[depot.city]?.secondary || "#86efac" : "#86efac"

      const marker = L!
        .circleMarker([customer.lat, customer.lng], {
          radius: 7,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        })
        .addTo(map)

      marker.bindPopup(`
        <div style="min-width: 160px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">${customer.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${customer.address}</div>
          <div style="display: flex; gap: 8px; font-size: 10px;">
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${customer.demand_pallet || customer.demand_pallets} palet</span>
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">P${customer.priority}</span>
          </div>
        </div>
      `)
    })
  }, [mapReady, depots, customers, selectedDepots])

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn()
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut()
  const handleFitBounds = () => {
    if (depots.length > 0 && L) {
      const bounds = L.latLngBounds(depots.map((d) => [d.lat, d.lng] as [number, number]))
      mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] })
    }
  }

  const toggleDepot = (depotId: string) => {
    setSelectedDepots((prev) => (prev.includes(depotId) ? prev.filter((id) => id !== depotId) : [...prev, depotId]))
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Map Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-[1000]">
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleFitBounds}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Depot Filter */}
      <div className="absolute top-3 left-3 z-[1000]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="h-8 shadow-md gap-2">
              <Filter className="h-3.5 w-3.5" />
              Depolar
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
                {selectedDepots.length}/{depots.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {depots.map((depot) => (
              <DropdownMenuCheckboxItem
                key={depot.id}
                checked={selectedDepots.includes(depot.id)}
                onCheckedChange={() => toggleDepot(depot.id)}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEPOT_COLORS[depot.city]?.primary || "#22c55e" }}
                  />
                  {depot.city}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary border-2 border-white shadow" />
            <span className="text-muted-foreground">Depo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
            <span className="text-muted-foreground">Müşteri</span>
          </div>
        </div>
      </div>
    </div>
  )
}
