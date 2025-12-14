import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { VehiclesTable } from "@/components/vehicles/vehicles-table"
import { VehiclesHeader } from "@/components/vehicles/vehicles-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function VehiclesPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <VehiclesHeader />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <VehiclesTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
