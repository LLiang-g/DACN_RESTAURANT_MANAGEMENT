import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import DataTable, { type Column } from "../components/ui/DataTable";
import RowActions from "../components/ui/RowActions";
import Modal from "../components/ui/Modal";
import QRCodeView from "../components/ui/QRCodeView";
import Toast, { type ToastMessage } from "../components/ui/Toast";
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
} from "../services/adminApi";
import { mockTables } from "../data/mock";
import type { RestaurantTable, TableStatus } from "../types";

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Filters
  const [filterFloor, setFilterFloor] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Selection for Batch QR Printing
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);

  // Add / Edit Modal
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableForm, setTableForm] = useState<{
    floor: string;
    tableNumber: string;
    status: TableStatus;
  }>({
    floor: "Tầng 1",
    tableNumber: "",
    status: "AVAILABLE",
  });

  // Single QR View Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrTable, setCurrentQrTable] = useState<RestaurantTable | null>(null);

  // Batch Print Modal
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const addToast = (type: "success" | "error" | "info", text: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, text }]);
  };

  const loadData = async () => {
    try {
      const data = await getTables();
      setTables(data);
    } catch {
      setTables(mockTables);
    }
  };

  useEffect(() => {
    let active = true;
    getTables().catch(() => mockTables).then(tables => { if (active) setTables(tables); });
    return () => { active = false; };
  }, []);

  // Distinct floors
  const floors = useMemo(() => {
    const set = new Set(tables.map((t) => t.floor));
    return Array.from(set).sort();
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchFloor = !filterFloor || t.floor === filterFloor;
      const matchStatus = !filterStatus || t.status === filterStatus;
      return matchFloor && matchStatus;
    });
  }, [tables, filterFloor, filterStatus]);

  // Handlers
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableForm({
      floor: floors[0] || "Tầng 1",
      tableNumber: "",
      status: "AVAILABLE",
    });
    setTableModalOpen(true);
  };

  const handleOpenEditTable = (t: RestaurantTable) => {
    setEditingTable(t);
    setTableForm({
      floor: t.floor,
      tableNumber: t.tableNumber,
      status: t.status,
    });
    setTableModalOpen(true);
  };

  const handleSaveTable = async () => {
    if (!tableForm.tableNumber.trim()) {
      addToast("error", "Số hiệu bàn không được để trống");
      return;
    }
    try {
      if (editingTable) {
        await updateTable(editingTable.id, tableForm);
        addToast("success", `Đã cập nhật bàn "${tableForm.tableNumber}"`);
      } else {
        await createTable(tableForm);
        addToast("success", `Đã thêm bàn "${tableForm.tableNumber}"`);
      }
      setTableModalOpen(false);
      loadData();
    } catch {
      if (editingTable) {
        setTables((prev) =>
          prev.map((t) => (t.id === editingTable.id ? { ...t, ...tableForm } : t))
        );
      } else {
        setTables((prev) => [...prev, { id: Date.now(), ...tableForm }]);
      }
      setTableModalOpen(false);
      addToast("success", "Lưu bàn thành công (local)");
    }
  };

  const handleDeleteTable = async (t: RestaurantTable) => {
    if (!window.confirm(`Xóa bàn "${t.tableNumber}" (${t.floor})?`)) return;
    try {
      await deleteTable(t.id);
      addToast("success", `Đã xóa bàn "${t.tableNumber}"`);
      loadData();
    } catch {
      setTables((prev) => prev.filter((x) => x.id !== t.id));
      addToast("info", `Đã xóa bàn "${t.tableNumber}" (local)`);
    }
  };

  const handleOpenQR = (t: RestaurantTable) => {
    setCurrentQrTable(t);
    setQrModalOpen(true);
  };

  // Selection toggle
  const toggleSelectTable = (id: number) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedTableIds.length === filteredTables.length) {
      setSelectedTableIds([]);
    } else {
      setSelectedTableIds(filteredTables.map((t) => t.id));
    }
  };

  const getTableQrUrl = (tableId: number) => {
    const origin = window.location.origin;
    return `${origin}/?table=${tableId}`;
  };

  const selectedTables = tables.filter((t) => selectedTableIds.includes(t.id));

  const columns: Column<RestaurantTable>[] = [
    {
      key: "checkbox",
      header: "Chọn",
      render: (t) => (
        <input
          type="checkbox"
          checked={selectedTableIds.includes(t.id)}
          onChange={() => toggleSelectTable(t.id)}
          aria-label={`Chọn bàn ${t.tableNumber}`}
        />
      ),
    },
    { key: "floor", header: "Tầng", className: "strong" },
    { key: "tableNumber", header: "Số bàn", className: "strong" },
    {
      key: "status",
      header: "Trạng thái",
      render: (t) =>
        t.status === "SERVING" ? (
          <span className="badge">Đang phục vụ</span>
        ) : (
          <span className="badge badge-neutral">Trống</span>
        ),
    },
    {
      key: "qrCode",
      header: "Mã QR dán bàn",
      render: (t) => (
        <button
          type="button"
          className="link edit"
          onClick={() => handleOpenQR(t)}
        >
          Mã QR
        </button>
      ),
    },
  ];

  return (
    <div className="tables-page">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PageHeader
        title="Bàn ăn"
        subtitle={`${tables.length} bàn · ${floors.length} tầng`}
      >
        <button className="link" onClick={() => setShowTools(!showTools)}>{showTools ? "Thu gọn" : "Bộ lọc & Mã QR"}</button>
        {showTools && (<>        <button
          type="button"
          className="btn-outline"
          disabled={selectedTableIds.length === 0}
          onClick={() => setBatchPrintModalOpen(true)}
          title="In thẻ mã QR cho các bàn đã chọn"
        >
          🖨️ In mã QR ({selectedTableIds.length})
        </button>
</>)}
        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenAddTable}
        >
          + Thêm bàn
        </button>
      </PageHeader>

      {/* Toolbar */}
      {showTools && <div className="toolbar">
        <select
          className="field"
          value={filterFloor}
          onChange={(e) => setFilterFloor(e.target.value)}
        >
          <option value="">Tất cả các tầng / khu vực</option>
          {floors.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          className="field"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="AVAILABLE">Bàn trống (AVAILABLE)</option>
          <option value="SERVING">Đang phục vụ (SERVING)</option>
        </select>

        <button
          type="button"
          className="btn-outline"
          onClick={selectAllFiltered}
        >
          {selectedTableIds.length === filteredTables.length && filteredTables.length > 0
            ? "Bỏ chọn tất cả"
            : `Chọn tất cả (${filteredTables.length} bàn)`}
        </button>
      </div>}

      <DataTable
        columns={showTools ? columns : columns.filter(c => c.key !== "checkbox" && c.key !== "qrCode")}
        rows={filteredTables}
        empty="Không tìm thấy bàn nào phù hợp"
        actions={(t) => (
          <RowActions
            onEdit={() => handleOpenEditTable(t)}
            onDelete={() => handleDeleteTable(t)}
          />
        )}
      />

      {/* MODAL THÊM / SỬA BÀN */}
      <Modal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        title={editingTable ? "Sửa thông tin bàn" : "Thêm bàn mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setTableModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveTable}>
              Lưu bàn
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tầng / Khu vực *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Tầng 1, Tầng 2, Sân thượng, Ngoài trời..."
            value={tableForm.floor}
            onChange={(e) =>
              setTableForm({ ...tableForm, floor: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Số hiệu bàn *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: T1-01, Bàn 05, VIP-01..."
            value={tableForm.tableNumber}
            onChange={(e) =>
              setTableForm({ ...tableForm, tableNumber: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Trạng thái bàn ban đầu</label>
          <select
            className="field wide"
            value={tableForm.status}
            onChange={(e) =>
              setTableForm({
                ...tableForm,
                status: e.target.value as TableStatus,
              })
            }
          >
            <option value="AVAILABLE">Trống (AVAILABLE)</option>
            <option value="SERVING">Đang có khách (SERVING)</option>
          </select>
        </div>
      </Modal>

      {/* MODAL XEM MÃ QR ĐƠN BÀN */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={`Mã QR dán bàn: ${currentQrTable?.tableNumber || ""}`}
        maxWidth="440px"
      >
        {currentQrTable && (
          <QRCodeView
            value={getTableQrUrl(currentQrTable.id)}
            tableNumber={currentQrTable.tableNumber}
            floor={currentQrTable.floor}
            size={180}
          />
        )}
      </Modal>

      {/* MODAL IN HÀNG LOẠT MÃ QR (BATCH PRINT) */}
      <Modal
        isOpen={batchPrintModalOpen}
        onClose={() => setBatchPrintModalOpen(false)}
        title={`In mã QR (${selectedTables.length} bàn đã chọn)`}
        maxWidth="820px"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setBatchPrintModalOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.print()}
            >
              🖨️ In tất cả {selectedTables.length} thẻ bàn
            </button>
          </>
        }
      >
        <p className="form-hint mb-4 no-print">
          * Nhấn nút <strong>"In tất cả thẻ bàn"</strong> bên dưới. Trình duyệt sẽ mở hộp thoại in với định dạng thẻ chuẩn đẹp để cắt dán lên bàn ăn.
        </p>

        <div className="batch-qr-grid">
          {selectedTables.map((t) => (
            <div key={t.id} className="batch-qr-item printable-card">
              <div className="qr-brand-tag">SMART POS</div>
              <h3 className="qr-table-title">BÀN {t.tableNumber}</h3>
              <div className="qr-floor-tag">{t.floor}</div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(
                  getTableQrUrl(t.id)
                )}`}
                alt={`QR ${t.tableNumber}`}
                width={140}
                height={140}
                className="qr-image"
              />
              <p className="qr-instruct">Quét mã để xem menu & gọi món</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
