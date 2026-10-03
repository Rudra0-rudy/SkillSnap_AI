import json
import logging
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

from prompts.roadmap_prompt import build_roadmap_prompt

# Load .env from the project root no matter where Flask is started from.
load_dotenv(Path(__file__).resolve().parent.parent / ".env", encoding="utf-8-sig")  # handles Windows BOM
logger = logging.getLogger(__name__)


class AIServiceUnavailable(Exception):
    """The AI provider could not be reached or is not configured."""

    def __init__(self, user_message="AI service is unavailable. Make sure Ollama is running."):
        super().__init__(user_message)
        self.user_message = user_message


class AIRateLimited(Exception):
    """The AI provider says we are sending too many requests."""


class AIInvalidResponse(Exception):
    """The model's output could not be parsed into a JSON object."""


def extract_json(text):
    """Pull a JSON object out of model text that may include extra words or code fences."""
    if not isinstance(text, str) or not text.strip():
        raise AIInvalidResponse("Empty response")

    # Try the whole text first, then the span from the first '{' to the last '}'.
    candidates = [text.strip()]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start:end + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    raise AIInvalidResponse("No valid JSON object found")


def _post(url, **kwargs):
    """POST and translate network/HTTP problems into our own exceptions."""
    try:
        response = requests.post(url, **kwargs)
    except requests.RequestException as exc:
        raise AIServiceUnavailable(_unavailable_message()) from exc
    if response.status_code == 429:
        raise AIRateLimited()
    if response.status_code in (401, 403):
        raise AIServiceUnavailable("AI provider rejected the API key. Check LLM_API_KEY in .env.")
    if response.status_code == 404:
        raise AIServiceUnavailable("AI model not found. Check the model name in .env.")
    try:
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise AIServiceUnavailable(_unavailable_message()) from exc


def _provider():
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit:
        return explicit
    # No provider set: use Google if an API key exists, otherwise local Ollama.
    return "google" if os.getenv("LLM_API_KEY", "").strip() else "ollama"


def _unavailable_message():
    if _provider() == "ollama":
        return "AI service is unavailable. Make sure Ollama is running."
    return "AI service is unavailable. Check your internet connection and API settings."


def _require_api_settings():
    if not os.getenv("LLM_API_KEY") or not os.getenv("LLM_MODEL"):
        raise AIServiceUnavailable("AI is not configured. Set LLM_API_KEY and LLM_MODEL in .env.")


def _call_ollama(prompt):
    base_url = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
    payload = {
        "model": os.getenv("OLLAMA_MODEL", "gemma3:4b"),
        "prompt": prompt,
        "stream": False,
        "format": "json",  # asks Ollama to constrain output to JSON
    }
    data = _post(f"{base_url}/api/generate", json=payload, timeout=180)
    return data.get("response", "")


def _call_google(prompt):
    """Google AI Studio (Gemini API) - works with free Gemma models."""
    _require_api_settings()
    model = os.getenv("LLM_MODEL").strip().removeprefix("models/")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {"x-goog-api-key": os.getenv("LLM_API_KEY").strip()}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
    }
    data = _post(url, json=payload, headers=headers, timeout=90)
    try:
        candidate = data["candidates"][0]
        parts = candidate["content"]["parts"]
        # Join all text parts, skipping any "thought" parts some models add.
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Google response: %s", str(data)[:1000])
        raise AIInvalidResponse("Unexpected Google response shape") from exc
    if candidate.get("finishReason") not in (None, "STOP"):
        logger.warning("Google finishReason: %s", candidate.get("finishReason"))
    return text


def _call_openai_compatible(prompt):
    """Groq, OpenRouter and other OpenAI-style /chat/completions APIs."""
    _require_api_settings()
    base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    headers = {"Authorization": f"Bearer {os.getenv('LLM_API_KEY').strip()}"}
    payload = {
        "model": os.getenv("LLM_MODEL").strip(),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }
    data = _post(f"{base_url}/chat/completions", json=payload, headers=headers, timeout=90)
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIInvalidResponse("Unexpected API response shape") from exc


def generate_roadmap(target_role, required_skills, current_skills, missing_skills):
    """Ask the configured AI provider for a roadmap and return it as a dict."""
    prompt = build_roadmap_prompt(target_role, required_skills, current_skills, missing_skills)

    provider = _provider()
    if provider == "google":
        raw_text = _call_google(prompt)
    elif provider == "api":
        raw_text = _call_openai_compatible(prompt)
    else:
        raw_text = _call_ollama(prompt)

    try:
        return extract_json(raw_text)
    except AIInvalidResponse:
        logger.error("Could not parse AI output. Raw text was:\n%s", str(raw_text)[:2000])
        raise