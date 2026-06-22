import { Suspense } from "react"
import FeedbackView from "@/components/feedback/FeedbackView"
import { PageSpinner } from "@/components/shared/Spinner"

export default function FeedbackPage() {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <Suspense fallback={<PageSpinner />}>
        <FeedbackView />
      </Suspense>
    </div>
  )
}
