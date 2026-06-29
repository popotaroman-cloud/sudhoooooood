# Functional Requirements — Data Services, Credential & Classroom Scheduling (งานโฟลเดอร์ 3)

**Modules:** `data-services` · `credential` · `classroom-scheduling`
**Schemas:** `dataservices` · `credential` · `scheduling`
**Phase:** 2–4 (ต่อยอดจาก core modules — depend on shared-kernel, hr, academic, facility)
**อ้างอิงโครงสร้างเดิม:** [../architecture.md](../architecture.md) · [../overview.md](../overview.md) · [../feasibility study.md](../feasibility%20study.md)

> เอกสารนี้แตก **Functional Requirements** ของงานในโฟลเดอร์ 3 ทั้ง 3 ส่วน ตามรูปแบบเดียวกับ `fr/*.md` เดิม และยึดกฎ Modular Monolith (M/C/D/B/O/E) ของสถาปัตยกรรมเดิม — โดยเฉพาะ **M-02 (ห้าม cross-module DB query)** ซึ่งเป็นหัวใจของงาน "ทลาย data silo" ด้วย event-driven read model แทนการ query ข้าม schema

---

## ภาพรวมงาน 3 ส่วน

| ส่วน | Module | หน้าที่ | FR prefix |
|---|---|---|---|
| A | `data-services` | ศูนย์บริการข้อมูลกลาง — รวมข้อมูลข้าม module ผ่าน event เพื่อทลาย data silo | FR-DSC |
| B | `credential` | ออก/ตรวจสอบ credential — บัญชี, บัตรดิจิทัล, ใบรับรองลงนามดิจิทัล | FR-CRED |
| C | `classroom-scheduling` | จัดตารางเรียน/สอบ + จองห้อง โดยตรวจการชนกัน | FR-CLS |

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Data Steward | กำกับ data catalog, lineage, retention ของข้อมูลกลาง |
| Report / QA Officer | ดึง dataset ไปทำรายงาน/SAR (ผ่าน planning) |
| Credential Admin | จัดการ template + ออก/เพิกถอน credential และใบรับรอง |
| Scheduling Admin | จัดตารางเรียน, ตารางสอบ, จองห้อง |
| Faculty (อาจารย์) | ดูตารางสอน, รับ credential/ใบรับรอง |
| Student | รับบัตรดิจิทัล, ใบรับรอง, ดูตารางเรียน/สอบ |
| External Verifier | ตรวจสอบความถูกต้องของ credential ผ่าน API สาธารณะ |
| All Modules | ส่ง domain event ให้ data-services และเรียก credential/scheduling ผ่าน public API |

---

# A. Data Services Center (`data-services`, schema `dataservices`)

> เป้าหมาย: ให้มี **จุดเข้าถึงข้อมูลข้ามหน่วยงานจุดเดียว** โดย **ไม่ละเมิดกฎ M-02** — ไม่ query ข้าม schema ของ module อื่น แต่สร้าง read model ของตัวเองจาก domain event (CQRS read-side) แล้วบังคับสิทธิ์ด้วย OPA

## Functional Requirements

### FR-DSC-001: ทะเบียนข้อมูลกลาง (Data Product Catalog)

**As a** Data Steward
**I want to** ลงทะเบียน data product ของแต่ละ module พร้อม metadata
**So that** ค้นหาและกำกับข้อมูลข้ามหน่วยงานได้ ลดการเก็บข้อมูลซ้ำซ้อน (data silo)

**Acceptance Criteria:**
- [ ] Catalog entry มี: `dataset_code`, `owner_module`, `description`, `fields[]`, `sensitivity (public/internal/sensitive)`, `refresh_mode`
- [ ] ค้นหา dataset ตาม module / หมวด / ระดับความอ่อนไหวได้
- [ ] ทุก dataset ผูก `owner_module` ชัดเจน — เคารพ ownership ตามกฎ D-02 (เจ้าของข้อมูลคือ module ต้นทาง)
- [ ] sensitive dataset ต้องประกาศ masking rule + retention (เชื่อม FR-DSC-006)

---

### FR-DSC-002: Read Model รวมข้ามหน่วยงาน (CQRS read-side)

