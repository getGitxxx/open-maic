import { type NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { uploadMediaBlob } from '@/lib/server/blob-storage';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClassroomMediaUpload');

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();

    // 允许未登录用户上传（但不会关联到用户账户）
    // 这样媒体生成过程中不会因为登录状态而失败

    const formData = await request.formData();
    const classroomId = formData.get('classroomId') as string;
    const mediaId = formData.get('mediaId') as string;
    const type = formData.get('type') as 'image' | 'video' | 'audio';
    const file = formData.get('file') as Blob;

    if (!classroomId || !mediaId || !type || !file) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: classroomId, mediaId, type, file',
      );
    }

    // 如果用户已登录，验证课堂所有权
    if (session?.user?.id) {
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { userId: true },
      });

      // 如果课堂存在且有所有者，验证权限
      if (classroom?.userId && classroom.userId !== session.user.id) {
        return apiError(API_ERROR_CODES.UNAUTHORIZED, 403, '无权访问此课堂');
      }
    }

    // 上传到 Vercel Blob
    const result = await uploadMediaBlob(classroomId, mediaId, file, type);

    // 保存到数据库（如果课堂存在）
    try {
      await prisma.mediaFile.upsert({
        where: { id: mediaId },
        create: {
          id: mediaId,
          classroomId,
          type,
          blobUrl: result.url,
          mimeType: file.type,
          size: file.size,
        },
        update: {
          blobUrl: result.url,
          mimeType: file.type,
          size: file.size,
        },
      });
    } catch (dbError) {
      // 数据库写入失败不影响上传结果
      log.warn('Failed to save media to database:', dbError);
    }

    log.info(`Uploaded media: ${mediaId} for classroom: ${classroomId}`);

    return apiSuccess({
      id: mediaId,
      url: result.url,
    });
  } catch (error) {
    log.error('Media upload failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to upload media',
      error instanceof Error ? error.message : String(error),
    );
  }
}