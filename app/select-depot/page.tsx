"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDepotStore, DEPOTS } from "@/lib/depot-store"
import { useRouter } from "next/navigation"
import { Building2, MapPin, Package, Users, ShoppingCart } from "lucide-react"
import { useEffect, useState } from "react"

interface DepotStats {
  customers: number
  orders: number
}

export default function SelectDepotPage() {
  const router = useRouter()
  const setSelectedDepot = useDepotStore((state) => state.setSelectedDepot)
  const [depotStats, setDepotStats] = useState<Record<string, DepotStats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDepotStats = async () => {
      try {
        const stats: Record<string, DepotStats> = {}
        
        for (const depot of DEPOTS) {
          const [customersRes, ordersRes] = await Promise.all([
            fetch(`/api/customers?depot_id=${depot.id}`),
            fetch(`/api/orders?depot_id=${depot.id}`)
          ])
          
          const customers = await customersRes.json()
          const orders = await ordersRes.json()
          
          stats[depot.id] = {
            customers: Array.isArray(customers) ? customers.length : 0,
            orders: Array.isArray(orders) ? orders.length : 0
          }
        }
        
        setDepotStats(stats)
      } catch (error) {
        console.error("[v0] Error fetching depot stats:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDepotStats()
  }, [])

  const handleDepotSelect = async (depotId: string) => {
    console.log("[v0] Depo seçildi:", depotId)
    setSelectedDepot(depotId)
    // Give a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log("[v0] Ana sayfaya yönlendiriliyor...")
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Package className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">RouteOpt VRP Solver</h1>
          <p className="text-xl text-muted-foreground">Hangi depodan çalışmak istiyorsunuz?</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {DEPOTS.map((depot) => (
            <Card
              key={depot.id}
              className="relative overflow-hidden border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleDepotSelect(depot.id)}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mx-auto">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">{depot.name}</h3>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{depot.city}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{depot.description}</p>
                  
                  {loading ? (
                    <div className="text-xs text-muted-foreground py-2">Yükleniyor...</div>
                  ) : depotStats[depot.id] ? (
                    <div className="flex items-center justify-center gap-4 text-sm pt-2">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{depotStats[depot.id].customers}</span>
                        <span className="text-muted-foreground">müşteri</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="font-medium">{depotStats[depot.id].orders}</span>
                        <span className="text-muted-foreground">sipariş</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Button className="w-full" size="lg">
                  Bu Depoyu Seç
                </Button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Depo seçiminizi daha sonra Ayarlar bölümünden değiştirebilirsiniz.
        </p>
      </div>
    </div>
  )
}