**As a** the system
**I want to** สร้าง read model แบบ denormalized จาก domain event ของทุก module
**So that** ทำรายงานข้ามหน่วยงานได้โดยไม่ต้อง query ข้าม schema (ไม่ละเมิด M-02)

**Acceptance Criteria:**
- [ ] subscribe domain event หลัก (เช่น `StaffOnboardedEvent`, `EnrollmentConfirmedEvent`, `BudgetAllocatedEvent`, `GradesPublishedEvent`) → update read model ใน schema `dataservices`
- [ ] **ไม่มี SQL ที่ query ตารางของ schema อื่น** — อ่านจาก read model ของตัวเองเท่านั้น (บังคับด้วย ArchUnit/Deptrac)
- [ ] read model สามารถ rebuild ได้จากการ replay event (idempotent ด้วย `event_id`)
- [ ] reference ไป entity ของ module อื่นเก็บเป็น ID เท่านั้น (กฎ D-03)

---

### FR-DSC-003: Unified Data Access API + OPA enforcement

**As a** any authorized consumer
**I want to** query ข้อมูลรวมผ่าน API เดียวพร้อมการบังคับสิทธิ์
**So that** ไม่ต้องต่อหลาย module และได้เฉพาะข้อมูลที่มีสิทธิ์เห็น

**Acceptance Criteria:**
- [ ] `GET /api/data/datasets/{code}/query` รองรับ filter, sort, paging
- [ ] OPA บังคับ row-level filter + data masking ตาม role (กฎ O-01, O-03)
- [ ] sensitive field (เงินเดือน, เกรด, ข้อมูลสุขภาพ) ถูก mask เว้นแต่ role มีสิทธิ์โดยตรง
- [ ] response เป็น DTO เท่านั้น ไม่ส่ง entity (กฎ C-03)

---

### FR-DSC-004: Event Ingestion Pipeline (ETL)

**As a** the system
**I want to** รับ event จาก message bus แล้ว transform เข้าสู่ read model
**So that** ข้อมูลในศูนย์บริการข้อมูลสดใหม่ใกล้ real-time

**Acceptance Criteria:**
- [ ] consumer เป็น idempotent — event ซ้ำไม่ทำให้ข้อมูลซ้ำ (กฎ B-03 / dedup ด้วย `event_id`)
- [ ] มี retry + dead-letter queue เมื่อ transform ล้มเหลว
- [ ] เวลาตั้งแต่รับ event ถึง query ได้ < 1 นาที (เป้าหมาย)
- [ ] บันทึก ingestion log ทุก event ที่ประมวลผล

---

### FR-DSC-005: Export Dataset & Reporting Feed

**As a** Report / QA Officer
**I want to** export dataset เป็นไฟล์หรือ feed API
**So that** Planning module นำไปทำ KPI / SAR ได้อัตโนมัติ

**Acceptance Criteria:**
- [ ] export CSV / Excel / JSON พร้อม PDPA masking ตาม role ผู้ขอ
- [ ] feed API ให้ `planning` ดึงข้อมูล KPI / ประกันคุณภาพ
- [ ] บันทึก export log: ใคร / ดึง dataset ใด / เมื่อไร
- [ ] Publish `DatasetRefreshedEvent` → planning เมื่อ read model สำคัญถูก update

---

### FR-DSC-006: Data Lineage & Governance Audit

**As a** Data Steward
**I want to** ติดตามที่มาของข้อมูลแต่ละ record และกำกับ retention
**So that** ตรวจสอบความถูกต้องและสอดคล้อง PDPA

