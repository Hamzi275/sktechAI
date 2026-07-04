import { useState, useEffect } from 'react'

const STORAGE_KEY = 'sketchflow_chat_history'
const MAX_MESSAGES = 24

export default function useChatMemory() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMessages(parsed.slice(-MAX_MESSAGES))
      }
    } catch {
      setMessages([])
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
    } catch {}
  }, [messages])

  const addMessage = (message) => {
    setMessages(prev => [...prev, message].slice(-MAX_MESSAGES))
  }

  const updateLastMessage = (updater) => {
    setMessages(prev => {
      if (!prev.length) return prev
      const updated = [...prev]
      updated[updated.length - 1] = updater(updated[updated.length - 1])
      return updated
    })
  }

  const clearHistory = () => {
    setMessages([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const clearForNewImage = () => clearHistory()

  const getApiHistory = () => {
    return messages
      .filter(m => m.content && m.role)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-12)
  }

  return { messages, addMessage, updateLastMessage, clearHistory, clearForNewImage, getApiHistory }
}