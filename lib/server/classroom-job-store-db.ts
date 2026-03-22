import { prisma } from '@/lib/db';
import type {
  ClassroomGenerationProgress,
  ClassroomGenerationStep,
  GenerateClassroomInput,
  GenerateClassroomResult,
} from '@/lib/server/classroom-generation';

export type ClassroomGenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ClassroomGenerationJob {
  id: string;
  status: ClassroomGenerationJobStatus;
  step: ClassroomGenerationStep | 'queued' | 'failed';
  progress: number;
  message: string;
  userId?: string;
  requirement: string;
  result?: {
    classroomId: string;
    url: string;
    scenesCount: number;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export function isValidClassroomJobId(jobId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(jobId);
}

export async function createClassroomGenerationJob(
  jobId: string,
  input: GenerateClassroomInput,
): Promise<ClassroomGenerationJob> {
  const job = await prisma.classroomGenerationJob.create({
    data: {
      id: jobId,
      status: 'queued',
      step: 'queued',
      progress: 0,
      message: 'Classroom generation job queued',
      userId: input.userId,
      requirement: input.requirement.slice(0, 500),
    },
  });

  return {
    id: job.id,
    status: job.status as ClassroomGenerationJobStatus,
    step: job.step as ClassroomGenerationStep,
    progress: job.progress,
    message: job.message || '',
    userId: job.userId || undefined,
    requirement: job.requirement || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function readClassroomGenerationJob(
  jobId: string,
): Promise<ClassroomGenerationJob | null> {
  const job = await prisma.classroomGenerationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return null;

  return {
    id: job.id,
    status: job.status as ClassroomGenerationJobStatus,
    step: job.step as ClassroomGenerationStep,
    progress: job.progress,
    message: job.message || '',
    userId: job.userId || undefined,
    requirement: job.requirement || '',
    result: job.result as ClassroomGenerationJob['result'],
    error: job.error || undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt || undefined,
    completedAt: job.completedAt || undefined,
  };
}

export async function markClassroomGenerationJobRunning(
  jobId: string,
): Promise<ClassroomGenerationJob> {
  const job = await prisma.classroomGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'running',
      startedAt: new Date(),
      message: 'Classroom generation started',
    },
  });

  return readClassroomGenerationJob(jobId) as Promise<ClassroomGenerationJob>;
}

export async function updateClassroomGenerationJobProgress(
  jobId: string,
  progress: ClassroomGenerationProgress,
): Promise<ClassroomGenerationJob> {
  const job = await prisma.classroomGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'running',
      step: progress.step,
      progress: progress.progress,
      message: progress.message,
    },
  });

  return readClassroomGenerationJob(jobId) as Promise<ClassroomGenerationJob>;
}

export async function markClassroomGenerationJobSucceeded(
  jobId: string,
  result: GenerateClassroomResult,
): Promise<ClassroomGenerationJob> {
  const job = await prisma.classroomGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'succeeded',
      step: 'completed',
      progress: 100,
      message: 'Classroom generation completed',
      completedAt: new Date(),
      result: {
        classroomId: result.id,
        url: result.url,
        scenesCount: result.scenesCount,
      },
    },
  });

  return readClassroomGenerationJob(jobId) as Promise<ClassroomGenerationJob>;
}

export async function markClassroomGenerationJobFailed(
  jobId: string,
  error: string,
): Promise<ClassroomGenerationJob> {
  const job = await prisma.classroomGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      step: 'failed',
      message: 'Classroom generation failed',
      completedAt: new Date(),
      error,
    },
  });

  return readClassroomGenerationJob(jobId) as Promise<ClassroomGenerationJob>;
}