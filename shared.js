// --- Shared Data & Functions ---

// --- Shared Data Definitions ---
let cardDatabase = {};
let loreData = {};
let traitDatabase = {}; // Added for traits

// --- Temporary In-Memory Data Management ---
// Load from localStorage if available
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

// --- Data Loading Promise ---
// Use a promise to ensure data is loaded before other scripts try to use it
const dataLoadedPromise = new Promise((resolve, reject) => {
    Promise.all([
        fetch('cards.json').then(response => response.json()),
        fetch('lore.json').then(response => response.json()),
        fetch('traits.json').then(response => response.json()) // Load traits.json
    ])
    .then(([cardData, loadedLoreData, loadedTraitData]) => { // Destructure the results
        // Process Card Data
        cardDatabase = {};
        cardData.forEach(card => {
            cardDatabase[card.id] = { ...card };
            // NOTE: Card effects specific to the game (cardEffectMap)
            // remain in script.js as they are not needed in the deck builder.
        });

        // Store Lore Data
        loreData = loadedLoreData;

        // Store Trait Data
        traitDatabase = loadedTraitData;

        console.log("Shared data loaded (cards, lore, traits).");
        initializeTemporaryCollection(); // Initialize collection after data is loaded
        resolve(); // Resolve the promise once data is ready
    })
    .catch(error => {
        console.error("Error loading shared game data:", error);
        reject(error); // Reject the promise on error
    });
});
`x`

// --- Temporary Storage Functions ---
function initializeTemporaryCollection() {
    console.log("Initializing temporary collection...");
    // Check if already initialized (e.g., if script runs multiple times)
    if (Object.keys(playerCollection).length > 0 && savedDecks.length > 0) {
         console.log("Temporary collection already initialized.");
         return;
    }

    playerCollection = {}; // Reset
    savedDecks = []; // Reset

    // Populate initial collection
    for (const cardId in cardDatabase) {
        const card = cardDatabase[cardId];
        // Add 2 copies of each Common card, excluding templates
        if (card.rarity === 'Common' && !card.isTemplate) {
            playerCollection[cardId] = 2;
        }
    }
    console.log("Initial Collection:", playerCollection);

    // Add a default deck for testing? (Optional)
    // saveTemporaryDeck("My First Deck", Object.keys(playerCollection).slice(0, 5));

    // In a real scenario, this would load from localStorage or a server
}

function getTemporaryCollection() {
    // Return a copy to prevent direct modification? For now, return reference.
    return playerCollection;
}

function addCardToTemporaryCollection(cardId, quantity = 1) {
    if (!cardDatabase[cardId]) {
        console.error(`Attempted to add unknown card ID: ${cardId}`);
        return;
    }
    playerCollection[cardId] = (playerCollection[cardId] || 0) + quantity;
    console.log(`Added ${quantity}x ${cardId} to collection. New count: ${playerCollection[cardId]}`);
    saveToLocalStorage();
}

function removeCardFromTemporaryCollection(cardId, quantity = 1) {
    if (!playerCollection[cardId] || playerCollection[cardId] < quantity) {
        console.error(`Attempted to remove ${quantity}x ${cardId}, but only ${playerCollection[cardId] || 0} exist.`);
        return false; // Indicate failure
    }
    playerCollection[cardId] -= quantity;
    if (playerCollection[cardId] <= 0) {
        delete playerCollection[cardId]; // Remove entry if count is zero or less
    }
    console.log(`Removed ${quantity}x ${cardId} from collection. Remaining: ${playerCollection[cardId] || 0}`);
    saveToLocalStorage();
    return true; // Indicate success
}

function getTemporarySavedDecks() {
    // Return a copy to prevent direct modification? For now, return reference.
    return savedDecks;
}

function saveTemporaryDeck(name, cardIds) {
    if (!name || !Array.isArray(cardIds)) {
        console.error("Invalid parameters for saveTemporaryDeck");
        return false;
    }
    // Ensure card IDs are strings
    const stringCardIds = cardIds.map(id => String(id));

    const existingDeckIndex = savedDecks.findIndex(deck => deck.name === name);
    if (existingDeckIndex > -1) {
        // Update existing deck
        savedDecks[existingDeckIndex].cards = [...stringCardIds];
        console.log(`Updated temporary deck: ${name}`);
    } else {
        // Add new deck
        savedDecks.push({ name: name, cards: [...stringCardIds] });
        console.log(`Saved new temporary deck: ${name}`);
    }
    saveToLocalStorage();
    return true;
}

function deleteTemporaryDeck(name) {
    const initialLength = savedDecks.length;
    savedDecks = savedDecks.filter(deck => deck.name !== name);
    if (savedDecks.length < initialLength) {
        console.log(`Deleted temporary deck: ${name}`);
        saveToLocalStorage();
        return true;
    }
    console.log(`Temporary deck not found for deletion: ${name}`);
    return false;
}

// --- Shared UI Rendering Functions ---

