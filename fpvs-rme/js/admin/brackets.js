import { config, db, Query } from "./appwrite-client.js";
import { modalOpened, modalClosed } from "../core/modals.js";

let currentTournament = null;
let allTeams = [];
let selectedTeams = [];
let isLoadingTeams = false;

const getElement = (id) => document.getElementById(id);

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getTournamentDateKey(tournament) {
    const value = String(tournament.dateSort || tournament.date || "").trim();
    if (!value) return "";
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
    const localDate = value.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    if (localDate) return `${localDate[3]}-${localDate[2]}-${localDate[1]}`;
    return "";
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
        const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
        return entities[char];
    });
}

export function initBrackets() {
    const openBtn = getElement("openBracketsBtn");
    const modal = getElement("bracketsModal");
    const closeBtn = modal?.querySelector(".brackets-modal__close");
    const backdrop = modal?.querySelector(".brackets-modal__backdrop");
    const tournamentSelect = getElement("bracketTournamentSelect");
    const addTeamBtn = getElement("bracketAddTeamBtn");
    const newTeamInput = getElement("bracketNewTeamInput");
    const generateBtn = getElement("generateBracketBtn");

    if (!openBtn || !modal || !tournamentSelect || !generateBtn) return;

    openBtn.addEventListener("click", () => {
        modal.classList.add("open");
        modalOpened("brackets");
        loadTournamentsList();
    });

    closeBtn?.addEventListener("click", closeBrackets);
    backdrop?.addEventListener("click", closeBrackets);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("open")) {
            closeBrackets();
        }
    });

    tournamentSelect.addEventListener("change", () => {
        const slug = tournamentSelect.value;
        currentTournament = null;
        allTeams = [];
        selectedTeams = [];

        if (!slug) {
            getElement("bracketTeamsSection").hidden = true;
            getElement("bracketTeamsList").innerHTML = "";
            getElement("bracketsCanvas").innerHTML =
                '<div class="brackets-welcome"><div class="brackets-welcome__icon">🏐</div>' +
                "<h3>Ваша турнирная сетка</h3>" +
                "<p>Выберите турнир, отметьте команды и сгенерируйте сетку матчей.</p></div>";
            updateGenerateButton();
            return;
        }
        loadTeamsForTournament(slug);
    });

    addTeamBtn?.addEventListener("click", addManualTeam);
    newTeamInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addManualTeam();
        }
    });

    generateBtn.addEventListener("click", generateBracket);
    updateGenerateButton();
}

function closeBrackets() {
    const modal = getElement("bracketsModal");
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modalClosed("brackets");
}

async function loadTournamentsList() {
    const select = getElement("bracketTournamentSelect");
    if (!select) return;

    select.disabled = true;
    select.innerHTML = '<option value="">Загрузка турниров...</option>';

    try {
        const response = await db.listDocuments(config.databaseId, "tournaments", [
            Query.orderDesc("dateSort"),
            Query.limit(100),
        ]);

        const today = getLocalDateKey();
        const tournaments = (response.documents || [])
            .filter((t) => {
                const dateKey = getTournamentDateKey(t);
                return dateKey && dateKey >= today;
            })
            .sort((a, b) => getTournamentDateKey(a).localeCompare(getTournamentDateKey(b)));

        select.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";

        if (!tournaments.length) {
            placeholder.textContent = "Нет предстоящих турниров";
            select.appendChild(placeholder);
            select.disabled = true;
            resetTeamsSection();
            updateGenerateButton("Нет предстоящих турниров");
            return;
        }

        placeholder.textContent = "— Выберите турнир —";
        select.appendChild(placeholder);

        tournaments.forEach((t) => {
            const option = document.createElement("option");
            option.value = t.slug;
            option.textContent = `${t.title} (${t.date || getTournamentDateKey(t)})`;
            select.appendChild(option);
        });

        select.disabled = false;
        updateGenerateButton("Выберите турнир, чтобы начать");
    } catch (error) {
        console.error("Ошибка загрузки турниров:", error);
        select.replaceChildren();
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Ошибка загрузки турниров";
        select.appendChild(option);
        select.disabled = true;
        updateGenerateButton("Не удалось загрузить турниры");
    }
}

function resetTeamsSection() {
    const section = getElement("bracketTeamsSection");
    const list = getElement("bracketTeamsList");
    if (section) section.hidden = true;
    if (list) list.replaceChildren();
}

async function loadTeamsForTournament(slug) {
    const section = getElement("bracketTeamsSection");
    const list = getElement("bracketTeamsList");
    const canvas = getElement("bracketsCanvas");

    currentTournament = slug;
    allTeams = [];
    selectedTeams = [];
    isLoadingTeams = true;

    if (section) section.hidden = false;
    if (list) list.innerHTML = '<div class="brackets-hint">Загрузка команд...</div>';
    if (canvas) canvas.innerHTML = '<div class="brackets-empty">Загружаем команды турнира...</div>';

    updateGenerateButton();

    try {
        const response = await db.listDocuments(config.databaseId, "leads", [
            Query.equal("tournamentSlug", slug),
            Query.limit(100),
        ]);

        if (currentTournament !== slug) return;

        const uniqueTeams = new Map();
        (response.documents || []).forEach((lead) => {
            const teamName = String(lead.teamName || "").trim();
            if (teamName && !uniqueTeams.has(teamName.toLocaleLowerCase())) {
                uniqueTeams.set(teamName.toLocaleLowerCase(), {
                    teamName,
                    isManual: false,
                    selected: true,
                });
            }
        });

        allTeams = Array.from(uniqueTeams.values());

        if (canvas) canvas.innerHTML = '<div class="brackets-empty">Отметьте команды и нажмите «Сгенерировать сетку».</div>';
        renderTeamsList();
    } catch (error) {
        console.error("Ошибка загрузки команд:", error);
        if (currentTournament !== slug) return;
        allTeams = [];
        if (list) list.innerHTML = '<div class="brackets-hint">Не удалось загрузить команды. Попробуйте добавить их вручную.</div>';
    } finally {
        if (currentTournament === slug) {
            isLoadingTeams = false;
            updateGenerateButton();
        }
    }
}

