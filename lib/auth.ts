import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { getSheetValues } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12-hour sessions
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      try {
        const rows = await getSheetValues(SHEET_ID, SHEETS.USERS)
        const match = rows.find(
          (r) => r[COLS.USER.EMAIL]?.toLowerCase() === user.email?.toLowerCase(),
        )
        if (!match) return "/login?error=not_registered"
        if (match[COLS.USER.ACTIVE]?.toLowerCase() !== "yes") return "/login?error=inactive"
        return true
      } catch {
        return "/login?error=auth_error"
      }
    },
    async jwt({ token, user }) {
      const email = user?.email ?? (token.email as string | undefined)
      // Refresh on initial sign-in, or if the sheet hasn't been loaded yet for this token
      // (handles users who signed in before their KAM Name was set in the Users sheet)
      const needsRefresh = user?.email != null || token.sheetLoaded !== true
      if (email && needsRefresh) {
        try {
          const rows = await getSheetValues(SHEET_ID, SHEETS.USERS)
          const match = rows.find(
            (r) => r[COLS.USER.EMAIL]?.toLowerCase() === email.toLowerCase(),
          )
          if (match) {
            if (match[COLS.USER.ACTIVE]?.toLowerCase() !== "yes") {
              // Deactivated mid-session — strip privileges, flag token so proxy blocks all requests.
              // Keep sheetLoaded=false so the check re-runs until they log out.
              token.role = "KAM"
              token.kamName = ""
              token.fullName = ""
              token.deactivated = true
            } else {
              token.role = (match[COLS.USER.ROLE] ?? "KAM") as "Admin" | "KAM" | "SE" | "DR"
              token.kamName = match[COLS.USER.KAM_NAME] ?? ""
              token.fullName = match[COLS.USER.FULL_NAME] ?? ""
              token.deactivated = false
              token.sheetLoaded = true
            }
            token.email = email
          } else {
            // User removed from sheet — block immediately
            token.role = "KAM"
            token.kamName = ""
            token.fullName = ""
            token.deactivated = true
            token.sheetLoaded = true
          }
        } catch {
          // Sheets API unavailable — don't update sheetLoaded so it retries next request
          if (!token.role) {
            token.role = "KAM"
            token.kamName = ""
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = ((token.role as string) ?? "KAM") as "Admin" | "KAM" | "SE" | "DR"
        session.user.kamName = (token.kamName as string) ?? ""
        session.user.fullName = (token.fullName as string) ?? ""
      }
      return session
    },
  },
}
