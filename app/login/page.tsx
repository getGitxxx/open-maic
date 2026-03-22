"use client"

import { Suspense, useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [captchaCode, setCaptchaCode] = useState("")
  const [captchaId, setCaptchaId] = useState("")
  const [captchaSvg, setCaptchaSvg] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showActivationResend, setShowActivationResend] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState("")

  // 从 URL 获取消息
  useEffect(() => {
    const activated = searchParams.get("activated")
    const errorMsg = searchParams.get("error")
    const msg = searchParams.get("message")

    if (activated === "true") {
      setMessage("账号激活成功！请登录")
    }
    if (msg === "already_activated") {
      setMessage("该账号已激活，请直接登录")
    }
    if (errorMsg === "missing_token") {
      setError("激活链接无效")
    }
    if (errorMsg === "activation_failed") {
      setError("激活失败，请重试")
    }
  }, [searchParams])

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const response = await fetch("/api/auth/captcha")
      const data = await response.json()
      setCaptchaId(data.captchaId)
      setCaptchaSvg(data.svg)
      setCaptchaCode("")
    } catch {
      console.error("获取验证码失败")
    }
  }

  // 初始化验证码
  useEffect(() => {
    fetchCaptcha()
  }, [])

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")
    setShowActivationResend(false)

    // 验证验证码
    if (!captchaCode) {
      setError("请输入验证码")
      setIsLoading(false)
      return
    }

    try {
      // 先验证验证码
      const captchaResponse = await fetch("/api/auth/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaId, captchaCode }),
      })

      const captchaData = await captchaResponse.json()

      if (!captchaResponse.ok) {
        setError(captchaData.error || "验证码错误")
        fetchCaptcha()
        setIsLoading(false)
        return
      }

      // 登录
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setError("请先激活您的账号")
          setShowActivationResend(true)
          setUnverifiedEmail(email)
        } else {
          setError("登录失败，请检查邮箱和密码")
        }
        fetchCaptcha()
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError("登录出错，请稍后重试")
      fetchCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendActivation = async () => {
    if (!unverifiedEmail) return
    
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage("激活邮件已发送，请查收")
        setShowActivationResend(false)
      } else {
        setError(data.error || "发送失败")
      }
    } catch {
      setError("发送失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    setIsLoading(true)
    await signIn("github", { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            欢迎回来
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            登录以继续使用 OpenMAIC
          </p>
        </div>

        {/* 邮箱密码登录 */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
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
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12"
            />
          </div>
          
          {/* 验证码 */}
          <div className="flex gap-3 items-center">
            <Input
              type="text"
              placeholder="验证码"
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value)}
              required
              className="h-12 flex-1"
              maxLength={4}
            />
            <button
              type="button"
              onClick={fetchCaptcha}
              className="flex-shrink-0 rounded border border-gray-300 overflow-hidden hover:opacity-80 transition-opacity"
              title="点击刷新验证码"
            >
              {captchaSvg && (
                <div 
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  className="w-[120px] h-[40px]"
                />
              )}
            </button>
          </div>

          {message && (
            <p className="text-green-600 text-sm text-center">{message}</p>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {showActivationResend && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendActivation}
              disabled={isLoading}
            >
              重新发送激活邮件
            </Button>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </Button>
        </form>

        {/* 分隔线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
              或使用三方账号登录
            </span>
          </div>
        </div>

        {/* GitHub 登录 */}
        <Button
          variant="outline"
          className="w-full h-12 text-base"
          onClick={handleGitHubLogin}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          使用 GitHub 登录
        </Button>

        {/* 提示 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          还没有账号？{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            立即注册
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            忘记密码？
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-gray-500">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}