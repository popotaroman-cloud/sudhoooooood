# Review — ระบบบริหารงานคณะมหาวิทยาลัย (Faculty Administration Platform)

**ผู้ทบทวน:** Claude
**วันที่ทบทวน:** 2026-06-29
**ขอบเขต:** ทบทวนโครงสร้างทั้ง repo (เอกสารวางแผน/ออกแบบ ยังไม่มีโค้ด)
**ไฟล์ที่อ่าน:** `overview.md` · `feasibility study.md` · `status.md` · `1.md`–`4.md` · `faculty-admin-overview.puml` · `fr/*.md`

---

## 1. ภาพรวมโครงการ (Executive Summary)

repo นี้คือ **เอกสารวางแผนและออกแบบ** (ยังไม่มี source code) ของระบบสารสนเทศบริหารงานภายในคณะมหาวิทยาลัย ครอบคลุม 10 หน่วยงาน / 12 module

| หัวข้อ | สรุป |
|---|---|
| ประเภทระบบ | Internal administrative information system ระดับคณะ |
| สถาปัตยกรรม | **Modular Monolith** (ออกแบบให้ extract เป็น microservices ได้ภายหลัง) |
| ผู้ใช้พร้อมกัน | ~50–500 คน |
| ขนาดทีม | นักศึกษา/ผู้พัฒนา 4 คน (stu1–stu4) + Tech Lead |
| ระยะเวลา | MVP 6–12 เดือน · แผนงานละเอียด 16 สัปดาห์ |
| ภาษา/สถานะ | เอกสารภาษาไทย เวอร์ชัน 0.1 (Draft) ลงวันที่ 2026-06-19 |

**แก่นของสถาปัตยกรรม** = Modular Monolith ที่บังคับ boundary อย่างเข้มงวด + เสริม 4 เสาหลัก:
- **Traefik** (API Gateway + Forward Auth)
- **Keycloak** (SSO / OIDC / LDAP)
- **OPA** (Authorization-as-code ด้วย Rego + data masking)
- **Camunda/Flowable BPMN** (workflow อนุมัติหลายขั้น + DMN decision table)

---

## 2. โครงสร้างไฟล์ใน repo

| ไฟล์ | บทบาท | กลุ่ม |
|---|---|---|
| `feasibility study.md` | ศึกษาความเป็นไปได้ · เลือกสถาปัตยกรรม · **กฎ M/C/D/B/O/E** · tech stack · keyword ที่ต้องศึกษา | รากฐาน |
| `overview.md` | นิยาม 12 module · **dependency (sync/event/BPMN)** · dependency matrix · roadmap Phase 0–4 · build order | รากฐาน |
| `faculty-admin-overview.puml` | C4-style architecture diagram (Client → Edge → Modules → Data → External) | รากฐาน |
| `status.md` | ตารางติดตามงาน diagram (usecase puml) รายโมดูล — ความคืบหน้า 0% | ติดตามงาน |
| `1.md` | **stu1** — shared-kernel · auth · it-admin + Infrastructure (Phase 0) | work package |
| `2.md` | **stu2** — hr · facility · document | work package |
| `3.md` | **stu3** — finance · procurement · planning | work package |
| `4.md` | **stu4** — academic · research · student | work package |
| `fr/*.md` (12 ไฟล์) | Functional Requirements รายโมดูล (User story + Acceptance Criteria + Data Entities + Events) | requirement |

> **โครงสร้าง 3 ชั้น:** รากฐาน (feasibility → overview → puml) → แบ่งงาน (1–4.md ตามคน) → รายละเอียด (fr/ ตามโมดูล) เชื่อมโยงกันด้วย cross-link ครบถ้วน

---

## 3. สถาปัตยกรรมโดยสรุป

