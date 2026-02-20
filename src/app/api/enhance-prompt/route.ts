import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  console.log('[Enhance Prompt API] Request received');
  
  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('[Enhance Prompt API] Failed to parse request body:', e);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { text, language, targetAgent, promptStyle } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No text provided for enhancement' },
        { status: 400 }
      );
    }

    if (text.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Text is too short to enhance (minimum 5 characters)' },
        { status: 400 }
      );
    }

    console.log(`[Enhance Prompt API] Text length: ${text.length}`);
    console.log(`[Enhance Prompt API] Target: ${targetAgent}, Style: ${promptStyle}`);

    // Import ZAI SDK
    let ZAI;
    try {
      ZAI = (await import('z-ai-web-dev-sdk')).default;
      console.log('[Enhance Prompt API] ZAI SDK imported');
    } catch (e) {
      console.error('[Enhance Prompt API] Failed to import ZAI SDK:', e);
      return NextResponse.json(
        { success: false, error: 'Failed to load AI SDK' },
        { status: 500 }
      );
    }

    // Initialize ZAI
    let zai;
    try {
      // Try to initialize with API key from environment variable if available
      const apiKey = process.env.ZAI_API_KEY;
      console.log('[Enhance Prompt API] Checking for API key:', { 
        hasApiKey: !!apiKey, 
        apiKeyLength: apiKey?.length || 0 
      });
      
      if (apiKey && apiKey.trim()) {
        // Try different initialization methods
        try {
          zai = await ZAI.create({ apiKey: apiKey.trim() });
          console.log('[Enhance Prompt API] ZAI SDK initialized with API key');
        } catch (createError1) {
          try {
            zai = await ZAI.create({ api_key: apiKey.trim() });
            console.log('[Enhance Prompt API] ZAI SDK initialized with API key (alt method)');
          } catch (createError2) {
            const { join } = await import('path');
            const configPath = join(process.cwd(), '.z-ai-config');
            zai = await ZAI.create({ configPath });
            console.log('[Enhance Prompt API] ZAI SDK initialized from config file');
          }
        }
      } else {
        const { join } = await import('path');
        const configPath = join(process.cwd(), '.z-ai-config');
        console.log('[Enhance Prompt API] No API key in env, trying config file at:', configPath);
        zai = await ZAI.create({ configPath });
        console.log('[Enhance Prompt API] ZAI SDK initialized from config file');
      }
    } catch (e) {
      const errorDetails = e instanceof Error ? e.message : String(e);
      console.error('[Enhance Prompt API] Failed to initialize ZAI:', errorDetails, e);
      
      if (errorDetails.includes('Configuration file not found') || errorDetails.includes('.z-ai-config')) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Z.AI configuration not found. API key from env: ${process.env.ZAI_API_KEY ? 'found' : 'not found'}. Please ensure ZAI_API_KEY is set in .env file or .z-ai-config exists in project root.` 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Failed to initialize AI service: ${errorDetails}` },
        { status: 500 }
      );
    }

    // Build the enhancement prompt based on target agent and style
    const agentInstructions: Record<string, string> = {
      chatgpt: 'Optimize for ChatGPT - use clear, structured prompts with specific instructions. Break complex tasks into steps.',
      claude: 'Optimize for Claude - use natural language, provide context and examples. Claude works well with detailed instructions.',
      gemini: 'Optimize for Gemini - be concise and direct. Use bullet points for multiple requirements.',
      copilot: 'Optimize for GitHub Copilot - use code comments style, specific technical requirements.',
      midjourney: 'Optimize for Midjourney - focus on visual descriptions, artistic style, lighting, and composition.',
      dalle: 'Optimize for DALL-E - describe the image clearly with style, mood, and details.',
      general: 'Create a versatile prompt that works well across different AI systems.',
    };

    const styleInstructions: Record<string, string> = {
      creative: 'Make the prompt creative and imaginative. Encourage unique and innovative responses.',
      professional: 'Make the prompt professional and business-oriented. Focus on clarity and actionable outputs.',
      technical: 'Make the prompt technical and precise. Include specific requirements and constraints.',
      educational: 'Make the prompt educational and explanatory. Structure it for learning and understanding.',
      conversational: 'Make the prompt conversational and natural. Sound like talking to a helpful assistant.',
    };

    const systemPrompt = `You are an expert prompt engineer who transforms raw text into highly effective prompts for AI systems. Your task is to enhance the given text into a well-structured, optimized prompt.

Guidelines for enhancement:
1. ${agentInstructions[targetAgent] || agentInstructions.general}
2. ${styleInstructions[promptStyle] || styleInstructions.professional}
3. Create the prompt in English.
4. Preserve the core intent and meaning of the original text
5. Add necessary context and clarity
6. Structure the prompt for optimal AI understanding
7. Remove filler words and improve clarity

IMPORTANT: Respond ONLY with valid JSON, no markdown formatting. Use this exact format:
{
  "enhancedPrompt": "the enhanced prompt text here",
  "summary": "brief explanation of what was improved",
  "suggestedFollowUps": ["suggested follow-up prompt 1", "suggested follow-up prompt 2"]
}`;

    const userPrompt = `Transform this text into an optimized prompt for ${targetAgent}:

Original Text:
"""
${text}
"""

Target AI Agent: ${targetAgent}
Preferred Style: ${promptStyle}`;

    // Call LLM
    let completion;
    try {
      completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      });
      console.log('[Enhance Prompt API] LLM response received');
    } catch (e) {
      console.error('[Enhance Prompt API] LLM call error:', e);
      const errorMessage = e instanceof Error ? e.message : 'LLM call failed';
      return NextResponse.json(
        { success: false, error: `AI service error: ${errorMessage}` },
        { status: 500 }
      );
    }

    const response = completion.choices[0]?.message?.content || '';
    
    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Empty response from AI service' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      const result = JSON.parse(jsonStr);

      return NextResponse.json({
        success: true,
        enhancedPrompt: result.enhancedPrompt || text,
        summary: result.summary || 'Prompt enhanced successfully',
        suggestedFollowUps: Array.isArray(result.suggestedFollowUps) ? result.suggestedFollowUps : [],
        originalText: text,
        targetAgent: targetAgent,
        promptStyle: promptStyle,
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error('[Enhance Prompt API] Failed to parse JSON response:', parseError);
      // Return the raw response if JSON parsing fails
      return NextResponse.json({
        success: true,
        enhancedPrompt: response,
        summary: 'Prompt enhanced successfully',
        suggestedFollowUps: [],
        originalText: text,
        targetAgent: targetAgent,
        promptStyle: promptStyle,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: unknown) {
    console.error('[Enhance Prompt API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
