import { NextRequest, NextResponse } from 'next/server'
import { createEnhancedPrompt } from '@/lib/db-utils'

// POST create an enhanced prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      transcriptionId,
      enhancedPrompt,
      summary,
      originalText,
      targetAgent,
      promptStyle,
      suggestedFollowUps,
    } = body
    
    if (
      !transcriptionId ||
      !enhancedPrompt ||
      !summary ||
      !originalText ||
      !targetAgent ||
      !promptStyle
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      )
    }
    
    const result = await createEnhancedPrompt({
      transcriptionId,
      enhancedPrompt,
      summary,
      originalText,
      targetAgent,
      promptStyle,
      suggestedFollowUps: suggestedFollowUps || [],
    })
    
    // Transform to match frontend interface
    const formatted = {
      id: result.id,
      enhancedPrompt: result.enhancedPrompt,
      summary: result.summary,
      originalText: result.originalText,
      targetAgent: result.targetAgent,
      promptStyle: result.promptStyle,
      suggestedFollowUps: result.suggestedFollowUps.map((f) => f.followUpText),
    }
    
    return NextResponse.json({
      success: true,
      enhancedPrompt: formatted,
    })
  } catch (error) {
    console.error('[Enhanced Prompts API] Error creating enhanced prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create enhanced prompt',
      },
      { status: 500 }
    )
  }
}