```
Client (Web / PWA / Kiosk)
      │ HTTPS
      ▼
Traefik  ──(1) authenticate──► Keycloak (JWT/OIDC)
      │   ──(2) authorize────► OPA (Rego: RBAC/ABAC + row-level filter)
      ▼  inject X-User-Id / X-User-Roles / X-Department-Id
Application Modules (Modular Monolith — 1 process, schema-per-module)
  Finance | People | Academic | Operations | Strategy domains
      │            ▲
      │            │ External Task Worker (poll/complete)
      ▼            │
Data Layer        BPMN Engine (Camunda/Flowable + DMN)
  PostgreSQL (schema-per-module) · Redis · MinIO · RabbitMQ
      │
External: GFMIS · University SIS/ERP · Email/SMS
```

**กฎสถาปัตยกรรมที่บังคับ (จาก feasibility study):**

| กลุ่ม | กฎสำคัญ |
|---|---|
| **M** Module Boundary | public API เท่านั้น · ห้าม cross-module DB query · shared ผ่าน Shared Kernel · ห้าม circular dependency |
| **C** Communication | sync = query ทันที · async event = side effect ข้ามโมดูล · ห้าม pass entity (ต้อง DTO) |
| **D** Data Ownership | schema-per-module · เจ้าของเท่านั้นที่ write · reference ข้ามโมดูลใช้ ID (ไม่มี FK ข้าม schema) |
| **B** BPMN | process หลายขั้น/หลาย approver ต้องใช้ BPMN · โมดูลเป็น External Task Worker · ต้อง idempotent |
| **O** OPA | authorization อยู่ใน OPA เท่านั้น (ห้าม hardcode role) · Rego version-controlled · sensitive data ต้องมี masking |
| **E** Evolution | ทุกโมดูลพร้อม extract เป็น service · ยกเว้นกฎต้องมี ADR · ทุกโมดูลมี health check |

---

## 4. โมดูลและการแบ่งงานทีม

| ผู้รับผิดชอบ | Phase | Modules | BPMN Processes | FR |
|---|---|---|---|:---:|
| **stu1** | 0 | shared-kernel · auth · it-admin (+ Infra/CI/CD) | — | 20 |
| **stu2** | 1→3 | hr · facility · document | `leave-request` · `staff-onboarding` | 21 |
| **stu3** | 1→2→4 | finance · procurement · planning | `budget-request-approval` · `procurement-approval` | 21 |
| **stu4** | 2→3 | academic · research · student | `curriculum-approval` · `research-grant-approval` | 21 |

**รวม ~83 FR · 6 BPMN process · 12 module**

**กลยุทธ์ความขนาน (ดีมาก):** ทุกทีมเริ่มด้วย **Mock service ตาม interface contract** ในสัปดาห์ 1–2 แล้วค่อย swap mock → real ตาม milestone M1–M6 — ไม่มีใคร blocked เพราะรอ dependency (stu4 มี mock ครบตั้งแต่ W1)

| Milestone | สัปดาห์ | ผู้ส่ง | ส่งมอบ |
|:---:|:---:|---|---|
| M1 | 3 | stu1 | `docker-compose up` + README |
| M2 | 5 | stu1 | Shared Kernel API + JWT headers |
| M3 | 6 | stu2 | HR API |
| M4 | 9 | stu3 | Finance API |
| M5 | 12 | stu2 | Facility API (`checkRoomAvailability`) |
| M6 | 13 | ทุกคน | Full integration — swap mock ทั้งหมด |

---

## 5. การเชื่อมโยงระหว่างโมดูล (3 รูปแบบ)

- **Sync (read public API):** finance→hr, procurement→finance/hr, academic→hr, research→hr/finance, student→academic/finance, facility→hr, planning→finance/hr — ทุกตัวอ่าน shared-kernel
- **Async event (RabbitMQ):** เช่น `StaffOnboardedEvent` (hr→finance/it-admin/document), `POApprovedEvent` (procurement→finance), `EnrollmentConfirmedEvent` (academic→student), `GrantApprovedEvent` (research→finance), `ScholarshipApprovedEvent` (student→finance)
- **BPMN orchestration:** 6 process ประสานหลายโมดูล + Human Task + DMN กำหนด approver/วิธีจัดซื้อตามวงเงิน

