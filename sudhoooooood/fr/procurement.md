# Functional Requirements — Procurement

**Module:** `procurement`  
**Schema:** `procurement`  
**Phase:** Phase 2  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Procurement Officer | จัดการพัสดุ, ออก PO, ตรวจรับ |
| Department Head | ยื่นคำขอจัดซื้อ |
| Vice Dean | อนุมัติ PO วงเงินกลาง |
| Dean | อนุมัติ PO วงเงินสูง |
| Finance Admin | ตรวจสอบงบประมาณ |

---

## Functional Requirements

### FR-PROC-001: ยื่นคำขอจัดซื้อจัดจ้าง (Purchase Requisition)

**As a** Department Head  
**I want to** ยื่นคำขอจัดซื้อพร้อมรายละเอียดรายการ  
**So that** Procurement Officer สามารถดำเนินการจัดซื้อได้

**Acceptance Criteria:**
- [ ] คำขอมี: ชื่อรายการ, คุณลักษณะ, จำนวน, ราคาประมาณ, วัตถุประสงค์, `budget_request_id`
- [ ] ต้อง reference `BudgetApprovedEvent` หรือมีงบประมาณรองรับก่อนยื่น
- [ ] แนบ spec เอกสาร (MinIO)
- [ ] ผู้ยื่นติดตาม status ได้ real-time

---

### FR-PROC-002: กระบวนการจัดซื้อจัดจ้าง (Procurement Workflow)

**As a** Procurement Officer  
**I want to** ดำเนินกระบวนการจัดซื้อตามระเบียบพัสดุ  
**So that** การจัดซื้อถูกต้องตามกฎหมายและตรวจสอบได้

**Acceptance Criteria:**
- [ ] กระบวนการผ่าน BPMN (`procurement-approval.bpmn`)
- [ ] วิธีการจัดซื้อกำหนดโดย DMN: วงเงิน < 100,000 → เฉพาะเจาะจง, 100,000–5,000,000 → เปรียบเทียบราคา, > 5,000,000 → ประกวดราคา
- [ ] บันทึก vendor ที่เสนอราคา (≥ 3 รายสำหรับเปรียบเทียบ)
- [ ] Committee approval สำหรับวงเงิน > 100,000 บาท

---

### FR-PROC-003: จัดการ Vendor

**As a** Procurement Officer  
**I want to** บันทึกและบริหารข้อมูล vendor ที่ใช้งาน  
**So that** สามารถเปรียบเทียบ vendor ได้อย่างมีประสิทธิภาพ

**Acceptance Criteria:**
- [ ] Vendor มี: ชื่อ, เลขทะเบียน, ที่อยู่, ผู้ติดต่อ, ประเภทสินค้า/บริการ, rating
- [ ] บันทึกประวัติการสั่งซื้อและผลการประเมิน vendor แต่ละราย
- [ ] Blacklist vendor ที่ผิดสัญญา พร้อมเหตุผล
- [ ] ค้นหา vendor ตาม category ได้

---

### FR-PROC-004: ออกใบสั่งซื้อ (Purchase Order)

**As a** Procurement Officer  
**I want to** ออก PO หลังได้รับอนุมัติ  
**So that** vendor ได้รับคำสั่งซื้อที่เป็นทางการ

**Acceptance Criteria:**
- [ ] PO มี: เลขที่ PO, vendor, รายการ, จำนวน, ราคา, วันส่งมอบ, เงื่อนไข
- [ ] Generate PDF พร้อมลายเซ็นอนุมัติ (MinIO)
- [ ] Publish `POApprovedEvent` → finance (commit งบประมาณ)
- [ ] PO number format: `PO-{YYYY}-{SEQ5}`

---

### FR-PROC-005: จัดการสัญญา (Contract Management)

**As a** Procurement Officer  
**I want to** บันทึกและติดตามสัญญากับ vendor  
**So that** ไม่มีสัญญาหมดอายุโดยไม่ได้รับการต่ออายุ

**Acceptance Criteria:**
- [ ] สัญญามี: เลขที่, vendor, วงเงิน, วันเริ่ม, วันสิ้นสุด, เงื่อนไขการรับประกัน
- [ ] แจ้งเตือนล่วงหน้า 30, 60 วันก่อนสัญญาหมดอายุ
- [ ] Publish `ContractSignedEvent` → document (เก็บสัญญา)
- [ ] บันทึก amendment ของสัญญาพร้อม version history

---

### FR-PROC-006: ตรวจรับพัสดุ (Asset Receiving)

**As a** Procurement Officer  
**I want to** บันทึกการตรวจรับพัสดุที่ส่งมอบ  
**So that** ยืนยันว่าได้รับครบถ้วนตรงตาม spec ก่อนชำระเงิน

**Acceptance Criteria:**
- [ ] บันทึก: PO reference, รายการที่รับ, จำนวน, สภาพ, ผู้ตรวจรับ, วันที่รับ
- [ ] รองรับรับบางส่วน (partial delivery) และ track ส่วนที่ยังค้างส่ง
- [ ] Publish `AssetReceivedEvent` → facility (บันทึก asset ใหม่)
- [ ] แจ้ง Finance ให้จ่ายเงินได้เมื่อตรวจรับครบ

---

### FR-PROC-007: รายงานพัสดุ

**As a** Procurement Officer / Finance Admin  
**I want to** ออกรายงานสรุปการจัดซื้อจัดจ้าง  
**So that** ส่งรายงานตามกำหนดและตรวจสอบโดยหน่วยงานภายนอกได้

**Acceptance Criteria:**
- [ ] รายงาน: สรุปการจัดซื้อรายปี, PO ที่ค้างชำระ, vendor performance
- [ ] Export: PDF, Excel
- [ ] กรองตาม: fiscal year, วิธีจัดซื้อ, department, vendor

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `purchase_requisitions` | คำขอจัดซื้อ | id, requester_id, department_id, items, budget_ref, status |
| `vendors` | ข้อมูล vendor | id, name, tax_id, contact, category, status |
| `purchase_orders` | ใบสั่งซื้อ | id, po_number, vendor_id, total_amount, status |
| `po_items` | รายการใน PO | id, po_id, description, qty, unit_price |
| `contracts` | สัญญา | id, po_id, vendor_id, value, start_date, end_date |
| `receiving_records` | ตรวจรับ | id, po_id, received_date, received_by, status |

---

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| จัดซื้อจัดจ้าง | `procurement-approval.bpmn` | Requester → Procurement → Committee → Vice Dean / Dean (ตาม DMN) |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `POApprovedEvent` | PO ได้รับอนุมัติ | finance (commit budget) |
| `ContractSignedEvent` | บันทึกสัญญาสำเร็จ | document |
| `AssetReceivedEvent` | ตรวจรับพัสดุครบ | facility (บันทึก asset) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `BudgetApprovedEvent` | finance | เปิดให้ยื่นคำขอจัดซื้อในวงเงินที่อนุมัติ |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, FiscalYear |
| finance | sync (read) | ตรวจวงเงินงบประมาณก่อนอนุมัติ PO |
| hr | sync (read) | ดึงข้อมูลผู้อนุมัติ |
| MinIO | infra | spec เอกสาร, PO PDF, สัญญา |
| BPMN Engine | orchestration | procurement-approval |