**Acceptance Criteria:**
- [ ] แต่ละ record ใน read model อ้าง `source_event`, `source_module`, `ingested_at`
- [ ] กำหนด retention policy ต่อ dataset (ลบ/anonymize เมื่อครบกำหนด — PDPA)
- [ ] รายงาน lineage: dataset นี้ประกอบจาก event/module ใดบ้าง

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `data_catalog` | ทะเบียน data product | dataset_code, owner_module, sensitivity, refresh_mode |
| `read_models` | ตารางรวมข้อมูล (denormalized ต่อ dataset) | dataset_code, entity_id, payload, source_event |
| `ingestion_log` | บันทึก event ที่ประมวลผล | event_id, source_module, status, ingested_at |
| `export_log` | บันทึกการ export | dataset_code, requested_by, format, created_at |
| `data_lineage` | ที่มาของข้อมูล | dataset_code, source_module, source_event |

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| — (data-services ทำงานแบบ event-driven ไม่มี approval workflow) | — | — |

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `DatasetRefreshedEvent` | read model สำคัญถูก update | planning |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOnboardedEvent` / `StaffOffboardedEvent` | hr | update read model บุคลากร |
| `BudgetAllocatedEvent` | finance | update read model งบประมาณ |
| `EnrollmentConfirmedEvent` | academic | update read model การลงทะเบียน |
| `GradesPublishedEvent` | academic | update read model ผลการเรียน |
| `PublicationAddedEvent` | research | update read model ผลงานวิจัย |

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | user, department, academic unit, fiscal year |
| message bus | infra | รับ domain event จากทุก module (ทางเดียวที่อ่านข้อมูล module อื่น) |
| OPA | infra | บังคับ row-level filter + masking |
| planning | event | ส่ง dataset/feed ไปทำ KPI/QA |

> **ข้อบังคับสำคัญ:** data-services **ห้าม** query ตารางของ module อื่นโดยตรง (M-02) — ทุกข้อมูลเข้าผ่าน event เท่านั้น นี่คือวิธี "ทลาย data silo" โดยไม่ทำลายขอบเขต module

---

# B. Credential Generation (`credential`, schema `credential`)

> เป้าหมาย: ออกและตรวจสอบ credential ทุกชนิด — credential บัญชีเริ่มต้น, บัตรประจำตัวดิจิทัล, และใบรับรองลงนามดิจิทัล — โดยทำงานร่วมกับ auth, hr, document และ MinIO

## Functional Requirements

### FR-CRED-001: ออก credential บัญชีเริ่มต้นเมื่อรับเข้า

**As an** Auth / IT system
**I want to** สร้าง credential เริ่มต้น (username + activation link) เมื่อมีบุคลากร/นักศึกษาใหม่
**So that** ผู้ใช้เปิดใช้งานบัญชีได้อย่างปลอดภัย

**Acceptance Criteria:**
- [ ] subscribe `StaffOnboardedEvent` → gen credential + ส่ง activation link ทาง email (ใช้ครั้งเดียว, หมดอายุ)
- [ ] บังคับเปลี่ยนรหัสผ่านครั้งแรก ตามนโยบายความปลอดภัย
- [ ] ไม่เก็บรหัสผ่านเป็น plaintext — ส่งผ่านช่องทางปลอดภัยเท่านั้น
- [ ] idempotent ต่อ event ซ้ำ (กฎ B-03)

---

### FR-CRED-002: บัตรประจำตัวดิจิทัล (Digital ID / QR credential)

**As a** staff / student
**I want to** ได้รับบัตรประจำตัวดิจิทัลแบบ QR
**So that** ใช้ยืนยันตัวตนเข้าอาคาร/ห้องเรียนได้

**Acceptance Criteria:**
- [ ] gen QR credential ผูกกับ `user_id` + role + หน่วยงาน (อ้างด้วย ID, กฎ D-03)
- [ ] QR ตรวจสอบได้ผ่าน verification API (FR-CRED-005)
- [ ] credential หมดอายุอัตโนมัติตามสถานะการเป็นบุคลากร/นักศึกษา

---

### FR-CRED-003: ออกใบรับรองลงนามดิจิทัล (Verifiable Certificate)

**As an** Credential Admin
**I want to** ออกใบรับรอง (เช่น หนังสือรับรองการเป็นนักศึกษา, ใบรับรองการอบรม) แบบลงนามดิจิทัล
**So that** เอกสารตรวจสอบความถูกต้องได้และป้องกันการปลอมแปลง

**Acceptance Criteria:**
- [ ] gen เอกสารจาก template (FR-CRED-004) + ข้อมูลจาก data-services / shared-kernel
- [ ] ลงนามดิจิทัล (digital signature) + เลขที่เอกสารไม่ซ้ำ
- [ ] เก็บไฟล์ลง MinIO และอ้างอิงใน `document` module หากเป็นหนังสือราชการ
- [ ] เอกสารทางการต้องผ่านการอนุมัติด้วย BPMN (`certificate-approval.bpmn`) ก่อนออก (กฎ B-01)
- [ ] Publish `CredentialIssuedEvent` → document, it-admin

---

### FR-CRED-004: จัดการ template ของ credential

**As an** Credential Admin
**I want to** จัดการ template ของ credential/certificate
**So that** ปรับรูปแบบเอกสารได้โดยไม่ต้องแก้โค้ด

**Acceptance Criteria:**
- [ ] CRUD template พร้อม field แบบ dynamic, โลโก้, ตำแหน่งลายเซ็น
- [ ] version template + เลือก active version
- [ ] preview เอกสารก่อน publish

---

### FR-CRED-005: API ตรวจสอบความถูกต้องของ credential

**As an** External Verifier
**I want to** ตรวจสอบ credential จาก QR หรือเลขที่เอกสาร
**So that** ยืนยันว่าเอกสาร/บัตรเป็นของจริง

**Acceptance Criteria:**
- [ ] `GET /api/credential/verify/{code}` → สถานะ (`valid` / `expired` / `revoked`) + ข้อมูลย่อ (masked)
- [ ] ตรวจ signature ด้วย public key
- [ ] ไม่เปิดเผยข้อมูล sensitive เกินจำเป็น (PDPA, กฎ O-03)

---

### FR-CRED-006: วงจรชีวิต credential (เพิกถอน / ต่ออายุ / ออกใหม่)

**As an** Credential Admin
**I want to** เพิกถอน, ต่ออายุ, หรือออก credential ใหม่
**So that** จัดการสถานะ credential ได้ตลอดอายุการใช้งาน

**Acceptance Criteria:**
- [ ] subscribe `StaffOffboardedEvent` → revoke credential ทั้งหมดของผู้นั้นทันที
- [ ] reissue สร้างเลขที่ใหม่ + invalidate ตัวเก่า
- [ ] บันทึกเหตุผลการเพิกถอน
- [ ] Publish `CredentialRevokedEvent` → auth, it-admin

---

### FR-CRED-007: Audit การออก credential + PDPA

**As an** Credential Admin
**I want to** ดู log การออก/เพิกถอน credential ทั้งหมด
**So that** ตรวจสอบย้อนหลังและ comply PDPA

**Acceptance Criteria:**
- [ ] บันทึก: ผู้ออก, ประเภท credential, ผู้รับ, เวลา, ผลลัพธ์
- [ ] retention policy + masking PII ใน log
- [ ] ค้นหา log ตามผู้รับ / ประเภท / ช่วงเวลาได้

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `credentials` | credential ที่ออกแล้ว | id, type, holder_user_id, serial_no, status, issued_at, expires_at |
| `credential_templates` | template เอกสาร | id, type, version, fields, signature_block, status |
| `issuance_log` | บันทึกการออก/เพิกถอน | credential_id, action, actor_id, reason, created_at |
| `verifications` | บันทึกการตรวจสอบ | credential_id, verifier, result, verified_at |

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| อนุมัติออกใบรับรองทางการ | `certificate-approval.bpmn` | Credential Admin → หัวหน้าหน่วยงาน → ผู้มีอำนาจลงนาม |

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `CredentialIssuedEvent` | ออก credential/ใบรับรองสำเร็จ | document, it-admin |
| `CredentialRevokedEvent` | เพิกถอน credential | auth, it-admin |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOnboardedEvent` | hr | gen credential บัญชีเริ่มต้น |
| `StaffOffboardedEvent` | hr | revoke credential ทั้งหมด |
| `EnrollmentConfirmedEvent` | academic | ออกบัตรนักศึกษาดิจิทัล (ถ้าตั้งค่า) |

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | user, department, role |
| auth / Keycloak | sync | ผูก credential บัญชีกับ account |
| hr | event | รับ onboarding/offboarding |
| document | sync (write via API) | จัดเก็บหนังสือราชการที่ออก |
| data-services | sync (read) | ดึงข้อมูลประกอบเนื้อหาใบรับรอง |
| MinIO | infra | เก็บไฟล์เอกสาร |
| BPMN Engine | orchestration | certificate-approval |

