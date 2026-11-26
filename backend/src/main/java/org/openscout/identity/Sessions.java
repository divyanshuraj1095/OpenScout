package org.openscout.identity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface Sessions extends JpaRepository<LoginSession, UUID> {
    boolean existsByIdAndAccountIdAndExpiresAtAfter(UUID id, UUID owner, Instant now);
}
