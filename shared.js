// --- Общие данные и функции --- // --- Shared Data & Functions ---

// --- Определения общих данных --- // --- Shared Data Definitions ---
let cardDatabase = {};
let loreData = {};
let traitDatabase = {}; // Добавлено для черт // Added for traits

// --- Временное управление данными в памяти --- // --- Temporary In-Memory Data Management ---
// Загрузить из localStorage, если доступно // Load from localStorage if available
let playerCollection = {};
let savedDecks = [];

function loadFromLocalStorage() {
    const pc = localStorage.getItem('playerCollection');
    const sd = localStorage.getItem('savedDecks');
    if (pc) {
        try { playerCollection = JSON.parse(pc); } catch (e) { playerCollection = {}; }
    }
    if (sd) {
        try { savedDecks = JSON.parse(sd); } catch (e) { savedDecks = []; }
    }
}
function saveToLocalStorage() {
    localStorage.setItem('playerCollection', JSON.stringify(playerCollection));
    localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
}
loadFromLocalStorage();

// --- Промис загрузки данных --- // --- Data Loading Promise ---
// Используем промис, чтобы убедиться, что данные загружены, прежде чем другие скрипты попытаются их использовать // Use a promise to ensure data is loaded before other scripts try to use it
const dataLoadedPromise = new Promise((resolve, reject) => {
    Promise.all([
        fetch('cards.json').then(response => response.json()),
        fetch('lore.json').then(response => response.json()),
        fetch('traits.json').then(response => response.json()) // Загрузить traits.json // Load traits.json
    ])
    .then(([cardData, loadedLoreData, loadedTraitData]) => { // Деструктурировать результаты // Destructure the results
        // Обработать данные карт // Process Card Data
        cardDatabase = {};
        cardData.forEach(card => {
            cardDatabase[card.id] = { ...card };
            // ПРИМЕЧАНИЕ: Эффекты карт, специфичные для игры (cardEffectMap) // NOTE: Card effects specific to the game (cardEffectMap)
            // остаются в script.js, так как они не нужны в конструкторе колод. // remain in script.js as they are not needed in the deck builder.
        });

        // Сохранить данные лора // Store Lore Data
        loreData = loadedLoreData;

        // Сохранить данные черт // Store Trait Data
        traitDatabase = loadedTraitData;

        console.log("Общие данные загружены (карты, лор, черты)."); // Shared data loaded (cards, lore, traits).
        initializeTemporaryCollection(); // Инициализировать коллекцию после загрузки данных // Initialize collection after data is loaded
        resolve(); // Разрешить промис, когда данные готовы // Resolve the promise once data is ready
    })
    .catch(error => {
        console.error("Ошибка загрузки общих игровых данных:", error); // Error loading shared game data:
        reject(error); // Отклонить промис при ошибке // Reject the promise on error
    });
});
`x`

// --- Функции временного хранилища --- // --- Temporary Storage Functions ---
function initializeTemporaryCollection() {
    console.log("Инициализация временной коллекции..."); // Initializing temporary collection...
    // Проверить, была ли уже инициализирована (например, если скрипт запускается несколько раз) // Check if already initialized (e.g., if script runs multiple times)
    if (Object.keys(playerCollection).length > 0 && savedDecks.length > 0) {
         console.log("Временная коллекция уже инициализирована."); // Temporary collection already initialized.
         return;
    }

    playerCollection = {}; // Сброс // Reset
    savedDecks = []; // Сброс // Reset

    // Заполнить начальную коллекцию // Populate initial collection
    for (const cardId in cardDatabase) {
        const card = cardDatabase[cardId];
        // Добавить 2 копии каждой обычной карты, исключая шаблоны // Add 2 copies of each Common card, excluding templates
        if (card.rarity === 'Common' && !card.isTemplate) {
            playerCollection[cardId] = 2;
        }
    }
    console.log("Начальная коллекция:", playerCollection); // Initial Collection:

    // Добавить колоду по умолчанию для тестирования? (Необязательно) // Add a default deck for testing? (Optional)
    // saveTemporaryDeck("Моя первая колода", Object.keys(playerCollection).slice(0, 5)); // My First Deck

    // В реальном сценарии это загружалось бы из localStorage или с сервера // In a real scenario, this would load from localStorage or a server
}

function getTemporaryCollection() {
    // Вернуть копию для предотвращения прямого изменения? Пока возвращаем ссылку. // Return a copy to prevent direct modification? For now, return reference.
    return playerCollection;
}

function addCardToTemporaryCollection(cardId, quantity = 1) {
    if (!cardDatabase[cardId]) {
        console.error(`Попытка добавить неизвестный ID карты: ${cardId}`); // Attempted to add unknown card ID:
        return;
    }
    playerCollection[cardId] = (playerCollection[cardId] || 0) + quantity;
    console.log(`Добавлено ${quantity}x ${cardId} в коллекцию. Новое количество: ${playerCollection[cardId]}`); // Added x to collection. New count:
    saveToLocalStorage();
}

