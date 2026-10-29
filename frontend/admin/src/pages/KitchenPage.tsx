import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import DataTable, { type Column } from "../components/ui/DataTable";
import RowActions from "../components/ui/RowActions";
import Modal from "../components/ui/Modal";
import Toast, { type ToastMessage } from "../components/ui/Toast";
import {
  getKitchenStations,
  getCategories,
  createKitchenStation,
  updateKitchenStation,
  deleteKitchenStation,
  getKitchenAccounts,
  createKitchenAccount,
  updateKitchenAccount,
  deleteKitchenAccount,
} from "../services/adminApi";

import type { KitchenStation, KitchenAccount, Category, TabItem } from "../types";

const TABS: TabItem[] = [
  { key: "kitchens", label: "Khu bếp" },
  { key: "accounts", label: "Tài khoản bếp" },
];

export default function KitchenPage() {
  const [tab, setTab] = useState("kitchens");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<KitchenAccount[]>([]);

  // Station Modal
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KitchenStation | null>(null);
  const [stationName, setStationName] = useState("");

  // Account Modal
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<KitchenAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    username: "",
    password: "",
    stationId: 0,
  });

  const addToast = (type: "success" | "error" | "info", text: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, text }]);
  };

  const loadData = async () => {
    try {
      const [s, a, c] = await Promise.all([
        getKitchenStations().catch(error => { addToast("error", error.message); return []; }),
        getKitchenAccounts().catch(error => { addToast("error", error.message); return []; }),
        getCategories().catch(error => { addToast("error", error.message); return []; }),
      ]);
      setStations(s);
      setCategories(c);
      setAccounts(a);
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không tải/lưu được dữ liệu. Vui lòng thử lại."); }
  };

  useEffect(() => {
    let active = true;
    Promise.all([getKitchenStations().catch(error => { addToast("error", error.message); return []; }), getKitchenAccounts().catch(error => { addToast("error", error.message); return []; }), getCategories().catch(error => { addToast("error", error.message); return []; })])
      .then(([stations, accounts, categories]) => { if (active) { setStations(stations); setAccounts(accounts); setCategories(categories); } });
    return () => { active = false; };
  }, []);

  // Station Handlers
  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationName("");
    setStationModalOpen(true);
  };

  const handleOpenEditStation = (st: KitchenStation) => {
    setEditingStation(st);
    setStationName(st.name);
    setStationModalOpen(true);
  };

  const handleSaveStation = async () => {
    if (!stationName.trim()) {
      addToast("error", "Tên khu bếp không được để trống");
      return;
    }
    try {
      if (editingStation) {
        await updateKitchenStation(editingStation.id, { name: stationName.trim() });
        addToast("success", `Đã cập nhật khu bếp "${stationName}"`);
      } else {
        await createKitchenStation({ name: stationName.trim() });
        addToast("success", `Đã thêm khu bếp "${stationName}"`);
      }
      setStationModalOpen(false);
      loadData();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteStation = async (st: KitchenStation) => {
    if (!window.confirm(`Xóa khu bếp "${st.name}"?`)) return;
    try {
      await deleteKitchenStation(st.id);
      addToast("success", `Đã xóa khu bếp "${st.name}"`);
      loadData();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  // Kitchen Account Handlers
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      username: "",
      password: "",
      stationId: stations[0]?.id || 0,
    });
    setAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: KitchenAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      username: acc.username,
      password: "",
      stationId: acc.stationId || acc.kitchenStation?.id || stations[0]?.id || 0,
    });
    setAccountModalOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!accountForm.username.trim()) {
      addToast("error", "Tên đăng nhập không được để trống");
      return;
    }
    if (!editingAccount && !accountForm.password.trim()) {
      addToast("error", "Vui lòng nhập mật khẩu cho tài khoản mới");
      return;
    }
    if (!accountForm.stationId) {
      addToast("error", "Vui lòng chọn khu bếp");
      return;
    }

    try {
      if (editingAccount) {
        await updateKitchenAccount(editingAccount.id, {
          username: accountForm.username.trim(),
          password: accountForm.password ? accountForm.password : undefined,
          stationId: accountForm.stationId,
        });
        addToast("success", `Đã cập nhật tài khoản "${accountForm.username}"`);
      } else {
        await createKitchenAccount({
          username: accountForm.username.trim(),
          password: accountForm.password,
          stationId: accountForm.stationId,
        });
        addToast("success", `Đã tạo tài khoản "${accountForm.username}"`);
      }
      setAccountModalOpen(false);
      loadData();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteAccount = async (acc: KitchenAccount) => {
    if (!window.confirm(`Xóa tài khoản bếp "${acc.username}"?`)) return;
    try {
      await deleteKitchenAccount(acc.id);
      addToast("success", `Đã xóa tài khoản "${acc.username}"`);
      loadData();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const stationColumns: Column<KitchenStation>[] = [

    { key: "name", header: "Tên khu bếp", className: "strong" },
    { key: "categories", header: "Số danh mục", render: st => categories.filter(c => c.kitchenStation?.id === st.id).length },
    {
      key: "accCount",
      header: "Số tài khoản",
      render: (st) => {
        const count = accounts.filter(
          (a) => a.stationId === st.id || a.kitchenStation?.id === st.id
        ).length;
        return count;
      },
    },
  ];

  const accountColumns: Column<KitchenAccount>[] = [
    { key: "username", header: "Tên đăng nhập", className: "strong" },
    {
      key: "station",
      header: "Khu bếp",
      render: (a) => {
        const station =
          a.kitchenStation?.name ||
          stations.find((s) => s.id === a.stationId)?.name ||
          "Chưa phân bổ";
        return station;
      },
    },
  ];

  return (
    <div className="kitchen-page">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PageHeader
        title={tab === "kitchens" ? "Khu bếp" : "Tài khoản bếp"}
        subtitle={tab === "kitchens" ? `${stations.length} khu bếp` : `${accounts.length} tài khoản`}
      >
        {tab === "kitchens" ? (
          <button type="button" className="btn-primary" onClick={handleOpenAddStation}>
            + Thêm khu bếp
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={handleOpenAddAccount}>
            + Thêm tài khoản
          </button>
        )}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "kitchens" ? (
        <DataTable
          columns={stationColumns}
          rows={stations}
          empty="Chưa có khu vực bếp nào"
          actions={(st) => (
            <RowActions
              onEdit={() => handleOpenEditStation(st)}
              onDelete={() => handleDeleteStation(st)}
            />
          )}
        />
      ) : (
        <DataTable
          columns={accountColumns}
          rows={accounts}
          empty="Chưa có tài khoản bếp nào"
          actions={(acc) => (
            <RowActions
              onEdit={() => handleOpenEditAccount(acc)}
              onDelete={() => handleDeleteAccount(acc)}
            />
          )}
        />
      )}

      {/* MODAL KHU BẾP */}
      <Modal
        isOpen={stationModalOpen}
        onClose={() => setStationModalOpen(false)}
        title={editingStation ? "Sửa khu vực bếp" : "Thêm khu vực bếp mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStationModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveStation}
            >
              Lưu khu bếp
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên khu vực bếp *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Bếp nóng, Bếp lạnh & món kèm, Bếp hải sản, Quầy nước, Bếp lẩu..."
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
          />
          <p className="form-hint">
            * Mỗi danh mục món ăn sẽ được gán cho một khu bếp tương ứng để chế biến.
          </p>
        </div>
      </Modal>

      {/* MODAL TÀI KHOẢN BẾP */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title={editingAccount ? "Sửa tài khoản bếp" : "Thêm tài khoản bếp mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setAccountModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveAccount}
            >
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
            placeholder="Ví dụ: bepnong01, beplau01..."
            value={accountForm.username}
            onChange={(e) =>
              setAccountForm({ ...accountForm, username: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            {editingAccount ? "Mật khẩu mới (bỏ trống nếu không đổi)" : "Mật khẩu *"}
          </label>
          <input
            type="password"
            className="field wide"
            placeholder="Nhập mật khẩu..."
            value={accountForm.password}
            onChange={(e) =>
              setAccountForm({ ...accountForm, password: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Khu vực bếp phụ trách *</label>
          <select
            className="field wide"
            value={accountForm.stationId}
            onChange={(e) =>
              setAccountForm({
                ...accountForm,
                stationId: Number(e.target.value),
              })
            }
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
