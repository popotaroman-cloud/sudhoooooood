# Functional Requirements — Meeting Scheduling & Self-Service Git Repository

**ฐานอ้างอิง (background):** [review.md](review.md) · [overview.md](overview.md) · [feasibility study.md](feasibility%20study.md)
**เวอร์ชัน:** 0.2 · **วันที่:** 2026-06-29
**ขอบเขต:** FN Requirements อย่างละเอียดของ 2 ระบบงาน — ทุกระบบมี **OPA policy** และ **BPMN process + DMN** ตามกติกาโครงการ (กฎ O-* และ B-*)

> เอกสารนี้ต่อยอดจากสถาปัตยกรรมเดิม (Modular Monolith + Traefik + Keycloak + OPA + Camunda BPMN/DMN) และเคารพกฎ **M/C/D/B/O/E** ใน feasibility study อย่างเคร่งครัด — sync ผ่าน public API, async ผ่าน event, schema-per-module, reference ข้ามโมดูลใช้ ID เท่านั้น

---
---

# ระบบที่ 1 — Meeting Scheduling (ระบบนัดหมายและจัดการประชุมคณะกรรมการ)

**Feature:** `meeting-scheduling`
**ผู้รับผิดชอบหลัก (เสนอ):** `document` module (สารบรรณ) — ร่วมกับ `facility`, `hr`, `shared-kernel`
**Schema:** `meeting` (sub-schema ใต้ document domain)
**Phase:** Phase 2–3 (ต้องมี facility room booking + BPMN engine พร้อม)

## 1.0 บริบทและเหตุผล (Why)

คณะมีคณะกรรมการหลายชุด (ประจำคณะ / วิชาการ / วิจัย / วินัยนักศึกษา) ปัจจุบันนัดประชุมด้วยอีเมล–ไลน์–กระดาษ ทำให้หาเวลาว่างร่วมกันยาก จองห้องซ้อน เอกสาร/รายงานกระจัดกระจาย และติดตามมติไม่ได้ ระบบนี้รวมขั้นตอน **เสนอวาระ → หาเวลา → จองห้อง → เชิญ → ประชุม → จดรายงาน → รับรอง → ติดตามมติ** ไว้ที่เดียว ผูกกับ workflow อนุมัติผ่าน BPMN

## 1.1 Actors

| Actor | คำอธิบาย |
|---|---|
| เลขานุการคณะกรรมการ (Secretary) | สร้างประชุม จัดวาระ ส่งเชิญ จดรายงาน |
| ประธาน (Chair) | อนุมัติวาระ เปิด/ปิดประชุม รับรองมติ |
| กรรมการ (Member) | RSVP เสนอวาระ ลงมติ ดูเอกสาร |
| ผู้เข้าร่วม (Guest) | เข้าเฉพาะวาระที่เชิญ ไม่มีสิทธิลงมติ |
| Facility Admin | (sync) ยืนยันห้องว่าง |

## 1.2 Functional Requirements

### FR-MTG-001: จัดการคณะกรรมการและองค์ประชุม
**As a** เลขานุการ **I want to** กำหนดคณะกรรมการ สมาชิก บทบาท **So that** ระบบรู้องค์ประชุมและผู้มีสิทธิลงมติ
- [ ] คณะกรรมการมี: ชื่อ, ประเภท, วาระดำรงตำแหน่ง (เริ่ม-สิ้นสุด), กฎองค์ประชุม
- [ ] สมาชิกอ้างอิง `user_id` จาก shared-kernel (reference only, กฎ D-03)
- [ ] บทบาท: ประธาน / รองประธาน / เลขานุการ / กรรมการ; ระบุ `is_voting`
- [ ] กำหนดองค์ประชุมขั้นต่ำ (quorum) ต่อชุด — ตัดสินด้วย DMN (§1.5)
- [ ] ปิดคณะกรรมการเมื่อหมดวาระ โดยเก็บประวัติประชุมเดิมไว้

