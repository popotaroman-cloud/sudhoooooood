# Functional Requirements — Cooperative Education (ระบบสหกิจศึกษา)

**Module:** `coop`
**Schema:** `coop`
**Phase:** Phase 3 (output layer — ต่อยอดจาก academic, อ้างอิง hr)
**อ้างอิงสถาปัตยกรรม:** [architecture.md](architecture.md)

> โมดูลใหม่ตามสถาปัตยกรรม Modular Monolith ใน architecture.md
> - เป็นเจ้าของ schema `coop` เท่านั้น (D-01/D-02) — ไม่ query schema `academic`/`hr` ตรง (M-02)
> - อ่านข้อมูลนักศึกษา/หน่วยงานผ่าน **public API** ของ academic (M-01), อ่านอาจารย์นิเทศผ่าน public API ของ hr
> - reference ข้าม module ด้วย **ID** ไม่ใช่ FK (D-03)
> - workflow อนุมัติ/ส่งตัว/ประเมิน ใช้ **BPMN** (B-01) ผ่าน External Task Worker (B-02), idempotent (B-03)
> - หนังสือราชการ (ส่งตัว/ขอความอนุเคราะห์) ส่งให้ `document` ผ่าน **event** (C-02)
> - สิทธิ์การเห็นข้อมูล (อาจารย์นิเทศเห็นเฉพาะนักศึกษาในความดูแล / สถานประกอบการเห็นเฉพาะของตน) อยู่ใน **OPA** row-level filter (O-01)

---

## 1. ภาพรวมโมดูล

ระบบสหกิจศึกษาบริหารวงจรการปฏิบัติงานสหกิจของนักศึกษา ตั้งแต่ตรวจคุณสมบัติ → จับคู่สถานประกอบการ → ออกหนังสือส่งตัว → นิเทศงาน → ประเมินผล → ส่งเกรดกลับสู่ระบบทะเบียน (academic)

**ตำแหน่งในสถาปัตยกรรม:** เป็น consumer ของ `academic` (ข้อมูลนักศึกษา/หน่วยกิต/เกรด) และ `hr` (อาจารย์นิเทศ/ภาระงาน) — เป็น producer ของ event ให้ `document` (หนังสือราชการ) และ `planning` (KPI สหกิจ/ภาวะการมีงานทำ)

---

## 2. Actors

| Actor | คำอธิบาย |
|---|---|
| Co-op Coordinator (เจ้าหน้าที่สหกิจศึกษา) | จัดการกระบวนการสหกิจทั้งหมด ออกหนังสือ จับคู่ ติดตาม |
| Student (นักศึกษาสหกิจ) | ลงทะเบียน เลือกสถานประกอบการ ส่งรายงาน |
| Co-op Advisor (อาจารย์นิเทศ) | นิเทศงาน บันทึกผลการนิเทศ ประเมินผล — *เป็นบุคลากรจาก hr* |
| Company Supervisor (พนักงานพี่เลี้ยง) | กำกับงานในสถานประกอบการ ประเมินนักศึกษา — *external actor* |
| Co-op Committee (กรรมการสหกิจ) | อนุมัติคุณสมบัติ พิจารณารับรองสถานประกอบการ |
| Establishment (สถานประกอบการ) | ลงทะเบียนบริษัท ประกาศตำแหน่งงาน คัดเลือกนักศึกษา |

---

## 3. Functional Requirements

### FR-COOP-001: ลงทะเบียนและตรวจคุณสมบัติสหกิจ (Eligibility & Registration)

**As a** Student
**I want to** ลงทะเบียนเข้าร่วมสหกิจศึกษาและให้ระบบตรวจคุณสมบัติอัตโนมัติ
**So that** ทราบทันทีว่ามีสิทธิ์ไปปฏิบัติงานสหกิจในภาคการศึกษาที่เลือกหรือไม่

**Acceptance Criteria:**
- [ ] เรียก `AcademicService.getStudentById(id)` (sync) เพื่อดึง GPA, หน่วยกิตสะสม, ชั้นปี — *ไม่ query schema academic ตรง*
- [ ] ตรวจเงื่อนไข configurable: GPA ≥ เกณฑ์, หน่วยกิตสะสม ≥ เกณฑ์, ผ่านวิชาเตรียมสหกิจ
- [ ] แสดงผลตรวจคุณสมบัติแบบ checklist (ผ่าน/ไม่ผ่าน พร้อมเหตุผล)
- [ ] กรณีคุณสมบัติไม่ครบ → ยื่นคำร้องขออนุมัติเป็นกรณีพิเศษผ่าน BPMN (`coop-registration-approval.bpmn`)
- [ ] Publish `CoopRegisteredEvent` → academic (ลงทะเบียนรายวิชาสหกิจ / lock หน่วยกิต)

