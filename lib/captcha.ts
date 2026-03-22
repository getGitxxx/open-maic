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

// 验证码过期时间（5 分钟）
const CAPTCHA_EXPIRES_MS = 5 * 60 * 1000

// 验证码字符集（排除容易混淆的字符）
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export interface CaptchaResult {
  captchaId: string
  svg: string
}

/**
 * 生成随机验证码文本
 */
function generateRandomText(length: number): string {
  let result = ""
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return result
}

/**
 * 生成验证码 SVG（不依赖外部字体）
 */
function generateCaptchaSvg(text: string): string {
  const width = 120
  const height = 40
  const fontSize = 24
  
  // 生成随机颜色
  const randomColor = () => {
    const r = Math.floor(Math.random() * 100 + 50) // 50-150
    const g = Math.floor(Math.random() * 100 + 50)
    const b = Math.floor(Math.random() * 100 + 50)
    return `rgb(${r},${g},${b})`
  }
  
  // 生成干扰线
  let noiseLines = ""
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width
    const y1 = Math.random() * height
    const x2 = Math.random() * width
    const y2 = Math.random() * height
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${randomColor()}" stroke-width="1" opacity="0.5"/>`
  }
  
  // 生成干扰点
  let noiseDots = ""
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    noiseDots += `<circle cx="${x}" cy="${y}" r="1" fill="${randomColor()}" opacity="0.5"/>`
  }
  
  // 生成文字（每个字符有轻微旋转和位移）
  let textElements = ""
  const charWidth = width / (text.length + 1)
  for (let i = 0; i < text.length; i++) {
    const x = charWidth * (i + 0.8)
    const y = height / 2 + fontSize / 3
    const rotation = (Math.random() - 0.5) * 30 // -15 到 15 度
    textElements += `<text x="${x}" y="${y}" 
      font-family="Arial, sans-serif" 
      font-size="${fontSize}" 
      font-weight="bold" 
      fill="${randomColor()}"
      transform="rotate(${rotation}, ${x}, ${y})"
    >${text[i]}</text>`
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    ${noiseLines}
    ${noiseDots}
    ${textElements}
  </svg>`
}

/**
 * 生成验证码
 */
export function generateCaptcha(): CaptchaResult {
  const text = generateRandomText(4)
  const captchaId = randomUUID()
  const expiresAt = Date.now() + CAPTCHA_EXPIRES_MS

  // 存储验证码
  captchaStore.set(captchaId, {
    id: captchaId,
    text: text.toLowerCase(), // 统一小写存储
    expiresAt,
  })

  return {
    captchaId,
    svg: generateCaptchaSvg(text),
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