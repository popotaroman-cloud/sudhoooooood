# Architecture — ระบบบริหารงานคณะมหาวิทยาลัย

**Faculty Administration Platform**
**เวอร์ชัน:** 0.1
**ปรับปรุงจาก:** feasibility study.md · overview.md · faculty-admin-overview.puml

> เอกสารนี้รวมเฉพาะ **สถาปัตยกรรม (architecture)** ของระบบ — การตัดสินใจเชิงสถาปัตยกรรม, layers, modules, การสื่อสาร, กฎ และ tech stack ส่วน functional requirement และแผนงานทีมอยู่ในเอกสารอื่น

---

## 1. การตัดสินใจเชิงสถาปัตยกรรม (Architecture Decision)

เลือกใช้ **Modular Monolith** เป็นสถาปัตยกรรมหลัก

| เกณฑ์ | Modular Monolith | ERP | Microservices |
|---|---|---|---|
| ความยากพัฒนา | ต่ำ | กลาง | สูงมาก |
| ค่า License | ไม่มี | สูง | ไม่มี |
| ทีมขนาดเล็กรับไหว | ✓ | ✓ (vendor) | ✗ |
| ปรับ workflow ไทยได้ | ✓ | ต้อง customize | ✓ |
| Evolve ต่อได้ | ✓ | ✗ (vendor lock) | — |

**บริบทที่กำหนดการตัดสินใจ:** ผู้ใช้ ~50–500 concurrent · 10 หน่วยงาน · ทีม IT 2–5 คน · งบระดับคณะ · MVP 6–12 เดือน

ทุก module ออกแบบให้ **พร้อม extract เป็น microservice** ได้ในภายหลัง (ดูกฎ E-01)

---

