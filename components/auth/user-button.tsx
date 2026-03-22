"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"

export function UserButton() {
  const { data: session, status } = useSession()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return (
      <Button variant="ghost" size="sm" disabled>
        加载中...
      </Button>
    )
  }

  if (status === "unauthenticated") {
    return (
      <Button variant="default" size="sm" onClick={() => signIn()}>
        登录
      </Button>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {session?.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "用户头像"}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${showMenu ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {session?.user?.email}
            </p>
          </div>

          <Link
            href="/my-classrooms"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setShowMenu(false)}
          >
            📚 我的课堂
          </Link>

          <Link
            href="/settings"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setShowMenu(false)}
          >
            ⚙️ 账号设置
          </Link>

          <button
            onClick={() => {
              setShowMenu(false)
              signOut()
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}