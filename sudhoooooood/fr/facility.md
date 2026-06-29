# Functional Requirements — Facility

**Module:** `facility`  
**Schema:** `facility`  
**Phase:** Phase 3  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Facility Admin | จัดการอาคาร ห้อง ยานพาหนะ ครุภัณฑ์ |
| Staff / Faculty | จองห้อง ขอใช้ยานพาหนะ แจ้งซ่อม |
| Driver | รับ-ส่ง ยืนยันการเดินทาง |
| Asset Manager | ดูแลการตรวจนับและบำรุงรักษาครุภัณฑ์ |

---

## Functional Requirements

### FR-FAC-001: จัดการอาคารและห้อง (Building & Room Management)

**As a** Facility Admin  
**I want to** บริหารข้อมูลอาคารและห้องทั้งหมดของคณะ  
**So that** มีฐานข้อมูล facility ที่ถูกต้องสำหรับการจองและรายงาน

**Acceptance Criteria:**
- [ ] อาคาร มี: ชื่อ, จำนวนชั้น, พื้นที่ (ตร.ม.), ปีที่สร้าง
- [ ] ห้อง มี: รหัส, ชื่อ, อาคาร, ชั้น, ความจุ, ประเภท (บรรยาย/lab/ประชุม/สำนักงาน), สิ่งอำนวยความสะดวก, สถานะ
- [ ] Upload แผนผังอาคาร (MinIO)
- [ ] เปลี่ยนสถานะห้อง: active / under_maintenance / inactive

---

### FR-FAC-002: ระบบจองห้อง (Room Booking)

**As a** Staff / Faculty  
**I want to** จองห้องประชุมหรือห้องบรรยายล่วงหน้า  
**So that** มั่นใจว่าจะมีพื้นที่ใช้งานตามที่ต้องการ

**Acceptance Criteria:**
- [ ] ดู availability calendar แบบ visual (weekly / monthly view)
- [ ] จองได้เฉพาะห้องที่สถานะ active
- [ ] ระบบตรวจ conflict อัตโนมัติ — ห้ามจองซ้อนช่วงเวลา
- [ ] Academic module เรียก `FacilityService.checkRoomAvailability(room_id, slot)` (sync)
- [ ] Publish `RoomBookedEvent` → document (log การใช้ห้อง)
- [ ] ยกเลิกการจองล่วงหน้าได้ไม่น้อยกว่า 2 ชั่วโมง
- [ ] แจ้งเตือน reminder ก่อนเวลาจอง 30 นาที

---

### FR-FAC-003: จัดการยานพาหนะ (Vehicle Management)

**As a** Facility Admin  
**I want to** บริหารยานพาหนะของคณะและการให้บริการ  
**So that** ยานพาหนะถูกใช้อย่างมีประสิทธิภาพและตรวจสอบได้

**Acceptance Criteria:**
- [ ] ยานพาหนะมี: ทะเบียน, ยี่ห้อ, รุ่น, ประเภท, ความจุ, สถานะ, วันตรวจสภาพ, ประกันภัย
- [ ] แจ้งเตือนล่วงหน้า 30 วันเมื่อประกัน/ต่อทะเบียนใกล้หมด
- [ ] Assign driver ให้แต่ละยานพาหนะ

---

### FR-FAC-004: ระบบขอใช้ยานพาหนะ (Vehicle Request)

**As a** Staff / Faculty  
**I want to** ยื่นคำขอใช้ยานพาหนะราชการ  
**So that** ไม่ต้องใช้เอกสารกระดาษและติดตาม status ได้

**Acceptance Criteria:**
- [ ] คำขอมี: วันเวลา, ปลายทาง, จำนวนผู้โดยสาร, วัตถุประสงค์, ผู้ขออนุมัติ
- [ ] หัวหน้าอนุมัติ → Facility Admin assign ยานพาหนะและ driver
- [ ] Driver ยืนยันการรับงานในระบบ
- [ ] บันทึก odometer ก่อน-หลังเดินทาง
- [ ] Publish `VehicleAssignedEvent` → document (log)

