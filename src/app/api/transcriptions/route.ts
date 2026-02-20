import { NextRequest, NextResponse } from 'next/server'
import {
  getAllTranscriptions,
  createTranscription,
  deleteTranscription,
} from '@/lib/db-utils'

// GET all transcriptions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    
    const transcriptions = await getAllTranscriptions(limit)
    
    // Transform to match the frontend interface
    const formatted = transcriptions.map((t) => ({
      id: t.id,
      transcription: t.transcription,
      wordCount: t.wordCount,
      fileName: t.fileName,
      fileSize: t.fileSize,
      timestamp: t.createdAt.toISOString(),
      type: t.type as 'recording' | 'upload',
    }))
    
    return NextResponse.json({
      success: true,
      transcriptions: formatted,
    })
  } catch (error) {
    console.error('[Transcriptions API] Error fetching transcriptions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transcriptions',
      },
      { status: 500 }
    )
  }
}

// POST create a new transcription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcription, wordCount, fileName, fileSize, type } = body
    
    if (!transcription || !fileName || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: transcription, fileName, type',
        },
        { status: 400 }
      )
    }
    
    const result = await createTranscription({
      transcription,
      wordCount: wordCount || 0,
      fileName,
      fileSize: fileSize || 0,
      type: type as 'recording' | 'upload',
    })
    
    // Transform to match frontend interface
    const formatted = {
      id: result.id,
      transcription: result.transcription,
      wordCount: result.wordCount,
      fileName: result.fileName,
      fileSize: result.fileSize,
      timestamp: result.createdAt.toISOString(),
      type: result.type as 'recording' | 'upload',
    }
    
    return NextResponse.json({
      success: true,
      transcription: formatted,
    })
  } catch (error) {
    console.error('[Transcriptions API] Error creating transcription:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transcription',
      },
      { status: 500 }
    )
  }
}
