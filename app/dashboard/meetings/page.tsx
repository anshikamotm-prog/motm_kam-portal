import { Suspense } from "react"
import MeetingsView from "@/components/meetings/MeetingsView"
import { PageSpinner } from "@/components/shared/Spinner"

export default function MeetingsPage() {
  return (
    <div className="max-w-5xl mx-auto w-full">
      <Suspense fallback={<PageSpinner />}>
        <MeetingsView />
      </Suspense>
    </div>
  )
}