function removeCardFromTemporaryCollection(cardId, quantity = 1) {
    if (!playerCollection[cardId] || playerCollection[cardId] < quantity) {
        console.error(`Попытка удалить ${quantity}x ${cardId}, но существует только ${playerCollection[cardId] || 0}.`); // Attempted to remove x , but only exist.
        return false; // Указать на неудачу // Indicate failure
    }
    playerCollection[cardId] -= quantity;
    if (playerCollection[cardId] <= 0) {
        delete playerCollection[cardId]; // Удалить запись, если количество ноль или меньше // Remove entry if count is zero or less
    }
    console.log(`Удалено ${quantity}x ${cardId} из коллекции. Осталось: ${playerCollection[cardId] || 0}`); // Removed x from collection. Remaining:
    saveToLocalStorage();
    return true; // Указать на успех // Indicate success
}

function getTemporarySavedDecks() {
    // Вернуть копию для предотвращения прямого изменения? Пока возвращаем ссылку. // Return a copy to prevent direct modification? For now, return reference.
    return savedDecks;
}

function saveTemporaryDeck(name, cardIds) {
    if (!name || !Array.isArray(cardIds)) {
        console.error("Неверные параметры для saveTemporaryDeck"); // Invalid parameters for saveTemporaryDeck
        return false;
    }
    // Убедиться, что ID карт являются строками // Ensure card IDs are strings
    const stringCardIds = cardIds.map(id => String(id));

    const existingDeckIndex = savedDecks.findIndex(deck => deck.name === name);
    if (existingDeckIndex > -1) {
        // Обновить существующую колоду // Update existing deck
        savedDecks[existingDeckIndex].cards = [...stringCardIds];
        console.log(`Обновлена временная колода: ${name}`); // Updated temporary deck:
    } else {
        // Добавить новую колоду // Add new deck
        savedDecks.push({ name: name, cards: [...stringCardIds] });
        console.log(`Сохранена новая временная колода: ${name}`); // Saved new temporary deck:
    }
    saveToLocalStorage();
    return true;
}

function deleteTemporaryDeck(name) {
    const initialLength = savedDecks.length;
    savedDecks = savedDecks.filter(deck => deck.name !== name);
    if (savedDecks.length < initialLength) {
        console.log(`Удалена временная колода: ${name}`); // Deleted temporary deck:
        saveToLocalStorage();
        return true;
    }
    console.log(`Временная колода не найдена для удаления: ${name}`); // Temporary deck not found for deletion:
    return false;
}

// --- Общие функции отрисовки интерфейса --- // --- Shared UI Rendering Functions ---

// Упрощённый рендерер карт для отображения коллекции/набора/колоды // Simplified card renderer for collection/pack/deck display
function renderCollectionCard(cardData, count = null) {
    if (!cardData) return null;
    const cardEl = document.createElement('div');
    // Добавить класс редкости для потенциального стиля // Add rarity class for potential styling
    cardEl.classList.add('card', cardData.type.toLowerCase(), cardData.rarity.toLowerCase().replace(' ', '-'));
    cardEl.dataset.cardId = cardData.id; // Сохранить базовый ID // Store base ID

    let content = "";
     const factionInfo = loreData.factions ? loreData.factions[cardData.faction] : null;
     const countryInfo = loreData.countries ? loreData.countries[cardData.country] : null;
     const factionColor = factionInfo ? factionInfo.color : '#ccc';

    // Лента // Ribbon bar
    if (cardData.type === 'Order') {
        content += `<div class="card-ribbon" style="background-color: #205020; color: #fff; text-align: center;">ПРИКАЗ</div>`;
        content += `<strong>${cardData.name}</strong>`;
        content += `<div class="cost">Стоимость: ${cardData.cost}</div>`; // Cost:
    } else {
        content += `<div class="card-ribbon" style="background-color: ${factionColor};">
            <span class="ribbon-faction" title="${factionInfo ? factionInfo.description : ''}">${cardData.faction}</span> &ndash;
            <span class="ribbon-country" title="${countryInfo ? countryInfo.description : ''}">${countryInfo ? countryInfo.name : cardData.country}</span>
        </div>`;
        content += `<strong>${cardData.name}</strong>`;
        content += `<div class="cost">Стоимость: ${cardData.cost}</div>`; // Cost:
        content += `<div class="stats"><span class="atk">АТК: ${cardData.atk}</span> | <span class="hp">ОЗ: ${cardData.maxHp}</span></div>`; // ATK: | HP:
    }
    if (cardData.traits && cardData.traits.length > 0) {
        // Сопоставить ID черт с именами и добавить всплывающие подсказки из traitDatabase // Map trait IDs to names and add tooltips from traitDatabase
        const traitSpans = cardData.traits.map(traitId => {
            const traitInfo = traitDatabase[traitId];
            const traitName = traitInfo ? traitInfo.name : traitId; // Запасной вариант - ID, если не найдено // Fallback to ID if not found
            const traitDesc = traitInfo ? traitInfo.description : 'Неизвестная черта'; // Unknown trait
            return `<span class="trait" title="${traitDesc}">${traitName}</span>`;
        }).join(', ');
        content += `<div class="card-traits">Черты: ${traitSpans}</div>`; // Traits:
    }
    content += `<div class="rarity">Редкость: ${cardData.rarity}</div>`; // Показать редкость // Show rarity

    // Добавить значок количества, если предоставлено (для вида коллекции) // Add count badge if provided (for collection view)
    if (count !== null && count > 1) {
        content += `<span class="card-count-badge">x${count}</span>`;
    }

    // --- Генерация и добавление описания эффекта --- // --- Generate and Add Effect Description ---
    let effectText = "";
    let effectDescription = ""; // Для всплывающей подсказки // For tooltip
     if (cardData.deployEffect) {
        const generatedText = `При развёртывании: ${generateEffectText(cardData.deployEffect, cardData.deployValue, cardData.deployTarget)}`;
        effectText += `<div class="card-effect">${generatedText}</div>`;
        effectDescription += ` ${generatedText}.`;
    }
    if (cardData.destroyedEffect) {
         const generatedText = `При уничтожении: ${generateEffectText(cardData.destroyedEffect, cardData.destroyedValue, cardData.destroyedTarget)}`;
         effectText += `<div class="card-effect">${generatedText}</div>`;
         effectDescription += ` ${generatedText}.`;
    }
    content += effectText; // Добавить текст эффекта к видимому содержимому карты // Add effect text to visible card content
    cardEl.innerHTML = content;


    // Объединить базовое описание и описание эффекта для всплывающей подсказки // Combine base description and effect description for tooltip
    let fullDescription = cardData.description || "";
    if (effectDescription) {
        fullDescription += (fullDescription ? "\n" : "") + effectDescription.trim(); // Добавить новую строку, если базовое описание существует // Add newline if base description exists
    }
    if (fullDescription) {
         cardEl.title = fullDescription;
    }
    // --- Конец генерации всплывающей подсказки --- // --- End Tooltip Generation ---

    return cardEl;
}