---

## 6. จุดแข็ง (Strengths)

1. **กฎสถาปัตยกรรมชัดและบังคับได้จริง** — กฎ M/C/D/B/O/E เขียนเป็นกติกาที่ตรวจได้ด้วย ArchUnit/Deptrac ใน CI ตั้งแต่วันแรก ลดความเสี่ยง "Big Ball of Mud"
2. **เลือกสถาปัตยกรรมเหมาะกับบริบทจริง** — Modular Monolith เหมาะกับทีมเล็ก/งบจำกัด แต่ยังเปิดทาง evolve เป็น microservices ตามเกณฑ์ที่นิยามไว้
3. **กลยุทธ์ Mock-first + contract-first** — ออกแบบให้ทีมทำขนานได้โดยไม่ block กัน เป็นจุดเด่นที่หาได้ยากในโปรเจกต์นักศึกษา
4. **เอกสารเชื่อมโยงครบ** — feasibility ↔ overview ↔ fr ↔ work package cross-link กันหมด ตามรอย requirement ได้
5. **คำนึงถึง security/compliance ตั้งแต่ออกแบบ** — OPA data masking, PDPA, OWASP, secret management อยู่ใน roadmap แล้ว
6. **เทียบทางเลือกซอฟต์แวร์อย่างมีเหตุผล** — แต่ละโดเมนเทียบ commercial/open-source/ภาครัฐไทย พร้อมเหตุผลที่ไม่เลือก

---

## 7. ช่องว่างและข้อสังเกต (Gaps & Findings)

### 7.1 ความไม่สอดคล้อง (ควรแก้)

| # | ประเด็น | รายละเอียด |
|---|---|---|
| F-1 | **ชื่อ event ไม่ตรงกัน** | `overview.md` §2.4 ใช้ `BudgetAllocatedEvent` (finance→procurement) แต่ `3.md` FIN-12 publish `BudgetApprovedEvent` — ต้อง canonical ชื่อเดียว |
| F-2 | **ผู้ publish AssetReceivedEvent สับสน** | `overview.md` §2.4 + `3.md` PROC-8 = procurement publish, facility subscribe (ถูก) แต่ `overview.md` Phase 3 (บรรทัด facility) เขียนว่า facility "Publish: AssetReceivedEvent" — ขัดกันเอง |
| F-3 | **รายการ event ใน overview ไม่ครบ** | work package อ้าง event ที่ไม่มีใน `overview.md` §2.4: `SalaryUpdatedEvent`, `TrainingCompletedEvent`, `GradesPublishedEvent`, `AcademicStatsUpdatedEvent`, `AcademicServiceCompletedEvent`, `AlumnusEmployedEvent`, `ContractSignedEvent` — ควรทำ **Event Catalog กลาง** เป็น single source of truth |
| F-4 | **usecase diagram ยังไม่เริ่ม** | `status.md` ลิสต์ 24 ไฟล์ `usecase/usecase_*.puml` แต่ folder `usecase/` ยังไม่มีในrepo (คืบหน้า 0%) |

### 7.2 สิ่งที่ยังขาด (Missing artifacts)

- **`README.md` ที่ root** — ยังไม่มีไฟล์อธิบายว่า repo คืออะไร / อ่านลำดับไหน (ไฟล์ `1.md`–`4.md` ชื่อกำกวม แนะนำ rename เป็น `stu1-infra.md` ฯลฯ)
- **ยังไม่มี artifact จริงตามที่ออกแบบ:** `contracts/*.interface.ts`, `policies/*.rego`, `*.bpmn` + DMN, `docker-compose.yml`, migration scripts — ทั้งหมดยังเป็นแผน
- **ER diagram / data model รวม** — มี Data Entities ราย fr แต่ไม่มีภาพรวมความสัมพันธ์ข้อมูล (ซึ่งสำคัญเพราะ reference ข้ามโมดูลใช้ ID ไม่มี FK)
- **Non-Functional Requirements** — performance/availability/backup ปรากฏกระจายใน roadmap แต่ไม่มีเอกสาร NFR รวม
- **OPA coverage** — วางแผนเขียน rego เฉพาะโมดูล sensitive (finance/hr/academic/research/data-masking) ยังไม่ชัดว่าโมดูลที่เหลือใช้ default policy อะไร