### FR-MTG-002: สร้างนัดประชุมและค้นหาเวลาว่าง (Availability Finder)
**As a** เลขานุการ **I want to** เสนอหลายช่วงเวลาให้กรรมการโหวต **So that** ได้เวลาที่คนเข้าร่วมได้มากที่สุด
- [ ] เลือกคณะกรรมการ → pre-fill ผู้เข้าร่วมจากสมาชิก
- [ ] เสนอได้หลาย candidate slot (วัน-เวลา-ระยะเวลา)
- [ ] ดึงตารางไม่ว่างจาก `HRService` + การประชุมอื่น → heatmap ว่าง/ไม่ว่าง/อาจว่าง
- [ ] กรรมการโหวต slot ที่สะดวก (แบบ Doodle); เลขาฯ ปิดโหวตและ lock slot สุดท้าย
- [ ] รองรับ onsite / online (ใส่ลิงก์) / hybrid

### FR-MTG-003: จองห้องประชุมอัตโนมัติ
**As a** เลขานุการ **I want to** จองห้องตรงกับเวลาที่เลือกในขั้นตอนเดียว **So that** ไม่ต้องจองแยก/ไม่ซ้อน
- [ ] เรียก `FacilityService.checkRoomAvailability(room_id, slot)` (sync, กฎ C-01)
- [ ] แสดงเฉพาะห้องความจุ ≥ จำนวนผู้เข้าร่วม และสถานะ active
- [ ] confirm → สร้าง booking ใน facility ผ่าน API/event (ไม่เขียนข้าม schema, กฎ D-02)
- [ ] เปลี่ยน/ยกเลิกประชุม → ปล่อยห้องคืนอัตโนมัติ; ประชุม online ข้ามขั้นนี้

### FR-MTG-004: วาระการประชุมและเอกสารแนบ
**As a** เลขานุการ **I want to** จัดวาระเป็นข้อ ๆ พร้อมแนบเอกสาร **So that** กรรมการอ่านล่วงหน้า ประชุมมีระเบียบ
- [ ] วาระมาตรฐาน 1–5 (รับรองรายงาน / สืบเนื่อง / เพื่อทราบ / เพื่อพิจารณา / อื่น ๆ)
- [ ] แต่ละวาระมี: หัวข้อ, ประเภท, ผู้เสนอ, เอกสารแนบ (MinIO), เวลาโดยประมาณ
- [ ] กรรมการเสนอวาระเข้ามาได้ก่อนปิดรับ; เลขาฯ จัดลำดับ (drag-and-drop)
- [ ] วาระลับ (confidential) เห็นเฉพาะผู้มีสิทธิ — บังคับด้วย OPA (§1.4)

### FR-MTG-005: เชิญประชุมและตอบรับ (RSVP)
**As a** กรรมการ **I want to** รับหนังสือเชิญและตอบรับ/ปฏิเสธ **So that** เลขาฯ ทราบองค์ประชุมล่วงหน้า
- [ ] ประธานอนุมัติวาระ → ออกหนังสือเชิญอัตโนมัติ (เลขหนังสือจาก document)
- [ ] แจ้งเตือนหลายช่องทาง (email/SMS/in-app) ผ่าน message bus
- [ ] RSVP: เข้าร่วม / ไม่เข้า / มอบผู้แทน (proxy) + เหตุผล; export .ics
- [ ] Reminder อัตโนมัติ ก่อน 3 วัน และก่อน 1 ชั่วโมง

### FR-MTG-006: ตรวจองค์ประชุมและเช็คอิน
**As a** ประธาน/เลขานุการ **I want to** ตรวจองค์ประชุมก่อนเริ่ม **So that** มติมีผลตามระเบียบ
- [ ] เช็คอิน (กดยืนยัน/QR) นับผู้มาจริง; นับ proxy ตามระเบียบชุดนั้น
- [ ] คำนวณ quorum ตาม DMN → แสดง "ครบ/ไม่ครบองค์ประชุม"
- [ ] ไม่ครบ → เปิดประชุมไม่ได้ (เลื่อน + บันทึกเหตุผล)