// Simplified card renderer for collection/pack/deck display
function renderCollectionCard(cardData, count = null) {
    if (!cardData) return null;
    const cardEl = document.createElement('div');
    // Add rarity class for potential styling
    cardEl.classList.add('card', cardData.type.toLowerCase(), cardData.rarity.toLowerCase().replace(' ', '-'));
    cardEl.dataset.cardId = cardData.id; // Store base ID

    let content = "";
     const factionInfo = loreData.factions ? loreData.factions[cardData.faction] : null;
     const countryInfo = loreData.countries ? loreData.countries[cardData.country] : null;
     const factionColor = factionInfo ? factionInfo.color : '#ccc';

    // Ribbon bar
    if (cardData.type === 'Order') {
        content += `<div class="card-ribbon" style="background-color: #205020; color: #fff; text-align: center;">ПРИКАЗ</div>`;
        content += `<strong>${cardData.name}</strong>`;
        content += `<div class="cost">Cost: ${cardData.cost}</div>`;
    } else {
        content += `<div class="card-ribbon" style="background-color: ${factionColor};">
            <span class="ribbon-faction" title="${factionInfo ? factionInfo.description : ''}">${cardData.faction}</span> &ndash;
            <span class="ribbon-country" title="${countryInfo ? countryInfo.description : ''}">${countryInfo ? countryInfo.name : cardData.country}</span>
        </div>`;
        content += `<strong>${cardData.name}</strong>`;
        content += `<div class="cost">Cost: ${cardData.cost}</div>`;
        content += `<div class="stats"><span class="atk">ATK: ${cardData.atk}</span> | <span class="hp">HP: ${cardData.maxHp}</span></div>`;
    }
    if (cardData.traits && cardData.traits.length > 0) {
        // Map trait IDs to names and add tooltips from traitDatabase
        const traitSpans = cardData.traits.map(traitId => {
            const traitInfo = traitDatabase[traitId];
            const traitName = traitInfo ? traitInfo.name : traitId; // Fallback to ID if not found
            const traitDesc = traitInfo ? traitInfo.description : 'Unknown trait';
            return `<span class="trait" title="${traitDesc}">${traitName}</span>`;
        }).join(', ');
        content += `<div class="card-traits">Traits: ${traitSpans}</div>`;
    }
    content += `<div class="rarity">Редкость: ${cardData.rarity}</div>`; // Show rarity

    // Add count badge if provided (for collection view)
    if (count !== null && count > 1) {
        content += `<span class="card-count-badge">x${count}</span>`;
    }

    // --- Generate and Add Effect Description ---
    let effectText = "";
    let effectDescription = ""; // For tooltip
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
    content += effectText; // Add effect text to visible card content
    cardEl.innerHTML = content;


    // Combine base description and effect description for tooltip
    let fullDescription = cardData.description || "";
    if (effectDescription) {
        fullDescription += (fullDescription ? "\n" : "") + effectDescription.trim(); // Add newline if base description exists
    }
    if (fullDescription) {
         cardEl.title = fullDescription;
    }
    // --- End Tooltip Generation ---

    return cardEl;
}

// Helper function to generate human-readable effect text
function generateEffectText(effectType, value, target) {
    switch (effectType) {
        case 'heal_friendly':
            return `Heal a friendly unit for ${value || '?'}.`; // Target logic might be complex for text
        case 'damage_all':
            return `Deal ${value || '?'} damage to all units.`;
        case 'improve_unit':
            let stats = [];
            if (value?.atk) stats.push(`+${value.atk} ATK`);
            if (value?.hp) stats.push(`+${value.hp} HP`);
            let targetDesc = "a random friendly unit"; // Default
            if (target === 'random_friendly_vehicle') targetDesc = "случайной союзной технике";
            return `Добавляет ${stats.join('/')} ${targetDesc}.`;
        // Add more cases as needed
        default:
            return `Unknown effect (${effectType}).`;
    }
}

/**
 * Global log function for game events.
 * Appends to gameLog (if available) and prints to console.
 */
function log(message) {
    if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) {
        gameLog.push(message);
    }
    console.log("[LOG]", message);
}

/**
 * Fisher-Yates shuffle for arrays (in place).
 * Usage: shuffle(array)
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Creates a new card instance with a unique instanceId.
 * @param {string} cardId
 * @returns {object} card instance
 */
function createCardInstance(cardId) {
    if (!cardDatabase[cardId]) {
        throw new Error("Card ID not found: " + cardId);
    }
    // Use global uniqueCardIdCounter if available, else fallback to timestamp
    let instanceId;
    if (typeof uniqueCardIdCounter !== "undefined") {
        instanceId = ++uniqueCardIdCounter;
    } else {
        instanceId = Date.now() + Math.floor(Math.random() * 10000);
    }
    // Deep clone the card data
    const card = JSON.parse(JSON.stringify(cardDatabase[cardId]));
    card.instanceId = instanceId;
    // For units, set current hp to maxHp if not already set
    if (card.type === "Unit" && card.maxHp !== undefined && card.hp === undefined) {
        card.hp = card.maxHp;
    }
    return card;
}

console.log("shared.js loaded");
