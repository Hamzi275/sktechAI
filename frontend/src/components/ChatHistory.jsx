import { ArrowUpRight } from 'lucide-react'

export default function ChatHistory({ messages, isStreaming }) {
  if (!messages.length) return null

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        const isAssistant = msg.role === 'assistant'

        return (
          <div key={i} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-5
                ${isAssistant
                  ? 'bg-white/[0.05] text-ink/80'
                  : 'bg-accent/20 text-ink border border-accent/20'}`}
            >
              <p className="whitespace-pre-wrap">
                {msg.content}
                {isStreaming && isLast && isAssistant && msg.content && (
                  <span className="ml-1 animate-blink text-accent">▌</span>
                )}
              </p>

              {isStreaming && isLast && isAssistant && !msg.content && (
                <span className="flex gap-1 mt-1">
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      className="w-1.5 h-1.5 bg-ink-dim rounded-full animate-bounce-dot"
                      style={{ animationDelay: `${n * 0.15}s` }}
                    />
                  ))}
                </span>
              )}

              {isAssistant && msg.citations?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.citations.map((c, ci) => (
                    <a
                      key={ci}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent hover:bg-accent/20 transition-colors"
                    >
                      {c.title} <ArrowUpRight size={9} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
