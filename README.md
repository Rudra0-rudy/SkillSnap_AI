# ⚡ SkillSnap AI

**Find your skill gaps. Get a personalized career roadmap.**

An AI-powered career skill-gap analyzer built with Flask and open-weight **Gemma** models.

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-REST%20API-000000?logo=flask&logoColor=white)
![Gemma](https://img.shields.io/badge/AI-Gemma%20(open--weight)-4285F4)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-E34F26)
![No Database](https://img.shields.io/badge/Database-none-success)
![License](https://img.shields.io/badge/License-MIT-green)

[Quick Start](#-quick-start) · [Configuration](#️-configuration) · [API](#-api-reference) · [Deploy](#️-deploy-to-render) · [Troubleshooting](#️-troubleshooting)

---

## 📖 Overview

Choosing a career is easier when you know exactly what is missing. **SkillSnap AI** lets you pick a target role, list the skills you already have, and instantly see:

- how **ready** you are for that role (a clear percentage),
- which required skills you **already have** and which you are **missing**,
- an AI-written **learning roadmap**, **project ideas**, and **interview topics** tailored to your gaps.

Built for a one-day hackathon, so it stays simple and easy to understand: **no database, no login, no build tools.**

## ✨ Features

- 🎯 **10 career roles** with hand-curated skill lists
- 🔍 **Case-insensitive skill matching** (`python`, `Python`, and `PYTHON` count as the same skill)
- 📊 **Deterministic readiness score** calculated in Python, never guessed by the AI
- 🧠 **Personalized AI roadmap** with phases, projects, and interview prep
- 🛡️ **Safe AI parsing**: extracts JSON even when the model adds extra text, and returns a clean error instead of crashing
- 🔌 **Switchable AI providers**: Google AI Studio (free Gemma), local Ollama, or any OpenAI-compatible API
- 🚫 **Clean error messages**: no stack traces reach the browser

## 🏗️ How It Works

```text
┌──────────────┐   POST /api/analyze   ┌────────────────────────────┐
│   Browser    │ ────────────────────▶ │         Flask API          │
│ HTML/CSS/JS  │                       │                            │
└──────────────┘                       │ 1. Validate input          │
       ▲                               │ 2. Match skills (Python)   │
       │                               │ 3. Compute readiness %     │
       │        JSON result            │ 4. Build prompt            │
       └────────────────────────────── │ 5. Call AI model ──────────┼──▶ Gemma
                                       │ 6. Parse + validate JSON   │   (Google AI Studio
                                       └────────────────────────────┘    or Ollama)
```

The AI is used only for what it is good at: the **explanations and roadmap**. Everything measurable (matching, missing skills, readiness) is calculated by plain Python, so the numbers are always correct.

**Readiness formula**

```text
readiness = round( matched required skills / total required skills × 100 )
```

Example: 5 of 9 required skills → `5 / 9 × 100 = 55.56` → **56%**

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, REST API |
| AI | Gemma (open-weight) via Google AI Studio, or local Ollama |
| HTTP client | `requests` |
| Config | `python-dotenv` |
| Production server | `gunicorn` |
| Frontend | HTML, CSS, vanilla JavaScript |
| Data | Python dictionary (no database) |

## 📁 Project Structure

```text
SkillSnap_AI/
├── app.py                  # Flask app and routes
├── render.yaml             # One-click Render deployment config
├── requirements.txt
├── .env.example            # Copy to .env and fill in
├── LICENSE
├── data/
│   └── career_roles.py     # Roles and their expected skills
├── services/
│   └── ai_service.py       # AI providers, calls, and safe JSON parsing
├── prompts/
│   └── roadmap_prompt.py   # The SkillSnap AI prompt
├── templates/
│   └── index.html          # Frontend page
└── static/
    ├── css/style.css
    └── js/app.js
```

## 🚀 Quick Start

### 1. Clone and create a virtual environment

```bash
git clone https://github.com/Rudra0-rudy/SkillSnap_AI.git
cd SkillSnap_AI
python -m venv env
```

Activate it:

```bash
# Windows (PowerShell)
env\Scripts\activate

# macOS / Linux
source env/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Get a free Gemma API key

1. Open [Google AI Studio](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key** and copy it. No credit card is needed.

### 4. Configure your environment

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and set:

```text
LLM_PROVIDER=google
LLM_API_KEY=your_api_key_here
LLM_MODEL=gemma-4-26b-a4b-it
```

> 🔒 **Never commit `.env` or share your key.** It is already listed in `.gitignore`.

### 5. Run the app

```bash
python app.py
```

Open **http://localhost:5000** in your browser.

## ⚙️ Configuration

All settings live in `.env`. Pick **one** provider.

| Variable | Description | Example |
|---|---|---|
| `LLM_PROVIDER` | `google`, `ollama`, or `api` | `google` |
| `LLM_API_KEY` | API key (`google` and `api` providers) | `your_key` |
| `LLM_MODEL` | Model name (`google` and `api` providers) | `gemma-4-26b-a4b-it` |
| `LLM_BASE_URL` | Base URL for the `api` provider (default: Groq) | `https://api.groq.com/openai/v1` |
| `OLLAMA_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `gemma3:4b` |
| `FLASK_DEBUG` | Set to `1` for debug mode (local only) | `1` |

<details>
<summary><b>Gemma model options</b></summary>

| Model | Best for |
|---|---|
| `gemma-4-26b-a4b-it` | Recommended default |
| `gemma-4-31b-it` | Slightly higher quality, slower |
| `gemma-3-27b-it` | Fallback if the Gemma 4 names are unavailable |
| `gemma-3-12b-it` | Faster and lighter |

Use the model name **without** the `models/` prefix. To see which models your key can use:

```powershell
# Windows PowerShell
$key = "YOUR_KEY"
(Invoke-RestMethod "https://generativelanguage.googleapis.com/v1beta/models?key=$key").models |
  Where-Object { $_.name -like "*gemma*" } |
  ForEach-Object { $_.name }
```

```bash
# macOS / Linux
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" | grep -i '"name".*gemma'
```

</details>

<details>
<summary><b>Run fully offline with Ollama</b></summary>

```bash
ollama pull gemma3:4b
ollama serve
```

Then in `.env`:

```text
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
```

</details>

<details>
<summary><b>Use Groq, OpenRouter, or another OpenAI-compatible API</b></summary>

```text
LLM_PROVIDER=api
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=your_key
LLM_MODEL=your_model_name
```

Set `LLM_MODEL` to a model your chosen provider offers.

</details>

## 📡 API Reference

### `GET /api/roles`

Returns the supported career roles.

```json
{
  "roles": ["Machine Learning Engineer", "Backend Developer", "Frontend Developer"]
}
```

### `POST /api/analyze`

**Request**

```json
{
  "target_role": "Machine Learning Engineer",
  "skills": ["Python", "NumPy", "Pandas", "SQL", "Machine Learning"]
}
```

**Response `200`**

```json
{
  "target_role": "Machine Learning Engineer",
  "readiness": 56,
  "required_skills": ["Python", "NumPy", "Pandas", "Statistics", "Machine Learning", "Deep Learning", "SQL", "Git", "Model Deployment"],
  "current_skills": ["Python", "NumPy", "Pandas", "SQL", "Machine Learning"],
  "matched_skills": ["Python", "NumPy", "Pandas", "Machine Learning", "SQL"],
  "missing_skills": ["Statistics", "Deep Learning", "Git", "Model Deployment"],
  "ai_analysis": {
    "career_summary": "...",
    "skill_analysis": { "strengths": [], "missing": [], "priority_skills": [] },
    "roadmap": [
      { "phase": "Phase 1", "title": "Foundations", "skills": [], "description": "..." }
    ],
    "projects": [],
    "interview_topics": []
  }
}
```

**Errors** always look like `{ "error": "message" }`:

| Status | Message | Cause |
|---|---|---|
| `400` | Target role is required | `target_role` missing |
| `400` | Skills are required | `skills` missing or empty |
| `400` | Skills must be an array | `skills` is not a list |
| `400` | Unsupported career role | Role is not in `career_roles.py` |
| `400` | Request body must be valid JSON | Malformed body |
| `429` | Too many AI requests right now | Free-tier rate limit hit |
| `502` | AI returned an invalid response | Model output was not usable JSON |
| `503` | AI service is unavailable | Provider down, bad key, or wrong model name |

### Try it from the terminal

```powershell
# Windows PowerShell
$body = @{
  target_role = "Machine Learning Engineer"
  skills = @("python","NumPy","Pandas","SQL","Machine Learning")
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/analyze `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
```

```bash
# macOS / Linux
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"target_role":"Machine Learning Engineer","skills":["python","NumPy","Pandas","SQL","Machine Learning"]}'
```

## ☁️ Deploy to Render

The repo includes a `render.yaml`, so deployment takes a few minutes on Render's free tier.

1. Push this project to GitHub (make sure `.env` is **not** included).
2. Sign in at [dashboard.render.com](https://dashboard.render.com) with GitHub.
3. Click **New → Blueprint** and select your repository.
4. Set `LLM_API_KEY` to your Google AI Studio API key when Render prompts for it.
5. Click **Deploy** and open the URL Render gives you.

The Blueprint installs `requirements.txt` and starts the Flask app with Gunicorn.
For an existing Render service, set the same start command (`gunicorn app:app`)
and configure `LLM_PROVIDER=google`, `LLM_MODEL=gemma-4-26b-a4b-it`, and
`LLM_API_KEY` in the service's environment settings. A local `.env` file is not
uploaded or read from Render; environment variables must be configured in the
Render dashboard.

**Good to know**

- Free services sleep after about 15 minutes without traffic. The first request afterward can take around a minute, so open the site before a demo.
- Keep the API key only in Render's environment variables, never in the repo.
- The Gemma free tier has rate limits, so heavy traffic may show the "Too many AI requests" message.

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `Analysis failed. Please try again.` | Check the Render service logs for deployment or server errors. Confirm the service uses `gunicorn app:app` and has `LLM_PROVIDER`, `LLM_MODEL`, and `LLM_API_KEY` configured in its environment settings. |
| `AI service is unavailable. Make sure Ollama is running.` | The app is in Ollama mode. Check that `.env` exists in the project root and contains `LLM_PROVIDER=google`, then restart Flask. |
| `AI is not configured. Set LLM_API_KEY and LLM_MODEL` | One of those values is empty in `.env`. |
| `AI provider rejected the API key` | The key is wrong or was deleted. Create a new one in AI Studio. |
| `AI model not found` | Wrong `LLM_MODEL`. Try `gemma-3-27b-it` or run the model-list command above. |
| `AI returned an invalid response` | Check the terminal for `Could not parse AI output` or `finishReason` lines. The model's raw text is logged there. |
| `Too many AI requests right now` | You hit the free rate limit. Wait a minute and retry. |
| Changes to `.env` have no effect | `.env` is read at startup. Stop Flask with `Ctrl+C` and run it again. |
| `.env` not found on Windows | Check the file is named exactly `.env`, not `.env.txt`. Run `Get-ChildItem -Force` to see it. |

## 🗺️ Roadmap

- [ ] Add more career roles and skill categories
- [ ] Skill suggestions and autocomplete while typing
- [ ] Export the roadmap as PDF
- [ ] Save and compare multiple analyses
- [ ] Per-user rate limiting for public deployments

## 🔐 Security Notes

- API keys live only in `.env` or your host's environment variables and are never committed.
- Debug mode is off in production, so the Flask debugger is never exposed.
- AI output is treated as untrusted data and validated before being returned.

## 🤝 Contributing

Contributions are welcome, including during Hacktoberfest!

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-idea`
3. Commit your changes and push the branch.
4. Open a pull request describing what you changed and why.

Good first contributions: new career roles in `data/career_roles.py`, better prompts, UI polish, or documentation fixes.

## 📄 License

Released under the [MIT License](LICENSE).

## 🙏 Acknowledgements

- [Gemma](https://ai.google.dev/gemma) open models by Google DeepMind
- [Google AI Studio](https://aistudio.google.com) for the free API tier
- [Flask](https://flask.palletsprojects.com) for the backend
- [Ollama](https://ollama.com) for local model hosting

---

Built with ☕ for a hackathon. If SkillSnap AI helped you, give it a ⭐
