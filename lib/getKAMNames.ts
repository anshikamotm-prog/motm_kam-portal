import { getSheetValues } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"

export async function getKAMNames(): Promise<string[]> {
  const rows = await getSheetValues(SHEET_ID, SHEETS.USERS)
  const names = rows
    .slice(1)
    .filter((r) => r[COLS.USER.ROLE] === "KAM" && r[COLS.USER.ACTIVE]?.toLowerCase() === "yes" && r[COLS.USER.KAM_NAME])
    .map((r) => r[COLS.USER.KAM_NAME].trim())
    .filter(Boolean)
  return [...new Set(names)]
}
