# Project Overview — ระบบบริหารงานคณะมหาวิทยาลัย

**เวอร์ชัน:** 0.1  
**วันที่:** 2026-06-19  
**อ้างอิง:** [feasibility study.md](feasibility%20study.md) · [faculty-admin-overview.puml](faculty-admin-overview.puml)

---

## 1. Module ทั้งหมดและความรับผิดชอบ

| Module | Schema | ความรับผิดชอบหลัก |
|---|---|---|
| **shared-kernel** | `shared` | User, Department, FiscalYear, Role (read-only) |
| **auth** | — | SSO, JWT, OIDC, Keycloak integration |
| **finance** | `finance` | งบประมาณ, การเงิน, บัญชี, รายงานการเงิน |
| **procurement** | `procurement` | พัสดุ, จัดซื้อจัดจ้าง, สัญญา, คลัง |
| **hr** | `hr` | บุคคล, สรรหา, ลา, เงินเดือน, ประเมินผล |
| **academic** | `academic` | วิชาการ, ทะเบียน, หลักสูตร, ตารางสอน |
| **research** | `research` | วิจัย, ทุน, ผลงาน, บริการวิชาการ |
| **student** | `student` | กิจการนักศึกษา, ทุนการศึกษา, ชมรม |
| **facility** | `facility` | อาคาร, ห้อง, ยานพาหนะ, ครุภัณฑ์ |
| **planning** | `planning` | แผนงาน, KPI, ประกันคุณภาพ, รายงาน |
| **document** | `document` | สารบรรณ, หนังสือราชการ, คำสั่ง, ประกาศ |
| **it-admin** | `it` | Account, สิทธิ์, ระบบเครือข่าย, ซอฟต์แวร์ |

---

## 2. Module Dependency

### 2.1 กฎที่ใช้อ่าน diagram นี้

```
A ──sync──► B      A เรียก B โดยตรง (synchronous) รอผลลัพธ์
A ··event·► B      A publish event, B subscribe (asynchronous)
A ══bpmn══► B      BPMN engine ประสาน A และ B ผ่าน process
```

---

### 2.2 Shared Kernel — ไม่มี dependency ใดๆ

```
shared-kernel
  └─ User, Department, FiscalYear, Role
  └─ ทุก module อ่านได้ ไม่มี module ใดเขียน shared-kernel โดยตรง
```

---

### 2.3 Synchronous Dependencies (Sync Call)

module ด้านซ้ายเรียก public API ของ module ด้านขวา

```
finance      ──sync──► hr           (ดึง employee info สำหรับเบิกจ่าย)
finance      ──sync──► shared-kernel
procurement  ──sync──► finance      (ตรวจวงเงินงบประมาณก่อนอนุมัติ PO)
procurement  ──sync──► hr           (ดึงข้อมูลผู้อนุมัติ)
procurement  ──sync──► shared-kernel
hr           ──sync──► shared-kernel
academic     ──sync──► hr           (ดึงข้อมูลอาจารย์ผู้สอน)
academic     ──sync──► shared-kernel
research     ──sync──► hr           (ดึง PI / นักวิจัย)
research     ──sync──► finance      (ตรวจงบวิจัยคงเหลือ)
research     ──sync──► shared-kernel
student      ──sync──► academic     (ตรวจสถานะการลงทะเบียน)
student      ──sync──► finance      (อ้างอิงการชำระทุน)
student      ──sync──► shared-kernel
facility     ──sync──► hr           (ดึงข้อมูลผู้ขอใช้)
facility     ──sync──► shared-kernel
planning     ──sync──► finance      (ดึงข้อมูลงบประมาณจริง)
planning     ──sync──► hr           (ดึง headcount)
planning     ──sync──► shared-kernel
document     ──sync──► shared-kernel
it-admin     ──sync──► shared-kernel
auth         ──sync──► shared-kernel
```

---

### 2.4 Asynchronous Domain Events (Event Bus)

module publisher → event → module subscriber(s)

