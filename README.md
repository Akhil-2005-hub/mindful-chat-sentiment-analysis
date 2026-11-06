# Mindful Chat — Smart & Secure Chatbot with Sentiment Analysis

A portfolio-ready full-stack project with a browser-only GitHub Pages demo and a secure local Flask API implementation. This is a newly implemented project package based on the concept discussed earlier; it does not claim to be the same as any earlier academic prototype.

## Live demo

[Open the Mindful Chat live demo](https://akhil-2005-hub.github.io/mindful-chat-sentiment-analysis/) (the first deployment may take a few minutes after the first push).

The public GitHub Pages build runs in **browser-only demo mode**: sign-in and chat are simulated in local browser storage, with a small demo lexicon. It does not connect to Flask or provide account security. Do not enter private information. Follow the local setup below to run the real Flask API with hashed passwords, JWT authentication, and SQLite/MySQL persistence.

## Features

- React + Vite responsive chat interface with conversation history.
- Flask JSON API with registration/login, signed JWT access tokens, and per-user conversation authorization.
- Passwords hashed with Werkzeug's scrypt implementation; passwords are never returned by the API.
- SQLite by default; MySQL-compatible SQLAlchemy URL supported.
- Sentiment labels (positive / neutral / negative) and a polarity score from TextBlob's lightweight lexicon approach.
- Input validation, message length limit, CORS origin setting, and account-scoped deletion.
- API tests for registration, login failure, access control, and message behavior.
- GitHub Actions workflow deploys the clearly labeled browser demo to GitHub Pages.

## What the chatbot actually does

The assistant uses simple, deterministic response templates selected by sentiment. It does not call an LLM, retain model memory, or provide open-domain answers. Sentiment uses TextBlob polarity. It can miss sarcasm, negation, slang, mixed emotions, multilingual text, and context. The score is a rough text signal, not a calibrated confidence, psychological assessment, or diagnosis. The app is not crisis support.

## Requirements

- Python 3.10+
- Node.js 20+
- For MySQL: a reachable MySQL-compatible database and credentials

## Run locally (SQLite)

1. Open a terminal in `backend`.
2. Create and activate a virtual environment, then install packages:

   ```bash
   python -m venv .venv
   # Windows PowerShell: .venv\Scripts\Activate.ps1
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   Copy-Item .env.example .env  # PowerShell; use cp on macOS/Linux
   ```

3. Edit `backend/.env`: set long random `SECRET_KEY` and `JWT_SECRET_KEY` values. Keep `.env` private. Default SQLite database is created at first run.
4. Start Flask from `backend`:

   ```bash
   python run.py
   ```

5. In another terminal, open `frontend`, install and start:

   ```bash
   npm install
   # Copy .env.example to .env if you need a non-default API URL
   npm run dev
   ```

6. Open the Vite URL (usually `http://localhost:5173`), create an account, and start a conversation.

## MySQL option

Install the pinned PyMySQL dependency and set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=mysql+pymysql://chat_user:URL_ENCODED_PASSWORD@localhost:3306/mindful_chat
```

Create the database and a least-privilege application user first. Use URL-encoded credentials if they contain reserved URL characters. SQLAlchemy creates tables on app startup for this demo; a production deployment should use Alembic migrations and managed secrets.

## Tests

From `backend` with dependencies installed:

```bash
python -m pytest
```

Frontend production build:

```bash
cd frontend
npm install
npm run build
```

## API overview

| Method | Path | Auth | Purpose |
|---|---|---:|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET / POST | `/api/conversations` | Yes | List / create own conversations |
| GET / POST | `/api/conversations/:id/messages` | Yes | Read / add own messages |
| DELETE | `/api/conversations/:id` | Yes | Delete own conversation |

Pass `Authorization: Bearer <token>` for authenticated routes.

## Security and privacy notes

- The app stores chat text in the configured database as ordinary application data; it does not encrypt message content at rest. Protect database files/backups and use encrypted storage in deployment if needed.
- Browser authentication currently keeps the access token in `localStorage`, which is convenient for this self-contained demo but exposes it to successful same-origin script injection. A production version should move to short-lived, `HttpOnly`, `Secure`, `SameSite` cookies with CSRF protection, add rate limiting, account recovery, audit controls, and a strict Content Security Policy.
- Local development uses HTTP. Deploy behind HTTPS and update `CORS_ORIGINS`.
- Never commit real `.env` values, user chat exports, or a production database.
- No end-to-end encryption is implemented: the API server can read stored messages.

## Project structure

```text
mindful-chat/
├── .github/workflows/pages.yml # GitHub Pages demo deployment
├── backend/
│   ├── app/                 # API, data models, sentiment logic
│   ├── tests/               # API tests
│   ├── .env.example
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/                 # React application and styles
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── LINKEDIN_POST.md
└── README.md
```

## Portfolio description

**Mindful Chat** is a full-stack conversational demo built with React, Flask, and SQLAlchemy. It supports hashed-password authentication, JWT-protected user-specific conversation history, SQLite / MySQL-compatible persistence, and a lightweight lexicon-based sentiment signal. The assistant uses transparent response templates rather than claiming generative AI capability.



