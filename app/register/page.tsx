"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // 注册成功状态
  const [registered, setRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 验证用户名
    if (!name.trim()) {
      setError("请输入用户名")
      return
    }

    // 验证密码
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    if (password.length < 6) {
      setError("密码至少需要6个字符")
      return
    }

    setIsLoading(true)

    try {
      // 注册
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "注册失败")
        return
      }

      // 检查是否需要激活
      if (data.requiresActivation) {
        setRegisteredEmail(data.email)
        setRegistered(true)
        return
      }

      // 如果不需要激活（不应该发生），直接登录
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError("注册成功，但自动登录失败，请手动登录")
        router.push("/login")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError("注册出错，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendActivation = async () => {
    if (!registeredEmail) return
    
    setResending(true)
    setResendSuccess(false)
    
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResendSuccess(true)
      } else {
        setError(data.error || "发送失败")
      }
    } catch {
      setError("发送失败，请稍后重试")
    } finally {
      setResending(false)
    }
  }

  const handleGitHubRegister = async () => {
    setIsLoading(true)
    await signIn("github", { callbackUrl })
  }

  // 注册成功，显示激活提示
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            注册成功！
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            我们已向 <span className="font-medium text-gray-900 dark:text-white">{registeredEmail}</span> 发送了激活邮件
          </p>
          
          <p className="text-sm text-gray-500 mb-6">
            请点击邮件中的激活链接激活您的账号。如果没有收到邮件，请检查垃圾邮件文件夹。
          </p>
          
          {resendSuccess && (
            <p className="text-green-600 text-sm mb-4">
              ✓ 激活邮件已重新发送
            </p>
          )}
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendActivation}
              disabled={resending}
            >
              {resending ? "发送中..." : "重新发送激活邮件"}
            </Button>
            
            <Link href="/login" className="block">
              <Button className="w-full">
                前往登录
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            创建账号
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            注册以开始使用 OpenMAIC
          </p>
        </div>

        {/* 邮箱密码注册 */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="用户名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div>
            <Input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? "注册中..." : "注册"}
          </Button>
        </form>

        {/* 分隔线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
              或使用三方账号注册
            </span>
          </div>
        </div>

        {/* GitHub 注册 */}
        <Button
          variant="outline"
          className="w-full h-12 text-base"
          onClick={handleGitHubRegister}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          使用 GitHub 注册
        </Button>

        {/* 已有账号 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          已有账号？{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-gray-500">加载中...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
