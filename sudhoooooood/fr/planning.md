# Functional Requirements — Planning & QA

**Module:** `planning`  
**Schema:** `planning`  
**Phase:** Phase 4  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| Planning Admin | จัดทำแผน บริหาร KPI ออกรายงาน |
| QA Officer | จัดเก็บหลักฐาน QA เตรียมรายงาน SAR |
| Dean / Vice Dean | อนุมัติแผน รับทราบผล KPI |
| Department Head | จัดทำแผนหน่วยงาน รายงาน KPI |
| All Module Admins | ส่งข้อมูลเพื่อ update KPI |

---

## Functional Requirements

### FR-PLAN-001: จัดทำแผนยุทธศาสตร์ (Strategic Plan)

**As a** Planning Admin  
**I want to** บันทึกแผนยุทธศาสตร์ของคณะ  
**So that** เป้าหมาย กลยุทธ์ และ KPI เชื่อมโยงกันในระบบเดียว

**Acceptance Criteria:**
- [ ] แผนยุทธศาสตร์มี: วิสัยทัศน์, พันธกิจ, ยุทธศาสตร์, เป้าประสงค์
- [ ] กำหนดระยะแผน: ระยะสั้น (1 ปี), ระยะกลาง (3 ปี), ระยะยาว (5 ปี)
- [ ] แต่ละเป้าประสงค์มี KPI ที่วัดได้ (SMART)
- [ ] Dean อนุมัติแผนก่อนเผยแพร่

---

### FR-PLAN-002: จัดทำแผนปฏิบัติการประจำปี (Annual Action Plan)

**As a** Department Head  
**I want to** จัดทำแผนปฏิบัติการของหน่วยงาน aligned กับแผนยุทธศาสตร์  
**So that** การดำเนินงานประจำปีมีทิศทางชัดเจน

**Acceptance Criteria:**
- [ ] แผนงานประกอบด้วย: โครงการ/กิจกรรม, ผู้รับผิดชอบ, งบประมาณ, ระยะเวลา, KPI target
- [ ] link กับ `fiscal_year_id` และ `strategic_objective_id`
- [ ] รองรับการแก้ไขแผนระหว่างปีพร้อมบันทึกเหตุผล
- [ ] Export แผนปฏิบัติการเป็น Excel ตามรูปแบบที่มหาวิทยาลัยกำหนด

---

### FR-PLAN-003: กำหนดและติดตาม KPI

**As a** Planning Admin  
**I want to** กำหนด KPI และ track ผลการดำเนินงาน real-time  
**So that** ทราบว่า KPI แต่ละตัวอยู่ใน status ใด

**Acceptance Criteria:**
- [ ] KPI มี: ชื่อ, หน่วยวัด, baseline, target, น้ำหนัก, ความถี่ในการรายงาน
- [ ] ดึงค่า KPI อัตโนมัติจาก module ต่างๆ ผ่าน event หรือ scheduled sync:
  - จำนวนผลงานวิจัยตีพิมพ์ (from research)
  - ชั่วโมงการพัฒนาบุคลากร (from hr)
  - อัตราการมีงานทำของศิษย์เก่า (from student)
  - จำนวนโครงการบริการวิชาการ (from research)
- [ ] Dashboard แสดง KPI แบบ traffic light: สีเขียว (≥100%), เหลือง (80–99%), แดง (<80%)
- [ ] Drill down ดูข้อมูลที่มาของ KPI ได้

---

### FR-PLAN-004: จัดเก็บหลักฐานประกันคุณภาพ (QA Evidence)

**As a** QA Officer  
**I want to** รวบรวมหลักฐานสำหรับประกันคุณภาพการศึกษา  
**So that** มีหลักฐานพร้อมเมื่อถึงรอบการประเมิน

**Acceptance Criteria:**
- [ ] ระบุ QA framework ที่ใช้: AUN-QA, EdPEx, CUPT-QA
- [ ] map KPI กับ criteria ของ QA framework
- [ ] QA Officer upload หลักฐาน (MinIO) link กับ criteria
- [ ] ระบบ checklist: criteria ไหนมีหลักฐานครบแล้ว / ยังขาดอะไร
- [ ] กำหนดระยะเวลาเก็บหลักฐาน: ปีการศึกษา / ปีปฏิทิน

