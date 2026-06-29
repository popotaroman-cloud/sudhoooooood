# Functional Requirements — Finance

**Module:** `finance`  
**Schema:** `finance`  
**Phase:** Phase 1  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Finance Admin | จัดการงบประมาณ, ตรวจสอบการเบิกจ่าย |
| Vice Dean (Finance) | อนุมัติงบประมาณ, เบิกจ่ายวงเงินสูง |
| Dean | อนุมัติสูงสุด |
| Department Head | ขอจัดสรรงบประมาณ, ดูงบของหน่วยงานตัวเอง |
| Staff | ยื่นใบเบิก, ดู payslip ตัวเอง |

---

## Functional Requirements

### FR-FIN-001: จัดทำแผนงบประมาณประจำปี (Budget Planning)

**As a** Finance Admin  
**I want to** จัดทำแผนงบประมาณประจำปีแยกตามหมวดหมู่และหน่วยงาน  
**So that** มีกรอบการใช้จ่ายที่ชัดเจนตลอดปีงบประมาณ

**Acceptance Criteria:**
- [ ] สร้างแผนงบประมาณต่อ `fiscal_year_id` ได้
- [ ] หมวดหมู่งบประมาณ: งบบุคลากร, งบดำเนินงาน, งบลงทุน, งบอุดหนุน
- [ ] จัดสรรงบให้แต่ละ department ได้ พร้อม approve โดย Vice Dean
- [ ] ปรับงบระหว่างปีได้ (โอนเปลี่ยนแปลงงบประมาณ) พร้อม audit trail

---

### FR-FIN-002: ขออนุมัติงบประมาณ (Budget Request)

**As a** Department Head  
**I want to** ยื่นคำขออนุมัติงบประมาณสำหรับกิจกรรม/โครงการ  
**So that** มีงบประมาณสนับสนุนการดำเนินงาน

**Acceptance Criteria:**
- [ ] กระบวนการผ่าน BPMN (`budget-request-approval.bpmn`)
- [ ] ผู้อนุมัติกำหนดตาม DMN (วงเงิน < 50,000 → หัวหน้า, < 500,000 → รองคณบดี, ≥ 500,000 → คณบดี)
- [ ] แนบเอกสารประกอบการขอ (MinIO)
- [ ] หลังอนุมัติ: reserve งบทันที (committed budget)
- [ ] Publish `BudgetApprovedEvent` → procurement

---

### FR-FIN-003: บันทึกการเบิกจ่าย (Payment Voucher)

**As a** Finance Admin  
**I want to** บันทึกการเบิกจ่ายและ match กับใบอนุมัติงบ  
**So that** ติดตามเงินที่ใช้จริงเทียบกับที่อนุมัติไว้ได้

**Acceptance Criteria:**
- [ ] สร้าง payment voucher พร้อมแนบหลักฐาน (ใบเสร็จ, ใบสำคัญจ่าย) ใน MinIO
- [ ] อ้างอิง `budget_request_id` เพื่อ deduct งบที่ reserve ไว้
- [ ] ตรวจสอบว่าวงเงินจ่ายจริงไม่เกินที่อนุมัติ
- [ ] Publish `PaymentProcessedEvent` → document (เก็บหลักฐาน)

---

### FR-FIN-004: จัดการ Payroll

**As a** Finance Admin  
**I want to** คำนวณและบันทึก payroll รายเดือน  
**So that** บุคลากรได้รับเงินถูกต้องและตรงเวลา

**Acceptance Criteria:**
- [ ] รับ employee data ผ่าน `HRService.getEmployeePayrollInfo()` (sync call)
- [ ] คำนวณ: เงินเดือน + เงินประจำตำแหน่ง + OT - ภาษี - ประกันสังคม - กบข.
- [ ] Subscribe `StaffOnboardedEvent` → สร้าง payroll record อัตโนมัติ
- [ ] Subscribe `StaffOffboardedEvent` → ปิด payroll record
- [ ] Subscribe `SalaryUpdatedEvent` → อัปเดต payroll calculation
- [ ] Export payslip PDF ต่อพนักงาน (ผ่าน MinIO)
- [ ] Sync กับ GFMIS (ระบบการเงินภาครัฐ) รายเดือน

