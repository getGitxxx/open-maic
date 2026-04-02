import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClassroomMediaList');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;

    if (!classroomId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing classroomId');
    }

    // 获取课堂的所有媒体文件
    const mediaFiles = await prisma.mediaFile.findMany({
      where: { classroomId },
      select: {
        id: true,
        type: true,
        blobUrl: true,
        mimeType: true,
        size: true,
      },
    });

    // 转换为 { id: url } 格式便于前端使用
    const mediaMap: Record<string, { url: string; type: string; mimeType?: string }> = {};
    for (const media of mediaFiles) {
      mediaMap[media.id] = {
        url: media.blobUrl,
        type: media.type,
        mimeType: media.mimeType || undefined,
      };
    }

    return apiSuccess({
      classroomId,
      media: mediaMap,
      count: mediaFiles.length,
    });
  } catch (error) {
    log.error('Failed to get classroom media:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to get classroom media',
      error instanceof Error ? error.message : String(error),
    );
  }
}