```
hr ··StaffOnboardedEvent·················► finance   (สร้าง payroll record)
hr ··StaffOnboardedEvent·················► it-admin  (provision account)
hr ··StaffOnboardedEvent·················► document  (สร้างแฟ้มประวัติ)

hr ··StaffOffboardedEvent················► finance   (ปิด payroll)
hr ··StaffOffboardedEvent················► it-admin  (revoke account)

finance ··BudgetAllocatedEvent···········► procurement  (เปิดวงเงินจัดซื้อ)
finance ··PaymentProcessedEvent··········► document     (บันทึกหลักฐานการจ่าย)

procurement ··POApprovedEvent············► finance      (commit งบประมาณ)
procurement ··ContractSignedEvent········► document     (เก็บสัญญา)
procurement ··AssetReceivedEvent·········► facility     (บันทึก asset ใหม่)

academic ··EnrollmentConfirmedEvent······► student      (อัปเดต transcript)
academic ··CurriculumApprovedEvent·······► document     (บันทึกประกาศ)

research ··GrantApprovedEvent············► finance      (เปิด budget line วิจัย)
research ··PublicationAddedEvent·········► planning     (นับผลงานวิชาการ KPI)

student ··ScholarshipApprovedEvent·······► finance      (สั่งจ่าย)
student ··ActivityCompletedEvent·········► planning     (นับชั่วโมงกิจกรรม)

facility ··RoomBookedEvent···············► document     (log การใช้ห้อง)
facility ··VehicleAssignedEvent··········► document     (log การใช้ยานพาหนะ)
```

---

### 2.5 BPMN Process Orchestration

BPMN engine ประสานงาน module ผ่าน External Task Worker

```
budget-request-approval.bpmn
  ══► finance (validate & reserve budget)
  ══► hr      (fetch approver chain)
  Human Task: คณบดี / รองคณบดีฝ่ายการเงิน อนุมัติ

procurement-approval.bpmn
  ══► procurement (create draft PO)
  ══► finance     (check budget)
  ══► procurement (finalize PO)
  Human Task: หัวหน้าหน่วยพัสดุ, รองคณบดี, คณบดี (ตามวงเงิน DMN)

leave-request.bpmn
  ══► hr       (validate leave balance)
  Human Task: หัวหน้างาน / คณบดี อนุมัติ
  ══► hr       (deduct leave balance)
  ══► finance  (คำนวณ OT หากมี)

staff-onboarding.bpmn
  ══► hr       (create employee record)
  ══► it-admin (provision account)
  ══► finance  (setup payroll)
  Human Task: หัวหน้างานบุคคล ตรวจสอบเอกสาร

curriculum-approval.bpmn
  ══► academic (validate curriculum structure)
  Human Task: กรรมการวิชาการ → คณะกรรมการประจำคณะ
  ══► document (publish announcement)

research-grant-approval.bpmn
  ══► research (validate proposal)
  ══► finance  (check matching fund)
  Human Task: คณะกรรมการวิจัย อนุมัติ
  ══► finance  (open budget line)
```

---

### 2.6 Dependency Matrix (สรุป)

`R` = reads from (sync), `E` = emits event to, `B` = coordinated by BPMN

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

## 3. สิ่งที่ต้องทำ

### Phase 0 — Foundation `เดือน 1–2`

> เป้าหมาย: ทีมทำงานบน environment ที่ถูกต้องได้ก่อนเขียน business logic

- [ ] **Infra Setup**
  - [ ] Docker Compose สำหรับ local dev (Traefik, Keycloak, OPA, PostgreSQL, Redis, MinIO, RabbitMQ, Camunda)
  - [ ] CI/CD pipeline (GitHub Actions / GitLab CI) — lint, test, build, image push
  - [ ] Branch strategy และ PR template
- [ ] **Project Skeleton**
  - [ ] เลือก backend framework (NestJS หรือ Spring Boot) และสร้าง project structure แบบ modular
  - [ ] กำหนด folder convention: `/modules/<name>/{domain, application, infrastructure, api}`
  - [ ] Setup ArchUnit / Deptrac — enforce dependency rules ใน CI ตั้งแต่วันแรก
- [ ] **Shared Kernel**
  - [ ] นิยาม `User`, `Department`, `FiscalYear`, `Role` เป็น Value Object
  - [ ] Database migration: `shared` schema + seed data พื้นฐาน
- [ ] **Auth Module**
  - [ ] Keycloak setup: realm, client, LDAP sync
  - [ ] Traefik Forward Auth middleware เชื่อม OPA
  - [ ] JWT validation + propagate claims ไปยัง module

---

### Phase 1 — Core Modules `เดือน 2–4`

> เป้าหมาย: module ที่ module อื่น depend on ต้องพร้อมก่อน

- [ ] **HR Module** *(dependency ของ finance, academic, research, facility)*
  - [ ] Employee CRUD + position + department assignment
  - [ ] Leave balance management
  - [ ] OPA policy: `hr.rego` (salary masking, who can view what)
  - [ ] Publish: `StaffOnboardedEvent`, `StaffOffboardedEvent`
- [ ] **Finance Module** *(dependency ของ procurement, research, student)*
  - [ ] Budget allocation per fiscal year
  - [ ] Payment voucher
  - [ ] OPA policy: `finance.rego` (approval tier, view limit)
  - [ ] Subscribe: `StaffOnboardedEvent` → create payroll record
