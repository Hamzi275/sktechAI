import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Whiteboard-with-color theme: light dotted canvas, violet-tinted boxes so
// class diagrams (and everything else) stay readable instead of white-on-white.
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: '#fafafa',
    primaryColor: '#ede9fe',
    primaryTextColor: '#1e1b4b',
    primaryBorderColor: '#7c3aed',
    lineColor: '#4c1d95',
    secondaryColor: '#e0f2fe',
    secondaryTextColor: '#1e1b4b',
    secondaryBorderColor: '#0284c7',
    tertiaryColor: '#f0fdf4',
    tertiaryTextColor: '#1e1b4b',
    tertiaryBorderColor: '#16a34a',
    classText: '#1e1b4b',
    nodeTextColor: '#1e1b4b',
    titleColor: '#1e1b4b',
    textColor: '#1e1b4b',
    edgeLabelBackground: '#fafafa',
    clusterBkg: '#f3f0ff',
    clusterBorder: '#7c3aed',
    fillType0: '#ede9fe',
    fillType1: '#dbeafe',
    fillType2: '#dcfce7',
    fillType3: '#fef3c7',
    fillType4: '#fce7f3',
    fillType5: '#f0f9ff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
  },
  securityLevel: 'loose',
  flowchart: { curve: 'basis', htmlLabels: true },
  sequence: { actorMargin: 50, mirrorActors: false },
})

export default function MermaidPreview({ code }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const counter = useRef(0)

  useEffect(() => {
    if (!code?.trim()) {
      setSvg('')
      setError('')
      return
    }

    let cancelled = false
    const id = `mermaid-diagram-${Date.now()}-${++counter.current}`

    mermaid.render(id, code)
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(renderedSvg)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Diagram syntax error — check the code tab for details.')
          setSvg('')
        }
      })

    return () => { cancelled = true }
  }, [code])

  if (!code?.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-ink-dim text-sm">
        Nothing to preview yet
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent max-w-md text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full w-full overflow-auto rounded-xl"
      style={{
        background: 'linear-gradient(135deg, #fafafa 0%, #f5f3ff 100%)',
        backgroundImage: 'radial-gradient(#e2e2e2 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Force every text element in the rendered SVG to a dark, readable
          color and force edge-label backgrounds to match the whiteboard —
          Mermaid's themeVariables don't reliably reach every node/label/
          cluster-title element, so this CSS is the part that actually fixes
          the low-contrast text seen in node boxes and subgraph titles. */}
      <style>{`
        .mermaid-canvas-wrapper text,
        .mermaid-canvas-wrapper .nodeLabel,
        .mermaid-canvas-wrapper .edgeLabel,
        .mermaid-canvas-wrapper .label,
        .mermaid-canvas-wrapper .cluster-label,
        .mermaid-canvas-wrapper span {
          fill: #1e1b4b !important;
          color: #1e1b4b !important;
        }
        .mermaid-canvas-wrapper .edgeLabel,
        .mermaid-canvas-wrapper .edgeLabel rect {
          background-color: #fafafa !important;
          fill: #fafafa !important;
        }
        .mermaid-canvas-wrapper .edgeLabel text,
        .mermaid-canvas-wrapper .edgeLabel span {
          fill: #1e1b4b !important;
          color: #1e1b4b !important;
        }
        .mermaid-canvas-wrapper .cluster rect {
          fill: #f3f0ff !important;
          stroke: #7c3aed !important;
        }
        .mermaid-canvas-wrapper .node rect,
        .mermaid-canvas-wrapper .node polygon,
        .mermaid-canvas-wrapper .node circle {
          fill: #ede9fe !important;
          stroke: #7c3aed !important;
        }
      `}</style>
      <div className="min-h-full flex items-center justify-center p-4 md:p-6">
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="mermaid-canvas-wrapper max-w-full overflow-auto shadow-sm"
        />
      </div>
    </div>
  )
}