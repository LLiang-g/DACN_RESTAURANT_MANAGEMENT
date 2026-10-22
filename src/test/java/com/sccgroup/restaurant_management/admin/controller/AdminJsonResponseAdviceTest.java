package com.sccgroup.restaurant_management.admin.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sccgroup.restaurant_management.domain.entity.account.KitchenStation;
import com.sccgroup.restaurant_management.domain.entity.menu.Category;
import org.hibernate.proxy.HibernateProxy;
import org.hibernate.proxy.LazyInitializer;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;

class AdminJsonResponseAdviceTest {
    static class StationProxy extends KitchenStation implements HibernateProxy {
        StationProxy() { super("Bếp nóng"); }
        @Override public LazyInitializer getHibernateLazyInitializer() { return mock(LazyInitializer.class); }
        @Override public Object writeReplace() { return this; }
        public Object getHandler() { return new Object(); }
    }

    @Test void nestedProxyFieldsAreExcludedWithoutChangingSharedMapper() throws Exception {
        ObjectMapper shared = new ObjectMapper();
        var categories = List.of(new Category("Món heo", new StationProxy()));
        // The same nested Hibernate proxy shape previously caused HTTP 500.
        assertThatThrownBy(() -> shared.writeValueAsString(categories)).isInstanceOf(Exception.class);
        var advice = new AdminJsonResponseAdvice(shared);
        JsonNode json = (JsonNode) advice.beforeBodyWrite(categories, null, null, null, null, null);
        assertThat(json.get(0).get("name").asText()).isEqualTo("Món heo");
        assertThat(json.get(0).get("kitchenStation").get("name").asText()).isEqualTo("Bếp nóng");
        assertThat(json.toString()).doesNotContain("hibernateLazyInitializer", "handler");
        assertThat(shared.findMixInClassFor(HibernateProxy.class)).isNull();
    }

    @Test void noContentResponseRemainsEmpty() {
        assertThat(new AdminJsonResponseAdvice(new ObjectMapper())
                .beforeBodyWrite(null, null, null, null, null, null)).isNull();
    }
}
