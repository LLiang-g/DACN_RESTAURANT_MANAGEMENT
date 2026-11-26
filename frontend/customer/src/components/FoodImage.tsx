import { useEffect, useState } from "react"
export default function FoodImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <span className="customer-food-image">{src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <span className="customer-image-fallback" role="img" aria-label={`${alt} — chưa có ảnh`}><span className="customer-placeholder-plate" aria-hidden="true"><i /><strong>S·</strong></span></span>}</span>
}