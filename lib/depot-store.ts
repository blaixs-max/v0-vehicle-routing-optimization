import { create } from "zustand"
import { persist } from "zustand/middleware"

interface DepotStore {
  selectedDepotId: string | null
  setSelectedDepot: (depotId: string) => void
  clearSelectedDepot: () => void
}

export const useDepotStore = create<DepotStore>()(
  persist(
    (set) => ({
      selectedDepotId: "depot-2", // Default to Ankara Depo where all customers are
      setSelectedDepot: (depotId) => set({ selectedDepotId: depotId }),
      clearSelectedDepot: () => set({ selectedDepotId: null }),
    }),
    {
      name: "depot-selection-v2", // Changed storage name to force reset
    }
  )
)
