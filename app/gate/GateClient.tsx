"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

export default function GateClient() {
  const [code, setCode] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const submit = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError(false)
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    })
    if (res.ok) {
      router.push("/login")
    } else {
      setError(true)
      setCode("")
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-xs px-4">
        <div className="flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-white/40" />
          </div>

          <div className="w-full flex flex-col gap-3">
            <input
              ref={inputRef}
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false) }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Access code"
              autoFocus
              autoComplete="off"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:ring-2 transition-all ${
                error
                  ? "border-red-500/60 focus:ring-red-500/20"
                  : "border-white/10 focus:ring-white/10"
              }`}
            />
            {error && (
              <p className="text-xs text-red-400 text-center">Incorrect code</p>
            )}
            <button
              onClick={submit}
              disabled={loading || !code.trim()}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white text-sm font-medium transition-all"
            >
              {loading ? "Verifying…" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
