# Feasibility Study — ระบบบริหารงานคณะมหาวิทยาลัย

**เวอร์ชัน:** 0.1  
**วันที่:** 2026-06-19  
**สถานะ:** Draft

---

## 1. บทนำ

เอกสารนี้ประเมินความเป็นไปได้ของการพัฒนาระบบสารสนเทศเพื่อการบริหารงานภายในคณะ ครอบคลุม 10 หน่วยงานหลัก ได้แก่ สำนักงานเลขานุการ, การเงินและพัสดุ, บุคคล, วิชาการ, วิจัย, กิจการนักศึกษา, อาคารสถานที่, เทคโนโลยีสารสนเทศ, แผนงาน และวิเทศสัมพันธ์

### ขอบเขตของระบบ

| ปัจจัย | ค่า |
|---|---|
| ผู้ใช้งาน (concurrent) | ~50–500 คน |
| หน่วยงาน (domain) | 10 หน่วยงาน |
| ขนาดทีม IT | 2–5 คน |
| งบประมาณ | ระดับคณะ (ไม่ใช่ระดับสถาบัน) |
| ระยะเวลา MVP | 6–12 เดือน |

---

## 2. การพิจารณาสถาปัตยกรรม

| เกณฑ์ | Modular Monolith | ERP | Microservices |
|---|---|---|---|
| ความยากพัฒนา | ต่ำ | กลาง | สูงมาก |
| ค่า License | ไม่มี | สูง | ไม่มี |
| ทีมขนาดเล็กรับไหว | ✓ | ✓ (vendor) | ✗ |
| ปรับ workflow ไทยได้ | ✓ | ต้อง customize | ✓ |
| Evolve ต่อได้ | ✓ | ✗ (vendor lock) | — |

**ผลการพิจารณา: เลือก Modular Monolith**

---

## 3. กฎของ Modular Monolith

กฎเหล่านี้เป็นข้อบังคับ (non-negotiable) สำหรับทีมพัฒนาทุกคน เพื่อให้ระบบสามารถ evolve และ maintain ได้ในระยะยาว

---

### 3.1 Module Boundary Rules — ขอบเขตของ Module

#### กฎ M-01: แต่ละ module ต้องมี public API ของตัวเอง

Module อื่นห้ามเรียกใช้ internal class หรือ function โดยตรง ต้องผ่าน public interface เสมอ

```
✓  AcademicService.getCourseById(id)          ← public API
✗  AcademicRepository.findByCourseCode(code)  ← internal, ห้ามเรียกจาก module อื่น
```

#### กฎ M-02: ห้าม cross-module database query

แต่ละ module ต้องเข้าถึงเฉพาะ schema หรือ table ของตัวเองเท่านั้น

```sql
-- ✓ Finance module query finance schema
SELECT * FROM finance.budget_requests WHERE ...

-- ✗ Finance module ห้าม query hr schema โดยตรง
SELECT * FROM hr.employees WHERE ...
-- → ให้เรียก HRService.getEmployeeById(id) แทน
```

#### กฎ M-03: Shared data ต้องผ่าน Shared Kernel เท่านั้น

ข้อมูลที่ใช้ร่วมกัน เช่น User, Department ต้องอยู่ใน shared kernel และ immutable

```
/modules
  /shared-kernel        ← User, Department, FiscalYear (read-only value objects)
  /finance
  /hr
  /academic
```

#### กฎ M-04: ห้ามมี circular dependency ระหว่าง module

```
✓  Finance → Shared Kernel
✓  HR      → Shared Kernel
✗  Finance → HR → Finance   ← circular, ห้ามเด็ดขาด
```

หาก module A ต้องการข้อมูลจาก module B และ module B ต้องการข้อมูลจาก module A ให้ extract ส่วนที่ใช้ร่วมกันออกมาเป็น shared kernel แทน

---

### 3.2 Communication Rules — การสื่อสารระหว่าง Module

#### กฎ C-01: Synchronous call ใช้สำหรับ query ที่ต้องการผลลัพธ์ทันที

```
Finance Module → HRService.getEmployeeInfo(id) → return EmployeeDTO
```

#### กฎ C-02: Asynchronous event ใช้สำหรับ side effect ข้าม module

เมื่อ module หนึ่งทำบางอย่างสำเร็จและ module อื่นต้อง react ให้ใช้ domain event แทนการเรียกตรง

