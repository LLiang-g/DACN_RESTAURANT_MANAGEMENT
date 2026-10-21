import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type ResourceKey = 'stations' | 'categories' | 'foods' | 'ingredients' | 'tables' | 'staff'
type RecordValue = string | number | null | undefined
type Entity = { id: number } & Record<string, RecordValue>

type Field = {
  name: string
  label: string
  type?: 'text' | 'number' | 'select'
  required?: boolean
  options?: string[]
}

type Resource = {
  key: ResourceKey
  label: string
  endpoint: string
  columns: { key: string; label: string }[]
  fields: Field[]
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

const resources: Resource[] = [
  {
    key: 'stations',
    label: 'Khu bếp',
    endpoint: '/api/admin/kitchen-stations',
    columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên khu bếp' }],
    fields: [{ name: 'name', label: 'Tên khu bếp', required: true }],
  },
  {
    key: 'categories',
    label: 'Danh mục món',
    endpoint: '/api/admin/categories',
    columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên danh mục' }, { key: 'kitchenStation', label: 'Khu bếp' }],
    fields: [
      { name: 'name', label: 'Tên danh mục', required: true },
      { name: 'stationId', label: 'ID khu bếp', type: 'number', required: true },
    ],
  },
  {
    key: 'foods',
    label: 'Món ăn',
    endpoint: '/api/admin/foods',
    columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên món' }, { key: 'price', label: 'Giá' }, { key: 'category', label: 'Danh mục' }],
    fields: [
      { name: 'name', label: 'Tên món', required: true },
      { name: 'categoryId', label: 'ID danh mục', type: 'number', required: true },
      { name: 'price', label: 'Giá bán', type: 'number', required: true },
      { name: 'description', label: 'Mô tả' },
      { name: 'image', label: 'URL hình ảnh' },
      { name: 'estimatedCookingTime', label: 'Thời gian chế biến (phút)', type: 'number' },
    ],
  },
  {
    key: 'ingredients',
    label: 'Nguyên liệu',
    endpoint: '/api/admin/ingredients',
    columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên nguyên liệu' }, { key: 'unit', label: 'Đơn vị' }, { key: 'stockQuantity', label: 'Tồn kho' }, { key: 'minThreshold', label: 'Tối thiểu' }],
    fields: [
      { name: 'name', label: 'Tên nguyên liệu', required: true },
      { name: 'unit', label: 'Đơn vị', required: true },
      { name: 'stockQuantity', label: 'Số lượng tồn', type: 'number', required: true },
      { name: 'minThreshold', label: 'Ngưỡng tối thiểu', type: 'number', required: true },
    ],
  },
  {
    key: 'tables',
    label: 'Bàn ăn',
    endpoint: '/api/admin/tables',
    columns: [{ key: 'id', label: 'ID' }, { key: 'floor', label: 'Tầng/khu vực' }, { key: 'tableNumber', label: 'Số bàn' }, { key: 'status', label: 'Trạng thái' }],
    fields: [
      { name: 'floor', label: 'Tầng/khu vực', required: true },
      { name: 'tableNumber', label: 'Số bàn', required: true },
      { name: 'status', label: 'Trạng thái', type: 'select', options: ['AVAILABLE', 'SERVING'] },
    ],
  },
  {
    key: 'staff',
    label: 'Tài khoản nhân viên',
    endpoint: '/api/admin/staff-accounts',
    columns: [{ key: 'id', label: 'ID' }, { key: 'username', label: 'Tên đăng nhập' }, { key: 'role', label: 'Vai trò' }],
    fields: [
      { name: 'username', label: 'Tên đăng nhập', required: true },
      { name: 'password', label: 'Mật khẩu', type: 'text' },
      { name: 'role', label: 'Vai trò', type: 'select', options: ['ADMIN', 'LE_TAN'], required: true },
    ],
  },
]

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('smart-pos-token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Yêu cầu thất bại (${response.status})`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await request<{ token: string; role: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (result.role !== 'ADMIN') throw new Error('Tài khoản không có quyền quản trị.')
      onLogin(result.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">SP</div>
        <p className="eyebrow">SMART POS</p>
        <h1>Đăng nhập quản trị</h1>
        <p className="muted">Quản lý vận hành nhà hàng trong một nơi.</p>
        <label>Tên đăng nhập<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
        <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <div className="alert error">{error}</div>}
        <button className="primary wide" disabled={loading}>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</button>
      </form>
    </main>
  )
}

