import { google } from "googleapis"

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "{}"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

export const sheets = google.sheets({ version: "v4", auth })

export async function getSheetValues(sheetId: string, sheetName: string): Promise<string[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetName,
  })
  return (res.data.values ?? []) as string[][]
}

export async function appendRow(sheetId: string, sheetName: string, values: unknown[]): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  })
}

export async function appendRows(sheetId: string, sheetName: string, rows: unknown[][]): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  })
}

/** Update a single cell. rowNum is 1-indexed, col is 1-indexed (A=1). */
export async function updateCell(
  sheetId: string,
  sheetName: string,
  rowNum: number,
  col: number,
  value: unknown,
): Promise<void> {
  const colLetter = colToLetter(col)
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!${colLetter}${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  })
}

/** Update a range of cells in a single row, starting at the given column. */
export async function updateRowRange(
  sheetId: string,
  sheetName: string,
  rowNum: number,
  startCol: number,
  values: unknown[],
): Promise<void> {
  const startLetter = colToLetter(startCol)
  const endLetter = colToLetter(startCol + values.length - 1)
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!${startLetter}${rowNum}:${endLetter}${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  })
}

/** Batch-update multiple cell ranges at once. */
export async function batchUpdate(
  sheetId: string,
  updates: Array<{ range: string; values: unknown[][] }>,
): Promise<void> {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates.map((u) => ({ range: u.range, values: u.values })),
    },
  })
}

function colToLetter(col: number): string {
  let result = ""
  while (col > 0) {
    col--
    result = String.fromCharCode(65 + (col % 26)) + result
    col = Math.floor(col / 26)
  }
  return result
}
