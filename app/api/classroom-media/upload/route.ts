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
    if (!session?.user?.id) {
      return apiError(API_ERROR_CODES.UNAUTHORIZED, 401, '请先登录');
    }

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

    // 验证课堂所有权
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { userId: true },
    });

    if (!classroom || classroom.userId !== session.user.id) {
      return apiError(API_ERROR_CODES.UNAUTHORIZED, 403, '无权访问此课堂');
    }

    // 上传到 Vercel Blob
    const result = await uploadMediaBlob(classroomId, mediaId, file, type);

    // 保存到数据库
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