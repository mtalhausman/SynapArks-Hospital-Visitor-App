<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Patient & Visitor Management Portal (SynapArk CMMN)

A production-grade healthcare visitor registration and staff adjudication portal built with **Next.js (App Router)** and driven by the **SynapArk CMMN (Case Management Model and Notation)** workflow engine.

---

## 1. System Architecture Overview

The application features a **hybrid live/simulation architecture**:
- **Live SynapArk Engine**: When reachable, all visitor submissions, task queues, and case transitions execute against live cloud endpoints (`https://app.synapark.com`).
- **In-Memory CMMN Simulator (`lib/mock-engine.ts`)**: If the cloud engine is unreachable, network drops, or credentials are unconfigured, the application gracefully falls back to an in-memory CMMN engine simulator that implements the exact same lifecycle, sentries, and task transitions without breaking the UI.

```
[ Visitor UI: /visitor ]          [ Staff L1 / L2 Portals: /admin ]
         │                                       │
         ▼                                       ▼
 [ Next.js Route Handlers: /api/synapark/{entry-point, start, cases, tasks, auth} ]
                                 │
                                 ▼
                     [ SynapArkClient (lib/synapark-client.ts) ]
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
   [ Live SynapArk API ]               [ In-Memory CMMN Simulator ]
   (https://app.synapark.com)          (lib/mock-engine.ts)
```

---

## 2. Complete CMMN Workflow & Lifecycle

The workflow models the CMMN definition `visitor-case-process-2-0` (Entry Point: `d33bb9b8-5021-4692-b40d-1f7cae10ebee`).

```
                    ┌─────────────────────────┐
                    │ Visitor Registration    │
                    │ Form: visitor-form      │
                    └────────────┬────────────┘
                                 │ Starts Case
                                 ▼
                    ┌─────────────────────────┐
                    │   Case State: ACTIVE    │
                    │ PlanItem_1jjsmp4 Spawned │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
         ┌──────────┤   L1 Triage Review      ├──────────┐
         │          │   Form: l1-form         │          │
         │          └─────────────────────────┘          │
         ▼ (Reject)                                      ▼ (Approve)
┌──────────────────┐                            ┌─────────────────────────┐
│ Case TERMINATED  │                            │ PlanItem_0eptewu Spawned│
│ (Sentry_0a348c3) │                            │ L2 Senior Review        │
└──────────────────┘                            │ Form: l2-form           │
                                                └────────────┬────────────┘
                                                             │
                                        ┌────────────────────┴────────────────────┐
                                        ▼ (Reject)                                ▼ (Approve)
                               ┌──────────────────┐                      ┌─────────────────────────┐
                               │ Case TERMINATED  │                      │ Milestone Reached:      │
                               │ (Sentry_0a348c3) │                      │ Visitor Request Approved│
                               └──────────────────┘                      │ (Sentry_1w9pyhb)        │
                                                                         │ Case auto-completes:    │
                                                                         │ State: COMPLETED        │
                                                                         └─────────────────────────┘
```

### Stages & State Transitions:
1. **Visitor Submission (`/visitor`)**:
   - Dynamically loads `visitor-form` schema via `GET /api/synapark/entry-point`.
   - Submits visitor details (`visitor_name`, `visitor_phone_number`, `patient_name`, `relation`, `visit_date`, `number_of_visitors`).
   - Case enters `active` state and spawns L1 Human Task (`PlanItem_1jjsmp4`, `formKey: "l1-form"`).
2. **Level 1 Triage Queue (`/admin/l1`)**:
   - Triage agent reviews visitor details and submits `l1_decision`:
     - `"reject"`: Triggers `ExitCriterion_1rx48w6` (`Sentry_0a348c3`) $\rightarrow$ Case status becomes `terminated`.
     - `"approve"`: Triggers `EntryCriterion_1hjmeh9` (`Sentry_1hjmeh9`) $\rightarrow$ Spawns L2 Human Task (`PlanItem_0eptewu`, `formKey: "l2-form"`).
3. **Level 2 Senior Review (`/admin/l2`)**:
   - Senior supervisor reviews visitor details and L1 comments, then submits `l2_decision`:
     - `"reject"`: Triggers `ExitCriterion_1rx48w6` (`Sentry_0a348c3`) $\rightarrow$ Case status becomes `terminated`.
     - `"approve"`: Triggers `EntryCriterion_1nz2zgq` (`Sentry_1w9pyhb`) $\rightarrow$ Milestone *"Visitor Request Approved"* is reached. With `autoComplete="true"`, case transitions to `completed`.
4. **Real-Time Visitor Polling**:
   - The visitor reception screen polls `/api/synapark/cases/[id]` every 3 seconds.
   - Evaluated by `lib/case-status.ts`:
     - `pending_l1` (Awaiting Initial Triage)
     - `pending_l2` (Awaiting Senior Approval)
     - `approved` (Visit Approved - Terminal state, polling halts)
     - `rejected` (Visit Denied - Terminal state, polling halts)

---

## 3. Authentication & Authorization Mechanics

