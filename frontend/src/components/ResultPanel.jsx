import { useState, useEffect } from 'react'
import { Copy, Check, Eye, Braces, Layers, ArrowUpRight, ScanLine } from 'lucide-react'
import MermaidPreview from './MermaidPreview'

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-white/5 text-ink-dim border border-line',
    accent: 'bg-accent/15 text-accent border border-accent/30',
    success: 'bg-success/15 text-success border border-success/30',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

function CopyButton({ code, onCopy }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-ink-dim hover:text-ink transition-colors min-h-[32px] px-2"
    >
      {copied ? (
        <><Check size={12} className="text-success" /> Copied!</>
      ) : (
        <><Copy size={12} /> Copy</>
      )}
    </button>
  )
}

function CodeView({ output, diagramType }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 border-b border-line flex-shrink-0">
        <Badge tone="accent">{diagramType}</Badge>
        <Badge>{output.format}</Badge>
      </div>

      {/* Terminal-style code block */}
      <div className="flex-1 overflow-auto p-3 md:p-4">
        <div className="rounded-xl overflow-hidden border border-line">
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-ink-dim font-mono">{output.format}.{output.format === 'mermaid' ? 'mmd' : 'puml'}</span>
            </div>
            <CopyButton code={output.code} />
          </div>
          <pre className="overflow-x-auto p-4 text-xs text-green-300/90 font-mono leading-5 bg-[#0a0a14]">
            <code>{output.code}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

function ElementsView({ result }) {
  return (
    <div className="flex flex-col h-full overflow-auto p-3 md:p-4 gap-4">
      <div className="flex items-center gap-3 pb-3 border-b border-line flex-wrap">
        <Badge tone="accent">{result.detected_type}</Badge>
        <Badge tone="success">{result.elements.length} elements found</Badge>
      </div>

      {result.description && (
        <p className="text-sm text-ink/70 leading-relaxed">{result.description}</p>
      )}

      {result.elements.length === 0 ? (
        <div className="text-ink-dim text-sm text-center py-8">
          No structured elements were extracted — this run used text-only mode.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result.elements.map((el, idx) => (
            <div key={idx} className="bg-card border border-line rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-ink text-sm">{el.name}</span>
                <Badge>{el.type}</Badge>
              </div>
              {el.label && <p className="text-xs text-ink-dim italic">"{el.label}"</p>}

              {el.attributes?.length > 0 && (
                <div>
                  <p className="text-xs text-ink-dim mb-1">Attributes</p>
                  <div className="flex flex-wrap gap-1">
                    {el.attributes.map((a, i) => (
                      <span key={i} className="text-xs bg-white/5 text-ink/70 px-2 py-0.5 rounded font-mono">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {el.methods?.length > 0 && (
                <div>
                  <p className="text-xs text-ink-dim mb-1">Methods</p>
                  <div className="flex flex-wrap gap-1">
                    {el.methods.map((m, i) => (
                      <span key={i} className="text-xs bg-accent/10 text-accent/80 px-2 py-0.5 rounded font-mono">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResultPanel({ result, onActiveOutputChange }) {
  const mermaidOutput = result?.outputs?.find((o) => o.format === 'mermaid')
  const plantumlOutput = result?.outputs?.find((o) => o.format === 'plantuml')

  const tabs = [
    { id: 'preview', label: 'Preview', icon: Eye, enabled: !!mermaidOutput, format: 'mermaid' },
    { id: 'mermaid', label: 'Mermaid', icon: Braces, enabled: !!mermaidOutput, format: 'mermaid' },
    { id: 'plantuml', label: 'PlantUML', icon: Braces, enabled: !!plantumlOutput, format: 'plantuml' },
    { id: 'elements', label: 'Elements', icon: Layers, enabled: true, format: null },
  ].filter((t) => t.enabled)

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'preview')

  useEffect(() => {
    const stillValid = tabs.some((t) => t.id === activeTab)
    if (!stillValid && tabs[0]) setActiveTab(tabs[0].id)
  }, [result])

  // Whenever the active tab corresponds to a real output format, tell
  // App.jsx — that's what chat uses as "the code currently on screen".
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTab)
    if (tab?.format) onActiveOutputChange?.(tab.format)
  }, [activeTab, result])

  const handleTabClick = (tabId) => setActiveTab(tabId)

  if (!result) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 p-8 min-h-[60vh] md:min-h-full">
        <div className="w-14 h-14 rounded-2xl bg-card border border-line flex items-center justify-center">
          <ScanLine className="w-6 h-6 text-ink-dim" />
        </div>
        <div className="text-center">
          <p className="font-display text-ink font-medium">Upload a diagram or describe one</p>
          <p className="text-ink-dim text-sm mt-1 max-w-xs">
            A whiteboard photo, a hand-drawn sketch, or just a sentence — any of these will work.
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-5 mt-3 text-xs text-ink-dim flex-wrap justify-center">
          <span>Flowcharts</span>
          <span className="w-1 h-1 rounded-full bg-line" />
          <span>Sequence</span>
          <span className="w-1 h-1 rounded-full bg-line" />
          <span>Class</span>
          <span className="w-1 h-1 rounded-full bg-line" />
          <span>ER diagrams</span>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-full">
      {/* Pill-style tabs — scroll horizontally on mobile, never wrap/clip */}
      <div className="px-3 pt-3 md:px-5 md:pt-5">
        <div className="flex gap-1 overflow-x-auto p-1 bg-white/[0.03] rounded-xl scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                           transition-all duration-200 whitespace-nowrap min-h-[36px]
                           ${isActive
                             ? 'bg-accent text-white shadow-sm shadow-accent/30'
                             : 'text-ink-dim hover:text-ink hover:bg-white/[0.06]'}`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-[50vh] md:min-h-0">
        {activeTab === 'preview' && mermaidOutput && <MermaidPreview code={mermaidOutput.code} />}
        {activeTab === 'mermaid' && mermaidOutput && <CodeView output={mermaidOutput} diagramType={result.detected_type} />}
        {activeTab === 'plantuml' && plantumlOutput && <CodeView output={plantumlOutput} diagramType={result.detected_type} />}
        {activeTab === 'elements' && <ElementsView result={result} />}
      </div>

      {result.citations?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-3 md:px-5 md:py-3 border-t border-line flex-shrink-0">
          <span className="text-xs text-ink-dim">Sources:</span>
          {result.citations.map((c, i) => (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-line bg-white/5 px-2 py-0.5 text-xs text-ink-dim hover:text-ink hover:border-ink-dim transition-colors"
            >
              {c.title} <ArrowUpRight size={9} />
            </a>
          ))}
        </div>
      )}
    </main>
  )
}