## 2. สถาปัตยกรรมแบบ Layered (System Layers)

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT LAYER (Multi-device)                                 │
│  Web (React/Next.js)  ·  Mobile (PWA)  ·  Tablet/Kiosk       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│  EDGE LAYER                                                  │
│  ┌──────────────────────┐   ┌────────────────────────────┐  │
│  │ Traefik (API Gateway)│   │ OPA (Open Policy Agent)    │  │
│  │ · TLS Termination    │   │ · Policy Engine (Rego)     │  │
│  │ · Load Balancer / HC │   │ · RBAC / ABAC              │  │
│  │ · Rate Limit / CB    │   │ · Row-level Filter / Mask  │  │
│  │ · Dynamic Routing    │   │                            │  │
│  └──────────────────────┘   └────────────────────────────┘  │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │ Forward Auth
┌──────────▼───────────┐      ┌───────────▼───────────────────┐
│  IDENTITY & AUTH     │      │  BPMN PROCESS ENGINE          │
│  · Keycloak (SSO/LDAP)│     │  · Camunda 8 / Flowable       │
│  · JWT / Token Store  │     │  · Process Definitions        │
│                       │     │  · Human Tasks / Timers       │
│                       │     │  · Workflow REST API          │
└───────────────────────┘     └───────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  APPLICATION MODULES (Modular Monolith)                       │
│                                                               │
│  Finance Domain      People Domain      Academic Domain       │
│  · Finance           · HR               · Academic            │
│  · Procurement       · Student Affairs  · Research            │
│                                                               │
│  Operations Domain   Strategy Domain                          │
│  · Facility          · Planning & QA                          │
│  · IT Admin          · Document & Archive                     │
└──────────┬────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  DATA LAYER                                                   │
│  PostgreSQL 16 (schema-per-module) · Redis (cache/session)   │
│  MinIO (file/document) · Message Bus (RabbitMQ / NATS)        │
└──────────┬────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  EXTERNAL SYSTEMS                                             │
│  GFMIS (การเงินภาครัฐ) · University ERP/SIS · Email/SMS       │
└───────────────────────────────────────────────────────────────┘
```

### Request flow (ต่อ 1 request)

1. Client → **Traefik** (TLS → LB → Rate Limit → Routing)
2. Traefik → **Keycloak/Auth** : authenticate (JWT / session check)
3. Traefik → **OPA** (Forward Auth middleware) : authorize → RBAC/ABAC + row-level filter
4. Traefik → route ไปยัง **Application Module** ที่ตรง path (`/api/<module>/**`)
5. Module → อ่าน/เขียน **Data Layer** (schema ของตัวเอง)
6. งานที่ต้องอนุมัติหลายขั้น → **BPMN Engine** trigger module ผ่าน External Task Worker

---

## 3. Modules และความรับผิดชอบ

| Module | Schema | Domain | ความรับผิดชอบหลัก |
|---|---|---|---|
| **shared-kernel** | `shared` | — | User, Department, AcademicUnit, FiscalYear, Role (read-only) |
| **auth** | — | Identity | SSO, JWT, OIDC, Keycloak integration |
| **finance** | `finance` | Finance | งบประมาณ, การเงิน, บัญชี, payroll, รายงานการเงิน |
| **procurement** | `procurement` | Finance | พัสดุ, จัดซื้อจัดจ้าง, สัญญา, คลัง |
| **hr** | `hr` | People | บุคคล, สรรหา, ลา, เงินเดือน, ประเมินผล |
| **student** | `student` | People | กิจการนักศึกษา, ทุนการศึกษา, ชมรม |
| **academic** | `academic` | Academic | วิชาการ, ทะเบียน, หลักสูตร, ตารางสอน |
| **research** | `research` | Academic | วิจัย, ทุน, ผลงาน, บริการวิชาการ |
| **facility** | `facility` | Operations | อาคาร, ห้อง, ยานพาหนะ, ครุภัณฑ์ |
| **it-admin** | `it` | Operations | Account, สิทธิ์, ระบบเครือข่าย, ซอฟต์แวร์ |
| **planning** | `planning` | Strategy | แผนงาน, KPI, ประกันคุณภาพ, รายงาน |
| **document** | `document` | Strategy | สารบรรณ, หนังสือราชการ, คำสั่ง, ประกาศ |

---

## 4. การสื่อสารระหว่าง Module (Module Communication)

```
A ──sync──► B      A เรียก public API ของ B โดยตรง (synchronous) รอผลลัพธ์
A ··event·► B      A publish event, B subscribe (asynchronous)
A ══bpmn══► B      BPMN engine ประสาน A และ B ผ่าน process
```

### 4.1 Shared Kernel — ไม่มี dependency ใดๆ

`shared-kernel` ถือ `User, Department, FiscalYear, Role` — ทุก module **อ่านได้** ไม่มี module ใดเขียน shared-kernel โดยตรง

### 4.2 Synchronous Dependencies (sync call)

```
finance      ──sync──► hr, shared-kernel
procurement  ──sync──► finance, hr, shared-kernel
hr           ──sync──► shared-kernel
academic     ──sync──► hr, shared-kernel
research     ──sync──► hr, finance, shared-kernel
student      ──sync──► academic, finance, shared-kernel
facility     ──sync──► hr, shared-kernel
planning     ──sync──► finance, hr, shared-kernel
document     ──sync──► shared-kernel
it-admin     ──sync──► shared-kernel
auth         ──sync──► shared-kernel
```

### 4.3 Asynchronous Domain Events (event bus)

```
hr      ··StaffOnboardedEvent······► finance, it-admin, document
hr      ··StaffOffboardedEvent·····► finance, it-admin
finance ··BudgetAllocatedEvent·····► procurement
finance ··PaymentProcessedEvent····► document
procurement ··POApprovedEvent······► finance
procurement ··ContractSignedEvent··► document
procurement ··AssetReceivedEvent···► facility
academic ··EnrollmentConfirmedEvent► student
academic ··CurriculumApprovedEvent·► document
research ··GrantApprovedEvent·······► finance
research ··PublicationAddedEvent····► planning
student  ··ScholarshipApprovedEvent► finance
student  ··ActivityCompletedEvent··► planning
facility ··RoomBookedEvent·········► document
facility ··VehicleAssignedEvent····► document
```

### 4.4 BPMN Process Orchestration

BPMN engine ประสาน module ผ่าน External Task Worker (workflow ที่มีหลาย step / หลาย approver)

| Process | Modules ที่ประสาน | Human Task |
|---|---|---|
| `budget-request-approval.bpmn` | finance, hr | คณบดี / รองคณบดีฝ่ายการเงิน |
| `procurement-approval.bpmn` | procurement, finance | หัวหน้าพัสดุ → รองคณบดี → คณบดี (ตามวงเงิน DMN) |
| `leave-request.bpmn` | hr, finance | หัวหน้างาน / คณบดี |
| `staff-onboarding.bpmn` | hr, it-admin, finance | หัวหน้างานบุคคล |
| `curriculum-approval.bpmn` | academic, document | กรรมการวิชาการ → คณะกรรมการประจำคณะ |
| `research-grant-approval.bpmn` | research, finance | คณะกรรมการวิจัย |

### 4.5 Dependency Matrix

`R` = reads from (sync) · `E` = emits event to · `B` = coordinated by BPMN

|  | shared | auth | finance | procurement | hr | academic | research | student | facility | planning | document | it-admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **finance** | R | — | — | — | R | — | — | — | — | — | E | — |
| **procurement** | R | — | R | — | R | — | — | — | — | — | E | — |
| **hr** | R | — | E | — | — | — | — | — | — | — | E | E |
| **academic** | R | — | — | — | R | — | — | — | — | — | E | — |
| **research** | R | — | R,E | — | R | — | — | — | — | E | — | — |
| **student** | R | — | R,E | — | — | R | — | — | — | E | — | — |
| **facility** | R | — | — | — | R | — | — | — | — | — | E | — |
| **planning** | R | — | R | — | R | — | — | — | — | — | — | — |
| **document** | R | — | — | — | — | — | — | — | — | — | — | — |
| **it-admin** | R | R | — | — | — | — | — | — | — | — | — | — |

---

## 5. กฎสถาปัตยกรรม (Architecture Rules — mandatory)

กฎทุกข้อเป็นข้อบังคับ (non-negotiable) การยกเว้นต้องมี **ADR** และได้รับความเห็นชอบจาก Tech Lead

### 5.1 Module Boundary (M)

- **M-01** — แต่ละ module มี **public API** ของตัวเอง; module อื่นห้ามเรียก internal class/function โดยตรง
- **M-02** — ห้าม **cross-module database query**; เข้าถึงเฉพาะ schema ตัวเอง
- **M-03** — Shared data (User, Department, …) ต้องผ่าน **Shared Kernel** เท่านั้น (immutable, read-only)
- **M-04** — ห้ามมี **circular dependency**; ถ้าเกิด ให้ extract ส่วนร่วมไป shared kernel

### 5.2 Communication (C)

- **C-01** — **Synchronous call** ใช้กับ query ที่ต้องการผลลัพธ์ทันที
- **C-02** — **Asynchronous event** ใช้กับ side effect ข้าม module (domain event แทนการเรียกตรง)
- **C-03** — ห้าม pass **database entity** ข้าม module boundary; map เป็น **DTO** ก่อนเสมอ

### 5.3 Data Ownership (D)

- **D-01** — แต่ละ domain มี **schema** ของตัวเอง
- **D-02** — เฉพาะ module เจ้าของเท่านั้นที่ **write** ได้; module อื่น read ผ่าน API เท่านั้น
- **D-03** — Reference ข้าม module ใช้ **ID เท่านั้น** ไม่ใช่ foreign key (no cross-schema FK)

### 5.4 BPMN Integration (B)

- **B-01** — Business process ที่มีหลาย step / หลาย approver ต้องใช้ **BPMN**
- **B-02** — Module เป็น **External Task Worker** ของ BPMN (ไม่ embed engine; เชื่อมผ่าน REST/External Task)
- **B-03** — BPMN process ต้อง **idempotent** (ใช้ idempotency key, retry-safe)

### 5.5 OPA Policy (O)

- **O-01** — Authorization logic อยู่ใน **OPA เท่านั้น**; ห้าม hardcode role check ใน app code
- **O-02** — Policy เขียนเป็น **Rego file** + version control ร่วมกับ code
- **O-03** — Sensitive data (เงินเดือน, ผลประเมิน, สุขภาพ) ต้องมี **data masking rule** ใน OPA

### 5.6 Evolution (E)

- **E-01** — ทุก module พร้อม **extract เป็น microservice** (เมื่อ load สูง 3–5x / ทีมโต 3+ คน / ต้องการ tech stack ต่าง)
- **E-02** — ห้ามสร้าง **"Big Ball of Mud"**; การยกเว้นกฎ M/C/D ต้องมี ADR
- **E-03** — ทุก module มี **health check endpoint** (`GET /api/<module>/health`)

---

## 6. Data Ownership — Schema-per-module

```
PostgreSQL 16
  schema: shared      → users, departments, academic_units (tree: คณะ/ภาควิชา/สาขา),
                        fiscal_years, roles
  schema: finance     → budget, payment, invoice
  schema: procurement → requisition, purchase_order, contract, vendor
  schema: hr          → employee, position, leave
  schema: academic    → course, enrollment, grade
  schema: research    → project, grant, publication
  schema: student     → scholarship, activity, club
  schema: facility    → room, vehicle, asset
  schema: planning    → kpi, report, qa_evidence
  schema: document    → letter, decree, archive
  schema: it          → account, permission, software_license, helpdesk_ticket
```

- การเชื่อม consistency ข้าม module ใช้ **eventual consistency** ผ่าน event (ไม่มี distributed transaction / distributed lock)
- Migration แยก **per-module** (Flyway / Liquibase)

---

## 7. Tech Stack

| Layer | Technology | เหตุผล |
|---|---|---|
| Frontend | React + Next.js | SSR, PWA support, multi-device |
| Mobile | PWA / React Native | code share กับ web |
| API Gateway | Traefik v3 | dynamic routing, Forward Auth middleware |
| Auth | Keycloak | SSO, LDAP sync, OIDC |
| Authorization | OPA (Open Policy Agent) | Rego policies, data filtering |
| Backend | NestJS / Spring Boot | module structure ตรงกับ Modular Monolith |
| BPMN Engine | Camunda 8 / Flowable | external task pattern, BPMN 2.0 + DMN |
| Database | PostgreSQL 16 | schema-per-module |
| Cache | Redis 7 | session, hot data, pub/sub |
| File Storage | MinIO | S3-compatible, self-hosted |
| Message Bus | RabbitMQ / NATS | async domain events |
| Diagram | PlantUML | architecture as code |
| CI Guardrail | ArchUnit / Deptrac | enforce module dependency rules |
| Observability | Prometheus + Grafana, OpenTelemetry | metrics, tracing, structured logging |

---

## 8. Build Order (ลำดับ implement ก่อน-หลัง)

```
shared-kernel
    └── auth
    └── hr ──────────────────────────────────┐
    └── finance ──────────────────────────┐  │
         └── procurement (BPMN)           │  │
         └── research (BPMN)              │  │
         └── student                      │  │
              └── academic ───────────────┘  │
                   └── curriculum (BPMN)     │
    └── document (subscribe all events)      │
    └── facility ─────────────────────────────┘
    └── it-admin
    └── planning (depends on all above)
```

> **กฎลำดับ:** module ที่อยู่ด้านบนต้อง implement และ deploy ได้ก่อน จึงจะเริ่ม module ถัดไป
> module ที่ module อื่น depend on (shared-kernel → hr → finance) ต้องพร้อมก่อนเสมอ

---

## 9. ความเสี่ยงเชิงสถาปัตยกรรมและการลด

| ความเสี่ยง | ระดับ | แนวทางลด |
|---|---|---|
| ทีมเล็ก violate module boundary โดยไม่ตั้งใจ | สูง | ArchUnit / Deptrac ตรวจ dependency ใน CI ตั้งแต่วันแรก |
| BPMN process ซับซ้อนเกินจำเป็น | กลาง | เริ่มด้วย 3–5 process หลักก่อน |
| OPA policy ผิด → deny ทุก request | สูง | unit test (conftest) สำหรับ Rego ทุก policy |
| Schema migration ข้าม module ยุ่งยาก | กลาง | Flyway / Liquibase แยก per-module |
| Distributed transaction ข้าม module | กลาง | ออกแบบ eventual consistency ผ่าน event (Outbox/Saga pattern) |

---

## 10. หลักการที่ยึด (Architectural Patterns)

- **Modular Monolith** — module boundary, shared kernel, anti-corruption layer
- **Domain-Driven Design** — Bounded Context, Aggregate, Domain Event, Value Object
- **Hexagonal Architecture** — port & adapter, dependency inversion
- **CQRS** — แยก command / query model (เมื่อจำเป็น)
- **Saga / Outbox Pattern** — จัดการ distributed transaction และ guarantee event delivery
- **ADR (Architecture Decision Record)** — บันทึกทุกการตัดสินใจและการยกเว้นกฎ

> ทบทวนสถาปัตยกรรมทุก **6 เดือน** หรือเมื่อจำนวนผู้ใช้เพิ่ม 5 เท่า
