import { NextResponse } from "next/server"
import { generateCaptcha } from "@/lib/captcha"

export async function GET() {
  try {
    const { captchaId, svg } = generateCaptcha()
    
    return NextResponse.json({
      captchaId,
      svg,
    })
  } catch (error) {
    console.error("生成验证码错误:", error)
    return NextResponse.json(
      { error: "生成验证码失败" },
      { status: 500 }
    )
  }
}