"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDepotStore } from "@/lib/depot-store"
import { useRouter } from "next/navigation"
import { Building2, MapPin, Package, Loader2 } from "lucide-react"
import { useDepots } from "@/lib/hooks/use-depot-data"

export default function SelectDepotPage() {
  const router = useRouter()
  const setSelectedDepot = useDepotStore((state) => state.setSelectedDepot)
  const { data: depots, isLoading } = useDepots()

  const handleDepotSelect = (depotId: string) => {
    setSelectedDepot(depotId)
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
          {depots?.map((depot) => (
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
                  {depot.address && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{depot.address}</p>
                  )}
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
