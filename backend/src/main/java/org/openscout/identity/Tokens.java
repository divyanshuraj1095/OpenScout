package org.openscout.identity;
import java.time.*;
import java.util.*;
import javax.crypto.spec.SecretKeySpec;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;

@Component
class Tokens {
    private final NimbusJwtEncoder encoder;
    final NimbusJwtDecoder decoder;

    Tokens(@Value("${app.key}") String secret, Sessions sessions) {
        byte[] bytes = Base64.getDecoder().decode(secret);
        if (bytes.length < 32) throw new IllegalArgumentException("JWT key requires 256 bits");
        var key = new SecretKeySpec(bytes, "HmacSHA256");
        encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(jwt -> {
            boolean valid = false;
            try {
                Instant now = Instant.now();
                valid = "openscout".equals(jwt.getClaimAsString("iss"))
                    && jwt.getAudience().contains("openscout-api")
                    && jwt.getExpiresAt().isAfter(now)
                    && sessions.existsByIdAndAccountIdAndExpiresAtAfter(UUID.fromString(jwt.getId()),
                        UUID.fromString(jwt.getSubject()), now);
            } catch (IllegalArgumentException | NullPointerException ignored) { }
            return valid ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success()
                : org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                    new org.springframework.security.oauth2.core.OAuth2Error("invalid_token"));
        });
    }

    String issue(LoginSession session) {
        var claims = JwtClaimsSet.builder().issuer("openscout").audience(List.of("openscout-api"))
            .subject(session.accountId.toString()).id(session.id.toString())
            .issuedAt(Instant.now()).expiresAt(session.expiresAt).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
