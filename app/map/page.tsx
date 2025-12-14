"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FullscreenMap } from "@/components/map/fullscreen-map"
import { supabase } from "@/lib/supabase/client"
import { mockDepots, mockVehicles, mockCustomers } from "@/lib/mock-data"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

export default function MapPage() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!supabase) {
      setDepots(mockDepots as Depot[])
      setVehicles(mockVehicles as Vehicle[])
      setCustomers(mockCustomers as Customer[])
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      const [depotsRes, vehiclesRes, customersRes] = await Promise.all([
        supabase.from("depots").select("*").eq("status", "active"),
        supabase.from("vehicles").select("*").eq("status", "active"),
        supabase.from("customers").select("*").eq("status", "active"),
      ])

      if (depotsRes.data) setDepots(depotsRes.data)
      if (vehiclesRes.data) setVehicles(vehiclesRes.data)
      if (customersRes.data) setCustomers(customersRes.data)
    } catch (error) {
      console.error("Error fetching data:", error)
      setDepots(mockDepots as Depot[])
      setVehicles(mockVehicles as Vehicle[])
      setCustomers(mockCustomers as Customer[])
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Harita Gorunumu</h1>
            <p className="text-sm text-slate-500">
              {isDemo ? "Demo modu - Ornek veriler gosteriliyor" : "Tum depo, arac ve musteri konumlarini goruntuleyin"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              {depots.length} Depo
            </Badge>
            <Badge variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {vehicles.length} Arac
            </Badge>
            <Badge variant="outline" className="gap-2 bg-orange-50 text-orange-700 border-orange-200">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              {customers.length} Musteri
            </Badge>
          </div>
        </div>
        <div className="flex-1">
          <FullscreenMap depots={depots} vehicles={vehicles} customers={customers} loading={loading} />
        </div>
      </div>
    </DashboardLayout>
  )
}
