import { useState } from 'react'
import UploadPanel from './components/UploadPanel'
import ResultPanel from './components/ResultPanel'
import SettingsPanel, { useUserKeys } from './components/SettingsPanel'

export default function App() {
  const [result, setResult] = useState(null)
  const [currentCode, setCurrentCode] = useState('')
  const [currentFormat, setCurrentFormat] = useState('mermaid')
  const [imageBase64, setImageBase64] = useState('')
  const [imageFilename, setImageFilename] = useState('')
  const [diagramType, setDiagramType] = useState('auto')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { keys, saveKeys, getHeaders } = useUserKeys()

  const handleResult = (newResult) => {
    setResult(newResult)
    const mermaid = newResult?.outputs?.find(o => o.format === 'mermaid')
    const first = newResult?.outputs?.[0]
    if (mermaid) { setCurrentCode(mermaid.code); setCurrentFormat('mermaid') }
    else if (first) { setCurrentCode(first.code); setCurrentFormat(first.format) }
  }

  const handleCodeChange = (code, format) => {
    setCurrentCode(code)
    setCurrentFormat(format)
  }

  const handleCodeUpdate = (newCode, format) => {
    setCurrentCode(newCode)
    setCurrentFormat(format)
    setResult(prev => {
      if (!prev) return prev
      return {
        ...prev,
        outputs: prev.outputs.map(o => o.format === format ? { ...o, code: newCode } : o)
      }
    })
  }

  const hasUserKeys = keys.gemini || keys.groq || keys.openrouter

  return (
    <div className="min-h-screen flex flex-col bg-graphite text-ink">
      <header className="sticky top-0 z-40 border-b border-white/[0.06]
                        bg-graphite/90 backdrop-blur-xl px-4 md:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center
                           shadow-lg shadow-accent/30">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M13 2L4.5 13.5H11L9 22L19.5 10H13L13 2Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                SketchFlow <span className="text-accent">AI</span>
              </h1>
              <p className="text-[10px] text-white/30 leading-none mt-0.5">
                Sketch it. Code it. Ship it.
              </p>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                      bg-white/[0.03] px-3 py-1.5 text-xs text-white/50
                      hover:text-white hover:border-accent/40 hover:bg-accent/5
                      transition-all duration-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="hidden sm:inline">API Keys</span>
            {hasUserKeys && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col md:flex-row">
        <UploadPanel
          onResult={handleResult}
          onImageChange={(b64, fname) => { setImageBase64(b64); setImageFilename(fname) }}
          onDiagramTypeChange={setDiagramType}
          currentCode={currentCode}
          currentFormat={currentFormat}
          imageBase64={imageBase64}
          imageFilename={imageFilename}
          diagramType={diagramType}
          userKeyHeaders={getHeaders()}
          onCodeUpdate={handleCodeUpdate}
        />
        <div className="hidden md:block w-px bg-white/[0.07] shrink-0" />
        <ResultPanel result={result} onCodeChange={handleCodeChange} />
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