// Вспомогательная функция для генерации читаемого текста эффекта // Helper function to generate human-readable effect text
function generateEffectText(effectType, value, target) {
    switch (effectType) {
        case 'heal_friendly':
            return `Лечит дружественного юнита на ${value || '?'}.`; // Логика цели может быть сложной для текста // Target logic might be complex for text // Heal a friendly unit for .
        case 'damage_all':
            return `Наносит ${value || '?'} урона всем юнитам.`; // Deal damage to all units.
        case 'improve_unit':
            let stats = [];
            if (value?.atk) stats.push(`+${value.atk} АТК`); // ATK
            if (value?.hp) stats.push(`+${value.hp} ОЗ`); // HP
            let targetDesc = "случайному дружественному юниту"; // По умолчанию // Default // a random friendly unit
            if (target === 'random_friendly_vehicle') targetDesc = "случайной союзной технике";
            return `Добавляет ${stats.join('/')} ${targetDesc}.`;
        // Добавить больше случаев по мере необходимости // Add more cases as needed
        default:
            return `Неизвестный эффект (${effectType}).`; // Unknown effect ().
    }
}

/**
 * Глобальная функция логирования игровых событий. // Global log function for game events.
 * Добавляет в gameLog (если доступно) и выводит в консоль. // Appends to gameLog (if available) and prints to console.
 */
function log(message) {
    if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) {
        gameLog.push(message);
    }
    console.log("[ЛОГ]", message); // [LOG]
}

/**
 * Перетасовка Фишера-Йетса для массивов (на месте). // Fisher-Yates shuffle for arrays (in place).
 * Использование: shuffle(array) // Usage: shuffle(array)
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Создаёт новый экземпляр карты с уникальным instanceId. // Creates a new card instance with a unique instanceId.
 * @param {string} cardId
 * @returns {object} экземпляр карты // card instance
 */
function createCardInstance(cardId) {
    if (!cardDatabase[cardId]) {
        throw new Error("ID карты не найден: " + cardId); // Card ID not found:
    }
    // Использовать глобальный uniqueCardIdCounter, если доступен, иначе использовать временную метку // Use global uniqueCardIdCounter if available, else fallback to timestamp
    let instanceId;
    if (typeof uniqueCardIdCounter !== "undefined") {
        instanceId = ++uniqueCardIdCounter;
    } else {
        instanceId = Date.now() + Math.floor(Math.random() * 10000);
    }
    // Глубокое клонирование данных карты // Deep clone the card data
    const card = JSON.parse(JSON.stringify(cardDatabase[cardId]));
    card.instanceId = instanceId;
    // Для юнитов установить текущие ОЗ равными максимальным ОЗ, если они ещё не установлены // For units, set current hp to maxHp if not already set
    if (card.type === "Unit" && card.maxHp !== undefined && card.hp === undefined) {
        card.hp = card.maxHp;
    }
    return card;
}

console.log("shared.js загружен"); // shared.js loaded