---

### FR-PLAN-005: จัดทำรายงานประเมินตนเอง (SAR — Self Assessment Report)

**As a** QA Officer  
**I want to** จัดทำ SAR โดย auto-populate ข้อมูลจาก module ต่างๆ  
**So that** ลดเวลาและข้อผิดพลาดในการจัดทำรายงาน

**Acceptance Criteria:**
- [ ] Template SAR ตาม QA framework ที่เลือก
- [ ] ดึงข้อมูลอัตโนมัติ: จำนวนนักศึกษา, อาจารย์, ผลงานวิจัย, KPI (ผ่าน API ของแต่ละ module)
- [ ] QA Officer เขียนคำอธิบายและบรรยายผลการดำเนินงานเพิ่มเติม
- [ ] Export SAR เป็น Word / PDF

---

### FR-PLAN-006: ติดตามงบประมาณตามแผน (Budget vs Actual)

**As a** Planning Admin  
**I want to** เปรียบเทียบงบประมาณที่ตั้งไว้ในแผนกับที่ใช้จริง  
**So that** บริหารงบประมาณให้เป็นไปตามแผน

**Acceptance Criteria:**
- [ ] เรียก `FinanceService.getBudgetSummary(fiscal_year_id)` (sync call)
- [ ] รายงาน: แผน vs จริง ต่อ department และต่อโครงการ
- [ ] แจ้งเตือนเมื่อการใช้จ่ายเบี่ยงเบนจากแผน > 15%

---

### FR-PLAN-007: รายงานสรุปผู้บริหาร (Executive Dashboard)

**As a** Dean  
**I want to** ดู dashboard สรุปภาพรวมการดำเนินงานของคณะ  
**So that** ตัดสินใจเชิงนโยบายได้รวดเร็ว

**Acceptance Criteria:**
- [ ] KPI overview: ผลการดำเนินงานเทียบเป้าหมาย
- [ ] งบประมาณ: จัดสรร/ใช้จริง/คงเหลือ
- [ ] บุคลากร: headcount, อัตราลาออก, การพัฒนา
- [ ] วิจัย: โครงการที่ active, ผลงานตีพิมพ์ปีนี้
- [ ] Refresh data ทุก 24 ชั่วโมง (cached)

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `strategic_plans` | แผนยุทธศาสตร์ | id, name, period_start, period_end, status |
| `strategic_objectives` | เป้าประสงค์ | id, plan_id, name, strategy |
| `kpis` | ตัวชี้วัด | id, objective_id, name, unit, baseline, target, weight |
| `kpi_values` | ค่า KPI จริง | id, kpi_id, fiscal_year_id, period, actual_value, source |
| `action_plans` | แผนปฏิบัติการ | id, department_id, fiscal_year_id, name, budget |
| `action_items` | กิจกรรม/โครงการ | id, plan_id, name, owner_id, start_date, end_date, kpi_id |
| `qa_evidences` | หลักฐาน QA | id, framework, criterion, file_url, period |
| `sar_reports` | รายงาน SAR | id, framework, academic_year, status |

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| — | — | — |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `PublicationAddedEvent` | research | +1 นับ KPI ผลงานวิชาการ |
| `AcademicServiceCompletedEvent` | research | +1 นับ KPI บริการวิชาการ |
| `TrainingCompletedEvent` | hr | สะสมชั่วโมงพัฒนาบุคลากร |
| `ActivityCompletedEvent` | student | นับ KPI กิจกรรมนักศึกษา |
| `AlumnusEmployedEvent` | student | นับ KPI อัตราการมีงานทำ |
| `AcademicStatsUpdatedEvent` | academic | sync ข้อมูลนักศึกษา/อาจารย์ |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | User, Department, FiscalYear |
| finance | sync (read) | งบประมาณจริงเทียบแผน |
| hr | sync (read) | headcount, อัตราลาออก |
| MinIO | infra | หลักฐาน QA, SAR export |
