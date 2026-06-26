import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SEDashboard from "@/components/se/SEDashboard"

export default async function SEPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "SE") redirect("/dashboard")
  return <SEDashboard />
}
