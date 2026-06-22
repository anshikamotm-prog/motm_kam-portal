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
  session: { strategy: "jwt" },
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
              // User deactivated mid-session — strip to minimum privilege
              token.role = "KAM"
              token.kamName = ""
            } else {
              token.role = (match[COLS.USER.ROLE] ?? "KAM") as "Admin" | "KAM" | "SE"
              token.kamName = match[COLS.USER.KAM_NAME] ?? ""
            }
            token.email = email
            token.sheetLoaded = true
          } else {
            // User removed from sheet — mark loaded to prevent infinite re-reads
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
        session.user.role = ((token.role as string) ?? "KAM") as "Admin" | "KAM" | "SE"
        session.user.kamName = (token.kamName as string) ?? ""
      }
      return session
    },
  },
}
