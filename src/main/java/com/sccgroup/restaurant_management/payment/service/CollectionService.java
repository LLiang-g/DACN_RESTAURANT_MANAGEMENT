package com.sccgroup.restaurant_management.payment.service;

import com.sccgroup.restaurant_management.common.exception.*;
import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.domain.entity.account.*;
import com.sccgroup.restaurant_management.domain.entity.billing.*;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.account.ActivityLogRepository;
import com.sccgroup.restaurant_management.domain.repository.billing.*;
import com.sccgroup.restaurant_management.domain.repository.order.*;
import com.sccgroup.restaurant_management.domain.service.InvoiceTotalCalculator;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CollectionService {
 private final InvoiceRepository invoices; private final PaymentTransactionRepository transactions;
 private final CollectionEntryRepository entries; private final CollectionCaseRepository cases;
 private final OrderItemRepository items; private final OrderComboRepository combos;
 private final ActivityLogRepository logs; private final RealtimeEventPublisher events;
 public CollectionService(InvoiceRepository invoices,PaymentTransactionRepository transactions,CollectionEntryRepository entries,
  CollectionCaseRepository cases,OrderItemRepository items,OrderComboRepository combos,ActivityLogRepository logs,RealtimeEventPublisher events){
  this.invoices=invoices;this.transactions=transactions;this.entries=entries;this.cases=cases;this.items=items;this.combos=combos;this.logs=logs;this.events=events;
 }
 public record Receive(String requestKey,String source,BigDecimal amount,String reference,String txnRef,String providerTxnNo,String note,boolean bankVerified,boolean confirmed){}
 public record CaseAction(String reference,String note,boolean confirmed){}
 public record EntryView(Long id,String source,BigDecimal amount,BigDecimal tender,BigDecimal changeDue,String status,String reference,String providerTxnNo,boolean providerConfirmed,Long createdBy,Long verifiedBy,LocalDateTime createdAt,LocalDateTime verifiedAt,String note){}
 public record CaseView(Long id,Long invoiceId,Long entryId,String status,BigDecimal amount,String reason,Long processedBy,Long completedBy,String refundReference,String completionNote,LocalDateTime createdAt,LocalDateTime processedAt,LocalDateTime completedAt){}
 public record Summary(Long invoiceId,String status,BigDecimal total,BigDecimal received,BigDecimal remaining,BigDecimal excess,List<EntryView> entries,List<CaseView> cases){}
 private void staff(AppUserPrincipal actor){if(actor==null||actor.getAccountId()==null||!"STAFF".equals(actor.getAccountType())||!("ADMIN".equals(actor.getRole())||"RECEPTIONIST".equals(actor.getRole())))throw new AccessDeniedException("Receptionist or admin required");}
 private void admin(AppUserPrincipal a){staff(a);if(!"ADMIN".equals(a.getRole()))throw new AccessDeniedException("Admin required");}
 private String text(String s,int min,int max){String v=s==null?"":s.trim();if(v.length()<min||v.length()>max)throw new BusinessException("COLLECTION_INPUT_INVALID","Thiếu nội dung hoặc vượt độ dài cho phép");return v;}
 private BigDecimal money(BigDecimal n){if(n==null||n.signum()<=0||n.scale()>2||n.compareTo(new BigDecimal("9999999999.99"))>0)throw new BusinessException("INVALID_AMOUNT","Số tiền phải lớn hơn 0, tối đa hai số lẻ");return n;}
 private Invoice lock(Long id){return invoices.findByIdForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hóa đơn"));}
 private BigDecimal received(Long id){return entries.findByInvoiceIdOrderByIdAsc(id).stream().filter(e->"VERIFIED".equals(e.getStatus())).map(CollectionEntry::getAmount).reduce(BigDecimal.ZERO,BigDecimal::add);}
 public boolean hasEntries(Long id){return entries.findByInvoiceIdOrderByIdAsc(id).stream().anyMatch(e->!"VOID".equals(e.getStatus()));}
 private BigDecimal total(Invoice i){boolean frozen=i.getStatus()!=InvoiceStatus.OPEN||hasEntries(i.getId())||!transactions.findByInvoiceIdAndStatusIn(i.getId(),UnresolvedPayments.STATUSES).isEmpty();return frozen&&i.getCollectionTotal()!=null?i.getCollectionTotal():InvoiceTotalCalculator.confirmedTotal(items.findByInvoiceId(i.getId()),combos.findByInvoiceId(i.getId()));}
 /** Called only while invoice lock is held. First collection freezes the agreed total. */
 @Transactional(propagation=Propagation.MANDATORY)
 public BigDecimal prepare(Invoice i){
  if(i.getStatus()!=InvoiceStatus.OPEN)throw new ConflictException("INVOICE_NOT_OPEN","Hóa đơn không còn mở");
  if(cases.forInvoice(i.getId()).stream().anyMatch(c->"REVIEW".equals(c.getStatus())))throw new ConflictException("COLLECTION_REVIEW_REQUIRED","Có khoản tiền VNPay cần ghép chứng từ; Admin đối chiếu trước khi thu thêm");
  if(items.findByInvoiceId(i.getId()).stream().anyMatch(x->x.getStatus()==OrderItemStatus.PENDING))throw new BusinessException("INVOICE_HAS_PENDING_ITEMS","Duyệt hoặc từ chối hết món trước khi thu tiền");
  if(!hasEntries(i.getId())&&transactions.findByInvoiceIdAndStatusIn(i.getId(),UnresolvedPayments.STATUSES).isEmpty())i.setCollectionTotal(InvoiceTotalCalculator.confirmedTotal(items.findByInvoiceId(i.getId()),combos.findByInvoiceId(i.getId())));
  if(i.getCollectionTotal()==null)i.setCollectionTotal(total(i));
  BigDecimal due=CollectionMath.balance(total(i),received(i.getId()));
  if(due.signum()<=0)throw new ConflictException("NO_BALANCE_DUE","Không còn số tiền cần thu");return due;
 }
 private void audit(Invoice i,AppUserPrincipal a,String action,String note){var l=new ActivityLog(a==null?null:a.getAccountId(),AccountType.STAFF,action,"invoice",i.getId(),note.length()>500?note.substring(0,500):note,LocalDateTime.now());l.setNames(a==null?"VNPay":a.getUsername(),"Hóa đơn #"+i.getId());logs.save(l);}
 private void changed(Invoice i){events.publishAfterCommit("/topic/pos",Map.of("type","COLLECTION_CHANGED","invoiceId",i.getId()));events.publishAfterCommit("/topic/table/"+i.getTable().getId(),Map.of("type","COLLECTION_CHANGED","invoiceId",i.getId()));events.publishAfterCommit("/topic/admin/activity",Map.of("type","CHANGED"));}
 private EntryView view(CollectionEntry e){return new EntryView(e.getId(),e.getSource(),e.getAmount(),e.getTender(),e.getChangeDue(),e.getStatus(),e.getExternalReference(),e.getProviderTxnNo(),e.isProviderConfirmed(),e.getCreatedBy(),e.getVerifiedBy(),e.getCreatedAt(),e.getVerifiedAt(),e.getNote());}
 private CaseView view(CollectionCase c){return new CaseView(c.getId(),c.getEntry().getInvoice().getId(),c.getEntry().getId(),c.getStatus(),c.getAmount(),c.getReason(),c.getProcessedBy(),c.getCompletedBy(),c.getRefundReference(),c.getCompletionNote(),c.getCreatedAt(),c.getProcessedAt(),c.getCompletedAt());}
 @Transactional(readOnly=true) public Summary summary(Long id){Invoice i=invoices.findById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hóa đơn"));BigDecimal got=received(id),t=total(i);return new Summary(id,i.getStatus().name(),t,got,CollectionMath.balance(t,got),cases.forInvoice(id).stream().filter(c->"REQUIRED".equals(c.getStatus())||"PROCESSING".equals(c.getStatus())).map(CollectionCase::getAmount).reduce(BigDecimal.ZERO,BigDecimal::add),entries.findByInvoiceIdOrderByIdAsc(id).stream().map(this::view).toList(),cases.forInvoice(id).stream().map(this::view).toList());}
 private void caseFor(CollectionEntry e,BigDecimal amount,boolean review,String reason){if(cases.findByEntryId(e.getId()).isEmpty())cases.save(new CollectionCase(e,amount,review,reason));}
 private void apply(Invoice i,CollectionEntry e,BigDecimal before){
  if(i.getStatus()==InvoiceStatus.OPEN&&total(i).signum()==0){i.setStatus(InvoiceStatus.CANCELLED);i.setCancelledAt(LocalDateTime.now());}
  BigDecimal extra=CollectionMath.excess(total(i),before,e.getAmount());
  if(extra.signum()>0)caseFor(e,extra,false,"Tiền đã nhận vượt số còn phải thu; cần hoàn phần thừa");
  if(i.getStatus()==InvoiceStatus.CANCELLED){caseFor(e,e.getAmount(),false,"Tiền về cho hóa đơn đã hủy; cần hoàn");return;}
  if(i.getStatus()==InvoiceStatus.OPEN&&before.add(e.getAmount()).compareTo(total(i))>=0){
   i.setStatus(InvoiceStatus.PAID);i.setPaidAt(LocalDateTime.now());
   boolean onlyCash=entries.findByInvoiceIdOrderByIdAsc(i.getId()).stream().filter(x->"VERIFIED".equals(x.getStatus())).allMatch(x->"CASH".equals(x.getSource()));
   i.setPaymentMethod(onlyCash?PaymentMethod.CASH:PaymentMethod.BANK_TRANSFER);
   i.setBankTransactionRef("COLLECTION:"+i.getId());
   i.setAmountReceived(entries.findByInvoiceIdOrderByIdAsc(i.getId()).stream().filter(x->"VERIFIED".equals(x.getStatus())&&"CASH".equals(x.getSource())).map(CollectionEntry::getTender).reduce(BigDecimal.ZERO,BigDecimal::add));
   i.setChangeAmount(entries.findByInvoiceIdOrderByIdAsc(i.getId()).stream().filter(x->"VERIFIED".equals(x.getStatus())&&"CASH".equals(x.getSource())).map(CollectionEntry::getChangeDue).reduce(BigDecimal.ZERO,BigDecimal::add));
  }
 }
 @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED) public Summary receive(Long id,Receive r,AppUserPrincipal actor){
  staff(actor);if(r==null||!r.confirmed())throw new BusinessException("COLLECTION_CONFIRM_REQUIRED","Cần xác nhận thao tác và số tiền");
  String uuid=text(r.requestKey(),36,36);try{UUID.fromString(uuid);}catch(IllegalArgumentException e){throw new BusinessException("INVALID_REQUEST_KEY","Mã yêu cầu không hợp lệ");}
  String source=text(r.source(),4,20);if(!Set.of("CASH","BANK","VNPAY").contains(source))throw new BusinessException("INVALID_COLLECTION_SOURCE","Nguồn tiền không hợp lệ");
  BigDecimal amount=money(r.amount());String note=text(r.note(),5,500);Invoice i=lock(id);
  String ref="CASH".equals(source)?uuid:text(r.reference(),3,120);
  String key="VNPAY".equals(source)?"VNPAY:"+text(r.txnRef(),3,64):"BANK".equals(source)?"BANK:"+ref:"CASH:"+id+":"+uuid;
  String fingerprint;
  try{fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest((id+"|"+source+"|"+amount.stripTrailingZeros().toPlainString()+"|"+ref+"|"+r.txnRef()+"|"+r.providerTxnNo()+"|"+note+"|"+r.bankVerified()).getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
  CollectionEntry retry=entries.findByRequestKey(uuid).orElse(null);
  if(retry!=null){if(!retry.getInvoice().getId().equals(id)||!fingerprint.equals(retry.getRequestHash()))throw new ConflictException("COLLECTION_RETRY_CONFLICT","Yêu cầu đã được dùng cho nội dung khác");return summary(id);}
  CollectionEntry old=entries.findBySourceKey(key).orElse(null);
  if(old!=null){
   BigDecimal submitted="CASH".equals(source)?old.getTender():old.getAmount();
   if(!old.getInvoice().getId().equals(id)||submitted.compareTo(amount)!=0||!Objects.equals(old.getNote(),note)||!Objects.equals(old.getExternalReference(),ref)||!Objects.equals(old.getProviderTxnNo(),r.providerTxnNo()==null?null:r.providerTxnNo().trim()))throw new ConflictException("COLLECTION_RETRY_CONFLICT","Mã đã được dùng cho nội dung khác; tải lại lịch sử trước khi thu tiếp");
   return summary(id);
  }
  BigDecimal due=prepare(i),before=received(id);boolean verified="CASH".equals(source)||r.bankVerified();
  if("VNPAY".equals(source)){
   PaymentTransaction tx=transactions.findByTxnRefForUpdate(r.txnRef()).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy giao dịch VNPay"));
   if(!tx.getInvoice().getId().equals(id)||tx.getProvider()!=PaymentProviderType.VNPAY||tx.getAmount().compareTo(amount)!=0)throw new ConflictException("MANUAL_VNPAY_MISMATCH","Mã VNPay và số tiền phải thuộc đúng hóa đơn; khoản khác ghi nguồn BANK");
   text(r.providerTxnNo(),1,64);
  }
  BigDecimal accepted="CASH".equals(source)?CollectionMath.cashAccepted(total(i),before,amount):amount;
  var e=entries.saveAndFlush(new CollectionEntry(i,key,source,accepted,"CASH".equals(source)?amount:null,"CASH".equals(source)?amount.subtract(accepted):null,ref,r.providerTxnNo()==null?null:r.providerTxnNo().trim(),note,actor.getAccountId(),verified));
  e.bindRequest(uuid,fingerprint);
  if(verified)apply(i,e,before);
  audit(i,actor,verified?"COLLECTION_VERIFIED":"COLLECTION_EVIDENCE",key+"; "+note);changed(i);return summary(id);
 }
 @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED) public Summary verify(Long invoiceId,Long entryId,boolean bankVerified,boolean discard,AppUserPrincipal actor){
  staff(actor);Invoice i=lock(invoiceId);CollectionEntry e=entries.findById(entryId).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy khoản ghi nhận"));
  if(!e.getInvoice().getId().equals(invoiceId))throw new ResourceNotFoundException("Khoản ghi nhận không thuộc hóa đơn");
  if(discard){if(!"EVIDENCE".equals(e.getStatus())&&!"VOID".equals(e.getStatus()))throw new ConflictException("CANNOT_VOID_RECEIVED_MONEY","Khoản đã thu phải xử lý hoàn tiền, không xóa");e.voidEvidence();}
  else {if(!bankVerified)throw new BusinessException("BANK_VERIFICATION_REQUIRED","Phải đối chiếu tiền vào tài khoản quán");if("VOID".equals(e.getStatus()))throw new ConflictException("EVIDENCE_VOID","Minh chứng đã loại");if("EVIDENCE".equals(e.getStatus())){BigDecimal before=received(invoiceId);e.verify(actor.getAccountId());apply(i,e,before);}}
  audit(i,actor,discard?"EVIDENCE_VOID":"EVIDENCE_VERIFIED","Entry #"+entryId);changed(i);return summary(invoiceId);
 }
 /** Invoked by authenticated/signed provider result only, under the invoice + transaction locks. */
 @Transactional(propagation=Propagation.MANDATORY) public void providerSuccess(PaymentTransaction tx,String no){
  Invoice i=tx.getInvoice();String key="VNPAY:"+tx.getTxnRef();CollectionEntry old=entries.findBySourceKey(key).orElse(null);
  if(old!=null){
   if(!Objects.equals(old.getProviderTxnNo(),no)||old.getAmount().compareTo(tx.getAmount())!=0||!old.getInvoice().getId().equals(i.getId())||"VOID".equals(old.getStatus())){
    caseFor(old,tx.getAmount(),true,"Kết quả VNPay khác minh chứng; cần đối chiếu, không tự kết luận thu trùng");audit(i,null,"COLLECTION_REVIEW",key);changed(i);return;
   }
   BigDecimal before=received(i.getId());boolean wasVerified="VERIFIED".equals(old.getStatus());old.confirmProvider(no);
   if(!wasVerified){old.verify(null);apply(i,old,before);}audit(i,null,"COLLECTION_PROVIDER_MATCHED",key);changed(i);return;
  }
  // Bridge invoices settled before this migration: their original successful transaction is not a second receipt.
  if(i.getStatus()==InvoiceStatus.PAID&&tx.getTxnRef().equals(i.getBankTransactionRef()))return;
  BigDecimal before=received(i.getId());
  i.setCollectionTotal(total(i));
  if(i.getStatus()==InvoiceStatus.PAID&&(i.getBankTransactionRef()==null||!i.getBankTransactionRef().startsWith("COLLECTION:"))&&entries.findByInvoiceIdOrderByIdAsc(i.getId()).isEmpty()){
   var legacy=entries.saveAndFlush(new CollectionEntry(i,"LEGACY:"+i.getId(),"LEGACY",total(i),null,null,i.getBankTransactionRef(),null,"Số tiền hóa đơn đã đóng trước nâng cấp",null,true));before=total(i);
  }
  var e=entries.saveAndFlush(new CollectionEntry(i,key,"VNPAY",tx.getAmount(),null,null,tx.getTxnRef(),no,"Tiền về được VNPay xác minh",null,true));e.confirmProvider(no);apply(i,e,before);audit(i,null,"COLLECTION_PROVIDER_RECEIVED",key);changed(i);
 }
 @Transactional(readOnly=true) public List<CaseView> openCases(AppUserPrincipal actor,int page){staff(actor);if(page<0||page>100000)throw new BusinessException("INVALID_PAGE","Trang không hợp lệ");return cases.openCases(org.springframework.data.domain.PageRequest.of(page,50)).stream().map(this::view).toList();}
 @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED) public CaseView caseAction(Long id,String action,CaseAction r,AppUserPrincipal actor){
  admin(actor);Long invoiceId=cases.invoiceId(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hồ sơ"));Invoice i=lock(invoiceId);
  // All transitions for this invoice serialize on its lock.
  CollectionCase c=cases.findById(id).orElseThrow();
  if("match".equals(action)||"additional".equals(action)){
   if(r==null||!r.confirmed())throw new BusinessException("REVIEW_CONFIRM_REQUIRED","Phải đối chiếu chứng từ trước khi phân loại");
   String ref=text(r.reference(),3,120),note=text(r.note(),5,500);
   if("RESOLVED".equals(c.getStatus())){if(!ref.equals(c.getRefundReference()))throw new ConflictException("REVIEW_ALREADY_RESOLVED","Hồ sơ đã được xử lý bằng chứng từ khác");return view(c);}
   if(!"REVIEW".equals(c.getStatus()))throw new ConflictException("NOT_REVIEW_CASE","Chỉ áp dụng cho hồ sơ cần đối chiếu");
   CollectionEntry old=c.getEntry();BigDecimal before=received(i.getId());boolean newlyVerified=!"VERIFIED".equals(old.getStatus());
   if("match".equals(action)){
    if(!"VERIFIED".equals(old.getStatus())){old.verify(actor.getAccountId());apply(i,old,before);}old.confirmProvider(ref);
   }else{
    var extra=entries.saveAndFlush(new CollectionEntry(i,"REVIEW:"+c.getId(),"BANK",c.getAmount(),null,null,ref,null,note,actor.getAccountId(),true));apply(i,extra,before);
   }
   BigDecimal refund=newlyVerified&&"match".equals(action)?(i.getStatus()==InvoiceStatus.CANCELLED?old.getAmount():CollectionMath.excess(total(i),before,old.getAmount())):BigDecimal.ZERO;
   if(refund.signum()>0)c.requireRefund(refund);else c.resolve(actor.getAccountId(),ref,note);
  }else if("start".equals(action)){if("REVIEW".equals(c.getStatus()))throw new ConflictException("REVIEW_NOT_REFUND","Hồ sơ chưa rõ cùng khoản tiền hay thu trùng; không tự hoàn");if("REQUIRED".equals(c.getStatus()))c.start(actor.getAccountId());}
  else if("complete".equals(action)){
   if(r==null||!r.confirmed())throw new BusinessException("REFUND_CONFIRM_REQUIRED","Chỉ xác nhận sau khi thực tế đã hoàn tiền");String ref=text(r.reference(),3,120),note=text(r.note(),5,500);
   if("COMPLETED".equals(c.getStatus())){if(!ref.equals(c.getRefundReference()))throw new ConflictException("REFUND_ALREADY_COMPLETED","Hồ sơ đã hoàn bằng chứng từ khác");return view(c);}
   if(!"PROCESSING".equals(c.getStatus()))throw new ConflictException("REFUND_NOT_PROCESSING","Bắt đầu xử lý trước khi ghi nhận đã hoàn");c.complete(actor.getAccountId(),ref,note);
  }else throw new BusinessException("INVALID_CASE_ACTION","Thao tác không hợp lệ");
  audit(i,actor,"COLLECTION_CASE_"+action.toUpperCase(),"Case #"+id);changed(i);return view(c);
 }
}
