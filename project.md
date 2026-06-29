# Project Summary — ระบบสหกิจศึกษา & บริหารบุคลากร

**โครงการ:** Faculty Administration Platform — โมดูล Cooperative Education (`coop`) และ HR (`hr`)
**สถาปัตยกรรม:** Modular Monolith (อ้างอิง [architecture.md](architecture.md))
**สถานะ:** Prototype + Functional Requirements

---

## 1. ภาพรวมโครงการ

พัฒนา 2 โมดูลภายใต้แพลตฟอร์มบริหารงานคณะแบบ **Modular Monolith** โดยยึดกฎสถาปัตยกรรมเดิม (schema-per-module, public API, domain event, BPMN, OPA)

| โมดูล | Schema | Phase | บทบาท |
|---|---|---|---|
| **coop** (สหกิจศึกษา) | `coop` | Phase 3 | output layer — บริหารวงจรสหกิจตั้งแต่ตรวจคุณสมบัติถึงตัดเกรด |
| **hr** (บริหารบุคลากร) | `hr` | Phase 1 | core domain — ข้อมูลบุคลากร, ลา, สรรหา, ประเมิน, เงินเดือน |

**ความสัมพันธ์:** `coop` เป็น consumer ของ `hr` (อาจารย์นิเทศ + ภาระงาน) และ `academic` (ข้อมูลนักศึกษา) — เป็น producer ของ event ให้ `document` (หนังสือราชการ) และ `planning` (KPI)

---

## 2. ไฟล์ในโครงการ

| ไฟล์ | ประเภท | เนื้อหา |
|---|---|---|
| [architecture.md](architecture.md) | สถาปัตยกรรม | ฐานอ้างอิง — layers, modules, กฎ, tech stack |
| [fr-coop.md](fr-coop.md) | FR | ระบบสหกิจศึกษา — 10 FRs |
| [fr-hr.md](fr-hr.md) | FR | ระบบบริหารบุคลากร — 9 FRs |
| [prototype-coop.html](prototype-coop.html) | Mockup | prototype สหกิจ (interactive) |
| [prototype-hr.html](prototype-hr.html) | Mockup | prototype HR (interactive) |
| [index.html](index.html) | Launcher | หน้ารวมเปิดทั้งสองระบบ + ลิงก์เอกสาร |
| project.md | สรุป | เอกสารฉบับนี้ |

> เริ่มเปิดที่ `index.html`

---

## 3. ระบบสหกิจศึกษา (coop)

### Functional Requirements (10)

| รหัส | ฟังก์ชัน |
|---|---|
| FR-COOP-001 | ลงทะเบียนและตรวจคุณสมบัติสหกิจ (Eligibility & Registration) |
| FR-COOP-002 | จัดการสถานประกอบการ (Establishment & MOU) |
| FR-COOP-003 | ประกาศตำแหน่งงานและการจับคู่ (Job Posting & Matching) |
| FR-COOP-004 | การสมัครและคัดเลือก (Application & Selection) |
| FR-COOP-005 | เอกสารส่งตัวและหนังสือราชการ (Referral Documents) |
| FR-COOP-006 | มอบหมายอาจารย์นิเทศ (Advisor Assignment) |
| FR-COOP-007 | การนิเทศงาน (Site Visit / Supervision) |
| FR-COOP-008 | รายงานการปฏิบัติงาน (Work Reports) |
| FR-COOP-009 | การประเมินผล (Evaluation) |
| FR-COOP-010 | ตัดเกรดและส่งผลกลับระบบทะเบียน (Grade Submission) |

### วงจรการทำงาน

```
ลงทะเบียน → จับคู่สถานประกอบการ → หนังสือส่งตัว → ปฏิบัติงาน & นิเทศ → ประเมิน → ตัดเกรด → ส่งกลับ academic
```

### Prototype — 6 หน้าจอ
แดชบอร์ด · ลงทะเบียน & คุณสมบัติ · สถานประกอบการ · ตำแหน่ง & จับคู่ · การนิเทศงาน · ประเมินผล & เกรด

---

## 4. ระบบบริหารบุคลากร (hr)

### Functional Requirements (9)

| รหัส | ฟังก์ชัน |
|---|---|
| FR-HR-001 | จัดการข้อมูลบุคลากร (Employee Profile) |
| FR-HR-002 | จัดการตำแหน่งและสายงาน (Position Management) |
| FR-HR-003 | กระบวนการสรรหาบุคลากร (Recruitment) |
| FR-HR-004 | ระบบลา (Leave Management) |
| FR-HR-005 | ประเมินผลการปฏิบัติงาน (Performance Evaluation) |
| FR-HR-006 | จัดการข้อมูลเงินเดือน (Salary Record) |
| FR-HR-007 | การพัฒนาบุคลากร (Training & Development) |
| FR-HR-008 | Onboarding และ Offboarding |
| FR-HR-009 | ข้อมูลอาจารย์และภาระงาน (Faculty Info & Workload) — *เชื่อมกับ coop* |

