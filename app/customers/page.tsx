import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CustomersTable } from "@/components/customers/customers-table"
import { CustomersHeader } from "@/components/customers/customers-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <CustomersHeader />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <CustomersTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