### FR-MTG-007: บันทึกรายงานการประชุมและมติ
**As a** เลขานุการ **I want to** จดรายงานและมติแต่ละวาระ **So that** มีหลักฐานและติดตามได้
- [ ] จดต่อวาระ: สรุปการอภิปราย + มติ (เห็นชอบ/ไม่เห็นชอบ/มีเงื่อนไข)
- [ ] บันทึกผลลงมติ (เห็น/ไม่เห็น/งด) รองรับลงคะแนนลับ
- [ ] มติที่เป็นงาน → สร้าง action item (ผู้รับผิดชอบ + กำหนดเสร็จ + สถานะ)
- [ ] export PDF ตามแบบราชการ; publish `MeetingMinutesPublishedEvent` → document

### FR-MTG-008: รับรองรายงานและติดตามมติ
**As a** ประธาน/กรรมการ **I want to** รับรองรายงานครั้งก่อนและติดตามมติ **So that** มติถูกนำไปปฏิบัติ
- [ ] วาระ 1 ของประชุมถัดไป auto-link รายงานครั้งก่อนเพื่อรับรอง
- [ ] แก้ไข (amendment) ได้ก่อนรับรอง พร้อม track การแก้
- [ ] dashboard action item: ค้าง/ใกล้ครบ/เสร็จ + แจ้งเตือนผู้รับผิดชอบ
- [ ] รายงานที่รับรองแล้ว lock (immutable) — บังคับด้วย OPA

## 1.3 Data Model (`meeting` schema)
```
committees        id, name, type, term_start, term_end, quorum_rule, status
committee_members id, committee_id, user_id*, role, is_voting, proxy_for
meetings          id, committee_id, title, mode, status, scheduled_at,
                  duration_min, room_id*, online_url, process_instance_id*
meeting_slots     id, meeting_id, candidate_start, candidate_end, vote_count
slot_votes        id, slot_id, user_id*, available(yes/no/maybe)
agenda_items      id, meeting_id, order_no, title, category, proposer_id*,
                  est_minutes, is_confidential, attachment_key
attendees         id, meeting_id, user_id*, rsvp, checked_in_at, proxy_user_id*
minutes           id, meeting_id, agenda_item_id, discussion, resolution,
                  vote_yes, vote_no, vote_abstain, status(draft/published/approved)
action_items      id, meeting_id, resolution_ref, assignee_id*, due_date, status
```
`*` = reference by ID ข้ามโมดูล (ไม่มี FK ข้าม schema, กฎ D-03)

## 1.4 OPA Policy (`policies/meeting.rego`)
```rego
package meeting.authz
import future.keywords.if
import future.keywords.in

default allow := false
user_id   := input.attributes.user_id
committee := input.resource.committee_id

is_member    if some m in data.members[committee]; m.user_id == user_id
is_secretary if some m in data.members[committee]; m.user_id == user_id; m.role == "secretary"
is_chair     if some m in data.members[committee]; m.user_id == user_id; m.role == "chair"

# READ ประชุมของชุดตน
allow if { input.action == "read_meeting"; is_member }

# วาระทั่วไป member อ่านได้ / วาระลับเฉพาะ chair, secretary, ผู้เสนอ
allow if { input.action == "read_agenda_item"; input.resource.is_confidential == false; is_member }
allow if {
  input.action == "read_agenda_item"; input.resource.is_confidential == true
  any([is_chair, is_secretary, input.resource.proposer_id == user_id])
}

# WRITE minutes: เฉพาะเลขาฯ และยังไม่ approved (immutable เมื่อ approved)
allow if { input.action == "write_minutes"; is_secretary; input.resource.status != "approved" }

# VOTE: กรรมการที่ is_voting และเช็คอินแล้วเท่านั้น
allow if {
  input.action == "cast_vote"
  some m in data.members[committee]; m.user_id == user_id; m.is_voting == true
  input.resource.checked_in == true
}

# data masking: ซ่อน id วาระลับสำหรับ non-privileged
mask_agenda := { item.id |
  some item in input.resource.agenda
  item.is_confidential == true
  not (is_chair or is_secretary)
}
```
**conftest tests:** member อ่านได้ · non-member deny · วาระลับ mask ถูก · แก้ minutes ที่ approved → deny · ไม่เช็คอินลงมติไม่ได้

