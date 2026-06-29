# Architecture — Meeting Scheduling & Self-Service Git Repository

**ฐานอ้างอิง:** [review.md](review.md) · [overview.md](overview.md) · [faculty-admin-overview.puml](faculty-admin-overview.puml)
**วันที่:** 2026-06-29
**ขอบเขต:** สถาปัตยกรรมของ 2 ระบบงานใหม่ — วางตัวอย่างไรในแพลตฟอร์มเดิม, request/authz flow, BPMN orchestration, event integration, data store (ไม่รวม FR รายละเอียด — ดู [fnpm.md](fnpm.md))

---

## 1. การวางตัวในแพลตฟอร์ม (Module Placement)

| ระบบ | Module เจ้าของ | Schema | Sync deps | Async deps | BPMN | OPA |
|---|---|---|---|---|---|---|
| **Meeting Scheduling** | `document` | `meeting` | hr, facility, shared-kernel | RoomBookedEvent, StaffOffboardedEvent | `meeting-scheduling` + DMN `quorum-decision` | `meeting.rego` |
| **Self Git Repo** | `it-admin` | `git` | shared-kernel, academic | StaffOnboarded/Offboarded, EnrollmentConfirmed | `repo-provisioning`, `merge-request-approval` + DMN `quota-decision` | `git.rego` |

> ทั้งสองระบบเป็น **sub-module ใต้โมดูลเดิม** (ไม่สร้าง schema cross-write) เคารพกฎ M/C/D — sync ผ่าน public API, async ผ่าน event, reference ข้ามโมดูลใช้ ID

---

## 2. Architecture Diagram (PlantUML)

```plantuml
@startuml meeting-git-architecture
!theme plain
skinparam backgroundColor #FFFFFF
skinparam linetype ortho
skinparam nodesep 30
skinparam ranksep 45
skinparam defaultFontName "Segoe UI"
skinparam defaultFontSize 12
skinparam package { BackgroundColor #F8F9FA; BorderColor #CED4DA; FontStyle bold }
skinparam component { BackgroundColor #FFFFFF; BorderColor #6C757D; FontSize 11 }
skinparam database { BackgroundColor #EBF5FB; BorderColor #5DADE2 }
skinparam arrow { Color #495057; FontSize 10 }

' ---------------- CLIENT ----------------
package "Client" as CL {
  [Web / PWA]            as WEB
  [Git Client\n(SSH / HTTPS)] as GIT_CLI
}

' ---------------- EDGE ----------------
package "Edge Layer (Traefik)" as EL {
  [Routing + TLS]                as RT
  [Forward Auth]                 as FA
}
package "Keycloak (OIDC)" as KC
package "OPA" as OPA_PKG {
  [meeting.rego] as P_MTG
  [git.rego]     as P_GIT
}

' ---------------- BPMN ----------------
package "BPMN Engine (Camunda + DMN)" as BPMN {
  [meeting-scheduling\n+ quorum-decision DMN]      as BP_MTG
  [repo-provisioning\n+ quota-decision DMN]        as BP_PROV
  [merge-request-approval]                         as BP_MR
}

' ---------------- MODULES ----------------
package "Application Modules (Modular Monolith)" as AM {
  package "document domain" as DD {
    [Meeting sub-module\n(meeting schema)] as MTG
  }
  package "it domain" as ID {
    [Git sub-module\n(git schema)] as GITM
  }
  [HR Module]        as HR
  [Facility Module]  as FAC
  [Academic Module]  as ACAD
  [Shared Kernel]    as SK
  [Planning Module]  as PLAN
}

' ---------------- DATA ----------------
package "Data Layer" as DL {
  database "PostgreSQL\n(meeting / git schema)" as PG
  [MinIO\n(เอกสาร / artifact)]                  as MINIO
  [Object Store\n(git repo / LFS)]              as REPOSTORE
  [Message Bus\n(RabbitMQ)]                     as MQ
}

' ---------------- FLOWS: client → edge ----------------
WEB     --> RT : HTTPS
GIT_CLI --> RT : git over HTTPS / SSH

RT --> FA
FA --> KC      : (1) authenticate
FA --> P_MTG   : (2) authorize /api/meeting/**
FA --> P_GIT   : (2) authorize /api/git/**  + git ops

RT --> MTG  : /api/meeting/**
RT --> GITM : /api/git/**

' ---------------- BPMN orchestration ----------------
BP_MTG  --> MTG  : external task (availability, invite, minutes)
BP_PROV --> GITM : external task (provision repo)
BP_MR   --> GITM : external task (merge)

' ---------------- sync calls (กฎ C-01) ----------------
MTG  --> HR   : getEmployee / availability
MTG  --> FAC  : checkRoomAvailability
MTG  --> SK   : users / dept / role
GITM --> SK   : users / academic_unit
GITM --> ACAD : course / section ref

' ---------------- data ----------------
MTG  --> PG
GITM --> PG
MTG  --> MINIO : วาระ / รายงาน PDF
GITM --> REPOSTORE : repo + LFS
GITM --> MINIO : CI artifact

' ---------------- async events (กฎ C-02) ----------------
MTG  --> MQ : MeetingScheduled / MinutesPublished / ResolutionRecorded
GITM --> MQ : RepoCreated / MergeRequestMerged
MQ --> FAC  : MeetingScheduled (booking)
MQ --> PLAN : Resolution / MR activity (KPI)
HR --> MQ   : StaffOnboarded / StaffOffboarded
ACAD --> MQ : EnrollmentConfirmed
MQ --> GITM : onboard/offboard/enroll → provisioning
MQ --> MTG  : StaffOffboarded (ปลดสมาชิก)

@enduml
```

