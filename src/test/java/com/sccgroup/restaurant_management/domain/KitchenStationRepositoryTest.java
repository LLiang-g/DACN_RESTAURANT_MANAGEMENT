package com.sccgroup.restaurant_management.domain;

import com.sccgroup.restaurant_management.kds.repository.KitchenStationRepository;
import com.sccgroup.restaurant_management.kds.entity.KitchenStation;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class KitchenStationRepositoryTest {

    @Autowired
    private KitchenStationRepository repository;

    @Test
    void saveAndFindKitchenStation() {
        KitchenStation station = new KitchenStation("Bếp nóng");

        KitchenStation saved = repository.save(station);
        assertThat(saved.getId()).isNotNull(); // xác nhận DB đã sinh ID tự tăng

        KitchenStation found = repository.findById(saved.getId()).orElseThrow();
        assertThat(found.getName()).isEqualTo("Bếp nóng");
    }
}