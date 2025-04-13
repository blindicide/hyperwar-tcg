// --- Card Definitions & Lore (Loaded from JSON) ---
// --- Effect Maps ---
// For Orders and specific activated abilities (if any)
let cardEffectMap = {
    "5008": (player) => { drawCard(player); log(`${player.name} played Call Reinforcements.`); }, // Call Reinforcements ID
    "5009": (player) => { log(`${player.name} played Air Strike (Targeting not implemented).`); } // Air Strike ID
};
// NOTE: deployEffectMap and destroyedEffectMap are removed. Logic is now in gameLogic.js


// --- Game State ---
// NOTE: cardDatabase, loreData, playerCollection, savedDecks, and related functions
// are now managed in shared.js

let players = [
    { id: 1, name: "Player 1", hp: 30, supply: 0, maxSupply: 0, deck: [], hand: [], battlefield: [], elementIDs: { hp: 'p1-hp', supply: 'p1-kredits', maxSupply: 'p1-max-kredits', deck: 'p1-deck', hand: 'p1-hand', battlefield: 'p1-battlefield' } },
    { id: 2, name: "Player 2", hp: 30, supply: 0, maxSupply: 0, deck: [], hand: [], battlefield: [], elementIDs: { hp: 'p2-hp', supply: 'p2-kredits', maxSupply: 'p2-max-kredits', deck: 'p2-deck', hand: 'p2-hand', battlefield: 'p2-battlefield' } }
];
let currentPlayerIndex = 0;
let turnNumber = 1;
let gameLog = [];
let uniqueCardIdCounter = 0; // To give each card instance a unique ID

// Selection state for actions (playing, attacking)
let selectedCard = null; // { card: cardObject, location: 'hand'/'battlefield', owner: player }
let actionState = 'none'; // 'none', 'selecting_attacker', 'selecting_target'

// --- Game Elements ---
// Defined globally for access by ui.js and gameLogic.js as well
const p1InfoEl = document.getElementById('player1-info');
const p2InfoEl = document.getElementById('player2-info');
const turnInfoEl = document.getElementById('turn-info');
const currentPlayerEl = document.getElementById('current-player');
const turnNumberEl = document.getElementById('turn-number');
const endTurnButton = document.getElementById('end-turn-button');
const logListEl = document.getElementById('log-list');

// --- Utility Functions (Potentially move to shared.js later if needed elsewhere) ---
// Keeping getPlayer, getCurrentPlayer, getOpponentPlayer here as they directly manipulate the global 'players' state
function getPlayer(index) {
    return players[index];
}

function getCurrentPlayer() {
    return players[currentPlayerIndex];
}

function getOpponentPlayer() {
    return players[1 - currentPlayerIndex];
}

// --- Core Game Logic Functions ---
// Moved to gameLogic.js:
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

// --- Pack Opening Logic ---
// Moved to packs.js:
// - generatePack()
// - openPack()


// --- Event Handlers ---
// Note: These handlers call functions now defined in gameLogic.js and ui.js
// They also rely on global state variables like selectedCard, actionState, players.
function handleCardClick(card, location, owner) {
    const currentPlayer = getCurrentPlayer(); // Still needed here to check turn

    // Ignore clicks if it's not the owner's turn (unless targeting)
    if (owner.id !== currentPlayer.id && actionState !== 'selecting_target') return;

    console.log(`Clicked: ${card.name}, Location: ${location}, Owner: ${owner.name}, ActionState: ${actionState}`);

    if (actionState === 'none') {
        // Selecting a card from hand to play
        if (location === 'hand' && owner.id === currentPlayer.id && card.cost <= currentPlayer.supply) {
            // If it's an Order, just play it immediately (no targeting yet)
            if (card.type === 'Order') {
                 const handIndex = owner.hand.findIndex(c => c.instanceId === card.instanceId);
                 if (handIndex !== -1) {
                     playCard(owner, card.instanceId, handIndex); // playCard is in gameLogic.js
                 }
            } else if (card.type === 'Unit') {
                 // If it's a unit, play it (no targeting choice for placement yet)
                 const handIndex = owner.hand.findIndex(c => c.instanceId === card.instanceId);
                 if (handIndex !== -1) {
                     playCard(owner, card.instanceId, handIndex); // playCard is in gameLogic.js
                 }
            }
        }
        // Selecting a unit on the battlefield to initiate an attack
        else if (location === 'battlefield' && owner.id === currentPlayer.id && card.canAttack) {
            selectedCard = { card: card, location: location, owner: owner };
            actionState = 'selecting_target';
            log(`Selected ${card.name} to attack. Choose target.`);
            updateUI(); // Highlight the selected card and potential targets (updateUI is in ui.js)
        }
    } else if (actionState === 'selecting_target') {
        // Selecting a target unit on the opponent's battlefield
        if (location === 'battlefield' && owner.id !== currentPlayer.id) {
            attack(selectedCard.card, card); // Attack the clicked unit (attack is in gameLogic.js)
        }
        // Clicked the originating attacker again - cancel attack selection
        else if (location === 'battlefield' && owner.id === currentPlayer.id && card.instanceId === selectedCard.card.instanceId) {
             log("Attack cancelled.");
             selectedCard = null;
             actionState = 'none';
             updateUI(); // updateUI is in ui.js
        }
         // Allow clicking empty space or own units to cancel? Maybe later.
         else {
             log("Invalid target.");
             // Keep state as selecting_target
         }
    }
}

// Add listener for clicking player info area (for direct attacks)
function handlePlayerAreaClick(targetPlayer) {
     if (actionState === 'selecting_target' && selectedCard && selectedCard.location === 'battlefield') {
         const opponent = getOpponentPlayer();
         if (targetPlayer === opponent) {
             // Guard check is now handled within the attack function
             attack(selectedCard.card, targetPlayer); // Pass the player object as target (attack is in gameLogic.js)
         } else {
            log("Cannot target yourself or select player at this time.");
         }
     }
}