## 1.5 BPMN + DMN

**`meeting-scheduling.bpmn`** (External Task, idempotent ตามกฎ B-03)
```
[Start เลขาฯ สร้างนัด]
 → (Service) collectAvailability         ← ดึงตารางว่าง (HR) + เปิดโหวต
 → (Timer/User) กรรมการโหวต slot
 → (Service) lockSlotAndCheckRoom         ← sync FacilityService
 → <ห้องว่าง?> --ไม่--> (User) เลือกห้อง/เวลาใหม่ --loop-->
 → (User) ประธานอนุมัติวาระ
 → <อนุมัติ?> --ไม่--> (User) เลขาฯ แก้วาระ --loop-->
 → (Service) issueInvitation              → publish MeetingScheduledEvent + หนังสือเชิญ
 → (Receive) รอวันประชุม / RSVP / check-in
 → (Business Rule: DMN) quorum-decision
 → <ครบองค์ประชุม?> --ไม่--> [End เลื่อนประชุม + เหตุผล]
 → (User) ประชุม + จดรายงาน + ลงมติ
 → (Service) publishMinutes               → publish MeetingMinutesPublishedEvent
 → (User) รับรองรายงาน (ประชุมถัดไป)
 → [End รายงาน approved (immutable) + ติดตาม action item]
```
**`quorum-decision.dmn`**

| ประเภทคณะกรรมการ | จำนวนสมาชิก n | องค์ประชุมขั้นต่ำ | นับ proxy? |
|---|---|---|---|
| ประจำคณะ | any | ⌈n/2⌉ + 1 | ไม่ |
| วิชาการ | any | ⌈n/2⌉ | ใช่ |
| วิจัย | any | ⌈n/2⌉ | ใช่ |
| เฉพาะกิจ | ≤ 5 | n | ไม่ |
| เฉพาะกิจ | > 5 | ⌈n × 2/3⌉ | ไม่ |

## 1.6 Events & Dependencies
**Published:** `MeetingScheduledEvent`→document/facility · `MeetingMinutesPublishedEvent`→document · `MeetingResolutionRecordedEvent`→planning
**Subscribed:** `RoomBookedEvent`(facility) · `StaffOffboardedEvent`(hr → ปลดสมาชิกพ้นสภาพ)
**Dependencies:** shared-kernel(R) · hr(R) · facility(R+event) · document(event) · BPMN · OPA · MinIO

---
---

# ระบบที่ 2 — Self-Service Git Repository (ระบบ Git ภายในคณะ)

> **สมมุติฐานการตีความ:** "self git repo" = ระบบ **Git hosting ภายในคณะแบบ self-service** (แนว GitLab/Gitea) ดูแลโดย IT คณะ ให้ภาควิชา/อาจารย์/นักวิจัย/นักศึกษา (ในรายวิชา) สร้างและจัดการ repository เก็บซอร์สโค้ด/โครงงาน/งานวิจัยได้เอง ภายใต้การกำกับสิทธิ์และ quota หากเข้าใจคลาดเคลื่อนแจ้งแก้ได้

