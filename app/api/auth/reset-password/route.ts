import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { verifyPasswordResetToken, deletePasswordResetToken } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"

// 请求验证
const resetPasswordSchema = z.object({
  token: z.string().min(1, "缺少重置令牌"),
  password: z.string().min(6, "密码至少需要6个字符"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证输入
    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "输入验证失败" },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // 验证令牌
    const tokenResult = await verifyPasswordResetToken(token)
    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: tokenResult.error },
        { status: 400 }
      )
    }

    const { user, tokenId } = tokenResult

    if (!user) {
      return NextResponse.json(
        { error: "用户信息异常" },
        { status: 400 }
      )
    }

    // 加密新密码
    const passwordHash = await hash(password, 12)

    // 更新用户密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // 删除重置令牌
    await deletePasswordResetToken(tokenId)

    return NextResponse.json({
      success: true,
      message: "密码重置成功，请使用新密码登录",
    })
  } catch (error) {
    console.error("重置密码错误:", error)
    return NextResponse.json(
      { error: "重置密码失败，请稍后重试" },
      { status: 500 }
    )
  }
}