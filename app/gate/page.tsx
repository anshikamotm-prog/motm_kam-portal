import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import GateClient from "./GateClient"

export const metadata: Metadata = {
  title: "Access",
  description: "",
}

export default async function GatePage() {
  const cookieStore = await cookies()
  const pass = cookieStore.get("__gp")?.value
  if (pass && pass === process.env.GATE_PASS) redirect("/login")
  return <GateClient />
}