**Feature:** `self-git-repo`
**ผู้รับผิดชอบหลัก (เสนอ):** `it-admin` module — ร่วมกับ `shared-kernel`, `hr`, `academic`
**Schema:** `git` (sub-schema ใต้ it domain)
**Phase:** Phase 3 (หลัง it-admin core + provisioning)

## 2.0 บริบทและเหตุผล (Why)

โครงงานนักศึกษา งานวิจัย และเครื่องมือภายในของคณะกระจายอยู่บน GitHub ส่วนตัว/แฟลชไดรฟ์ ทำให้สูญหายเมื่อเจ้าของจบ/ย้าย ไม่มีการควบคุมสิทธิ์ตามหน่วยงาน และข้อมูลวิจัยที่ sensitive ออกไปอยู่ cloud ภายนอก (เสี่ยง PDPA) ระบบ Git ภายในให้คณะ **เป็นเจ้าของข้อมูลเอง** + ผูกสิทธิ์กับ identity เดียวกับทั้งระบบ (Keycloak) + provisioning อัตโนมัติเมื่อเข้า/พ้นงาน

## 2.1 Actors

| Actor | คำอธิบาย |
|---|---|
| Repo Owner | อาจารย์/นักวิจัย/เจ้าหน้าที่ ที่สร้างและเป็นเจ้าของ repo |
| Maintainer / Developer | สมาชิกที่ได้รับสิทธิ์ตามบทบาท |
| นักศึกษา (Student) | สมาชิก repo ของรายวิชา/โครงงานที่ลงทะเบียน |
| IT Admin | กำหนด quota, อนุมัติคำขอเกินเกณฑ์, ดูแลแพลตฟอร์ม |
| CI Runner (system) | execute pipeline ตาม trigger |

## 2.2 Functional Requirements

### FR-GIT-001: สร้าง Repository แบบ self-service
**As a** Repo Owner **I want to** สร้าง repo ได้เองภายใน quota **So that** เริ่มงานได้ทันทีโดยไม่ต้องรอ IT
- [ ] สร้าง repo: ชื่อ, คำอธิบาย, visibility (private/internal/faculty-public), namespace
- [ ] ภายใน quota → provision อัตโนมัติ; เกิน quota → เข้า BPMN ขออนุมัติ IT (§2.5)
- [ ] init ตัวเลือก: README, .gitignore template, license
- [ ] quota ต่อผู้ใช้/หน่วยงาน ตัดสินด้วย DMN (§2.5)

### FR-GIT-002: Namespace / Group ตามหน่วยงาน
**As an** IT Admin **I want to** จัด repo เป็น group ตามหน่วยงาน/รายวิชา/โครงการ **So that** สิทธิ์สอดคล้องกับโครงสร้างคณะ
- [ ] group อ้างอิง `academic_unit_id` (ภาควิชา/สาขา) จาก shared-kernel
- [ ] group รายวิชาอ้างอิง course/section จาก academic (reference by ID)
- [ ] inherit สิทธิ์จาก group → repo (สมาชิก group เข้าทุก repo ใต้ group ตามบทบาท)

### FR-GIT-003: จัดการสมาชิกและสิทธิ์ (RBAC ต่อ repo)
**As a** Repo Owner/Maintainer **I want to** เพิ่ม/ลบสมาชิกและกำหนดบทบาท **So that** ควบคุมการเข้าถึงโค้ดได้
- [ ] บทบาท: Owner / Maintainer / Developer / Reporter / Guest (สิทธิ์ลดหลั่น)
- [ ] เพิ่มสมาชิกจาก directory เดียวกับระบบ (shared-kernel users)
- [ ] กำหนดวันหมดอายุสิทธิ์ (เช่น TA ต่อภาคเรียน)
- [ ] authorization ทั้งหมดตัดสินที่ OPA (กฎ O-01, §2.4)