// --- Initial Setup ---
// Wait for shared data to load before starting the game and setting up listeners
dataLoadedPromise.then(() => {
    console.log("Data loaded, proceeding with script.js setup.");

    // NOTE: Attaching effects from cardEffectMap is now less relevant here
    // as effects are looked up directly in playCard/attack/cleanup etc.
    // We might keep it for potential future activated abilities.

    // Setup Event Listeners that depend on the DOM being ready
    // Make sure this runs after the DOM is parsed, or use DOMContentLoaded
    function setupGameMenu() {
        console.log("DOM loaded, setting up listeners.");

        // --- Pre-Game Setup Listeners ---
        const startGameButton = document.getElementById('start-game-button');
        const p1DeckSelect = document.getElementById('player1-deck-select');
        const p2DeckSelect = document.getElementById('player2-deck-select');
        const setupErrorEl = document.getElementById('setup-error');

        // Populate deck dropdowns
        console.log("About to populate p1DeckSelect:", p1DeckSelect);
        console.log("About to populate p2DeckSelect:", p2DeckSelect);
        populateDeckSelect(p1DeckSelect);
        populateDeckSelect(p2DeckSelect); // Populate for both players
        console.log("Finished populating deck selects.");

        if (startGameButton && p1DeckSelect && p2DeckSelect && setupErrorEl) {
            startGameButton.addEventListener('click', () => {
                const selectedDeckName1 = p1DeckSelect.value;
                const selectedDeckName2 = p2DeckSelect.value;
                setupErrorEl.textContent = ""; // Clear previous errors

                if (!selectedDeckName1 || !selectedDeckName2) {
                    setupErrorEl.textContent = "Please select decks for both players.";
                    return;
                }

                const decks = getTemporarySavedDecks(); // From shared.js
                const deck1 = decks.find(d => d.name === selectedDeckName1);
                const deck2 = decks.find(d => d.name === selectedDeckName2);

                if (!deck1 || !deck2) {
                     setupErrorEl.textContent = "Selected deck(s) not found.";
                     return;
                }

                 // Basic Deck Validation (size) - Constants defined in deckbuilder.js, need them here too or move to shared
                 const MIN_DECK_SIZE_GAME = 20; // Duplicating for now
                 const MAX_DECK_SIZE_GAME = 40;
                 if (deck1.cards.length < MIN_DECK_SIZE_GAME || deck1.cards.length > MAX_DECK_SIZE_GAME ||
                     deck2.cards.length < MIN_DECK_SIZE_GAME || deck2.cards.length > MAX_DECK_SIZE_GAME) {
                     setupErrorEl.textContent = `Decks must be between ${MIN_DECK_SIZE_GAME} and ${MAX_DECK_SIZE_GAME} cards.`;
                     return;
                 }


                // Start the game with the selected deck IDs (startGame is in gameLogic.js)
                startGame(deck1.cards, deck2.cards);
            });
        } else {
            console.error("Could not find all pre-game setup elements!");
        }


        // --- Game Listeners (Pack opening, end turn, etc.) ---
        const openPackButton = document.getElementById('open-pack-button');
        if (openPackButton) {
            // openPack is now defined in packs.js
            openPackButton.addEventListener('click', openPack);
        } else {
            console.error("Open Pack button not found!");
        }

        const endTurnBtn = document.getElementById('end-turn-button');
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', () => {
                if (actionState !== 'none') {
                    selectedCard = null;
                    actionState = 'none';
                    log("Action cancelled due to end turn.");
                }
                endTurn(); // endTurn is in gameLogic.js
            });
        }

        // Ensure elements exist before adding listeners
        const p1InfoArea = document.getElementById('player1-info');
        if (p1InfoArea) p1InfoArea.addEventListener('click', () => handlePlayerAreaClick(players[0]));

        const p2InfoArea = document.getElementById('player2-info');
        if (p2InfoArea) p2InfoArea.addEventListener('click', () => handlePlayerAreaClick(players[1]));


        // NOTE: startGame() is no longer called automatically here.
        // It's called by the 'start-game-button' listener.
    }

    if (document.readyState === "loading") {
        document.addEventListener('DOMContentLoaded', setupGameMenu);
    } else {
        setupGameMenu();
    }

}).catch(error => {
    console.error("Failed to initialize game due to data loading error:", error);
    // Display an error message to the user on the page
    document.body.innerHTML = `<div style="color: red; padding: 20px;">Failed to load game data. Please check the console and refresh.</div>`;
});

// Helper function to populate deck select dropdowns
function populateDeckSelect(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Select Deck --</option>'; // Clear and add default
    const decks = getTemporarySavedDecks(); // From shared.js
    console.log("populateDeckSelect: decks loaded:", decks);
    const MIN_DECK_SIZE_GAME = 20; // Duplicating for now
    const MAX_DECK_SIZE_GAME = 40;
    decks.forEach(deck => {
        // Basic validation check before adding
        if (deck.cards.length >= MIN_DECK_SIZE_GAME && deck.cards.length <= MAX_DECK_SIZE_GAME) {
            console.log(`Adding deck to select: ${deck.name} (${deck.cards.length} cards)`);
            const option = document.createElement('option');
            option.value = deck.name;
            option.textContent = `${deck.name} (${deck.cards.length} cards)`;
            selectElement.appendChild(option);
        } else {
            console.warn(`Deck "${deck.name}" excluded from selection (invalid size: ${deck.cards.length})`);
        }
    });
}

console.log("script.js loaded");