---

### FR-COOP-002: จัดการสถานประกอบการ (Establishment & MOU)

**As a** Co-op Coordinator
**I want to** จัดทำทะเบียนสถานประกอบการและบันทึกข้อตกลงความร่วมมือ (MOU)
**So that** นักศึกษาเลือกได้เฉพาะสถานประกอบการที่ผ่านการรับรอง

**Acceptance Criteria:**
- [ ] Establishment มี fields: `id`, `name`, `type (รัฐ/เอกชน/รัฐวิสาหกิจ)`, `address`, `contact_person`, `phone`, `email`, `industry`
- [ ] สถานะการรับรอง: `pending → reviewing → approved → blacklisted`
- [ ] บันทึก MOU: เลขที่, วันเริ่ม-สิ้นสุด, ไฟล์แนบ (MinIO) + แจ้งเตือนก่อนหมดอายุ
- [ ] ประวัติการรับนักศึกษาแต่ละปี + คะแนนรีวิวจากนักศึกษา/อาจารย์
- [ ] กรรมการสหกิจพิจารณารับรองสถานประกอบการรายใหม่ (review queue)

---

### FR-COOP-003: ประกาศตำแหน่งงานและการจับคู่ (Job Posting & Matching)

**As an** Establishment / Co-op Coordinator
**I want to** ประกาศตำแหน่งงานสหกิจและจับคู่กับนักศึกษาตามคุณสมบัติ
**So that** นักศึกษาได้ตำแหน่งที่ตรงกับสาขาและความสนใจ

**Acceptance Criteria:**
- [ ] Job position มี: ตำแหน่ง, สถานประกอบการ, สาขาที่รับ, จำนวนรับ, ลักษณะงาน, ค่าตอบแทน, ที่ตั้ง
- [ ] นักศึกษาเลือกได้สูงสุด 3 อันดับ (preference ranking)
- [ ] ระบบช่วยจับคู่ (matching) ตามสาขา + คุณสมบัติ + โควต้า แล้วให้ coordinator ยืนยัน
- [ ] แสดงสถานะการจับคู่ของนักศึกษาแต่ละคน: `applied → matched → confirmed`

---

### FR-COOP-004: การสมัครและคัดเลือก (Application & Selection)

**As a** Student
**I want to** สมัครตำแหน่งงานสหกิจและติดตามผลการคัดเลือก
**So that** จัดการการสมัครได้ในที่เดียว

**Acceptance Criteria:**
- [ ] นักศึกษายื่นใบสมัคร + แนบ resume/transcript (MinIO)
- [ ] สถานประกอบการเห็นเฉพาะใบสมัครตำแหน่งของตน (OPA row-level filter)
- [ ] สถานประกอบการคัดเลือก/สัมภาษณ์และบันทึกผล: `accepted / rejected / waitlist`
- [ ] แจ้งผลนักศึกษาผ่าน email/notification

---

### FR-COOP-005: เอกสารส่งตัวและหนังสือราชการ (Referral Documents)

**As a** Co-op Coordinator
**I want to** ออกหนังสือขอความอนุเคราะห์และหนังสือส่งตัวนักศึกษาผ่านระบบ
**So that** ลดงานเอกสารกระดาษและมีสำเนาจัดเก็บอัตโนมัติ

**Acceptance Criteria:**
- [ ] Generate หนังสือ (ขอความอนุเคราะห์รับนักศึกษา / ส่งตัว / ตอบรับ) จาก template + auto running number
- [ ] Export PDF เก็บใน MinIO
- [ ] Publish `CoopReferralIssuedEvent` → document (จัดเก็บเข้าระบบสารบรรณ) — *ไม่เขียน schema document ตรง*
- [ ] ติดตามสถานะตอบรับจากสถานประกอบการ (ตอบรับ/ปฏิเสธ/รอ)

---

### FR-COOP-006: มอบหมายอาจารย์นิเทศ (Advisor Assignment)

**As a** Co-op Coordinator
**I want to** มอบหมายอาจารย์นิเทศให้นักศึกษาแต่ละคนโดยดูภาระงานประกอบ
**So that** กระจายงานนิเทศอย่างเป็นธรรมและตรงสาขา

