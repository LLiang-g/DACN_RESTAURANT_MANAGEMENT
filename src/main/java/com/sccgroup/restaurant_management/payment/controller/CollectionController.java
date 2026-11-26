package com.sccgroup.restaurant_management.payment.controller;
import com.sccgroup.restaurant_management.payment.service.*;
import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
@RestController @RequestMapping("/api/pos")
public class CollectionController {
 private final CollectionService collection;private final PaymentService payments;
 public CollectionController(CollectionService collection,PaymentService payments){this.collection=collection;this.payments=payments;}
 public record Verify(boolean bankVerified,boolean discard){}
 public record Replace(String previousRef){}
 @GetMapping("/invoices/{id}/payments/history") 
 public List<com.sccgroup.restaurant_management.payment.dto.PaymentResponse> history(@PathVariable Long id){return payments.history(id);}
 @GetMapping("/invoices/{id}/collection") public CollectionService.Summary summary(@PathVariable Long id){return collection.summary(id);}
 @PostMapping("/invoices/{id}/collection") public CollectionService.Summary receive(@PathVariable Long id,@RequestBody CollectionService.Receive r,@AuthenticationPrincipal AppUserPrincipal actor){return collection.receive(id,r,actor);}
 @PostMapping("/invoices/{id}/collection/{entryId}/verify") public CollectionService.Summary verify(@PathVariable Long id,@PathVariable Long entryId,@RequestBody Verify r,@AuthenticationPrincipal AppUserPrincipal actor){return collection.verify(id,entryId,r.bankVerified(),r.discard(),actor);}
 @PostMapping("/invoices/{id}/payments/replace") public com.sccgroup.restaurant_management.payment.dto.PaymentResponse replace(@PathVariable Long id,@RequestBody Replace r,HttpServletRequest request){return payments.replace(id,r.previousRef(),request.getRemoteAddr());}
 @GetMapping("/collection-cases") public List<CollectionService.CaseView> cases(@AuthenticationPrincipal AppUserPrincipal actor,@RequestParam(defaultValue="0") int page){return collection.openCases(actor,page);}
 @PostMapping("/collection-cases/{id}/{action}") public CollectionService.CaseView action(@PathVariable Long id,@PathVariable String action,@RequestBody CollectionService.CaseAction r,@AuthenticationPrincipal AppUserPrincipal actor){return collection.caseAction(id,action,r,actor);}
}
