# Functional Requirements — Student Affairs

**Module:** `student`  
**Schema:** `student`  
**Phase:** Phase 3  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Student Affairs Admin | จัดการทุน กิจกรรม ชมรม |
| Student | ยื่นขอทุน สมัครกิจกรรม |
| Advisor | ให้คำปรึกษา ดูข้อมูลนักศึกษาในที่ปรึกษา |
| Club President | จัดการชมรม |
| Vice Dean (Student Affairs) | อนุมัติทุน นโยบายกิจกรรม |

---

## Functional Requirements

### FR-STU-001: ข้อมูลนักศึกษา (Student Profile)

**As a** Student Affairs Admin  
**I want to** ดูข้อมูลนักศึกษาที่ sync มาจาก Academic module  
**So that** ไม่ต้องบันทึกข้อมูลซ้ำ

**Acceptance Criteria:**
- [ ] ดึงข้อมูลนักศึกษาผ่าน `AcademicService.getStudentById(id)` (sync call)
- [ ] Student Affairs เก็บเฉพาะข้อมูลที่ module ตัวเองรับผิดชอบ: ทุน, กิจกรรม, ประวัติวินัย
- [ ] Subscribe `EnrollmentConfirmedEvent` → สร้าง student record ใน student schema หากยังไม่มี

---

### FR-STU-002: จัดการทุนการศึกษา (Scholarship Management)

**As a** Student Affairs Admin  
**I want to** บริหารทุนการศึกษาตั้งแต่ประกาศรับสมัครจนถึงการจ่ายทุน  
**So that** นักศึกษาที่มีคุณสมบัติได้รับทุนตรงเวลา

**Acceptance Criteria:**
- [ ] กำหนดทุน: ชื่อทุน, ประเภท (เรียนดี/ขาดแคลน/ผลงาน), วงเงิน, จำนวน, คุณสมบัติ
- [ ] นักศึกษายื่นใบสมัครออนไลน์ พร้อมแนบเอกสาร (MinIO)
- [ ] กรรมการพิจารณาและ rank ผู้สมัคร
- [ ] Publish `ScholarshipApprovedEvent` → finance (สั่งจ่ายทุน)
- [ ] แจ้งผลผ่าน email/notification

---

### FR-STU-003: จัดการกิจกรรมนักศึกษา (Student Activities)

**As a** Student Affairs Admin  
**I want to** บริหารกิจกรรมนักศึกษาและบันทึกชั่วโมงการเข้าร่วม  
**So that** นักศึกษาสะสมชั่วโมงกิจกรรมได้ครบตามเกณฑ์

**Acceptance Criteria:**
- [ ] สร้าง activity: ชื่อ, ประเภท, วันที่, สถานที่, จำนวนชั่วโมง, capacity
- [ ] นักศึกษาลงทะเบียนเข้าร่วม (มี QR check-in)
- [ ] ระบบนับชั่วโมงสะสม — แจ้งเตือนเมื่อไม่ครบเกณฑ์ก่อนจบ
- [ ] Publish `ActivityCompletedEvent` → planning (นับ KPI กิจกรรมนักศึกษา)

---

### FR-STU-004: จัดการชมรม (Club Management)

**As a** Club President  
**I want to** บริหารชมรมและขออนุมัติกิจกรรมผ่านระบบ  
**So that** ชมรมดำเนินกิจกรรมได้อย่างถูกระเบียบ

**Acceptance Criteria:**
- [ ] ลงทะเบียนชมรมใหม่ผ่านระบบ — Vice Dean อนุมัติ
- [ ] ชมรมมี: ชื่อ, ประเภท, ที่ปรึกษา, สมาชิก, สถานะ
- [ ] ยื่นขออนุมัติกิจกรรมและงบประมาณ
- [ ] รายงานผลการดำเนินงานชมรมรายภาคการศึกษา

---

### FR-STU-005: ระบบอาจารย์ที่ปรึกษา (Advisor System)

