import { type NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { getUserClassrooms } from "@/lib/server/classroom-storage"

export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    const session = await getAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      )
    }

    // 获取 limit 参数
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "0") || undefined

    // 从数据库获取用户课堂列表
    const classrooms = await getUserClassrooms(session.user.id, limit)

    return NextResponse.json({
      success: true,
      classrooms,
    })
  } catch (error) {
    console.error("获取课堂列表错误:", error)
    return NextResponse.json(
      { error: "获取课堂列表失败" },
      { status: 500 }
    )
  }
}