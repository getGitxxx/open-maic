/**
 * 媒体文件云端同步工具
 * 负责将 IndexedDB 中的媒体文件上传到云端，以及从云端下载到本地
 */

import { db } from './database';
import { createLogger } from '@/lib/logger';

const log = createLogger('MediaSync');

export interface MediaSyncResult {
  uploaded: number;
  failed: number;
  errors: string[];
}

/**
 * 上传单个媒体文件到云端
 */
export async function uploadMediaToCloud(
  classroomId: string,
  mediaId: string,
  blob: Blob,
  type: 'image' | 'video' | 'audio'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('classroomId', classroomId);
    formData.append('mediaId', mediaId);
    formData.append('type', type);
    formData.append('file', blob);

    const response = await fetch('/api/classroom-media/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Upload failed' };
    }

    const data = await response.json();
    return { success: true, url: data.data?.url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 上传课堂的所有媒体文件到云端
 */
export async function syncMediaToCloud(classroomId: string): Promise<MediaSyncResult> {
  const result: MediaSyncResult = {
    uploaded: 0,
    failed: 0,
    errors: [],
  };

  try {
    // 获取 IndexedDB 中该课堂的所有媒体文件
    const mediaFiles = await db.mediaFiles.where('stageId').equals(classroomId).toArray();

    if (mediaFiles.length === 0) {
      log.info('No media files to sync for classroom:', classroomId);
      return result;
    }

    log.info(`Syncing ${mediaFiles.length} media files for classroom: ${classroomId}`);

    // 并行上传（限制并发数）
    const batchSize = 3;
    for (let i = 0; i < mediaFiles.length; i += batchSize) {
      const batch = mediaFiles.slice(i, i + batchSize);
      const uploadResults = await Promise.all(
        batch.map(async (media) => {
          const uploadResult = await uploadMediaToCloud(
            classroomId,
            media.id.split(':')[1] || media.id, // 提取 elementId
            media.blob,
            media.type
          );

          if (uploadResult.success && uploadResult.url) {
            // 更新 IndexedDB 中的 ossKey
            await db.mediaFiles.update(media.id, { ossKey: uploadResult.url });
            result.uploaded++;
          } else {
            result.failed++;
            result.errors.push(`${media.id}: ${uploadResult.error}`);
          }

          return uploadResult;
        })
      );
    }

    log.info(`Sync completed: ${result.uploaded} uploaded, ${result.failed} failed`);
  } catch (error) {
    log.error('Failed to sync media to cloud:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * 从云端下载媒体文件到本地 IndexedDB
 */
export async function syncMediaFromCloud(classroomId: string): Promise<MediaSyncResult> {
  const result: MediaSyncResult = {
    uploaded: 0,
    failed: 0,
    errors: [],
  };

  try {
    // 获取云端的媒体文件列表
    const response = await fetch(`/api/classroom-media/${classroomId}`);

    if (!response.ok) {
      log.warn('Failed to fetch media list from cloud');
      return result;
    }

    const data = await response.json();
    const mediaMap = data.data?.media || {};

    const mediaIds = Object.keys(mediaMap);
    if (mediaIds.length === 0) {
      log.info('No cloud media files to sync for classroom:', classroomId);
      return result;
    }

    log.info(`Syncing ${mediaIds.length} media files from cloud for classroom: ${classroomId}`);

    // 检查哪些文件需要下载（本地没有或已过期）
    const localMediaIds = await db.mediaFiles.where('stageId').equals(classroomId).primaryKeys();
    const missingIds = mediaIds.filter((id) => !localMediaIds.includes(`${classroomId}:${id}`));

    // 并行下载
    const batchSize = 3;
    for (let i = 0; i < missingIds.length; i += batchSize) {
      const batch = missingIds.slice(i, i + batchSize);
      const downloadResults = await Promise.all(
        batch.map(async (mediaId) => {
          const mediaInfo = mediaMap[mediaId];
          try {
            const blobResponse = await fetch(mediaInfo.url);
            if (!blobResponse.ok) {
              return { success: false, error: `HTTP ${blobResponse.status}` };
            }

            const blob = await blobResponse.blob();

            // 保存到 IndexedDB
            await db.mediaFiles.put({
              id: `${classroomId}:${mediaId}`,
              stageId: classroomId,
              type: mediaInfo.type,
              blob,
              mimeType: mediaInfo.mimeType || blob.type,
              size: blob.size,
              prompt: '',
              params: '{}',
              ossKey: mediaInfo.url,
              createdAt: Date.now(),
            });

            return { success: true };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      for (const downloadResult of downloadResults) {
        if (downloadResult.success) {
          result.uploaded++;
        } else {
          result.failed++;
          result.errors.push(downloadResult.error || 'Download failed');
        }
      }
    }

    log.info(`Sync from cloud completed: ${result.uploaded} downloaded, ${result.failed} failed`);
  } catch (error) {
    log.error('Failed to sync media from cloud:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * 获取媒体文件的 URL（优先本地，fallback 到云端）
 */
export async function getMediaUrl(
  classroomId: string,
  elementId: string
): Promise<string | null> {
  const compoundKey = `${classroomId}:${elementId}`;

  // 1. 先检查本地 IndexedDB
  const localMedia = await db.mediaFiles.get(compoundKey);
  if (localMedia?.blob) {
    return URL.createObjectURL(localMedia.blob);
  }

  // 2. 检查 IndexedDB 中是否有云端 URL
  if (localMedia?.ossKey) {
    return localMedia.ossKey;
  }

  // 3. 从云端获取
  try {
    const response = await fetch(`/api/classroom-media/${classroomId}`);
    if (!response.ok) return null;

    const data = await response.json();
    const mediaMap = data.data?.media || {};

    if (mediaMap[elementId]?.url) {
      return mediaMap[elementId].url;
    }
  } catch (error) {
    log.warn('Failed to get media URL from cloud:', error);
  }

  return null;
}