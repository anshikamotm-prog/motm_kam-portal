import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import TargetsView from "@/components/targets/TargetsView"

export default async function TargetsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "SE") redirect("/dashboard/se")
  if (session.user.role === "DR") redirect("/dashboard/dr")
  return (
    <div className="max-w-5xl mx-auto w-full">
      <TargetsView />
    </div>
  )
}