---

# C. Classroom Scheduling (`classroom-scheduling`, schema `scheduling`)

> เป้าหมาย: เป็น **เครื่องมือจัดตารางและจองห้องเฉพาะทาง** ที่ตรวจการชนกันของห้อง/อาจารย์/กลุ่มเรียน โดยดึง section จาก academic, ห้องจาก facility, และอาจารย์จาก hr — academic เรียกใช้บริการนี้ในการจัดตารางสอน (FR-ACAD-004)

## Functional Requirements

### FR-CLS-001: ทะเบียนทรัพยากรที่จัดตารางได้ (ห้อง + คาบเวลา)

**As a** Scheduling Admin
**I want to** กำหนดห้องและกริดคาบเวลาที่ใช้จัดตารางได้ โดย sync ห้องจาก facility
**So that** มีฐานข้อมูลห้อง/คาบที่ถูกต้องและไม่ซ้ำซ้อนกับ facility

**Acceptance Criteria:**
- [ ] sync รายการห้องจาก `FacilityService` (read) — อ้างด้วย `room_id` ไม่ copy ownership (กฎ D-03)
- [ ] กำหนด time-slot grid: วันในสัปดาห์, คาบ, ความยาวคาบ
- [ ] ห้องมี attribute: `capacity`, `type (lecture/lab)`, `equipment`

