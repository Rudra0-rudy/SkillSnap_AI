const form = document.querySelector("#analyze-form");
const roleSelect = document.querySelector("#target-role");
const skillInput = document.querySelector("#skill-input");
const skillChips = document.querySelector("#skill-chips");
const analyzeButton = document.querySelector("#analyze-button");
const addSkillButton = document.querySelector("#add-skill");
const errorBanner = document.querySelector("#error-banner");
const errorMessage = document.querySelector("#error-message");
const loadingPanel = document.querySelector("#loading-panel");
const loadingMessage = document.querySelector("#loading-message");
const resultsSection = document.querySelector("#results");

let selectedSkills = [];
let isLoading = false;
let rolesLoaded = false;
let loadingTimer;
let loadingMessageIndex = 0;
const loadingMessages = [
	"Comparing your skills...",
	"Asking the AI to build your roadmap...",
	"Finding the most useful next steps...",
];

function makeElement(tagName, className, text) {
	const element = document.createElement(tagName);
	if (className) element.className = className;
	if (text !== undefined) element.textContent = text;
	return element;
}

function getText(value, fallback = "") {
	if (typeof value === "string" || typeof value === "number") return String(value).trim();
	if (Array.isArray(value)) return value.map((item) => getText(item)).filter(Boolean).join(", ");
	if (value && typeof value === "object") {
		const preferredKeys = ["title", "name", "skill", "topic", "description", "explanation", "reason", "text", "details"];
		const parts = preferredKeys.map((key) => getText(value[key])).filter(Boolean);
		if (parts.length) return [...new Set(parts)].join(" — ");
		return Object.values(value).map((item) => getText(item)).filter(Boolean).join(" — ");
	}
	return fallback;
}

function getItems(value) {
	if (Array.isArray(value)) return value.map((item) => getText(item)).filter(Boolean);
	if (typeof value === "string") return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
	if (value && typeof value === "object") return Object.values(value).map((item) => getText(item)).filter(Boolean);
	return [];
}

function updateAnalyzeButton() {
	analyzeButton.disabled = !rolesLoaded || isLoading || !roleSelect.value || selectedSkills.length === 0;
}

function renderSkillChips() {
	skillChips.replaceChildren();

	selectedSkills.forEach((skill, index) => {
		const chip = makeElement("span", "skill-chip");
		chip.setAttribute("role", "listitem");
		chip.append(makeElement("span", "", skill));

		const removeButton = makeElement("button", "remove-chip", "×");
		removeButton.type = "button";
		removeButton.setAttribute("aria-label", `Remove ${skill}`);
		removeButton.addEventListener("click", () => removeSkill(index));
		chip.append(removeButton);
		skillChips.append(chip);
	});
}

function addSkill(value) {
	const cleanedSkill = value.trim();
	if (!cleanedSkill || selectedSkills.some((skill) => skill.toLowerCase() === cleanedSkill.toLowerCase())) return;

	selectedSkills.push(cleanedSkill);
	renderSkillChips();
	updateAnalyzeButton();
}

function removeSkill(index) {
	selectedSkills.splice(index, 1);
	renderSkillChips();
	updateAnalyzeButton();
}

function addSkillsFromInput() {
	const values = skillInput.value.split(",");
	values.forEach(addSkill);
	skillInput.value = "";
}

function showError(message) {
	errorMessage.textContent = message;
	errorBanner.hidden = false;
}

function hideError() {
	errorBanner.hidden = true;
	errorMessage.textContent = "";
}

function setLoading(loading) {
	isLoading = loading;
	roleSelect.disabled = loading || !rolesLoaded;
	skillInput.disabled = loading || !rolesLoaded;
	addSkillButton.disabled = loading || !rolesLoaded;
	document.querySelectorAll(".example-chip").forEach((button) => { button.disabled = loading || !rolesLoaded; });
	loadingPanel.hidden = !loading;
	form.hidden = loading;
	updateAnalyzeButton();

	if (loading) {
		loadingMessageIndex = 0;
		loadingMessage.textContent = loadingMessages[loadingMessageIndex];
		loadingTimer = window.setInterval(() => {
			loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
			loadingMessage.textContent = loadingMessages[loadingMessageIndex];
		}, 4500);
	} else {
		window.clearInterval(loadingTimer);
	}
}

