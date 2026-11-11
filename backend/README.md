---
title: OrthoAI Backend
emoji: "\ud83e\uddb7"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# OrthoAI FastAPI Backend (Hugging Face Spaces)

This Space runs the OrthoAI backend as a Docker app on port 7860.

## What this Space serves

- `POST /analyze` - x-ray analysis
- `POST /generate-report` - report generation
- `POST /translate` - report translation
- `GET /uploads/{filename}` - uploaded file access

## Space configuration

Set the following in **Space Settings -> Variables and secrets**.

### Required secret

- `GROQ_API_KEY`

### Optional variables

- `GROQ_MODEL` (default: `moonshotai/kimi-k2-instruct-0905`)
- `GROQ_TIMEOUT_S` (default: `30`)
- `GROQ_TEMPERATURE`
- `GROQ_MAX_TOKENS`

## Notes

- The Dockerfile exposes and runs on `7860` (HF default).
- Models are loaded from `backend/models` at container startup.
- Keep this repository private if model assets are private.
