// --- Определения карт и лор (загружено из JSON) --- // --- Card Definitions & Lore (Loaded from JSON) ---
// --- Карты эффектов --- // --- Effect Maps ---
// Для Приказов и специфических активируемых способностей (если есть) // For Orders and specific activated abilities (if any)
let cardEffectMap = {
    "5008": (player) => { drawCard(player); log(`${player.name} сыграл(а) Вызвать подкрепление.`); }, // ID Вызвать подкрепление // Call Reinforcements ID
    "5009": (player) => { log(`${player.name} сыграл(а) Авиаудар (Выбор цели не реализован).`); }, // ID Авиаудар // Air Strike ID
    "5022": (player) => {
        // Экстренный ремонт: Восстановите 2 ОЗ дружественной технике
        let vehicles = player.battlefield.filter(unit => unit.traits && unit.traits.includes('vehicle') && unit.hp < unit.maxHp);
        if (vehicles.length > 0) {
            const randomIndex = Math.floor(Math.random() * vehicles.length);
            const target = vehicles[randomIndex];
            const healed = Math.min(2, target.maxHp - target.hp);
            target.hp += healed;
            log(`Экстренный ремонт: ${player.name} восстанавливает ${healed} ОЗ для ${target.name}.`);
            updateUI();
        } else {
            log(`Экстренный ремонт: нет повреждённой дружественной техники для ремонта.`);
        }
    }
};
// ПРИМЕЧАНИЕ: deployEffectMap и destroyedEffectMap удалены. Логика теперь в gameLogic.js // NOTE: deployEffectMap and destroyedEffectMap are removed. Logic is now in gameLogic.js


// --- Состояние игры --- // --- Game State ---
// ПРИМЕЧАНИЕ: cardDatabase, loreData, playerCollection, savedDecks и связанные функции // NOTE: cardDatabase, loreData, playerCollection, savedDecks, and related functions
// теперь управляются в shared.js // are now managed in shared.js

let players = [
    { id: 1, name: "Игрок 1", hp: 30, supply: 0, maxSupply: 0, deck: [], hand: [], battlefield: [], elementIDs: { hp: 'p1-hp', supply: 'p1-kredits', maxSupply: 'p1-max-kredits', deck: 'p1-deck', hand: 'p1-hand', battlefield: 'p1-battlefield' } }, // Player 1
    { id: 2, name: "Игрок 2", hp: 30, supply: 0, maxSupply: 0, deck: [], hand: [], battlefield: [], elementIDs: { hp: 'p2-hp', supply: 'p2-kredits', maxSupply: 'p2-max-kredits', deck: 'p2-deck', hand: 'p2-hand', battlefield: 'p2-battlefield' } } // Player 2
];
let currentPlayerIndex = 0;
let turnNumber = 1;
let gameLog = [];
let uniqueCardIdCounter = 0; // Чтобы дать каждому экземпляру карты уникальный ID // To give each card instance a unique ID

// Состояние выбора для действий (разыгрывание, атака) // Selection state for actions (playing, attacking)
let selectedCard = null; // { card: cardObject, location: 'hand'/'battlefield', owner: player }
let actionState = 'none'; // 'none', 'selecting_attacker', 'selecting_target'

// --- Игровые элементы --- // --- Game Elements ---
// Определены глобально для доступа также из ui.js и gameLogic.js // Defined globally for access by ui.js and gameLogic.js as well
const p1InfoEl = document.getElementById('player1-info');
const p2InfoEl = document.getElementById('player2-info');
const turnInfoEl = document.getElementById('turn-info');
const currentPlayerEl = document.getElementById('current-player');
const turnNumberEl = document.getElementById('turn-number');
const endTurnButton = document.getElementById('end-turn-button');
const logListEl = document.getElementById('log-list');

// --- Вспомогательные функции (Возможно, позже переместить в shared.js, если понадобятся где-то ещё) --- // --- Utility Functions (Potentially move to shared.js later if needed elsewhere) ---
// Оставляем getPlayer, getCurrentPlayer, getOpponentPlayer здесь, так как они напрямую манипулируют глобальным состоянием 'players' // Keeping getPlayer, getCurrentPlayer, getOpponentPlayer here as they directly manipulate the global 'players' state
function getPlayer(index) {
    return players[index];
}

function getCurrentPlayer() {
    return players[currentPlayerIndex];
}

function getOpponentPlayer() {
    return players[1 - currentPlayerIndex];
}