### FR-GIT-004: Authentication — SSH key & Personal Access Token
**As a** Developer **I want to** push/pull ด้วย SSH key หรือ HTTPS token **So that** ใช้ git client ได้ปลอดภัย
- [ ] จัดการ SSH public key ของตน (เพิ่ม/ลบ/ตั้งวันหมดอายุ)
- [ ] ออก Personal Access Token (PAT) แบบ scoped (read/write/admin) + หมดอายุได้
- [ ] auth ผ่าน Keycloak (OIDC) สำหรับ web; SSH/PAT map กลับเป็น identity เดียวกัน
- [ ] revoke key/token ได้ทันที; บันทึกการใช้งานล่าสุด

### FR-GIT-005: Branch Protection & Merge Request Review
**As a** Maintainer **I want to** บังคับ review ก่อน merge เข้า branch หลัก **So that** คุณภาพโค้ดและ audit ได้
- [ ] ตั้ง protected branch (เช่น `main`): ห้าม push ตรง, ต้องผ่าน MR
- [ ] MR ต้องมีผู้ review อนุมัติ ≥ N คน + ต้องผ่าน CI checks
- [ ] เฉพาะ Maintainer/Owner เท่านั้นที่ merge protected branch (บังคับด้วย OPA)
- [ ] MR approval เดินผ่าน BPMN (§2.5); merge แล้ว publish event

### FR-GIT-006: Provisioning / Deprovisioning อัตโนมัติ (event-driven)
**As an** IT Admin **I want to** สร้าง/ปิด git account ตามสถานะบุคลากร **So that** ไม่มี orphan account
- [ ] subscribe `StaffOnboardedEvent` → สร้าง git account + ใส่ group ตามหน่วยงาน
- [ ] subscribe `StaffOffboardedEvent` → revoke key/token + ถอนสิทธิ์ทุก repo (เก็บ repo ไว้, โอนเจ้าของ)
- [ ] subscribe `EnrollmentConfirmedEvent` (จาก academic) → เพิ่มนักศึกษาเข้า group รายวิชาตามภาคเรียน; หมดภาค → ถอนสิทธิ์อัตโนมัติ

### FR-GIT-007: Storage Quota, Git LFS & Retention
**As an** IT Admin **I want to** จำกัดและติดตามพื้นที่จัดเก็บ **So that** ใช้ทรัพยากรอย่างเป็นธรรม
- [ ] quota พื้นที่ต่อ repo/ต่อ namespace + แจ้งเตือนเมื่อใกล้เต็ม (80%)
- [ ] รองรับ Git LFS สำหรับไฟล์ใหญ่ (dataset วิจัย)
- [ ] retention/archival: repo ไม่มี activity > N เดือน → แจ้งเตือนและ archive (read-only)

### FR-GIT-008: Visibility, Audit Log & Compliance
**As an** IT Admin **I want to** ควบคุมการมองเห็นและบันทึกการเข้าถึง **So that** ปลอดภัยและตรวจสอบได้ (PDPA)
- [ ] visibility 3 ระดับ: private (สมาชิกเท่านั้น) / internal (ทุกคนในคณะที่ login) / faculty-public
- [ ] audit log: ใคร clone/push/เปลี่ยนสิทธิ์/ลบ เมื่อไร (immutable)
- [ ] repo ที่ตั้ง flag "ข้อมูลส่วนบุคคล/ลับ" → บังคับ private + masking ใน search (OPA)

### FR-GIT-009: CI/CD Pipeline Integration (ตัวเลือก)
**As a** Developer **I want to** รัน pipeline เมื่อ push/MR **So that** test/build อัตโนมัติ
- [ ] นิยาม pipeline เป็นไฟล์ในrepo (เช่น `.ci.yml`)
- [ ] trigger ตาม push/MR; แสดงสถานะ check บน MR (ผูกกับ FR-GIT-005)
- [ ] จำกัด runner ตาม quota; secret ของ pipeline เก็บแบบ encrypted (ไม่โผล่ใน log)

