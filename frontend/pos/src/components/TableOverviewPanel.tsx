import { useState } from 'react';
import type { TableOverview } from '../types/pos';
interface Props { tables: TableOverview[]; onSelectInvoice: (invoiceId: number) => void; }
type Filter = 'ALL' | 'AVAILABLE' | 'SERVING';
export default function TableOverviewPanel({ tables, onSelectInvoice }: Props) {
  const [floor, setFloor] = useState('ALL');
  const [status, setStatus] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const floors = [...new Set(tables.map(table => table.floor))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  const visible = tables.filter(table => (floor === 'ALL' || table.floor === floor)
    && (status === 'ALL' || table.status === status)
    && `${table.tableNumber} ${table.floor}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const byFloor = visible.reduce<Record<string, TableOverview[]>>((acc, table) => { (acc[table.floor] ??= []).push(table); return acc; }, {});
  return <div className="table-overview">
    <div className="pos-section-heading"><div><h2>Không gian nhà hàng</h2><p>Chọn bàn để xem chi tiết hóa đơn.</p></div><span className="pos-soft-badge">{visible.length} bàn</span></div>
    <div className="pos-table-toolbar"><label className="pos-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Tìm bàn hoặc tầng" placeholder="Tìm số bàn, tầng…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Lọc tầng" value={floor} onChange={event => setFloor(event.target.value)}><option value="ALL">Tất cả tầng</option>{floors.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
    <div className="pos-table-filters" aria-label="Lọc trạng thái bàn">{([{ value: 'ALL', label: 'Tất cả' }, { value: 'SERVING', label: 'Đang phục vụ' }, { value: 'AVAILABLE', label: 'Bàn trống' }] as const).map(item => <button key={item.value} aria-pressed={status === item.value} className={status === item.value ? 'active' : ''} onClick={() => setStatus(item.value)}>{item.label}</button>)}</div>
    {Object.entries(byFloor).sort(([a], [b]) => a.localeCompare(b, 'vi', { numeric: true })).map(([name, floorTables]) => <section key={name}><div className="pos-floor-heading"><h3>{name}</h3><span>{floorTables.length} bàn</span></div><div className="table-grid">{[...floorTables].sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, 'vi', { numeric: true })).map(table => <button type="button" key={table.tableId} className={`table-card ${table.status.toLowerCase()} ${table.invoiceId ? 'clickable' : ''}`} disabled={!table.invoiceId} onClick={() => { if (table.invoiceId) onSelectInvoice(table.invoiceId); }} aria-label={`Bàn ${table.tableNumber}, ${name}, ${table.status === 'SERVING' ? 'đang phục vụ' : 'trống'}${table.invoiceId ? ', mở hóa đơn' : ''}`}>
      <span className="pos-table-card-top"><span className="pos-table-glyph" aria-hidden="true">▦</span><span className="pos-table-status-dot" /></span><strong>{table.tableNumber}</strong><span className="pos-table-status-text">{table.status === 'SERVING' ? 'Đang phục vụ' : 'Sẵn sàng đón khách'}</span><span className="pos-table-card-bottom">{table.invoiceId ? <>Xem hóa đơn <span aria-hidden="true">↗</span></> : <>Bàn trống <span aria-hidden="true">—</span></>}</span>
    </button>)}</div></section>)}
    {visible.length === 0 && <div className="pos-empty-state"><span aria-hidden="true">▦</span><h3>{tables.length === 0 ? 'Chưa có bàn để hiển thị' : 'Không tìm thấy bàn phù hợp'}</h3><p>{tables.length === 0 ? 'Kiểm tra cấu hình bàn hoặc thử làm mới dữ liệu.' : 'Thử đổi tầng, trạng thái hoặc từ khóa tìm kiếm.'}</p><button onClick={() => { setFloor('ALL'); setStatus('ALL'); setSearch(''); }}>Xóa bộ lọc</button></div>}
    <div className="pos-table-legend"><span><i className="serving" /> Đang phục vụ</span><span><i /> Bàn trống</span><small>Bàn trống chưa có hóa đơn để mở</small></div>
  </div>;
}