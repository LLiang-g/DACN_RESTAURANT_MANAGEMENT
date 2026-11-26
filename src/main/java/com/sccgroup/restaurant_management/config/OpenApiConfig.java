package com.sccgroup.restaurant_management.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConditionalOnProperty(name = "springdoc.api-docs.enabled", havingValue = "true")
public class OpenApiConfig {
    private static final String BEARER_AUTH = "bearerAuth";

    @Bean
    OpenAPI restaurantOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Smart POS & KDS API").version("1.0")
                        .description("API Khách hàng, POS, KDS, Quản trị và Thanh toán. "
                                + "Đăng nhập để lấy token; nhập token vào Authorize, không thêm tiền tố Bearer."))
                .components(new Components().addSecuritySchemes(BEARER_AUTH,
                        new SecurityScheme().type(SecurityScheme.Type.HTTP)
                                .scheme("bearer").bearerFormat("JWT")));
    }

    @Bean
    GlobalOpenApiCustomizer documentRouteSecurity() {
        return api -> {
            if (api.getPaths() == null) return;
            api.getPaths().forEach((path, item) -> {
                boolean protectedRoute = path.startsWith("/api/pos/")
                        || path.startsWith("/api/kds/")
                        || (path.startsWith("/api/admin/") && !path.equals("/api/admin/auth/login"));
                item.readOperations().forEach(operation -> operation.setSecurity(protectedRoute
                        ? List.of(new SecurityRequirement().addList(BEARER_AUTH)) : List.of()));
            });
        };
    }

    @Bean
    GroupedOpenApi authApi() {
        return group("01-auth", "/api/auth/**", "/api/admin/auth/**");
    }

    @Bean
    GroupedOpenApi customerApi() {
        return group("02-customer", "/api/customer/**");
    }

    @Bean
    GroupedOpenApi posApi() {
        return GroupedOpenApi.builder().group("03-pos").pathsToMatch("/api/pos/**")
                .pathsToExclude("/api/pos/payments/**", "/api/pos/invoices/*/payments").build();
    }

    @Bean
    GroupedOpenApi kdsApi() {
        return group("04-kds", "/api/kds/**");
    }

    @Bean
    GroupedOpenApi adminApi() {
        return group("05-admin", "/api/admin/**");
    }

    @Bean
    GroupedOpenApi paymentApi() {
        return group("06-payment", "/api/payments/**", "/api/pos/payments/**", "/api/pos/invoices/*/payments");
    }

    private GroupedOpenApi group(String name, String... paths) {
        return GroupedOpenApi.builder().group(name).pathsToMatch(paths).build();
    }
}