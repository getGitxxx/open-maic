import { type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { getAuthSession } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJobSync } from '@/lib/server/classroom-job-runner';
import {
  createClassroomGenerationJob,
  readClassroomGenerationJob,
} from '@/lib/server/classroom-job-store-db';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('GenerateClassroom API');

export const maxDuration = 300; // 5 minutes for long-running tasks

export async function POST(req: NextRequest) {
  let requirementSnippet: string | undefined;
  try {
    const session = await getAuthSession();

    const rawBody = (await req.json()) as Partial<GenerateClassroomInput>;
    requirementSnippet = rawBody.requirement?.substring(0, 60);
    const body: GenerateClassroomInput = {
      requirement: rawBody.requirement || '',
      ...(rawBody.pdfContent ? { pdfContent: rawBody.pdfContent } : {}),
      ...(rawBody.language ? { language: rawBody.language } : {}),
      ...(rawBody.enableWebSearch != null ? { enableWebSearch: rawBody.enableWebSearch } : {}),
      ...(rawBody.enableImageGeneration != null
        ? { enableImageGeneration: rawBody.enableImageGeneration }
        : {}),
      ...(rawBody.enableVideoGeneration != null
        ? { enableVideoGeneration: rawBody.enableVideoGeneration }
        : {}),
      ...(rawBody.enableTTS != null ? { enableTTS: rawBody.enableTTS } : {}),
      ...(rawBody.agentMode ? { agentMode: rawBody.agentMode } : {}),
    };
    const { requirement } = body;

    if (!requirement) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: requirement');
    }

    const baseUrl = buildRequestOrigin(req);
    const jobId = nanoid(10);

    // 创建 job 记录
    await createClassroomGenerationJob(jobId, {
      ...body,
      userId: session?.user?.id,
    });

    // 同步执行课堂生成（等待完成）
    const result = await runClassroomGenerationJobSync(jobId, body, baseUrl);

    return apiSuccess(
      {
        jobId,
        status: 'succeeded',
        result: {
          id: result.id,
          url: result.url,
          scenesCount: result.scenesCount,
        },
      },
      201,
    );
  } catch (error) {
    log.error(
      `Classroom generation job creation failed [requirement="${requirementSnippet ?? 'unknown'}..."]:`,
      error,
    );
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to generate classroom',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// 查询 job 状态
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required parameter: jobId');
  }

  const job = await readClassroomGenerationJob(jobId);

  if (!job) {
    return apiError('INVALID_REQUEST', 404, 'Job not found');
  }

  return apiSuccess({
    jobId: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error: job.error,
  });
}