// --- Функции основной игровой логики --- // --- Core Game Logic Functions ---
// Перемещено в gameLogic.js: // Moved to gameLogic.js:
// - startGame(player1DeckIds, player2DeckIds)
// - startTurn()
// - drawCard(player)
// - playCard(player, cardInstanceId, handIndex)
// - attack(attackerCard, targetCardOrPlayer)
// - cleanupBattlefield()
// - endTurn()
// - checkWinCondition()
// - runAI()
// - handleDeployEffect(card, player)
// - handleDestroyedEffect(card, owner)

// --- Логика открытия наборов --- // --- Pack Opening Logic ---
// Перемещено в packs.js: // Moved to packs.js:
// - generatePack()
// - openPack()


// --- Обработчики событий --- // --- Event Handlers ---
// Примечание: Эти обработчики вызывают функции, теперь определённые в gameLogic.js и ui.js // Note: These handlers call functions now defined in gameLogic.js and ui.js
// Они также зависят от глобальных переменных состояния, таких как selectedCard, actionState, players. // They also rely on global state variables like selectedCard, actionState, players.
function handleCardClick(card, location, owner) {
    const currentPlayer = getCurrentPlayer(); // Всё ещё нужно здесь для проверки хода // Still needed here to check turn

    // Игнорировать клики, если это не ход владельца (если только не выбор цели) // Ignore clicks if it's not the owner's turn (unless targeting)
    if (owner.id !== currentPlayer.id && actionState !== 'selecting_target') return;

    console.log(`Клик: ${card.name}, Место: ${location}, Владелец: ${owner.name}, Состояние: ${actionState}`); // Clicked: Location: Owner: ActionState:

    if (actionState === 'none') {
        // Выбор карты из руки для розыгрыша // Selecting a card from hand to play
        if (location === 'hand' && owner.id === currentPlayer.id && card.cost <= currentPlayer.supply) {
            // Если это Приказ, просто сыграть его немедленно (пока без выбора цели) // If it's an Order, just play it immediately (no targeting yet)
            if (card.type === 'Order') {
                 const handIndex = owner.hand.findIndex(c => c.instanceId === card.instanceId);
                 if (handIndex !== -1) {
                     playCard(owner, card.instanceId, handIndex); // playCard находится в gameLogic.js // playCard is in gameLogic.js
                 }
            } else if (card.type === 'Unit') {
                 // Если это юнит, сыграть его (пока без выбора места размещения) // If it's a unit, play it (no targeting choice for placement yet)
                 const handIndex = owner.hand.findIndex(c => c.instanceId === card.instanceId);
                 if (handIndex !== -1) {
                     playCard(owner, card.instanceId, handIndex); // playCard находится в gameLogic.js // playCard is in gameLogic.js
                 }
            }
        }
        // Выбор юнита на поле боя для инициации атаки // Selecting a unit on the battlefield to initiate an attack
        else if (location === 'battlefield' && owner.id === currentPlayer.id && card.canAttack) {
            selectedCard = { card: card, location: location, owner: owner };
            actionState = 'selecting_target';
            log(`Выбран ${card.name} для атаки. Выберите цель.`); // Selected to attack. Choose target.
            updateUI(); // Подсветить выбранную карту и потенциальные цели (updateUI находится в ui.js) // Highlight the selected card and potential targets (updateUI is in ui.js)
        }
    } else if (actionState === 'selecting_target') {
        // Выбор целевого юнита на поле боя противника // Selecting a target unit on the opponent's battlefield
        if (location === 'battlefield' && owner.id !== currentPlayer.id) {
            attack(selectedCard.card, card); // Атаковать кликнутый юнит (attack находится в gameLogic.js) // Attack the clicked unit (attack is in gameLogic.js)
        }
        // Кликнули снова по исходному атакующему - отменить выбор атаки // Clicked the originating attacker again - cancel attack selection
        else if (location === 'battlefield' && owner.id === currentPlayer.id && card.instanceId === selectedCard.card.instanceId) {
             log("Атака отменена."); // Attack cancelled.
             selectedCard = null;
             actionState = 'none';
             updateUI(); // updateUI находится в ui.js // updateUI is in ui.js
        }
         // Разрешить клик по пустому месту или своим юнитам для отмены? Возможно, позже. // Allow clicking empty space or own units to cancel? Maybe later.
         else {
             log("Неверная цель."); // Invalid target.
             // Оставить состояние как selecting_target // Keep state as selecting_target
         }
    }
}

