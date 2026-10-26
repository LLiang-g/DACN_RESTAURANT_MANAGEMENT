import { useEffect, useState } from "react"

/** Nút mũi tên ở góc phải dưới màn hình: cuộn về đầu trang. Chỉ hiện khi đã cuộn xuống một đoạn. */
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null
  return (
    <button className="customer-scroll-top" aria-label="Về đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
      ↑
    </button>
  )
}
