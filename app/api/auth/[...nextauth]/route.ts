import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/db"

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "邮箱登录",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "请输入邮箱" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // 查找用户
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        // 验证密码
        const isPasswordValid = await compare(credentials.password, user.passwordHash)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email ?? undefined
        token.name = user.name ?? undefined
        token.picture = user.image ?? undefined
      }

      // OAuth 登录时，检查用户是否存在，不存在则创建
      if (account?.provider && account.provider !== "credentials" && user?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!existingUser) {
          // 创建新用户（OAuth 用户没有密码）
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image,
              emailVerified: new Date(),
              passwordHash: "", // OAuth 用户没有密码
            },
          })
          token.id = newUser.id
        } else {
          token.id = existingUser.id
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string | null
      }
      return session
    },
  },
})

export { handler as GET, handler as POST }