package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.repository.RestaurantTableRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(InvoiceService.class)
class InvoiceServiceTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private RestaurantTableRepository tableRepository;

    @Test
    void shouldReuseOpenInvoiceForSameTable() {
        // Chuẩn bị 1 bàn thật trong DB để test
        RestaurantTable table = tableRepository.save(
                new RestaurantTable("1", "A01", TableStatus.TRONG));

        // Gọi hàm 2 lần với cùng 1 bàn — mô phỏng 2 Order gửi liên tiếp
        Invoice first = invoiceService.getOrCreateOpenInvoice(table);
        Invoice second = invoiceService.getOrCreateOpenInvoice(table);

        assertThat(first.getId()).isNotNull();
        assertThat(second.getId()).isEqualTo(first.getId()); // phải là CÙNG 1 Invoice, không tạo trùng
        assertThat(second.getStatus()).isEqualTo(InvoiceStatus.OPEN);
    }
}