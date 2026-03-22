import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
  }
  interface Session extends DefaultSession {
    user: User & {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email?: string
    name?: string
    picture?: string
  }
}