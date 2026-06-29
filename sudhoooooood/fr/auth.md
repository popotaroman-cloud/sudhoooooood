# Functional Requirements — Auth

**Module:** `auth`  
**Schema:** — (ข้อมูลอยู่ใน Keycloak + `shared.users`)  
**Phase:** Phase 0  
**อ้างอิง:** [overview.md](../overview.md)

---

## Actors

| Actor | คำอธิบาย |
|---|---|
| All Users | ทุกคนที่ต้องการเข้าใช้ระบบ |
| System Admin | จัดการ user account และ role assignment |
| IT Admin | ร่วมดูแล account provisioning |

---

## Functional Requirements

### FR-AUTH-001: Login ด้วย SSO (Single Sign-On)

**As a** user  
**I want to** login ครั้งเดียวและใช้งานได้ทุก module  
**So that** ไม่ต้อง login ซ้ำเมื่อเปลี่ยน module

**Acceptance Criteria:**
- [ ] ใช้ Keycloak เป็น Identity Provider (IdP) ด้วย OIDC protocol
- [ ] รองรับ login ผ่าน username/password (LDAP ของมหาวิทยาลัย)
- [ ] รองรับ login ผ่าน university SSO หากมหาวิทยาลัยมี IdP กลาง
- [ ] Session timeout 8 ชั่วโมง (configurable)
- [ ] Refresh token อัตโนมัติ ผู้ใช้ไม่รู้สึก interrupt

---

### FR-AUTH-002: JWT Token Issuance

**As a** authenticated user  
**I want to** ได้รับ JWT token ที่มี claims ครบถ้วน  
**So that** Traefik และ OPA สามารถตรวจสิทธิ์ได้โดยไม่ต้องเรียก auth service ทุก request

**Acceptance Criteria:**
- [ ] JWT payload มี: `sub (user_id)`, `email`, `roles[]`, `department_id`, `full_name_th`
- [ ] Access token TTL: 15 นาที
- [ ] Refresh token TTL: 8 ชั่วโมง (หรือตาม session policy)
- [ ] Token ลงนาม RS256 — Traefik ตรวจ signature ด้วย public key

---

### FR-AUTH-003: Role Assignment

**As a** System Admin  
**I want to** assign / revoke role ให้ user ผ่าน Keycloak Admin Console  
**So that** OPA ได้รับ role ที่ถูกต้องเมื่อตรวจสิทธิ์

**Acceptance Criteria:**
- [ ] Role กำหนดระดับ realm (ใช้ได้ทุก module) หรือระดับ client (เฉพาะ module)
- [ ] การเปลี่ยน role มีผลทันทีที่ token หมดอายุ (ไม่ต้อง logout)
- [ ] Audit log บันทึกการ assign/revoke role พร้อม timestamp และผู้ดำเนินการ

---

### FR-AUTH-004: Multi-Factor Authentication (MFA)

**As a** user ที่เข้าถึงข้อมูล sensitive  
**I want to** ยืนยันตัวตน 2 ขั้น  
**So that** ลดความเสี่ยงจาก credential theft

**Acceptance Criteria:**
- [ ] บังคับ MFA สำหรับ role: `DEAN`, `VICE_DEAN_FINANCE`, `HR_ADMIN`, `FINANCE_ADMIN`
- [ ] รองรับ TOTP (Google Authenticator / Authy)
- [ ] ผู้ใช้ทั่วไปเลือกเปิด MFA เองได้

---

### FR-AUTH-005: Logout และ Session Revocation

**As a** user  
**I want to** logout และมั่นใจว่า session ถูก revoke ทันที  
**So that** ไม่มีผู้อื่นใช้ token ที่เหลืออยู่

**Acceptance Criteria:**
- [ ] Logout เรียก Keycloak end-session endpoint (OIDC back-channel logout)
- [ ] Refresh token ถูก revoke ทันที
- [ ] Access token ที่ยังไม่หมดอายุ → blacklist ใน Redis จนกว่าจะ expire

---

### FR-AUTH-006: Traefik Forward Auth Integration

**As a** the system  
**I want to** ให้ Traefik ตรวจ token และ forward user context ไปยัง module  
**So that** module ไม่ต้องทำ auth logic ซ้ำ

**Acceptance Criteria:**
- [ ] Traefik middleware เรียก `/auth/verify` ก่อนทุก request
- [ ] หาก invalid token → 401 Unauthorized ทันที ไม่ถึง module
- [ ] Forward headers: `X-User-Id`, `X-User-Roles`, `X-Department-Id`, `X-User-Name`
- [ ] Module trust headers เหล่านี้โดยไม่ต้อง verify JWT ซ้ำ

---

### FR-AUTH-007: Audit Log การ Login

**As a** System Admin  
**I want to** ดู log การ login/logout ของ user  
**So that** สามารถ investigate เหตุการณ์ security ได้

**Acceptance Criteria:**
- [ ] บันทึก: `user_id`, `ip_address`, `user_agent`, `event_type (login/logout/failed)`, `timestamp`
- [ ] เก็บ log ขั้นต่ำ 90 วัน
- [ ] ค้นหา log ตาม user หรือช่วงเวลาได้

---

## Events Published

| Event | Trigger | Subscriber |
|---|---|---|
| `UserSessionCreatedEvent` | login สำเร็จ | — (log only) |
| `UserSessionRevokedEvent` | logout | it-admin (revoke active sessions) |

## Events Subscribed

| Event | Source | Action |
|---|---|---|
| `StaffOnboardedEvent` | hr | sync user ใหม่เข้า Keycloak |
| `StaffOffboardedEvent` | hr | disable Keycloak account |

---

## Dependencies

| Module | ประเภท | วัตถุประสงค์ |
|---|---|---|
| shared-kernel | sync (read) | อ่าน user, role definition |
| Keycloak | external | IdP, token issuance |
| Redis | infra | token blacklist, session cache |