// Добавить обработчик для клика по области информации игрока (для прямых атак) // Add listener for clicking player info area (for direct attacks)
function handlePlayerAreaClick(targetPlayer) {
     if (actionState === 'selecting_target' && selectedCard && selectedCard.location === 'battlefield') {
         const opponent = getOpponentPlayer();
         if (targetPlayer === opponent) {
             // Проверка 'На страже' теперь обрабатывается внутри функции атаки // Guard check is now handled within the attack function
             attack(selectedCard.card, targetPlayer); // Передать объект игрока как цель (attack находится в gameLogic.js) // Pass the player object as target (attack is in gameLogic.js)
         } else {
            log("Нельзя выбрать целью себя или выбрать игрока в данный момент."); // Cannot target yourself or select player at this time.
         }
     }
}


// --- Начальная настройка --- // --- Initial Setup ---
// Ждать загрузки общих данных перед запуском игры и настройкой обработчиков // Wait for shared data to load before starting the game and setting up listeners
dataLoadedPromise.then(() => {
    console.log("Данные загружены, приступаем к настройке script.js."); // Data loaded, proceeding with script.js setup.

    // ПРИМЕЧАНИЕ: Прикрепление эффектов из cardEffectMap теперь менее актуально здесь, // NOTE: Attaching effects from cardEffectMap is now less relevant here
    // так как эффекты ищутся напрямую в playCard/attack/cleanup и т.д. // as effects are looked up directly in playCard/attack/cleanup etc.
    // Мы можем сохранить это для потенциальных будущих активируемых способностей. // We might keep it for potential future activated abilities.

    // Настроить обработчики событий, которые зависят от готовности DOM // Setup Event Listeners that depend on the DOM being ready
    // Убедиться, что это выполняется после разбора DOM, или использовать DOMContentLoaded // Make sure this runs after the DOM is parsed, or use DOMContentLoaded
    function setupGameMenu() {
        console.log("DOM загружен, настраиваем обработчики."); // DOM loaded, setting up listeners.

        // --- Обработчики пред-игровой настройки --- // --- Pre-Game Setup Listeners ---
        const startGameButton = document.getElementById('start-game-button');
        const p1DeckSelect = document.getElementById('player1-deck-select');
        const p2DeckSelect = document.getElementById('player2-deck-select');
        const setupErrorEl = document.getElementById('setup-error');

        // Заполнить выпадающие списки колод // Populate deck dropdowns
        console.log("Собираемся заполнить p1DeckSelect:", p1DeckSelect); // About to populate p1DeckSelect:
        console.log("Собираемся заполнить p2DeckSelect:", p2DeckSelect); // About to populate p2DeckSelect:
        populateDeckSelect(p1DeckSelect);
        populateDeckSelect(p2DeckSelect); // Заполнить для обоих игроков // Populate for both players
        console.log("Завершено заполнение выпадающих списков колод."); // Finished populating deck selects.

        if (startGameButton && p1DeckSelect && p2DeckSelect && setupErrorEl) {
            startGameButton.addEventListener('click', () => {
                const selectedDeckName1 = p1DeckSelect.value;
                const selectedDeckName2 = p2DeckSelect.value;
                setupErrorEl.textContent = ""; // Очистить предыдущие ошибки // Clear previous errors

                if (!selectedDeckName1 || !selectedDeckName2) {
                    setupErrorEl.textContent = "Пожалуйста, выберите колоды для обоих игроков."; // Please select decks for both players.
                    return;
                }

                const decks = getTemporarySavedDecks(); // Из shared.js // From shared.js
                const deck1 = decks.find(d => d.name === selectedDeckName1);
                const deck2 = decks.find(d => d.name === selectedDeckName2);

                if (!deck1 || !deck2) {
                     setupErrorEl.textContent = "Выбранная колода(ы) не найдена(ы)."; // Selected deck(s) not found.
                     return;
                }

                 // Базовая проверка колоды (размер) - Константы определены в deckbuilder.js, нужны и здесь, или переместить в shared // Basic Deck Validation (size) - Constants defined in deckbuilder.js, need them here too or move to shared
                 const MIN_DECK_SIZE_GAME = 20; // Пока дублируем // Duplicating for now
                 const MAX_DECK_SIZE_GAME = 40;
                 if (deck1.cards.length < MIN_DECK_SIZE_GAME || deck1.cards.length > MAX_DECK_SIZE_GAME ||
                     deck2.cards.length < MIN_DECK_SIZE_GAME || deck2.cards.length > MAX_DECK_SIZE_GAME) {
                     setupErrorEl.textContent = `Колоды должны содержать от ${MIN_DECK_SIZE_GAME} до ${MAX_DECK_SIZE_GAME} карт.`; // Decks must be between and cards.
                     return;
                 }


                // Начать игру с выбранными ID колод (startGame находится в gameLogic.js) // Start the game with the selected deck IDs (startGame is in gameLogic.js)
                startGame(deck1.cards, deck2.cards);
            });
        } else {
            console.error("Не удалось найти все элементы пред-игровой настройки!"); // Could not find all pre-game setup elements!
        }


        // --- Игровые обработчики (открытие наборов, конец хода и т.д.) --- // --- Game Listeners (Pack opening, end turn, etc.) ---
        const openPackButton = document.getElementById('open-pack-button');
        if (openPackButton) {
            // openPack теперь определён в packs.js // openPack is now defined in packs.js
            openPackButton.addEventListener('click', openPack);
        } else {
            console.error("Кнопка 'Открыть набор' не найдена!"); // Open Pack button not found!
        }

        const endTurnBtn = document.getElementById('end-turn-button');
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', () => {
                if (actionState !== 'none') {
                    selectedCard = null;
                    actionState = 'none';
                    log("Действие отменено из-за завершения хода."); // Action cancelled due to end turn.
                }
                endTurn(); // endTurn находится в gameLogic.js // endTurn is in gameLogic.js
            });
        }

        // Убедиться, что элементы существуют перед добавлением обработчиков // Ensure elements exist before adding listeners
        const p1InfoArea = document.getElementById('player1-info');
        if (p1InfoArea) p1InfoArea.addEventListener('click', () => handlePlayerAreaClick(players[0]));

        const p2InfoArea = document.getElementById('player2-info');
        if (p2InfoArea) p2InfoArea.addEventListener('click', () => handlePlayerAreaClick(players[1]));


        // ПРИМЕЧАНИЕ: startGame() больше не вызывается автоматически здесь. // NOTE: startGame() is no longer called automatically here.
        // Он вызывается обработчиком 'start-game-button'. // It's called by the 'start-game-button' listener.
    }

    if (document.readyState === "loading") {
        document.addEventListener('DOMContentLoaded', setupGameMenu);
    } else {
        setupGameMenu();
    }

}).catch(error => {
    console.error("Не удалось инициализировать игру из-за ошибки загрузки данных:", error); // Failed to initialize game due to data loading error:
    // Отобразить сообщение об ошибке пользователю на странице // Display an error message to the user on the page
    document.body.innerHTML = `<div style="color: red; padding: 20px;">Не удалось загрузить игровые данные. Пожалуйста, проверьте консоль и обновите страницу.</div>`; // Failed to load game data. Please check the console and refresh.
});