---

### FR-FAC-005: จัดการครุภัณฑ์ (Asset Management)

**As an** Asset Manager  
**I want to** บันทึกและติดตามครุภัณฑ์ทั้งหมดของคณะ  
**So that** ทราบว่าครุภัณฑ์อยู่ที่ไหน อยู่ในสภาพอะไร และใครรับผิดชอบ

**Acceptance Criteria:**
- [ ] Asset มี: รหัสครุภัณฑ์, ชื่อ, ประเภท, ราคา, วันที่ได้มา, location, custodian_id, สถานะ
- [ ] Subscribe `AssetReceivedEvent` (from procurement) → สร้าง asset record อัตโนมัติ
- [ ] QR code / barcode สำหรับแต่ละ asset
- [ ] ตรวจนับครุภัณฑ์ประจำปี — บันทึกผลการตรวจนับ
- [ ] จำหน่ายครุภัณฑ์ที่เสื่อมสภาพ พร้อมบันทึกเหตุผล

---

### FR-FAC-006: แจ้งซ่อมและบำรุงรักษา (Maintenance Request)

**As a** Staff / Faculty  
**I want to** แจ้งซ่อมอาคาร/ครุภัณฑ์ที่ชำรุดผ่านระบบ  
**So that** ปัญหาได้รับการแก้ไขอย่างรวดเร็วและติดตามได้

**Acceptance Criteria:**
- [ ] แจ้งซ่อมมี: สถานที่/asset, ประเภทปัญหา, คำอธิบาย, รูปถ่าย (MinIO), ระดับความเร่งด่วน
- [ ] Facility Admin assign ช่างหรือผู้รับผิดชอบ
- [ ] Track status: รับเรื่อง → กำลังดำเนินการ → เสร็จสิ้น → ผู้แจ้งยืนยัน
- [ ] SLA: urgent < 4 ชั่วโมง, normal < 3 วันทำการ

---

### FR-FAC-007: สาธารณูปโภค (Utilities Tracking)

**As a** Facility Admin  
**I want to** บันทึกค่าสาธารณูปโภครายเดือน  
**So that** ติดตามค่าใช้จ่ายและวางแผนงบประมาณได้

**Acceptance Criteria:**
- [ ] บันทึก: ค่าไฟ, ค่าน้ำ, ค่าโทรศัพท์ แยกตามอาคาร
- [ ] กราฟแนวโน้มรายเดือน เปรียบเทียบ YoY
- [ ] แจ้งเตือนเมื่อค่าใช้จ่ายสูงกว่าเดือนเดียวกันของปีก่อน 20%

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `buildings` | อาคาร | id, name, floors, area_sqm, year_built |
| `rooms` | ห้อง | id, code, building_id, floor, capacity, type, status |
| `room_bookings` | การจองห้อง | id, room_id, booked_by, start_time, end_time, purpose |
| `vehicles` | ยานพาหนะ | id, plate_no, type, capacity, status, insurance_exp |
| `vehicle_requests` | ขอใช้ยานพาหนะ | id, requester_id, vehicle_id, driver_id, travel_date |
| `assets` | ครุภัณฑ์ | id, asset_code, name, type, value, location, custodian_id, status |
| `maintenance_requests` | แจ้งซ่อม | id, ref_type, ref_id, description, urgency, status |
| `utility_records` | สาธารณูปโภค | id, building_id, type, month, year, amount |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `RoomBookedEvent` | จองห้องสำเร็จ | document (log) |
| `VehicleAssignedEvent` | assign ยานพาหนะ | document (log) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `AssetReceivedEvent` | procurement | สร้าง asset record |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department |
| hr | sync (read) | ข้อมูลผู้ขอใช้, custodian |
| MinIO | infra | แผนผัง, รูปถ่ายแจ้งซ่อม |
