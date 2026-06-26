import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import FeedbackView from "@/components/feedback/FeedbackView"
import { PageSpinner } from "@/components/shared/Spinner"

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "SE") redirect("/dashboard/se")
  if (session.user.role === "DR") redirect("/dashboard/dr")
  return (
    <div className="max-w-4xl mx-auto w-full">
      <Suspense fallback={<PageSpinner />}>
        <FeedbackView />
      </Suspense>
    </div>
  )
}