```
✓  HRModule.publish(StaffOnboardedEvent)
   → FinanceModule.on(StaffOnboardedEvent) → create payroll record
   → ITModule.on(StaffOnboardedEvent)      → provision account

✗  HRModule.financeService.createPayroll(...)   ← tight coupling
```

#### กฎ C-03: ห้าม pass database entity ข้าม module boundary

ต้อง map เป็น DTO (Data Transfer Object) ก่อนส่งออกจาก module เสมอ

```
✓  return new EmployeeDTO(employee.id, employee.name, employee.department)
✗  return employee   ← JPA/ORM entity ที่ผูกกับ session ของ module นั้น
```

---

### 3.3 Data Ownership Rules — ความเป็นเจ้าของข้อมูล

#### กฎ D-01: แต่ละ domain มี schema เป็นของตัวเอง

```
PostgreSQL
  schema: finance     → budget, payment, invoice
  schema: hr          → employee, position, leave
  schema: academic    → course, enrollment, grade
  schema: research    → project, grant, publication
  schema: student     → scholarship, activity, club
  schema: facility    → room, vehicle, asset
  schema: planning    → kpi, report, qa_evidence
  schema: document    → letter, decree, archive
  schema: shared      → users, departments, academic_units, fiscal_year, roles
                         ↳ academic_units ครอบคลุม: คณะ / ภาควิชา / สาขาวิชา (tree hierarchy)
```

#### กฎ D-02: เฉพาะ module เจ้าของเท่านั้นที่เขียน (write) ข้อมูลได้

Module อื่นทำได้แค่ read ผ่าน API ของเจ้าของ ห้าม INSERT/UPDATE/DELETE ข้าม schema

#### กฎ D-03: Reference ข้าม module ใช้ ID เท่านั้น ไม่ใช่ foreign key

```sql
-- ✓ finance.budget_requests เก็บแค่ employee_id (ไม่มี FK ไปที่ hr.employees)
employee_id UUID NOT NULL   -- reference only, no FK constraint

-- ✗ ห้ามสร้าง FK ข้าม schema
FOREIGN KEY (employee_id) REFERENCES hr.employees(id)
```

---

### 3.4 BPMN Integration Rules — การเชื่อมกับ Process Engine

#### กฎ B-01: Business process ที่มีหลาย step หรือหลาย approver ต้องใช้ BPMN

ตัวอย่าง process ที่ต้องมี BPMN definition:
- ขออนุมัติงบประมาณ (Finance)
- จัดซื้อจัดจ้าง (Procurement)
- ลาพักร้อน / ลากิจ (HR)
- เสนอหลักสูตรใหม่ (Academic)
- ขออนุมัติทุนวิจัย (Research)

#### กฎ B-02: Module เป็น External Task Worker ของ BPMN

Module ไม่ embed BPMN engine แต่เชื่อมผ่าน REST API หรือ External Task pattern

```
BPMN Engine → poll → FinanceWorker.execute(task)
                          → validate budget
                          → update status
                          → task.complete()
```

#### กฎ B-03: BPMN process ต้อง idempotent

หาก worker fail และ retry ต้องไม่เกิด side effect ซ้ำ เช่น ห้ามสร้าง record ซ้ำ ให้ใช้ idempotency key เสมอ

---

### 3.5 OPA Policy Rules — การกำหนดสิทธิ์

#### กฎ O-01: Authorization logic ต้องอยู่ใน OPA เท่านั้น

ห้าม hardcode role check ใน application code

```
✗  if (user.role == "DEAN") { ... }           ← ห้าม
✓  // ให้ OPA ตัดสิน ผ่าน Traefik Forward Auth
```

#### กฎ O-02: Policy ต้องเขียนเป็น Rego file และ version control ร่วมกับ code

```
/policies
  /finance.rego     ← who can approve budget
  /hr.rego          ← who can view salary data
  /academic.rego    ← who can edit curriculum
  /data-masking.rego ← row-level filter rules
```

#### กฎ O-03: Sensitive data ต้องมี data masking rule ใน OPA

ตัวอย่างข้อมูลที่ต้องมี masking: เงินเดือน, ผลการประเมิน, ข้อมูลสุขภาพ

---

### 3.6 Evolution Rules — กฎสำหรับการเติบโตของระบบ

#### กฎ E-01: ทุก module ต้องพร้อม extract เป็น microservice ได้

