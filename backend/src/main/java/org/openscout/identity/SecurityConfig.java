package org.openscout.identity;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
class SecurityConfig {
    @Bean BCryptPasswordEncoder passwords() { return new BCryptPasswordEncoder(12); }

    @Bean SecurityFilterChain chain(HttpSecurity http, Tokens tokens, @Value("${app.origin}") String origin) throws Exception {
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of(origin));
        cors.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type","X-CSRF-TOKEN"));
        cors.setAllowCredentials(true);
        var provider = new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider(tokens.decoder);
        var bearer = new org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter(provider::authenticate);
        bearer.setBearerTokenResolver(request -> {
            var cookies = request.getCookies();
            if (cookies != null) for (var cookie : cookies)
                if (IdentityController.COOKIE.equals(cookie.getName())) return cookie.getValue();
            return null;
        });
        return http.exceptionHandling(e -> e.authenticationEntryPoint((req,res,ex) -> res.setStatus(401)))
            .cors(c -> c.configurationSource(request -> cors))
            .sessionManagement(s -> s.disable())
            .securityContext(c -> c.securityContextRepository(new org.springframework.security.web.context.NullSecurityContextRepository()))
            .requestCache(c -> c.disable()).logout(c -> c.disable())
            .authorizeHttpRequests(a -> a.dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                .requestMatchers("/api/v1/auth/csrf","/api/v1/auth/signup",
                "/api/v1/auth/login","/actuator/health","/openapi.yaml").permitAll()
                .requestMatchers("/api/v1/me","/api/v1/auth/logout","/api/v1/repositories","/api/v1/issues","/api/v1/bookmarks","/api/v1/repositories/**","/api/v1/issues/**","/api/v1/bookmarks/**").authenticated().anyRequest().denyAll())
            .addFilterBefore(bearer, org.springframework.security.web.authentication.AnonymousAuthenticationFilter.class).build();
    }
}
