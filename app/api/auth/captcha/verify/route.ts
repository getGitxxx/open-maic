import { NextResponse } from "next/server"
import { verifyCaptcha } from "@/lib/captcha"
import { z } from "zod"

const verifySchema = z.object({
  captchaId: z.string(),
  captchaCode: z.string().min(1, "请输入验证码"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const validationResult = verifySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "验证失败" },
        { status: 400 }
      )
    }
    
    const { captchaId, captchaCode } = validationResult.data
    
    const result = verifyCaptcha(captchaId, captchaCode)
    
    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || "验证码错误" },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("验证验证码错误:", error)
    return NextResponse.json(
      { error: "验证失败" },
      { status: 500 }
    )
  }
}