**As an** Advisor  
**I want to** ดูข้อมูลนักศึกษาในความดูแลและบันทึกการให้คำปรึกษา  
**So that** ติดตามและช่วยเหลือนักศึกษาที่มีปัญหาได้ทันเวลา

**Acceptance Criteria:**
- [ ] Advisor ดูได้เฉพาะนักศึกษาที่ assign ไว้ (OPA row-level filter)
- [ ] บันทึก advising session: วันที่, หัวข้อ, สรุปการพูดคุย, action items
- [ ] ระบบ flag นักศึกษาที่มีความเสี่ยง (เกรดต่ำ, ขาดเรียนบ่อย, ไม่มาพบ advisor)
- [ ] ข้อมูลการให้คำปรึกษาเป็น confidential — เห็นได้เฉพาะ advisor และ Student Affairs Admin

---

### FR-STU-006: ระบบวินัยนักศึกษา (Disciplinary Record)

**As a** Student Affairs Admin  
**I want to** บันทึกและจัดการกรณีวินัยนักศึกษา  
**So that** มีประวัติที่ชัดเจนและการดำเนินการเป็นธรรม

**Acceptance Criteria:**
- [ ] บันทึกกรณี: วันที่, ประเภทความผิด, รายละเอียด, พยาน, การลงโทษ
- [ ] กระบวนการพิจารณา: รับเรื่อง → สอบสวน → คณะกรรมการพิจารณา → ประกาศผล
- [ ] Sensitive data — เห็นได้เฉพาะ Student Affairs Admin, Dean, ตัวนักศึกษาเอง
- [ ] แจ้งผู้ปกครองผ่าน email (configurable ตามระดับความผิด)

---

### FR-STU-007: ศิษย์เก่าสัมพันธ์ (Alumni)

**As a** Student Affairs Admin  
**I want to** บันทึกข้อมูลศิษย์เก่าและติดตามความสำเร็จ  
**So that** คณะมีฐานข้อมูลศิษย์เก่าสำหรับรายงาน QA และเครือข่าย

**Acceptance Criteria:**
- [ ] บันทึกข้อมูลหลังสำเร็จการศึกษา: ที่ทำงาน, ตำแหน่ง, ปีที่จบ
- [ ] Survey ศิษย์เก่า 1 ปีหลังจบ (ตาม TQF/AUN-QA)
- [ ] Publish `AlumnusEmployedEvent` → planning (KPI อัตราการมีงานทำ)

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `student_profiles` | ข้อมูลนักศึกษา (student scope) | id, student_id (from academic), advisor_id, activity_hours |
| `scholarships` | ทุนการศึกษา | id, name, type, amount, quota, fiscal_year_id |
| `scholarship_applications` | ใบสมัครทุน | id, scholarship_id, student_id, status |
| `activities` | กิจกรรม | id, name, type, date, hours, capacity |
| `activity_attendances` | การเข้าร่วม | activity_id, student_id, check_in_at |
| `clubs` | ชมรม | id, name, type, advisor_id, status |
| `club_members` | สมาชิกชมรม | club_id, student_id, role, joined_at |
| `advising_sessions` | การให้คำปรึกษา | id, advisor_id, student_id, session_date, notes |
| `disciplinary_cases` | กรณีวินัย | id, student_id, type, date, punishment, status |
| `alumni` | ศิษย์เก่า | id, student_id, grad_year, employer, position |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `ScholarshipApprovedEvent` | อนุมัติทุน | finance (สั่งจ่าย) |
| `ActivityCompletedEvent` | กิจกรรมสิ้นสุด | planning (KPI) |
| `AlumnusEmployedEvent` | บันทึกการมีงานทำ | planning (KPI) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `EnrollmentConfirmedEvent` | academic | สร้าง student_profile record |
| `GradesPublishedEvent` | academic | อัปเดต academic standing, flag at-risk |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department |
| academic | sync (read) | ข้อมูลนักศึกษา, enrollment status |
| finance | sync (read) | อ้างอิงการจ่ายทุน |
| MinIO | infra | เอกสารใบสมัครทุน, รายงานกิจกรรม |