**Acceptance Criteria:**
- [ ] เรียก `HRService.getFacultyByDepartment(deptId)` + `getAdvisingLoad(facultyId, term)` (sync) — *อ้างข้อมูลอาจารย์จาก hr ผ่าน API*
- [ ] เก็บใน `coop` schema แค่ `advisor_id` (reference ID, ไม่มี FK ข้าม schema — D-03)
- [ ] แสดงภาระงานปัจจุบันของอาจารย์แต่ละคนก่อนมอบหมาย + เตือนเมื่อเกินเพดาน
- [ ] จับคู่อาจารย์–นักศึกษาตามพื้นที่/จังหวัดของสถานประกอบการ เพื่อลดค่าเดินทางนิเทศ

---

### FR-COOP-007: การนิเทศงาน (Site Visit / Supervision)

**As a** Co-op Advisor
**I want to** วางแผนและบันทึกผลการนิเทศงาน ณ สถานประกอบการ
**So that** ติดตามความก้าวหน้าและแก้ปัญหานักศึกษาได้ทันเวลา

**Acceptance Criteria:**
- [ ] วางแผนรอบนิเทศ (อย่างน้อย 1–2 ครั้ง/ภาคการศึกษา) + ปฏิทินนัดหมาย
- [ ] อาจารย์เห็นเฉพาะนักศึกษาที่ตนรับผิดชอบ (OPA row-level filter — O-01)
- [ ] บันทึกผลการนิเทศ: วันที่, รูปแบบ (on-site/online), ประเด็น, ข้อเสนอแนะ, แนบรูป (MinIO)
- [ ] Flag นักศึกษาที่มีความเสี่ยง (ปัญหากับพี่เลี้ยง, งานไม่ตรงสาขา, ขาดงาน)

---

### FR-COOP-008: รายงานการปฏิบัติงาน (Work Reports)

**As a** Student
**I want to** ส่งรายงานความก้าวหน้าและรายงานฉบับสมบูรณ์ผ่านระบบ
**So that** อาจารย์และพี่เลี้ยงติดตามและให้ feedback ได้

**Acceptance Criteria:**
- [ ] ส่งรายงานประจำสัปดาห์/ประจำเดือน (weekly log) + รายงานโครงงานสหกิจฉบับสมบูรณ์
- [ ] Upload ไฟล์รายงาน (MinIO) + กำหนด deadline + แจ้งเตือนเมื่อใกล้ครบกำหนด
- [ ] อาจารย์นิเทศ comment/ขอแก้ไขในแต่ละรายงาน
- [ ] สถานะรายงาน: `draft → submitted → revised → accepted`

---

### FR-COOP-009: การประเมินผล (Evaluation)

**As a** Company Supervisor & Co-op Advisor
**I want to** ประเมินผลการปฏิบัติงานของนักศึกษาตามแบบฟอร์มมาตรฐาน
**So that** ได้คะแนนที่เป็นธรรมจากทั้งสองฝ่าย

**Acceptance Criteria:**
- [ ] แบบประเมิน 2 ฝ่าย: พนักงานพี่เลี้ยง (น้ำหนัก %) + อาจารย์นิเทศ (น้ำหนัก %) — configurable
- [ ] หัวข้อประเมิน: ความรู้ทางวิชาการ, ทักษะการทำงาน, ความรับผิดชอบ, การปรับตัว, คุณธรรม
- [ ] รวมคะแนนผ่าน BPMN (`coop-evaluation.bpmn`): พี่เลี้ยงประเมิน → อาจารย์ประเมิน → coordinator สรุปเกรด
- [ ] คะแนนรายบุคคลเป็น sensitive — นักศึกษาเห็นเฉพาะของตน (OPA)

---

### FR-COOP-010: ตัดเกรดและส่งผลกลับระบบทะเบียน (Grade Submission)

**As a** Co-op Coordinator
**I want to** สรุปเกรดสหกิจและส่งผลกลับไปยังระบบทะเบียน
**So that** เกรดสหกิจปรากฏใน transcript ของนักศึกษา

**Acceptance Criteria:**
- [ ] คำนวณเกรดจากคะแนนประเมิน 2 ฝ่าย + คะแนนรายงาน ตามเกณฑ์ที่ตั้งไว้
- [ ] Coordinator ตรวจสอบและยืนยันก่อนส่ง (lock)
- [ ] Publish `CoopCompletedEvent` → academic (บันทึกเกรดเข้า transcript) + planning (KPI สหกิจ)
- [ ] Publish `CoopEvaluatedEvent` → planning (สถิติความพึงพอใจสถานประกอบการ / ภาวะการมีงานทำ)

---

