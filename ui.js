// --- UI Rendering Logic ---

// Assumes access to global variables:
// - players, gameLog, selectedCard, actionState
// - loreData, traitDatabase
// - DOM elements (p1InfoEl, p2InfoEl, etc.) - Ensure these are defined globally or passed if needed
// Assumes access to global functions:
// - getCurrentPlayer, getOpponentPlayer, handleCardClick, handlePlayerAreaClick

function renderCard(card, location, owner) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', card.type.toLowerCase());
    cardEl.dataset.instanceId = card.instanceId; // Store unique ID
    cardEl.dataset.ownerId = owner.id;
    cardEl.dataset.location = location; // 'hand' or 'battlefield'

    let content = "";
    if (card.type === 'Unit') {
        const factionInfo = loreData.factions[card.faction];
        const countryInfo = loreData.countries[card.country];
        const factionColor = factionInfo ? factionInfo.color : '#ccc'; // Default color if faction not found

        // Ribbon bar for faction/country
        content += `<div class="card-ribbon" style="background-color: ${factionColor};">
            <span class="ribbon-faction" title="${factionInfo ? factionInfo.description : ''}">${card.faction}</span> &ndash;
            <span class="ribbon-country" title="${countryInfo ? countryInfo.description : ''}">${countryInfo ? countryInfo.name : card.country}</span>
        </div>`;
        content += `<strong>${card.name}</strong>`;
        content += `<div class="cost">Cost: ${card.cost}</div>`;
        content += `<div class="stats"><span class="atk">ATK: ${card.atk}</span> | <span class="hp">HP: ${card.hp}/${card.maxHp}</span></div>`;
        // Display traits using traitDatabase for tooltips
        if (card.traits && card.traits.length > 0) {
             const traitSpans = card.traits.map(traitId => {
                const traitInfo = traitDatabase[traitId];
                const traitName = traitInfo ? traitInfo.name : traitId;
                const traitDesc = traitInfo ? traitInfo.description : 'Unknown trait';
                return `<span class="trait" title="${traitDesc}">${traitName}</span>`;
            }).join(', ');
            content += `<div class="card-traits">Traits: ${traitSpans}</div>`;
        }
        if (location === 'battlefield' && card.canAttack) {
             content += `<div>(Can Attack)</div>`;
        }
    } else if (card.type === 'Order') {
         content += `<div class="card-ribbon" style="background-color: #205020; color: #fff; text-align: center;">ПРИКАЗ</div>`;
         content += `<strong>${card.name}</strong>`;
         content += `<div class="cost">Cost: ${card.cost}</div>`;
         // Display traits for Orders too, using traitDatabase
         if (card.traits && card.traits.length > 0) {
             const traitSpans = card.traits.map(traitId => {
                const traitInfo = traitDatabase[traitId];
                const traitName = traitInfo ? traitInfo.name : traitId;
                const traitDesc = traitInfo ? traitInfo.description : 'Unknown trait';
                return `<span class="trait" title="${traitDesc}">${traitName}</span>`;
            }).join(', ');
             content += `<div class="card-traits">Traits: ${traitSpans}</div>`;
         }
    }

    // --- Generate and Add Effect Description ---
    let effectText = "";
    let effectDescription = ""; // For tooltip
     if (card.deployEffect) {
        const generatedText = `Deploy: ${generateEffectText(card.deployEffect, card.deployValue, card.deployTarget)}`;
        effectText += `<div class="card-effect">${generatedText}</div>`;
        effectDescription += ` ${generatedText}.`; // Add space before for tooltip concatenation
    }
    if (card.destroyedEffect) {
         const generatedText = `Destroyed: ${generateEffectText(card.destroyedEffect, card.destroyedValue, card.destroyedTarget)}`;
         effectText += `<div class="card-effect">${generatedText}</div>`;
         effectDescription += ` ${generatedText}.`; // Add space before for tooltip concatenation
    }
    content += effectText; // Add effect text to visible card content
    cardEl.innerHTML = content;


    // Combine base description and effect description for tooltip
    let fullDescription = card.description || "";
    if (effectDescription) {
        fullDescription += (fullDescription ? "\n" : "") + effectDescription.trim(); // Add newline if base description exists
    }
    if (fullDescription) {
         cardEl.title = fullDescription;
    }
    // --- End Tooltip Generation ---


    // Add playable styling if it's the current player's card in hand and affordable
    if (location === 'hand' && owner === getCurrentPlayer() && card.cost <= owner.supply) {
        cardEl.classList.add('playable');
    }

    // Add selected styling
    if (selectedCard && selectedCard.card.instanceId === card.instanceId) {
         cardEl.classList.add('selected');
    }

    // Add targetable styling during attack targeting
    if (actionState === 'selecting_target') {
        const opponent = getOpponentPlayer();
        const opponentHasGuard = opponent.battlefield.some(unit => unit.traits && unit.traits.includes('guard'));

        // Targetable units: opponent's battlefield
        if (location === 'battlefield' && owner !== getCurrentPlayer()) {
             // If opponent has Guard, only Guard units are targetable
             if (opponentHasGuard) {
                 if (card.traits && card.traits.includes('guard')) {
                     cardEl.classList.add('targetable');
                 }
             } else {
                 // Otherwise, all opponent units are targetable
                 cardEl.classList.add('targetable');
             }
        }
        // Targetable player: Opponent's info area (visual cue handled differently below)
    }

    // Add click listener (calls function assumed to be global in script.js)
    cardEl.addEventListener('click', () => handleCardClick(card, location, owner));

    return cardEl;
}

