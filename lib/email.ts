import Resend from "resend"

// 初始化 Resend 客户端
const resend = new Resend(process.env.RESEND_API_KEY)

// 发件人地址
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@openmaic.chat"

// 邮件发送结果
interface SendEmailResult {
  success: boolean
  error?: string
  data?: unknown
}

/**
 * 发送邮箱激活邮件
 */
export async function sendActivationEmail(
  email: string,
  token: string,
  userName?: string
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const activationUrl = `${baseUrl}/api/auth/activate?token=${token}`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "激活您的 OpenMAIC 账号",
      html: generateActivationEmailHtml(activationUrl, userName),
    })

    if (error) {
      console.error("发送激活邮件失败:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("发送激活邮件异常:", error)
    return { success: false, error: "发送邮件失败" }
  }
}

/**
 * 生成激活邮件 HTML
 */
function generateActivationEmailHtml(activationUrl: string, userName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenMAIC</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">多智能体互动课堂平台</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0; color: #333;">欢迎加入 OpenMAIC！</h2>
    
    <p>${userName ? `您好，${userName}！` : "您好！"}</p>
    
    <p>感谢您注册 OpenMAIC 账号。请点击下方按钮激活您的邮箱地址：</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${activationUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
        激活账号
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">或者复制以下链接到浏览器打开：</p>
    <p style="word-break: break-all; color: #667eea; font-size: 14px;">${activationUrl}</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
      <p>此链接将在 24 小时后过期。如果您没有注册 OpenMAIC 账号，请忽略此邮件。</p>
      <p style="margin-bottom: 0;">© ${new Date().getFullYear()} OpenMAIC. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  userName?: string
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "重置您的 OpenMAIC 密码",
      html: generatePasswordResetEmailHtml(resetUrl, userName),
    })

    if (error) {
      console.error("发送密码重置邮件失败:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("发送密码重置邮件异常:", error)
    return { success: false, error: "发送邮件失败" }
  }
}

/**
 * 生成密码重置邮件 HTML
 */
function generatePasswordResetEmailHtml(resetUrl: string, userName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenMAIC</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">多智能体互动课堂平台</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0; color: #333;">重置密码</h2>
    
    <p>${userName ? `您好，${userName}！` : "您好！"}</p>
    
    <p>我们收到了重置您账号密码的请求。请点击下方按钮设置新密码：</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
        重置密码
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">或者复制以下链接到浏览器打开：</p>
    <p style="word-break: break-all; color: #667eea; font-size: 14px;">${resetUrl}</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
      <p>此链接将在 1 小时后过期。如果您没有请求重置密码，请忽略此邮件。</p>
      <p style="margin-bottom: 0;">© ${new Date().getFullYear()} OpenMAIC. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 发送欢迎邮件（激活成功后）
 */
export async function sendWelcomeEmail(
  email: string,
  userName?: string
): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "欢迎加入 OpenMAIC！",
      html: generateWelcomeEmailHtml(userName),
    })

    if (error) {
      console.error("发送欢迎邮件失败:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("发送欢迎邮件异常:", error)
    return { success: false, error: "发送邮件失败" }
  }
}

/**
 * 生成欢迎邮件 HTML
 */
function generateWelcomeEmailHtml(userName?: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 欢迎加入 OpenMAIC！</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p>${userName ? `您好，${userName}！` : "您好！"}</p>
    
    <p>您的账号已成功激活！现在您可以开始使用 OpenMAIC 创建沉浸式的 AI 互动课堂了。</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
        开始使用
      </a>
    </div>
    
    <h3 style="color: #333;">您可以做什么：</h3>
    <ul style="color: #666;">
      <li>🎯 一键生成多智能体互动课堂</li>
      <li>👩‍🏫 创建 AI 老师和智能体同学</li>
      <li>📊 支持幻灯片、测验、模拟等多种场景</li>
      <li>🎙️ 语音互动和白板协作</li>
      <li>📤 导出 PPTX 和 HTML</li>
    </ul>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
      <p style="margin-bottom: 0;">© ${new Date().getFullYear()} OpenMAIC. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}