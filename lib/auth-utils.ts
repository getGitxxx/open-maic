import { randomBytes } from "crypto"
import { prisma } from "./db"

// 生成密码重置令牌
export async function generatePasswordResetToken(email: string) {
  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return null
  }

  // 生成随机令牌
  const token = randomBytes(32).toString("hex")

  // 设置过期时间（1小时后）
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  // 存储令牌
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

// 验证密码重置令牌
export async function verifyPasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken) {
    return { valid: false, error: "无效的重置链接" }
  }

  // 检查是否过期
  if (resetToken.expiresAt < new Date()) {
    // 删除过期令牌
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    })
    return { valid: false, error: "重置链接已过期，请重新申请" }
  }

  return {
    valid: true,
    user: resetToken.user,
    tokenId: resetToken.id,
  }
}

// 删除密码重置令牌
export async function deletePasswordResetToken(tokenId: string) {
  await prisma.passwordResetToken.delete({
    where: { id: tokenId },
  })
}