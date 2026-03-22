import { NextResponse } from "next/server"
import { z } from "zod"
import { generatePasswordResetToken } from "@/lib/auth-utils"
import { sendPasswordResetEmail } from "@/lib/email"

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

    // 发送邮件
    const emailResult = await sendPasswordResetEmail(
      result.user.email,
      result.token,
      result.user.name ?? undefined
    )

    if (!emailResult.success) {
      console.error("发送密码重置邮件失败:", emailResult.error)
      // 不暴露邮件发送失败，避免信息泄露
    }

    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，您将收到密码重置邮件",
    })
  } catch (error) {
    console.error("忘记密码错误:", error)
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    )
  }
}