import { NextRequest, NextResponse } from 'next/server';

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

    // Initialize ZAI SDK
    console.log('[Transcribe API] Initializing ZAI SDK...');
    
    let ZAI;
    try {
      ZAI = (await import('z-ai-web-dev-sdk')).default;
      console.log('[Transcribe API] ZAI SDK module loaded');
    } catch (e) {
      console.error('[Transcribe API] Failed to import ZAI SDK:', e);
      return NextResponse.json(
        { success: false, error: 'Speech recognition service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    let zai;
    try {
      zai = await ZAI.create();
      console.log('[Transcribe API] ZAI SDK initialized');
    } catch (e) {
      console.error('[Transcribe API] Failed to initialize ZAI:', e);
      return NextResponse.json(
        { success: false, error: 'Speech recognition service unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    // Perform transcription with retry logic
    console.log('[Transcribe API] Calling ASR service...');
    let asrResponse;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Transcribe API] ASR attempt ${attempt}/2`);
        asrResponse = await zai.audio.asr.create({
          file_base64: base64Audio
        });
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
      
      // Provide user-friendly error messages
      if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
        return NextResponse.json(
          { success: false, error: 'Speech recognition service is temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Transcription failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    const transcription = asrResponse.text || '';
    const wordCount = transcription.trim() ? transcription.trim().split(/\s+/).length : 0;

    console.log(`[Transcribe API] ========== Success ==========`);
    console.log(`[Transcribe API] Word count: ${wordCount}`);
    console.log(`[Transcribe API] Preview: ${transcription.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      transcription: transcription,
      wordCount: wordCount,
      fileName: audioFile.name,
      fileSize: audioFile.size,
      timestamp: new Date().toISOString()
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
