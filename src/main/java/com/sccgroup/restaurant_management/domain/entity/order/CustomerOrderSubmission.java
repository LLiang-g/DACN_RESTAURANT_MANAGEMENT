package com.sccgroup.restaurant_management.domain.entity.order;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="customer_order_submission", uniqueConstraints=@UniqueConstraint(
        name="uk_customer_order_submission_table_key", columnNames={"table_id","request_key"}))
public class CustomerOrderSubmission {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="table_id",nullable=false) private Long tableId;
    @Column(name="request_key",nullable=false,length=36) private String requestKey;
    @Column(name="payload_hash",nullable=false,length=64) private String payloadHash;
    @Column(name="response_json",nullable=false,columnDefinition="LONGTEXT") private String responseJson;
    @Column(name="created_at",nullable=false) private LocalDateTime createdAt;
    protected CustomerOrderSubmission() {}
    public CustomerOrderSubmission(Long tableId,String requestKey,String payloadHash,String responseJson,LocalDateTime createdAt) {
        this.tableId=tableId;this.requestKey=requestKey;this.payloadHash=payloadHash;
        this.responseJson=responseJson;this.createdAt=createdAt;
    }
    public String getPayloadHash(){return payloadHash;}
    public String getResponseJson(){return responseJson;}
}
