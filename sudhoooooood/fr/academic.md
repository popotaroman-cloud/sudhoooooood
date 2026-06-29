# Functional Requirements — Academic

**Module:** `academic`  
**Schema:** `academic`  
**Phase:** Phase 2  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Academic Admin | จัดการหลักสูตร, ตารางเรียน, ทะเบียน |
| Faculty (อาจารย์) | ดูตารางสอน, บันทึกเกรด, จัดการรายวิชา |
| Student | ลงทะเบียน, ดูเกรด, ดูตารางเรียน |
| Dean / Vice Dean | อนุมัติหลักสูตร, รับทราบรายงาน |
| Registrar | ดูแลงานทะเบียนทั้งหมด |

---

## Functional Requirements

### FR-ACAD-001: จัดการรายวิชา (Course Management)

**As an** Academic Admin  
**I want to** บริหารรายวิชาทั้งหมดที่เปิดสอนในคณะ  
**So that** มีฐานข้อมูลรายวิชาที่ถูกต้องและเป็นปัจจุบัน

**Acceptance Criteria:**
- [ ] Course มี: `course_code`, `name_th/en`, `credits`, `type (lecture/lab/seminar)`, `owner_unit_id` (→ `shared.academic_units`), `status`
- [ ] `owner_unit_id` อ้างอิง ภาควิชา (`type=department`) ที่เป็นเจ้าของรายวิชา
- [ ] กำหนด prerequisite ของรายวิชาได้ (many-to-many)
- [ ] Version รายวิชา — ติดตามการเปลี่ยนแปลงตาม curriculum version
- [ ] ค้นหารายวิชาตามรหัส, ชื่อ, หน่วยกิต, หรือภาควิชาได้

---

### FR-ACAD-002: จัดการหลักสูตร (Curriculum Management)

**As an** Academic Admin  
**I want to** บริหารหลักสูตรและเสนอหลักสูตรใหม่/ปรับปรุงผ่านระบบ  
**So that** มีเอกสารหลักสูตรที่ทันสมัยและผ่านการอนุมัติอย่างถูกต้อง

**Acceptance Criteria:**
- [ ] กระบวนการเสนอหลักสูตรผ่าน BPMN (`curriculum-approval.bpmn`)
- [ ] Curriculum มี: `program_id` (→ `shared.academic_units type=program`), degree level, credit requirements, course structure, TQF level
- [ ] `program_id` ผูก หลักสูตร เข้ากับ สาขาวิชา ใน shared-kernel — สาขา 1 สาขาอาจมีหลายหลักสูตร (ป.ตรี, ป.โท)
- [ ] บันทึก version history ของหลักสูตร
- [ ] Publish `CurriculumApprovedEvent` → document (บันทึกประกาศ)
- [ ] Sync หลักสูตรที่ approved ไปยัง University SIS

---

### FR-ACAD-003: การลงทะเบียนเรียน (Enrollment)

**As a** Student  
**I want to** ลงทะเบียนเรียนรายวิชาในแต่ละภาคการศึกษา  
**So that** สามารถเข้าเรียนและรับการประเมินในรายวิชานั้น

**Acceptance Criteria:**
- [ ] กำหนดช่วงเวลาลงทะเบียนต่อภาคการศึกษา
- [ ] ตรวจสอบ prerequisite อัตโนมัติก่อนอนุมัติการลงทะเบียน
- [ ] จำกัด capacity ต่อ section — แจ้งเตือนเมื่อเต็ม
- [ ] รองรับการ add/drop ในช่วงที่กำหนด
- [ ] Publish `EnrollmentConfirmedEvent` → student (อัปเดต transcript), finance (ค่าธรรมเนียม)

---

### FR-ACAD-004: จัดตารางเรียน/ตารางสอน (Timetable)

**As an** Academic Admin  
**I want to** จัดตารางเรียนและตารางสอนโดยไม่มีการชนกันของห้องหรืออาจารย์  
**So that** การเรียนการสอนดำเนินไปได้อย่างราบรื่น

**Acceptance Criteria:**
- [ ] Section มี: course_id, instructor_id, room_id, day_of_week, time_start, time_end, capacity
- [ ] ระบบตรวจสอบ conflict: ห้องซ้ำ, อาจารย์ซ้ำ, นักศึกษาซ้ำ
- [ ] เรียก `HRService.getFacultyById(id)` ตรวจสอบอาจารย์มีสถานะ active
- [ ] เรียก `FacilityService.checkRoomAvailability(room_id, slot)` ตรวจว่าห้องว่าง
- [ ] Export ตารางสอนเป็น PDF / iCal

