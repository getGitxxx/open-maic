import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { nextUrl } = req
    const isLoggedIn = !!req.nextauth.token

    // 已登录用户访问登录/注册页，重定向到首页
    if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
      return NextResponse.redirect(new URL("/", nextUrl))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { nextUrl } = req

        // 公开路由（不需要登录）
        const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"]
        const isPublicRoute = publicRoutes.some(route => nextUrl.pathname === route)
          || nextUrl.pathname.startsWith("/api/auth")

        // 静态资源
        const isStaticRoute =
          nextUrl.pathname.startsWith("/_next") ||
          nextUrl.pathname.startsWith("/favicon") ||
          nextUrl.pathname.includes(".")

        // 首页需要登录
        if (nextUrl.pathname === "/") {
          return !!token
        }

        if (isStaticRoute || isPublicRoute) {
          return true
        }

        // 其他路由需要登录
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}