function displayValue(entity: Entity, key: string) {
  const value = entity[key]
  if (value && typeof value === 'object') return '—'
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function AdminConsole({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState<ResourceKey>('stations')
  const [items, setItems] = useState<Entity[]>([])
  const [counts, setCounts] = useState<Record<ResourceKey, number>>({ stations: 0, categories: 0, foods: 0, ingredients: 0, tables: 0, staff: 0 })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Entity | null>(null)
  const [showForm, setShowForm] = useState(false)
  const resource = resources.find((entry) => entry.key === active) ?? resources[0]

  const loadResource = useCallback(async (next = resource) => {
    setLoading(true)
    setError('')
    try {
      const data = await request<Entity[]>(next.endpoint)
      setItems(data)
      setCounts((current) => ({ ...current, [next.key]: data.length }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [resource])

  useEffect(() => {
    void Promise.resolve().then(() => loadResource())
  }, [loadResource, active])
  useEffect(() => {
    let cancelled = false
    Promise.all(resources.map(async (entry) => [entry.key, (await request<Entity[]>(entry.endpoint)).length] as const))
      .then((values) => { if (!cancelled) setCounts(Object.fromEntries(values) as Record<ResourceKey, number>) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? items.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(normalized))) : items
  }, [items, query])

  async function remove(item: Entity) {
    if (!window.confirm(`Xóa bản ghi #${item.id}?`)) return
    try {
      await request(`${resource.endpoint}/${item.id}`, { method: 'DELETE' })
      setNotice('Đã xóa dữ liệu.')
      await loadResource()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa dữ liệu.')
    }
  }

  function selectResource(key: ResourceKey) {
    setActive(key)
    setQuery('')
    setNotice('')
    setError('')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark small">SP</span><span>Smart POS</span></div>
        <p className="nav-heading">QUẢN LÝ</p>
        <button className={`nav-item ${active === 'stations' ? 'active' : ''}`} onClick={() => selectResource('stations')}>▦ <span>Tổng quan</span></button>
        {resources.map((entry) => <button key={entry.key} className={`nav-item ${active === entry.key ? 'active' : ''}`} onClick={() => selectResource(entry.key)}>◼ <span>{entry.label}</span></button>)}
        <div className="sidebar-bottom"><button className="nav-item" onClick={onLogout}>↪ <span>Đăng xuất</span></button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div><p className="eyebrow">ADMIN CONSOLE</p><h1>Xin chào, Quản trị viên</h1></div><div className="profile"><span className="avatar">A</span><span>Administrator</span></div></header>
        <section className="content">
          <div className="summary-grid">{resources.slice(0, 4).map((entry) => <button className="summary-card" key={entry.key} onClick={() => selectResource(entry.key)}><span>{entry.label}</span><strong>{counts[entry.key]}</strong><small>Đang quản lý</small></button>)}</div>
          <div className="page-heading"><div><p className="eyebrow">DỮ LIỆU HỆ THỐNG</p><h2>{resource.label}</h2></div><button className="primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ Thêm mới</button></div>
          {notice && <div className="alert success">{notice}</div>}
          {error && <div className="alert error">{error}</div>}
          <section className="data-card">
            <div className="toolbar"><div className="search"><span>⌕</span><input placeholder={`Tìm trong ${resource.label.toLowerCase()}...`} value={query} onChange={(e) => setQuery(e.target.value)} /></div><span className="result-count">{filteredItems.length} bản ghi</span></div>
            {loading ? <div className="empty-state">Đang tải dữ liệu...</div> : filteredItems.length === 0 ? <div className="empty-state"><strong>Chưa có dữ liệu</strong><span>Thử thay đổi từ khóa hoặc thêm bản ghi mới.</span></div> : <div className="table-wrap"><table><thead><tr>{resource.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="actions-cell">Thao tác</th></tr></thead><tbody>{filteredItems.map((item) => <tr key={item.id}>{resource.columns.map((column) => <td key={column.key}>{displayValue(item, column.key)}</td>)}<td className="actions-cell"><button className="text-button" onClick={() => { setEditing(item); setShowForm(true) }}>Sửa</button><button className="text-button danger" onClick={() => void remove(item)}>Xóa</button></td></tr>)}</tbody></table></div>}
          </section>
        </section>
      </main>
      {showForm && <EntityForm resource={resource} entity={editing} onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); setNotice(editing ? 'Đã cập nhật dữ liệu.' : 'Đã thêm dữ liệu.'); await loadResource() }} />}
    </div>
  )
}

function EntityForm({ resource, entity, onClose, onSaved }: { resource: Resource; entity: Entity | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(resource.fields.map((field) => [field.name, String(entity?.[field.name] ?? '')])))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = Object.fromEntries(resource.fields.filter((field) => field.name !== 'password' || values.password).map((field) => [field.name, field.type === 'number' ? Number(values[field.name]) : values[field.name]]))
    if (resource.key === 'categories') payload.stationId = Number(values.stationId)
    try {
      await request(entity ? `${resource.endpoint}/${entity.id}` : resource.endpoint, { method: entity ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu dữ liệu.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">{entity ? 'CHỈNH SỬA' : 'TẠO MỚI'}</p><h2>{resource.label}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">×</button></div><div className="form-grid">{resource.fields.map((field) => <label key={field.name}>{field.label}{field.options ? <select value={values[field.name]} onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))} required={field.required}><option value="">Chọn...</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.type === 'number' ? 'number' : 'text'} value={values[field.name]} onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))} required={field.required} placeholder={field.name === 'password' && entity ? 'Để trống nếu không đổi' : undefined} />}</label>)}</div>{error && <div className="alert error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Hủy</button><button className="primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div></form></div>
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('smart-pos-token'))
  if (!token) return <Login onLogin={(nextToken) => { localStorage.setItem('smart-pos-token', nextToken); setToken(nextToken) }} />
  return <AdminConsole onLogout={() => { localStorage.removeItem('smart-pos-token'); setToken(null) }} />
}
