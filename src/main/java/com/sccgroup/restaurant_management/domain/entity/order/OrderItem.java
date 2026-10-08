package com.sccgroup.restaurant_management.domain.entity.order;

import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_item")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    private Integer quantity;

    @Enumerated(EnumType.STRING)
    private OrderItemStatus status;

    @Column(name = "note")
    private String note; // dùng chung cho lý do từ chối (REJECTED) và lý do trả món (RETURNED)

    @Column(name = "started_cooking_at")
    private LocalDateTime startedCookingAt; // thời điểm trừ kho theo BOM

    @Column(name = "done_at")
    private LocalDateTime doneAt;

    @Column(name = "served_at")
    private LocalDateTime servedAt;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt; // NULL nếu lễ tân hoàn tác
    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice; // giá chốt tại thời điểm order

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_order_id") // NULL nếu gọi lẻ
    private OrderCombo orderCombo;

    protected OrderItem() {}

    public OrderItem(Order order, Food food, Integer quantity, BigDecimal unitPrice) {
        this.order = order;
        this.food = food;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.status = OrderItemStatus.PENDING;
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public Food getFood() { return food; }
    public Integer getQuantity() { return quantity; }
    public OrderItemStatus getStatus() { return status; }
    public void setStatus(OrderItemStatus status) { this.status = status; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getStartedCookingAt() { return startedCookingAt; }
    public void setStartedCookingAt(LocalDateTime t) { this.startedCookingAt = t; }
    public LocalDateTime getDoneAt() { return doneAt; }
    public void setDoneAt(LocalDateTime t) { this.doneAt = t; }
    public LocalDateTime getServedAt() { return servedAt; }
    public void setServedAt(LocalDateTime t) { this.servedAt = t; }
    public LocalDateTime getReturnedAt() { return returnedAt; }
    public void setReturnedAt(LocalDateTime t) { this.returnedAt = t; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public OrderCombo getOrderCombo() { return orderCombo; }
    public void setOrderCombo(OrderCombo orderCombo) { this.orderCombo = orderCombo; }
}