เงื่อนไขที่บ่งชี้ว่าควร extract module ออก:
- module นั้นมี load สูงกว่าส่วนอื่น 3–5 เท่า
- ทีมที่ดูแล module นั้นเติบโตจนมีสมาชิก 3+ คน
- module นั้นต้องการ tech stack ที่แตกต่างจากส่วนที่เหลือ

#### กฎ E-02: ห้ามสร้าง "Big Ball of Mud" — ห้ามข้ามกฎข้อ M, C, D

หากมีการยกเว้นกฎใดๆ ต้องมี ADR (Architecture Decision Record) อธิบายเหตุผล และกำหนดวันที่จะแก้ไข

#### กฎ E-03: ทุก module ต้องมี health check endpoint

```
GET /api/finance/health   → { status: "ok", db: "ok", version: "1.2.3" }
```

---

## 4. Tech Stack ที่เลือก

| Layer | Technology | เหตุผล |
|---|---|---|
| Frontend | React + Next.js | SSR, PWA support, multi-device |
| Mobile | PWA / React Native | code share กับ web |
| API Gateway | Traefik v3 | dynamic routing, Forward Auth middleware |
| Auth | Keycloak | SSO, LDAP sync, OIDC |
| Authorization | OPA (Open Policy Agent) | Rego policies, data filtering |
| Backend | NestJS / Spring Boot | module structure ตรงกับ Modular Monolith |
| BPMN Engine | Camunda 8 / Flowable | external task pattern, BPMN 2.0 |
| Database | PostgreSQL 16 | schema-per-module |
| Cache | Redis | session, hot data |
| File Storage | MinIO | S3-compatible, self-hosted |
| Message Bus | RabbitMQ / NATS | async domain events |
| Diagram | PlantUML | architecture as code |

---

## 5. ความเสี่ยงและแนวทางลด

| ความเสี่ยง | ระดับ | แนวทางลด |
|---|---|---|
| ทีมเล็กอาจ violate module boundary โดยไม่ตั้งใจ | สูง | ใช้ ArchUnit / Deptrac ตรวจ dependency ใน CI |
| BPMN process ซับซ้อนเกินจำเป็น | กลาง | เริ่มด้วย 3–5 process หลัก ก่อน |
| OPA policy เขียนผิด ทำให้ deny ทุก request | สูง | มี unit test สำหรับ Rego ทุก policy |
| Schema migration ข้าม module ยุ่งยาก | กลาง | ใช้ Flyway / Liquibase แยก per-module |
| Distributed transaction ข้าม module | กลาง | ออกแบบให้ใช้ eventual consistency ผ่าน event |

---

## 6. Keywords ที่ต้องศึกษา

### 6.1 สถาปัตยกรรม (Architecture)

| Keyword | ต้องรู้อะไร |
|---|---|
| **Modular Monolith** | module boundary, shared kernel, anti-corruption layer |
| **Domain-Driven Design (DDD)** | Bounded Context, Aggregate, Domain Event, Value Object |
| **Hexagonal Architecture** | port & adapter, dependency inversion, testability |
| **CQRS** | Command vs Query separation, read/write model แยกกัน |
| **Event Sourcing** | เก็บ state เป็น sequence of events แทน current state |
| **Saga Pattern** | จัดการ distributed transaction ด้วย compensating transaction |
| **Outbox Pattern** | guarantee delivery ของ domain event ก่อน commit DB |
| **ADR (Architecture Decision Record)** | วิธีเขียน decision log ที่ทีมใช้ร่วมกัน |

---

### 6.2 API Gateway & Edge (Traefik)

| Keyword | ต้องรู้อะไร |
|---|---|
| **Traefik v3** | dynamic configuration, provider, middleware chain |
| **Forward Auth Middleware** | ส่ง request ไปตรวจกับ external auth service ก่อน route |
| **TLS Termination** | Let's Encrypt, cert-manager, ACME protocol |
| **Rate Limiting** | token bucket vs leaky bucket, per-user vs per-IP |
| **Circuit Breaker** | Hystrix pattern, half-open state |
| **mTLS** | mutual TLS สำหรับ service-to-service authentication |

---

### 6.3 Authorization & Policy (OPA)

