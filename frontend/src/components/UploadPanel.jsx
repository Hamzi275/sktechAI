import { useState, useRef, useCallback, useEffect } from 'react'
import axios from 'axios'
import { Upload, X, Loader2, ArrowUp, PenLine, Zap } from 'lucide-react'
import ChatHistory from './ChatHistory'

const DIAGRAM_TYPES = [
  { value: 'auto', label: 'Auto detect' },
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'class', label: 'Class diagram' },
  { value: 'er', label: 'ER diagram' },
  { value: 'architecture', label: 'Architecture' },
]

const OUTPUT_FORMATS = [
  { value: 'auto', label: 'Both formats' },
  { value: 'mermaid', label: 'Mermaid only' },
  { value: 'plantuml', label: 'PlantUML only' },
]

// Pulls a fenced ```mermaid / ```plantuml block out of a chat reply, if the
// assistant included one, so the result panel can be updated in place.
function extractCodeFromResponse(text) {
  const mermaidMatch = text.match(/```mermaid\n([\s\S]*?)```/)
  if (mermaidMatch) return { code: mermaidMatch[1].trim(), format: 'mermaid' }
  const plantumlMatch = text.match(/```plantuml\n([\s\S]*?)```/)
  if (plantumlMatch) return { code: plantumlMatch[1].trim(), format: 'plantuml' }
  return null
}

