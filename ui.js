// --- Логика отрисовки интерфейса --- // --- UI Rendering Logic ---

// Предполагается доступ к глобальным переменным: // Assumes access to global variables:
// - players, gameLog, selectedCard, actionState
// - loreData, traitDatabase
// - DOM-элементы (p1InfoEl, p2InfoEl, и т.д.) - Убедитесь, что они определены глобально или переданы при необходимости // - DOM elements (p1InfoEl, p2InfoEl, etc.) - Ensure these are defined globally or passed if needed
// Предполагается доступ к глобальным функциям: // Assumes access to global functions:
// - getCurrentPlayer, getOpponentPlayer, handleCardClick, handlePlayerAreaClick

function renderCard(card, location, owner) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', card.type.toLowerCase());
    cardEl.dataset.instanceId = card.instanceId; // Сохранить уникальный ID // Store unique ID
    cardEl.dataset.ownerId = owner.id;
    cardEl.dataset.location = location; // 'hand' или 'battlefield' // 'hand' or 'battlefield'

    let content = "";
    if (card.type === 'Unit') {
        const factionInfo = loreData.factions[card.faction];
        const countryInfo = loreData.countries[card.country];
        const factionColor = factionInfo ? factionInfo.color : '#ccc'; // Цвет по умолчанию, если фракция не найдена // Default color if faction not found

        // Лента для фракции/страны // Ribbon bar for faction/country
        content += `<div class="card-ribbon" style="background-color: ${factionColor};">
            <span class="ribbon-faction" title="${factionInfo ? factionInfo.description : ''}">${card.faction}</span> &ndash;
            <span class="ribbon-country" title="${countryInfo ? countryInfo.description : ''}">${countryInfo ? countryInfo.name : card.country}</span>
        </div>`;
        content += `<strong>${card.name}</strong>`;
        content += `<div class="cost">Стоимость: ${card.cost}</div>`; // Cost:
        content += `<div class="stats"><span class="atk">АТК: ${card.atk}</span> | <span class="hp">ОЗ: ${card.hp}/${card.maxHp}</span></div>`; // ATK: | HP:
        // Отображение черт с использованием traitDatabase для всплывающих подсказок // Display traits using traitDatabase for tooltips
        if (card.traits && card.traits.length > 0) {
             const traitSpans = card.traits.map(traitId => {
                const traitInfo = traitDatabase[traitId];
                const traitName = traitInfo ? traitInfo.name : traitId;
                const traitDesc = traitInfo ? traitInfo.description : 'Неизвестная черта'; // Unknown trait
                return `<span class="trait" title="${traitDesc}">${traitName}</span>`;
            }).join(', ');
            content += `<div class="card-traits">Черты: ${traitSpans}</div>`; // Traits:
        }
        if (location === 'battlefield' && card.canAttack) {
             content += `<div>(Может атаковать)</div>`; // (Can Attack)
        }
    } else if (card.type === 'Order') {
         content += `<div class="card-ribbon" style="background-color: #205020; color: #fff; text-align: center;">ПРИКАЗ</div>`;
         content += `<strong>${card.name}</strong>`;
         content += `<div class="cost">Стоимость: ${card.cost}</div>`; // Cost:
         // Отображение черт и для Приказов, с использованием traitDatabase // Display traits for Orders too, using traitDatabase
         if (card.traits && card.traits.length > 0) {
             const traitSpans = card.traits.map(traitId => {
                const traitInfo = traitDatabase[traitId];
                const traitName = traitInfo ? traitInfo.name : traitId;
                const traitDesc = traitInfo ? traitInfo.description : 'Неизвестная черта'; // Unknown trait
                return `<span class="trait" title="${traitDesc}">${traitName}</span>`;
            }).join(', ');
             content += `<div class="card-traits">Черты: ${traitSpans}</div>`; // Traits:
         }
    }

    // --- Генерация и добавление описания эффекта --- // --- Generate and Add Effect Description ---
    let effectText = "";
    let effectDescription = ""; // Для всплывающей подсказки // For tooltip
     if (card.deployEffect) {
        const generatedText = `Развёртывание: ${generateEffectText(card.deployEffect, card.deployValue, card.deployTarget)}`; // Deploy:
        effectText += `<div class="card-effect">${generatedText}</div>`;
        effectDescription += ` ${generatedText}.`; // Добавить пробел перед для конкатенации подсказки // Add space before for tooltip concatenation
    }
    if (card.destroyedEffect) {
         const generatedText = `Уничтожен: ${generateEffectText(card.destroyedEffect, card.destroyedValue, card.destroyedTarget)}`; // Destroyed:
         effectText += `<div class="card-effect">${generatedText}</div>`;
         effectDescription += ` ${generatedText}.`; // Добавить пробел перед для конкатенации подсказки // Add space before for tooltip concatenation
    }
    content += effectText; // Добавить текст эффекта к видимому содержимому карты // Add effect text to visible card content
    cardEl.innerHTML = content;


    // Объединить базовое описание и описание эффекта для всплывающей подсказки // Combine base description and effect description for tooltip
    let fullDescription = card.description || "";
    if (effectDescription) {
        fullDescription += (fullDescription ? "\n" : "") + effectDescription.trim(); // Добавить новую строку, если базовое описание существует // Add newline if base description exists
    }
    if (fullDescription) {
         cardEl.title = fullDescription;
    }
    // --- Конец генерации всплывающей подсказки --- // --- End Tooltip Generation ---


    // Добавить стиль "можно сыграть", если это карта текущего игрока в руке и её можно оплатить // Add playable styling if it's the current player's card in hand and affordable
    if (location === 'hand' && owner === getCurrentPlayer() && card.cost <= owner.supply) {
        cardEl.classList.add('playable');
    }

    // Добавить стиль "выбрано" // Add selected styling
    if (selectedCard && selectedCard.card.instanceId === card.instanceId) {
         cardEl.classList.add('selected');
    }

    // Добавить стиль "можно выбрать целью" во время выбора цели для атаки // Add targetable styling during attack targeting
    if (actionState === 'selecting_target') {
        const opponent = getOpponentPlayer();
        const opponentHasGuard = opponent.battlefield.some(unit => unit.traits && unit.traits.includes('guard'));

        // Юниты, которые можно выбрать целью: поле боя противника // Targetable units: opponent's battlefield
        if (location === 'battlefield' && owner !== getCurrentPlayer()) {
             // Если у противника есть 'На страже', только юниты 'На страже' могут быть целью // If opponent has Guard, only Guard units are targetable
             if (opponentHasGuard) {
                 if (card.traits && card.traits.includes('guard')) {
                     cardEl.classList.add('targetable');
                 }
             } else {
                 // Иначе все юниты противника могут быть целью // Otherwise, all opponent units are targetable
                 cardEl.classList.add('targetable');
             }
        }
        // Игрок, которого можно выбрать целью: область информации противника (визуальный сигнал обрабатывается иначе ниже) // Targetable player: Opponent's info area (visual cue handled differently below)
    }

    // Добавить обработчик клика (вызывает функцию, предполагаемую глобальной в script.js) // Add click listener (calls function assumed to be global in script.js)
    cardEl.addEventListener('click', () => handleCardClick(card, location, owner));

    return cardEl;
}

