export function printQR() {
  const cards = document.querySelectorAll('.modal-backdrop .printable-card');
  if (!cards.length || [...cards].some(c => !c.querySelector('img') || [...c.querySelectorAll('img')].some(i => !i.complete || !i.naturalWidth))) {
    alert('Vui lòng chờ mã QR tải xong trước khi in.'); return;
  }
  window.print();
}