### Prototype — 6 หน้าจอ
แดชบอร์ด · ข้อมูลบุคลากร · ระบบลา · สรรหาบุคลากร · ประเมินผล · เงินเดือน

---

## 5. การเชื่อมต่อระหว่างโมดูล (Integration)

```
        ┌────────────┐  getStudentById / GPA, หน่วยกิต   ┌──────────┐
        │  academic  │ ◄──────────── sync ───────────────│          │
        └────────────┘                                   │          │
                                                         │   coop   │
        ┌────────────┐  getFacultyByDepartment           │          │
        │     hr     │ ◄──────────── sync ───────────────│          │
        │            │  getAdvisingLoad (ภาระงาน)        └────┬─────┘
        └────────────┘                                       │ event
                                          ┌──────────────────┼──────────────────┐
                                          ▼                                      ▼
                                   ┌────────────┐                        ┌────────────┐
                                   │  document  │ CoopReferralIssued     │  planning  │ CoopCompleted
                                   └────────────┘                        └────────────┘
```

| จาก → ถึง | ประเภท | ใช้ทำอะไร |
|---|---|---|
| coop → academic | sync (read) + event | ดึงข้อมูลนักศึกษา/GPA, ส่งเกรดกลับ transcript |
| coop → hr | sync (read) | ดึงอาจารย์นิเทศ + ภาระงาน |
| coop → document | event | จัดเก็บหนังสือส่งตัว/ขอความอนุเคราะห์ |
| coop → planning | event | KPI สหกิจ / ภาวะการมีงานทำ |
| hr → finance | event | `SalaryUpdatedEvent`, `StaffOnboardedEvent` (payroll) |

---

## 6. การปฏิบัติตามกฎสถาปัตยกรรม

| กฎ | การนำไปใช้ |
|---|---|
| **M-01 / M-02** | coop ไม่ query schema academic/hr ตรง — เรียกผ่าน public API เท่านั้น |
| **C-02 / C-03** | สื่อสารข้าม module ด้วย domain event และส่งเป็น DTO (ไม่ใช่ entity) |
| **D-01 / D-03** | coop เป็นเจ้าของ schema `coop`; cross-module reference ใช้ ID ไม่มี FK ข้าม schema |
| **B-01 / B-02 / B-03** | workflow อนุมัติ/ประเมินใช้ BPMN ผ่าน External Task Worker แบบ idempotent |
| **O-01 / O-03** | OPA row-level filter (อาจารย์เห็นเฉพาะนักศึกษาตน) + masking (เงินเดือน/คะแนน) |
| **E-03** | ทุกโมดูลมี health check endpoint |

### BPMN Processes ที่เกี่ยวข้อง
`coop-registration-approval.bpmn` · `coop-evaluation.bpmn` · `leave-request.bpmn` · `staff-onboarding.bpmn`

### Tech Stack (จาก architecture.md)
NestJS / Spring Boot · PostgreSQL 16 (schema-per-module) · Keycloak + OPA · Traefik v3 · Camunda 8 / Flowable · RabbitMQ / NATS · MinIO · Redis

---

## 7. จุดเด่นใน Prototype

- **Interactive** — เมนูซ้ายสลับหน้าจอ, ปุ่มอนุมัติ/ลงทะเบียน/ล็อกเกรดทำงานได้
- **Role switcher (OPA)** — มุมขวาบนสลับมุมมองสิทธิ์เพื่อสาธิตการ mask/filter ข้อมูล
  - HR: HR Admin / หัวหน้าภาควิชา / บุคลากร → เงินเดือนและคะแนนถูก mask ตามสิทธิ์
  - Co-op: เจ้าหน้าที่สหกิจ / อาจารย์นิเทศ / สถานประกอบการ → เห็นข้อมูลเฉพาะขอบเขตตน
- **แสดง integration point** — ทุกหน้าจอระบุจุดที่เรียก public API หรือ publish event ของโมดูลอื่น

---

## 8. ขั้นตอนถัดไป (ข้อเสนอ)

- [ ] กำหนด API contract เป็นไฟล์ `contracts/*.interface.ts` ให้ครบ (coop, hr)
- [ ] เขียน BPMN diagram จริง (`.bpmn`) สำหรับ coop-registration-approval, coop-evaluation
- [ ] เขียน Rego policy: `coop.rego` (row-level filter อาจารย์/สถานประกอบการ), `hr.rego` (salary masking)
- [ ] Schema migration `coop.*` และ `hr.*` (Flyway / Liquibase)
- [ ] เพิ่ม non-functional requirements (performance, PDPA, audit log)
