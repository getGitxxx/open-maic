import { createLogger } from '@/lib/logger';
import { generateClassroom, type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import {
  markClassroomGenerationJobFailed,
  markClassroomGenerationJobRunning,
  markClassroomGenerationJobSucceeded,
  updateClassroomGenerationJobProgress,
} from '@/lib/server/classroom-job-store-db';

const log = createLogger('ClassroomJob');

/**
 * 同步执行课堂生成任务
 * 直接等待任务完成，不使用 after() API
 */
export async function runClassroomGenerationJobSync(
  jobId: string,
  input: GenerateClassroomInput,
  baseUrl: string,
): Promise<{
  id: string;
  url: string;
  scenesCount: number;
}> {
  try {
    await markClassroomGenerationJobRunning(jobId);

    const result = await generateClassroom(input, {
      baseUrl,
      onProgress: async (progress) => {
        await updateClassroomGenerationJobProgress(jobId, progress);
      },
    });

    await markClassroomGenerationJobSucceeded(jobId, result);

    log.info(`Classroom generation completed: ${result.id}`);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Classroom generation job ${jobId} failed:`, error);

    await markClassroomGenerationJobFailed(jobId, message);

    throw error;
  }
}