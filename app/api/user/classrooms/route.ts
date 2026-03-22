import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { promises as fs } from "fs"
import path from "path"

const CLASSROOMS_DIR = path.join(process.cwd(), "data", "classrooms")

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

    // 读取所有课堂文件
    const files = await fs.readdir(CLASSROOMS_DIR).catch(() => [])

    const classrooms = []

    for (const file of files) {
      if (!file.endsWith(".json")) continue

      try {
        const content = await fs.readFile(path.join(CLASSROOMS_DIR, file), "utf-8")
        const data = JSON.parse(content)

        // 只返回当前用户的课堂
        if (data.userId === session.user.id) {
          classrooms.push({
            id: data.id,
            title: data.title || "未命名课堂",
            createdAt: data.createdAt,
            scenesCount: data.scenes?.length || 0,
          })
        }
      } catch {
        // 忽略解析错误的文件
      }
    }

    // 按创建时间倒序排列
    classrooms.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

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