function renderTeamsList() {
    const list = getElement("bracketTeamsList");
    if (!list) return;

    if (!allTeams.length) {
        list.innerHTML = '<div class="brackets-hint">Заявок пока нет. Добавьте команды вручную.</div>';
        updateGenerateButton();
        return;
    }

    list.innerHTML = allTeams.map((team, index) => `
        <label class="brackets-team-item">
          <input type="checkbox" data-index="${index}" ${team.selected !== false ? "checked" : ""} />
          <span>${escapeHtml(team.teamName)}</span>
          ${team.isManual ? '<small style="color:#ed7438;margin-left:auto;">Ручная</small>' : ""}
        </label>
      `).join("");

    list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            if (!allTeams[index]) return;
            allTeams[index].selected = event.currentTarget.checked;
            updateGenerateButton();
        });
    });

    updateGenerateButton();
}

function addManualTeam() {
    const input = getElement("bracketNewTeamInput");
    const name = input?.value.trim();

    if (!name || !currentTournament) return;

    const alreadyExists = allTeams.some(
        (team) => team.teamName.toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (alreadyExists) {
        alert("Такая команда уже добавлена.");
        return;
    }

    allTeams.push({ teamName: name, isManual: true, selected: true });
    input.value = "";
    renderTeamsList();
    input.focus();
}

function updateGenerateButton(customHint = "") {
    const button = getElement("generateBracketBtn");
    const countLabel = getElement("bracketTeamCount");
    const hint = getElement("bracketGenerateHint");

    const count = allTeams.filter((team) => team.selected !== false).length;
    const canGenerate = Boolean(currentTournament) && !isLoadingTeams && count >= 2;

    if (button) {
        button.disabled = !canGenerate;
        button.title = canGenerate ? "Создать турнирную сетку" : "Выберите турнир и не менее двух команд";
    }

    if (countLabel) {
        countLabel.textContent = `Выбрано команд: ${count}`;
    }

    if (hint) {
        hint.textContent = customHint || (
            isLoadingTeams ? "Загружаем команды..." :
                !currentTournament ? "Выберите турнир, чтобы начать" :
                    count < 2 ? "Для генерации необходимо минимум 2 команды" :
                        "Всё готово к генерации"
        );
    }
}

function generateBracket() {
    if (!currentTournament || isLoadingTeams) {
        alert("Сначала выберите турнир.");
        return;
    }

    selectedTeams = allTeams.filter((team) => team.selected !== false).map((team) => team.teamName);

    if (selectedTeams.length < 2) {
        alert("Нужно выбрать хотя бы 2 команды для генерации.");
        return;
    }

    const type = getElement("bracketTypeSelect")?.value;
    if (type === "single_elimination") {
        drawSingleElimination(selectedTeams);
    }
}

function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function drawSingleElimination(teams) {
    const canvas = getElement("bracketsCanvas");
    if (!canvas) return;

    const shuffled = shuffle(teams);
    const nextPowerOfTwo = 2 ** Math.ceil(Math.log2(shuffled.length));

    while (shuffled.length < nextPowerOfTwo) {
        shuffled.push(null);
    }

    const rounds = [];
    let currentMatches = [];

    for (let i = 0; i < shuffled.length; i += 2) {
        currentMatches.push([shuffled[i], shuffled[i + 1]]);
    }

    rounds.push(currentMatches);
    let matchesCount = nextPowerOfTwo / 4;

    while (matchesCount >= 1) {
        const nextRound = [];
        for (let i = 0; i < matchesCount; i++) {
            nextRound.push([null, null]);
        }
        rounds.push(nextRound);
        matchesCount /= 2;
    }

    const roundNames = { 1: "Финал", 2: "Полуфинал", 3: "Четвертьфинал" };

    const html = rounds.map((round, index) => {
        const roundNumber = rounds.length - index;
        const title = roundNames[roundNumber] || (index === 0 ? "Первый раунд" : `Раунд ${index + 1}`);

        const matches = round.map((match) => `
            <div class="bracket-match">
              <div class="bracket-team ${match[0] ? "" : "bracket-team--empty"}">${match[0] ? escapeHtml(match[0]) : "Ожидает победителя"}</div>
              <div class="bracket-team ${match[1] ? "" : "bracket-team--empty"}">${match[1] ? escapeHtml(match[1]) : "Ожидает победителя"}</div>
            </div>
          `).join("");

        return `
        <div class="bracket-round" data-round-title="${escapeHtml(title)}">
          ${matches}
        </div>
      `;
    }).join("");

    canvas.innerHTML = `<div class="bracket-tree">${html}</div>`;

    canvas.querySelectorAll(".bracket-round").forEach((round) => {
        const title = round.dataset.roundTitle;
        const heading = document.createElement("div");
        heading.className = "bracket-round-heading";
        heading.textContent = title;
        round.prepend(heading);
    });
}
