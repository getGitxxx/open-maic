import { NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { hash, compare } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"

// 请求验证
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "新密码至少需要6个字符"),
})

export async function POST(request: Request) {
  try {
    // 验证登录状态
    const session = await getAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 验证输入
    const validationResult = changePasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "输入验证失败" },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validationResult.data

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "用户信息异常" },
        { status: 400 }
      )
    }

    // 验证当前密码
    const isPasswordValid = await compare(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "当前密码错误" },
        { status: 400 }
      )
    }

    // 加密新密码
    const passwordHash = await hash(newPassword, 12)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
    })
  } catch (error) {
    console.error("修改密码错误:", error)
    return NextResponse.json(
      { error: "修改密码失败，请稍后重试" },
      { status: 500 }
    )
  }
}