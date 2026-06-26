# Test Coverage Analysis — Faculty Administration Platform

**Version:** 0.1  
**Date:** 2026-06-26  
**Status:** Pre-implementation — forward-looking test strategy

---

## 1. Current State

The repository is in Phase 0 (pre-implementation). There is no source code and therefore no test coverage at this time. This document defines the test strategy that must be built **alongside** the implementation, starting from the first commit of production code.

**Key principle:** every subtask in `1.md`–`4.md` is not "done" until it ships with tests. CI must block merges on failing tests and falling below the coverage thresholds defined in section 7.

---

## 2. Test Pyramid

```
          ┌──────────────┐
          │  E2E / UI    │  ← few, slow, Playwright
          ├──────────────┤
          │  Integration │  ← DB, Redis, Keycloak, event bus
          ├──────────────┤
          │  Contract    │  ← Pact / OpenAPI schema tests
          ├──────────────┤
          │  Unit        │  ← domain logic, pure functions, Rego policies
          └──────────────┘
```

| Layer | Framework (NestJS path) | Framework (Spring Boot path) | Target share |
|---|---|---|---|
| Unit | Jest | JUnit 5 + AssertJ | ~60 % of all tests |
| Integration | Jest + Testcontainers | Spring Boot Test + Testcontainers | ~30 % |
| Contract | Pact JS | Pact JVM | ~5 % |
| E2E | Playwright | Playwright / RestAssured | ~5 % |
| OPA Policy | OPA conftest (`opa test`) | same | per-module |
| Load | k6 | k6 | gate in CI |

---

## 3. Priority Areas and Specific Gaps

### 3.1 Auth Module — HIGHEST PRIORITY

The auth module is the security perimeter for every other module. A gap here is a gap everywhere.

**Critical missing scenarios:**

| Scenario | Why it matters |
|---|---|
| JWT with expired `access_token` is rejected by `/auth/verify` | Any bypass means unauthenticated access to all modules |
| JWT with a blacklisted `jti` (post-logout) is rejected | FR-AUTH-005: token blacklist in Redis |
| Token signed with the wrong key is rejected (RS256 signature check) | Prevents key-confusion attacks |
| MFA is **enforced** for `DEAN`, `VICE_DEAN_FINANCE`, `HR_ADMIN`, `FINANCE_ADMIN` | FR-AUTH-004 |
| MFA is **not enforced** for `STAFF` role | No regression on normal logins |
| `X-User-Roles` header is present and correct on every forwarded request | FR-AUTH-006 |
| `StaffOffboardedEvent` disables the Keycloak account within the same transaction | Security: ex-employee access |
| Audit log records `ip_address`, `user_agent`, `event_type` for every login attempt | FR-AUTH-007 |
| Session timeout fires at exactly 8 hours | FR-AUTH-001 |
| Failed login increments a counter and does not leak user-existence information | OWASP A07 |

**Suggested test structure:**
```
auth/
  __tests__/
    jwt-validation.spec.ts      ← unit: token parsing, claims extraction
    token-blacklist.spec.ts     ← integration: Redis write/read after logout
    forward-auth.spec.ts        ← integration: /auth/verify endpoint contract
    mfa-enforcement.spec.ts     ← integration: role-based MFA gate
    audit-log.spec.ts           ← integration: event store after login/logout
    sso-flow.e2e.spec.ts        ← e2e: full Keycloak login → JWT → module call
```

---

### 3.2 Shared Kernel — HIGH PRIORITY

Every module depends on shared kernel. Bugs here have a blast radius of 12 modules.

**Critical missing scenarios:**

