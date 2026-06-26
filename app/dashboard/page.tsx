import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import MyClientsView from "@/components/clients/MyClientsView"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "SE") redirect("/dashboard/se")
  if (session.user.role === "DR") redirect("/dashboard/dr")
  return <MyClientsView />
}
