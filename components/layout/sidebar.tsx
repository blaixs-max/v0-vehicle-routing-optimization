"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Route } from "lucide-react"
import { cn } from "@/lib/utils"

const Sidebar = () => {
  const pathname = usePathname()

  return (
    <div>
      {/* ... existing code here ... */}

      <Link
        href="/siparisler"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
          pathname === "/siparisler"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Package className="h-4 w-4" />
        Siparişler
      </Link>

      <Link
        href="/rotalar"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
          pathname === "/rotalar"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Route className="h-4 w-4" />
        Rotalar
      </Link>

      {/* ... existing code here ... */}
    </div>
  )
}

export default Sidebar