### FR-GIT-010: Repo Lifecycle (transfer / archive / delete)
**As a** Repo Owner **I want to** โอน/archive/ลบ repo **So that** จัดการวงจรชีวิตได้ปลอดภัย
- [ ] transfer ownership → ต้องผู้รับยอมรับ + log
- [ ] archive (read-only) / unarchive
- [ ] delete → soft-delete + ช่วง grace period (กู้คืนได้ N วัน) ก่อนลบถาวร; การลบบังคับสิทธิ์ Owner ผ่าน OPA

## 2.3 Data Model (`git` schema)
```
git_namespaces   id, type(user/dept/course/project), academic_unit_id*, course_ref*, name, quota_mb
repositories     id, namespace_id, name, description, visibility, is_sensitive,
                 default_branch, size_mb, status(active/archived/pending/deleted_at)
repo_members     id, repo_id, user_id*, role(owner/maintainer/developer/reporter/guest), expires_at
protected_branches id, repo_id, branch, required_approvals, require_ci
merge_requests   id, repo_id, source_branch, target_branch, author_id*,
                 status(open/approved/merged/closed), ci_status, process_instance_id*
mr_reviews       id, mr_id, reviewer_id*, decision(approve/request_changes)
ssh_keys         id, user_id*, title, fingerprint, expires_at, last_used_at
access_tokens    id, user_id*, name, scope(read/write/admin), expires_at, revoked
audit_log        id, repo_id, actor_id*, action, target, ip, at  (immutable)
```
`*` = reference by ID ข้ามโมดูล (กฎ D-03)

## 2.4 OPA Policy (`policies/git.rego`)
```rego
package git.authz
import future.keywords.if
import future.keywords.in

default allow := false
user_id := input.attributes.user_id
repo    := input.resource.repo_id

role := r if { some m in data.repo_members[repo]; m.user_id == user_id; r := m.role }
rank := {"guest":1, "reporter":2, "developer":3, "maintainer":4, "owner":5}

# READ: private = สมาชิกเท่านั้น; internal = ผู้ login ใด ๆ; faculty-public = ทุกคน
allow if { input.action == "read_repo"; input.resource.visibility == "faculty-public" }
allow if { input.action == "read_repo"; input.resource.visibility == "internal"; user_id != "" }
allow if { input.action == "read_repo"; input.resource.visibility == "private"; rank[role] >= rank["guest"] }

# WRITE (push branch ทั่วไป): developer ขึ้นไป
allow if { input.action == "push"; rank[role] >= rank["developer"] }

# MERGE protected branch: maintainer ขึ้นไป + MR approved ครบ + CI ผ่าน
allow if {
  input.action == "merge_protected"
  rank[role] >= rank["maintainer"]
  input.resource.approvals >= input.resource.required_approvals
  input.resource.ci_status == "passed"
}

# ADMIN repo (เปลี่ยนสิทธิ์/visibility): maintainer ขึ้นไป
allow if { input.action == "admin_repo"; rank[role] >= rank["maintainer"] }

# DELETE: owner เท่านั้น
allow if { input.action == "delete_repo"; role == "owner" }

# data masking: ซ่อน repo private จากผลค้นหาของ non-member
mask_repos := { rp.id |
  some rp in input.resource.search_results
  rp.visibility == "private"
  not (some m in data.repo_members[rp.id]; m.user_id == user_id)
}
```
**conftest tests:** non-member อ่าน private → deny · developer push ได้ แต่ merge protected ไม่ได้ · maintainer merge ได้เฉพาะเมื่อ approvals ครบ+CI ผ่าน · delete เฉพาะ owner · search mask repo private ที่ไม่ใช่สมาชิก

## 2.5 BPMN + DMN

