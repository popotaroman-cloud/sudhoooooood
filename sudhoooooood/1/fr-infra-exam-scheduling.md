# Functional Requirements — Infrastructure & Project Exam Scheduling (งานโฟลเดอร์ 1 / stu1)

**Modules:** `infrastructure` · `project-exam-scheduling`
**Schemas:** — (infra ไม่มี schema) · `examsched`
**Phase:** 0 (infra — รากฐาน) + 2–3 (ระบบนัดตารางสอบ)
**อ้างอิงโครงสร้างเดิม:** [../architecture.md](../architecture.md) · [../overview.md](../overview.md) · [../feasibility study.md](../feasibility%20study.md)

> เอกสารนี้แตก **Functional Requirements** ของงาน stu1 ทั้ง 2 ส่วน — (ก) **งาน Infrastructure** และ (ข) **ระบบนัดตารางสอบโปรเจค** — ตามรูปแบบเดียวกับ `fr/*.md` เดิม และยึดกฎ Modular Monolith (M/C/D/B/O/E) จาก [../architecture.md](../architecture.md)

---

## ภาพรวมงาน 2 ส่วน

| ส่วน | Module | หน้าที่ | FR prefix |
|---|---|---|---|
| A | `infrastructure` | แพลตฟอร์ม/เครื่องมือที่บังคับกฎสถาปัตยกรรมให้เป็นจริง (Docker, Traefik, OPA, BPMN, CI/CD ฯลฯ) | FR-INF |
| B | `project-exam-scheduling` | นัดและจัดตารางสอบ/ป้องกันโปรเจคนักศึกษา — กรรมการ, ห้อง, เวลา, ผลสอบ | FR-PES |

> ความเชื่อมโยง: ระบบนัดตารางสอบทำงานบนชั้น infra (BPMN สำหรับอนุมัติ, OPA สำหรับสิทธิ์, message bus สำหรับ event) — FR สองชุดนี้ trace หากันในภาคผนวก

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| DevOps / stu1 | ติดตั้งและดูแล infrastructure ทั้งหมด |
| Program Coordinator | ผู้ประสานงานหลักสูตร — เปิดรอบสอบ, จัดตาราง, ยืนยันกรรมการ |
| Committee Member | กรรมการสอบ (อาจารย์) — รับนัด, บันทึกผลสอบ |
| Advisor | อาจารย์ที่ปรึกษา — ยืนยันความพร้อมของนักศึกษา |
| Student | ยื่นขอสอบ, ดูตารางสอบ, รับผลสอบ |
| Department Head | อนุมัติตารางสอบ |
| All Modules | เรียก public API ของ infra / ส่ง-รับ domain event |

---

# A. Infrastructure (`infrastructure`)

> งาน Infra คือ "ตัวบังคับกฎ" ของสถาปัตยกรรมเดิม — ถ้าไม่มีชั้นนี้ กฎ M/C/D/B/O/E เป็นแค่ข้อความ ไม่ถูกบังคับจริง

## Functional Requirements

### FR-INF-001: Dev environment แบบ container ครบ stack

**As a** DevOps / stu1
**I want to** ให้ทุก service รันได้ด้วย `docker-compose up` คำสั่งเดียว
**So that** stu2–4 เริ่มพัฒนาบน infra จริงได้โดยไม่ต้อง config เอง

**Acceptance Criteria:**
- [ ] compose ครอบคลุม: Traefik, Keycloak, OPA, BPMN engine, PostgreSQL, Redis, MinIO, message bus
- [ ] ทุก service มี health/ready check และเริ่มตามลำดับ dependency
- [ ] รันได้บนเครื่อง stu2–4 โดยไม่ต้องตั้งค่าเพิ่ม

---

### FR-INF-002: API Gateway (Traefik v3)

**As a** the system
**I want to** route ทุก request ผ่าน gateway พร้อม TLS และ forward-auth
**So that** ทุก module ใช้ทางเข้าเดียวกันและไม่ต้องทำ auth ซ้ำ (กฎ C-01)

**Acceptance Criteria:**
- [ ] dynamic routing ตาม path `/api/<module>/...`
- [ ] TLS termination + forward-auth middleware chain (เรียก `/auth/verify`)
- [ ] รองรับ rate limit / circuit breaker ขั้นต้น

---

### FR-INF-003: Authorization platform (OPA + Rego)

**As a** the system
**I want to** ให้ทุกการตรวจสิทธิ์ทำที่ OPA เป็น policy-as-code
**So that** ไม่มี role check hardcode ใน app (กฎ O-01, O-02, O-03)

