import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DRDashboard from "@/components/dr/DRDashboard"

export default async function DRPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "DR") redirect("/dashboard")
  return (
    <div className="max-w-6xl mx-auto w-full">
      <DRDashboard />
    </div>
  )
}
