package com.sccgroup.restaurant_management.domain.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "restaurant_table")
public class RestaurantTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String floor;

    @Column(name = "table_number")
    private String tableNumber;

    @Enumerated(EnumType.STRING)
    private TableStatus status;

    protected RestaurantTable() {}

    public RestaurantTable(String floor, String tableNumber, TableStatus status) {
        this.floor = floor;
        this.tableNumber = tableNumber;
        this.status = status;
    }

    public Long getId() { return id; }
    public String getFloor() { return floor; }
    public String getTableNumber() { return tableNumber; }
    public TableStatus getStatus() { return status; }
    public void setStatus(TableStatus status) { this.status = status; }
}