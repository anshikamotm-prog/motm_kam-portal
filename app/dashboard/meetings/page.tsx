import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import MeetingsView from "@/components/meetings/MeetingsView"
import { PageSpinner } from "@/components/shared/Spinner"

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "SE") redirect("/dashboard/se")
  if (session.user.role === "DR") redirect("/dashboard/dr")
  return (
    <div className="max-w-5xl mx-auto w-full">
      <Suspense fallback={<PageSpinner />}>
        <MeetingsView />
      </Suspense>
    </div>
  )
}
