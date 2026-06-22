export interface AppUser {
  rowNum: number
  email: string
  fullName: string
  role: "Admin" | "KAM" | string
  kamName: string
  active: string
}

export interface SessionUser {
  id: string
  email: string
  name: string
  image?: string
  role: "Admin" | "KAM" | "SE"
  kamName: string
}

declare module "next-auth" {
  interface Session {
    user: SessionUser
  }
  interface JWT {
    role: string
    kamName: string
    email?: string
    sheetLoaded?: boolean
  }
}