## 4. Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `coop_terms` | รอบสหกิจ (ภาคการศึกษา) | id, academic_year, term, start_date, end_date, status |
| `coop_registrations` | การลงทะเบียนสหกิจ | id, student_id (ref academic), term_id, eligibility_status, status |
| `establishments` | สถานประกอบการ | id, name, type, industry, accreditation_status |
| `establishment_mous` | ข้อตกลง MOU | id, establishment_id, no, start_date, end_date, file_url |
| `coop_positions` | ตำแหน่งงานสหกิจ | id, establishment_id, title, major, quota, allowance |
| `coop_applications` | การสมัคร + จับคู่ | id, registration_id, position_id, preference, status |
| `advisor_assignments` | มอบหมายอาจารย์นิเทศ | id, registration_id, advisor_id (ref hr), assigned_at |
| `site_visits` | การนิเทศงาน | id, assignment_id, visit_date, mode, notes, risk_flag |
| `work_reports` | รายงานการปฏิบัติงาน | id, registration_id, type, file_url, status, due_date |
| `evaluations` | ผลการประเมิน | id, registration_id, evaluator_type, score, weighted_score |
| `coop_grades` | เกรดสหกิจ | id, registration_id, final_score, grade, locked |

> ทุก `*_id` ที่ชี้ไป module อื่น (student_id, advisor_id) เก็บเป็น **UUID reference เท่านั้น ไม่มี FK ข้าม schema** (กฎ D-03)

---

## 5. Public API (สำหรับ module อื่นเรียก — กฎ M-01)

```typescript
// contracts/coop.interface.ts
export interface ICoopService {
  getCoopStatusByStudent(studentId: string): Promise<CoopStatusDTO>
  getEstablishmentById(id: string): Promise<EstablishmentDTO>
  getActiveCoopCount(term: string): Promise<number>   // → planning dashboard
}
```

---

## 6. BPMN Processes

| Process | File | Participants |
|---|---|---|
| ขออนุมัติคุณสมบัติ (กรณีพิเศษ) | `coop-registration-approval.bpmn` | Student → Coordinator → Co-op Committee |
| ประเมินผลและสรุปเกรด | `coop-evaluation.bpmn` | Company Supervisor → Advisor → Coordinator (lock grade) |

---

## 7. Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `CoopRegisteredEvent` | ลงทะเบียนสหกิจสำเร็จ | academic (ลงทะเบียนวิชาสหกิจ) |
| `CoopReferralIssuedEvent` | ออกหนังสือส่งตัว | document (จัดเก็บสารบรรณ) |
| `CoopCompletedEvent` | สรุปเกรดสหกิจ | academic (transcript), planning (KPI) |
| `CoopEvaluatedEvent` | ประเมินผลเสร็จ | planning (สถิติความพึงพอใจ) |

## 8. Events Subscribed

| Event | Source | Action |
|---|---|---|
| `EnrollmentConfirmedEvent` | academic | sync ข้อมูลนักศึกษาเข้าสู่ coop scope (ถ้ายังไม่มี) |
| `GradesPublishedEvent` | academic | อัปเดตคุณสมบัติ (หน่วยกิต/GPA) ใช้ตรวจ eligibility |

---

## 9. Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, AcademicUnit, FiscalYear |
| academic | sync (read) + event | ข้อมูลนักศึกษา, หน่วยกิต/GPA, ส่งเกรดกลับ |
| **hr** | sync (read) | อาจารย์นิเทศ (`getFacultyByDepartment`) + ภาระงาน (`getAdvisingLoad`) |
| document | event | จัดเก็บหนังสือราชการ (ส่งตัว/ขอความอนุเคราะห์) |
| planning | event | KPI สหกิจ, ภาวะการมีงานทำ |
| MinIO | infra | MOU, รายงาน, แบบประเมิน, รูปนิเทศ |
| BPMN Engine | orchestration | registration-approval, evaluation |

---

## 10. Architecture Compliance Checklist

- [ ] M-02: ไม่มี SQL query ข้าม schema (`academic.*`, `hr.*`) — เรียกผ่าน public API เท่านั้น
- [ ] C-03: ข้อมูลที่รับจาก academic/hr เป็น DTO — ไม่ผูกกับ entity ของ module ต้นทาง
- [ ] D-03: ทุก cross-module reference เป็น ID (no FK constraint)
- [ ] B-03: External Task Worker ของ BPMN เป็น idempotent (ใช้ idempotency key ตอนออกเลขหนังสือ/ลงทะเบียน)
- [ ] O-01/O-03: OPA filter ให้สถานประกอบการ/อาจารย์เห็นเฉพาะข้อมูลในขอบเขตตน, คะแนนประเมินถูก mask
- [ ] E-03: มี `GET /api/coop/health`