The portal operates with **two separate authorization zones**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. PUBLIC VISITOR ZONE (Server-Side Machine Authorization)                 │
│                                                                            │
│  Visitor Browser ──(Public HTTP)──> Next.js API Routes                     │
│                                             │                              │
│                                Authorization: Bearer <SYNAPARK_API_KEY>   │
│                                             ▼                              │
│                                    SynapArk Cloud API                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 2. STAFF / ADMIN ZONE (User Session Authorization)                         │
│                                                                            │
│  Staff Browser ──(auth_token Cookie)──> Next.js API Routes                 │
│                                             │                              │
│                                      Cookie: auth_token=<JWT>              │
│                                             ▼                              │
│                                    SynapArk Cloud API                      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Public Visitor Layer:
- **Endpoints**: `/api/synapark/entry-point`, `/api/synapark/start`.
- **Mechanism**: Authenticated via the server-side `SYNAPARK_API_KEY` (`Authorization: Bearer <KEY>`).
- **Cookie Isolation (Critical)**:
  - Visitors are unauthenticated public users.
  - Browser cookies from `localhost` (e.g. stale `auth_token` from previous sessions or other development projects) **must not** be forwarded to SynapArk's public entry point.
  - **Reason**: SynapArk prioritizes validating incoming `Cookie` headers over the `Authorization: Bearer` header. If a bad or expired cookie is present, SynapArk immediately returns `401 Unauthorized`.
  - `SynapArkClient.getHeaders()` ensures that public endpoints prioritize the server API key and strip visitor cookies. If an unexpected `Unauthorized` response is returned, the client automatically retries with a clean Authorization header.

### Staff / Agent Layer:
- **Endpoints**: `/api/synapark/auth/login`, `/api/synapark/auth/me`, `/api/synapark/tasks`, `/api/synapark/tasks/[id]`.
- **Mechanism**:
  - Staff log in at `/admin/login`.
  - The request is proxied to `${SYNAPARK_BASE_URL}/api/auth/login`.
  - When SynapArk issues a `Set-Cookie` response with an active `auth_token`, Next.js passes this cookie back to the staff browser.
  - Subsequent task queue and completion requests (`/api/synapark/tasks`) forward this cookie to SynapArk for role-based permissions (`l1` vs `l2`).
- **Offline / Simulator Fallback**:
  - If SynapArk is unreachable or credentials are dummy, `/api/synapark/auth/login` falls back to simulated staff roles based on email (`*l2*` assigns `l2` supervisor role; otherwise `l1` triage agent role).
  - `/api/synapark/auth/me` falls back to `demo-agent-01`.

---

## 4. Directory Structure

```
PatientVisitorPortal/
├── app/
│   ├── page.tsx                    # Landing page with live engine connection status
│   ├── layout.tsx                  # Root HTML layout with Inter typography
│   ├── globals.css                 # Global CSS and Tailwind directives
│   ├── visitor/
│   │   └── page.tsx                # Visitor reception, dynamic form & live status banner
│   ├── admin/
│   │   ├── layout.tsx              # Staff layout with badge counters & navigation
│   │   ├── login/page.tsx          # Staff authentication portal
│   │   ├── l1/page.tsx             # Level 1 Triage review queue & modal
│   │   └── l2/page.tsx             # Level 2 Senior Supervisor queue & modal
│   └── api/
│       └── synapark/
│           ├── entry-point/route.ts# Discovers visitor start form schema
│           ├── start/route.ts      # Starts new CMMN case instance
│           ├── cases/[id]/route.ts # Case status inspection & polling
│           ├── tasks/              # Staff task queue (filtered by stage=l1/l2)
│           │   └── route.ts
│           ├── tasks/[id]/route.ts # Task details & task completion (POST)
│           ├── auth/
│           │   ├── login/route.ts  # Staff login handler
│           │   └── me/route.ts     # Current user profile endpoint
│           └── status/route.ts     # SynapArk live connectivity health check
├── components/
│   ├── dynamic-form.tsx            # Schema-driven dynamic JSON form renderer
│   └── StatusBanner.tsx            # Visitor progress timeline indicator
├── lib/
│   ├── synapark-client.ts          # Central API client with retries & header isolation
│   ├── mock-engine.ts              # In-memory CMMN engine & schema fallback
│   ├── case-status.ts              # Case state resolution & terminal status evaluator
│   └── types/
│       ├── case.ts                 # TypeScript interfaces for Cases, Tasks, Milestones
│       └── form-schema.ts          # TypeScript interfaces for Dynamic UiSchema
└── .env.local                      # SynapArk connection credentials
```

---

## 5. Environment Variables Reference

Defined in `.env.local`:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SYNAPARK_BASE_URL` | SynapArk Cloud API base URL | `https://app.synapark.com` |
| `SYNAPARK_API_KEY` | Server-side API key for entry points & case operations | `sk_...` |
| `SYNAPARK_VISITOR_ENTRY_POINT_ID` | UUID of the Visitor Entry Point definition | `d33bb9b8-5021-4692-b40d-1f7cae10ebee` |
| `SYNAPARK_CASE_DEFINITION_ID` | Fallback case definition ID | `Case_1` |

---

## 6. Developer & Agent Rules

1. **Do Not Touch Next.js Agent Rules Block**: Keep `<!-- BEGIN:nextjs-agent-rules -->` intact at the top of this file.
2. **Never Forward Untrusted Cookies to Entry Points**: Public entry points (`/entry-points/:id` and `/entry-points/:id/start`) must always rely on `SYNAPARK_API_KEY` to avoid cookie poisoning from `localhost`.
3. **Preserve CMMN State Machine Integrity**: When extending the mock engine (`lib/mock-engine.ts`) or client (`lib/synapark-client.ts`), always keep sentries and milestone behavior identical between live SynapArk responses and local fallbacks.
4. **Dynamic Form Rendering**: Forms must be driven dynamically by `UiSchema` objects returned from the engine (`dynamic-form.tsx`), not hardcoded form fields.
5. **Explicit Claim-Before-Complete Lifecycle**: Human task completion against `POST /api/cases/tasks/:id` must always execute Step A (`{ "action": "claim" }`) before Step B (`{ "action": "complete", "variables": ... }`).
6. **No Silent Mock Fallback on Task Progression**: Live 4xx and 5xx API responses from task endpoints must never be swallowed or silently replaced by local mock mutations. Live error statuses and response envelopes must be surfaced directly to caller and console logs.

