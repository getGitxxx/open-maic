"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Classroom {
  id: string
  title: string
  createdAt: string
  scenesCount: number
}

export default function MyClassroomsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchClassrooms()
    }
  }, [status, router])

  const fetchClassrooms = async () => {
    try {
      const response = await fetch("/api/user/classrooms")
      const data = await response.json()

      if (response.ok) {
        setClassrooms(data.classrooms || [])
      }
    } catch (error) {
      console.error("获取课堂列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
          >
            ← 返回首页
          </Button>
          <Link
            href="/"
            className="text-blue-600 hover:underline text-sm"
          >
            创建新课堂
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            我的课堂
          </h1>

          {classrooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                暂无课堂记录
              </p>
              <Link href="/">
                <Button>创建第一个课堂</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {classrooms.map((classroom) => (
                <Link
                  key={classroom.id}
                  href={`/classroom/${classroom.id}`}
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {classroom.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {classroom.scenesCount} 个场景 · {formatDate(classroom.createdAt)}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}