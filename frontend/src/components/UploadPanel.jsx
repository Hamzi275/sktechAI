import { useState, useRef, useEffect } from 'react'
import { Upload, X, ArrowUp, Loader2, Trash2 } from 'lucide-react'
import axios from 'axios'
import API_BASE from '../config'
import useChatMemory from '../hooks/useChatMemory'

export default function UploadPanel({
  onResult,
  onImageChange,
  onDiagramTypeChange,
  currentCode,
  currentFormat,
  imageBase64,
  imageFilename,
  diagramType,
  userKeyHeaders,
  onCodeUpdate,
}) {
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [localImageBase64, setLocalImageBase64] = useState('')
  const [localFilename, setLocalFilename] = useState('')
  const [localDiagramType, setLocalDiagramType] = useState('auto')
  const [outputFormat, setOutputFormat] = useState('auto')
  const [userPrompt, setUserPrompt] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)

  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)

  const {
    messages: chatMessages,
    addMessage,
    updateLastMessage,
    clearHistory,
    clearForNewImage,
    getApiHistory,
  } = useChatMemory()

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isChatting])

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setImageDataUrl(dataUrl)
      const b64 = dataUrl.split(',')[1]
      setLocalImageBase64(b64)
      setLocalFilename(file.name)
      clearForNewImage()
      if (onImageChange) onImageChange(b64, file.name)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageDataUrl('')
    setLocalImageBase64('')
    setLocalFilename('')
    if (onImageChange) onImageChange('', '')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files?.[0])
  }

  const handleDiagramTypeChange = (val) => {
    setLocalDiagramType(val)
    if (onDiagramTypeChange) onDiagramTypeChange(val)
  }

  const handleAnalyze = async () => {
    if (isAnalyzing) return
    if (!localImageBase64 && !userPrompt.trim()) {
      setAnalyzeError('Please upload an image or type a description.')
      return
    }
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const res = await axios.post(
        `${API_BASE}/api/analyze`,
        {
          image_base64: localImageBase64 || null,
          filename: localFilename || 'diagram.jpg',
          diagram_type: localDiagramType,
          output_format: outputFormat,
          user_prompt: userPrompt,
        },
        { headers: { ...userKeyHeaders } }
      )
      onResult(res.data)
      setUserPrompt('')
    } catch (err) {
      setAnalyzeError(err.response?.data?.detail || 'Analysis failed. Check your API keys.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sendChat = async () => {
    const message = chatInput.trim()
    if (!message || isChatting) return

    const apiHistory = getApiHistory()
    addMessage({ role: 'user', content: message })
    addMessage({ role: 'assistant', content: '' })
    setChatInput('')
    setIsChatting(true)

    let fullResponseText = ''

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...userKeyHeaders },
        body: JSON.stringify({
          message,
          current_code: currentCode || '',
          current_format: currentFormat || 'mermaid',
          diagram_type: diagramType || localDiagramType || 'auto',
          image_base64: imageBase64 || localImageBase64 || '',
          image_filename: imageFilename || localFilename || 'diagram.jpg',
          chat_history: apiHistory,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()

        for (const part of parts) {
          if (!part.startsWith('data:')) continue
          const payload = part.slice(5).replace(/^ /, '')
          if (!payload || payload === '[DONE]') continue
          const text = payload.replace(/\\n/g, '\n')
          fullResponseText += text
          updateLastMessage(last => ({ ...last, content: last.content + text }))
        }
      }

      if (fullResponseText && onCodeUpdate) {
        const mermaidMatch = fullResponseText.match(/```mermaid\n([\s\S]*?)```/)
        const plantumlMatch = fullResponseText.match(/```plantuml\n([\s\S]*?)```/)
        if (mermaidMatch) onCodeUpdate(mermaidMatch[1].trim(), 'mermaid')
        else if (plantumlMatch) onCodeUpdate(plantumlMatch[1].trim(), 'plantuml')
      }
    } catch (err) {
      updateLastMessage(last => ({
        ...last,
        content: `Sorry, I couldn't respond. ${err.message}`,
      }))
    } finally {
      setIsChatting(false)
    }
  }

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() }
  }

  return (
    <div className="w-full md:w-80 md:min-w-[320px] flex flex-col border-b md:border-b-0
                   md:border-r border-white/[0.07] bg-sidebar overflow-y-auto">
      <div className="p-4 flex flex-col gap-4">

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !imageDataUrl && fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed cursor-pointer
                     flex flex-col items-center justify-center gap-2
                     min-h-[120px] md:min-h-[160px] transition-all duration-300 overflow-hidden
                     ${isDragging ? 'border-accent bg-accent/10'
                       : imageDataUrl ? 'border-white/10 cursor-default'
                       : 'border-white/[0.12] hover:border-accent/40 hover:bg-accent/5'}`}
        >
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

          {imageDataUrl ? (
            <div className="relative w-full p-2">
              <img src={imageDataUrl} alt="Uploaded diagram"
                className="w-full max-h-36 object-contain rounded-lg" />
              <button onClick={(e) => { e.stopPropagation(); clearImage() }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/70
                           text-white flex items-center justify-center hover:bg-red-500/80">
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20
                             flex items-center justify-center">
                <Upload size={18} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-white/60">Drop diagram image</p>
                <p className="text-[10px] text-white/25 mt-0.5">or click · PNG, JPG, WebP</p>
              </div>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0])} />

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Type</label>
            <select value={localDiagramType} onChange={(e) => handleDiagramTypeChange(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                        px-2 py-1.5 text-xs text-white focus:border-accent/50 focus:outline-none">
              <option value="auto">Auto Detect</option>
              <option value="flowchart">Flowchart</option>
              <option value="sequence">Sequence</option>
              <option value="class">Class</option>
              <option value="er">ER Diagram</option>
              <option value="architecture">Architecture</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Format</label>
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                        px-2 py-1.5 text-xs text-white focus:border-accent/50 focus:outline-none">
              <option value="auto">Both</option>
              <option value="mermaid">Mermaid</option>
              <option value="plantuml">PlantUML</option>
            </select>
          </div>
        </div>

        {/* Text prompt */}
        <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)}
          rows={2} placeholder="Describe the diagram or add instructions..."
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04]
                    px-3 py-2 text-xs text-white placeholder:text-white/25
                    focus:border-accent/50 focus:outline-none" />

        {/* Analyze button */}
        <button onClick={handleAnalyze}
          disabled={isAnalyzing || (!localImageBase64 && !userPrompt.trim())}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white
                    bg-gradient-to-r from-accent to-violet-600
                    shadow-lg shadow-accent/20 hover:shadow-accent/30
                    disabled:opacity-40 disabled:shadow-none
                    transition-all duration-200 flex items-center justify-center gap-2">
          {isAnalyzing
            ? <><Loader2 size={15} className="animate-spin" /> Analyzing...</>
            : '⚡ Generate Diagram'}
        </button>

        {analyzeError && <p className="text-xs text-red-400 text-center">{analyzeError}</p>}

        <div className="border-t border-white/[0.06]" />

        {/* Chat */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
              Ask SketchFlow AI
            </p>
            {chatMessages.length > 0 && (
              <button onClick={clearHistory}
                className="flex items-center gap-1 text-[10px] text-white/25
                          hover:text-red-400 transition-colors">
                <Trash2 size={10} /> Clear
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pr-1">
            {chatMessages.length === 0 && (
              <p className="text-xs text-white/20 italic py-2">
                Ask me to create, modify, or explain any diagram...
              </p>
            )}
            {chatMessages.map((msg, i) => {
              const isLast = i === chatMessages.length - 1
              const isAssistant = msg.role === 'assistant'
              return (
                <div key={i} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-5
                    ${isAssistant ? 'bg-white/[0.04] text-white/80'
                      : 'bg-accent/20 text-white border border-accent/20'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {isChatting && isLast && isAssistant && !msg.content && (
                      <span className="flex gap-1 mt-1">
                        {[0, 1, 2].map(n => (
                          <span key={n} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                            style={{ animationDelay: `${n * 0.15}s` }} />
                        ))}
                      </span>
                    )}
                    {isChatting && isLast && isAssistant && msg.content && (
                      <span className="animate-pulse text-accent ml-0.5">▌</span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2 items-end">
            <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown} disabled={isChatting} rows={1}
              placeholder="Make it a sequence diagram..."
              className="flex-1 resize-none rounded-lg border border-white/[0.08]
                        bg-white/[0.04] px-3 py-2 text-xs text-white
                        placeholder:text-white/25 focus:border-accent/50 focus:outline-none
                        disabled:opacity-50 min-h-[36px] max-h-20" />
            <button onClick={sendChat} disabled={!chatInput.trim() || isChatting}
              className="rounded-lg bg-accent p-2 text-white disabled:opacity-30
                        hover:bg-accent-hover transition-colors shrink-0">
              {isChatting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}