| Keyword | ต้องรู้อะไร |
|---|---|
| **OPA (Open Policy Agent)** | architecture, decision log, bundle API |
| **Rego Language** | rule syntax, partial evaluation, built-in functions |
| **RBAC** | Role-Based Access Control — role, permission, assignment |
| **ABAC** | Attribute-Based Access Control — subject/object/environment attributes |
| **ReBAC** | Relationship-Based Access Control (Google Zanzibar model) |
| **Row-level Security** | filter result set ตาม identity ของ caller |
| **Data Masking** | ซ่อนหรือ transform field ที่ sensitive ก่อนส่ง response |
| **JWT / OIDC** | claims structure, token introspection, Keycloak integration |

---

### 6.4 Process Engine (BPMN)

| Keyword | ต้องรู้อะไร |
|---|---|
| **BPMN 2.0** | notation — event, task, gateway, pool, lane |
| **Camunda 8 / Flowable** | deployment model, process instance, variable scope |
| **External Task Pattern** | worker poll → lock → execute → complete |
| **Human Task** | task assignment, due date, form key |
| **DMN (Decision Model and Notation)** | decision table สำหรับ business rule เช่น วงเงินอนุมัติ |
| **Idempotency** | retry safety, idempotency key, at-least-once delivery |
| **Process Variables** | ส่งข้อมูลระหว่าง step ใน process instance |
| **Incident / Error Boundary Event** | จัดการ exception ใน BPMN process |

---

### 6.5 Database & Data

| Keyword | ต้องรู้อะไร |
|---|---|
| **Schema-per-module** | PostgreSQL schema isolation, search_path, permission |
| **Database Migration** | Flyway vs Liquibase, versioned migration, rollback |
| **Optimistic Locking** | version column, handle concurrent update |
| **Soft Delete** | deleted_at pattern, filter ใน query |
| **Audit Log** | created_by, updated_by, event sourcing light |
| **Connection Pooling** | PgBouncer, HikariCP, pool sizing formula |
| **Redis Patterns** | cache-aside, write-through, TTL strategy, pub/sub |
| **Eventual Consistency** | ยอมรับ lag ระหว่าง module แทน distributed lock |

---

### 6.6 Frontend & Multi-device

| Keyword | ต้องรู้อะไร |
|---|---|
| **Progressive Web App (PWA)** | service worker, manifest, offline support |
| **Responsive Design** | breakpoint, fluid grid, mobile-first |
| **SSR vs CSR vs SSG** | Next.js rendering strategy เลือกตาม use case |
| **Microfrontend** | พิจารณาเมื่อทีมขยาย — module federation |
| **Accessibility (a11y)** | WCAG 2.1, keyboard nav, screen reader |
| **Design System** | component library, token, storybook |

---

### 6.7 Infrastructure & DevOps

| Keyword | ต้องรู้อะไร |
|---|---|
| **Docker / Docker Compose** | multi-stage build, networking, volume |
| **GitHub Actions / GitLab CI** | pipeline, job, artifact, environment |
| **ArchUnit / Deptrac** | enforce module dependency rule ใน CI |
| **Health Check & Readiness Probe** | liveness vs readiness, Kubernetes probe |
| **Structured Logging** | JSON log, correlation ID, log level |
| **Distributed Tracing** | OpenTelemetry, trace ID propagation ข้าม module |
| **Prometheus + Grafana** | metric scraping, dashboard, alert rule |
| **MinIO** | S3 API, bucket policy, presigned URL |

---

### 6.8 Security

| Keyword | ต้องรู้อะไร |
|---|---|
| **OWASP Top 10** | injection, broken auth, IDOR, security misconfiguration |
| **CSRF / CORS** | SameSite cookie, CORS preflight, allowed origins |
| **Input Validation** | whitelist validation, DTO validation (class-validator) |
| **Secret Management** | environment variable, Vault, ไม่ hardcode ใน code |
| **PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)** | consent, data minimization, right to erasure |

---

## 7. สรุปข้อตกลง

- [x] เลือก **Modular Monolith** เป็นสถาปัตยกรรมหลัก
- [x] กฎ M, C, D, B, O, E เป็น **mandatory** ทุกข้อ
- [x] การยกเว้นกฎต้องมี **ADR** และได้รับความเห็นชอบจาก Tech Lead
- [x] ทบทวนสถาปัตยกรรมทุก **6 เดือน** หรือเมื่อจำนวนผู้ใช้เพิ่ม 5 เท่า
