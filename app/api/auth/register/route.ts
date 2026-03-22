import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"

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
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    // 密码加密
    const passwordHash = await hash(password, 12)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split("@")[0],
      },
    })

    return NextResponse.json({
      success: true,
      message: "注册成功",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("注册错误:", error)
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}