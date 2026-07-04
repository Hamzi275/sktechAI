import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

let initialized = false
function ensureInitialized() {
  if (initialized) return
  initialized = true
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      background: '#ffffff',
      primaryColor: '#ede9fe',
      primaryTextColor: '#1e1b4b',
      primaryBorderColor: '#7c3aed',
      lineColor: '#6d28d9',
      secondaryColor: '#dbeafe',
      secondaryTextColor: '#1e3a5f',
      secondaryBorderColor: '#2563eb',
      tertiaryColor: '#dcfce7',
      tertiaryTextColor: '#14532d',
      tertiaryBorderColor: '#16a34a',
      edgeLabelBackground: '#f5f3ff',
      clusterBkg: '#f5f3ff',
      clusterBorder: '#7c3aed',
      titleColor: '#1e1b4b',
      classText: '#1e1b4b',
      fillType0: '#ede9fe',
      fillType1: '#dbeafe',
      fillType2: '#dcfce7',
      fillType3: '#fef3c7',
      fillType4: '#fce7f3',
      fillType5: '#f0f9ff',
      fillType6: '#fff7ed',
      fillType7: '#fdf4ff',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      nodeBorder: '#7c3aed',
    },
    securityLevel: 'loose',
    flowchart: { curve: 'basis', htmlLabels: true, padding: 20 },
    sequence: { actorMargin: 60, mirrorActors: false, boxMargin: 10, noteMargin: 10 },
    er: { diagramPadding: 20 },
  })
}

function cleanMermaidCode(code) {
  if (!code) return ''
  let cleaned = code.trim()
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n')
    const end = lines[lines.length - 1].trim() === '```' ? lines.length - 1 : lines.length
    cleaned = lines.slice(1, end).join('\n').trim()
  }
  cleaned = cleaned
    .replace(/^Graph /m, 'graph ')
    .replace(/^SequenceDiagram/m, 'sequenceDiagram')
    .replace(/^ClassDiagram/m, 'classDiagram')
    .replace(/^ErDiagram/m, 'erDiagram')
    .replace(/^GanttDiagram/m, 'gantt')
  return cleaned
}

export default function MermaidPreview({ code }) {
  const [svg, setSvg] = useState('')
  const [hasError, setHasError] = useState(false)
  const renderCounter = useRef(0)

  useEffect(() => {
    ensureInitialized()
    const cleaned = cleanMermaidCode(code)
    if (!cleaned) { setSvg(''); setHasError(false); return }

    const renderId = ++renderCounter.current
    const diagramId = `sketchflow-diagram-${Date.now()}-${renderId}`

    mermaid.render(diagramId, cleaned)
      .then(({ svg: renderedSvg }) => {
        if (renderId === renderCounter.current) {
          setSvg(renderedSvg)
          setHasError(false)
        }
      })
      .catch(() => {
        if (renderId === renderCounter.current) {
          setHasError(true)
          setSvg('')
        }
      })
  }, [code])

  if (!code?.trim()) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-white/20">Generate a diagram to see preview</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-center max-w-sm">
          <p className="text-sm font-medium text-amber-400 mb-1">Preview unavailable</p>
          <p className="text-xs text-white/40">
            The generated diagram has a syntax issue. Try editing the code or ask the AI to regenerate it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full w-full overflow-auto rounded-xl"
      style={{
        background: '#fafafa',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <style>{`
        .sketchflow-mermaid-wrap text,
        .sketchflow-mermaid-wrap .nodeLabel,
        .sketchflow-mermaid-wrap .edgeLabel,
        .sketchflow-mermaid-wrap .label,
        .sketchflow-mermaid-wrap .cluster-label,
        .sketchflow-mermaid-wrap span {
          fill: #1e1b4b !important;
          color: #1e1b4b !important;
        }
        .sketchflow-mermaid-wrap .edgeLabel rect {
          fill: #f5f3ff !important;
        }
        .sketchflow-mermaid-wrap .node rect,
        .sketchflow-mermaid-wrap .node polygon,
        .sketchflow-mermaid-wrap .node circle,
        .sketchflow-mermaid-wrap .node ellipse {
          fill: #ede9fe !important;
          stroke: #7c3aed !important;
        }
        .sketchflow-mermaid-wrap .cluster rect {
          fill: #f5f3ff !important;
          stroke: #7c3aed !important;
        }
      `}</style>
      <div className="min-h-full flex items-center justify-center p-6">
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="sketchflow-mermaid-wrap max-w-full overflow-auto drop-shadow-sm"
        />
      </div>
    </div>
  )
}