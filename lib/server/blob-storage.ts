import { put, del, head } from '@vercel/blob';

/**
 * Vercel Blob 存储工具
 * 用于存储课件中的媒体文件（音频、图片、视频）
 */

export interface BlobUploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
}

/**
 * 上传文件到 Vercel Blob
 */
export async function uploadToBlob(
  pathname: string,
  data: Blob | File | Buffer | string,
  options?: {
    contentType?: string;
    cacheControlMaxAge?: number;
  }
): Promise<BlobUploadResult> {
  const result = await put(pathname, data, {
    access: 'public',
    contentType: options?.contentType,
    cacheControlMaxAge: options?.cacheControlMaxAge ?? 31536000, // 1 year
  });

  return {
    url: result.url,
    downloadUrl: result.downloadUrl,
    pathname: result.pathname,
  };
}

/**
 * 上传 Base64 编码的图片
 */
export async function uploadBase64Image(
  classroomId: string,
  imageId: string,
  base64Data: string
): Promise<BlobUploadResult> {
  // 解析 base64 数据
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }

  const mimeType = matches[1];
  const base64 = matches[2];
  const buffer = Buffer.from(base64, 'base64');

  const pathname = `classrooms/${classroomId}/images/${imageId}`;
  
  return uploadToBlob(pathname, buffer, { contentType: mimeType });
}

/**
 * 上传音频 Blob
 */
export async function uploadAudioBlob(
  classroomId: string,
  audioId: string,
  blob: Blob,
  format: string = 'mp3'
): Promise<BlobUploadResult> {
  const pathname = `classrooms/${classroomId}/audio/${audioId}.${format}`;
  const buffer = await blob.arrayBuffer();
  
  return uploadToBlob(pathname, Buffer.from(buffer), {
    contentType: `audio/${format}`,
  });
}

/**
 * 上传视频 Blob
 */
export async function uploadVideoBlob(
  classroomId: string,
  videoId: string,
  blob: Blob,
  format: string = 'mp4'
): Promise<BlobUploadResult> {
  const pathname = `classrooms/${classroomId}/videos/${videoId}.${format}`;
  const buffer = await blob.arrayBuffer();
  
  return uploadToBlob(pathname, Buffer.from(buffer), {
    contentType: `video/${format}`,
  });
}

/**
 * 删除文件
 */
export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}

/**
 * 检查文件是否存在
 */
export async function checkBlobExists(url: string): Promise<boolean> {
  try {
    const result = await head(url);
    return !!result;
  } catch {
    return false;
  }
}

/**
 * 批量删除课堂的所有媒体文件
 * 注意：Vercel Blob 不支持目录删除，需要逐个删除
 */
export async function deleteClassroomMedia(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  
  await Promise.all(urls.map(url => del(url)));
}

/**
 * 从 IndexedDB 数据迁移：上传媒体文件到 Blob
 */
export async function migrateMediaToBlob(
  classroomId: string,
  mediaType: 'audio' | 'image' | 'video',
  mediaId: string,
  blob: Blob
): Promise<BlobUploadResult> {
  switch (mediaType) {
    case 'audio':
      return uploadAudioBlob(classroomId, mediaId, blob);
    case 'image':
      return uploadBase64Image(classroomId, mediaId, await blobToBase64(blob));
    case 'video':
      return uploadVideoBlob(classroomId, mediaId, blob);
    default:
      throw new Error(`Unknown media type: ${mediaType}`);
  }
}

/**
 * Blob 转 Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${blob.type};base64,${base64}`;
}