---

### FR-FIN-005: ตรวจสอบงบประมาณแบบ Real-time

**As a** Finance Admin / Department Head  
**I want to** เห็นสถานะงบประมาณ real-time: จัดสรร / ผูกพัน / จ่ายจริง / คงเหลือ  
**So that** ตัดสินใจการใช้จ่ายได้ถูกต้อง

**Acceptance Criteria:**
- [ ] Dashboard แสดง: `allocated` / `committed` / `actual` / `available` แต่ละ department
- [ ] drill down ถึงระดับ budget line และ transaction ได้
- [ ] แจ้งเตือนเมื่องบคงเหลือต่ำกว่า 10% ของที่จัดสรร
- [ ] ข้อมูล cache ใน Redis อัปเดตทุก 5 นาที

---

### FR-FIN-006: รายงานทางการเงิน (Financial Reports)

**As a** Finance Admin / Dean  
**I want to** ออกรายงานการเงินในรูปแบบที่หน่วยงานภายนอกต้องการ  
**So that** ส่งรายงานตามกำหนดได้ถูกต้อง

**Acceptance Criteria:**
- [ ] รายงาน: งบการเงิน, รายงานผลการดำเนินงาน, รายงานงบประมาณ
- [ ] Export: PDF, Excel
- [ ] กรองได้ตาม: fiscal year, department, หมวดงบ, ช่วงเวลา
- [ ] Scheduled report: ส่งอีเมลอัตโนมัติทุกสิ้นเดือน

---

### FR-FIN-007: บันทึกรายได้ (Revenue Tracking)

**As a** Finance Admin  
**I want to** บันทึกรายได้จากแหล่งต่างๆ ของคณะ  
**So that** ทราบรายได้จริงเทียบกับเป้าหมาย

**Acceptance Criteria:**
- [ ] ประเภทรายได้: ค่าธรรมเนียมการศึกษา, บริการวิชาการ, ทุนวิจัย, เงินอุดหนุน
- [ ] อ้างอิง source module: academic (ค่าเรียน), research (ทุน), facility (ห้องให้เช่า)
- [ ] รายงานเปรียบเทียบรายได้ vs แผน

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `budget_plans` | แผนงบประมาณประจำปี | id, fiscal_year_id, department_id, category, amount |
| `budget_requests` | คำขออนุมัติงบ | id, requester_id, department_id, amount, status |
| `budget_allocations` | การจัดสรรงบ | id, plan_id, department_id, allocated, committed, actual |
| `payment_vouchers` | ใบสำคัญจ่าย | id, budget_request_id, amount, paid_date, evidence_url |
| `payroll_records` | payroll รายเดือน | id, employee_id, month, year, gross, net, status |
| `revenue_records` | รายได้ | id, source_type, source_ref_id, amount, received_date |

---

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| ขออนุมัติงบประมาณ | `budget-request-approval.bpmn` | Requester → Head → Vice Dean → Dean (ตาม DMN) |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `BudgetApprovedEvent` | budget request อนุมัติ | procurement |
| `PaymentProcessedEvent` | บันทึกการจ่ายเงิน | document |
| `PayrollProcessedEvent` | payroll รายเดือนเสร็จ | — (notify staff) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOnboardedEvent` | hr | สร้าง payroll record |
| `StaffOffboardedEvent` | hr | ปิด payroll record |
| `SalaryUpdatedEvent` | hr | อัปเดต payroll calculation |
| `POApprovedEvent` | procurement | commit งบประมาณ |
| `GrantApprovedEvent` | research | เปิด budget line วิจัย |
| `ScholarshipApprovedEvent` | student | สั่งจ่ายทุน |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, FiscalYear |
| hr | sync (read) | employee info สำหรับ payroll |
| GFMIS | external | sync ข้อมูลการเงินภาครัฐ |
| MinIO | infra | เก็บหลักฐานการจ่าย, payslip |
| BPMN Engine | orchestration | budget-request-approval |
