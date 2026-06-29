# Functional Requirements — IT Admin

**Module:** `it-admin`  
**Schema:** `it`  
**Phase:** Phase 3  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| IT Admin | จัดการ account, สิทธิ์, อุปกรณ์, ระบบ |
| Staff / Faculty | ขอใช้บริการ IT, แจ้งปัญหา |
| Head of Department | อนุมัติคำขอซอฟต์แวร์/อุปกรณ์ |

---

## Functional Requirements

### FR-IT-001: Account Provisioning

**As an** IT Admin  
**I want to** สร้าง account และสิทธิ์ที่จำเป็นสำหรับบุคลากรใหม่อัตโนมัติ  
**So that** บุคลากรพร้อมทำงานได้ทันทีในวันแรก

**Acceptance Criteria:**
- [ ] Subscribe `StaffOnboardedEvent` → สร้าง account: Email, Wi-Fi, VPN, ระบบที่เกี่ยวข้อง
- [ ] Role mapping: ประเภทบุคลากร → ชุดสิทธิ์เริ่มต้น (template)
- [ ] Checklist provisioning: tick แต่ละรายการเมื่อเสร็จ
- [ ] แจ้ง HR และบุคลากรใหม่เมื่อ account พร้อมใช้

---

### FR-IT-002: Account Deprovisioning

**As an** IT Admin  
**I want to** revoke access ทั้งหมดเมื่อบุคลากรพ้นจากตำแหน่ง  
**So that** ป้องกัน unauthorized access หลังออกจากงาน

**Acceptance Criteria:**
- [ ] Subscribe `StaffOffboardedEvent` → disable account ทั้งหมดภายใน 4 ชั่วโมง
- [ ] Checklist: Email, Wi-Fi, VPN, Keycloak, ระบบภายใน
- [ ] Archive data ของบุคลากรตาม data retention policy (90 วัน)
- [ ] รายงาน deprovisioning completion ให้ HR ยืนยัน

---

### FR-IT-003: จัดการสิทธิ์เพิ่มเติม (Permission Request)

**As a** Staff  
**I want to** ขอสิทธิ์เข้าถึงระบบหรือข้อมูลเพิ่มเติม  
**So that** ทำงานได้โดยไม่ต้องขอผ่านกระดาษ

**Acceptance Criteria:**
- [ ] ยื่นคำขอ: ระบบที่ต้องการ, ระดับสิทธิ์, เหตุผล, ระยะเวลา
- [ ] หัวหน้าอนุมัติ → IT Admin ดำเนินการ
- [ ] สิทธิ์ชั่วคราว: กำหนดวันหมดอายุ ระบบ revoke อัตโนมัติ
- [ ] Audit log ทุกการ grant/revoke สิทธิ์

---

### FR-IT-004: จัดการอุปกรณ์ IT (Hardware Inventory)

**As an** IT Admin  
**I want to** บันทึกและติดตามอุปกรณ์ IT ทั้งหมดของคณะ  
**So that** ทราบสถานะและที่อยู่ของอุปกรณ์ทุกชิ้น

**Acceptance Criteria:**
- [ ] อุปกรณ์มี: serial number, type, brand/model, assigned_to, location, purchase_date, warranty_exp
- [ ] บันทึกการ assign/unassign อุปกรณ์ให้บุคลากร
- [ ] แจ้งเตือนเมื่อ warranty ใกล้หมด (30 วัน)
- [ ] ตรวจนับอุปกรณ์ประจำปีพร้อมบันทึกผล

---

### FR-IT-005: จัดการ Software License

**As an** IT Admin  
**I want to** ติดตาม license ซอฟต์แวร์ทั้งหมดของคณะ  
**So that** ใช้งาน software ไม่เกิน license และต่อ license ทันเวลา

**Acceptance Criteria:**
- [ ] License มี: ชื่อซอฟต์แวร์, vendor, จำนวน seat, วันหมดอายุ, ราคา
- [ ] แจ้งเตือน 60, 30 วัน ก่อน license หมดอายุ
- [ ] นับ active usage เทียบกับ seat ที่มี
- [ ] รายงาน license compliance ประจำปี

---

### FR-IT-006: IT Helpdesk (Service Request & Incident)

**As a** Staff / Faculty  
**I want to** แจ้งปัญหา IT หรือขอบริการผ่านระบบ  
**So that** ได้รับการแก้ไขอย่างรวดเร็วและติดตาม status ได้

**Acceptance Criteria:**
- [ ] ประเภท ticket: Incident (ระบบพัง), Service Request (ขอบริการใหม่), Change Request
- [ ] Priority: Critical (< 1 ชม.), High (< 4 ชม.), Medium (< 1 วัน), Low (< 3 วัน)
- [ ] Assign to IT Admin แจ้ง SLA countdown
- [ ] แจ้งเตือนผู้แจ้งเมื่อ status เปลี่ยน
- [ ] ผู้แจ้งให้คะแนนความพึงพอใจเมื่อ ticket ปิด
- [ ] รายงาน SLA compliance รายเดือน

---

### FR-IT-007: ตรวจสอบการใช้งานระบบ (System Monitoring)

**As an** IT Admin  
**I want to** ดูสถานะและ health ของระบบทั้งหมดในที่เดียว  
**So that** ตรวจพบปัญหาก่อนที่ผู้ใช้จะแจ้ง

**Acceptance Criteria:**
- [ ] แสดง health check status ของทุก module (`/health` endpoint)
- [ ] Alert เมื่อ service down หรือ response time > threshold
- [ ] Dashboard: CPU, Memory, Disk, Network ของ server
- [ ] เชื่อม Prometheus + Grafana สำหรับ long-term metrics

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `it_accounts` | account ของบุคลากร | id, employee_id, email, systems[], status |
| `permission_requests` | คำขอสิทธิ์ | id, requester_id, system, permission_level, expires_at, status |
| `hardware_assets` | อุปกรณ์ IT | id, serial_no, type, brand, assigned_to, location, warranty_exp |
| `software_licenses` | software license | id, name, vendor, seats, expires_at, cost |
| `license_usages` | การใช้งาน license | license_id, user_id, assigned_at, revoked_at |
| `helpdesk_tickets` | IT ticket | id, type, priority, title, requester_id, assignee_id, status |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `AccountProvisionedEvent` | provision เสร็จ | — (notify HR, staff) |
| `AccountRevokedEvent` | revoke เสร็จ | — (notify HR) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOnboardedEvent` | hr | provision account อัตโนมัติ |
| `StaffOffboardedEvent` | hr | revoke account อัตโนมัติ |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department |
| auth (Keycloak) | sync | provision/revoke Keycloak account |