**`repo-provisioning.bpmn`** (สร้าง repo / คำขอเกิน quota)
```
[Start ผู้ใช้ขอสร้าง repo]
 → (Business Rule: DMN) quota-decision         ← role + namespace type → quota + auto-approve?
 → <ภายใน quota?> --ใช่--> (Service) provisionRepo --> publish RepoCreatedEvent --> [End]
                  --ไม่--> (User) IT Admin พิจารณาคำขอ
                          → <อนุมัติ?> --ไม่--> [End ปฏิเสธ + เหตุผล]
                                       --ใช่--> (Service) provisionRepo + เพิ่ม quota --> [End]
```
**`merge-request-approval.bpmn`** (idempotent, External Task)
```
[Start เปิด MR]
 → (Service) runCIChecks                        ← trigger pipeline (ถ้ามี)
 → (User) ผู้ review พิจารณา (loop จนครบ required_approvals)
 → <approvals ครบ AND ci=passed?> --ไม่--> (User) ผู้เขียนแก้ไข --loop-->
                                  --ใช่--> (User) Maintainer กด merge (OPA: merge_protected)
 → (Service) mergeBranch --> publish MergeRequestMergedEvent --> [End]
```
**`quota-decision.dmn`**

| บทบาทผู้ขอ | ประเภท namespace | quota เริ่มต้น | auto-approve ถ้า ≤ |
|---|---|---|---|
| อาจารย์/นักวิจัย | dept/project | 5 GB | 5 GB |
| เจ้าหน้าที่ | dept | 2 GB | 2 GB |
| นักศึกษา | course/project | 500 MB | 500 MB |
| รายวิชา (group) | course | 10 GB | 10 GB |
| เกินเพดานทุกกรณี | any | — | ต้อง IT อนุมัติ |

## 2.6 Events & Dependencies
**Published:** `RepoCreatedEvent`→document(log)/planning · `MergeRequestMergedEvent`→planning(นับ activity)
**Subscribed:** `StaffOnboardedEvent`(hr) · `StaffOffboardedEvent`(hr) · `EnrollmentConfirmedEvent`(academic)
**Dependencies:** shared-kernel(R) · hr(event) · academic(R+event) · Keycloak(OIDC) · BPMN · OPA · object storage(repo/LFS) · MinIO(artifact)
> ชื่อ event ใหม่ทั้งหมดควรขึ้นทะเบียนใน **Event Catalog กลาง** (ดู [review.md](review.md) F-3)

---
---

# ภาคผนวก — Traceability & Definition of Done

## Traceability (FR ↔ OPA ↔ BPMN/DMN)

| ระบบ | FR | OPA action | BPMN / DMN |
|---|---|---|---|
| Meeting | FR-MTG-002/003 | — | `collectAvailability`, `lockSlotAndCheckRoom` |
| Meeting | FR-MTG-004 | `read_agenda_item` (mask วาระลับ) | User Task อนุมัติวาระ |
| Meeting | FR-MTG-006 | `cast_vote` | DMN `quorum-decision` |
| Meeting | FR-MTG-007/008 | `write_minutes` (deny if approved) | `publishMinutes`, รับรองรายงาน |
| Git | FR-GIT-001 | — | `repo-provisioning` + DMN `quota-decision` |
| Git | FR-GIT-003/008 | `read_repo`, `admin_repo`, mask | — |
| Git | FR-GIT-005 | `push`, `merge_protected` | `merge-request-approval` |
| Git | FR-GIT-010 | `delete_repo` (owner only) | lifecycle (soft-delete) |

## Definition of Done (ทั้ง 2 ระบบ)
- [ ] FR ทุกข้อผ่าน acceptance criteria
- [ ] `meeting.rego` / `git.rego` + conftest unit test ครบทุก rule (กฎ O-02)
- [ ] BPMN deploy + worker idempotent (กฎ B-03) + DMN table ใช้งานจริง
- [ ] sync/async ตามกฎ C-01/C-02; ไม่ละเมิด boundary M/C/D
- [ ] events ขึ้นทะเบียนใน Event Catalog
- [ ] audit log + PDPA compliance (โดยเฉพาะ git sensitive repo)
