import svgCaptcha from "svg-captcha"
import { randomUUID } from "crypto"

// 内存存储验证码（适合单机部署，后续可迁移到 Redis）
interface CaptchaData {
  id: string
  text: string
  expiresAt: number
}

// 全局验证码存储
const captchaStore = new Map<string, CaptchaData>()

// 定期清理过期验证码（每 5 分钟）
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [id, data] of captchaStore.entries()) {
      if (data.expiresAt < now) {
        captchaStore.delete(id)
      }
    }
  }, 5 * 60 * 1000)
}

// 验证码配置
const CAPTCHA_CONFIG = {
  size: 4, // 字符数
  noise: 2, // 干扰线数
  color: true, // 彩色
  background: "#f0f0f0", // 背景色
  width: 120,
  height: 40,
  fontSize: 50,
  charPreset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", // 排除容易混淆的字符
}

// 验证码过期时间（5 分钟）
const CAPTCHA_EXPIRES_MS = 5 * 60 * 1000

export interface CaptchaResult {
  captchaId: string
  svg: string
}

/**
 * 生成验证码
 */
export function generateCaptcha(): CaptchaResult {
  const captcha = svgCaptcha.create(CAPTCHA_CONFIG)
  const captchaId = randomUUID()
  const expiresAt = Date.now() + CAPTCHA_EXPIRES_MS

  // 存储验证码
  captchaStore.set(captchaId, {
    id: captchaId,
    text: captcha.text.toLowerCase(), // 统一小写存储
    expiresAt,
  })

  return {
    captchaId,
    svg: captcha.data,
  }
}

/**
 * 验证验证码
 */
export function verifyCaptcha(captchaId: string, userInput: string): { valid: boolean; error?: string } {
  const captchaData = captchaStore.get(captchaId)

  // 验证码不存在
  if (!captchaData) {
    return { valid: false, error: "验证码已过期或不存在" }
  }

  // 验证码已过期
  if (captchaData.expiresAt < Date.now()) {
    captchaStore.delete(captchaId)
    return { valid: false, error: "验证码已过期" }
  }

  // 验证完成后立即删除（一次性使用）
  captchaStore.delete(captchaId)

  // 验证用户输入（忽略大小写）
  if (captchaData.text !== userInput.toLowerCase()) {
    return { valid: false, error: "验证码错误" }
  }

  return { valid: true }
}

/**
 * 删除验证码
 */
export function deleteCaptcha(captchaId: string): void {
  captchaStore.delete(captchaId)
}

/**
 * 获取验证码存储大小（用于监控）
 */
export function getCaptchaStoreSize(): number {
  return captchaStore.size
}