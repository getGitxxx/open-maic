import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getUserClassrooms } from "@/lib/server/classroom-storage"

export async function GET() {
  try {
    // 验证登录状态
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      )
    }

    // 从数据库获取用户课堂列表
    const classrooms = await getUserClassrooms(session.user.id)

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