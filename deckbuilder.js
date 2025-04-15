 // --- Логика конструктора колод --- // --- Deck Builder Logic ---

// --- Константы --- // --- Constants ---
const MIN_DECK_SIZE = 20;
const MAX_DECK_SIZE = 40;
const MAX_CARD_COPIES = 2;

// --- Состояние --- // --- State ---
let currentDeckIds = []; // Массив ID карт в создаваемой колоде // Array of card IDs in the deck being built
let currentDeckName = "";

// --- DOM-элементы --- // --- DOM Elements ---
let collectionListEl, currentDeckListEl, deckCardCountEl, deckMaxCountEl;
let deckNameInput, saveDeckButton, savedDecksListEl, loadDeckButton, deleteDeckButton, newDeckButton;
let sortCollectionSelect, deckStatsDetailsEl;

// --- Инициализация --- // --- Initialization ---
// Ждать загрузки общих данных и DOM // Wait for shared data and DOM content
Promise.all([dataLoadedPromise, new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve))])
    .then(() => {
        console.log("Данные и DOM готовы, инициализация конструктора колод."); // Data and DOM ready, initializing Deck Builder.
        // Get DOM elements after DOM is ready
        collectionListEl = document.getElementById('collection-list');
        currentDeckListEl = document.getElementById('current-deck-list');
        deckCardCountEl = document.getElementById('deck-card-count');
        deckMaxCountEl = document.getElementById('deck-max-count');
        deckNameInput = document.getElementById('deck-name');
        saveDeckButton = document.getElementById('save-deck-button');
        savedDecksListEl = document.getElementById('saved-decks-list');
        loadDeckButton = document.getElementById('load-deck-button');
        deleteDeckButton = document.getElementById('delete-deck-button');
        newDeckButton = document.getElementById('new-deck-button');
        sortCollectionSelect = document.getElementById('sort-collection');
        deckStatsDetailsEl = document.getElementById('deck-stats-details');

        if (!collectionListEl || !currentDeckListEl /* add checks for others */) {
             console.error("DOM-элементы конструктора колод не найдены!"); // Deck builder DOM elements not found!
             return;
        }

        deckMaxCountEl.textContent = MAX_DECK_SIZE; // Set max count display

        // Добавить обработчики событий // Add Event Listeners
        saveDeckButton.addEventListener('click', handleSaveDeck);
        loadDeckButton.addEventListener('click', handleLoadDeck);
        deleteDeckButton.addEventListener('click', handleDeleteDeck);
        newDeckButton.addEventListener('click', handleNewDeck);
        sortCollectionSelect.addEventListener('change', renderCollection); // Перерисовать при смене сортировки // Re-render on sort change

        // Начальный рендер // Initial Render
        populateSavedDecksDropdown();
        renderCollection();
        renderDeck(); // Сначала отрисовать пустую колоду // Render empty deck initially
    })
    .catch(error => {
        console.error("Не удалось инициализировать конструктор колод:", error); // Failed to initialize Deck Builder:
        // Можно вывести ошибку пользователю // Display error to user?
    });


// --- Rendering Functions ---

function renderCollection() {
    if (!collectionListEl) return;
    collectionListEl.innerHTML = ''; // Clear existing
    const collection = getTemporaryCollection(); // From shared.js
    const collectionCardIds = Object.keys(collection);

    // --- Sorting ---
    const sortBy = sortCollectionSelect.value;
    const rarityOrder = ["Common", "Rare", "Elite", "Super Rare", "Ultra Rare"]; // Define sort order

    collectionCardIds.sort((idA, idB) => {
        const cardA = cardDatabase[idA];
        const cardB = cardDatabase[idB];
        if (!cardA || !cardB) return 0;

        switch (sortBy) {
            case 'cost':
                if (cardA.cost !== cardB.cost) return cardA.cost - cardB.cost;
                return cardA.name.localeCompare(cardB.name); // Вторичная сортировка по имени // Secondary sort by name
            case 'rarity':
                 const rarityIndexA = rarityOrder.indexOf(cardA.rarity);
                 const rarityIndexB = rarityOrder.indexOf(cardB.rarity);
                 if (rarityIndexA !== rarityIndexB) return rarityIndexA - rarityIndexB;
                 return cardA.name.localeCompare(cardB.name); // Вторичная сортировка по имени // Secondary sort by name
            case 'faction':
                 const factionCompare = cardA.faction.localeCompare(cardB.faction);
                 if (factionCompare !== 0) return factionCompare;
                 return cardA.name.localeCompare(cardB.name); // Вторичная сортировка по имени // Secondary sort by name
            case 'name':
            default:
                return cardA.name.localeCompare(cardB.name);
        }
    });

    // --- Rendering Cards ---
    collectionCardIds.forEach(cardId => {
        const cardData = cardDatabase[cardId];
        const countInCollection = collection[cardId];
        const countInDeck = currentDeckIds.filter(id => id === cardId).length;

        if (cardData && countInCollection > 0) {
            // Use renderCollectionCard from shared.js
            const cardElement = renderCollectionCard(cardData, countInCollection);
            if (cardElement) {
                // Add styling based on deck status
                if (countInDeck > 0) {
                    cardElement.classList.add('card-in-deck');
                }
                if (countInDeck >= MAX_CARD_COPIES || countInDeck >= countInCollection) {
                     cardElement.classList.add('max-copies'); // Visually indicate max copies reached
                }

                // Add click listener to add card to deck
                cardElement.addEventListener('click', () => addCardToDeck(cardId));
                collectionListEl.appendChild(cardElement);
            }
        }
    });
}

