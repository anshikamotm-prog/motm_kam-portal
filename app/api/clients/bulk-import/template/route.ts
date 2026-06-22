import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { STATUS_OPTIONS } from "@/constants"
import { getKAMNames } from "@/lib/getKAMNames"

const HEADERS = [
  "Client ID", "Company", "Industry", "City", "Start Date",
  "Status", "KAM", "SE", "Contact Person", "Phone",
  "Contract Value", "Monthly Value", "Services",
]

const EXAMPLE = [
  "CL001", "Acme Industries Ltd", "Manufacturing", "Mumbai", "2026-06-21",
  "New", "Amol", "Rohit Sharma", "Priya Nair", "+91-98765-43210",
  "500000", "45000", "Metal Cutting | Welding",
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const kamNames = await getKAMNames()
  const lines = [
    `# MOTM KAM Portal — Bulk Client Import Template`,
    `# Required columns: Client ID, Company, KAM`,
    `# Status options: ${[...STATUS_OPTIONS].join(" | ")}`,
    `# KAM options: ${kamNames.join(" | ")}`,
    `# Date format: YYYY-MM-DD  |  Remove all # lines before uploading`,
    HEADERS.join(","),
    EXAMPLE.join(","),
  ]

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="motm-client-import-template.csv"',
    },
  })
}
