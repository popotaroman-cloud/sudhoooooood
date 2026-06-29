# Functional Requirements — HR

**Module:** `hr`  
**Schema:** `hr`  
**Phase:** Phase 1  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| HR Admin | จัดการข้อมูลบุคลากรทั้งหมด |
| Head of Department | อนุมัติคำขอลา ประเมินผล ดูข้อมูลลูกน้อง |
| Dean / Vice Dean | อนุมัติขั้นสุดท้าย ดูภาพรวม |
| Employee (Staff / Faculty) | ดูข้อมูลตัวเอง ยื่นคำขอลา ดู payslip |
| Recruitment Officer | จัดการกระบวนการสรรหา |

---

## Functional Requirements

### FR-HR-001: จัดการข้อมูลบุคลากร (Employee Profile)

**As an** HR Admin  
**I want to** บันทึกและแก้ไขข้อมูลบุคลากรทุกประเภท  
**So that** มีฐานข้อมูลบุคลากรที่ถูกต้องและเป็นปัจจุบัน

**Acceptance Criteria:**
- [ ] Employee มี fields: `id`, `employee_code`, `prefix`, `first_name_th/en`, `last_name_th/en`, `id_card`, `birth_date`, `gender`, `nationality`, `phone`, `email`, `address`
- [ ] ประเภทบุคลากร: ข้าราชการ, พนักงานมหาวิทยาลัย, ลูกจ้างประจำ, ลูกจ้างชั่วคราว, อาจารย์พิเศษ
- [ ] แนบไฟล์เอกสาร: สำเนาบัตรประชาชน, วุฒิการศึกษา, สัญญาจ้าง (MinIO)
- [ ] Audit trail ทุกการแก้ไข: บันทึกผู้แก้ไข, วันเวลา, ค่าก่อน/หลัง

---

### FR-HR-002: จัดการตำแหน่งและสายงาน (Position Management)

**As an** HR Admin  
**I want to** กำหนดตำแหน่งและ assign บุคลากรเข้าตำแหน่ง  
**So that** โครงสร้างองค์กรมีความชัดเจน

**Acceptance Criteria:**
- [ ] Position มี fields: `id`, `code`, `name_th/en`, `level`, `department_id`, `position_type`
- [ ] บุคลากร 1 คนมีได้ 1 primary position + หลาย secondary (กรรมการ, acting)
- [ ] บันทึก position history — ทราบได้ว่าบุคลากรเคยอยู่ตำแหน่งอะไรเมื่อไร
- [ ] แสดง org chart แบบ tree ตาม department

---

### FR-HR-003: กระบวนการสรรหาบุคลากร (Recruitment)

**As a** Recruitment Officer  
**I want to** บริหารกระบวนการสรรหาตั้งแต่เปิดอัตราจนถึงบรรจุ  
**So that** ติดตาม status ของผู้สมัครแต่ละคนได้

**Acceptance Criteria:**
- [ ] สร้าง Job Opening พร้อมกำหนด: ตำแหน่ง, คุณสมบัติ, วันรับสมัคร, จำนวนอัตรา
- [ ] บันทึกข้อมูลผู้สมัคร และ track status: `applied → screened → interviewed → selected → onboarded`
- [ ] แนบเอกสารผู้สมัคร (resume, transcript) ใน MinIO
- [ ] ส่ง notification ให้คณะกรรมการสรรหาเมื่อมีผู้สมัครใหม่

---

### FR-HR-004: ระบบลา (Leave Management)

**As an** Employee  
**I want to** ยื่นคำขอลาออนไลน์และติดตามสถานะ  
**So that** ไม่ต้องใช้เอกสารกระดาษ

**Acceptance Criteria:**
- [ ] ประเภทการลา: ลาพักผ่อน, ลากิจ, ลาป่วย, ลาคลอด, ลาอุปสมบท, ลาไปต่างประเทศ
- [ ] แสดง leave balance แบบ real-time (วันคงเหลือแต่ละประเภท)
- [ ] กระบวนการอนุมัติผ่าน BPMN (`leave-request.bpmn`): ผู้ขอ → หัวหน้า → (คณบดี ถ้า > 15 วัน)
- [ ] ยกเลิกคำขอลาได้หากยังไม่ได้รับการอนุมัติ
- [ ] คำนวณ leave balance อัตโนมัติตามประเภทและอายุงาน

---

### FR-HR-005: ประเมินผลการปฏิบัติงาน (Performance Evaluation)

**As a** Head of Department  
**I want to** ประเมินผลการปฏิบัติงานของบุคลากรรายปี  
**So that** มีข้อมูลสนับสนุนการพิจารณาเลื่อนเงินเดือน

