import { useEffect, useId, useRef, useState } from 'react'
import './TodayFoodChat.css'

type Message = { id: number; role: 'assistant' | 'user'; text: string }
const welcome: Message = { id: 0, role: 'assistant', text: 'Chào bạn! Hôm nay bạn muốn ăn gì? Hãy chia sẻ khẩu vị, số người và ngân sách dự kiến nhé.' }
const prompts = ['Ăn nhẹ một chút', 'Bữa ngon cho 2 người', 'Mình thích món không cay']
function ChatIcon() {
  return <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2V11.5A7.5 7.5 0 0 1 10.5 4H13" /><path d="m18 2 1.2 3.8L23 7l-3.8 1.2L18 12l-1.2-3.8L13 7l3.8-1.2L18 2Z" /><path d="M7 12h7M7 15h4" /></svg>
}
export default function TodayFoodChat() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([welcome])
  const nextId = useRef(1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const titleId = useId(), noteId = useId()

  useEffect(() => {
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
      if (event.key !== 'Tab') return
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])
      const first = elements[0], last = elements[elements.length - 1]
      if (!first || !last) { event.preventDefault(); dialogRef.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; triggerRef.current?.focus() }
  }, [open])
  useEffect(() => { if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [messages, open])

  function send() {
    const text = draft.trim()
    if (!text) return
    setMessages(current => [...current,
      { id: nextId.current++, role: 'user', text },
      { id: nextId.current++, role: 'assistant', text: 'Mình đã nhận tin nhắn trong bản xem trước. Tính năng gợi ý bằng AI đang được chuẩn bị, chưa có phản hồi từ AI thật nhé.' },
    ])
    setDraft('')
    inputRef.current?.focus()
  }
  return <>
    <button ref={triggerRef} className="today-food-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span className="today-food-trigger-icon"><ChatIcon /></span><span><strong>Hôm nay ăn gì?</strong><small>Trợ lý chọn món</small></span><span className="today-food-ai-tag">AI</span>
    </button>
    {open && <div className="today-food-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <div ref={dialogRef} className="today-food-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={noteId} tabIndex={-1}>
        <header className="today-food-head"><span className="today-food-avatar"><ChatIcon /></span><div><p>TRỢ LÝ CHỌN MÓN</p><h2 id={titleId}>Hôm nay ăn gì?</h2><span>Thêm một chút cảm hứng cho bữa ngon</span></div><button className="today-food-close" onClick={() => setOpen(false)} aria-label="Đóng Hôm nay ăn gì?">×</button></header>
        <p className="today-food-preview" id={noteId}><span aria-hidden="true">◌</span> Bản xem trước giao diện · Chưa kết nối AI</p>
        <div ref={logRef} className="today-food-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Cuộc trò chuyện chọn món">
          <div className="today-food-intro"><span aria-hidden="true">✦</span><h3>Một bữa ngon, đúng ý bạn.</h3><p>Bắt đầu từ điều bạn đang thèm.</p></div>
          {messages.map(message => <div key={message.id} className={`today-food-message ${message.role}`}><span className="today-food-sender">{message.role === 'user' ? 'Bạn' : 'Hôm nay ăn gì?'}</span><p>{message.text}</p></div>)}
        </div>
        <div className="today-food-prompts" aria-label="Gợi ý bắt đầu trò chuyện">{prompts.map(prompt => <button key={prompt} onClick={() => { setDraft(prompt); inputRef.current?.focus() }}>{prompt}<span aria-hidden="true">↗</span></button>)}</div>
        <form className="today-food-compose" onSubmit={event => { event.preventDefault(); send() }}>
          <label className="today-food-input-label" htmlFor={titleId + '-input'}>Chia sẻ điều bạn muốn ăn</label>
          <div><textarea id={titleId + '-input'} ref={inputRef} rows={2} maxLength={500} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ví dụ: 2 người, thích hải sản, không cay…" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} /><button className="today-food-send" type="submit" disabled={!draft.trim()} aria-label="Gửi tin nhắn"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v15" /></svg></button></div>
          <footer><span>Enter để gửi · Shift + Enter xuống dòng</span><button type="button" onClick={() => { setMessages([welcome]); setDraft(''); inputRef.current?.focus() }}>Trò chuyện mới</button></footer>
        </form>
      </div>
    </div>}
  </>
}
