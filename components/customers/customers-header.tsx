"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Users, Upload } from "lucide-react"
import { CustomerFormDialog } from "./customer-form-dialog"

export function CustomersHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
          <Users className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-sm text-muted-foreground">Teslimat noktalarını yönetin</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          CSV İçe Aktar
        </Button>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>
      <CustomerFormDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
