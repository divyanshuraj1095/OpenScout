package org.openscout.identity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="login_sessions")
class LoginSession {
    @Id UUID id;
    UUID accountId;
    Instant expiresAt;
    protected LoginSession() {}
    LoginSession(UUID accountId, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.expiresAt = expiresAt;
    }
}
