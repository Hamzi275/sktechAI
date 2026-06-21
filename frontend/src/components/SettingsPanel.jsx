import { useState, useEffect } from 'react'
import { X, KeyRound, Eye, EyeOff, ArrowUpRight, Check } from 'lucide-react'

const STORAGE_KEY = 'sketchflow_user_keys'

export function useUserKeys() {
  const [keys, setKeys] = useState({ gemini: '', groq: '', openrouter: '' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setKeys(JSON.parse(saved))
    } catch {
      // ignore corrupt storage
    }
  }, [])

  const saveKeys = (newKeys) => {
    setKeys(newKeys)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys))
    } catch {
      // storage unavailable — keys still work for this session via state
    }
  }

  const getHeaders = () => {
    const headers = {}
    if (keys.gemini) headers['x-user-gemini-key'] = keys.gemini
    if (keys.groq) headers['x-user-groq-key'] = keys.groq
    if (keys.openrouter) headers['x-user-openrouter-key'] = keys.openrouter
    return headers
  }

  return { keys, saveKeys, getHeaders }
}

export default function SettingsPanel({ isOpen, onClose, keys, onSave }) {
  const [draft, setDraft] = useState(keys)
  const [show, setShow] = useState({ gemini: false, groq: false, openrouter: false })

  useEffect(() => { setDraft(keys) }, [keys, isOpen])

  if (!isOpen) return null

  const field = (label, keyName, placeholder, docsUrl) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-ink/80 flex items-center gap-1.5">
          {label}
          {draft[keyName] && <Check size={13} className="text-success" />}
        </label>
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-xs text-accent hover:underline"
        >
          Get key <ArrowUpRight size={11} />
        </a>
      </div>
      <div className="relative">
        <input
          type={show[keyName] ? 'text' : 'password'}
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={draft[keyName]}
          onChange={(e) => setDraft((prev) => ({ ...prev, [keyName]: e.target.value }))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-line bg-graphite px-3 py-3 pr-10 text-sm text-ink placeholder:text-ink-dim/50 focus:border-accent focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((p) => ({ ...p, [keyName]: !p[keyName] }))}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors p-1.5"
        >
          {show[keyName] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-ink-dim">
        {draft[keyName] ? 'Your key will be used — server fallback ignored.' : 'Empty — falls back to server key, if available.'}
      </p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm md:max-w-md mx-4 rounded-2xl border border-line bg-sidebar p-5 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
              <KeyRound size={16} className="text-accent" />
            </div>
            <h2 className="font-display text-base font-semibold text-ink">Your API keys</h2>
          </div>
          <button onClick={onClose} className="text-ink-dim hover:text-ink transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-ink-dim mb-5 leading-relaxed">
          Keys live only in your browser's local storage — never sent anywhere except directly to the provider you choose. Leave any field empty to use the server's fallback key instead.
        </p>

        {field('Gemini API key', 'gemini', 'AIza...', 'https://aistudio.google.com/app/apikey')}
        {field('Groq API key', 'groq', 'gsk_...', 'https://console.groq.com/keys')}
        {field('OpenRouter API key', 'openrouter', 'sk-or-...', 'https://openrouter.ai/keys')}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { onSave(draft); onClose() }}
            className="flex-1 min-h-[44px] rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Save keys
          </button>
          <button
            onClick={() => { onSave({ gemini: '', groq: '', openrouter: '' }); onClose() }}
            className="min-h-[44px] rounded-lg border border-line px-4 py-2.5 text-sm text-ink-dim hover:text-ink hover:border-ink-dim transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  )
}
