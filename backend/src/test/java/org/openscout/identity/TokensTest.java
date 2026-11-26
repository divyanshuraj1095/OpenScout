package org.openscout.identity;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TokensTest {
    @Test void requiresLiveSessionAndUnexpiredToken() throws Exception {
        Sessions sessions=mock(Sessions.class);
        var tokens=new Tokens(Base64.getEncoder().encodeToString(new byte[32]),sessions);
        var session=new LoginSession(UUID.randomUUID(),Instant.now().plusSeconds(60));
        String jwt=tokens.issue(session);
        assertThrows(JwtException.class,()->tokens.decoder.decode(jwt));
        when(sessions.existsByIdAndAccountIdAndExpiresAtAfter(eq(session.id),eq(session.accountId),any())).thenReturn(true);
        assertEquals(session.id.toString(),tokens.decoder.decode(jwt).getId());
        session.expiresAt=Instant.now().plusMillis(1200);
        String expiring=tokens.issue(session);
        Thread.sleep(1300);
        assertThrows(JwtException.class,()->tokens.decoder.decode(expiring));
    }
}

