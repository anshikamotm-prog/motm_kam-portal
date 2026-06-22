import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        green: "bg-[#bbf7d0] text-[#14532d]",
        orange: "bg-[#fed7aa] text-[#7c2d12]",
        red: "bg-[#fca5a5] text-[#7f1d1d]",
        yellow: "bg-[#fef9c3] text-[#713f12]",
        blue: "bg-[#dbeafe] text-[#1e3a8a]",
        purple: "bg-[#ede9fe] text-[#4c1d95]",
        gray: "bg-[#f3f4f6] text-[#374151]",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
