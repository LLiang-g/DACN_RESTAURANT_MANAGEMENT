import { useCallback, useEffect, useRef, useState } from "react"

interface CategoryTab {
  key: string
  label: string
}

/**
 * Thanh danh mục cuộn ngang một hàng. Thanh cuộn mặc định bị ẩn,
 * thay bằng vạch mảnh có con trượt vuông màu cam (kéo được, bấm vào vạch để nhảy tới).
 */
export default function CategoryTabs({ tabs, activeKey, onSelect }: {
  tabs: CategoryTab[]
  activeKey: string
  onSelect: (key: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ width: 0, left: 0, visible: false })

  const updateThumb = useCallback(() => {
    const scroller = scrollRef.current
    const track = trackRef.current
    if (!scroller || !track) return
    const overflow = scroller.scrollWidth - scroller.clientWidth
    if (overflow <= 1) {
      setThumb({ width: 0, left: 0, visible: false })
      return
    }
    const trackWidth = track.clientWidth
    const width = Math.max(28, (scroller.clientWidth / scroller.scrollWidth) * trackWidth)
    const left = (scroller.scrollLeft / overflow) * (trackWidth - width)
    setThumb({ width, left, visible: true })
  }, [])

  useEffect(() => {
    updateThumb()
    window.addEventListener("resize", updateThumb)
    return () => window.removeEventListener("resize", updateThumb)
  }, [updateThumb, tabs])

  // Đổi vị trí chuột trên vạch thành vị trí cuộn
  function scrollToTrackPosition(clientX: number) {
    const scroller = scrollRef.current
    const track = trackRef.current
    if (!scroller || !track) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - thumb.width / 2) / (rect.width - thumb.width)))
    scroller.scrollLeft = ratio * (scroller.scrollWidth - scroller.clientWidth)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    scrollToTrackPosition(event.clientX)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) scrollToTrackPosition(event.clientX)
  }

  return (
    <nav className="customer-tabs">
      <div className="customer-tabs-scroll" ref={scrollRef} onScroll={updateThumb}>
        {tabs.map((tabItem) => (
          <button key={tabItem.key} className={tabItem.key === activeKey ? "active" : ""} onClick={() => onSelect(tabItem.key)}>
            {tabItem.label}
          </button>
        ))}
      </div>
      <div
        className="customer-tabs-track"
        ref={trackRef}
        style={{ visibility: thumb.visible ? "visible" : "hidden" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <div className="customer-tabs-thumb" style={{ width: thumb.width, left: thumb.left }} />
      </div>
    </nav>
  )
}