- [ ] **Document Module** *(รับ event จากเกือบทุก module)*
  - [ ] Letter / decree / announcement CRUD
  - [ ] MinIO integration สำหรับ file attachment
  - [ ] Subscribe: events จาก hr, finance, procurement, academic

---

### Phase 2 — BPMN + Process Modules `เดือน 4–7`

> เป้าหมาย: workflow ที่ต้องมีการอนุมัติหลายขั้นต้องผ่าน BPMN

- [ ] **BPMN Engine Setup**
  - [ ] Deploy Camunda 8 / Flowable
  - [ ] External Task Worker pattern สำหรับแต่ละ module
  - [ ] DMN table: วงเงินอนุมัติตาม role
- [ ] **Procurement Module**
  - [ ] PO, contract, asset receive
  - [ ] `procurement-approval.bpmn` — ใช้ DMN กำหนด approver ตามวงเงิน
  - [ ] Sync: `finance` (budget check), `hr` (approver)
  - [ ] Publish: `POApprovedEvent`, `AssetReceivedEvent`
- [ ] **HR — Workflow Extensions**
  - [ ] `leave-request.bpmn`
  - [ ] `staff-onboarding.bpmn`
- [ ] **Academic Module**
  - [ ] Course, enrollment, grade, schedule
  - [ ] `curriculum-approval.bpmn`
  - [ ] Sync: `hr` (faculty), Publish: `EnrollmentConfirmedEvent`

---

### Phase 3 — Supporting Modules `เดือน 7–9`

- [ ] **Research Module**
  - [ ] Project, grant, publication
  - [ ] `research-grant-approval.bpmn`
  - [ ] Sync: `hr`, `finance` — Publish: `GrantApprovedEvent`, `PublicationAddedEvent`
- [ ] **Student Affairs Module**
  - [ ] Scholarship, activity, club
  - [ ] Sync: `academic`, `finance` — Publish: `ScholarshipApprovedEvent`
- [ ] **Facility Module**
  - [ ] Room booking, vehicle request, asset tracking
  - [ ] Sync: `hr` — Publish: `RoomBookedEvent`, `AssetReceivedEvent`
- [ ] **IT Admin Module**
  - [ ] Account provisioning, software license, network request
  - [ ] Subscribe: `StaffOnboardedEvent`, `StaffOffboardedEvent`

---

### Phase 4 — Planning, Integration & Hardening `เดือน 9–12`

- [ ] **Planning & QA Module**
  - [ ] KPI definition + tracking
  - [ ] QA evidence collection
  - [ ] Sync: `finance`, `hr` — Subscribe: `PublicationAddedEvent`, `ActivityCompletedEvent`
- [ ] **OPA Policies — ทุก module**
  - [ ] เขียน Rego ครบทุก module + unit test ทุก policy
  - [ ] Row-level filter สำหรับ sensitive data (salary, evaluation)
- [ ] **External Integrations**
  - [ ] GFMIS sync (finance)
  - [ ] University SIS/ERP sync (academic, hr)
  - [ ] Email / SMS notification (via message bus)
- [ ] **Frontend**
  - [ ] Design system + component library
  - [ ] Web app (Next.js) — per-module pages
  - [ ] PWA configuration สำหรับ mobile / tablet
- [ ] **Observability**
  - [ ] Structured logging + correlation ID ทุก module
  - [ ] OpenTelemetry tracing
  - [ ] Prometheus metrics + Grafana dashboard
- [ ] **Security & Compliance**
  - [ ] Penetration test / OWASP checklist
  - [ ] PDPA audit: consent, data minimization, retention policy
  - [ ] Secret management (Vault หรือ environment injection)
- [ ] **Performance & Load Test**
  - [ ] k6 / Locust: simulate 500 concurrent users
  - [ ] ตรวจ slow query + index ใน PostgreSQL

---

## 4. Build Order (ลำดับที่ต้อง implement ก่อน-หลัง)

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

> **กฎ:** module ที่อยู่ด้านบน ต้อง implement และ deploy ได้ก่อน จึงจะเริ่ม module ถัดไปได้

---

## 5. สถานะปัจจุบัน

| Phase | สถานะ | หมายเหตุ |
|---|---|---|
| Phase 0 — Foundation | `[ ] Not started` | — |
| Phase 1 — Core Modules | `[ ] Not started` | รอ Phase 0 |
| Phase 2 — BPMN + Process | `[ ] Not started` | รอ Phase 1 |
| Phase 3 — Supporting | `[ ] Not started` | รอ Phase 2 |
| Phase 4 — Hardening | `[ ] Not started` | รอ Phase 3 |
