# API Reference (current)

Base path: `/api`. All responses use one envelope shape:

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 42 } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { ... } } }
```

Auth: `Authorization: Bearer <accessToken>` header. The refresh token is an
httpOnly cookie the browser sends automatically — never handled by
client-side JS.

This grows module-by-module alongside `src/routes/index.ts`. Documenting
*why* each endpoint exists, not just its shape, per the brief.

## Auth (`/api/auth`) — why it exists: every role needs to authenticate; this is the one place session issuance/revocation happens, so it can't drift per-role.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/login` | none (rate-limited) | Password login for any role. Returns `{ user, accessToken }`, sets refresh cookie. |
| POST | `/refresh` | refresh cookie | Rotates the refresh token, mints a new access token. Used on app load and after a 401. |
| POST | `/logout` | none | Revokes the current refresh token, clears the cookie. |
| GET | `/me` | access token | Returns the current user (used to hydrate/verify session). |
| POST | `/change-password` | access token | Self-service password change; also how a forced first-login reset is completed. Revokes all other sessions. |
| POST | `/acknowledge-rules` | access token | Records the PDF-specified "I obey the rules" tutor login acknowledgment, timestamped for audit. |
| GET | `/google` | none (rate-limited) | Redirects to Google's OIDC consent screen. Admin/Branch roles only. |
| GET | `/google/callback` | none | Google's redirect target; exchanges the code server-side, links to an existing admin/branch account, sets the refresh cookie, redirects to the frontend. |

## Branches (`/api/branches`) — why it exists: the root of the multi-branch tenancy model; Super Admin provisions branches (and their initial office-assistant login) here, Branch Admins can view/edit only their own.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | SUPER_ADMIN | Creates a Branch **and** its initial Branch Admin login in one transaction. Returns a one-time temp password for the admin to hand off. |
| GET | `/` | SUPER_ADMIN | Paginated, searchable branch list. |
| GET | `/:branchId` | SUPER_ADMIN or that branch's BRANCH_ADMIN | Branch detail. `requireBranchMatch` enforces tenant isolation. |
| PATCH | `/:branchId` | SUPER_ADMIN or that branch's BRANCH_ADMIN | Edit branch details / activate-deactivate. Audit-logged. |

## Planned next (not yet built)

Enquiries (tutor/parent), Registration, Assignments, Attendance
(ClassSession), Fees/Invoices, Payroll, Staff attendance, Expenses, Reports
(attendance/payment/student, PDF & Excel export), Announcements,
Notifications, User management (deactivate/reset tutor & parent accounts).