**Acceptance Criteria:**
- [ ] กำหนด KPI ของแต่ละตำแหน่งได้ (เชื่อม Planning module)
- [ ] Evaluation cycle: ปีละ 1 ครั้ง หรือ 2 ครั้ง (configurable)
- [ ] Self-assessment → หัวหน้าประเมิน → ผู้บริหารรับทราบ
- [ ] ผลการประเมินเป็น sensitive data — OPA masking เฉพาะ HR Admin / บุคลากรตัวเอง

---

### FR-HR-006: จัดการข้อมูลเงินเดือน (Salary Record)

**As an** HR Admin  
**I want to** บันทึกและอัปเดตข้อมูลเงินเดือนของบุคลากร  
**So that** Finance module ใช้ข้อมูลนี้ในการจัดทำ payroll

**Acceptance Criteria:**
- [ ] Salary record มี: `employee_id`, `base_salary`, `position_allowance`, `effective_date`, `reason`
- [ ] บันทึก salary history — ดูได้ว่าเงินเดือนเปลี่ยนแปลงอย่างไร
- [ ] เงินเดือนเป็น sensitive data — masking ใน OPA: เห็นเฉพาะ HR Admin, Finance Admin, ตัวเอง
- [ ] Publish `SalaryUpdatedEvent` → Finance (update payroll calculation)

---

### FR-HR-007: การพัฒนาบุคลากร (Training & Development)

**As an** HR Admin  
**I want to** บันทึกการอบรม/พัฒนาของบุคลากรแต่ละคน  
**So that** ติดตาม KPI การพัฒนาบุคลากรและรายงาน QA ได้

**Acceptance Criteria:**
- [ ] บันทึก: หลักสูตร, ประเภท (ภายใน/ภายนอก), วันที่, ชั่วโมง, งบประมาณที่ใช้
- [ ] แนบไฟล์ certificate ใน MinIO
- [ ] สรุปชั่วโมงการอบรมต่อคนต่อปีเพื่อรายงาน QA
- [ ] Publish `TrainingCompletedEvent` → Planning (นับ KPI พัฒนาบุคลากร)

---

### FR-HR-008: Onboarding และ Offboarding

**As an** HR Admin  
**I want to** จัดการกระบวนการเริ่มงานและสิ้นสุดการจ้างงานอย่างเป็นระบบ  
**So that** ไม่มีขั้นตอนตกหล่น และ account ถูก provision/revoke ทันเวลา

**Acceptance Criteria:**
- [ ] Onboarding ผ่าน BPMN (`staff-onboarding.bpmn`): HR สร้าง record → IT provision account → Finance setup payroll → หัวหน้ารับทราบ
- [ ] Offboarding: กำหนดวันสิ้นสุด → Publish `StaffOffboardedEvent` → IT revoke → Finance ปิด payroll
- [ ] Checklist สำหรับ HR: คืนอุปกรณ์, ส่งมอบงาน, ลงนามเอกสาร

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `employees` | ข้อมูลบุคลากร | id, employee_code, full_name_th, type, status |
| `positions` | ตำแหน่ง | id, code, name_th, level, department_id |
| `employee_positions` | การ assign ตำแหน่ง | employee_id, position_id, start_date, end_date |
| `leave_types` | ประเภทการลา | id, name_th, max_days_per_year, carry_over |
| `leave_balances` | วันลาคงเหลือ | employee_id, leave_type_id, fiscal_year_id, balance |
| `leave_requests` | คำขอลา | id, employee_id, leave_type_id, start_date, end_date, status |
| `salary_records` | ประวัติเงินเดือน | employee_id, base_salary, effective_date |
| `evaluations` | ผลการประเมิน | id, employee_id, cycle, score, evaluator_id |
| `trainings` | การอบรม | id, employee_id, course_name, hours, date |
| `job_openings` | อัตราว่าง | id, position_id, open_date, close_date, status |
| `applicants` | ผู้สมัคร | id, job_opening_id, name, status |

---

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| ขอลา | `leave-request.bpmn` | Employee → Head → Dean (ถ้า >15 วัน) |
| Onboarding | `staff-onboarding.bpmn` | HR → IT → Finance → Head |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `StaffOnboardedEvent` | onboarding complete | auth, finance, it-admin, document |
| `StaffOffboardedEvent` | offboarding triggered | auth, finance, it-admin |
| `SalaryUpdatedEvent` | salary record changed | finance |
| `TrainingCompletedEvent` | training บันทึกสำเร็จ | planning |
| `LeaveApprovedEvent` | ลาได้รับอนุมัติ | planning (นับวันลา KPI) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| — | — | — |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, FiscalYear |
| MinIO | infra | เก็บเอกสาร HR |
| BPMN Engine | orchestration | leave-request, onboarding |
