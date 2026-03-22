"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function UserButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <Button variant="ghost" size="sm" disabled>
        加载中...
      </Button>
    )
  }

  if (status === "unauthenticated") {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => signIn()}
      >
        登录
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {session?.user?.image && (
        <img
          src={session.user.image}
          alt={session.user.name || "用户头像"}
          className="w-8 h-8 rounded-full"
        />
      )}
      <span className="text-sm font-medium hidden sm:inline">
        {session?.user?.name || session?.user?.email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
      >
        退出
      </Button>
    </div>
  )
}