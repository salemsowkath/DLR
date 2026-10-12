# DLR — Intelligent Land Record Digitization and Validation System
**SIH 2026 — Problem Statement 26018**  
**Team: Quantum Dragon's**

DLR is an enterprise-grade AI-powered land record digitization, multilingual document processing, and jurisdictional governance platform.

---

## Architectural Principle

```
                           3 SEPARATE FRONTENDS
       ┌───────────────────────────┼──────────────────────────┐
       ↓                           ↓                          ↓
CITIZEN FRONTEND          GOVERNMENT FRONTEND           ADMIN FRONTEND
(Port 3000)               (Port 3001)                  (Port 3002)
Citizens only             Officers + Ministers         State Admin + Super Admin
       │                           │                          │
       └───────────────────────────┼──────────────────────────┘
                                   ↓
                         1 NODE.JS BACKEND
                            (Port 4000)
                     Authorization, RBAC, IDOR,
                   Jurisdiction, Session Context
                                   │
                    ┌──────────────┴──────────────┐
                    ↓                             ↓
            1 MYSQL DATABASE            1 PYTHON FASTAPI DAEMON
            (`dlr_database`)                  (Port 8000)
              Local MySQL 8.4              OCR, Extraction, NLP
```

---

## The Three Independent Frontends

### 1. Citizen Frontend (`citizen-frontend/` — Port 3000)
- **Target Audience**: Citizens only.
- **Authentication**: Aadhaar number + OTP verification.
- **Key Features**:
  - Citizen Dashboard
  - Document Upload & Land Record Application Submission
  - Duplicate Survey Number Pre-Check
  - Application Status & Tracking
  - Verification Appointment View
  - Approved Digital Land Record Viewing & Download
  - Profile Management
- **Security**: Strictly isolated from all Government and Admin interfaces.

### 2. Government Frontend (`government-frontend/` — Port 3001)
- **Target Audience**: Revenue Officers and State Ministers.
- **Authentication**: Username & Password with RBAC role dispatch.
- **Portals**:
  - **Officer Portal**:
    - Pending Applications Dashboard (Scoped to assigned State + District)
    - Original Document Inspection
    - Server-Orchestrated AI Digital Record Generation
    - Side-by-Side Comparison (Original Document vs. Citizen Data vs. AI Extraction)
    - Officer Corrections, Field Edits & Official Notes
    - Appointment Scheduling
    - Citizen In-Person Verification: OTP Dispatch & Verification
    - Live Biometric/Photo Capture & Storage
    - Final Review & Official Decision (Officer Verified / Rejected)
  - **Minister Portal**:
    - State Overview Dashboard (Scoped to assigned State across all districts)
    - State Officers & Citizen Counts
    - State Land Records & Processing Performance
    - AI Extraction Confidence & Validation Statistics
    - Revenue & Tax Statistics
    - Audit & Activity Feed

### 3. Admin Frontend (`admin-frontend/` — Port 3002)
- **Target Audience**: State Administrators and Nationwide Super Administrator.
- **Authentication**: Username & Password with strict role dispatch.
- **Portals**:
  - **State Admin Portal**:
    - State Administration Portal (Strict State Jurisdiction Oversight, e.g., Tamil Nadu)
    - Officer Management (Create, View, Status within State only)
    - Minister Management (Create, View, Status within State only)
    - Citizen Registry (State Citizens)
    - State Applications & Review Cases
    - State Land Records & Analytics
    - Cross-state access strictly blocked by backend authorization
  - **Super Admin Portal**:
    - Nationwide System Administration & Governance (All 28 States)
    - State Admin Management (Assign & Oversee State Admins for all 28 states)
    - Officer & Minister Nationwide Governance
    - Work Monitoring (Officers & Ministers performance & profiles)
    - System-Wide Reporting (9 Dedicated Analytical Reports)
    - AI Processing Statistics & Visual Analytics
    - Audit Logs & Security Oversight

---

## Jurisdiction Hierarchy

```
SUPER_ADMIN  ───► Nationwide Control (All 28 States)
     │
STATE_ADMIN  ───► Single Assigned State (Officers, Ministers, Records in that State)
     │
  MINISTER   ───► Single Assigned State (State Analytics, Applications, Officers)
     │
  OFFICER    ───► Single Assigned State + District (e.g., Tamil Nadu + Salem)
     │
  CITIZEN    ───► Own Authorized Resources Only (IDOR Protected)
```

---

## Single Active Session per Browser Context

To protect government terminals and multi-role workflows:
- Within the **same browser context** (e.g., same browser or tabs sharing session context via `x-client-context-id`), only one DLR user/role may remain active.
- If a Super Admin logs into Tab 2, an existing session in Tab 1 is automatically invalidated on its next request with `401 SESSION_REPLACED` ("*Your DLR session was replaced by a new login.*").
- Independent physical computers or separate browser profiles remain completely independent and are not globally invalidated.

---

## Local Development & Startup Commands

Run each service in a separate terminal:

### Terminal 1: Node.js Backend (Port 4000)
```powershell
cd backend
npm run dev
```

### Terminal 2: Python FastAPI AI Service (Port 8000)
```powershell
cd ai-service
# Activate virtual environment
..\.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 3: Citizen Frontend (Port 3000)
```powershell
cd citizen-frontend
npm run dev
```

### Terminal 4: Government Frontend (Port 3001)
```powershell
cd government-frontend
npm run dev
```

### Terminal 5: Admin Frontend (Port 3002)
```powershell
cd admin-frontend
npm run dev
```

---

## Verification & Testing

### Backend & Security Test Suite
```powershell
cd backend
npm test
```
- **Total Tests**: 203
- **Passed**: 201
- **Skipped**: 2 (synthetic pipeline opt-in)
- **Failed**: 0

### Production Builds
```powershell
cd citizen-frontend && npm run build
cd ..\government-frontend && npm run build
cd ..\admin-frontend && npm run build
```
All three frontends compile with 0 errors.

---

## Default Credentials & Demo Accounts

| Portal | Username / Identifier | Password / Credential | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `Dora027` | `DOra#027` | Nationwide (All 28 States) |
| **State Admin** | `Tamil_Nadu_admin` | `Tamil_Nadu_Admin@123` | Tamil Nadu State |
| **Officer** | `DEMO-OFFICER-001` | `OfficerPass123!` | Tamil Nadu / Salem District |
| **Minister** | `DEMO-MINISTER-001` | `MinisterPass123!` | Tamil Nadu State |
| **Citizen** | Aadhaar: `999988881234` | OTP: `123456` (Dev OTP) | Citizen Records |
