# Phase 1 identity service

Use JDK 21, Docker with Compose, and the Maven Wrapper in this directory. In PowerShell, create independent development secrets in the current shell:

```powershell
$env:OPENSCOUT_DEV_PASSWORD=[guid]::NewGuid().ToString()
$key=New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($key)
$env:OPENSCOUT_JWT_KEY=[Convert]::ToBase64String($key)
docker compose up -d db
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

Keep the database password for subsequent starts with the same volume. Store secrets outside Git. On Unix use ./mvnw. The application listens on 8080 and connects to the dedicated local database on 5433. Never supply legacy datasource overrides. Flyway discovers V1 on the classpath, applies pending SQL, and verifies recorded checksums on later boots. Hibernate validates the resulting schema. The default integration tests start a separate PostgreSQL 17 Testcontainer. OPENSCOUT_TEST_PORT and OPENSCOUT_TEST_PASSWORD are an optional fallback for a freshly initialized **disposable localhost cluster** with the openscout_test role and no openscout_dev database. The test creates that database and requires a fresh cluster on every run.

## Manual endpoint checks

From backend/, with the server running, use a single PowerShell session:

```powershell
$api='http://localhost:8080/api/v1'
$jar=Join-Path $env:TEMP ([guid]::NewGuid().ToString())
curl.exe -s http://localhost:8080/actuator/health
curl.exe -s http://localhost:8080/openapi.yaml
curl.exe -i "$api/me"
function Read-Csrf { (curl.exe -s -b $jar -c $jar "$api/auth/csrf" | ConvertFrom-Json).token }
$token=Read-Csrf
$email=([guid]::NewGuid().ToString()+'@example.test')
$password=[guid]::NewGuid().ToString()
@{name='Local Test'; email=$email; password=$password} | ConvertTo-Json | curl.exe -i -b $jar -c $jar -H "X-CSRF-TOKEN: $token" -H 'Content-Type: application/json' --data-binary '@-' "$api/auth/signup"
@{email=$email; password=$password} | ConvertTo-Json | curl.exe -i -b $jar -c $jar -H "X-CSRF-TOKEN: $token" -H 'Content-Type: application/json' --data-binary '@-' "$api/auth/login"
curl.exe -i -b $jar "$api/me"
curl.exe -i -X POST -b $jar "$api/auth/logout"
$token=Read-Csrf
curl.exe -i -X POST -b $jar -c $jar -H "X-CSRF-TOKEN: $token" "$api/auth/logout"
curl.exe -i -b $jar "$api/me"
Remove-Item -LiteralPath $jar
```

Expected in order: health UP, OpenAPI document, 401, CSRF bootstrap, 201, 200, 200, 403, fresh CSRF, 204, 401. Use curl with secure-cookie support on localhost or a local HTTPS reverse proxy. Validate deployment behavior in browsers through the actual HTTPS origin.

## Request flow and files

| File | Responsibility |
|---|---|
| pom.xml | Java 21 compiler release, Boot parent, AI dependency management only, application and test dependencies. |
| mvnw, mvnw.cmd, .mvn/wrapper/maven-wrapper.properties | Unix launcher, Windows launcher and pinned Maven distribution. |
| compose.yaml, .gitignore | Isolated PostgreSQL service and volume; exclude local configuration and build outputs. |
| OpenScout.java | Application entry point and feature-package discovery. |
| application.properties | Development connection, secure CSRF session cookie, Hibernate validation and health exposure. |
| V1__identity.sql | Account/email uniqueness, revocable login sessions, FK and expiry index. |
| Account.java, Accounts.java | Persist account fields and resolve normalized email. |
| LoginSession.java, Sessions.java | Store login identity, owner and expiration; check the live session on each authenticated request. |
| IdentityController.java | Validates requests, hashes passwords with BCrypt, signs in, projects safe profiles, rotates CSRF session and revokes logins. |
| SecurityConfig.java | CORS preflight precedes CSRF validation. Spring validates unsafe requests using a masked token bound to the servlet session. A cookie bearer filter authenticates the JWT before anonymous authentication and endpoint authorization. Security context is request-local. |
| Tokens.java | Signs HS256 JWTs with subject, issuer, audience, issued-at, expiration and random session ID. Decoder checks signature, identity claims, clock and database membership. Logout deletes the session before returning 204 and expires the cookie. |
| ApiErrors.java | Central MVC validation/error handling and database conflict translation. Security rejects requests before MVC. |
| openapi.yaml | Public machine-readable identity and health contract. |
| TokensTest.java | Checks rejected unknown session, accepted live token and rejected expiration. |
| IdentityIntegrationTest.java | Boots the real HTTP server, exercises Flyway/JPA, credentialed preflight, auth, CSRF, logout and replay rejection. |

A database lookup on authenticated requests trades latency for immediate revocation. Servlet CSRF state is instance-local; restart requires a fresh bootstrap, and multiple replicas would need sticky routing or shared sessions. Expired login rows require periodic cleanup before production growth. Deployment still requires TLS proxy and browser verification, login throttling and operational key rotation.
