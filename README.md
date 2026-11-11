# OrthoAI

OrthoAI is a full-stack dental X-ray decision-support application. It combines a
Next.js clinic management interface with a FastAPI inference service to analyse
OPG, periapical, and bitewing X-rays, visualise AI findings, and help clinicians
prepare structured reports.

> **Important:** OrthoAI is a research/FYP prototype and is not an autonomous
> medical diagnostic system. A qualified clinician must review every result.

## Features

- Upload X-rays or capture them from a compatible camera.
- Classify whether an image is a dental X-ray and identify its X-ray type.
- Run type-specific ONNX models for tooth and finding detection.
- Display bounding boxes, masks, confidence scores, and editable findings.
- Generate clinician-reviewed reports and patient-friendly summaries.
- Manage patients, appointments, treatments, records, clinic settings, and reports.
- Export reports and use the responsive, PWA-style clinic interface.

## Architecture

```text
Browser
  └── Next.js 16 / React 19 / TypeScript
        ├── MongoDB (application data)
        └── FastAPI backend
              ├── Ultralytics + ONNX Runtime (X-ray inference)
              └── Groq (optional report generation)
```

## Technology

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Radix UI
- **Backend:** FastAPI, Uvicorn, Pydantic, Python
- **AI:** Ultralytics YOLO, ONNX, ONNX Runtime, OpenCV
- **Reports:** Groq API with template fallback
- **Database:** MongoDB with Mongoose
- **Assets:** ONNX/PT model weights tracked with Git LFS

## Repository Layout

- `src/` - Next.js pages, components, actions, API routes, and shared utilities
- `backend/` - FastAPI service, inference models, and report generator
- `public/` - logos, favicon, service worker, and frontend static assets
- `config/` - clinic branding and theme configuration
- `.env.example` - safe local environment-variable template

The Hugging Face deployment copy is maintained separately and is intentionally
not included in this repository. See `backend/README.md` for the backend API
and deployment notes.

## Prerequisites

- Node.js 20+
- Python 3.10+
- MongoDB (local or hosted)
- Git LFS (`git lfs install`)
- Optional: a Groq API key for LLM-assisted report generation

## Local Setup

1. Clone the repository and install Git LFS assets:

   ```powershell
   git lfs install
   git clone https://github.com/Saqib17Ishfaq/Final-Year-Project.git
   cd Final-Year-Project
   git lfs pull
   ```

2. Configure the frontend:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Edit `.env.local` with a MongoDB URI, a strong JWT secret, and the backend
   URL. Never commit `.env.local`.

3. Install frontend dependencies:

   ```powershell
   npm install
   ```

4. Create and activate a Python environment:

   ```powershell
   python -m venv backend\venv
   .\backend\venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   ```

5. Add backend secrets in `backend\.env` (at minimum `GROQ_API_KEY` if report
   generation is enabled), then start both services in separate terminals:

   ```powershell
   # Terminal 1
   .\backend\venv\Scripts\Activate.ps1
   uvicorn backend.main:app --reload --port 8000

   # Terminal 2
   npm run dev
   ```

   Open `http://localhost:3000`.

## Useful Commands

```powershell
npm run dev
npm run lint
npm run build
uvicorn backend.main:app --reload --port 8000
```

## Backend API

- `POST /analyze` - analyse an uploaded X-ray
- `POST /generate-report` - generate a structured report
- `POST /translate` - translate report content
- `GET /uploads/{filename}` - serve an uploaded runtime file

The backend also exposes FastAPI's interactive documentation at
`http://localhost:8000/docs` while it is running.

## Security and Data Handling

- Environment files, local uploads, database exports, and Python environments
  are ignored by Git.
- Do not commit patient-identifiable images, production database credentials,
  JWT secrets, or API keys.
- Configure CORS and authentication appropriately before any production use.
- Rotate any credential that has been exposed outside the intended secret store.

## License

This project is an academic Final Year Project. Add the project's license and
model/data usage terms before redistributing it publicly.
