import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const check = async () => {
        try {
          const rows = await getSheetValues(SHEET_ID, SHEETS.NOTIFICATION_LOG)
          const all = rows.slice(1)
          const mine =
            session.user.role === "Admin"
              ? all
              : session.user.role === "SE" || session.user.role === "DR"
              ? []
              : all.filter((r) => r[COLS.NOTIFICATION.KAM] === session.user.kamName)
          const unread = mine.filter((r) => r[COLS.NOTIFICATION.ACKNOWLEDGED] !== "Yes").length
          send({ unread })
        } catch {
          send({ unread: 0 })
        }
      }

      await check()

      const interval = setInterval(check, 30_000)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
