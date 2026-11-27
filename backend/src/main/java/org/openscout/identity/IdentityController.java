package org.openscout.identity;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/v1")
class IdentityController {
    static final String COOKIE = "__Host-openscout";
    final Accounts accounts;
    final Sessions sessions;
    final Tokens tokens;
    final BCryptPasswordEncoder passwords;
    final String dummyHash;

    IdentityController(Accounts accounts, Sessions sessions, Tokens tokens, BCryptPasswordEncoder passwords) {
        this.accounts=accounts;
        this.sessions=sessions;
        this.tokens=tokens;
        this.passwords=passwords;
        dummyHash=passwords.encode(UUID.randomUUID().toString());
    }
    record Signup(@NotBlank @Size(max=100) String name, @Email @NotBlank @Size(max=254) String email,
                  @NotBlank @Size(min=12,max=72) String password,
                  @Pattern(regexp="(?:https://github[.]com/[A-Za-z0-9-]{1,39}/?)?") String gitHubURL) {}
    record Login(@Email @NotBlank @Size(max=254) String email, @NotBlank @Size(max=72) String password) {}
    record Profile(UUID id,String name,String email,String gitHubURL,Instant createdAt,long openedRepos) {
        Profile(Account a,long count) { this(a.id,a.name,a.email,a.githubUrl,a.createdAt,count); }
    }
    static String normalize(String email) { return email.strip().toLowerCase(Locale.ROOT); }
    @GetMapping("/auth/csrf") Map<String,String> csrf(CsrfToken token) {
        return Map.of("token",token.getToken(),"headerName",token.getHeaderName());
    }
    @PostMapping("/auth/signup") @ResponseStatus(HttpStatus.CREATED)
    Profile signup(@Valid @RequestBody Signup input) {
        if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return new Profile(accounts.saveAndFlush(new Account(input.name().strip(),normalize(input.email()),passwords.encode(input.password()),input.gitHubURL())),0);
    }
    @Transactional @PostMapping("/auth/login")
    Profile login(@Valid @RequestBody Login input,HttpServletRequest request,HttpServletResponse response) {
        var account=accounts.findByEmail(normalize(input.email()));
        if (input.password().getBytes(StandardCharsets.UTF_8).length > 72 ||
            !passwords.matches(input.password(),account.map(a -> a.passwordHash).orElse(dummyHash)) || account.isEmpty())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        var user=account.orElseThrow();
        var previous=request.getUserPrincipal();
        if (previous instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken auth)
            sessions.deleteById(UUID.fromString(auth.getToken().getId()));
        var ttl=Duration.ofMinutes(30);
        var session=sessions.save(new LoginSession(user.id,Instant.now().plus(ttl)));
        request.getSession().invalidate();
        cookie(response,tokens.issue(session),ttl);
        return new Profile(user,accounts.importedCount(user.id));
    }
    @GetMapping("/me") Profile profile(@AuthenticationPrincipal Jwt jwt) {
        UUID id=UUID.fromString(jwt.getSubject());
        return new Profile(accounts.findById(id).orElseThrow(),accounts.importedCount(id));
    }
    @Transactional @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@AuthenticationPrincipal Jwt jwt,HttpServletRequest request,HttpServletResponse response) {
        sessions.deleteById(UUID.fromString(jwt.getId()));
        request.getSession().invalidate();
        cookie(response,"",Duration.ZERO);
    }
    private void cookie(HttpServletResponse response,String value,Duration ttl) {
        response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from(COOKIE,value).path("/").secure(true)
            .httpOnly(true).sameSite("Lax").maxAge(ttl).build().toString());
    }
}
