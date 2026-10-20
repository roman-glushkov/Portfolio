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
    const canvas = getElement('bracketsCanvas');
    const scroll = getElement('bracketScroll') || canvas;

    if (!canvas || !scroll) return;

    const participants = [...teams];

    if (participants.length < 2) {
        scroll.innerHTML = `
            <div class="brackets-welcome">
                <h3>Недостаточно команд</h3>
                <p>Для создания турнирной сетки необходимо минимум 2 команды.</p>
            </div>
        `;
        return;
    }

    const shuffled = shuffle(participants);
    const size = 2 ** Math.ceil(Math.log2(shuffled.length));

    // Генерация правильного посева (чтобы сильные команды не встретились сразу)
    const seedOrder = (count) => {
        let seeds = [1, 2];
        while (seeds.length < count) {
            const nextCount = seeds.length * 2;
            seeds = seeds.flatMap(seed => [seed, nextCount + 1 - seed]);
        }
        return seeds;
    };

    const positions = seedOrder(size);
    const slots = Array(size).fill(null);

    shuffled.forEach((team, index) => {
        slots[positions.indexOf(index + 1)] = team;
    });

    let nextMatchId = 1;
    let rounds = [];

    // Слоты текущего раунда: { team: string, source: matchId, outcome: 'winner'|'loser' }
    let currentSlots = slots.map(team => ({
        team,
        source: null,
        outcome: 'winner'
    }));

    const totalRounds = Math.log2(size);

    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
        const matches = [];
        const nextSlots = [];

        for (let i = 0; i < currentSlots.length; i += 2) {
            const first = currentSlots[i];
            const second = currentSlots[i + 1];

            const hasBye = !first.team || !second.team;

            // ГЛАВНОЕ ИЗМЕНЕНИЕ:
            // Если это первый раунд и есть пустое место (BYE)
            // мы НЕ создаем матч, а просто переносим команду в следующий раунд
            if (roundIndex === 0 && hasBye) {
                const advancingSlot = first.team ? first : second;

                // Команда переходит дальше без матча
                nextSlots.push({
                    team: advancingSlot.team,
                    source: null,
                    outcome: 'winner'
                });

                continue; // Пропускаем создание матча
            }

            // Создаем реальный матч
            const match = {
                id: nextMatchId++,
                team1: first.team || null,
                team2: second.team || null,
                source1: first.source,
                source2: second.source,
                roundIndex,
                winner: null
            };

            matches.push(match);

            // Победитель этого матча пойдет в следующий раунд
            nextSlots.push({
                team: null,
                source: match.id,
                outcome: 'winner'
            });
        }

        rounds.push(matches);
        currentSlots = nextSlots;
    }

    const roundNames = {
        1: 'Финал',
        2: 'Полуфинал',
        4: 'Четвертьфинал',
        8: '1/8 финала',
        16: '1/16 финала',
        32: '1/32 финала'
    };

    const getRoundName = count => roundNames[count] || `Раунд из ${count} матчей`;

    const getSlotLabel = (team, source, outcome = 'winner') => {
        if (team) return escapeHtml(String(team));
        if (source) {
            const prefix = outcome === 'loser' ? 'Проигравший' : 'Победитель';
            return `${prefix} М${source}`;
        }
        return 'Ожидание участника';
    };

    const renderTeam = (team, source, outcome, extraClass = '') => {
        const isKnown = Boolean(team);
        const label = getSlotLabel(team, source, outcome);

        return `
            <div class="bracket-team ${isKnown ? 'is-known' : 'bracket-team--empty'} ${extraClass}">
                <span class="bracket-team-name">${label}</span>
            </div>
        `;
    };

    const renderMatch = match => {
        return `
            <div class="bracket-match" data-match-id="${match.id}">
                <div class="bracket-match-label">МАТЧ ${match.id}</div>
                ${renderTeam(match.team1, match.source1)}
                ${renderTeam(match.team2, match.source2)}
            </div>
        `;
    };

    // Рендерим раунды (если в раунде нет матчей, он не отрендерится)
    const roundsHtml = rounds.map((matches, index) => {
        if (matches.length === 0) return ''; // Пропускаем пустые раунды

        const title = getRoundName(matches.length);

        return `
            <section class="bracket-round" data-round="${index}">
                <h3 class="bracket-round-heading">${escapeHtml(title)}</h3>
                <div class="bracket-round-matches">
                    ${matches.map(renderMatch).join('')}
                </div>
            </section>
        `;
    }).join('');

    // Матч за 3-е место (если есть полуфиналы)
    const semiFinals = rounds.length >= 2
        ? rounds[rounds.length - 2]
        : [];

    let thirdPlaceHtml = '';

    if (shuffled.length >= 4 && semiFinals.length === 2) {
        thirdPlaceHtml = `
            <section class="bracket-third-place">
                <h3 class="bracket-round-heading">Матч за 3-е место</h3>
                <div class="bracket-match bracket-match--third">
                    <div class="bracket-match-label">БРОНЗА</div>
                    ${renderTeam(null, semiFinals[0].id, 'loser')}
                    ${renderTeam(null, semiFinals[1].id, 'loser')}
                </div>
            </section>
        `;
    }

    scroll.innerHTML = `
        <div class="bracket-layout">
            <div class="bracket-tree">
                ${roundsHtml}
            </div>
            ${thirdPlaceHtml}
        </div>
    `;
}