function renderPlayerUI(player) {
    // Предполагается, что player.elementIDs содержит действительные ID // Assume player.elementIDs contains valid IDs
    document.getElementById(player.elementIDs.hp).textContent = player.hp;
    document.getElementById(player.elementIDs.supply).textContent = player.supply;
    document.getElementById(player.elementIDs.maxSupply).textContent = player.maxSupply;
    document.getElementById(player.elementIDs.deck).textContent = player.deck.length;

    // Рука // Hand
    const handEl = document.getElementById(player.elementIDs.hand);
    handEl.innerHTML = ''; // Очистить старую руку // Clear old hand
    if (player === getCurrentPlayer() || location.search !== "?showOpponentHand") { // Обычно показывать только руку текущего игрока // Only show current player's hand normally
        player.hand.forEach((card) => {
            handEl.appendChild(renderCard(card, 'hand', player));
        });
    } else {
        // Показать рубашки карт или просто количество для противника // Show card backs or just count for opponent
        handEl.innerHTML = `Рука противника (${player.hand.length} карт)`; // Opponent Hand ( cards)
    }

    // Поле боя // Battlefield
    const battlefieldEl = document.getElementById(player.elementIDs.battlefield);
    battlefieldEl.innerHTML = ''; // Очистить старое поле боя // Clear old battlefield
    player.battlefield.forEach((card) => {
        battlefieldEl.appendChild(renderCard(card, 'battlefield', player));
    });
}

function renderLog() {
    // Предполагается, что logListEl является глобально доступным DOM-элементом // Assume logListEl is a globally accessible DOM element
    if (!logListEl) return;
    logListEl.innerHTML = '';
    gameLog.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = entry;
        logListEl.appendChild(li);
    });
    logListEl.scrollTop = logListEl.scrollHeight; // Прокрутить вниз // Scroll to bottom
}

function updateUI() {
    // Предполагается, что players, currentPlayerEl, turnNumberEl, endTurnButton, p1InfoEl, p2InfoEl являются глобальными // Assume players, currentPlayerEl, turnNumberEl, endTurnButton, p1InfoEl, p2InfoEl are global
    // Обновить информацию об игроке // Update Player Info
    players.forEach(player => renderPlayerUI(player));

    // Обновить информацию о ходе // Update Turn Info
    if (currentPlayerEl) currentPlayerEl.textContent = getCurrentPlayer().name;
    if (turnNumberEl) turnNumberEl.textContent = turnNumber;

    // Включить/выключить кнопку завершения хода // Enable/disable end turn button
    if (endTurnButton) endTurnButton.disabled = false; // Включить снова, если проверка на конец игры не выключит её // Re-enable unless game over check disables it

    // Очистить старые подсветки целей в областях информации игроков // Clear old target highlights on player info areas
    if (p1InfoEl) p1InfoEl.classList.remove('targetable');
    if (p2InfoEl) p2InfoEl.classList.remove('targetable');

    // Добавить подсветку цели для атаки игрока // Add target highlight for player attack
     if (actionState === 'selecting_target') {
        const opponent = getOpponentPlayer();
        const opponentHasGuard = opponent.battlefield.some(unit => unit.traits && unit.traits.includes('guard'));
         // Делать игрока целью можно только если у него нет юнитов 'На страже' // Only make player targetable if they have no Guard units
        if (!opponentHasGuard) {
             const opponentInfoEl = (opponent.id === 1) ? p1InfoEl : p2InfoEl;
             if (opponentInfoEl) opponentInfoEl.classList.add('targetable');
        }
    }

    renderLog(); // Обновить отображение лога // Update the log display
    console.log("Интерфейс обновлён. Текущее состояние:", actionState, "Выбрано:", selectedCard); // UI Updated. Current state: Selected: // Debugging
}

console.log("ui.js загружен"); // ui.js loaded
