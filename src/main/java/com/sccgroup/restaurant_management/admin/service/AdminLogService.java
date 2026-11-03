package com.sccgroup.restaurant_management.admin.service;

import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminLogService {
    private final JdbcTemplate jdbc;
    public AdminLogService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final Map<String,String> LABELS = Map.ofEntries(
        Map.entry("food","Món ăn"), Map.entry("category","Danh mục"), Map.entry("ingredient","Nguyên liệu"),
        Map.entry("recipe","Công thức"), Map.entry("combo","Combo"), Map.entry("combo_item","Món trong combo"),
        Map.entry("option","Tùy chọn"), Map.entry("option_group","Nhóm tùy chọn"), Map.entry("table","Bàn"),
        Map.entry("kitchen_station","Khu bếp"), Map.entry("staff_account","Tài khoản nhân viên"),
        Map.entry("kitchen_account","Tài khoản bếp"), Map.entry("order","Đơn gọi món"), Map.entry("order_item","Món đã gọi"), Map.entry("invoice","Hóa đơn"));
    public static String actionName(String action) {
        if (action == null) return "Ghi nhận";
        return switch(action.toLowerCase()) {
            case "create" -> "Thêm"; case "update" -> "Cập nhật"; case "delete" -> "Xóa";
            case "import" -> "Nhập kho"; case "export" -> "Xuất kho"; case "adjust" -> "Điều chỉnh kho";
            case "confirm" -> "Duyệt đơn"; case "reject" -> "Từ chối đơn"; case "pay" -> "Thanh toán";
            case "return" -> "Trả món"; case "cancel" -> "Hủy"; case "start_cooking" -> "Bắt đầu nấu";
            case "auto_start_cooking" -> "Tự động bắt đầu nấu"; case "finish_cooking" -> "Hoàn thành món";
            default -> action.replace('_',' ');
        };
    }
    public String actorName(Long id, String type) {
        if (id == null) return "Hệ thống";
        String table = "KITCHEN".equals(type) ? "kitchen_account" : "staff_account";
        return value("SELECT username FROM " + table + " WHERE id = ?", id, "Tài khoản đã xóa");
    }
    private String value(String sql, Long id, String fallback) {
        List<String> result = jdbc.query(sql, (rs,n) -> rs.getString(1), id);
        return result.isEmpty() || result.get(0) == null || result.get(0).isBlank() ? fallback : result.get(0);
    }
    public String targetName(String type, Long id) {
        String label = LABELS.getOrDefault(type == null ? "" : type, "Đối tượng");
        if (id == null) return label;
        String sql = switch(type == null ? "" : type) {
            case "food", "category", "ingredient", "combo", "option_group", "kitchen_station" -> "SELECT name FROM " + type + " WHERE id = ?";
            case "option" -> "SELECT name FROM food_option WHERE id = ?";
            case "staff_account", "kitchen_account" -> "SELECT username FROM " + type + " WHERE id = ?";
            case "table" -> "SELECT CONCAT(floor, ' · ', table_number) FROM restaurant_table WHERE id = ?";
            case "invoice" -> "SELECT CONCAT('Hóa đơn · ',t.floor,' · ',t.table_number,' · ',COALESCE(DATE_FORMAT(i.opened_at,'%d/%m/%Y %H:%i'),'')) FROM invoice i JOIN restaurant_table t ON t.id=i.table_id WHERE i.id=?";
            case "order" -> "SELECT CONCAT('Đơn gọi món · ',t.floor,' · ',t.table_number,' · ',DATE_FORMAT(o.created_at,'%d/%m/%Y %H:%i')) FROM customer_order o JOIN invoice i ON i.id=o.invoice_id JOIN restaurant_table t ON t.id=i.table_id WHERE o.id=?";
            case "order_item" -> "SELECT f.name FROM order_item o JOIN food f ON f.id=o.food_id WHERE o.id=?";
            case "recipe" -> "SELECT CONCAT(f.name,' — ',i.name) FROM recipe r JOIN food f ON f.id=r.food_id JOIN ingredient i ON i.id=r.ingredient_id WHERE r.id=?";
            default -> null;
        };
        return sql == null ? label : value(sql, id, label + " đã xóa");
    }
    // ── Tự sinh chi tiết cho log chưa có chi tiết thật ───────────────────────────
    private static final String PASSWORD = "mật khẩu";
    /** Các trường chỉ để so sánh cũ/mới, không bao giờ in giá trị (văn bản dài, đường dẫn ảnh, mật khẩu băm). */
    private static final Map<String, String> FLAG_FIELDS = Map.of(
        "mô tả", "mô tả đã được sửa", "ảnh", "ảnh đã được đổi", PASSWORD, "mật khẩu đã được đổi");
    /** Tên của chính đối tượng đã nằm sẵn trong dòng log nên không lặp lại khi tự sinh chi tiết (nhưng vẫn so sánh khi sửa). */
    private static final java.util.Set<String> NAME_FIELDS = java.util.Set.of("tên", "tên đăng nhập");

    /**
     * Giữ chi tiết do nơi gọi truyền vào nếu nó có thông tin thật; nếu trống hoặc chỉ lặp lại tên đối tượng
     * thì tự sinh từ dữ liệu liên quan (chỉ nội dung thô, không kèm "<Hành động> <Đối tượng>").
     * Với thao tác xóa phải gọi TRƯỚC khi xóa để còn đọc được dữ liệu.
     */
    public String resolveDetail(String type, Long id, String target, String detail) {
        String given = detail == null ? "" : detail.trim();
        boolean redundant = given.isEmpty() || given.equals(target) || (target != null && target.endsWith(" · " + given));
        return redundant ? autoDetail(type, id) : given;
    }

    /** Ví dụ món ăn: "danh mục Món chính, giá 45.000đ, thời gian nấu 15 phút". Không có dữ liệu thì trả "". */
    public String autoDetail(String type, Long id) {
        List<String> parts = new ArrayList<>();
        snapshot(type, id).forEach((key, value) -> {
            if (value != null && !value.isBlank() && !NAME_FIELDS.contains(key) && !FLAG_FIELDS.containsKey(key))
                parts.add(key + " " + value);
        });
        return String.join(", ", parts);
    }

    /**
     * Chi tiết cho thao tác SỬA: các trường đã đổi dạng "giá 40.000đ -> 45.000đ, tên A -> B".
     * `before` là ảnh chụp lấy bằng snapshot() TRƯỚC khi sửa; gọi hàm này SAU khi đã flush thay đổi xuống DB.
     */
    public String updateDetail(String type, Long id, Map<String, String> before) {
        Map<String, String> after = snapshot(type, id);
        if (before == null || before.isEmpty() || after.isEmpty()) return "";
        List<String> parts = new ArrayList<>();
        after.forEach((key, value) -> {
            String old = before.get(key);
            if (java.util.Objects.equals(old, value)) return;
            String flag = FLAG_FIELDS.get(key);
            if (flag != null) parts.add(flag);
            else parts.add(key + " " + (old == null ? "không có" : old) + " -> " + (value == null ? "không có" : value));
        });
        return parts.isEmpty() ? "không có thay đổi" : String.join(", ", parts);
    }

    /** Các trường (đã định dạng sẵn để hiển thị) của một đối tượng; rỗng nếu không đọc được. Lỗi SQL không bao giờ ném ra ngoài. */
    public Map<String, String> snapshot(String type, Long id) {
        if (type == null || id == null) return new java.util.LinkedHashMap<>();
        try {
            return buildSnapshot(type, id);
        } catch (RuntimeException e) {
            return new java.util.LinkedHashMap<>(); // lệch tên cột... thì bỏ qua, không được làm hỏng thao tác chính đang ghi log
        }
    }

    private Map<String, String> buildSnapshot(String type, Long id) {
        Map<String, String> m = new java.util.LinkedHashMap<>();
        switch (type) {
            case "food" -> {
                Object[] r = row("SELECT f.name, c.name, f.price, f.estimated_cooking_time, f.description, f.image FROM food f JOIN category c ON c.id = f.category_id WHERE f.id = ?", id);
                if (r != null) {
                    put(m, "tên", r[0]); put(m, "danh mục", r[1]); put(m, "giá", money(r[2]));
                    put(m, "thời gian nấu", r[3] == null ? null : r[3] + " phút");
                    put(m, "mô tả", r[4]); put(m, "ảnh", r[5]);
                }
            }
            case "category" -> {
                Object[] r = row("SELECT c.name, s.name FROM category c JOIN kitchen_station s ON s.id = c.station_id WHERE c.id = ?", id);
                if (r != null) { put(m, "tên", r[0]); put(m, "khu bếp", r[1]); }
            }
            case "kitchen_station" -> {
                Object[] r = row("SELECT s.name, (SELECT COUNT(*) FROM category c WHERE c.station_id = s.id) FROM kitchen_station s WHERE s.id = ?", id);
                if (r != null) { put(m, "tên", r[0]); put(m, "số danh mục", r[1]); }
            }
            case "ingredient" -> {
                Object[] r = row("SELECT name, unit, stock_quantity, min_threshold FROM ingredient WHERE id = ?", id);
                if (r != null) {
                    String unit = r[1] == null ? "" : " " + r[1];
                    put(m, "tên", r[0]); put(m, "đơn vị", r[1]);
                    put(m, "tồn kho", r[2] == null ? null : num(r[2]) + unit);
                    put(m, "ngưỡng cảnh báo", r[3] == null ? null : num(r[3]) + unit);
                }
            }
            case "combo" -> {
                Object[] r = row("SELECT c.name, c.discount_type, c.discount_value, (SELECT COUNT(*) FROM combo_item ci WHERE ci.combo_id = c.id) FROM combo c WHERE c.id = ?", id);
                if (r != null) {
                    put(m, "tên", r[0]);
                    put(m, "giảm giá", r[2] == null ? null : "PERCENT".equals(String.valueOf(r[1])) ? num(r[2]) + "%" : money(r[2]));
                    put(m, "số món", r[3]);
                }
            }
            case "option_group" -> {
                Object[] r = row("SELECT name, selection_type FROM option_group WHERE id = ?", id);
                if (r != null) { put(m, "tên", r[0]); put(m, "kiểu chọn", String.valueOf(r[1]).contains("MULTI") ? "chọn nhiều" : "chọn một"); }
            }
            case "option" -> {
                Object[] r = row("SELECT o.name, f.name, g.name, o.price_delta, i.name, o.adjust_amount, o.adjust_type, i.unit, o.scale_factor FROM food_option o JOIN food f ON f.id = o.food_id JOIN option_group g ON g.id = o.group_id LEFT JOIN ingredient i ON i.id = o.ingredient_id WHERE o.id = ?", id);
                if (r != null) {
                    put(m, "tên", r[0]); put(m, "món", r[1]); put(m, "nhóm", r[2]);
                    BigDecimal delta = r[3] == null ? BigDecimal.ZERO : new BigDecimal(r[3].toString());
                    put(m, "giá thêm", delta.signum() == 0 ? null : (delta.signum() > 0 ? "+" : "") + money(delta));
                    boolean adjusts = r[4] != null && r[5] != null && new BigDecimal(r[5].toString()).signum() > 0;
                    put(m, "điều chỉnh nguyên liệu", !adjusts ? null
                        : ("REMOVE".equals(String.valueOf(r[6])) ? "-" : "+") + num(r[5]) + (r[7] == null ? "" : " " + r[7]) + " " + r[4]);
                    boolean scaled = r[8] != null && new BigDecimal(r[8].toString()).compareTo(BigDecimal.ONE) != 0;
                    put(m, "hệ số định lượng", scaled ? num(r[8]) : null);
                }
            }
            case "table" -> {
                Object[] r = row("SELECT floor, table_number, status FROM restaurant_table WHERE id = ?", id);
                if (r != null) { put(m, "tầng", r[0]); put(m, "số bàn", r[1]); put(m, "trạng thái", "SERVING".equals(String.valueOf(r[2])) ? "đang phục vụ" : "trống"); }
            }
            case "staff_account" -> {
                Object[] r = row("SELECT username, role, password_hash FROM staff_account WHERE id = ?", id);
                if (r != null) { put(m, "tên đăng nhập", r[0]); put(m, "vai trò", "ADMIN".equals(String.valueOf(r[1])) ? "quản trị viên" : "lễ tân"); put(m, PASSWORD, r[2]); }
            }
            case "kitchen_account" -> {
                Object[] r = row("SELECT a.username, s.name, a.password_hash FROM kitchen_account a JOIN kitchen_station s ON s.id = a.station_id WHERE a.id = ?", id);
                if (r != null) { put(m, "tên đăng nhập", r[0]); put(m, "khu bếp", r[1]); put(m, PASSWORD, r[2]); }
            }
            case "recipe" -> {
                Object[] r = row("SELECT f.name, i.name, r.quantity_required, i.unit FROM recipe r JOIN food f ON f.id = r.food_id JOIN ingredient i ON i.id = r.ingredient_id WHERE r.id = ?", id);
                if (r != null) {
                    put(m, "món", r[0]); put(m, "nguyên liệu", r[1]);
                    put(m, "định lượng", r[2] == null ? null : num(r[2]) + (r[3] == null ? "" : " " + r[3]));
                }
            }
            default -> { }
        }
        return m;
    }

    private Object[] row(String sql, Long id) {
        List<Object[]> rows = jdbc.query(sql, (rs, n) -> {
            Object[] r = new Object[rs.getMetaData().getColumnCount()];
            for (int i = 0; i < r.length; i++) r[i] = rs.getObject(i + 1);
            return r;
        }, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private static void put(Map<String, String> map, String key, Object value) {
        map.put(key, value == null || value.toString().isBlank() ? null : value.toString());
    }

    private static String num(Object value) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        return new DecimalFormat("#,##0.##", symbols).format(new BigDecimal(value.toString()));
    }

    private static String money(Object value) {
        return value == null ? null : num(value) + "đ";
    }

    public record LogView(Long id, Long accountId, String accountType, String action, String actionName,
        String targetType, Long targetId, String actorName, String targetName, String detail, LocalDateTime createdAt) {}
    public LogView view(ActivityLog log) {
        String actor = log.getActorName() == null ? actorName(log.getAccountId(), log.getAccountType() == null ? null : log.getAccountType().name()) : log.getActorName();
        String target = log.getTargetName() == null ? targetName(log.getTargetType(), log.getTargetId()) : log.getTargetName();
        // detail trả về đúng như đã lưu; việc ghép "<Hành động> <Đối tượng>: <Chi tiết>" do giao diện làm khi in log
        String detail = log.getDetail() == null ? "" : log.getDetail();
        return new LogView(log.getId(),log.getAccountId(),log.getAccountType()==null?null:log.getAccountType().name(),log.getAction(),actionName(log.getAction()),log.getTargetType(),log.getTargetId(),actor,target,detail,log.getCreatedAt());
    }
}
