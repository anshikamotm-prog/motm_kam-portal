"use client"
import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { STATUS_OPTIONS } from "@/constants"
import { useKAMNames } from "@/hooks/useKAMNames"
import { Download, Upload, CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react"

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ }
    else if (line[i] === "," && !inQ) { out.push(cur); cur = "" }
    else { cur += line[i] }
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

const HEADER_MAP: Record<string, string> = {
  "client id": "clientId",
  "company": "company",
  "industry": "industry",
  "city": "city",
  "start date": "startDate",
  "status": "status",
  "kam": "kam",
  "se": "se",
  "contact person": "contact",
  "phone": "phone",
  "contract value": "contractValue",
  "monthly value": "monthlyValue",
  "services": "services",
}

interface ParsedRow {
  clientId: string; company: string; industry: string; city: string
  startDate: string; status: string; kam: string; se: string
  contact: string; phone: string; contractValue: string; monthlyValue: string; services: string
}

function parseCSV(text: string): { rows: ParsedRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"))
  if (lines.length < 2) return { rows: [], error: "File has no data rows. Did you remove the # comment lines?" }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
  const missing = ["client id", "company", "kam"].filter((h) => !headers.includes(h))
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(", ")}` }

  const rows: ParsedRow[] = lines.slice(1).filter((l) => l.trim()).map((line) => {
    const vals = parseCSVLine(line)
    const raw: Record<string, string> = {}
    headers.forEach((h, i) => { const key = HEADER_MAP[h]; if (key) raw[key] = vals[i] ?? "" })
    return raw as unknown as ParsedRow
  })

  return { rows }
}

// ─── Row validation (client-side preview) ────────────────────────────────────

const STATUS_SET = new Set<string>(STATUS_OPTIONS)

function validateRow(row: ParsedRow, seenIds: Set<string>, kamSet: Set<string>): string | null {
  if (!row.clientId?.trim()) return "Client ID required"
  if (!row.company?.trim()) return "Company required"
  if (!row.kam?.trim() || !kamSet.has(row.kam.trim())) return `KAM must be: ${[...kamSet].join(" / ")}`
  const status = row.status?.trim() || "New"
  if (!STATUS_SET.has(status)) return `Invalid status "${status}"`
  if (seenIds.has(row.clientId.trim().toLowerCase())) return "Duplicate Client ID in this file"
  seenIds.add(row.clientId.trim().toLowerCase())
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

type Step = "upload" | "preview" | "done"

interface ImportResult { imported: number; errors: { row: number; clientId: string; error: string }[] }

export default function BulkImportModal({ onClose }: Props) {
  const qc = useQueryClient()
  const { data: kamNames = [] } = useKAMNames()
  const kamSet = new Set<string>(kamNames)
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [rowErrors, setRowErrors] = useState<(string | null)[]>([])
  const [parseError, setParseError] = useState("")
  const [fileName, setFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const downloadTemplate = () => {
    window.location.href = "/api/clients/bulk-import/template"
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { rows: parsed, error } = parseCSV(text)
      if (error) { setParseError(error); return }
      setParseError("")
      const seenIds = new Set<string>()
      const errors = parsed.map((r) => validateRow(r, seenIds, kamSet))
      setRows(parsed)
      setRowErrors(errors)
      setStep("preview")
    }
    reader.readAsText(file)
  }

  const validRows = rows.filter((_, i) => !rowErrors[i])
  const invalidCount = rowErrors.filter(Boolean).length

  const handleImport = async () => {
    setImporting(true)
    const res = await fetch("/api/clients/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: validRows }),
    })
    const data: ImportResult = await res.json()
    setResult(data)
    if (data.imported > 0) qc.invalidateQueries({ queryKey: ["clients"] })
    setStep("done")
    setImporting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#1e3a5f]" />
            Bulk Import Clients
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="flex-1 flex flex-col gap-6 py-2">
            {/* Step 1 */}
            <div className="rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f] text-white text-xs">1</span>
                Download the CSV template
              </div>
              <p className="text-xs text-slate-500 pl-8">
                Fill in client data using the template. Required columns are <span className="font-medium">Client ID</span>, <span className="font-medium">Company</span>, and <span className="font-medium">KAM</span>. Remove all # comment lines before uploading.
              </p>
              <div className="pl-8">
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> Download Template
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f] text-white text-xs">2</span>
                Upload filled CSV
              </div>
              <div className="pl-8">
                <label
                  className="flex flex-col items-center gap-2 p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1e3a5f] cursor-pointer transition-colors group"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileText className="h-8 w-8 text-slate-300 group-hover:text-[#1e3a5f] transition-colors" />
                  <span className="text-sm text-slate-500 group-hover:text-[#1e3a5f]">Click to select CSV file</span>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                </label>
                {parseError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {parseError}
                  </div>
                )}
              </div>
            </div>

            {/* Field reference */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 space-y-1">
              <div className="font-medium text-slate-600 mb-2">KAM options:</div>
              <div className="flex gap-2 flex-wrap">
                {kamNames.map((k) => <Badge key={k} variant="blue" className="text-[10px]">{k}</Badge>)}
              </div>
              <div className="font-medium text-slate-600 mt-3 mb-1">Status options:</div>
              <div className="flex gap-1.5 flex-wrap">
                {[...STATUS_OPTIONS].map((s) => <Badge key={s} variant="gray" className="text-[10px]">{s}</Badge>)}
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-600">
                <span className="font-semibold">{fileName}</span> · {rows.length} rows parsed
              </span>
              <Badge variant="green">{validRows.length} valid</Badge>
              {invalidCount > 0 && <Badge variant="red">{invalidCount} errors</Badge>}
              <button className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline" onClick={() => { setStep("upload"); setRows([]); if (fileRef.current) fileRef.current.value = "" }}>
                Upload different file
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500 w-8">#</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Client ID</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Company</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Industry</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">City</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">KAM</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Status</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500 min-w-[160px]">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const err = rowErrors[i]
                    return (
                      <tr key={i} className={err ? "bg-red-50" : "bg-white hover:bg-slate-50"}>
                        <td className="px-2.5 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-2.5 py-2 font-mono text-slate-700">{r.clientId || <span className="text-red-400">—</span>}</td>
                        <td className="px-2.5 py-2 text-slate-800 font-medium">{r.company || <span className="text-red-400">—</span>}</td>
                        <td className="px-2.5 py-2 text-slate-500">{r.industry || "—"}</td>
                        <td className="px-2.5 py-2 text-slate-500">{r.city || "—"}</td>
                        <td className="px-2.5 py-2">
                          {r.kam ? (kamSet.has(r.kam.trim()) ? <Badge variant="blue" className="text-[10px]">{r.kam}</Badge> : <span className="text-red-500">{r.kam}</span>) : <span className="text-red-400">—</span>}
                        </td>
                        <td className="px-2.5 py-2 text-slate-500">{r.status || "New"}</td>
                        <td className="px-2.5 py-2">
                          {err
                            ? <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3 flex-shrink-0" />{err}</span>
                            : <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" />OK</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2.5 text-xs text-yellow-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {invalidCount} row{invalidCount !== 1 ? "s" : ""} will be skipped. Fix errors in your CSV and re-upload, or proceed to import only the {validRows.length} valid rows.
              </div>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && result && (
          <div className="flex-1 flex flex-col gap-4 py-4">
            <div className={`rounded-xl p-5 flex items-center gap-4 ${result.imported > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              {result.imported > 0
                ? <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                : <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />}
              <div>
                <div className={`text-lg font-bold ${result.imported > 0 ? "text-green-800" : "text-red-700"}`}>
                  {result.imported > 0 ? `${result.imported} client${result.imported !== 1 ? "s" : ""} imported successfully` : "No clients were imported"}
                </div>
                {result.errors.length > 0 && (
                  <div className="text-sm text-slate-600 mt-0.5">{result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had errors and were skipped.</div>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Skipped rows</div>
                <div className="divide-y divide-slate-100">
                  {result.errors.map((e) => (
                    <div key={e.row} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                      <span className="text-slate-400 w-6 text-right">#{e.row}</span>
                      <span className="font-mono text-slate-600 w-24 truncate">{e.clientId || "—"}</span>
                      <span className="text-red-600">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-slate-100 pt-3">
          {step === "upload" && <Button variant="outline" onClick={onClose}>Cancel</Button>}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
                {importing ? "Importing..." : `Import ${validRows.length} client${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}

          {step === "done" && (
            <>
              {result && result.errors.length > 0 && (
                <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); setResult(null); if (fileRef.current) fileRef.current.value = "" }}>
                  Import more
                </Button>
              )}
              <Button onClick={onClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
