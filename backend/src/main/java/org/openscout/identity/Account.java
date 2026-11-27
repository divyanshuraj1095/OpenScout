package org.openscout.identity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="accounts")
class Account {
    @Id UUID id;
    String name;
    String email;
    String passwordHash;
    String githubUrl;
    java.time.Instant createdAt;
    protected Account() {}
    Account(String name, String email, String passwordHash,String githubUrl) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.githubUrl = githubUrl;
        this.createdAt = java.time.Instant.now();
    }
}
