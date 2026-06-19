# Functional Requirements — Research

**Module:** `research`  
**Schema:** `research`  
**Phase:** Phase 3  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Researcher (อาจารย์/นักวิจัย) | ยื่นโครงการ, บันทึกผลงาน, ขอทุน |
| Research Committee | พิจารณาและอนุมัติทุนวิจัย |
| Research Admin | จัดการระบบ, ออกรายงาน |
| Vice Dean (Research) | อนุมัติขั้นสุดท้าย |
| Finance Admin | ดูงบวิจัย |

---

## Functional Requirements

### FR-RES-001: ยื่นโครงการวิจัย (Research Proposal)

**As a** Researcher  
**I want to** ยื่นข้อเสนอโครงการวิจัยออนไลน์  
**So that** ไม่ต้องใช้เอกสารกระดาษและติดตาม status ได้

**Acceptance Criteria:**
- [ ] โครงการมี: ชื่อ, abstract, researcher(s), timeline, งบประมาณ, แหล่งทุน, ประเภทวิจัย
- [ ] แนบเอกสาร proposal (MinIO)
- [ ] ระบุ Co-researcher จาก `HRService.getFacultyList()` (sync call)
- [ ] กระบวนการพิจารณาผ่าน BPMN (`research-grant-approval.bpmn`)

---

### FR-RES-002: กระบวนการอนุมัติทุนวิจัย (Grant Approval)

**As a** Research Committee  
**I want to** พิจารณาและอนุมัติโครงการวิจัยตามขั้นตอน  
**So that** การจัดสรรทุนวิจัยโปร่งใสและตรวจสอบได้

**Acceptance Criteria:**
- [ ] BPMN flow: Researcher ยื่น → Research Admin ตรวจสอบเบื้องต้น → กรรมการพิจารณา → Vice Dean อนุมัติ
- [ ] กรรมการบันทึกมติและเหตุผลในระบบ
- [ ] Publish `GrantApprovedEvent` → finance (เปิด budget line วิจัย)
- [ ] แจ้ง researcher ผ่าน email เมื่อได้รับการอนุมัติ/ปฏิเสธ พร้อมเหตุผล

---

### FR-RES-003: ติดตามความก้าวหน้าโครงการ (Project Progress Tracking)

**As a** Researcher  
**I want to** รายงานความก้าวหน้าของโครงการตามระยะเวลา  
**So that** Research Admin และผู้ให้ทุนรับทราบสถานะ

**Acceptance Criteria:**
- [ ] กำหนด milestone ของโครงการ
- [ ] Researcher submit progress report ตาม milestone
- [ ] แจ้งเตือนอัตโนมัติเมื่อ milestone ใกล้ถึง (30 วัน, 7 วัน)
- [ ] Research Admin approve progress report ก่อนส่งแหล่งทุน

---

### FR-RES-004: จัดการงบประมาณวิจัย (Research Budget)

**As a** Researcher  
**I want to** ดูงบประมาณที่ได้รับและยื่นเบิกจ่ายค่าใช้จ่ายวิจัย  
**So that** บริหารงบประมาณโครงการได้ถูกต้อง

**Acceptance Criteria:**
- [ ] เรียก `FinanceService.getBudgetBalance(budget_line_id)` ดูงบคงเหลือ (sync call)
- [ ] ยื่นใบเบิกค่าใช้จ่ายผ่านระบบ → Finance ดำเนินการจ่าย
- [ ] รายงาน burn rate ของแต่ละโครงการ
- [ ] แจ้งเตือนเมื่องบวิจัยคงเหลือต่ำกว่า 20%

---

### FR-RES-005: บันทึกผลงานวิชาการ (Publication Tracking)

**As a** Researcher  
**I want to** บันทึกผลงานตีพิมพ์และผลงานวิชาการ  
**So that** คณะมีฐานข้อมูลผลงานวิชาการสำหรับประเมิน KPI และรายงาน QA

**Acceptance Criteria:**
- [ ] ประเภทผลงาน: บทความวิจัย, บทความวิชาการ, หนังสือ/ตำรา, งานสร้างสรรค์, สิทธิบัตร, การนำเสนอ
- [ ] Journal ranking: Q1/Q2/Q3/Q4 หรือ TCI1/TCI2
- [ ] Researcher ยืนยันผลงานด้วย DOI หรือหลักฐาน
- [ ] Publish `PublicationAddedEvent` → planning (นับ KPI ผลงานวิชาการ)

---

### FR-RES-006: บริการวิชาการ (Academic Service)

**As a** Research Admin  
**I want to** บันทึกโครงการบริการวิชาการแก่สังคม  
**So that** คณะมีข้อมูลรายงาน QA ด้านบริการวิชาการ

**Acceptance Criteria:**
- [ ] โครงการบริการวิชาการมี: ชื่อ, กลุ่มเป้าหมาย, ระยะเวลา, งบประมาณ, ผลผลิต
- [ ] ผู้เข้าร่วมโครงการ (ทั้งภายในและภายนอก)
- [ ] Publish `AcademicServiceCompletedEvent` → planning (KPI บริการวิชาการ)

---

### FR-RES-007: รายงานวิจัย

**As a** Research Admin / Vice Dean  
**I want to** ออกรายงานสรุปผลงานวิจัยของคณะ  
**So that** นำเสนอต่อคณะกรรมการและหน่วยงานภายนอกได้

**Acceptance Criteria:**
- [ ] รายงาน: จำนวนโครงการ, งบวิจัยที่ได้รับ, ผลงานตีพิมพ์ตาม Q-rank, citation count
- [ ] กรองตาม: ปีงบประมาณ, researcher, แหล่งทุน, ประเภทผลงาน
- [ ] Export: PDF, Excel

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `research_projects` | โครงการวิจัย | id, title, pi_id, budget, source, start_date, end_date, status |
| `project_researchers` | นักวิจัยในโครงการ | project_id, researcher_id, role |
| `milestones` | milestone | id, project_id, name, due_date, status |
| `progress_reports` | รายงานความก้าวหน้า | id, project_id, milestone_id, submitted_at, status |
| `publications` | ผลงานวิชาการ | id, researcher_id, title, type, journal, year, doi, ranking |
| `academic_services` | บริการวิชาการ | id, name, target_group, start_date, end_date, budget |

---

## BPMN Processes

| Process | File | Participants |
|---|---|---|
| อนุมัติทุนวิจัย | `research-grant-approval.bpmn` | Researcher → Research Admin → Committee → Vice Dean |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `GrantApprovedEvent` | ทุนวิจัยได้รับอนุมัติ | finance (เปิด budget line) |
| `PublicationAddedEvent` | บันทึกผลงานตีพิมพ์ | planning (KPI) |
| `AcademicServiceCompletedEvent` | โครงการบริการสำเร็จ | planning (KPI) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| — | — | — |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, FiscalYear |
| hr | sync (read) | ข้อมูลนักวิจัย, PI |
| finance | sync (read) | ดูงบวิจัยคงเหลือ |
| MinIO | infra | proposal, รายงาน, หลักฐานผลงาน |
| BPMN Engine | orchestration | research-grant-approval |
