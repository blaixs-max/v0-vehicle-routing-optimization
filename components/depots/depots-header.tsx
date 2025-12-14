"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Warehouse } from "lucide-react"
import { DepotFormDialog } from "./depot-form-dialog"

export function DepotsHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Warehouse className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Depolar</h1>
          <p className="text-sm text-muted-foreground">Depo lokasyonlarını yönetin</p>
        </div>
      </div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Yeni Depo
      </Button>
      <DepotFormDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