| Scenario | Why it matters |
|---|---|
| `GET /internal/shared/users/{id}` returns 404 for unknown UUID (not 500) | Calling modules must handle missing users gracefully |
| `GET /internal/shared/fiscal-years/current` returns exactly 1 result even when multiple years exist in DB | FR-SK-003: only 1 open year constraint |
| Closing a fiscal year while `status=open` on another is rejected with a clear error | FR-SK-003 single-open invariant |
| Academic unit tree returns correct depth (max 3 levels: faculty → department → program) | FR-SK-006 |
| `GET /internal/shared/academic-units?type=program` does not return `faculty` or `department` rows | Filter correctness |
| Redis cache is hit on the second call (no DB query fired) | Performance / SK-8 |
| Cache invalidation: update a department → next read is fresh (not stale) | SK-8 cache correctness |
| Soft-deleted departments do not appear in list responses | FR-SK-002 |
| No module can write directly to `shared.users` table (ArchUnit / Deptrac rule fires in CI) | FR-SK-001 boundary enforcement |
| Keycloak webhook → `shared.users` sync is idempotent (duplicate events don't duplicate rows) | SK-9 |

---

### 3.3 Domain Events — HIGH PRIORITY (cross-cutting)

The event bus is the nervous system of the platform. Silent delivery failures will corrupt data silently.

**Critical missing scenarios:**

| Event | Gap to cover |
|---|---|
| `StaffOnboardedEvent` | Published exactly once per employee creation; received by `finance` (payroll created), `it-admin` (account provisioned), `document` (file created) — test all three consumers independently |
| `StaffOffboardedEvent` | `finance` closes payroll, `it-admin` revokes account — verify both consumers, test idempotency (duplicate event must not double-close) |
| `BudgetAllocatedEvent` | `procurement` receives it and opens a purchase quota — test that quota amount matches the allocated amount |
| `POApprovedEvent` | `finance` commits (reduces available) budget — test that the committed amount equals PO amount |
| `GrantApprovedEvent` | `finance` opens a new budget line for the grant — test budget line is created with correct fiscal year |
| `ScholarshipApprovedEvent` | `finance` queues a payment — test that payment amount, beneficiary, and fiscal year are correct |
| Event replay / at-least-once delivery | Consumer logic must be idempotent: re-processing the same event must not create duplicate records |

---

### 3.4 OPA Policies — HIGH PRIORITY

OPA policies are the access-control layer. Under-tested policies are a silent authorization bypass.

**The `overview.md` Phase 4 checklist already calls for "unit test ทุก policy" — these tests must be written alongside each Rego file, not deferred to Phase 4.**

| Policy file | Scenarios that must have `opa test` coverage |
|---|---|
| `hr.rego` | `STAFF` cannot read another employee's salary; `HR_ADMIN` can; `DEAN` can see department salaries but not system-wide |
| `finance.rego` | Approval tier: `STAFF` cannot approve any voucher; `VICE_DEAN_FINANCE` can approve up to threshold; `DEAN` above threshold |
| `finance.rego` | Row-level filter: a user in department A cannot see budget lines of department B |
| `academic.rego` | Only the course's assigned faculty can submit grades |
| `research.rego` | Principal Investigator can edit their own grant; read-only for others in same department |
| `data-masking.rego` | Salary field is masked (`***`) in any response where caller's role is not `HR_ADMIN` or `DEAN` |
| All modules | `deny` default: a new role that is not explicitly allowed must be denied (not allowed by omission) |

**Test file pattern:**
```
policies/
  hr/
    hr.rego
    hr_test.rego        ← OPA native test file, run with `opa test ./policies/hr/`
  finance/
    finance.rego
    finance_test.rego
```

---

### 3.5 Finance Module — HIGH PRIORITY

Finance handles money. Off-by-one errors and race conditions here have real consequences.

**Critical missing scenarios:**

| Scenario | Why it matters |
|---|---|
| Budget allocation cannot exceed the fiscal year's total budget | Prevents over-allocation |
| `procurement` sync call to check budget returns correct remaining balance (not total) | FR dependency: procurement reads finance |
| Concurrent PO approvals do not cause a race that over-commits the budget | Use DB-level locking test with parallel requests |
| `PaymentProcessedEvent` is published after every successful payment, never before | Event ordering |
| A closed fiscal year rejects new budget allocations | FR-SK-003 |
| Payroll record is created exactly once per `StaffOnboardedEvent` (idempotent) | FR-FIN |
| Finance report for a fiscal year aggregates all transactions in that year only | Reporting correctness |

---

### 3.6 BPMN Workflow Tests — MEDIUM PRIORITY

Each BPMN process has human tasks and branching logic. The process logic must be tested in isolation before real Camunda is involved.

**Processes that need test coverage:**

| Process | Key branches to test |
|---|---|
| `budget-request-approval.bpmn` | Happy path approval; Dean rejection returns to requester; missing approver escalation |
| `procurement-approval.bpmn` | Amount < threshold → only head of procurement approves; Amount > threshold → Vice Dean required; Amount > high threshold → Dean required (DMN table) |
| `leave-request.bpmn` | Insufficient leave balance → process aborts before human task; approved → balance is deducted; OT calculation fires when applicable |
| `staff-onboarding.bpmn` | All three parallel tasks (HR record, IT account, payroll) complete before process ends; one failure suspends process and alerts |
| `curriculum-approval.bpmn` | Approved → `CurriculumApprovedEvent` published; Rejected → academic module notified, no event published |
| `research-grant-approval.bpmn` | Matching fund check fails → committee task not created; approved → budget line opened |

**Test approach:** use Camunda's `camunda-bpm-assert` or Flowable's test API to drive the process through each decision point without a real UI.

---

### 3.7 Contract Tests (Inter-Module API) — MEDIUM PRIORITY

The `overview.md` defines 7+ internal sync APIs. If a provider changes a field name without a contract test, all consumers break silently.

**Contracts to define with Pact:**

| Consumer | Provider | Contract |
|---|---|---|
| `finance` | `hr` | `GET /internal/hr/employees/{id}` → fields: `id`, `department_id`, `position`, `salary_grade` |
| `procurement` | `finance` | `GET /internal/finance/budget-balance/{id}` → field: `remaining_amount` (number, not string) |
| `academic` | `hr` | `GET /internal/hr/employees/{id}` → field: `employee_type` includes `FACULTY` value |
| `research` | `finance` | `GET /internal/finance/budget-balance/{id}` → same as above |
| All modules | `shared-kernel` | All 6 endpoints defined in FR-SK-005 |
| `student` | `academic` | `GET /internal/academic/enrollment/{student_id}` → field: `status` |

**Format:** Pact consumer tests live in the consumer module; provider verification runs against the real provider in CI.

---

### 3.8 Infrastructure & Caching Tests — MEDIUM PRIORITY

| Area | Gap |
|---|---|
| Redis cache TTL | Confirm a cached response is served within 5-minute window; confirm fresh data is returned after TTL expiry |
| Redis connection failure | Shared kernel falls back to DB (not 500) if Redis is unavailable |
| PostgreSQL constraint: single open fiscal year | `UNIQUE` partial index test via migration integration test |
| Traefik forward-auth middleware | `/auth/verify` returning 401 must result in 401 to the client (not 200 with auth error in body) |
| Token blacklist TTL | Blacklisted token entry expires from Redis after the access token's remaining TTL, not earlier, not later |

---

### 3.9 IT Admin Module — LOWER PRIORITY (but event-driven)

| Scenario | Why it matters |
|---|---|
| Account provisioned within 1 business minute of `StaffOnboardedEvent` | SLA: new employee can log in on day one |
| Account disabled immediately on `StaffOffboardedEvent` | Security: no lingering access |
| Software license expiry alert fires at T-30 days (not T-29, not T-31) | IT-5 |
| Helpdesk SLA timer escalates ticket at the correct threshold | IT-6 |

---

## 4. Cross-Cutting Concerns

### 4.1 Security Tests (OWASP checklist — Phase 4)

These belong in CI as automated checks, not just a one-off pentest:

- **SQL Injection:** parameterized query enforcement — all repository methods must use ORM parameters, never string concatenation. Enforce with a static analysis rule (ESLint `no-unsafe-sql` or equivalent).
- **Mass Assignment:** DTOs must use an allowlist (`@IsString()` / `class-validator`) — test that sending extra fields in a POST body is silently ignored.
- **IDOR:** resource endpoints must verify that `X-Department-Id` from the JWT matches the requested resource's department — test cross-department access is 403.
- **Audit trail tamper-resistance:** audit log rows must be append-only (no UPDATE/DELETE on audit tables) — enforce with DB-level permissions, verify with a test.

### 4.2 Load Tests (k6 — Phase 4)

`overview.md` sets the target: **500 concurrent users**.

Minimum scenarios for the k6 suite:

```javascript
// Scenarios to script
// 1. Login + shared-kernel lookup (auth critical path)
// 2. Budget balance check during PO approval (finance bottleneck)
// 3. Leave request submission + balance read (HR peak: start of semester)
// 4. Shared kernel cache under load (Redis hit-rate must stay > 95%)
```

Acceptance gate (block deploy if breached):
- p95 response time < 500 ms for all internal APIs
- Error rate < 0.1 % under 500 VUs for 5 minutes
- Redis cache hit rate ≥ 95 % during steady-state load

---

## 5. Test Doubles Strategy

Because modules are built in phases, teams need test doubles to work in parallel:

| Situation | What to use |
|---|---|
| Module not yet built (e.g., `hr` during Phase 0) | `MockSharedKernelService` implementing the TypeScript interface from `contracts/shared.interface.ts` |
| External Keycloak not available in unit tests | Stub the `KeycloakAdminClient`; inject via DI |
| RabbitMQ / event bus in unit tests | In-memory event bus (simple `EventEmitter` wrapper) |
| RabbitMQ in integration tests | Testcontainers RabbitMQ image |
| Camunda in BPMN unit tests | `camunda-bpm-assert` embedded engine |

**Rule:** mocks must implement the same interface as the real service. When the real service is finished, replace the mock with a Testcontainers integration test — delete the mock.

---

## 6. Test File Naming and Location Conventions

```
src/
  modules/
    auth/
      domain/
        token-blacklist.service.ts
        token-blacklist.service.spec.ts    ← co-located unit test
      application/
        verify-token.use-case.ts
        verify-token.use-case.spec.ts
      infrastructure/
        redis-blacklist.repository.ts
        redis-blacklist.repository.spec.ts
  __tests__/
    integration/
      auth-forward.integration.spec.ts    ← requires running Redis + Keycloak
    e2e/
      sso-login.e2e.spec.ts               ← requires full stack
    contract/
      shared-kernel.pact.spec.ts

policies/
  hr/
    hr.rego
    hr_test.rego

k6/
  load/
    auth-critical-path.js
    budget-balance.js
```

---

## 7. Coverage Thresholds (enforce in CI)

| Module tier | Branch coverage minimum | Rationale |
|---|---|---|
| `auth` | 90 % | Security perimeter |
| `shared-kernel` | 90 % | Every module depends on it |
| `finance` | 85 % | Money; approval logic is complex |
| `hr` | 85 % | Sensitive data; salary masking |
| `procurement`, `academic`, `research` | 80 % | Business-critical |
| `student`, `facility`, `planning`, `document`, `it-admin` | 75 % | Supporting modules |
| OPA policies (`opa test`) | 100 % of rules | Every `allow` rule must have a passing and a failing test |

---

## 8. Build-Order Alignment

Tests should be introduced in the same order as modules are built:

```
Phase 0  →  auth tests + shared-kernel tests + OPA base policy tests + Rego test runner in CI
Phase 1  →  hr tests + finance tests + document consumer tests + integration tests (Testcontainers)
Phase 2  →  BPMN process tests + procurement tests + academic tests + Pact contract tests
Phase 3  →  research, student, facility, it-admin tests
Phase 4  →  full OPA policy suite tests + k6 load tests + OWASP automated scan
```

**CI gate added each phase:**
- Phase 0: unit + OPA conftest must pass on every PR
- Phase 1+: integration tests added to the gate (Testcontainers, ~2 min extra)
- Phase 2+: Pact provider verification added
- Phase 4: k6 smoke test (50 VUs, 60 s) added to merge gate; full load test runs nightly

---

## 9. Immediate Actions (before first line of production code)

1. **Add Jest / JUnit config** to the project skeleton with the coverage thresholds from section 7.
2. **Add `opa test` step** to `INF-5` (GitHub Actions lint+test pipeline).
3. **Add Testcontainers** dependency to `pom.xml` or `package.json` now — it is much harder to retrofit.
4. **Commit `contracts/shared.interface.ts`** (already planned in `1.md` week 1-2) — this is the single source of truth for mock implementations.
5. **Create a failing skeleton test** for each module as its first commit, so CI red → green is the definition of "module started."
