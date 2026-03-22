import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { generateActivationToken } from "@/lib/auth-utils"
import { sendActivationEmail } from "@/lib/email"

// 注册请求验证
const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
  name: z.string().min(1, "请输入用户名").max(50, "用户名最多50个字符").optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证输入
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "输入验证失败"
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const { email, password, name } = validationResult.data

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // 如果用户存在但未激活，允许重新注册（重新发送激活邮件）
      if (!existingUser.emailVerified) {
        // 生成新的激活令牌
        const token = await generateActivationToken(existingUser.id)
        
        // 发送激活邮件
        const emailResult = await sendActivationEmail(
          existingUser.email,
          token,
          existingUser.name ?? undefined
        )

        if (!emailResult.success) {
          return NextResponse.json(
            { error: "发送激活邮件失败，请稍后重试" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: "该邮箱已注册但未激活，已重新发送激活邮件",
          requiresActivation: true,
          email: existingUser.email,
        })
      }

      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    // 密码加密
    const passwordHash = await hash(password, 12)

    // 创建用户（未激活状态）
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split("@")[0],
        // emailVerified 保持 null，等待激活
      },
    })

    // 生成激活令牌
    const token = await generateActivationToken(user.id)

    // 发送激活邮件
    const emailResult = await sendActivationEmail(
      user.email,
      token,
      user.name ?? undefined
    )

    if (!emailResult.success) {
      console.error("发送激活邮件失败:", emailResult.error)
      // 用户已创建，但邮件发送失败
      // 返回成功但提示用户手动请求重发
      return NextResponse.json({
        success: true,
        message: "注册成功，但激活邮件发送失败，请稍后请求重发",
        requiresActivation: true,
        email: user.email,
        emailError: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: "注册成功，请查收激活邮件",
      requiresActivation: true,
      email: user.email,
    })
  } catch (error) {
    console.error("注册错误:", error)
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}