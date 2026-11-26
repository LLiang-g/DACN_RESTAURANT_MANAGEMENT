package com.sccgroup.restaurant_management.customer.service;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.sccgroup.restaurant_management.common.exception.*;
import com.sccgroup.restaurant_management.customer.dto.*;
import com.sccgroup.restaurant_management.domain.entity.order.CustomerOrderSubmission;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.domain.repository.order.CustomerOrderSubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.security.*;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class CustomerOrderSubmissionService {
    private static final ObjectMapper CANONICAL=JsonMapper.builder()
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .serializationInclusion(JsonInclude.Include.ALWAYS).build();
    private final RestaurantTableRepository tables;
    private final CustomerOrderSubmissionRepository submissions;
    private final CustomerOrderService orders;
    private final ObjectMapper json;
    public CustomerOrderSubmissionService(RestaurantTableRepository tables,
            CustomerOrderSubmissionRepository submissions,CustomerOrderService orders,ObjectMapper json) {
        this.tables=tables;this.submissions=submissions;this.orders=orders;this.json=json;
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public OrderResponse placeOrder(PlaceOrderRequest request,String requestKey) {
        if(request==null || request.tableId()==null || request.tableId()<=0)throw new BusinessException("Thiếu thông tin bàn");
        String key=validatedKey(requestKey);
        String hash=digest(request);
        // Lock before the replay lookup. Concurrent callers on this table wait for the first commit.
        tables.findByIdForUpdate(request.tableId())
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy bàn"));
        var previous=submissions.findByTableIdAndRequestKey(request.tableId(),key);
        if(previous.isPresent()) {
            if(!previous.get().getPayloadHash().equals(hash))
                throw new ConflictException("IDEMPOTENCY_PAYLOAD_MISMATCH",
                        "Mã gửi đơn đã dùng cho nội dung khác. Không thể gửi lại bằng nội dung đã thay đổi.");
            return read(previous.get().getResponseJson());
        }
        // This joins the current transaction, retaining all existing invoice/stock/payment guards.
        OrderResponse result=orders.placeOrder(request);
        submissions.saveAndFlush(new CustomerOrderSubmission(request.tableId(),key,hash,write(result),LocalDateTime.now()));
        return result;
    }
    
    private String validatedKey(String value) {
        if(value==null || value.isBlank())throw new BusinessException("IDEMPOTENCY_KEY_REQUIRED","Thiếu mã gửi đơn. Vui lòng cập nhật giao diện và thử lại.");
        if(!value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))
            throw new BusinessException("IDEMPOTENCY_KEY_INVALID","Mã gửi đơn không hợp lệ");
        return value.toLowerCase(Locale.ROOT);
    }
    static String digest(PlaceOrderRequest request) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(CANONICAL.writeValueAsBytes(request)));}
        catch(JsonProcessingException|NoSuchAlgorithmException e){throw new IllegalStateException("Cannot hash order submission",e);}
    }
    private String write(OrderResponse response) {
        try{return json.writeValueAsString(response);}catch(JsonProcessingException e){throw new IllegalStateException("Cannot store order response",e);}
    }
    private OrderResponse read(String response) {
        try{return json.readValue(response,OrderResponse.class);}catch(JsonProcessingException e){throw new IllegalStateException("Cannot read stored order response",e);}
    }
}
