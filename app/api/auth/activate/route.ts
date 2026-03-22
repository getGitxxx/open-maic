import { NextResponse } from "next/server"
import { verifyActivationToken, deleteActivationToken } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=missing_token", request.url)
      )
    }

    // 验证令牌
    const result = await verifyActivationToken(token)

    if (!result.valid) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(result.error)}`, request.url)
      )
    }

    const { user, tokenId } = result

    // 检查是否已激活
    if (user.emailVerified) {
      // 删除令牌
      await deleteActivationToken(tokenId)
      return NextResponse.redirect(
        new URL("/login?message=already_activated", request.url)
      )
    }

    // 激活邮箱
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })

    // 删除激活令牌
    await deleteActivationToken(tokenId)

    // 发送欢迎邮件（异步，不阻塞）
    sendWelcomeEmail(user.email, user.name ?? undefined).catch((err) => {
      console.error("发送欢迎邮件失败:", err)
    })

    // 重定向到登录页，显示成功消息
    return NextResponse.redirect(
      new URL("/login?activated=true", request.url)
    )
  } catch (error) {
    console.error("激活错误:", error)
    return NextResponse.redirect(
      new URL("/login?error=activation_failed", request.url)
    )
  }
}

// 重新发送激活邮件
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "请提供邮箱地址" },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // 不暴露用户是否存在
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册且未激活，您将收到激活邮件",
      })
    }

    // 检查是否已激活
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "该账号已激活，请直接登录",
      })
    }

    // 动态导入避免循环依赖
    const { generateActivationToken } = await import("@/lib/auth-utils")
    const { sendActivationEmail } = await import("@/lib/email")

    // 生成新的激活令牌
    const token = await generateActivationToken(user.id)

    // 发送激活邮件
    const emailResult = await sendActivationEmail(
      user.email,
      token,
      user.name ?? undefined
    )

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "发送邮件失败，请稍后重试" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "激活邮件已发送，请查收",
    })
  } catch (error) {
    console.error("重发激活邮件错误:", error)
    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    )
  }
}