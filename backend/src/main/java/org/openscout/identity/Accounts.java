package org.openscout.identity;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

interface Accounts extends JpaRepository<Account, UUID> {
    Optional<Account> findByEmail(String email);
}
