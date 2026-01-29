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
      onRehydrateStorage: () => (state) => {
        // Force fix: If depot-3 is loaded from storage, change it to depot-2
        if (state?.selectedDepotId === "depot-3") {
          console.log("[v0] Force fixing depot-3 -> depot-2 on rehydrate")
          state.selectedDepotId = "depot-2"
        }
      },
    }
  )
)
