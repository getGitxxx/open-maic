import { NextResponse } from "next/server"
import { z } from "zod"
import { generatePasswordResetToken } from "@/lib/auth-utils"

// 请求验证
const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证输入
    const validationResult = forgotPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "输入验证失败" },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // 生成重置令牌
    const result = await generatePasswordResetToken(email)

    // 即使用户不存在也返回成功（安全考虑，避免邮箱枚举）
    if (!result) {
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，您将收到密码重置邮件",
      })
    }

    // TODO: 发送邮件
    // 在生产环境中，这里应该发送邮件
    // 目前返回令牌用于测试（生产环境应移除）
    console.log("Password reset token:", result.token)
    console.log("Reset URL:", `${process.env.NEXTAUTH_URL}/reset-password?token=${result.token}`)

    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，您将收到密码重置邮件",
      // 开发环境返回 token，生产环境应移除
      ...(process.env.NODE_ENV === "development" && {
        devToken: result.token,
        devResetUrl: `${process.env.NEXTAUTH_URL}/reset-password?token=${result.token}`,
      }),
    })
  } catch (error) {
    console.error("忘记密码错误:", error)
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    )
  }
}