import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import type { Scene, Stage } from '@/lib/types/stage';
import { prisma } from '@/lib/db';

// 本地开发时的文件存储目录（兼容旧数据）
export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');
export const CLASSROOM_JOBS_DIR = path.join(process.cwd(), 'data', 'classroom-jobs');

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

export async function ensureClassroomsDir() {
  await ensureDir(CLASSROOMS_DIR);
}

export async function ensureClassroomJobsDir() {
  await ensureDir(CLASSROOM_JOBS_DIR);
}

export async function writeJsonFileAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, 'utf-8');
  await fs.rename(tempFilePath, filePath);
}

export function buildRequestOrigin(req: NextRequest): string {
  return req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
    : req.nextUrl.origin;
}

export interface PersistedClassroomData {
  id: string;
  stage: Stage;
  scenes: Scene[];
  createdAt: string;
  userId?: string;
  title?: string;
}

export function isValidClassroomId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * 读取课件数据
 * 优先从数据库读取，fallback 到文件系统（兼容旧数据）
 */
export async function readClassroom(id: string): Promise<PersistedClassroomData | null> {
  try {
    // 先从数据库读取
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { order: 'asc' },
        },
        mediaFiles: true,
      },
    });

    if (classroom) {
      // 从数据库数据构建返回格式
      return {
        id: classroom.id,
        stage: (classroom.stageData as unknown as Stage) || {
          id: classroom.id,
          name: classroom.title || '未命名课堂',
          scenes: [],
        },
        scenes: classroom.scenes.map((scene) => ({
          id: scene.id,
          stageId: classroom.id,
          type: scene.type as Scene['type'],
          title: scene.title || '',
          order: scene.order,
          content: scene.content as unknown as Scene['content'],
          actions: scene.actions as unknown as Scene['actions'],
          whiteboards: scene.whiteboard as unknown as Scene['whiteboards'],
        })),
        createdAt: classroom.createdAt.toISOString(),
        userId: classroom.userId || undefined,
        title: classroom.title || undefined,
      };
    }

    // Fallback: 从文件系统读取（兼容旧数据）
    const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as PersistedClassroomData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    // 数据库错误或文件系统错误
    console.error('readClassroom error:', error);
    return null;
  }
}

/**
 * 保存课件数据
 * 同时保存到数据库和文件系统（双写，保证可靠性）
 */
export async function persistClassroom(
  data: {
    id: string;
    stage: Stage;
    scenes: Scene[];
    userId?: string;
    title?: string;
  },
  baseUrl: string,
): Promise<PersistedClassroomData & { url: string }> {
  const classroomData: PersistedClassroomData = {
    id: data.id,
    stage: data.stage,
    scenes: data.scenes,
    createdAt: new Date().toISOString(),
    userId: data.userId,
    title: data.title,
  };

  try {
    // 保存到数据库
    await prisma.classroom.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        userId: data.userId,
        title: data.title || data.stage.name,
        stageData: data.stage as any,
        status: 'completed',
      },
      update: {
        userId: data.userId,
        title: data.title || data.stage.name,
        stageData: data.stage as any,
        updatedAt: new Date(),
      },
    });

    // 保存场景数据
    for (let i = 0; i < data.scenes.length; i++) {
      const scene = data.scenes[i];
      await prisma.scene.upsert({
        where: { id: scene.id },
        create: {
          id: scene.id,
          classroomId: data.id,
          order: i,
          type: scene.type,
          title: scene.title,
          content: scene.content as any,
          actions: scene.actions as any,
          whiteboard: scene.whiteboards as any,
        },
        update: {
          order: i,
          type: scene.type,
          title: scene.title,
          content: scene.content as any,
          actions: scene.actions as any,
          whiteboard: scene.whiteboards as any,
          updatedAt: new Date(),
        },
      });
    }

    // 删除不在当前场景列表中的旧场景
    const sceneIds = data.scenes.map((s) => s.id);
    await prisma.scene.deleteMany({
      where: {
        classroomId: data.id,
        id: { notIn: sceneIds },
      },
    });
  } catch (error) {
    console.error('Failed to save classroom to database:', error);
    // 继续保存到文件系统作为 fallback
  }

  // 同时保存到文件系统（双写，保证可靠性）
  try {
    await ensureClassroomsDir();
    const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
    await writeJsonFileAtomic(filePath, classroomData);
  } catch (error) {
    console.error('Failed to save classroom to file system:', error);
  }

  return {
    ...classroomData,
    url: `${baseUrl}/classroom/${data.id}`,
  };
}

/**
 * 获取用户的所有课件
 */
export async function getUserClassrooms(userId: string): Promise<{
  id: string;
  title: string;
  createdAt: string;
  scenesCount: number;
}[]> {
  try {
    // 从数据库读取
    const classrooms = await prisma.classroom.findMany({
      where: { userId },
      include: {
        _count: {
          select: { scenes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return classrooms.map((c) => ({
      id: c.id,
      title: c.title || '未命名课堂',
      createdAt: c.createdAt.toISOString(),
      scenesCount: c._count.scenes,
    }));
  } catch (error) {
    console.error('Failed to get user classrooms from database:', error);
    return [];
  }
}

/**
 * 删除课件
 */
export async function deleteClassroom(id: string): Promise<boolean> {
  try {
    // 从数据库删除（级联删除 scenes 和 mediaFiles）
    await prisma.classroom.delete({
      where: { id },
    });

    // 删除文件系统中的文件
    const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);
    await fs.unlink(filePath).catch(() => {});

    return true;
  } catch (error) {
    console.error('Failed to delete classroom:', error);
    return false;
  }
}