function renderDeck() {
    if (!currentDeckListEl || !deckCardCountEl) return;
    currentDeckListEl.innerHTML = ''; // Clear existing

    // Create a frequency map for sorting/display
    const deckCardCounts = {};
    currentDeckIds.forEach(id => deckCardCounts[id] = (deckCardCounts[id] || 0) + 1);
    const uniqueCardIdsInDeck = Object.keys(deckCardCounts);

    // Sort deck cards (e.g., by cost then name)
     uniqueCardIdsInDeck.sort((idA, idB) => {
        const cardA = cardDatabase[idA];
        const cardB = cardDatabase[idB];
        if (!cardA || !cardB) return 0;
        if (cardA.cost !== cardB.cost) return cardA.cost - cardB.cost;
        return cardA.name.localeCompare(cardB.name);
    });

    // Render each unique card with its count
    uniqueCardIdsInDeck.forEach(cardId => {
        const cardData = cardDatabase[cardId];
        const count = deckCardCounts[cardId];
        if (cardData) {
            // Use renderCollectionCard from shared.js, passing the count
            const cardElement = renderCollectionCard(cardData, count);
            if (cardElement) {
                // Add click listener to remove card from deck
                cardElement.addEventListener('click', () => removeCardFromDeck(cardId));
                currentDeckListEl.appendChild(cardElement);
            }
        }
    });

    // Update deck count display
    deckCardCountEl.textContent = currentDeckIds.length;
    updateDeckStats(); // Update detailed stats
    renderCollection(); // Re-render collection to update 'in-deck' status
}

function updateDeckStats() {
     if (!deckStatsDetailsEl) return;

     const stats = {
         totalCards: currentDeckIds.length,
         unitCount: 0,
         orderCount: 0,
         costCounts: {}, // cost: count
         factionCounts: {}, // faction: count
     };

     currentDeckIds.forEach(id => {
         const card = cardDatabase[id];
         if (!card) return;

         if (card.type === 'Unit') stats.unitCount++;
         else if (card.type === 'Order') stats.orderCount++;

         stats.costCounts[card.cost] = (stats.costCounts[card.cost] || 0) + 1;
         stats.factionCounts[card.faction] = (stats.factionCounts[card.faction] || 0) + 1;
     });

     // Format stats for display
     let statsHtml = `Units: ${stats.unitCount} | Orders: ${stats.orderCount}<br>`;
     statsHtml += `Cost Curve: ${Object.entries(stats.costCounts).map(([cost, count]) => `${cost}(${count})`).join(', ')}<br>`;
     statsHtml += `Factions: ${Object.entries(stats.factionCounts).map(([faction, count]) => `${faction}(${count})`).join(', ')}`;

     deckStatsDetailsEl.innerHTML = statsHtml;

     // Add validation styling (e.g., red border if invalid size)
     const deckSizeValid = stats.totalCards >= MIN_DECK_SIZE && stats.totalCards <= MAX_DECK_SIZE;
     currentDeckListEl.style.borderColor = deckSizeValid ? '#eee' : 'red';
     deckCardCountEl.style.color = deckSizeValid ? 'inherit' : 'red';
}


// --- Deck Manipulation Functions ---

function addCardToDeck(cardId) {
    const collection = getTemporaryCollection();
    const countInCollection = collection[cardId] || 0;
    const countInDeck = currentDeckIds.filter(id => id === cardId).length;

    // Check limits
    if (currentDeckIds.length >= MAX_DECK_SIZE) {
        console.log("Нельзя добавить карту: колода заполнена."); // Cannot add card: Deck is full.
        alert("Колода заполнена (максимум " + MAX_DECK_SIZE + " карт)."); // Deck is full (Max ... cards).
        return;
    }
    if (countInDeck >= MAX_CARD_COPIES) {
        console.log(`Нельзя добавить карту: максимум ${MAX_CARD_COPIES} копий ${cardDatabase[cardId]?.name} разрешено.`); // Cannot add card: Max ... copies allowed.
        alert(`Максимум ${MAX_CARD_COPIES} копий "${cardDatabase[cardId]?.name}" разрешено в колоде.`); // Maximum ... copies of ... allowed in a deck.
        return;
    }
     if (countInDeck >= countInCollection) {
         console.log(`Нельзя добавить карту: недостаточно копий ${cardDatabase[cardId]?.name} в коллекции.`); // Cannot add card: Not enough copies in collection.
         alert(`У вас недостаточно копий "${cardDatabase[cardId]?.name}" для добавления.`); // You don't own enough copies ... to add another.
         return;
     }


    currentDeckIds.push(cardId);
    renderDeck(); // Re-render deck and collection
}