**Acceptance Criteria:**
- [ ] OPA รับ input identity headers จาก gateway แล้วตัดสิน allow/deny
- [ ] policy เป็น Rego file อยู่ใน version control ร่วมกับ code
- [ ] รองรับ data-masking rule สำหรับ sensitive field
- [ ] ทุก policy มี unit test (conftest) ก่อน merge

---

### FR-INF-004: BPMN Engine (Camunda 8 / Flowable)

**As a** the system
**I want to** มี engine กลางสำหรับ workflow หลายขั้น และให้ module เชื่อมแบบ external task
**So that** workflow อนุมัติทำงานตามกฎ B-01, B-02

**Acceptance Criteria:**
- [ ] engine รันใน container + deploy process definition ได้
- [ ] module เชื่อมแบบ External Task Worker — ไม่ embed engine ใน module (B-02)
- [ ] worker รองรับ idempotency key (B-03)

---

### FR-INF-005: Message bus (RabbitMQ / NATS)

**As a** the system
**I want to** ส่ง-รับ domain event ข้าม module แบบ async
**So that** side effect ข้าม module เป็น eventual consistency ไม่ใช้ distributed lock (กฎ C-02)

**Acceptance Criteria:**
- [ ] publish/subscribe domain event ได้ (เช่น `StaffOnboardedEvent`)
- [ ] รองรับ retry + dead-letter เมื่อ consumer ล้มเหลว
- [ ] event payload เป็น DTO ไม่ใช่ entity (กฎ C-03)

---

### FR-INF-006: Object storage (MinIO)

**As a** the system
**I want to** มีที่เก็บไฟล์แบบ S3-compatible
**So that** module เช่น document / exam-scheduling เก็บไฟล์โดยไม่ยัดลง DB

**Acceptance Criteria:**
- [ ] สร้าง bucket + presigned URL ใช้งานได้
- [ ] รองรับการเก็บไฟล์เอกสาร (เช่น เอกสารโปรเจค, ใบบันทึกผลสอบ)

---

### FR-INF-007: CI/CD pipeline (GitHub Actions)

**As a** DevOps / stu1
**I want to** ให้ทุก PR ผ่าน lint → test → build → push image อัตโนมัติ
**So that** คุณภาพโค้ดถูกตรวจก่อน merge

**Acceptance Criteria:**
- [ ] pipeline `lint → test → build → push (ghcr.io)` ทำงานทุก PR
- [ ] PR ที่ test ไม่ผ่าน merge ไม่ได้

---

### FR-INF-008: บังคับ module boundary (ArchUnit / Deptrac)

**As a** the system
**I want to** ให้ CI ตรวจจับการละเมิดขอบเขต module อัตโนมัติ
**So that** ไม่มีใครข้าม boundary โดยไม่ตั้งใจ (กฎ M-01, M-02, E-02)

**Acceptance Criteria:**
- [ ] CI fail เมื่อ module เรียก internal class/repository ของ module อื่นตรงๆ (M-01)
- [ ] CI fail เมื่อมี cross-module DB query หรือ FK ข้าม schema (M-02)
- [ ] การยกเว้นกฎต้องมี ADR อ้างอิง (E-02)

---

### FR-INF-009: Observability + health (Prometheus + Grafana)

**As a** DevOps / stu1
**I want to** มอนิเตอร์สุขภาพทุก service
**So that** รู้ปัญหาก่อนผู้ใช้แจ้ง (กฎ E-03)

**Acceptance Criteria:**
- [ ] scrape `/api/<module>/health` ของทุก module
- [ ] Grafana dashboard พื้นฐานแสดงสุขภาพ service
- [ ] health endpoint คืน `{status, db, version}`

---

### FR-INF-010: Secret management

**As a** DevOps / stu1
**I want to** จัดการ secret โดยไม่ hardcode
**So that** ลดความเสี่ยงข้อมูลลับรั่ว

**Acceptance Criteria:**
- [ ] dev ใช้ `.env` / Docker secrets · ไม่มี secret ในโค้ด/repo
- [ ] เอกสารระบุเส้นทาง prod = Vault

---

### FR-INF-011: README onboarding

**As a** DevOps / stu1
**I want to** เขียนคู่มือรัน local dev
**So that** stu2–4 เริ่มงานได้เองโดยไม่ต้องถาม

**Acceptance Criteria:**
- [ ] README ครอบคลุม clone → `docker-compose up` → เข้าใช้งาน
- [ ] stu2–4 ทำตามแล้ว dev ได้ทันที

---

## Infra — Data Entities

| Entity | คำอธิบาย |
|---|---|
| — | งาน infra ไม่มี business schema (ให้บริการเป็นแพลตฟอร์ม) |

