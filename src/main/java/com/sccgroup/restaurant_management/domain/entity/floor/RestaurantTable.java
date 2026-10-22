package com.sccgroup.restaurant_management.domain.entity.floor;

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

    @Column(name = "position_x")
    private Integer positionX = 0;

    @Column(name = "position_y")
    private Integer positionY = 0;

    @Enumerated(EnumType.STRING)
    private TableStatus status;

    protected RestaurantTable() {}

    public RestaurantTable(String floor, String tableNumber, TableStatus status) {
        this.floor = floor;
        this.tableNumber = tableNumber;
        this.status = status;
        this.positionX = 0;
        this.positionY = 0;
    }

    public Long getId() { return id; }
    public String getFloor() { return floor; }
    public String getTableNumber() { return tableNumber; }
    public Integer getPositionX() { return positionX; }
    public Integer getPositionY() { return positionY; }
    public TableStatus getStatus() { return status; }
    public void setFloor(String floor) { this.floor = floor; }
    public void setTableNumber(String tableNumber) { this.tableNumber = tableNumber; }
    public void setPositionX(Integer positionX) { this.positionX = positionX; }
    public void setPositionY(Integer positionY) { this.positionY = positionY; }
    public void setStatus(TableStatus status) { this.status = status; }
}