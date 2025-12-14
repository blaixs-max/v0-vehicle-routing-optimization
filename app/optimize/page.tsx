import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { OptimizationPanel } from "@/components/optimize/optimization-panel"
import { Skeleton } from "@/components/ui/skeleton"

export default function OptimizePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <OptimizationPanel />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
