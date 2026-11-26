package com.sccgroup.restaurant_management.domain.entity.menu;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "food")
public class Food {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    private String name;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    private String image;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "estimated_cooking_time")
    private Integer estimatedCookingTime; // dùng tính SLA

    protected Food() {}

    public Food(Category category, String name, BigDecimal price) {
        this.category = category;
        this.name = name;
        this.price = price;
    }

    public Long getId() { return id; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getEstimatedCookingTime() { return estimatedCookingTime; }
    public void setEstimatedCookingTime(Integer t) { this.estimatedCookingTime = t; }
}