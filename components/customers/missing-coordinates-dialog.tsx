"use client"

import { useState, useEffect, useRef } from "react"
import type { Customer } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  AlertTriangle,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  MousePointer2,
} from "lucide-react"

interface MissingCoordinatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  onSave: (updates: { id: string; lat: number; lng: number }[]) => Promise<void>
}

function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (atMatch) {
      return { lat: Number.parseFloat(atMatch[1]), lng: Number.parseFloat(atMatch[2]) }
    }
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (qMatch) {
      return { lat: Number.parseFloat(qMatch[1]), lng: Number.parseFloat(qMatch[2]) }
    }
    const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
    if (dMatch) {
      return { lat: Number.parseFloat(dMatch[1]), lng: Number.parseFloat(dMatch[2]) }
    }
    return null
  } catch {
    return null
  }
}

export function MissingCoordinatesDialog({ open, onOpenChange, customers, onSave }: MissingCoordinatesDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [coordinates, setCoordinates] = useState<Record<string, { lat: string; lng: string }>>({})
  const [saving, setSaving] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [addressSearch, setAddressSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const currentCustomer = customers[currentIndex]
  const savedCount = Object.keys(coordinates).filter((id) => coordinates[id]?.lat && coordinates[id]?.lng).length

  useEffect(() => {
    if (!open || !currentCustomer) return
    if (!coordinates[currentCustomer.id]) {
      setCoordinates((prev) => ({
        ...prev,
        [currentCustomer.id]: { lat: "", lng: "" },
      }))
    }
    setUrlInput("")
    setMessage(null)
    setAddressSearch("")
    setSearchResults([])
  }, [open, currentCustomer])

  useEffect(() => {
    if (!open || !mapRef.current || typeof window === "undefined") return

    const initMap = async () => {
      const L = (window as any).L
      if (!L) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)

        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.onload = () => setTimeout(initMap, 100)
        document.head.appendChild(script)
        return
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const defaultLat = 41.0082
      const defaultLng = 28.9784

      const currentCoords = coordinates[currentCustomer?.id]
      const lat = currentCoords?.lat ? Number.parseFloat(currentCoords.lat) : defaultLat
      const lng = currentCoords?.lng ? Number.parseFloat(currentCoords.lng) : defaultLng

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 12,
        zoomControl: true,
      })
      mapInstanceRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map)

      const icon = L.divIcon({
        html: `<div style="background: #22c55e; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: "custom-marker",
      })

      const marker = L.marker([lat, lng], {
        draggable: false,
        icon: icon,
      }).addTo(map)
      markerRef.current = marker

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng)
        if (currentCustomer) {
          setCoordinates((prev) => ({
            ...prev,
            [currentCustomer.id]: {
              lat: e.latlng.lat.toFixed(6),
              lng: e.latlng.lng.toFixed(6),
            },
          }))
          setMessage({ type: "success", text: "Koordinat secildi!" })
        }
      })

      setTimeout(() => map.invalidateSize(), 200)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [open, currentIndex])

  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current || !currentCustomer) return
    const currentCoords = coordinates[currentCustomer.id]
    if (currentCoords?.lat && currentCoords?.lng) {
      const lat = Number.parseFloat(currentCoords.lat)
      const lng = Number.parseFloat(currentCoords.lng)
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        markerRef.current.setLatLng([lat, lng])
        mapInstanceRef.current.setView([lat, lng], 16)
      }
    }
  }, [coordinates, currentCustomer])

  const handleSearchGoogle = () => {
    if (!currentCustomer) return
    const query = encodeURIComponent(`${currentCustomer.address}, ${currentCustomer.district}, ${currentCustomer.city}`)
    window.open(`https://www.google.com/maps/search/${query}`, "_blank")
    setMessage({
      type: "success",
      text: "Google Maps acildi. Konumu bulduktan sonra URL'yi kopyalayip asagiya yapistirin.",
    })
  }

  const handlePasteUrl = async () => {
    let url = urlInput

    if (!url.trim()) {
      try {
        url = await navigator.clipboard.readText()
        setUrlInput(url)
      } catch {
        setMessage({ type: "error", text: "Panodan okuma izni verilmedi. URL'yi manuel yapistirin." })
        return
      }
    }

    const parsed = parseGoogleMapsUrl(url)
    if (parsed && currentCustomer) {
      setCoordinates((prev) => ({
        ...prev,
        [currentCustomer.id]: {
          lat: parsed.lat.toFixed(6),
          lng: parsed.lng.toFixed(6),
        },
      }))
      setUrlInput("")
      setMessage({ type: "success", text: `Koordinatlar alindi: ${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}` })
    } else {
      setMessage({
        type: "error",
        text: "URL'den koordinat cikarilmadi. Haritada sag tiklayip 'Bu koordinatlar' secin.",
      })
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const updates = Object.entries(coordinates)
      .filter(([_, coords]) => coords.lat && coords.lng && Number.parseFloat(coords.lat) !== 0)
      .map(([id, coords]) => ({
        id,
        lat: Number.parseFloat(coords.lat),
        lng: Number.parseFloat(coords.lng),
      }))

    await onSave(updates)
    setSaving(false)
    onOpenChange(false)
  }

  const goToNext = () => {
    if (currentIndex < customers.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setMessage(null)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setMessage(null)
    }
  }

  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) {
      setMessage({ type: "error", text: "Lutfen bir adres girin" })
      return
    }

    setSearching(true)
    setSearchResults([])
    setMessage(null)

    try {
      const query = addressSearch.trim()
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=tr`,
        {
          headers: {
            "User-Agent": "RouteOpt-VRP-App",
          },
        },
      )

      if (!response.ok) {
        throw new Error("Arama basarisiz")
      }

      const data = await response.json()

      if (data.length === 0) {
        setMessage({ type: "error", text: "Adres bulunamadi. Farkli bir arama deneyin." })
      } else {
        setSearchResults(data)
        setMessage({ type: "success", text: `${data.length} sonuc bulundu. Dogru adresi secin.` })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Arama sirasinda hata olustu. Tekrar deneyin." })
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSearchResult = (result: any) => {
    if (!currentCustomer) return

    const lat = Number.parseFloat(result.lat)
    const lng = Number.parseFloat(result.lon)

    setCoordinates((prev) => ({
      ...prev,
      [currentCustomer.id]: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      },
    }))

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng])
      mapInstanceRef.current.setView([lat, lng], 16)
    }

    setSearchResults([])
    setAddressSearch("")
    setMessage({ type: "success", text: `Konum secildi: ${result.display_name}` })
  }

  if (!currentCustomer) return null

  const currentCoords = coordinates[currentCustomer.id] || { lat: "", lng: "" }
  const isCurrentSaved = currentCoords.lat && currentCoords.lng && Number.parseFloat(currentCoords.lat) !== 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">Eksik Koordinat Bilgileri</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {savedCount} / {customers.length} tamamlandi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrev} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                {currentIndex + 1} / {customers.length}
              </Badge>
              <Button variant="outline" size="sm" onClick={goToNext} disabled={currentIndex === customers.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r flex-shrink-0 overflow-y-auto max-h-[40vh] lg:max-h-none">
            <div className="p-4 space-y-4">
              <div
                className={`p-4 rounded-xl border-2 transition-colors ${isCurrentSaved ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge
                    variant={isCurrentSaved ? "default" : "secondary"}
                    className={isCurrentSaved ? "bg-green-500" : ""}
                  >
                    {isCurrentSaved ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Hazir
                      </>
                    ) : (
                      "Bekleniyor"
                    )}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg mb-1">{currentCustomer.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentCustomer.address}
                  {currentCustomer.district && `, ${currentCustomer.district}`}
                  {currentCustomer.city && `, ${currentCustomer.city}`}
                </p>

                {isCurrentSaved && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <p className="text-xs font-mono text-green-700 dark:text-green-400">
                      {currentCoords.lat}, {currentCoords.lng}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <MousePointer2 className="h-4 w-4 text-primary" />
                  Koordinat Nasil Girilir?
                </h4>

                <div className="space-y-2">
                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Adres Ara</p>
                      <p className="text-xs text-muted-foreground mb-2">En kolay yontem - adres yazin, sonuc secin</p>
                      <div className="space-y-2">
                        <Input
                          placeholder="Ornek: Taksim, Istanbul"
                          value={addressSearch}
                          onChange={(e) => setAddressSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
                          className="h-9 text-sm"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={handleAddressSearch}
                          disabled={searching || !addressSearch.trim()}
                        >
                          <Search className="h-3 w-3 mr-2" />
                          {searching ? "Araniyor..." : "Ara"}
                        </Button>

                        {searchResults.length > 0 && (
                          <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                            {searchResults.map((result, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSelectSearchResult(result)}
                                className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-xs transition-colors"
                              >
                                <div className="font-medium truncate">{result.display_name}</div>
                                <div className="text-muted-foreground text-[10px]">
                                  {result.lat}, {result.lon}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">veya</div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium">Haritada Tiklayin</p>
                      <p className="text-xs text-muted-foreground">
                        Sag taraftaki haritada konuma tek tiklayin - yesil marker oraya konumlanir
                      </p>
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">veya</div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Google Maps URL</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Google Maps'te konum bulun, URL'yi kopyalayin
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={handleSearchGoogle}
                      >
                        <Search className="h-3 w-3 mr-2" />
                        Google Maps'te Ara
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Google Maps URL'sini Yapistir:</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://google.com/maps/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasteUrl()}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button size="sm" variant="secondary" className="h-9 px-3" onClick={handlePasteUrl}>
                    <Copy className="h-3 w-3 mr-1" />
                    Yapistir
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Tum Musteriler</h4>
                <div className="space-y-1">
                  {customers.map((c, idx) => {
                    const coords = coordinates[c.id]
                    const isSaved = coords?.lat && coords?.lng && Number.parseFloat(coords.lat) !== 0
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCurrentIndex(idx)
                          setMessage(null)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                          idx === currentIndex ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isSaved ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0 ml-2" />
                        ) : (
                          <MapPin className="h-4 w-4 opacity-40 shrink-0 ml-2" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[250px]">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                Konumu Tek Tikla Secin
              </span>
              <span className="text-xs text-muted-foreground">Haritaya tiklayin</span>
            </div>
            <div ref={mapRef} className="flex-1 min-h-[200px]" />
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between flex-shrink-0">
          <div className="text-sm">
            {savedCount < customers.length ? (
              <span className="text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {customers.length - savedCount} musteri icin koordinat gerekli
              </span>
            ) : (
              <span className="text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Tum koordinatlar girildi!
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Iptal
            </Button>
            <Button onClick={handleSaveAll} disabled={saving || savedCount === 0}>
              {saving ? "Kaydediliyor..." : `${savedCount} Koordinat Kaydet`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
