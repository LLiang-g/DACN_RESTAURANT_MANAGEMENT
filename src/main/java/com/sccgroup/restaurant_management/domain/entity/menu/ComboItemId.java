package com.sccgroup.restaurant_management.domain.entity.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ComboItemId implements Serializable {

    @Column(name = "combo_id")
    private Long comboId;

    @Column(name = "food_id")
    private Long foodId;

    protected ComboItemId() {}

    public ComboItemId(Long comboId, Long foodId) {
        this.comboId = comboId;
        this.foodId = foodId;
    }

    // equals/hashCode bắt buộc: Hibernate dùng chúng để phân biệt 2 khóa có trùng nhau không
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ComboItemId that)) return false;
        return Objects.equals(comboId, that.comboId) && Objects.equals(foodId, that.foodId);
    }

    @Override
    public int hashCode() { return Objects.hash(comboId, foodId); }
}