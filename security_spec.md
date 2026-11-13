# HRM Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Identity Integrity**: Only authenticated users with verified email (`request.auth.token.email_verified == true`) can access or mutate data.
2. **RBAC Isolation**: Admin privileges are derived solely from the bootstrapped admin email (`arizo4212@gmail.com` with `email_verified == true`) or existence in `/admins/{request.auth.uid}`. Employees cannot self-promote to `admin` or write to `/admins`.
3. **Compensation Integrity**: Employees cannot modify their own `dailyRate`, `positionId`, `positionTitle`, `department`, `status`, or `role`, nor alter `dailyRateSnapshot` or `earnedWage` on attendance records.
4. **Attendance Lifecycle Locking**: Employees may create an attendance record only for their own linked `employeeId` and `authUid`, and may update it only once to record `clockOutAt` (when `clockOutAt` was previously empty). Subsequent edits require `isAdmin()`.
5. **PII Protection**: Employee biodata (`email`, `phone`, `address`, `bankAccount`) and attendance/payroll records are readable only by `isAdmin()` or the owning employee (`authUid == request.auth.uid`). No blanket `isSignedIn()` list queries exist.
6. **Temporal & Volumetric Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`; `createdAt` and owner identifiers are immutable after creation; all strings and arrays enforce strict size bounds.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Self-Promotion on Create**: Employee attempts to create `/employees/{uid}` with `role: "admin"` and `dailyRate: 5000000`.
2. **Shadow Field Injection**: Employee updates `/employees/{uid}` adding `{ isVerified: true }` or `{ bonusMultiplier: 10 }`.
3. **Wage Tampering on Profile Update**: Employee updates own `/employees/{uid}` attempting to change `dailyRate` from `150000` to `9999999`.
4. **Unverified Email Spoofing**: Attacker authenticates with `email: "arizo4212@gmail.com"` and `email_verified: false` attempting admin read/write.
5. **Cross-Employee Attendance Spoofing**: Employee A attempts to create `/attendances/empB_2026-11-12` with `employeeId: "empB"` and `authUid: uidA`.
6. **Post-Clockout Tampering**: Employee updates `/attendances/{id}` after `clockOutAt` is already populated to alter `clockOutAt` or `earnedWage`.
7. **Orphan Attendance Creation**: Employee creates an attendance record referencing a non-existent `employeeId: "ghost_emp"`.
8. **Client Timestamp Forgery**: User creates attendance with `createdAt` set to yesterday's timestamp instead of `request.time`.
9. **Oversized Payload / Denial of Wallet**: Employee attempts to submit a 500KB string in `clockInSelfie` or `notes` exceeding `maxLength`.
10. **ID Poisoning**: User attempts to create a document with a 300-character ID or invalid symbols `../admins/evil`.
11. **Unauthorized Payroll Forgery**: Employee attempts to create or update `/payrollRecords/{id}` with `status: "paid"` and `netPay: 50000000`.
12. **Blanket Employee List Scraping**: Employee executes `getDocs(collection(db, "employees"))` without filtering to `authUid == request.auth.uid`.