function removeCardFromDeck(cardId) {
    const indexToRemove = currentDeckIds.lastIndexOf(cardId); // Find last instance
    if (indexToRemove > -1) {
        currentDeckIds.splice(indexToRemove, 1);
        renderDeck(); // Re-render deck and collection
    }
}

// --- Save/Load Functions ---

function populateSavedDecksDropdown() {
    if (!savedDecksListEl) return;
    savedDecksListEl.innerHTML = '<option value="">-- Select a Deck --</option>'; // Clear and add default
    const decks = getTemporarySavedDecks(); // From shared.js
    decks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.name;
        option.textContent = deck.name;
        savedDecksListEl.appendChild(option);
    });
}

function handleSaveDeck() {
    const name = deckNameInput.value.trim();
    if (!name) {
        alert("Пожалуйста, введите название колоды."); // Please enter a name for the deck.
        return;
    }
    if (currentDeckIds.length < MIN_DECK_SIZE) {
         alert(`Колода слишком мала (минимум ${MIN_DECK_SIZE} карт).`); // Deck is too small (Min ... cards).
         return;
    }
     if (currentDeckIds.length > MAX_DECK_SIZE) {
         alert(`Колода слишком велика (максимум ${MAX_DECK_SIZE} карт).`); // Deck is too large (Max ... cards).
         return;
     }


    const success = saveTemporaryDeck(name, currentDeckIds); // From shared.js
    if (success) {
        alert(`Колода "${name}" успешно сохранена!`); // Deck ... saved successfully!
        populateSavedDecksDropdown(); // Обновить выпадающий список // Update dropdown
        // Выбрать сохранённую колоду в выпадающем списке // Select the saved deck in the dropdown
        savedDecksListEl.value = name;
    } else {
        alert(`Не удалось сохранить колоду "${name}".`); // Failed to save deck ...
    }
}

function handleLoadDeck() {
    const selectedDeckName = savedDecksListEl.value;
    if (!selectedDeckName) {
        alert("Пожалуйста, выберите колоду для загрузки."); // Please select a deck to load.
        return;
    }
    const decks = getTemporarySavedDecks();
    const deckToLoad = decks.find(deck => deck.name === selectedDeckName);

    if (deckToLoad) {
        currentDeckIds = [...deckToLoad.cards]; // Загрузить ID карт (создать копию) // Load the card IDs (create copy)
        currentDeckName = deckToLoad.name;
        deckNameInput.value = currentDeckName; // Обновить поле имени // Update name input
        renderDeck(); // Перерисовать отображение колоды // Re-render the deck display
        alert(`Колода "${selectedDeckName}" загружена.`); // Deck ... loaded.
    } else {
        alert(`Ошибка: не удалось найти колоду "${selectedDeckName}" для загрузки.`); // Error: Could not find deck ... to load.
    }
}

function handleDeleteDeck() {
     const selectedDeckName = savedDecksListEl.value;
    if (!selectedDeckName) {
        alert("Пожалуйста, выберите колоду для удаления."); // Please select a deck to delete.
        return;
    }

    if (confirm(`Вы уверены, что хотите удалить колоду "${selectedDeckName}"?`)) { // Are you sure you want to delete the deck ...?
        const success = deleteTemporaryDeck(selectedDeckName); // From shared.js
        if (success) {
            alert(`Колода "${selectedDeckName}" удалена.`); // Deck ... deleted.
            populateSavedDecksDropdown(); // Обновить выпадающий список // Update dropdown
            // Если удалённая колода была текущей, очистить конструктор // If the deleted deck was the currently loaded one, clear the builder
            if (currentDeckName === selectedDeckName) {
                handleNewDeck();
            }
        } else {
            alert(`Не удалось удалить колоду "${selectedDeckName}".`); // Failed to delete deck ...
        }
    }
}

function handleNewDeck() {
    currentDeckIds = [];
    currentDeckName = "";
    deckNameInput.value = "";
    savedDecksListEl.value = ""; // Снять выделение в выпадающем списке // Deselect in dropdown
    renderDeck();
    console.log("Текущая колода очищена."); // Cleared current deck.
}

// --- Sorting ---
function handleSortCollection() {
    renderCollection(); // Just re-render the collection with the new sort order
}

console.log("deckbuilder.js загружен"); // deckbuilder.js loaded
