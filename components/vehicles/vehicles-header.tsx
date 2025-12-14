"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Truck } from "lucide-react"
import { VehicleFormDialog } from "./vehicle-form-dialog"

export function VehiclesHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <Truck className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Araç Filosu</h1>
          <p className="text-sm text-muted-foreground">Kamyon ve TIR filosunu yönetin</p>
        </div>
      </div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Yeni Araç
      </Button>
      <VehicleFormDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