---

### FR-ACAD-005: บันทึกและประกาศผลการเรียน (Grade Management)

**As a** Faculty  
**I want to** บันทึกเกรดของนักศึกษาในรายวิชาที่สอน  
**So that** นักศึกษาและหน่วยงานที่เกี่ยวข้องรับทราบผลการเรียน

**Acceptance Criteria:**
- [ ] อาจารย์บันทึกเกรดได้เฉพาะรายวิชาที่ตัวเองสอน
- [ ] ระบบ lock เกรดหลัง deadline — แก้ไขได้โดย Academic Admin เท่านั้น
- [ ] คำนวณ GPA อัตโนมัติเมื่อ lock เกรดครบทุกรายวิชา
- [ ] Publish `GradesPublishedEvent` → student (อัปเดต transcript)
- [ ] ประกาศผลการเรียนผ่าน email/notification

---

### FR-ACAD-006: จัดการปฏิทินการศึกษา (Academic Calendar)

**As an** Academic Admin  
**I want to** กำหนดปฏิทินการศึกษาประจำปี  
**So that** ทุกฝ่ายทราบกำหนดการสำคัญล่วงหน้า

**Acceptance Criteria:**
- [ ] กำหนดได้: วันเปิด-ปิดภาค, ช่วงสอบ, วันสำคัญ, วันหยุดราชการ
- [ ] Publish ปฏิทินเป็น API ให้ module อื่นใช้ (HR ใช้ตรวจ working days, Facility ใช้จองห้อง)
- [ ] แสดงปฏิทินใน UI แบบ monthly view

---

### FR-ACAD-007: ข้อมูลสำหรับรายงาน QA

**As an** Academic Admin  
**I want to** Export ข้อมูลสำหรับรายงานประกันคุณภาพ  
**So that** Planning module ดึงข้อมูลเพื่อทำ SAR ได้อัตโนมัติ

**Acceptance Criteria:**
- [ ] API: จำนวนนักศึกษาต่อหลักสูตร, อัตราการสำเร็จการศึกษา, สัดส่วนอาจารย์ต่อนักศึกษา
- [ ] Publish `AcademicStatsUpdatedEvent` → planning (ทุกสิ้นภาคการศึกษา)

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `courses` | รายวิชา | id, course_code, name_th, credits, type, **owner_unit_id**, status |
| `course_prerequisites` | วิชาบังคับก่อน | course_id, prerequisite_course_id |
| `curricula` | หลักสูตร | id, **program_id** (→ shared.academic_units), name, degree_level, tqf_level, version, status |
| `curriculum_courses` | วิชาในหลักสูตร | curriculum_id, course_id, required_type, year_of_study |
| `academic_terms` | ภาคการศึกษา | id, fiscal_year_id, semester, start_date, end_date |
| `sections` | ตอนเรียน | id, course_id, term_id, instructor_id, **owner_unit_id**, room_id, capacity |
| `enrollments` | การลงทะเบียน | id, student_id, **curriculum_id**, section_id, status |
| `grades` | ผลการเรียน | id, enrollment_id, score, letter_grade, locked_at |
| `academic_calendar` | ปฏิทินการศึกษา | id, term_id, event_name, event_date, type |

> `owner_unit_id` → `shared.academic_units (type=department)` เจ้าของภาควิชา  
> `program_id` → `shared.academic_units (type=program)` สาขาวิชาที่หลักสูตรสังกัด

---

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| เสนอหลักสูตรใหม่/ปรับปรุง | `curriculum-approval.bpmn` | Academic Admin → กรรมการวิชาการ → คณะกรรมการประจำคณะ → Dean |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `EnrollmentConfirmedEvent` | ลงทะเบียนสำเร็จ | student, finance |
| `GradesPublishedEvent` | ประกาศเกรด | student |
| `CurriculumApprovedEvent` | อนุมัติหลักสูตร | document |
| `AcademicStatsUpdatedEvent` | สิ้นภาคการศึกษา | planning |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| — | — | — |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, **AcademicUnit** (ภาควิชา/สาขาวิชา) |
| hr | sync (read) | ข้อมูลอาจารย์ผู้สอน |
| facility | sync (read) | ตรวจสอบห้องว่างสำหรับตารางเรียน |
| University SIS | external | sync หลักสูตรและข้อมูลนักศึกษา |
| BPMN Engine | orchestration | curriculum-approval |
