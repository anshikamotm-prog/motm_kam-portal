"use client"
import { signIn } from "next-auth/react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

const ERROR_MESSAGES: Record<string, string> = {
  not_registered: "Your email is not registered in the MOTM KAM Portal. Contact admin.",
  inactive: "Your account is inactive. Contact admin to re-activate.",
  auth_error: "Authentication error. Please try again.",
}

export default function LoginClient({ error }: { error?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col gap-6">
          {/* Logo / Brand */}
          <div className="text-center">
            <div className="text-3xl font-bold text-[#1e3a5f]">MOTM</div>
            <div className="text-slate-500 text-sm mt-1">KAM Operations Portal</div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again."}
            </div>
          )}

          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full gap-2"
            size="lg"
          >
            <Globe className="h-5 w-5" />
            Sign in with Google
          </Button>

          <p className="text-center text-xs text-slate-400">
            Access is restricted to MOTM team members only.
          </p>
        </div>
      </div>
    </div>
  )
}
