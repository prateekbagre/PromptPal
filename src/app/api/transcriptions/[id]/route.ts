import { NextRequest, NextResponse } from 'next/server'
import {
  getTranscription,
  updateTranscription,
  deleteTranscription as deleteTranscriptionFromDb,
} from '@/lib/db-utils'

// GET a single transcription
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcription = await getTranscription(params.id)
    
    if (!transcription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transcription not found',
        },
        { status: 404 }
      )
    }
    
    // Transform to match frontend interface
    const formatted = {
      id: transcription.id,
      transcription: transcription.transcription,
      wordCount: transcription.wordCount,
      fileName: transcription.fileName,
      fileSize: transcription.fileSize,
      timestamp: transcription.createdAt.toISOString(),
      type: transcription.type as 'recording' | 'upload',
    }
    
    return NextResponse.json({
      success: true,
      transcription: formatted,
    })
  } catch (error) {
    console.error('[Transcriptions API] Error fetching transcription:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transcription',
      },
      { status: 500 }
    )
  }
}

// DELETE a transcription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteTranscriptionFromDb(params.id)
    
    return NextResponse.json({
      success: true,
      message: 'Transcription deleted successfully',
    })
  } catch (error) {
    console.error('[Transcriptions API] Error deleting transcription:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete transcription',
      },
      { status: 500 }
    )
  }
}

// PATCH update a transcription
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const result = await updateTranscription(params.id, body)
    
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
    console.error('[Transcriptions API] Error updating transcription:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transcription',
      },
      { status: 500 }
    )
  }
}