// Вспомогательная функция для заполнения выпадающих списков выбора колоды // Helper function to populate deck select dropdowns
function populateDeckSelect(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Выберите колоду --</option>'; // Очистить и добавить по умолчанию // Clear and add default // -- Select Deck -- 
    const decks = getTemporarySavedDecks(); // Из shared.js // From shared.js
    console.log("populateDeckSelect: загруженные колоды:", decks); // populateDeckSelect: decks loaded:
    const MIN_DECK_SIZE_GAME = 20; // Пока дублируем // Duplicating for now
    const MAX_DECK_SIZE_GAME = 40;
    decks.forEach(deck => {
        // Базовая проверка перед добавлением // Basic validation check before adding
        if (deck.cards.length >= MIN_DECK_SIZE_GAME && deck.cards.length <= MAX_DECK_SIZE_GAME) {
            console.log(`Добавление колоды в список: ${deck.name} (${deck.cards.length} карт)`); // Adding deck to select: ( cards)
            const option = document.createElement('option');
            option.value = deck.name;
            option.textContent = `${deck.name} (${deck.cards.length} карт)`; // ( cards)
            selectElement.appendChild(option);
        } else {
            console.warn(`Колода "${deck.name}" исключена из выбора (неверный размер: ${deck.cards.length})`); // Deck "" excluded from selection (invalid size: )
        }
    });
}

console.log("script.js загружен"); // script.js loaded
