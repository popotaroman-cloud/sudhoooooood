# Functional Requirements — Shared Kernel

**Module:** `shared-kernel`  
**Schema:** `shared`  
**Phase:** Phase 0  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| System Admin | ผู้ดูแลระบบระดับสูงสุด จัดการ master data |
| HR Admin | จัดการข้อมูลพนักงานและหน่วยงาน (ผ่าน HR module) |
| All Modules | อ่านข้อมูล shared kernel ผ่าน internal API |

---

## Functional Requirements

### FR-SK-001: จัดการข้อมูลผู้ใช้งาน (User)

**As a** System Admin  
**I want to** sync ข้อมูล user จาก Keycloak/LDAP เข้าสู่ shared schema  
**So that** ทุก module ใช้ identity เดียวกัน ไม่มีข้อมูลซ้ำซ้อน

**Acceptance Criteria:**
- [ ] User มี fields: `id (UUID)`, `username`, `email`, `full_name_th`, `full_name_en`, `status`
- [ ] Sync อัตโนมัติเมื่อ Keycloak สร้าง/แก้ไข/ลบ user (webhook หรือ event)
- [ ] ไม่มี module ใดเขียนตาราง `shared.users` โดยตรง — เขียนผ่าน Auth module เท่านั้น
- [ ] ทุก module เรียก `SharedKernelService.getUserById(id)` เพื่ออ่านข้อมูล user

---

### FR-SK-002: จัดการหน่วยงาน (Department)

**As a** System Admin  
**I want to** บริหารโครงสร้างหน่วยงานภายในคณะ  
**So that** ทุก module อ้างอิงโครงสร้างองค์กรชุดเดียวกัน

**Acceptance Criteria:**
- [ ] Department มี fields: `id`, `code`, `name_th`, `name_en`, `parent_id`, `head_user_id`, `status`
- [ ] รองรับโครงสร้างแบบ tree (คณะ → หน่วยงาน → ฝ่าย)
- [ ] เปลี่ยน head ของหน่วยงานได้โดยไม่กระทบ record ประวัติ
- [ ] Soft delete — ไม่ลบจริง ใช้ `status = inactive`

---

### FR-SK-003: จัดการปีงบประมาณ (FiscalYear)

**As a** System Admin  
**I want to** กำหนดปีงบประมาณและสถานะของแต่ละปี  
**So that** module finance และ planning อ้างอิงปีงบประมาณที่ถูกต้อง

**Acceptance Criteria:**
- [ ] FiscalYear มี fields: `id`, `year` (พ.ศ.), `start_date`, `end_date`, `status (open/closed)`
- [ ] มีเพียง 1 ปีที่มี status = `open` ในเวลาเดียวกัน
- [ ] ปิดปีงบประมาณได้โดย System Admin เท่านั้น
- [ ] ทุก transaction ใน finance และ procurement ต้องอ้างอิง `fiscal_year_id`

---

### FR-SK-004: จัดการ Role และ Permission Definition

**As a** System Admin  
**I want to** กำหนด role ที่ใช้ในระบบ และ mapping กับ OPA policy  
**So that** OPA สามารถ resolve role ของ user ได้ถูกต้อง

**Acceptance Criteria:**
- [ ] Role มี fields: `id`, `code`, `name_th`, `scope (system/module)`, `module_name`
- [ ] Role assignment อยู่ใน Keycloak — shared kernel เก็บเฉพาะ role definition
- [ ] OPA bundle อ่าน role definition จาก shared kernel ผ่าน API
- [ ] ตัวอย่าง roles: `DEAN`, `VICE_DEAN_FINANCE`, `HR_ADMIN`, `STAFF`, `FACULTY`

---

### FR-SK-005: ให้ API สำหรับ module อื่นอ่านข้อมูล

**As a** any module  
**I want to** เรียก shared kernel API เพื่อดึงข้อมูล user / department / academic unit / fiscal year  
**So that** ไม่ต้อง query ข้าม schema โดยตรง

**Acceptance Criteria:**
- [ ] `GET /internal/shared/users/{id}` → `UserDTO`
- [ ] `GET /internal/shared/departments/{id}` → `DepartmentDTO`
- [ ] `GET /internal/shared/academic-units/{id}` → `AcademicUnitDTO`
- [ ] `GET /internal/shared/academic-units?type=department` → list ภาควิชา
- [ ] `GET /internal/shared/academic-units?type=program` → list สาขาวิชา
- [ ] `GET /internal/shared/fiscal-years/current` → `FiscalYearDTO`
- [ ] Internal API ไม่ผ่าน Traefik (in-process call ภายใน monolith)
- [ ] Response cache ใน Redis 5 นาที (invalidate เมื่อมีการแก้ไข)

---

### FR-SK-006: จัดการโครงสร้างวิชาการ (Academic Units)

**As a** System Admin  
**I want to** บริหารโครงสร้างวิชาการแบบลำดับชั้น คณะ → ภาควิชา → สาขาวิชา  
**So that** ทุก module อ้างอิงโครงสร้างวิชาการชุดเดียวกัน ไม่มีข้อมูลซ้ำซ้อน

**Acceptance Criteria:**
- [ ] Academic Unit มี fields: `id`, `code`, `name_th`, `name_en`, `type (faculty/department/program)`, `parent_id`, `head_user_id`, `status`
- [ ] รองรับโครงสร้าง tree: คณะ → ภาควิชา → สาขาวิชา (ลึกสูงสุด 3 ระดับ)
- [ ] สาขาวิชา (`type=program`) เป็น parent ของ `หลักสูตร` ใน academic module
- [ ] ภาควิชา (`type=department`) ใช้เป็น `department_id` ใน hr.employees และ finance.budget_plans
- [ ] Soft delete — ไม่ลบจริง ใช้ `status = inactive`
- [ ] บันทึก head history — ทราบได้ว่าใครเป็นหัวหน้าภาควิชา/สาขาในแต่ละช่วงเวลา

ตัวอย่างโครงสร้าง:
```
คณะวิทยาศาสตร์          (type=faculty,     code=SCI)
  └── ภาควิชาวิทยาการคอมพิวเตอร์  (type=department,  code=CS)
        └── สาขาวิศวกรรมซอฟต์แวร์  (type=program,     code=SE)
        └── สาขาปัญญาประดิษฐ์       (type=program,     code=AI)
  └── ภาควิชาคณิตศาสตร์            (type=department,  code=MATH)
```

---

## Data Entities

| Entity | คำอธิบาย | Fields หลัก |
|---|---|---|
| `users` | ผู้ใช้งานทั้งหมด | id, username, email, full_name_th, status |
| `departments` | หน่วยงานบริหาร (สำนักงาน, ฝ่าย) | id, code, name_th, parent_id, head_user_id |
| `academic_units` | โครงสร้างวิชาการ (คณะ/ภาควิชา/สาขา) | id, code, name_th, type, parent_id, head_user_id, status |
| `fiscal_years` | ปีงบประมาณ | id, year, start_date, end_date, status |
| `roles` | นิยาม role | id, code, name_th, scope, module_name |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| Keycloak (Auth) | sync | รับ user data ผ่าน webhook/event |

> Shared Kernel ไม่ depend on module อื่นใดใน application
