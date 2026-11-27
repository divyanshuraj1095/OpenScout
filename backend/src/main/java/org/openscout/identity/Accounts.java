package org.openscout.identity;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

interface Accounts extends JpaRepository<Account, UUID> {
    @org.springframework.data.jpa.repository.Query(value="SELECT count(*) FROM user_repositories u JOIN repositories r ON r.id=u.repository_id WHERE u.user_id=?1 AND r.public_checked_at > now()-interval '5 minutes'",nativeQuery=true)
    long importedCount(UUID account);
    Optional<Account> findByEmail(String email);
}