export default function UploadPanel({
  onResult,
  currentCode,
  currentFormat,
  diagramType,
  onDiagramTypeChange,
  imageBase64,
  imageFilename,
  onImageChange,
  onCodeUpdate,
  userKeyHeaders,
}) {
  const [imageFile, setImageFile] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [outputFormat, setOutputFormat] = useState('auto')
  const [userPrompt, setUserPrompt] = useState('')
  const [dragging, setDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)

  const inputRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    axios.get('/api/chat/history').then((res) => {
      if (res.data?.history?.length) setChatMessages(res.data.history)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isChatting])

  const readFile = (f) => {
    setImageFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setImageDataUrl(dataUrl)
      const base64 = dataUrl.split(',')[1] // strip the data: URL prefix
      onImageChange?.(base64, f.name)
    }
    reader.readAsDataURL(f)
  }

  const handleFiles = (files) => {
    if (files && files[0]) {
      const f = files[0]
      if (!f.type.startsWith('image/')) {
        setError('Please upload an image file.')
        return
      }
      setError(null)
      readFile(f)
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const clearImage = () => {
    setImageFile(null)
    setImageDataUrl(null)
    if (inputRef.current) inputRef.current.value = ''
    onImageChange?.('', '')
  }

  const handleAnalyze = async () => {
    if (!imageDataUrl && !userPrompt.trim()) {
      setError('Upload an image or describe a diagram first.')
      return
    }
    setIsAnalyzing(true)
    setError(null)
    try {
      const base64 = imageDataUrl ? imageDataUrl.split(',')[1] : null
      const body = {
        image_base64: base64,
        filename: imageFile?.name || 'text-prompt.jpg',
        diagram_type: diagramType,
        output_format: outputFormat,
        user_prompt: userPrompt,
      }
      const res = await axios.post('/api/analyze', body, {
        headers: { 'Content-Type': 'application/json', ...userKeyHeaders },
      })
      onResult(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Analysis failed. Please try again.'
      setError(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sendChat = async () => {
    const message = chatInput.trim()
    if (!message || isChatting) return

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: '', citations: [] },
    ])
    setChatInput('')
    setIsChatting(true)

    let fullResponseText = ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...userKeyHeaders },
        body: JSON.stringify({
          message,
          current_code: currentCode || '',
          current_format: currentFormat || 'mermaid',
          diagram_type: diagramType || 'auto',
          image_base64: imageBase64 || '',
          image_filename: imageFilename || 'diagram.jpg',
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
        // SSE frames are separated by a blank line. Splitting on the
        // delimiter (rather than trimming each line) is what keeps the
        // word-boundary spaces inside each token intact.
        const parts = buffer.split('\n\n')
        buffer = parts.pop()

        for (const part of parts) {
          // Don't trim the whole frame — only check/strip the "data:" prefix.
          // Trimming here would eat the leading/trailing spaces that separate
          // streamed word-tokens, which is what previously caused replies
          // like "Thereisnoimageprovided." instead of "There is no image...".
          if (!part.startsWith('data:')) continue
          let payload = part.slice(5).replace(/^ /, '') // drop only the single space SSE convention adds after "data:"
          if (!payload || payload === '[DONE]') continue

          // The backend escapes a literal newline inside a token as the two
          // characters \ and n (so it can't be mistaken for the \n\n frame
          // delimiter). Reverse exactly that substitution — nothing else.
          payload = payload.replace(/\\n/g, '\n')

          fullResponseText += payload

          setChatMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + payload }
            }
            return updated
          })
        }
      }

      // If the reply contains a fenced diagram code block, push it up to
      // App.jsx so the result panel reflects what the chat just produced.
      if (fullResponseText) {
        const extracted = extractCodeFromResponse(fullResponseText)
        if (extracted) {
          onCodeUpdate?.(extracted.code, extracted.format)
        }
      }
    } catch (err) {
      setChatMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Sorry, I couldn't respond right now. Error: ${err.message}`,
          citations: [],
        }
        return updated
      })
    } finally {
      setIsChatting(false)
    }
  }

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChat()
    }
  }

  return (
    <aside className="bg-sidebar flex flex-col">
      <div className="flex flex-col gap-4 px-4 py-4 md:px-5 md:py-5 border-b border-line">

        {/* Drop Zone — glowing, animated */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative rounded-xl border-2 border-dashed cursor-pointer overflow-hidden
            flex flex-col items-center justify-center gap-2
            min-h-32 md:min-h-44 transition-all duration-300
            ${dragging
              ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
              : 'border-white/[0.12] bg-white/[0.02] hover:border-accent/40 hover:bg-accent/5'}
            ${imageDataUrl ? 'border-solid border-line' : ''}
          `}
        >
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {imageDataUrl ? (
            <div className="relative w-full h-full p-2">
              <button
                onClick={(e) => { e.stopPropagation(); clearImage() }}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
              >
                <X size={13} />
              </button>
              <img
                src={imageDataUrl}
                alt="Uploaded diagram"
                className="w-full max-h-32 md:max-h-48 object-contain rounded-lg"
              />
              <p className="text-xs text-ink-dim text-center mt-1.5 truncate px-2">{imageFile?.name}</p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Upload size={18} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-xs md:text-sm font-medium text-ink/70">Drop diagram image here</p>
                <p className="text-[10px] md:text-xs text-ink-dim mt-0.5">or click to browse · PNG, JPG, WebP</p>
              </div>
            </>
          )}
        </div>

        {/* Text Prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-dim uppercase tracking-wider">
            <PenLine size={11} /> Describe it
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g. a login flow with email + password, retry on failure..."
            rows={3}
            className="w-full resize-none rounded-lg border border-line bg-graphite px-3 py-2.5 text-xs md:text-sm text-ink placeholder:text-ink-dim/50 focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-dim uppercase tracking-wider">Type</label>
            <select
              value={diagramType}
              onChange={(e) => onDiagramTypeChange?.(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-line bg-graphite px-2.5 py-2 text-xs md:text-sm text-ink focus:border-accent focus:outline-none cursor-pointer transition-colors"
            >
              {DIAGRAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-dim uppercase tracking-wider">Output</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-line bg-graphite px-2.5 py-2 text-xs md:text-sm text-ink focus:border-accent focus:outline-none cursor-pointer transition-colors"
            >
              {OUTPUT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
            {error}
          </div>
        )}

        {/* Analyze button — glowing CTA */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full min-h-[44px] rounded-xl py-3 text-sm font-semibold text-white
                     bg-gradient-to-r from-accent to-violet-600
                     shadow-lg shadow-accent/25
                     hover:shadow-accent/40 hover:scale-[1.01]
                     disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none
                     transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
          ) : (
            <><Zap size={16} /> Generate Diagram</>
          )}
        </button>
      </div>

      {/* Chat — always visible, below the analyze button */}
      <div className="px-4 py-4 md:px-5 md:py-5">
        <p className="text-xs font-medium text-ink-dim mb-3 uppercase tracking-wider">
          Ask SketchFlow AI
        </p>

        <div className="max-h-64 overflow-y-auto space-y-3 mb-3">
          {chatMessages.length === 0 && (
            <p className="text-xs text-ink-dim/70 italic">
              Ask me to create, modify, or explain any diagram...
            </p>
          )}
          <ChatHistory messages={chatMessages} isStreaming={isChatting} />
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            disabled={isChatting}
            rows={1}
            placeholder="Create a login flowchart..."
            className="flex-1 resize-none rounded-lg border border-line bg-white/[0.04]
                       px-3 py-2 text-xs text-ink placeholder:text-ink-dim/50
                       focus:border-accent/50 focus:outline-none disabled:opacity-50
                       min-h-[44px] max-h-24 transition-colors"
          />
          <button
            onClick={sendChat}
            disabled={!chatInput.trim() || isChatting}
            className="rounded-lg bg-accent px-3 py-2 text-white disabled:opacity-30
                       hover:bg-accent-hover transition-colors min-w-[44px] min-h-[44px]
                       flex items-center justify-center"
          >
            {isChatting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