---

## 3. Request & Authorization Flow

```
Client ──► Traefik ──► (1) Keycloak  : authenticate (JWT/OIDC)
                  └──► (2) OPA        : authorize (Forward Auth)
                              │  meeting.rego → read_meeting / read_agenda(mask) / write_minutes / cast_vote
                              │  git.rego     → read_repo(visibility) / push / merge_protected / delete_repo / mask
                              ▼
                       inject X-User-Id / X-User-Roles / X-Department-Id
                              ▼
                       Meeting / Git sub-module (business logic)
```

- **Authorization อยู่ใน OPA เท่านั้น** (กฎ O-01) — ไม่ hardcode role ในโค้ด
- **Git operations** (push/pull/merge) ก็ผ่าน Forward Auth → `git.rego` เช่นเดียวกับ REST
- **Data masking** ที่ OPA: วาระลับ (meeting) และ repo private ในผลค้นหา (git)

---

## 4. BPMN Orchestration (External Task Pattern)

| Process | โมดูลที่ประสาน | DMN | Human Task |
|---|---|---|---|
| `meeting-scheduling` | document(meeting) + facility + hr | `quorum-decision` (องค์ประชุม) | ประธานอนุมัติวาระ · จดรายงาน · รับรอง |
| `repo-provisioning` | it-admin(git) | `quota-decision` (โควตา/auto-approve) | IT อนุมัติคำขอเกิน quota |
| `merge-request-approval` | it-admin(git) | — | reviewer อนุมัติ · maintainer merge |

> โมดูลเป็น **External Task Worker** (ไม่ embed engine, กฎ B-02) และ worker ต้อง **idempotent** (กฎ B-03)

---

## 5. Event Integration

| Event | Publisher | Subscriber | ใช้ทำอะไร |
|---|---|---|---|
| `MeetingScheduledEvent` | meeting | facility, document | จองห้อง / log |
| `MeetingMinutesPublishedEvent` | meeting | document | เก็บเข้าสารบรรณ + auto-number |
| `MeetingResolutionRecordedEvent` | meeting | planning | นับ KPI การประชุม |
| `RepoCreatedEvent` | git | document, planning | log / นับ activity |
| `MergeRequestMergedEvent` | git | planning | นับ activity |
| `StaffOnboardedEvent` | hr | git | สร้าง git account + group |
| `StaffOffboardedEvent` | hr | git, meeting | revoke git / ปลดสมาชิกกรรมการ |
| `EnrollmentConfirmedEvent` | academic | git | เพิ่มนักศึกษาเข้า group รายวิชา |

> ทุก event ใหม่ควรขึ้นทะเบียนใน **Event Catalog กลาง** (ดู [review.md](review.md) F-3)

---

## 6. Data Stores

| Store | Meeting | Git |
|---|---|---|
| PostgreSQL | `meeting` schema (committees, meetings, agenda, minutes…) | `git` schema (repositories, members, merge_requests, audit_log…) |
| MinIO | เอกสารแนบวาระ + รายงาน PDF | CI artifact |
| Object Store | — | git repo data + Git LFS |
| Redis | cache availability/heatmap | cache permission lookup |
| Message Bus | publish/subscribe events | publish/subscribe events |

> เคารพ **schema-per-module** (กฎ D-01/D-02): meeting อยู่ใต้ document domain, git อยู่ใต้ it domain — ไม่มี FK ข้าม schema, reference ใช้ ID เท่านั้น (กฎ D-03)
