import { db } from './db'
import type { Prisma } from '@prisma/client'

// Types
export type TranscriptionCreateInput = {
  transcription: string
  wordCount: number
  fileName: string
  fileSize: number
  type: 'recording' | 'upload'
}

export type EnhancedPromptCreateInput = {
  transcriptionId: string
  enhancedPrompt: string
  summary: string
  originalText: string
  targetAgent: string
  promptStyle: string
  suggestedFollowUps?: string[]
}

// Transcription CRUD operations
export async function createTranscription(data: TranscriptionCreateInput) {
  return await db.transcription.create({
    data,
  })
}

export async function getTranscription(id: string) {
  return await db.transcription.findUnique({
    where: { id },
    include: {
      enhancedPrompts: {
        include: {
          suggestedFollowUps: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })
}

export async function getAllTranscriptions(limit = 20) {
  return await db.transcription.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      enhancedPrompts: {
        include: {
          suggestedFollowUps: true,
        },
      },
    },
  })
}

export async function updateTranscription(
  id: string,
  data: Partial<TranscriptionCreateInput>
) {
  return await db.transcription.update({
    where: { id },
    data,
  })
}

export async function deleteTranscription(id: string) {
  return await db.transcription.delete({
    where: { id },
  })
}

// Enhanced Prompt operations
export async function createEnhancedPrompt(data: EnhancedPromptCreateInput) {
  const { suggestedFollowUps, ...promptData } = data
  
  return await db.enhancedPrompt.create({
    data: {
      ...promptData,
      suggestedFollowUps: suggestedFollowUps
        ? {
            create: suggestedFollowUps.map((text) => ({ followUpText: text })),
          }
        : undefined,
    },
    include: {
      suggestedFollowUps: true,
      transcription: true,
    },
  })
}

export async function getEnhancedPrompt(id: string) {
  return await db.enhancedPrompt.findUnique({
    where: { id },
    include: {
      suggestedFollowUps: true,
      transcription: true,
    },
  })
}

export async function getEnhancedPromptsByTranscription(transcriptionId: string) {
  return await db.enhancedPrompt.findMany({
    where: { transcriptionId },
    include: {
      suggestedFollowUps: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function deleteEnhancedPrompt(id: string) {
  return await db.enhancedPrompt.delete({
    where: { id },
  })
}

// Database health check
export async function checkDatabaseConnection() {
  try {
    await db.$queryRaw`SELECT 1`
    return { connected: true, error: null }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Statistics
export async function getTranscriptionStats() {
  const [total, byType, recent] = await Promise.all([
    db.transcription.count(),
    db.transcription.groupBy({
      by: ['type'],
      _count: true,
    }),
    db.transcription.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    }),
  ])

  return {
    total,
    byType: byType.reduce(
      (acc, item) => {
        acc[item.type] = item._count
        return acc
      },
      {} as Record<string, number>
    ),
    recent,
  }
}
