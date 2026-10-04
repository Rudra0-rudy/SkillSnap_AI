from flask import Flask, jsonify, render_template, request

from data.career_roles import CAREER_ROLES
from services.ai_service import (
    AIInvalidResponse, AIRateLimited, AIServiceUnavailable, generate_roadmap,
)

app = Flask(__name__)


def clean_skills(skills):
    """Strip whitespace, drop empties/non-strings, and remove case-insensitive duplicates."""
    seen, result = set(), []
    for skill in skills:
        if not isinstance(skill, str):
            continue
        skill = skill.strip()
        if skill and skill.lower() not in seen:
            seen.add(skill.lower())
            result.append(skill)
    return result


def compare_skills(required_skills, user_skills):
    """Case-insensitive comparison. Returns (matched, missing) using the role's spelling."""
    user_lower = {s.lower() for s in user_skills}
    matched = [s for s in required_skills if s.lower() in user_lower]
    missing = [s for s in required_skills if s.lower() not in user_lower]
    return matched, missing


def calculate_readiness(matched, required):
    return round(len(matched) / len(required) * 100) if required else 0


def error(message, status):
    return jsonify({"error": message}), status


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return "", 204


@app.route("/api/roles")
def get_roles():
    return jsonify({"roles": list(CAREER_ROLES.keys())})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error("Request body must be valid JSON", 400)

    target_role = data.get("target_role")
    skills = data.get("skills")

    if not isinstance(target_role, str) or not target_role.strip():
        return error("Target role is required", 400)
    if skills is None:
        return error("Skills are required", 400)
    if not isinstance(skills, list):
        return error("Skills must be an array", 400)

    target_role = target_role.strip()
    if target_role not in CAREER_ROLES:
        return error("Unsupported career role", 400)

    current_skills = clean_skills(skills)
    if not current_skills:
        return error("Skills are required", 400)

    required_skills = CAREER_ROLES[target_role]
    matched, missing = compare_skills(required_skills, current_skills)

    try:
        ai_analysis = generate_roadmap(target_role, required_skills, current_skills, missing)
    except AIRateLimited:
        return error("Too many AI requests right now. Please wait a minute and try again.", 429)
    except AIServiceUnavailable as exc:
        return error(exc.user_message, 503)
    except AIInvalidResponse:
        return error("AI returned an invalid response", 502)
    except Exception:
        app.logger.exception("Unexpected error while analyzing skills")
        return error("Something went wrong while analyzing skills", 500)

    return jsonify({
        "target_role": target_role,
        "readiness": calculate_readiness(matched, required_skills),
        "required_skills": required_skills,
        "current_skills": current_skills,
        "matched_skills": matched,
        "missing_skills": missing,
        "ai_analysis": ai_analysis,
    })


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    app.run(debug=True, port=5000)