---

### FR-CLS-002: จัดตารางเรียน/สอน + ตรวจการชนกัน

**As a** Scheduling Admin
**I want to** จัดตารางต่อภาคการศึกษาโดยตรวจ conflict
**So that** ไม่มีห้อง/อาจารย์/กลุ่มนักศึกษาซ้ำซ้อนในเวลาเดียวกัน

**Acceptance Criteria:**
- [ ] รับรายการ section จาก academic (`course_id`, `instructor_id`, `group`, `capacity`)
- [ ] ตรวจ conflict 3 แบบ: ห้องซ้ำ, อาจารย์ซ้ำ, กลุ่มนักศึกษาซ้ำ
- [ ] บันทึก schedule entry: `section_id`, `room_id`, `day`, `time_start`, `time_end`
- [ ] ปฏิเสธการบันทึกที่ชนกัน พร้อมแจ้งสาเหตุ

---

### FR-CLS-003: ตรวจห้องว่างและจองห้อง

**As a** the system
**I want to** ตรวจห้องว่างและจองห้องสำหรับคาบเรียน
**So that** การใช้ห้องไม่ทับซ้อนกับการจองอื่น

**Acceptance Criteria:**
- [ ] เรียก `FacilityService.checkRoomAvailability(room_id, slot)` ก่อน assign
- [ ] จองห้อง (hold) เมื่อ assign สำเร็จ และปล่อยเมื่อยกเลิก
- [ ] กันชนกับการจองนอกตาราง (ประชุม/กิจกรรม) ที่มาจาก facility
- [ ] Publish `RoomBookedEvent` → facility (ยืนยันการใช้ห้องตามตาราง)

---

### FR-CLS-004: ตรวจอาจารย์ว่างและภาระงานสอน

**As a** Scheduling Admin
**I want to** ตรวจว่าอาจารย์ว่างและไม่เกินภาระงานสอน
**So that** ไม่จัดเกินเพดานและไม่ชนเวลา

**Acceptance Criteria:**
- [ ] เรียก `HRService.getFacultyById(id)` ตรวจสถานะ active
- [ ] ตรวจ teaching load รวมต่อสัปดาห์ไม่เกินเพดานที่กำหนด
- [ ] เคารพช่วงเวลาที่อาจารย์ไม่ว่าง (ลา/ประชุม) หากมีข้อมูล

---

### FR-CLS-005: ผู้ช่วยจัดตารางอัตโนมัติ (Auto-scheduling)

**As a** Scheduling Admin
**I want to** ให้ระบบเสนอตารางที่หลีกเลี่ยง conflict โดยอัตโนมัติ
**So that** ลดเวลาจัดตารางด้วยมือ

**Acceptance Criteria:**
- [ ] เสนอ slot/ห้องที่ว่างให้แต่ละ section ตามข้อจำกัด
- [ ] จัดลำดับความสำคัญ: ความจุพอ, ประเภทห้องตรง, ลดช่องว่างในตาราง
- [ ] admin ยืนยัน/ปรับก่อน publish (human-in-the-loop)

---

### FR-CLS-006: เผยแพร่ตารางและแจ้งเตือน

