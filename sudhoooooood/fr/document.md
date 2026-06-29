# Functional Requirements — Document & Archive

**Module:** `document`  
**Schema:** `document`  
**Phase:** Phase 1  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Secretary (เลขานุการ) | รับ-ส่งหนังสือ ออกเลขที่ จัดเก็บ |
| All Staff | รับหนังสือที่เกี่ยวข้อง ส่งหนังสือออก |
| Dean / Head | ลงนามเอกสาร |
| Archive Officer | จัดการเอกสารเก่า ทำลายเอกสารตามระยะเวลา |

---

## Functional Requirements

### FR-DOC-001: รับหนังสือเข้า (Inbound Document)

**As a** Secretary  
**I want to** บันทึกหนังสือเข้าและ route ไปยังผู้รับผิดชอบ  
**So that** ไม่มีหนังสือตกหล่น และทุกคนรับทราบหนังสือที่เกี่ยวข้อง

**Acceptance Criteria:**
- [ ] บันทึก: เลขที่หนังสือเข้า, จาก, ถึง, เรื่อง, วันที่รับ, ความเร่งด่วน, ประเภท
- [ ] Scan แนบไฟล์ PDF (MinIO)
- [ ] Route หนังสือให้ผู้รับผิดชอบ — แจ้งเตือนผ่าน email/notification
- [ ] ติดตาม status: รับแล้ว → กำลังดำเนินการ → เสร็จสิ้น

---

### FR-DOC-002: ส่งหนังสือออก (Outbound Document)

**As a** Secretary / Staff  
**I want to** ออกหนังสือราชการโดยได้รับเลขที่อัตโนมัติ  
**So that** หนังสือออกมีเลขที่ถูกต้องและไม่ซ้ำกัน

**Acceptance Criteria:**
- [ ] Generate เลขที่หนังสือออกอัตโนมัติ: `ที่ {คณะ}/{ปี}/{ลำดับ}`
- [ ] Draft → ลงนาม (คณบดี/หัวหน้า) → ส่ง
- [ ] Template หนังสือราชการ (Word merge หรือ PDF template)
- [ ] บันทึกประวัติการส่ง: ส่งทาง e-Document, ไปรษณีย์, มือ

---

### FR-DOC-003: จัดการคำสั่ง/ประกาศ (Decree & Announcement)

**As a** Secretary  
**I want to** ออกคำสั่ง ประกาศ ระเบียบ ของคณะ  
**So that** มี document control ที่ชัดเจน

**Acceptance Criteria:**
- [ ] ประเภทเอกสาร: คำสั่ง, ประกาศ, ระเบียบ, แนวปฏิบัติ
- [ ] Generate เลขที่อัตโนมัติแยกตาม type
- [ ] เผยแพร่บน portal ของคณะ (notify all staff)
- [ ] Subscribe events จาก module อื่นที่ต้องออกคำสั่ง:
  - `CurriculumApprovedEvent` → ออกประกาศหลักสูตร
  - `ContractSignedEvent` → เก็บสัญญา
  - `PaymentProcessedEvent` → เก็บหลักฐานการจ่าย

---

### FR-DOC-004: จัดเก็บและค้นหาเอกสาร (Document Archive & Search)

**As a** Staff  
**I want to** ค้นหาเอกสารเก่าได้รวดเร็ว  
**So that** ไม่ต้องเสียเวลาค้นหาในกล่องเอกสาร

**Acceptance Criteria:**
- [ ] ค้นหาได้ด้วย: เลขที่, เรื่อง, วันที่, ประเภท, ผู้ลงนาม, keyword ในเนื้อหา (full-text search)
- [ ] Tag เอกสารตาม department, project, fiscal year
- [ ] Download PDF ต้นฉบับ (ต้องมีสิทธิ์ตาม OPA)
- [ ] บันทึก access log: ใครเปิดเอกสารนี้เมื่อไร

---

### FR-DOC-005: การทำลายเอกสาร (Document Disposal)

**As an** Archive Officer  
**I want to** จัดทำรายการเอกสารที่ครบกำหนดทำลาย  
**So that** ดำเนินการทำลายเอกสารถูกต้องตามระเบียบ

**Acceptance Criteria:**
- [ ] กำหนด retention period ต่อประเภทเอกสาร (เช่น 5 ปี, 10 ปี, ถาวร)
- [ ] ระบบแจ้งเตือนเอกสารที่ครบกำหนดทำลาย
- [ ] Archive Officer จัดทำ disposal list → Dean อนุมัติ → บันทึกการทำลาย
- [ ] บันทึกประวัติการทำลาย (audit trail ถาวร)

---

### FR-DOC-006: เอกสารจาก Module อื่น (Cross-module Documents)

**As a** the system  
**I want to** รวบรวม document ที่ module อื่น generate ไว้ใน document repository  
**So that** มี single source of truth สำหรับเอกสารทั้งหมดของคณะ

**Acceptance Criteria:**
- [ ] Subscribe events พร้อม file reference: `ContractSignedEvent`, `PaymentProcessedEvent`, `CurriculumApprovedEvent`
- [ ] สร้าง document record และ link ไปยังไฟล์ใน MinIO โดยอัตโนมัติ
- [ ] Tag อัตโนมัติตาม event type และ source module

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `inbound_documents` | หนังสือเข้า | id, doc_number, from, to, subject, received_date, urgency, file_url |
| `outbound_documents` | หนังสือออก | id, doc_number, subject, signed_by, sent_date, method |
| `decrees` | คำสั่ง/ประกาศ | id, doc_number, type, title, signed_by, issued_date, file_url |
| `document_routes` | การ route หนังสือ | doc_id, recipient_id, status, action_date |
| `document_tags` | tag เอกสาร | doc_id, tag_type, tag_value |
| `disposal_records` | บันทึกการทำลาย | id, doc_ids[], approved_by, disposal_date |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| — | — | — |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `CurriculumApprovedEvent` | academic | ออกประกาศหลักสูตร |
| `ContractSignedEvent` | procurement | เก็บสัญญา |
| `PaymentProcessedEvent` | finance | เก็บหลักฐานการจ่าย |
| `StaffOnboardedEvent` | hr | สร้างแฟ้มประวัติ |
| `RoomBookedEvent` | facility | log การใช้ห้อง |
| `VehicleAssignedEvent` | facility | log การใช้ยานพาหนะ |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department |
| MinIO | infra | เก็บไฟล์เอกสารทั้งหมด |