## Infra — Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| ทุก module | platform | ใช้ gateway, auth, OPA, BPMN, message bus, storage, monitoring ร่วมกัน |

---

# B. Project Exam Scheduling (`project-exam-scheduling`, schema `examsched`)

> เป้าหมาย: นัดและจัดตารางสอบ/ป้องกันโปรเจคของนักศึกษา — รวมการจัดกรรมการ, จองห้อง, ตรวจการชนกัน, อนุมัติ, และบันทึกผลสอบ โดยดึงอาจารย์จาก hr, ห้องจาก facility, และส่งเกรดให้ academic

## Functional Requirements

### FR-PES-001: ยื่นคำขอสอบโปรเจค + ตรวจคุณสมบัติ

**As a** Student
**I want to** ยื่นขอสอบโปรเจคเมื่อพร้อม โดยมีอาจารย์ที่ปรึกษายืนยัน
**So that** เข้าสู่กระบวนการนัดสอบได้เมื่อคุณสมบัติครบ

**Acceptance Criteria:**
- [ ] คำขอมี: `student_id`, `project_title`, `advisor_id`, `document_url`, `status`
- [ ] ตรวจคุณสมบัติ: ส่งเอกสารครบ + advisor กดยืนยัน
- [ ] อ้างนักศึกษา/อาจารย์ด้วย ID เท่านั้น (กฎ D-03) — ข้อมูลผู้ใช้ดึงจาก shared-kernel
- [ ] เอกสารโปรเจคเก็บใน MinIO (เชื่อม FR-INF-006)

---

### FR-PES-002: จัดการกรรมการสอบ (Committee)

**As a** Program Coordinator
**I want to** กำหนดกรรมการสอบ (ประธาน, กรรมการ, ที่ปรึกษา) ต่อการสอบแต่ละครั้ง
**So that** องค์ประกอบกรรมการครบตามเกณฑ์หลักสูตร

**Acceptance Criteria:**
- [ ] assign บทบาทกรรมการ: `chair`, `member`, `advisor` (อ้าง `instructor_id`)
- [ ] เรียก `HRService.getFacultyById(id)` ตรวจอาจารย์มีสถานะ active
- [ ] ตรวจองค์ประกอบขั้นต่ำ (เช่น ต้องมีประธาน + กรรมการ ≥ 2)

---

### FR-PES-003: จัดตารางสอบ + ตรวจการชนกัน

**As a** Program Coordinator
**I want to** กำหนดวัน-เวลา-ห้อง-กรรมการของการสอบ โดยตรวจ conflict
**So that** ไม่มีกรรมการ/ห้อง/นักศึกษาซ้ำซ้อนในเวลาเดียวกัน

**Acceptance Criteria:**
- [ ] exam session มี: `request_id`, `room_id`, `slot (date, time_start, time_end)`, `committee[]`
- [ ] ตรวจ conflict 3 แบบ: กรรมการซ้ำเวลา, ห้องซ้ำ, นักศึกษาซ้ำ
- [ ] ปฏิเสธการบันทึกที่ชนกัน พร้อมแจ้งสาเหตุ

---

### FR-PES-004: ตรวจ/จองห้องสอบ + เวลาว่างกรรมการ

**As a** the system
**I want to** ตรวจห้องว่างและเวลาว่างของกรรมการก่อนยืนยันตาราง
**So that** การจองไม่ทับซ้อนกับการใช้งานอื่น

**Acceptance Criteria:**
- [ ] เรียก `FacilityService.checkRoomAvailability(room_id, slot)` ก่อนจอง
- [ ] จองห้อง (hold) เมื่อยืนยันตาราง และปล่อยเมื่อยกเลิก
- [ ] ตรวจเวลาว่างกรรมการจาก hr (ลา/ภาระงาน) หากมีข้อมูล
- [ ] Publish `RoomBookedEvent` → facility

---

### FR-PES-005: อนุมัติตารางสอบ (BPMN)

**As a** Department Head
**I want to** อนุมัติตารางสอบก่อนเผยแพร่
**So that** ตารางผ่านการรับรองตามลำดับขั้น

**Acceptance Criteria:**
- [ ] กระบวนการอนุมัติผ่าน BPMN (`exam-schedule-approval.bpmn`) (กฎ B-01)
- [ ] worker เป็น external task + idempotent (กฎ B-02, B-03)
- [ ] ตารางที่ยังไม่อนุมัติ เผยแพร่ไม่ได้

---

### FR-PES-006: แจ้งเตือน + เผยแพร่ตารางสอบ

**As a** Program Coordinator
**I want to** เผยแพร่ตารางสอบและแจ้งผู้เกี่ยวข้อง
**So that** นักศึกษาและกรรมการทราบกำหนดการล่วงหน้า

