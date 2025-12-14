"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Database,
  Truck,
  Bell,
  Palette,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { OSRM_CONFIG, VROOM_CONFIG, DEFAULTS, VEHICLE_TYPES } from "@/lib/constants"

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // General settings state
  const [settings, setSettings] = useState({
    companyName: "RouteOpt",
    language: "tr",
    timezone: "Europe/Istanbul",
    currency: "TRY",
    distanceUnit: "km",
    fuelPrice: DEFAULTS.fuelPricePerLiter,
    maxRouteDistance: DEFAULTS.maxRouteDistance,
    maxRouteDuration: DEFAULTS.maxRouteDuration,
    serviceTimePerStop: DEFAULTS.serviceTimePerStop,
    capacityUtilization: DEFAULTS.vehicleCapacityUtilization * 100,
  })

  // Integration settings
  const [integrations, setIntegrations] = useState({
    osrmUrl: OSRM_CONFIG.baseUrl,
    vroomUrl: VROOM_CONFIG.baseUrl,
    supabaseConnected: false,
    n8nWebhookUrl: "",
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    routeOptimizationComplete: true,
    vehicleAlerts: true,
    dailyReports: false,
  })

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
            <p className="text-sm text-slate-500 mt-1">Sistem yapilandirmasi ve tercihler</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
                Kaydet
              </>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              Genel
            </TabsTrigger>
            <TabsTrigger value="optimization" className="gap-2">
              <Truck className="h-4 w-4" />
              Optimizasyon
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Database className="h-4 w-4" />
              Entegrasyonlar
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Bildirimler
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Gorunum
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sirket Bilgileri</CardTitle>
                <CardDescription>Temel sirket ve bolgesel ayarlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Sirket Adi</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Dil</Label>
                    <Select value={settings.language} onValueChange={(v) => setSettings({ ...settings, language: v })}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tr">Turkce</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Saat Dilimi</Label>
                    <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Istanbul">Istanbul (UTC+3)</SelectItem>
                        <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                        <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Para Birimi</Label>
                    <Select value={settings.currency} onValueChange={(v) => setSettings({ ...settings, currency: v })}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">Turk Lirasi (TL)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Birim Ayarlari</CardTitle>
                <CardDescription>Mesafe ve yakit birimleri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distanceUnit">Mesafe Birimi</Label>
                    <Select
                      value={settings.distanceUnit}
                      onValueChange={(v) => setSettings({ ...settings, distanceUnit: v })}
                    >
                      <SelectTrigger id="distanceUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="km">Kilometre (km)</SelectItem>
                        <SelectItem value="mi">Mil (mi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuelPrice">Yakit Fiyati (TL/L)</Label>
                    <Input
                      id="fuelPrice"
                      type="number"
                      value={settings.fuelPrice}
                      onChange={(e) => setSettings({ ...settings, fuelPrice: Number.parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Settings */}
          <TabsContent value="optimization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rota Kisitlamalari</CardTitle>
                <CardDescription>Optimizasyon parametreleri ve limitler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxDistance">Maksimum Rota Mesafesi (km)</Label>
                    <Input
                      id="maxDistance"
                      type="number"
                      value={settings.maxRouteDistance}
                      onChange={(e) => setSettings({ ...settings, maxRouteDistance: Number.parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-slate-500">Bir aracin gunluk maksimum gidebilecegi mesafe</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDuration">Maksimum Rota Suresi (dakika)</Label>
                    <Input
                      id="maxDuration"
                      type="number"
                      value={settings.maxRouteDuration}
                      onChange={(e) => setSettings({ ...settings, maxRouteDuration: Number.parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-slate-500">Bir aracin gunluk maksimum calisma suresi</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceTime">Durak Basi Hizmet Suresi (dakika)</Label>
                    <Input
                      id="serviceTime"
                      type="number"
                      value={settings.serviceTimePerStop}
                      onChange={(e) =>
                        setSettings({ ...settings, serviceTimePerStop: Number.parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-slate-500">Her teslimat noktasinda gecirilen ortalama sure</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacityUtil">Kapasite Kullanimi (%)</Label>
                    <Input
                      id="capacityUtil"
                      type="number"
                      min="50"
                      max="100"
                      value={settings.capacityUtilization}
                      onChange={(e) =>
                        setSettings({ ...settings, capacityUtilization: Number.parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-slate-500">Arac kapasitesinin kac %'inin kullanilacagi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Arac Tipleri</CardTitle>
                <CardDescription>Varsayilan arac kapasiteleri ve tuketim degerleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(VEHICLE_TYPES).map(([type, config]) => (
                    <div key={type} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">{config.name}</h4>
                        <Truck className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Palet Kapasitesi</span>
                          <span className="font-medium">{config.capacity_pallets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Agirlik Kapasitesi</span>
                          <span className="font-medium">{(config.capacity_kg / 1000).toFixed(1)} ton</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Yakit Tuketimi</span>
                          <span className="font-medium">{config.fuel_consumption} L/100km</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Settings */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Veritabani</CardTitle>
                <CardDescription>Supabase baglanti durumu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-8 w-8 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">Supabase</p>
                      <p className="text-sm text-slate-500">PostgreSQL veritabani</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integrations.supabaseConnected ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Bagli
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Demo Modu
                      </Badge>
                    )}
                    <Button variant="outline" size="sm">
                      Yapilandir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Routing Servisleri</CardTitle>
                <CardDescription>OSRM ve VROOM API yapilandirmasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="osrmUrl">OSRM URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="osrmUrl"
                      value={integrations.osrmUrl}
                      onChange={(e) => setIntegrations({ ...integrations, osrmUrl: e.target.value })}
                      placeholder="https://router.project-osrm.org"
                    />
                    <Button variant="outline" size="icon" asChild>
                      <a href={integrations.osrmUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Mesafe ve sure hesaplamasi icin OSRM servisi</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="vroomUrl">VROOM URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="vroomUrl"
                      value={integrations.vroomUrl}
                      onChange={(e) => setIntegrations({ ...integrations, vroomUrl: e.target.value })}
                      placeholder="https://vroom.project-osrm.org"
                    />
                    <Button variant="outline" size="icon" asChild>
                      <a href={integrations.vroomUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">VRP optimizasyonu icin VROOM servisi</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>N8N Entegrasyonu</CardTitle>
                <CardDescription>Otomasyon ve AI workflow baglantisi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="n8nWebhook">N8N Webhook URL</Label>
                  <Input
                    id="n8nWebhook"
                    value={integrations.n8nWebhookUrl}
                    onChange={(e) => setIntegrations({ ...integrations, n8nWebhookUrl: e.target.value })}
                    placeholder="https://your-n8n-instance.com/webhook/..."
                  />
                  <p className="text-xs text-slate-500">
                    AI destekli optimizasyon ve bildirimler icin N8N webhook adresi
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bildirim Tercihleri</CardTitle>
                <CardDescription>E-posta ve sistem bildirimleri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>E-posta Bildirimleri</Label>
                    <p className="text-sm text-slate-500">Onemli olaylar icin e-posta al</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(v) => setNotifications({ ...notifications, emailNotifications: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Optimizasyon Tamamlandi</Label>
                    <p className="text-sm text-slate-500">Rota optimizasyonu bittiginde bildirim al</p>
                  </div>
                  <Switch
                    checked={notifications.routeOptimizationComplete}
                    onCheckedChange={(v) => setNotifications({ ...notifications, routeOptimizationComplete: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Arac Uyarilari</Label>
                    <p className="text-sm text-slate-500">Arac bakim ve ariza uyarilari</p>
                  </div>
                  <Switch
                    checked={notifications.vehicleAlerts}
                    onCheckedChange={(v) => setNotifications({ ...notifications, vehicleAlerts: v })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Gunluk Raporlar</Label>
                    <p className="text-sm text-slate-500">Her gun ozet rapor e-postasi al</p>
                  </div>
                  <Switch
                    checked={notifications.dailyReports}
                    onCheckedChange={(v) => setNotifications({ ...notifications, dailyReports: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Harita Ayarlari</CardTitle>
                <CardDescription>Harita gorunumu ve tile provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Harita Stili</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative cursor-pointer border-2 border-emerald-500 rounded-lg overflow-hidden">
                      <img src="/light-map-style-carto.jpg" alt="Light theme" className="w-full h-24 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-white/90 px-3 py-1.5">
                        <p className="text-sm font-medium">Acik Tema</p>
                      </div>
                      <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="relative cursor-pointer border-2 border-slate-200 rounded-lg overflow-hidden hover:border-slate-300">
                      <img src="/dark-map.png" alt="Dark theme" className="w-full h-24 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-white/90 px-3 py-1.5">
                        <p className="text-sm font-medium">Koyu Tema</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Depo Renkleri</CardTitle>
                <CardDescription>Haritada depo gosterim renkleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">Istanbul</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Ankara</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Izmir</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