async function loadRoles() {
	try {
		const response = await fetch("/api/roles");
		const data = await response.json();
		if (!response.ok) throw new Error(getText(data?.error, "Could not load career roles."));
		if (!Array.isArray(data?.roles) || data.roles.length === 0) throw new Error("No career roles are available right now.");

		roleSelect.replaceChildren(new Option("Choose a career role", ""));
		data.roles.forEach((role) => {
			const roleName = getText(role);
			if (roleName) roleSelect.add(new Option(roleName, roleName));
		});
		rolesLoaded = roleSelect.options.length > 1;
		roleSelect.disabled = !rolesLoaded;
		skillInput.disabled = !rolesLoaded;
		addSkillButton.disabled = !rolesLoaded;
		document.querySelectorAll(".example-chip").forEach((button) => { button.disabled = !rolesLoaded; });
		document.querySelector("#roles-status").textContent = rolesLoaded ? "Choose one of the available roles." : "No career roles are available right now.";
		if (!rolesLoaded) showError("No career roles are available right now.");
		updateAnalyzeButton();
	} catch (error) {
		roleSelect.replaceChildren(new Option("Roles unavailable", ""));
		roleSelect.disabled = true;
		skillInput.disabled = true;
		addSkillButton.disabled = true;
		document.querySelectorAll(".example-chip").forEach((button) => { button.disabled = true; });
		document.querySelector("#roles-status").textContent = "Could not load career roles.";
		showError(error instanceof TypeError ? "Could not reach the server. Make sure Flask is running." : error.message);
	}
}

function renderTextList(containerId, items, options = {}) {
	const container = document.querySelector(`#${containerId}`);
	container.replaceChildren();
	const values = getItems(items);

	if (!values.length && options.fallback) values.push(options.fallback);
	values.forEach((value) => container.append(makeElement("li", "", value)));
	return values.length;
}

function renderSkillChipsInto(containerId, items, emptyMessage) {
	const container = document.querySelector(`#${containerId}`);
	container.replaceChildren();
	const values = getItems(items);

	if (!values.length && emptyMessage) {
		container.append(makeElement("p", "empty-note", emptyMessage));
		return 0;
	}

	values.forEach((value) => container.append(makeElement("span", "result-chip", value)));
	return values.length;
}

function renderRoadmap(roadmap) {
	const container = document.querySelector("#roadmap-list");
	container.replaceChildren();
	const phases = Array.isArray(roadmap) ? roadmap : [];

	if (!phases.length) {
		container.append(makeElement("p", "empty-note", "Your personalized learning phases will appear here when available."));
		return;
	}

	phases.forEach((phase, index) => {
		const details = phase && typeof phase === "object" && !Array.isArray(phase) ? phase : { title: phase };
		const card = makeElement("article", "roadmap-card");
		card.append(makeElement("span", "roadmap-marker"));
		card.append(makeElement("p", "phase-label", getText(details.phase, `Phase ${index + 1}`)));
		card.append(makeElement("h3", "", getText(details.title, `Learning phase ${index + 1}`)));

		const phaseSkills = getItems(details.skills);
		if (phaseSkills.length) {
			const chips = makeElement("div", "chip-list roadmap-skills");
			phaseSkills.forEach((skill) => chips.append(makeElement("span", "roadmap-skill", skill)));
			card.append(chips);
		}

		const description = getText(details.description);
		if (description) card.append(makeElement("p", "", description));
		container.append(card);
	});
}