**As a** Scheduling Admin
**I want to** เผยแพร่ตารางและส่งให้ผู้เกี่ยวข้อง
**So that** อาจารย์และนักศึกษาทราบตารางที่เป็นปัจจุบัน

**Acceptance Criteria:**
- [ ] export ตารางเป็น PDF / iCal
- [ ] Publish `TimetablePublishedEvent` → academic, student, facility
- [ ] แจ้งเตือนผู้เกี่ยวข้องเมื่อตารางเปลี่ยนแปลง

---

### FR-CLS-007: จัดตารางสอบและกิจกรรมพิเศษ

**As a** Scheduling Admin
**I want to** จัดตารางสอบกลางภาค/ปลายภาคโดยใช้ห้องร่วมกับตารางเรียน
**So that** ตารางสอบไม่ชนกับคาบเรียนปกติ

**Acceptance Criteria:**
- [ ] ตรวจ conflict ของตารางสอบกับตารางเรียนและการจองห้องอื่น
- [ ] รองรับห้องสอบความจุพิเศษ + การจัดผู้คุมสอบ
- [ ] Publish `ExamScheduledEvent` → student, facility

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `schedulable_rooms` | ห้องที่ใช้จัดตาราง (ref จาก facility) | room_id, capacity, type, equipment |
| `time_slots` | กริดคาบเวลา | id, day_of_week, period, time_start, time_end |
| `schedule_entries` | รายการตารางเรียน | id, section_id, room_id, slot_id, term_id |
| `room_bookings` | การจองห้องตามตาราง | id, room_id, slot_id, source (class/exam) |
| `exam_schedules` | ตารางสอบ | id, course_id, room_id, slot_id, proctor_id |
| `instructor_load` | ภาระงานสอนต่ออาจารย์ | instructor_id, term_id, total_hours |

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| อนุมัติเผยแพร่ตาราง (ถ้าคณะกำหนด) | `timetable-approval.bpmn` | Scheduling Admin → หัวหน้าภาควิชา → รองคณบดีวิชาการ |

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `RoomBookedEvent` | จองห้องตามตารางสำเร็จ | facility |
| `TimetablePublishedEvent` | เผยแพร่ตาราง | academic, student, facility |
| `ExamScheduledEvent` | จัดตารางสอบสำเร็จ | student, facility |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOffboardedEvent` | hr | ปลดอาจารย์ออกจากตาราง + คืนคาบ |
| `RoomStatusChangedEvent` | facility | ปรับตารางเมื่อห้องปิดปรับปรุง |

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | user, academic unit |
| academic | sync (read) | รับ section/course ที่ต้องจัดตาราง |
| facility | sync (read) + event | ตรวจ/จองห้อง, รับสถานะห้อง |
| hr | sync (read) | ตรวจอาจารย์ active + ภาระงาน |
| BPMN Engine | orchestration | timetable-approval (ถ้าใช้) |

---

## ภาคผนวก — การปฏิบัติตามกฎ Modular Monolith เดิม

| กฎเดิม | ใจความ | งานในไฟล์นี้ปฏิบัติอย่างไร |
|---|---|---|
| M-01 | ห้ามเรียก internal ของ module อื่น | เรียกผ่าน public API (`HRService`, `FacilityService`) เท่านั้น |
| M-02 | ห้าม cross-module DB query | data-services อ่านข้อมูลผ่าน **event → read model** ไม่ query ข้าม schema |
| C-02 | side effect ข้าม module ใช้ event | credential/scheduling publish event แทนการเรียกตรง |
| C-03 / D-03 | DTO ข้าม boundary, reference ด้วย ID | ทุก API คืน DTO และอ้าง entity อื่นด้วย ID |
| B-01/B-03 | workflow หลายขั้นใช้ BPMN, worker idempotent | certificate-approval, timetable-approval; consumer dedup ด้วย event_id |
| O-01/O-03 | authz ใน OPA, data masking | data access API + credential verify บังคับผ่าน OPA + masking PII |
| E-01 | พร้อม extract เป็น microservice | แต่ละ module มี schema + public API + event ของตัวเอง |

> เอกสารนี้ยึดรูปแบบจาก `fr/*.md` และกฎจาก [../architecture.md](../architecture.md) — เมื่อโครงสร้างเดิมเปลี่ยน ให้ปรับ FR ที่ผูกกับกฎในภาคผนวกตามไปด้วย
