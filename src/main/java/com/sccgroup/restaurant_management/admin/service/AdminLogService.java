package com.sccgroup.restaurant_management.admin.service;

import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
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
    public record LogView(Long id, Long accountId, String accountType, String action, String actionName,
        String targetType, Long targetId, String actorName, String targetName, String detail, LocalDateTime createdAt) {}
    public LogView view(ActivityLog log) {
        String actor = log.getActorName() == null ? actorName(log.getAccountId(), log.getAccountType() == null ? null : log.getAccountType().name()) : log.getActorName();
        String target = log.getTargetName() == null ? targetName(log.getTargetType(), log.getTargetId()) : log.getTargetName();
        String detail = log.getDetail();
        if (detail == null || detail.isBlank()) detail = actionName(log.getAction()) + " " + target + ".";
        return new LogView(log.getId(),log.getAccountId(),log.getAccountType()==null?null:log.getAccountType().name(),log.getAction(),actionName(log.getAction()),log.getTargetType(),log.getTargetId(),actor,target,detail,log.getCreatedAt());
    }
}
