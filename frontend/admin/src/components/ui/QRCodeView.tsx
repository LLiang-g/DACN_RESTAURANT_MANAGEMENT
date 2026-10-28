import { useState } from "react";

interface QRCodeViewProps {
  value: string;
  tableNumber: string;
  floor: string;
  size?: number;
}

export default function QRCodeView({
  value,
  tableNumber,
  floor,
  size = 200,
}: QRCodeViewProps) {
  const [loadError, setLoadError] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=10&data=${encodeURIComponent(
    value
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qr-container">
      <div className="qr-card printable-card">
        <div className="qr-header">
          <span className="qr-brand-tag">SMART POS RESTAURANT</span>
          <h2 className="qr-table-title">BÀN {tableNumber}</h2>
          <div className="qr-floor-tag">{floor}</div>
        </div>

        <div className="qr-body">
          {!loadError ? (
            <img
              src={qrUrl}
              alt={`Mã QR Bàn ${tableNumber}`}
              width={size}
              height={size}
              className="qr-image"
              onError={() => setLoadError(true)}
            />
          ) : (
            <div
              className="qr-fallback"
              style={{ width: size, height: size }}
              title="Mã bàn"
            >
              <div className="qr-fallback-pattern">
                <span className="qr-fallback-icon">📱</span>
                <span className="qr-fallback-code">BÀN #{tableNumber}</span>
              </div>
            </div>
          )}
        </div>

        <div className="qr-footer">
          <p className="qr-instruct">Quét mã QR để xem menu & gọi món</p>
          <div className="qr-url-text">{value}</div>
        </div>
      </div>

      <div className="qr-actions no-print">
        <button type="button" className="btn-primary" onClick={handlePrint}>
          🖨️ In mã bàn này
        </button>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline qr-test-link"
        >
          ↗ Thử mở giao diện khách
        </a>
      </div>
    </div>
  );
}
