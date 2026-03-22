import { prisma } from "./db"

// 课堂创建参数
interface CreateClassroomParams {
  id: string
  userId: string | null
  title?: string
  requirement?: string
  status?: string
}

// 创建课堂
export async function createClassroom(params: CreateClassroomParams) {
  return prisma.classroom.create({
    data: {
      id: params.id,
      userId: params.userId,
      title: params.title,
      requirement: params.requirement,
      status: params.status || "completed",
    },
  })
}

// 获取用户的课堂列表
export async function getUserClassrooms(userId: string) {
  return prisma.classroom.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

// 获取课堂详情（验证所有权）
export async function getClassroomById(classroomId: string, userId?: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  })

  if (!classroom) {
    return null
  }

  // 如果课堂有所有者，验证用户是否有权限访问
  if (classroom.userId && classroom.userId !== userId) {
    return { ...classroom, hasAccess: false }
  }

  return { ...classroom, hasAccess: true }
}

// 更新课堂
export async function updateClassroom(
  classroomId: string,
  userId: string,
  data: { title?: string; status?: string }
) {
  // 验证所有权
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  })

  if (!classroom || classroom.userId !== userId) {
    return null
  }

  return prisma.classroom.update({
    where: { id: classroomId },
    data,
  })
}

// 删除课堂
export async function deleteClassroom(classroomId: string, userId: string) {
  // 验证所有权
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  })

  if (!classroom || classroom.userId !== userId) {
    return false
  }

  await prisma.classroom.delete({
    where: { id: classroomId },
  })

  return true
}