### 7.3 ความเสี่ยงเชิงแผน (Planning risks)

- **`feasibility study.md` มีช่องว่างในชื่อไฟล์** — ทำให้ลิงก์ต้อง URL-encode (`%20`) เสี่ยงพังในบาง tooling แนะนำ rename เป็น `feasibility-study.md`
- **Timeline 16 สัปดาห์ค่อนข้าง optimistic** — 83 FR + 6 BPMN + OPA + integration ใน ~4 เดือนสำหรับ 4 คน ถือว่าแน่น โดยเฉพาะ Phase 4 (planning/SAR/observability/load test) ถูกอัดท้าย
- **Single point of dependency ที่ stu1** — M1/M2 (infra + shared kernel) เป็นคอขวด ถ้า stu1 ช้า กระทบทุกคน (มี mock บรรเทาได้บางส่วน)

---

## 8. ข้อเสนอแนะ (Recommendations)

| ลำดับ | ข้อเสนอ |
|:---:|---|
| 1 | เพิ่ม **`README.md`** ที่ root: อธิบาย repo, ลำดับการอ่าน, glossary และ rename `1–4.md` → `stuN-*.md`, `feasibility study.md` → `feasibility-study.md` |
| 2 | สร้าง **Event Catalog** (`events.md`) รวมทุก domain event + publisher/subscriber/payload เป็น single source of truth แล้วแก้ F-1/F-2/F-3 ให้ตรงกัน |
| 3 | เพิ่ม **ER / Data Model รวม** + นิยาม cross-module reference (ID-only) ให้ชัดก่อนเริ่ม migration |
| 4 | ลงมือ **usecase puml** ตาม `status.md` (ปัจจุบัน 0%) — เป็น deliverable ที่ track ไว้แล้วแต่ยังไม่เริ่ม |
| 5 | แยกเอกสาร **NFR** (performance/security/backup/availability) ออกจาก roadmap ให้ทดสอบได้ |
| 6 | กำหนด **default-deny OPA policy** + ระบุ rego ของทุกโมดูล (ไม่เฉพาะ sensitive) เพื่อปิดช่องว่าง authorization |
| 7 | ทบทวน timeline: พิจารณาลด scope Phase 4 ลงเป็น "post-MVP" หรือขยายเป็น 20–24 สัปดาห์ให้สอดคล้องกับ feasibility (6–12 เดือน) |

---

## 9. สรุป

โครงการนี้มี **คุณภาพการวางแผนสูงผิดปกติสำหรับงานระดับนักศึกษา** — เลือกสถาปัตยกรรมเหมาะกับบริบท, วางกฎ boundary ที่บังคับได้จริง, และออกแบบ contract-first/mock-first ให้ทำงานขนานได้โดยไม่ block กัน เอกสาร requirement (fr/) ละเอียดและเชื่อมโยงครบ

จุดที่ต้องปิดก่อนเริ่มเขียนโค้ดคือ **ความสอดคล้องของชื่อ event, Event Catalog กลาง, ER diagram รวม และ README** ส่วนความเสี่ยงหลักคือ **timeline ที่อัดแน่น** และ **คอขวดที่ stu1** ซึ่งบรรเทาได้ด้วยกลยุทธ์ mock ที่วางไว้แล้ว

> **สถานะปัจจุบัน:** เอกสารออกแบบเสร็จ ~ดีมาก · artifact ที่ executable ได้ (code/bpmn/rego/compose) = ยังไม่เริ่ม (0%)
