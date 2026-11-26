import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { CollectionCase } from '../types/collection';
import CollectionWorkspace from './CollectionWorkspace';
export default function CollectionCaseBrowser({onClose}:{onClose:()=>void}){
 const [cases,setCases]=useState<CollectionCase[]>([]),[page,setPage]=useState(0),[invoice,setInvoice]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;apiClient.get<CollectionCase[]>(`/api/pos/collection-cases?page=${page}`).then(r=>{if(active)setCases(r.data);}).catch(()=>{if(active)setError('Không tải được hồ sơ.');});return()=>{active=false;};},[page,invoice]);
 return <div className="modal-backdrop" onClick={()=>{if(!busy)onClose();}}><div className="modal invoice-modal" onClick={e=>e.stopPropagation()}><h3>Đối chiếu và hoàn tiền toàn quán</h3><p>Các hồ sơ vẫn truy cập được sau khi bàn đã trả hoặc có khách mới.</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={onClose}>Đóng</button><button disabled={busy||page===0} onClick={()=>setPage(p=>p-1)}>Trang trước</button><span>Trang {page+1}</span><button disabled={busy||cases.length<50} onClick={()=>setPage(p=>p+1)}>Trang sau</button>{cases.map(c=><p key={c.id}><button disabled={busy} onClick={()=>setInvoice(c.invoiceId)}>Hóa đơn #{c.invoiceId} · {({REQUIRED:'Cần hoàn',PROCESSING:'Đang hoàn',REVIEW:'Cần đối chiếu'} as Record<string,string>)[c.status]??c.status} · {c.amount.toLocaleString('vi-VN')}đ</button></p>)}{invoice!==null&&<CollectionWorkspace key={invoice} invoiceId={invoice} blocked={false} onBusy={setBusy} onChanged={()=>{}}/>}</div></div>;
}
