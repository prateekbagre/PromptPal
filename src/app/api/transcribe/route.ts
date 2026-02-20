import { NextRequest, NextResponse } from 'next/server';
import { createTranscription } from '@/lib/db-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log('[Transcribe API] ========== Request received ==========');
  
  try {
    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
      console.log('[Transcribe API] Form data parsed successfully');
    } catch (e) {
      console.error('[Transcribe API] Failed to parse form data:', e);
      return NextResponse.json(
        { success: false, error: 'Failed to parse request data' },
        { status: 400 }
      );
    }

    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      console.log('[Transcribe API] No audio file in request');
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log(`[Transcribe API] Audio file: ${audioFile.name}`);
    console.log(`[Transcribe API] Size: ${audioFile.size} bytes`);
    console.log(`[Transcribe API] Type: ${audioFile.type || 'unknown'}`);

    // Validate file type - be permissive
    const hasValidExtension = audioFile.name.match(/\.(wav|mp3|m4a|ogg|webm|mp4|aac)$/i);
    
    if (!hasValidExtension) {
      console.log(`[Transcribe API] Invalid file extension`);
      return NextResponse.json(
        { success: false, error: 'Invalid audio format. Supported: WAV, MP3, M4A, OGG, WEBM, AAC' },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = 50 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    if (audioFile.size < 500) {
      return NextResponse.json(
        { success: false, error: 'Audio file is too small. Please record at least 2-3 seconds.' },
        { status: 400 }
      );
    }

    // Convert audio file to base64
    console.log('[Transcribe API] Converting audio to base64...');
    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Audio = Buffer.from(uint8Array).toString('base64');
    console.log(`[Transcribe API] Base64 length: ${base64Audio.length} characters`);

    // Get API key from environment
    const apiKey = process.env.ZAI_API_KEY;
    console.log('[Transcribe API] Checking for API key:', { 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey?.length || 0,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'none'
    });
    
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ZAI_API_KEY not found in environment variables. Please set it in your .env file.' 
        },
        { status: 503 }
      );
    }

    // Use HTTP API directly instead of SDK to avoid config file issues
    console.log('[Transcribe API] Using Z.AI HTTP API directly...');
    let asrResponse;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Transcribe API] ASR attempt ${attempt}/2`);
        
        // Call Z.AI HTTP API directly
        const response = await fetch('https://api.z.ai/api/paas/v4/audio/asr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Accept-Language': 'en-US,en'
          },
          body: JSON.stringify({
            file_base64: base64Audio
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        asrResponse = await response.json();
        console.log('[Transcribe API] ASR call successful');
        break; // Success, exit retry loop
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Unknown ASR error');
        console.error(`[Transcribe API] ASR attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < 2) {
          console.log('[Transcribe API] Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!asrResponse) {
      console.error('[Transcribe API] All ASR attempts failed');
      const errorMessage = lastError?.message || 'Speech recognition service unavailable';
      const errorStack = lastError instanceof Error ? lastError.stack : undefined;
      
      console.error('[Transcribe API] Error details:', {
        message: errorMessage,
        stack: errorStack,
        error: lastError
      });
      
      // Provide user-friendly error messages
      if (errorMessage.includes('fetch failed') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { success: false, error: 'Speech recognition service is temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        );
      }
      
      if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed. Please check your API key in .env file.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Transcription failed: ${errorMessage}. Please check the server logs for more details.` 
        },
        { status: 500 }
      );
    }

    // Extract transcription from response (adjust based on actual API response format)
    const transcription = asrResponse.text || asrResponse.data?.text || asrResponse.result?.text || '';
    const wordCount = transcription.trim() ? transcription.trim().split(/\s+/).length : 0;

    console.log(`[Transcribe API] ========== Success ==========`);
    console.log(`[Transcribe API] Word count: ${wordCount}`);
    console.log(`[Transcribe API] Preview: ${transcription.substring(0, 100)}...`);

    // Determine type from file name or default to 'upload'
    const type = audioFile.name.includes('recording') || audioFile.name.includes('webm') 
      ? 'recording' as const 
      : 'upload' as const;

    // Save to database
    let dbTranscription;
    try {
      dbTranscription = await createTranscription({
        transcription,
        wordCount,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        type,
      });
      console.log(`[Transcribe API] Saved to database with ID: ${dbTranscription.id}`);
    } catch (dbError) {
      console.error('[Transcribe API] Failed to save to database:', dbError);
      // Continue even if database save fails - return the transcription anyway
    }

    return NextResponse.json({
      success: true,
      transcription: transcription,
      wordCount: wordCount,
      fileName: audioFile.name,
      fileSize: audioFile.size,
      timestamp: dbTranscription?.createdAt.toISOString() || new Date().toISOString(),
      id: dbTranscription?.id || Date.now().toString(), // Use DB ID if available, fallback to timestamp
    });

  } catch (error: unknown) {
    console.error('[Transcribe API] ========== Unexpected error ==========');
    console.error(error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
