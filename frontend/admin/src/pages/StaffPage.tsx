import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import DataTable, { type Column } from "../components/ui/DataTable";
import RowActions from "../components/ui/RowActions";
import Modal from "../components/ui/Modal";
import Toast, { type ToastMessage } from "../components/ui/Toast";
import {
  getStaffAccounts,
  createStaffAccount,
  updateStaffAccount,
  deleteStaffAccount,
  getActivityLogs,
} from "../services/adminApi";
import { mockStaffAccounts } from "../data/mock";
import { formatDateTime } from "../utils/format";
import type { StaffAccount, ActivityLog, StaffRole } from "../types";

export default function StaffPage() {
  const [tab, setTab] = useState("accounts");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Staff Account Modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [staffForm, setStaffForm] = useState<{
    username: string;
    password: "";
    role: StaffRole;
  }>({
    username: "",
    password: "",
    role: "RECEPTIONIST",
  });

  const addToast = (type: "success" | "error" | "info", text: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, text }]);
  };

  const loadData = async () => {
    try {
      const [st, lg] = await Promise.all([
        getStaffAccounts().catch(() => mockStaffAccounts),
        getActivityLogs().catch(() => []),
      ]);
      setStaffAccounts(st);
      setLogs(lg);
    } catch {
      setStaffAccounts(mockStaffAccounts);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([getStaffAccounts().catch(() => mockStaffAccounts), getActivityLogs().catch(() => [])])
      .then(([accounts, logs]) => { if (active) { setStaffAccounts(accounts); setLogs(logs); } });
    return () => { active = false; };
  }, []);

  // Staff Account Handlers
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      username: "",
      password: "",
      role: "RECEPTIONIST",
    });
    setStaffModalOpen(true);
  };

  const handleOpenEditStaff = (st: StaffAccount) => {
    setEditingStaff(st);
    setStaffForm({
      username: st.username,
      password: "",
      role: st.role,
    });
    setStaffModalOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!staffForm.username.trim()) {
      addToast("error", "Tên đăng nhập không được để trống");
      return;
    }
    if (!editingStaff && !staffForm.password.trim()) {
      addToast("error", "Vui lòng nhập mật khẩu cho tài khoản mới");
      return;
    }

    try {
      if (editingStaff) {
        await updateStaffAccount(editingStaff.id, {
          username: staffForm.username.trim(),
          password: staffForm.password ? staffForm.password : undefined,
          role: staffForm.role,
        });
        addToast("success", `Đã cập nhật tài khoản "${staffForm.username}"`);
      } else {
        await createStaffAccount({
          username: staffForm.username.trim(),
          password: staffForm.password,
          role: staffForm.role,
        });
        addToast("success", `Đã tạo tài khoản "${staffForm.username}"`);
      }
      setStaffModalOpen(false);
      loadData();
    } catch {
      if (editingStaff) {
        setStaffAccounts((prev) =>
          prev.map((s) =>
            s.id === editingStaff.id
              ? { ...s, username: staffForm.username, role: staffForm.role }
              : s
          )
        );
      } else {
        setStaffAccounts((prev) => [
          ...prev,
          {
            id: Date.now(),
            username: staffForm.username,
            role: staffForm.role,
          },
        ]);
      }
      setStaffModalOpen(false);
      addToast("success", "Lưu tài khoản thành công (local)");
    }
  };

  const handleDeleteStaff = async (st: StaffAccount) => {
    if (st.username.toUpperCase() === "ADMIN") {
      addToast("error", "Không thể xóa tài khoản Quản trị viên tối cao (ADMIN)");
      return;
    }
    if (!window.confirm(`Xóa tài khoản nhân viên "${st.username}"?`)) return;
    try {
      await deleteStaffAccount(st.id);
      addToast("success", `Đã xóa tài khoản "${st.username}"`);
      loadData();
    } catch {
      setStaffAccounts((prev) => prev.filter((x) => x.id !== st.id));
      addToast("info", `Đã xóa tài khoản "${st.username}" (local)`);
    }
  };

  const staffColumns: Column<StaffAccount>[] = [

    { key: "username", header: "Tên đăng nhập", className: "strong" },
    {
      key: "role",
      header: "Vai trò",
      render: (s) =>
        s.role === "ADMIN" ? (
          <span className="badge">Admin</span>
        ) : (
          <span className="badge badge-neutral">Lễ tân</span>
        ),
    },
  ];

  const logColumns: Column<ActivityLog>[] = [
    {
      key: "createdAt",
      header: "Thời điểm",
      render: (l) => formatDateTime(l.createdAt),
    },
    {
      key: "actor",
      header: "Người thực hiện",
      render: (l) => (
        <span>
          {l.accountType} #{l.accountId}
        </span>
      ),
    },
    {
      key: "action",
      header: "Hành động",
      render: (l) => <span className="badge">{l.action.toUpperCase()}</span>,
    },
    {
      key: "targetType",
      header: "Đối tượng tác động",
      className: "strong",
      render: (l) => (
        <span>
          {l.targetType} {l.targetId ? `#${l.targetId}` : ""}
        </span>
      ),
    },
    {
      key: "detail",
      header: "Chi tiết nội dung",
      render: (l) => <span className="text-muted">{l.detail || "-"}</span>,
    },
  ];

  return (
    <div className="staff-page">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PageHeader
        title={tab === "accounts" ? "Tài khoản nhân viên" : "Nhật ký hoạt động"}
        subtitle={tab === "accounts" ? `${staffAccounts.length} tài khoản` : `${logs.length} hoạt động`}
      >
        <button className="link" onClick={() => setTab(tab === "accounts" ? "logs" : "accounts")}>{tab === "accounts" ? "Nhật ký hoạt động" : "Tài khoản nhân viên"}</button>
        {tab === "accounts" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddStaff}>
            + Thêm tài khoản
          </button>
        )}
      </PageHeader>


      {tab === "accounts" ? (
        <DataTable
          columns={staffColumns}
          rows={staffAccounts}
          empty="Chưa có tài khoản nhân viên nào"
          actions={(s) => (
            <RowActions
              onEdit={() => handleOpenEditStaff(s)}
              onDelete={() => handleDeleteStaff(s)}
            />
          )}
        />
      ) : (
        <DataTable
          columns={logColumns}
          rows={logs}
          empty="Chưa ghi nhận hoạt động nào trong hệ thống"
        />
      )}

      {/* MODAL THÊM / SỬA TÀI KHOẢN */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title={editingStaff ? "Sửa tài khoản nhân viên" : "Thêm tài khoản nhân viên mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStaffModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveStaff}>
              Lưu tài khoản
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên đăng nhập *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: letan01, letan_ca1..."
            value={staffForm.username}
            onChange={(e) =>
              setStaffForm({ ...staffForm, username: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            {editingStaff ? "Mật khẩu mới (bỏ trống nếu không đổi)" : "Mật khẩu *"}
          </label>
          <input
            type="password"
            className="field wide"
            placeholder="Nhập mật khẩu..."
            value={staffForm.password}
            onChange={(e) =>
              setStaffForm({ ...staffForm, password: e.target.value as "" })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Vai trò phân quyền *</label>
          <select
            className="field wide"
            value={staffForm.role}
            onChange={(e) =>
              setStaffForm({
                ...staffForm,
                role: e.target.value as StaffRole,
              })
            }
          >
            <option value="RECEPTIONIST">Lễ tân / Thu ngân (RECEPTIONIST)</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
          </select>
          <p className="form-hint">
            * Hệ thống không quản lý hồ sơ nhân sự (không tính lương, không ca làm) — tài khoản chỉ nhằm mục đích xác thực và ghi vết nhật ký kiểm toán.
          </p>
        </div>
      </Modal>
    </div>
  );
}
