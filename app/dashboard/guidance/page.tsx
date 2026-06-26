import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import GuidanceView from "@/components/guidance/GuidanceView"

export default async function GuidancePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "SE") redirect("/dashboard/se")
  if (session.user.role === "DR") redirect("/dashboard/dr")
  return (
    <div className="max-w-3xl mx-auto w-full">
      <GuidanceView />
    </div>
  )
}
