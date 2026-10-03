def build_roadmap_prompt(target_role, required_skills, current_skills, missing_skills):
    """Build the prompt sent to the AI model."""
    return f"""You are SkillSnap AI, a career skill-gap analyzer.

Target career: {target_role}
Required skills: {", ".join(required_skills)}
User's current skills: {", ".join(current_skills)}
Missing skills: {", ".join(missing_skills) if missing_skills else "None"}

Generate a personalized career plan containing:
1. A short career summary
2. Analysis of the user's current skills (strengths)
3. An explanation of the missing skills
4. The priority missing skills (most important first)
5. A phased learning roadmap
6. Suggested projects
7. Interview preparation topics

Keep it concise: at most 4 roadmap phases, 3 projects, 6 interview topics,
and one or two short sentences for every description.
Return ONLY valid JSON. No markdown, no code fences, no extra text.
Use exactly this structure:
{{
  "career_summary": "string",
  "skill_analysis": {{
    "strengths": ["string"],
    "missing": ["string"],
    "priority_skills": ["string"]
  }},
  "roadmap": [
    {{
      "phase": "Phase 1",
      "title": "string",
      "skills": ["string"],
      "description": "string"
    }}
  ],
  "projects": ["string"],
  "interview_topics": ["string"]
}}
"""