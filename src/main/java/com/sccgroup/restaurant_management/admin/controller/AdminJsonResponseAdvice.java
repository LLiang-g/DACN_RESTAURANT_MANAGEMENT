package com.sccgroup.restaurant_management.admin.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/** Keep Hibernate's internal proxy fields out of admin responses only. */
@RestControllerAdvice(assignableTypes = AdminDataController.class)
public class AdminJsonResponseAdvice implements ResponseBodyAdvice<Object> {
    private final ObjectMapper mapper;

    public AdminJsonResponseAdvice(ObjectMapper mapper) {
        this.mapper = mapper.copy().addMixIn(HibernateProxy.class, ProxyFields.class);
    }

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private abstract static class ProxyFields {}

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return MappingJackson2HttpMessageConverter.class.isAssignableFrom(converterType);
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        return body == null ? null : mapper.valueToTree(body);
    }
}
