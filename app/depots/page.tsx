import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DepotsTable } from "@/components/depots/depots-table"
import { DepotsHeader } from "@/components/depots/depots-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function DepotsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <DepotsHeader />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <DepotsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
