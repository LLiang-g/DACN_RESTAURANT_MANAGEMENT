import { printQR } from '../../utils/printQR';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRImage({ value, size = 180 }: { value: string; size?: number }) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {width: size * 2, margin: 4, errorCorrectionLevel: 'M'})
      .then(url => { if (active) setImage(url); }).catch(() => { if (active) setError('Không tạo được QR'); });
    return () => { active = false; };
  }, [value, size]);
  if (error) return <p role="alert">{error}</p>;
  return image ? <img className="qr-image" src={image} alt="Mã QR gọi món" width={size} height={size} /> : <p role="status">Đang tạo QR...</p>;
}
export default function QRCodeView({value,tableNumber,floor,size=180}: {value:string;tableNumber:string;floor:string;size?:number}) {
  return <div className="qr-container"><div className="qr-card printable-card">
    <h2>SMART POS · BÀN {tableNumber}</h2><p>{floor}</p><QRImage value={value} size={size} />
    <p>Quét mã để xem thực đơn và gọi món</p><small>{value}</small>
  </div><div className="qr-actions no-print"><button className="btn-primary" onClick={printQR}>In mã bàn này</button>
    <a className="btn-outline" href={value} target="_blank" rel="noreferrer">Mở giao diện khách</a></div></div>;
}
