'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Mic, 
  Upload, 
  Copy, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  FileAudio,
  Clock,
  History,
  AlertCircle,
  Play,
  Square,
  Sparkles,
  Wand2,
  ArrowRight,
  Lightbulb
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ThemeToggle } from '@/components/theme-toggle'

interface TranscriptionResult {
  id: string
  transcription: string
  wordCount: number
  fileName: string
  fileSize: number
  timestamp: string
  type: 'recording' | 'upload'
}

interface EnhancedPrompt {
  enhancedPrompt: string
  summary: string
  suggestedFollowUps: string[]
  originalText: string
  targetAgent: string
  promptStyle: string
}

const AI_AGENTS = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖', description: 'OpenAI ChatGPT' },
  { id: 'claude', name: 'Claude', icon: '🧠', description: 'Anthropic Claude' },
  { id: 'gemini', name: 'Gemini', icon: '✨', description: 'Google Gemini' },
  { id: 'copilot', name: 'Copilot', icon: '💻', description: 'GitHub Copilot' },
  { id: 'midjourney', name: 'Midjourney', icon: '🎨', description: 'Midjourney' },
  { id: 'dalle', name: 'DALL-E', icon: '🖼️', description: 'OpenAI DALL-E' },
  { id: 'general', name: 'General', icon: '🌐', description: 'Any AI System' },
]

const PROMPT_STYLES = [
  { id: 'creative', name: 'Creative', icon: '🎨', description: 'Imaginative and innovative' },
  { id: 'professional', name: 'Professional', icon: '💼', description: 'Business and formal' },
  { id: 'technical', name: 'Technical', icon: '⚙️', description: 'Precise and detailed' },
  { id: 'educational', name: 'Educational', icon: '📚', description: 'Learning-focused' },
  { id: 'conversational', name: 'Conversational', icon: '💬', description: 'Natural and friendly' },
]

