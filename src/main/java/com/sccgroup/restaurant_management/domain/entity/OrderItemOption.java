package com.sccgroup.restaurant_management.domain.entity;

import com.sccgroup.restaurant_management.customer.entity.Option;
import jakarta.persistence.*;

@Entity
@Table(name = "order_item_option")
public class OrderItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", nullable = false)
    private Option option;

    protected OrderItemOption() {}

    public OrderItemOption(OrderItem orderItem, Option option) {
        this.orderItem = orderItem;
        this.option = option;
    }

    public Long getId() { return id; }
    public OrderItem getOrderItem() { return orderItem; }
    public Option getOption() { return option; }
}