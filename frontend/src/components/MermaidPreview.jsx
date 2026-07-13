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

      // --- Added: sequence diagram text/background coverage ---
      // Without these, actor/note text falls back to the theme's
      // default (light) color and can become unreadable on a white board.
      actorTextColor: '#1e1b4b',
      actorBkg: '#ede9fe',
      actorBorder: '#7c3aed',
      actorLineColor: '#7c3aed',
      labelTextColor: '#1e1b4b',
      loopTextColor: '#1e1b4b',
      noteTextColor: '#1e1b4b',
      noteBkgColor: '#fef3c7',
      noteBorderColor: '#d97706',
      sequenceNumberColor: '#ffffff',
      activationBorderColor: '#7c3aed',
      activationBkgColor: '#ede9fe',

      // --- Added: gantt chart text/background coverage ---
      taskTextColor: '#1e1b4b',
      taskTextOutsideColor: '#1e1b4b',
      taskTextLightColor: '#1e1b4b',
      taskTextDarkColor: '#1e1b4b',
      sectionBkgColor: '#f5f3ff',
      sectionBkgColor2: '#dbeafe',
      gridColor: '#d1d5db',
      todayLineColor: '#dc2626',

      // --- Added: pie chart text coverage ---
      pieTitleTextColor: '#1e1b4b',
      pieSectionTextColor: '#1e1b4b',
      pieLegendTextColor: '#1e1b4b',
      pieStrokeColor: '#ffffff',
      pieOuterStrokeColor: '#ffffff',
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
  const isMountedRef = useRef(true)

  // FIX (Bug 2): track mount state so a pending render's .then/.catch
  // never calls setState after the component has unmounted.
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    ensureInitialized()
    const cleaned = cleanMermaidCode(code)
    if (!cleaned) { setSvg(''); setHasError(false); return }

    const renderId = ++renderCounter.current
    const diagramId = `sketchflow-diagram-${Date.now()}-${renderId}`

    mermaid.render(diagramId, cleaned)
      .then(({ svg: renderedSvg }) => {
        if (isMountedRef.current && renderId === renderCounter.current) {
          setSvg(renderedSvg)
          setHasError(false)
        }
      })
      .catch(() => {
        if (isMountedRef.current && renderId === renderCounter.current) {
          setHasError(true)
          setSvg('')
        }
      })
      .finally(() => {
        // FIX (Bug 1): mermaid.render() can leave a temporary
        // measurement node (id === diagramId, or prefixed with 'd')
        // attached to the DOM — normally only cleaned up on the
        // success path internally. On failure it can be orphaned
        // permanently. Explicitly remove any leftover node here so
        // repeated failed renders don't accumulate in the DOM.
        const leftover =
          document.getElementById(diagramId) ||
          document.getElementById(`d${diagramId}`)
        if (leftover && leftover.parentNode) {
          leftover.parentNode.removeChild(leftover)
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
        /* Force the diagram board itself to a solid white background,
           regardless of what theme/CSS the mermaid SVG produces. */
        .sketchflow-mermaid-wrap svg {
          background: #ffffff !important;
        }

        /* Broad catch-all: every text-bearing element in the diagram
           stays dark on white. 'text' covers <text> and its <tspan>
           children via SVG fill inheritance. */
        .sketchflow-mermaid-wrap text,
        .sketchflow-mermaid-wrap tspan,
        .sketchflow-mermaid-wrap .nodeLabel,
        .sketchflow-mermaid-wrap .edgeLabel,
        .sketchflow-mermaid-wrap .label,
        .sketchflow-mermaid-wrap .cluster-label,
        .sketchflow-mermaid-wrap .actor-line,
        .sketchflow-mermaid-wrap .messageText,
        .sketchflow-mermaid-wrap .loopText,
        .sketchflow-mermaid-wrap .noteText,
        .sketchflow-mermaid-wrap .labelText,
        .sketchflow-mermaid-wrap .titleText,
        .sketchflow-mermaid-wrap .sectionTitle,
        .sketchflow-mermaid-wrap .taskText,
        .sketchflow-mermaid-wrap .taskTextOutsideRight,
        .sketchflow-mermaid-wrap .taskTextOutsideLeft,
        .sketchflow-mermaid-wrap .legend,
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

        /* Sequence diagram notes/actors: force a light background so
           dark text stays readable rather than blending into whatever
           the theme picked. */
        .sketchflow-mermaid-wrap .note {
          fill: #fef3c7 !important;
          stroke: #d97706 !important;
        }
        .sketchflow-mermaid-wrap .actor {
          fill: #ede9fe !important;
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