export default function VoiceTranscriptionApp() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [currentResult, setCurrentResult] = useState<TranscriptionResult | null>(null)
  const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedPrompt | null>(null)
  const [history, setHistory] = useState<TranscriptionResult[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showPromptDialog, setShowPromptDialog] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('chatgpt')
  const [selectedStyle, setSelectedStyle] = useState('professional')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { toast } = useToast()

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('transcriptionHistory')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Failed to load history:', e)
      }
    }
  }, [])

  // Save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('transcriptionHistory', JSON.stringify(history))
  }, [history])

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setRecordingTime(0)
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setAudioBlob(null)
      setCurrentResult(null)
      setEnhancedPrompt(null)
      
      toast({
        title: 'Recording started',
        description: 'Speak into your microphone...',
      })
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive'
      })
    }
  }, [toast])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      toast({
        title: 'Recording stopped',
        description: 'Click "Transcribe" to process your recording.',
      })
    }
  }, [isRecording, toast])

  const transcribeAudio = useCallback(async (blob: Blob, fileName: string, type: 'recording' | 'upload') => {
    if (blob.size < 100) {
      toast({
        title: 'Recording too short',
        description: 'Please record at least 1 second of audio.',
        variant: 'destructive'
      })
      return
    }
    
    setIsProcessing(true)
    console.log(`[Transcribe] Starting transcription for ${fileName}, size: ${blob.size} bytes`)
    
    try {
      const formData = new FormData()
      formData.append('audio', blob, fileName)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)
      
      let response: Response
      try {
        response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        console.log(`[Transcribe] Response status: ${response.status}`)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error('[Transcribe] Fetch error:', fetchError)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try with a shorter audio file.')
        }
        throw new Error('Network error. Please check your connection and try again.')
      }
      
      // Check if response is ok before parsing
      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`
        try {
          const errorData = await response.json()
          errorMsg = errorData?.error || errorMsg
        } catch {
          // Can't parse error response
        }
        throw new Error(errorMsg)
      }
      
      let data
      try {
        data = await response.json()
        console.log('[Transcribe] Parsed response:', data?.success ? 'success' : 'failed')
      } catch (parseError) {
        console.error('[Transcribe] JSON parse error:', parseError)
        throw new Error('Server returned invalid response. Please try again.')
      }
      
      if (data.success) {
        const result: TranscriptionResult = {
          id: Date.now().toString(),
          transcription: data.transcription || '',
          wordCount: data.wordCount || 0,
          fileName: data.fileName,
          fileSize: data.fileSize,
          timestamp: data.timestamp,
          type: type
        }
        
        setCurrentResult(result)
        setHistory(prev => [result, ...prev].slice(0, 20))
        setEnhancedPrompt(null)
        
        toast({
          title: 'Transcription complete',
          description: `${data.wordCount} words transcribed successfully.`,
        })
      } else {
        throw new Error(data?.error || 'Transcription failed')
      }
    } catch (error) {
      console.error('[Transcribe] Error:', error)
      toast({
        title: 'Transcription failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [toast])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    await transcribeAudio(file, file.name, 'upload')
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [transcribeAudio])

  const enhancePrompt = useCallback(async (text: string) => {
    if (!text || text.trim().length < 5) {
      toast({
        title: 'Text too short',
        description: 'Please provide more text to enhance.',
        variant: 'destructive'
      })
      return
    }

    setIsEnhancing(true)
    console.log(`[Enhance] Enhancing prompt for ${selectedAgent} with style ${selectedStyle}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      let response: Response
      try {
        response = await fetch('/api/enhance-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            language: 'english',
            targetAgent: selectedAgent,
            promptStyle: selectedStyle
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        console.log(`[Enhance] Response status: ${response.status}`)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error('[Enhance] Fetch error:', fetchError)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.')
        }
        throw new Error('Network error. Please check your connection.')
      }

      // Check if response is ok
      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`
        try {
          const errorData = await response.json()
          errorMsg = errorData?.error || errorMsg
        } catch {
          // Can't parse error response
        }
        throw new Error(errorMsg)
      }

      let data
      try {
        data = await response.json()
        console.log('[Enhance] Parsed response:', data?.success ? 'success' : 'failed')
      } catch (parseError) {
        console.error('[Enhance] JSON parse error:', parseError)
        throw new Error('Server returned invalid response.')
      }

      if (data.success) {
        setEnhancedPrompt({
          enhancedPrompt: data.enhancedPrompt,
          summary: data.summary,
          suggestedFollowUps: data.suggestedFollowUps || [],
          originalText: data.originalText,
          targetAgent: data.targetAgent,
          promptStyle: data.promptStyle
        })
        setShowPromptDialog(true)

        toast({
          title: 'Prompt enhanced!',
          description: data.summary,
        })
      } else {
        throw new Error(data.error || 'Enhancement failed')
      }
    } catch (error) {
      console.error('[Enhance] Error:', error)
      toast({
        title: 'Enhancement failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive'
      })
    } finally {
      setIsEnhancing(false)
    }
  }, [selectedAgent, selectedStyle, toast])

  const copyToClipboard = useCallback(async (text: string, id: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      
      toast({
        title: 'Copied to clipboard!',
        description: label ? `${label} copied successfully.` : 'Text copied to clipboard.',
      })
      
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive'
      })
    }
  }, [toast])

  const downloadTranscription = useCallback((result: TranscriptionResult) => {
    const content = `Transcription
==============

File: ${result.fileName}
Date: ${new Date(result.timestamp).toLocaleString()}
Word Count: ${result.wordCount}
File Size: ${formatFileSize(result.fileSize)}

Content:
--------
${result.transcription}
`
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription-${result.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Download started',
      description: 'Transcription file is being downloaded.',
    })
  }, [toast])

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
    if (currentResult?.id === id) {
      setCurrentResult(null)
      setEnhancedPrompt(null)
    }
    toast({
      title: 'Deleted',
      description: 'Transcription removed from history.',
    })
  }, [currentResult, toast])

  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentResult(null)
    setEnhancedPrompt(null)
    toast({
      title: 'History cleared',
      description: 'All transcriptions have been removed.',
    })
  }, [toast])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-3">
            PromptPal
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg text-center">
            Transcribe your voice and convert it to AI-ready prompts
          </p>
          <div className="absolute top-8 right-8">
            <ThemeToggle />
          </div>
        </div>

        {/* Prompt Enhancement Settings */}
        {currentResult && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-violet-500" />
                  <span className="font-medium text-sm">Prompt Settings:</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Target AI:</span>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_AGENTS.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.icon} {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Style:</span>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMPT_STYLES.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.icon} {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  className="ml-auto"
                  onClick={() => enhancePrompt(currentResult.transcription)}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Enhance to Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recording Section */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Record Audio
              </CardTitle>
              <CardDescription>
                Click the microphone to start recording your voice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Button
                    size="lg"
                    variant={isRecording ? "destructive" : "default"}
                    className={`w-20 h-20 rounded-full shadow-lg transition-all duration-300 ${
                      isRecording ? 'animate-pulse' : ''
                    }`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                  >
                    {isRecording ? (
                      <Square className="w-8 h-8 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-white" />
                    )}
                  </Button>
                  {isRecording && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium text-red-500">
                      {formatTime(recordingTime)}
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-slate-500 text-center mt-4">
                  {isRecording 
                    ? 'Recording... Click again to stop' 
                    : audioBlob 
                      ? 'Recording saved! Click "Transcribe" below'
                      : 'Click to start recording'
                  }
                </p>
              </div>

              {audioBlob && !isRecording && (
                <Button
                  className="w-full"
                  onClick={() => transcribeAudio(audioBlob, 'recording.webm', 'recording')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Transcribe Recording
                    </>
                  )}
                </Button>
              )}

              <Separator className="my-4" />

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.mp4"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full border-dashed border-2 h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">
                    {isProcessing ? 'Processing...' : 'Upload Audio File'}
                  </span>
                  <span className="text-xs text-slate-400">
                    WAV, MP3, M4A, OGG, WEBM
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Transcription */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="w-5 h-5" />
                Transcription
              </CardTitle>
              <CardDescription>
                Your transcribed text
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
                  <p className="text-sm text-slate-500">Processing audio...</p>
                </div>
              ) : currentResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {currentResult.wordCount} words
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(currentResult.transcription, currentResult.id, 'Transcription')}
                      >
                        {copiedId === currentResult.id ? (
                          <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 mr-1" />
                        )}
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTranscription(currentResult)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => enhancePrompt(currentResult.transcription)}
                        disabled={isEnhancing}
                      >
                        {isEnhancing ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4 mr-1" />
                        )}
                        Enhance
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted border">
                    <Textarea
                      value={currentResult.transcription}
                      onChange={(e) => setCurrentResult(prev => prev ? { ...prev, transcription: e.target.value } : null)}
                      className="min-h-[200px] resize-none bg-transparent border-0 p-0 focus-visible:ring-0"
                      placeholder="Transcription will appear here..."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <AlertCircle className="w-12 h-12 mb-2" />
                  <p className="text-sm">No transcription yet</p>
                  <p className="text-xs mt-1">Record or upload audio to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <Card className="shadow-md mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  History
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={clearHistory}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              <CardDescription>
                Your recent transcriptions (stored locally)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-card border shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.type === 'recording' ? '🎙️ Recording' : '📁 Upload'}
                            </Badge>
                            <span className="text-xs text-slate-500">{item.fileName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            <span>{item.wordCount} words</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setCurrentResult(item)
                              enhancePrompt(item.transcription)
                            }}
                            title="Convert to Prompt"
                          >
                            <Wand2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => downloadTranscription(item)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => deleteFromHistory(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                        {item.transcription || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Prompt Dialog */}
        <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-primary" />
                Enhanced AI Prompt
              </DialogTitle>
              <DialogDescription className="text-base">
                Ready to copy and paste into {AI_AGENTS.find(a => a.id === enhancedPrompt?.targetAgent)?.name || 'your AI agent'}
              </DialogDescription>
            </DialogHeader>
            
            {enhancedPrompt && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    ✨ {enhancedPrompt.summary}
                  </p>
                </div>

                {/* Agent & Style Info */}
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {AI_AGENTS.find(a => a.id === enhancedPrompt.targetAgent)?.icon} {enhancedPrompt.targetAgent}
                  </Badge>
                  <Badge variant="outline">
                    {PROMPT_STYLES.find(s => s.id === enhancedPrompt.promptStyle)?.icon} {enhancedPrompt.promptStyle}
                  </Badge>
                </div>

                {/* Enhanced Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enhanced Prompt:</span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => copyToClipboard(enhancedPrompt.enhancedPrompt, 'enhanced-prompt', 'Enhanced prompt')}
                    >
                      {copiedId === 'enhanced-prompt' ? (
                        <CheckCircle2 className="w-4 h-4 mr-1 text-white" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy Prompt
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-muted border">
                    <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {enhancedPrompt.enhancedPrompt}
                    </pre>
                  </div>
                </div>

                {/* Suggested Follow-ups */}
                {enhancedPrompt.suggestedFollowUps.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Suggested Follow-up Prompts:
                    </div>
                    <div className="space-y-2">
                      {enhancedPrompt.suggestedFollowUps.map((followUp, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-accent/50 border border-border cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => copyToClipboard(followUp, `followup-${index}`, 'Follow-up prompt')}
                        >
                          <div className="flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{followUp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Text */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                    View original text
                  </summary>
                  <div className="p-3 rounded-lg bg-muted border text-sm text-muted-foreground">
                    {enhancedPrompt.originalText}
                  </div>
                </details>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-400">
          <p>PromptPal — AI Voice Transcription with Prompt Enhancement</p>
        </div>
      </div>
    </div>
  )
}
