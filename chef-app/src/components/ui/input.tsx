import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-md border border-[#EDE7DC] bg-white px-3 py-2 text-sm text-[#1A1917] outline-none transition-colors placeholder:text-[#706D6A] focus-visible:border-[#BA7517] focus-visible:ring-2 focus-visible:ring-[#BA7517]/20 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
