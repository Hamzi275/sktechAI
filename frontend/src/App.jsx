import { useState, useMemo } from 'react'
import { KeyRound } from 'lucide-react'
import UploadPanel from './components/UploadPanel'
import ResultPanel from './components/ResultPanel'
import SettingsPanel, { useUserKeys } from './components/SettingsPanel'

export default function App() {
  const [result, setResult] = useState(null)
  const [activeFormat, setActiveFormat] = useState('mermaid') // which output tab is "current" for chat context
  const [imageBase64, setImageBase64] = useState('')
  const [imageFilename, setImageFilename] = useState('')
  const [diagramType, setDiagramType] = useState('auto')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { keys, saveKeys, getHeaders } = useUserKeys()

  const hasUserKeys = !!(keys.gemini || keys.groq || keys.openrouter)

  // The code chat should see/modify: whichever output matches activeFormat,
  // falling back to the first output. This stays derived from `result`
  // rather than duplicated in separate state, so the two can never drift
  // out of sync with each other.
  const currentOutput = useMemo(() => {
    if (!result?.outputs?.length) return null
    return result.outputs.find((o) => o.format === activeFormat) || result.outputs[0]
  }, [result, activeFormat])

  const currentCode = currentOutput?.code || ''
  const currentFormat = currentOutput?.format || 'mermaid'

  const handleResult = (newResult) => {
    setResult(newResult)
    if (newResult?.outputs?.length > 0) {
      setActiveFormat(newResult.outputs[0].format)
    }
  }

  // Called by ResultPanel when the person switches tabs, so chat always
  // refers to whatever code is actually on screen.
  const handleActiveOutputChange = (format) => {
    setActiveFormat(format)
  }

  // Called by UploadPanel when the chat reply contains a fenced code block —
  // writes it back into result.outputs so ResultPanel reflects the edit.
  const handleCodeUpdate = (newCode, format) => {
    setActiveFormat(format)
    setResult((prev) => {
      if (!prev) {
        return {
          detected_type: diagramType !== 'auto' ? diagramType : 'flowchart',
          description: '',
          outputs: [{ format, code: newCode, preview_supported: format === 'mermaid' }],
          elements: [],
          citations: [],
          mode: 'text',
        }
      }
      const existingIdx = prev.outputs.findIndex((o) => o.format === format)
      const updatedOutputs = [...prev.outputs]
      if (existingIdx >= 0) {
        updatedOutputs[existingIdx] = { ...updatedOutputs[existingIdx], code: newCode }
      } else {
        updatedOutputs.push({ format, code: newCode, preview_supported: format === 'mermaid' })
      }
      return { ...prev, outputs: updatedOutputs }
    })
  }

  const handleImageChange = (base64, filename) => {
    setImageBase64(base64)
    setImageFilename(filename)
  }

  return (
    <div className="min-h-screen flex flex-col bg-graphite text-ink font-body">
      {/* Header — sticky, never clips content below it */}
      <header className="sticky top-0 z-40 border-b border-line bg-graphite/80 backdrop-blur-xl px-4 md:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M13 2L4.5 13.5H11L9 22L19.5 10H13L13 2Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-ink tracking-tight leading-none">
                SketchFlow <span className="text-accent">AI</span>
              </h1>
              <p className="text-[10px] text-ink-dim leading-none mt-0.5">
                Sketch it. Code it. Ship it.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.04] px-3 py-2 text-xs text-ink-dim hover:text-ink hover:border-accent/40 hover:bg-accent/10 transition-all duration-200 min-h-[40px]"
          >
            <KeyRound size={12} />
            <span className="hidden sm:inline">API Keys</span>
            {hasUserKeys && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
          </button>
        </div>
      </header>

      {/* Main content — panels stack on mobile, sit side by side on desktop.
          Neither this row nor the root div uses overflow-hidden, so the page
          scrolls naturally; each panel additionally scrolls on its own. */}
      <main className="flex flex-1 flex-col md:flex-row min-h-0">
        <div className="w-full md:w-[360px] md:min-w-[360px] border-b md:border-b-0 md:border-r border-line">
          <UploadPanel
            onResult={handleResult}
            currentCode={currentCode}
            currentFormat={currentFormat}
            diagramType={diagramType}
            onDiagramTypeChange={setDiagramType}
            imageBase64={imageBase64}
            imageFilename={imageFilename}
            onImageChange={handleImageChange}
            onCodeUpdate={handleCodeUpdate}
            userKeyHeaders={getHeaders()}
          />
        </div>

        <div className="flex-1 min-h-[60vh] md:min-h-0">
          <ResultPanel result={result} onActiveOutputChange={handleActiveOutputChange} />
        </div>
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        keys={keys}
        onSave={saveKeys}
      />
    </div>
  )
}