function renderPlayerUI(player) {
    // Assume player.elementIDs contains valid IDs
    document.getElementById(player.elementIDs.hp).textContent = player.hp;
    document.getElementById(player.elementIDs.supply).textContent = player.supply;
    document.getElementById(player.elementIDs.maxSupply).textContent = player.maxSupply;
    document.getElementById(player.elementIDs.deck).textContent = player.deck.length;

    // Hand
    const handEl = document.getElementById(player.elementIDs.hand);
    handEl.innerHTML = ''; // Clear old hand
    if (player === getCurrentPlayer() || location.search !== "?showOpponentHand") { // Only show current player's hand normally
        player.hand.forEach((card) => {
            handEl.appendChild(renderCard(card, 'hand', player));
        });
    } else {
        // Show card backs or just count for opponent
        handEl.innerHTML = `Opponent Hand (${player.hand.length} cards)`;
    }

    // Battlefield
    const battlefieldEl = document.getElementById(player.elementIDs.battlefield);
    battlefieldEl.innerHTML = ''; // Clear old battlefield
    player.battlefield.forEach((card) => {
        battlefieldEl.appendChild(renderCard(card, 'battlefield', player));
    });
}

function renderLog() {
    // Assume logListEl is a globally accessible DOM element
    if (!logListEl) return;
    logListEl.innerHTML = '';
    gameLog.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = entry;
        logListEl.appendChild(li);
    });
    logListEl.scrollTop = logListEl.scrollHeight; // Scroll to bottom
}

function updateUI() {
    // Assume players, currentPlayerEl, turnNumberEl, endTurnButton, p1InfoEl, p2InfoEl are global
    // Update Player Info
    players.forEach(player => renderPlayerUI(player));

    // Update Turn Info
    if (currentPlayerEl) currentPlayerEl.textContent = getCurrentPlayer().name;
    if (turnNumberEl) turnNumberEl.textContent = turnNumber;

    // Enable/disable end turn button
    if (endTurnButton) endTurnButton.disabled = false; // Re-enable unless game over check disables it

    // Clear old target highlights on player info areas
    if (p1InfoEl) p1InfoEl.classList.remove('targetable');
    if (p2InfoEl) p2InfoEl.classList.remove('targetable');

    // Add target highlight for player attack
     if (actionState === 'selecting_target') {
        const opponent = getOpponentPlayer();
        const opponentHasGuard = opponent.battlefield.some(unit => unit.traits && unit.traits.includes('guard'));
         // Only make player targetable if they have no Guard units
        if (!opponentHasGuard) {
             const opponentInfoEl = (opponent.id === 1) ? p1InfoEl : p2InfoEl;
             if (opponentInfoEl) opponentInfoEl.classList.add('targetable');
        }
    }

    renderLog(); // Update the log display
    console.log("UI Updated. Current state:", actionState, "Selected:", selectedCard); // Debugging
}

console.log("ui.js loaded");