function renderResults(data) {
	const analysis = data?.ai_analysis && typeof data.ai_analysis === "object" ? data.ai_analysis : {};
	const skillAnalysis = analysis.skill_analysis && typeof analysis.skill_analysis === "object" ? analysis.skill_analysis : {};
	const readinessValue = Number(data?.readiness);
	const readiness = Number.isFinite(readinessValue) ? Math.max(0, Math.min(100, Math.round(readinessValue))) : 0;
	const matched = getItems(data?.matched_skills);
	const missing = getItems(data?.missing_skills);

	document.querySelector("#results-role").textContent = getText(data?.target_role, roleSelect.value);
	document.querySelector("#score-number").textContent = `${readiness}%`;
	const scoreRing = document.querySelector("#score-ring");
	scoreRing.classList.remove("level-low", "level-mid", "level-high");
	scoreRing.classList.add(readiness < 40 ? "level-low" : readiness < 70 ? "level-mid" : "level-high");
	scoreRing.setAttribute("aria-label", `Readiness score: ${readiness}%`);
	document.querySelector("#score-caption").textContent = readiness < 40 ? "Room to grow" : readiness < 70 ? "A strong start" : "Ready to take the next step";
	document.querySelector("#ring-value").style.strokeDashoffset = String(289.03 * (1 - readiness / 100));

	document.querySelector("#matched-count").textContent = String(matched.length);
	document.querySelector("#missing-count").textContent = String(missing.length);
	renderSkillChipsInto("matched-skills", matched, "No matched skills were returned.");
	renderSkillChipsInto("missing-skills", missing, "");
	document.querySelector("#nothing-missing").hidden = missing.length > 0;
	document.querySelector("#missing-skills").hidden = missing.length === 0;

	document.querySelector("#career-summary").textContent = getText(analysis.career_summary, "Your personalized career overview will appear here when available.");
	renderTextList("strengths-list", skillAnalysis.strengths, { fallback: "Your current skills will help you build toward this role." });
	renderTextList("missing-explanations", skillAnalysis.missing, { fallback: missing.length ? missing : ["No skill-gap details were returned."] });
	renderTextList("priority-skills", skillAnalysis.priority_skills, { fallback: missing.length ? missing : ["Review the skills listed above."] });
	renderRoadmap(analysis.roadmap);
	renderTextList("projects-list", analysis.projects, { fallback: "Project suggestions will appear here when available." });
	renderTextList("interview-topics", analysis.interview_topics, { fallback: "Interview topics will appear here when available." });

	resultsSection.hidden = false;
	window.requestAnimationFrame(() => resultsSection.scrollIntoView({ behavior: "smooth", block: "start" }));
}

async function analyze(event) {
	event.preventDefault();
	if (analyzeButton.disabled) return;

	hideError();
	resultsSection.hidden = true;
	setLoading(true);
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), 120000);

	try {
		const response = await fetch("/api/analyze", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ target_role: roleSelect.value, skills: selectedSkills }),
			signal: controller.signal,
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(getText(data?.error, "Analysis failed. Please try again."));
		renderResults(data);
	} catch (error) {
		if (error.name === "AbortError") {
			showError("The analysis took too long. Please try again when the AI service is ready.");
		} else if (error instanceof TypeError) {
			showError("Could not reach the server. Make sure Flask is running.");
		} else {
			showError(error.message || "Analysis failed. Please try again.");
		}
	} finally {
		window.clearTimeout(timeoutId);
		setLoading(false);
	}
}

form.addEventListener("submit", analyze);
roleSelect.addEventListener("change", updateAnalyzeButton);
addSkillButton.addEventListener("click", () => {
	addSkillsFromInput();
	skillInput.focus();
});
skillInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter" || event.key === ",") {
		event.preventDefault();
		addSkillsFromInput();
	}
});
skillInput.addEventListener("input", () => {
	if (skillInput.value.includes(",")) addSkillsFromInput();
});
skillInput.addEventListener("paste", (event) => {
	const pastedText = event.clipboardData?.getData("text") || "";
	if (!pastedText.includes(",")) return;
	event.preventDefault();
	pastedText.split(",").forEach(addSkill);
	renderSkillChips();
	updateAnalyzeButton();
});
document.querySelectorAll(".example-chip").forEach((button) => {
	button.addEventListener("click", () => addSkill(button.dataset.skill || ""));
});
document.querySelector("#dismiss-error").addEventListener("click", hideError);
document.querySelector("#analyze-again").addEventListener("click", () => {
	document.querySelector("#analyzer").scrollIntoView({ behavior: "smooth", block: "start" });
	roleSelect.focus({ preventScroll: true });
});
document.querySelector("#bottom-analyze-again").addEventListener("click", () => {
	document.querySelector("#analyzer").scrollIntoView({ behavior: "smooth", block: "start" });
	roleSelect.focus({ preventScroll: true });
});

loadRoles();