**Acceptance Criteria:**
- [ ] export ตารางสอบเป็น PDF / iCal
- [ ] แจ้งเตือนนักศึกษา + กรรมการเมื่อเผยแพร่/มีการเปลี่ยนแปลง
- [ ] Publish `ExamScheduledEvent` → student, facility

---

### FR-PES-007: บันทึกและประกาศผลสอบ

**As a** Committee Member
**I want to** บันทึกผลสอบโปรเจคหลังการสอบ
**So that** นักศึกษาและ academic ได้รับผลที่ถูกต้อง

**Acceptance Criteria:**
- [ ] กรรมการบันทึกผล: `pass` / `fail` / `pass_with_revision` + คะแนน + ความเห็น
- [ ] บันทึกได้เฉพาะกรรมการของการสอบนั้น (บังคับด้วย OPA, กฎ O-01)
- [ ] lock ผลหลังยืนยัน — แก้ไขได้โดย Coordinator เท่านั้น
- [ ] Publish `ExamResultRecordedEvent` → academic (เกรด), student (แจ้งผล)

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `exam_requests` | คำขอสอบโปรเจค | id, student_id, project_title, advisor_id, document_url, status |
| `exam_sessions` | รอบการสอบ | id, request_id, room_id, date, time_start, time_end, status |
| `committee_assignments` | กรรมการต่อรอบสอบ | session_id, instructor_id, role |
| `exam_results` | ผลสอบ | id, session_id, result, score, comment, locked_at |
| `room_bookings` | การจองห้องสอบ | id, room_id, slot, session_id |

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| อนุมัติตารางสอบโปรเจค | `exam-schedule-approval.bpmn` | Program Coordinator → หัวหน้าภาควิชา → รองคณบดีวิชาการ |

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `RoomBookedEvent` | จองห้องสอบสำเร็จ | facility |
| `ExamScheduledEvent` | เผยแพร่ตารางสอบ | student, facility |
| `ExamResultRecordedEvent` | บันทึกผลสอบ | academic, student |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOffboardedEvent` | hr | ถอดกรรมการที่พ้นสภาพออกจากรอบสอบที่ยังไม่จัด |
| `RoomStatusChangedEvent` | facility | แจ้งเตือน/ปรับตารางเมื่อห้องสอบปิดปรับปรุง |

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | user, academic unit, role |
| hr | sync (read) | ข้อมูลอาจารย์/กรรมการ + สถานะ active |
| facility | sync (read) + event | ตรวจ/จองห้องสอบ, รับสถานะห้อง |
| academic | event | ส่งผลสอบเข้าระบบเกรด |
| document | sync (write via API) | จัดเก็บเอกสาร/บันทึกผลสอบทางการ |
| MinIO | infra | เก็บไฟล์เอกสารโปรเจค |
| BPMN Engine | orchestration | exam-schedule-approval |

---

## ภาคผนวก — การปฏิบัติตามกฎ Modular Monolith เดิม

| กฎเดิม | ใจความ | งานในไฟล์นี้ปฏิบัติอย่างไร |
|---|---|---|
| M-01 | ห้ามเรียก internal ของ module อื่น | exam-scheduling เรียกผ่าน public API (`HRService`, `FacilityService`) เท่านั้น |
| M-02 | ห้าม cross-module DB query | ArchUnit (FR-INF-008) บังคับ — exam-scheduling อ่าน module อื่นผ่าน API/event |
| C-01/C-02 | sync ผ่าน gateway, side effect ใช้ event | ตรวจห้อง/กรรมการแบบ sync; ผลสอบ/จองห้อง publish เป็น event |
| C-03/D-03 | DTO ข้าม boundary, reference ด้วย ID | ทุก API คืน DTO; อ้างนักศึกษา/อาจารย์/ห้องด้วย ID |
| B-01/B-02/B-03 | workflow ผ่าน BPMN, external task, idempotent | exam-schedule-approval บน BPMN engine (FR-INF-004) |
| O-01/O-03 | authz ใน OPA, data masking | สิทธิ์บันทึกผลสอบ + การเข้าถึงเอกสารบังคับผ่าน OPA (FR-INF-003) |
| E-01/E-03 | extractable, health endpoint | exam-scheduling มี schema + API + event ของตัวเอง; ทุก service มี health (FR-INF-009) |

> เอกสารนี้ยึดรูปแบบจาก `fr/*.md` และกฎจาก [../architecture.md](../architecture.md) — เมื่อโครงสร้างเดิมเปลี่ยน ให้ปรับ FR ที่ผูกกับกฎในภาคผนวกตามไปด้วย
