// --- Core Game Logic ---

// Assumes access to global variables:
// - players, currentPlayerIndex, turnNumber, gameLog, uniqueCardIdCounter, selectedCard, actionState
// - cardDatabase, cardEffectMap (for Orders)
// Assumes access to global functions:
// - From shared.js: getTemporaryCollection, getTemporarySavedDecks, log, shuffle, createCardInstance
// - From ui.js: updateUI, renderLog
// - DOM elements for setup/game area switching

// --- Core Game Logic Functions ---

// Modified startGame to accept deck selections
function startGame(player1DeckIds, player2DeckIds) {
    log("Starting game with selected decks...");

    // Hide setup and show game area
    const setupEl = document.getElementById('pre-game-setup');
    const gameAreaEl = document.getElementById('main-game-area');
    if (setupEl) setupEl.style.display = 'none';
    if (gameAreaEl) gameAreaEl.style.display = 'block'; // Show the game

    // Validate decks (basic check)
    if (!player1DeckIds || !player2DeckIds || player1DeckIds.length === 0 || player2DeckIds.length === 0) {
        log("Error: Invalid decks selected for starting game.");
        // Maybe show setup again with an error?
        if (setupEl) setupEl.style.display = 'block';
        if (gameAreaEl) gameAreaEl.style.display = 'none';
        const setupErrorEl = document.getElementById('setup-error');
        if(setupErrorEl) setupErrorEl.textContent = "Invalid decks selected.";
        return;
    }

    // Get lists of playable (non-template) unit and order IDs (still needed for AI fallback maybe?)
    // const playableUnitIds = Object.keys(cardDatabase).filter(id => cardDatabase[id].type === 'Unit' && !cardDatabase[id].isTemplate);
    // const playableOrderIds = Object.keys(cardDatabase).filter(id => cardDatabase[id].type === 'Order' && !cardDatabase[id].isTemplate);

    // --- DECK INITIALIZATION ---
    // Use the provided deck IDs

    players[0].deck = [...player1DeckIds]; // Copy the array
    shuffle(players[0].deck);
    console.log("Player 1 Deck:", players[0].deck);

    players[1].deck = [...player2DeckIds]; // Copy the array
    shuffle(players[1].deck);
    console.log("Player 2 Deck:", players[1].deck);

    // Reset player stats
    players.forEach(player => {
        player.hp = 30;
        player.supply = 0;
        player.maxSupply = 0;
        player.hand = [];
        player.battlefield = [];
    });

    currentPlayerIndex = 0;
    turnNumber = 1;
    actionState = 'none';
    selectedCard = null;

    // Initial draw
    for (let i = 0; i < 2; i++) { // Both players draw
        for (let j = 0; j < 4; j++) { // Draw 4 cards each
            drawCard(players[i]);
        }
    }

    startTurn(); // Start Player 1's first turn
}

function startTurn() {
    const player = getCurrentPlayer();
    log(`--- Turn ${turnNumber} (${player.name}) ---`);

    // Increment max Supply (up to a limit, e.g., 10)
    if (player.maxSupply < 10) {
        player.maxSupply++;
    }
    // Refill Supply
    player.supply = player.maxSupply;

    // Draw a card
    drawCard(player);

    // Reset unit attack status (can attack this turn if not just played)
    player.battlefield.forEach(unit => {
        // Ambush units can always attack if they survived the opponent's turn
        // Other units can attack if they were already on the field
        unit.canAttack = true;
    });


    actionState = 'none';
    selectedCard = null;
    updateUI(); // Assumes updateUI is available (from ui.js)

    // If it's Player 2's turn (AI), run AI after UI update
    if (currentPlayerIndex === 1) {
        setTimeout(runAI, 500);
    }
}

function drawCard(player) {
    if (player.deck.length > 0) {
        const cardId = player.deck.pop();
        const newCard = createCardInstance(cardId);
        if (newCard) {
            player.hand.push(newCard);
            log(`${player.name} drew a card.`);
        }
    } else {
        log(`${player.name}'s deck is empty!`);
        // Fatigue damage could be added here
    }
    // Don't call updateUI here, usually called after multiple actions or end turn
}

function playCard(player, cardInstanceId, handIndex) {
    const card = player.hand[handIndex];

    if (!card) return; // Card not found
    if (card.cost > player.supply) {
        log(`${player.name} cannot afford ${card.name}. Needs ${card.cost}, has ${player.supply}.`);
        return;
    }

    // Spend Supply
    player.supply -= card.cost;

    // Remove from hand
    player.hand.splice(handIndex, 1);

    // Execute card effect or place on battlefield
    if (card.type === 'Unit') {
        // Check for Ambush trait
        if (card.traits && card.traits.includes('ambush')) {
            card.canAttack = true; // Ambush allows attacking immediately
             log(`${player.name} played ${card.name} with Ambush!`);
        } else {
            card.canAttack = false; // Normal summoning sickness
             log(`${player.name} played ${card.name}.`);
        }
        card.owner = player; // Ensure unit knows its owner
        player.battlefield.push(card);

        // --- Trigger Deploy Effect (reading from card data) ---
        if (card.deployEffect) {
             log(`Triggering Deploy effect "${card.deployEffect}" for ${card.name}...`);
             handleDeployEffect(card, player); // Call new handler function
        }
        // --- End Deploy Effect ---

    } else if (card.type === 'Order') {
        // Orders go directly to discard (or execute effect)
        // Use cardEffectMap for Orders
        if (cardEffectMap[card.id]) {
            cardEffectMap[card.id](player); // Execute the order's effect using the map
        } else {
             log(`${player.name} played ${card.name} (no effect defined).`);
        }
        // Orders don't stay on the battlefield, implicitly discarded
    }

    selectedCard = null; // Clear selection after playing
    actionState = 'none';
    updateUI(); // Assumes updateUI is available (from ui.js)
    checkWinCondition();
}

function attack(attackerCard, targetCardOrPlayer) {
    if (!attackerCard || !attackerCard.canAttack) {
        log("Invalid attacker or attacker cannot attack this turn.");
        return;
    }

    const opponent = getOpponentPlayer(); // Get opponent for Guard check

    log(`${attackerCard.owner.name}'s ${attackerCard.name} attacks...`);

    // Attacking a Unit
    if (targetCardOrPlayer.type === 'Unit') {
        const targetUnit = targetCardOrPlayer;

        // --- Guard Check ---
        const opponentHasGuard = opponent.battlefield.some(unit => unit.traits && unit.traits.includes('guard'));
        if (opponentHasGuard && (!targetUnit.traits || !targetUnit.traits.includes('guard'))) {
            log(`Cannot attack ${targetUnit.name}. Must target a unit with Guard.`);
            // Reset selection state if needed, or just prevent the attack
            // For simplicity, just return here. A better UI might keep selection active.
             selectedCard = null;
             actionState = 'none';
             updateUI(); // Update UI to remove target highlights
            return;
        }
        // --- End Guard Check ---

        log(`...${targetUnit.owner.name}'s ${targetUnit.name}.`);

        // --- Armor Calculation ---
        let damageToTarget = attackerCard.atk;
        let damageToAttacker = targetUnit.atk;

        // Check target's armor (unless attacker has Piercing)
        const attackerHasPiercing = attackerCard.traits?.includes('piercing');
        if (!attackerHasPiercing) {
            const targetArmorTrait = targetUnit.traits?.find(t => t.startsWith('armor-'));
            if (targetArmorTrait) {
                const armorValue = parseInt(targetArmorTrait.split('-')[1] || '0');
                damageToTarget = Math.max(0, damageToTarget - armorValue); // Reduce damage, min 0
                log(`${targetUnit.name} Armor reduces damage by ${armorValue}.`);
            }
        } else {
             log(`${attackerCard.name} Piercing ignores Armor.`);
        }


         // Check attacker's armor (for damage dealt back, unless target has Piercing)
        const targetHasPiercing = targetUnit.traits?.includes('piercing');
         if (!targetHasPiercing) {
            const attackerArmorTrait = attackerCard.traits?.find(t => t.startsWith('armor-'));
            if (attackerArmorTrait) {
                const armorValue = parseInt(attackerArmorTrait.split('-')[1] || '0');
                damageToAttacker = Math.max(0, damageToAttacker - armorValue); // Reduce damage, min 0
                 log(`${attackerCard.name} Armor reduces damage by ${armorValue}.`);
            }
         } else {
              log(`${targetUnit.name} Piercing ignores Armor.`);
         }
        // --- End Armor/Piercing Calculation ---

        // --- First Strike Calculation ---
        const attackerHasFirstStrike = attackerCard.traits?.includes('first-strike');
        const targetHasFirstStrike = targetUnit.traits?.includes('first-strike');
        let attackerDealsDamage = true;
        let targetDealsDamage = true;

        if (attackerHasFirstStrike && !targetHasFirstStrike) {
            log(`${attackerCard.name} has First Strike!`);
            targetUnit.hp -= damageToTarget; // Attacker deals damage first
            log(`${targetUnit.name} takes ${damageToTarget} damage (HP: ${targetUnit.hp}/${targetUnit.maxHp}).`);
            if (targetUnit.hp <= 0) {
                 log(`${targetUnit.name} destroyed by First Strike before dealing damage!`);
                 targetDealsDamage = false; // Target destroyed, deals no damage back
            }
            attackerDealsDamage = false; // Attacker already dealt damage this phase
        } else if (!attackerHasFirstStrike && targetHasFirstStrike) {
             log(`${targetUnit.name} has First Strike!`);
             attackerCard.hp -= damageToAttacker; // Target deals damage first
             log(`${attackerCard.name} takes ${damageToAttacker} damage (HP: ${attackerCard.hp}/${attackerCard.maxHp}).`);
             if (attackerCard.hp <= 0) {
                 log(`${attackerCard.name} destroyed by First Strike before dealing damage!`);
                 attackerDealsDamage = false; // Attacker destroyed, deals no damage back
             }
             targetDealsDamage = false; // Target already dealt damage this phase
        }
        // If both or neither have First Strike, combat proceeds normally below.

        // --- Apply Normal Combat Damage (if applicable) ---
        if (attackerDealsDamage) {
             targetUnit.hp -= damageToTarget;
             log(`${targetUnit.name} takes ${damageToTarget} damage (HP: ${targetUnit.hp}/${targetUnit.maxHp}).`);
        }
        if (targetDealsDamage) {
             attackerCard.hp -= damageToAttacker;
             log(`${attackerCard.name} takes ${damageToAttacker} damage (HP: ${attackerCard.hp}/${attackerCard.maxHp}).`);
        }

         // --- Deadly Check ---
         // Check if attacker has Deadly and dealt damage
         if (attackerCard.traits?.includes('deadly') && damageToTarget > 0 && targetUnit.hp > 0) {
             log(`${attackerCard.name}'s Deadly trait destroys ${targetUnit.name}!`);
             targetUnit.hp = 0; // Set HP to 0
         }
         // Check if target has Deadly and dealt damage
         if (targetUnit.traits?.includes('deadly') && damageToAttacker > 0 && attackerCard.hp > 0) {
              log(`${targetUnit.name}'s Deadly trait destroys ${attackerCard.name}!`);
              attackerCard.hp = 0; // Set HP to 0
         }

        // Prevent further attacks this turn
        attackerCard.canAttack = false;

        // Check for deaths after combat
        cleanupBattlefield();

    }
    // Attacking the Player
    else if (targetCardOrPlayer.id) { // Target is a player object
         const targetPlayer = targetCardOrPlayer;

         // --- Guard Check for Player Attack ---
         const opponentHasGuard = opponent.battlefield.some(unit => unit.traits && unit.traits.includes('guard'));
         if (opponentHasGuard) {
             log(`Cannot attack player directly while units with Guard are on the battlefield.`);
             // Reset selection state
             selectedCard = null;
             actionState = 'none';
             updateUI();
             return; // Stop the attack
         }
         // --- End Guard Check ---

         log(`...${targetPlayer.name} directly!`);
         targetPlayer.hp -= attackerCard.atk; // Player HP doesn't benefit from Armor
         log(`${targetPlayer.name} takes ${attackerCard.atk} damage (HP: ${targetPlayer.hp}).`);
         attackerCard.canAttack = false; // Prevent further attacks this turn
    }

    selectedCard = null;
    actionState = 'none';
    updateUI(); // Assumes updateUI is available (from ui.js)
    checkWinCondition();
}

function cleanupBattlefield() {
    let effectsTriggered = false; // Flag to check if we need to update UI/re-cleanup
    players.forEach(player => {
        const remainingUnits = [];
        const destroyedUnitsThisPass = []; // Keep track of units destroyed in this cleanup pass

        player.battlefield.forEach(unit => {
            if (unit.hp <= 0) {
                log(`${unit.name} (owned by ${player.name}) was destroyed.`);
                destroyedUnitsThisPass.push(unit); // Add to list for effect processing
                // Don't add to remainingUnits yet
            } else {
                remainingUnits.push(unit); // Keep survivors
            }
        }); // End inner forEach for units

        player.battlefield = remainingUnits; // Update battlefield with survivors first

        // --- Trigger Destroyed Effects (reading from card data) ---
        destroyedUnitsThisPass.forEach(destroyedUnit => {
            if (destroyedUnit.destroyedEffect) {
                log(`Triggering Destroyed effect "${destroyedUnit.destroyedEffect}" for ${destroyedUnit.name}...`);
                handleDestroyedEffect(destroyedUnit, player); // Call new handler function
                effectsTriggered = true;
            }
        });
        // --- End Destroyed Effects ---

    }); // End outer forEach for players

    // If any destroyed effects triggered, update UI and potentially re-cleanup
    if (effectsTriggered) {
         console.log("Destroyed effects triggered, updating UI.");
         // A simple re-run might be okay for damage_all, but could cause issues with complex chains.
         // Consider adding a flag or depth limit if infinite loops become possible.
         // cleanupBattlefield(); // Be cautious enabling this without further checks
         updateUI(); // Update UI after effects resolve
    }
}


function endTurn() {
    log(`${getCurrentPlayer().name} ends their turn.`);
    currentPlayerIndex = 1 - currentPlayerIndex; // Switch player
    if (currentPlayerIndex === 0) { // If it's Player 1's turn again, increment turn number
        turnNumber++;
    }
    startTurn(); // Always start the next player's turn
}

function checkWinCondition() {
    players.forEach(player => {
        if (player.hp <= 0) {
            const winner = getOpponentPlayer();
            log(`--- GAME OVER --- ${winner.name} wins! ---`);
            alert(`${winner.name} wins!`);
            // Disable further actions - could disable the end turn button etc.
            if (endTurnButton) endTurnButton.disabled = true;
        }
    });
}

function runAI() {
    // Simple AI for Player 2
    const ai = players[1];
    const opponent = getPlayer(0);

    // Play all affordable cards (prioritize units, then orders)
    let playable = true;
    while (playable) {
        playable = false;
        // Try to play a unit first
        let handIndex = ai.hand.findIndex(card => card.type === "Unit" && card.cost <= ai.supply);
        if (handIndex === -1) {
            // Try to play an order
            handIndex = ai.hand.findIndex(card => card.type === "Order" && card.cost <= ai.supply);
        }
        if (handIndex !== -1) {
            playCard(ai, ai.hand[handIndex].instanceId, handIndex);
            playable = true;
        }
    }

    // Attack with all available units
    ai.battlefield.forEach(unit => {
        if (unit.canAttack && unit.atk > 0) {
            // --- AI Guard Targeting ---
            const opponentGuardUnits = opponent.battlefield.filter(u => u.traits && u.traits.includes('guard'));
            let target = null;

            if (opponentGuardUnits.length > 0) {
                // Must target a Guard unit if possible
                target = opponentGuardUnits[0]; // Attack the first available Guard unit
                log(`AI ${unit.name} must attack Guard unit ${target.name}.`);
            } else if (opponent.battlefield.length > 0) {
                // If no Guard, attack any unit
                target = opponent.battlefield[0]; // Attack the first available unit
                 log(`AI ${unit.name} attacks unit ${target.name}.`);
            } else {
                // If no units, attack the player
                target = opponent;
                 log(`AI ${unit.name} attacks ${target.name} directly.`);
            }
            // --- End AI Guard Targeting ---

            if (target) {
                attack(unit, target);
            }
        }
    });
    // End AI turn
    setTimeout(() => {
        endTurn();
    }, 500);
}

// --- Effect Handler Functions ---

function handleDeployEffect(card, player) {
    switch (card.deployEffect) {
        case 'heal_friendly':
            const healAmount = card.deployValue || 1; // Default to 1 if value missing
            let target = null;
            if (card.deployTarget === 'other_friendly_unit') {
                 target = player.battlefield.find(unit => unit.instanceId !== card.instanceId && unit.hp < unit.maxHp);
            } // Add other target types later (e.g., 'self', 'enemy_unit')

            if (target) {
                target.hp = Math.min(target.maxHp, target.hp + healAmount);
                log(`${card.name} deployed, healing ${target.name} for ${healAmount} HP.`);
                updateUI();
            } else {
                log(`${card.name} deployed, but no valid target found for healing.`);
            }
            break;
        case 'improve_unit':
            const buffs = card.deployValue || {}; // { atk: x, hp: y }
            const targetTrait = card.deployTarget === 'random_friendly_vehicle' ? 'vehicle' : null; // Add more target types later
            let potentialTargets = [];

            if (targetTrait) {
                potentialTargets = player.battlefield.filter(unit =>
                    unit.instanceId !== card.instanceId && // Not self
                    unit.traits?.includes(targetTrait)      // Has the target trait
                );
            } else {
                // Default target: any other friendly unit
                 potentialTargets = player.battlefield.filter(unit => unit.instanceId !== card.instanceId);
            }


            if (potentialTargets.length > 0) {
                // Select a random target from the potential ones
                const randomTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
                let buffLog = [];

                if (buffs.atk) {
                    randomTarget.atk += buffs.atk;
                    buffLog.push(`+${buffs.atk} ATK`);
                }
                if (buffs.hp) {
                    randomTarget.hp += buffs.hp;
                    randomTarget.maxHp += buffs.hp; // Increase max HP as well
                    buffLog.push(`+${buffs.hp} HP`);
                }

                log(`${card.name} deployed, improving ${randomTarget.name} (${buffLog.join(', ')}).`);
                updateUI(); // Update UI to show stat changes
            } else {
                 log(`${card.name} deployed, but no valid target found to improve.`);
            }
            break;
        // Add more deploy effect cases here
        default:
            log(`Unknown deploy effect: ${card.deployEffect}`);
    }
}

function handleDestroyedEffect(card, owner) {
     switch (card.destroyedEffect) {
        case 'damage_all':
            const damage = card.destroyedValue || 1; // Default to 1
            log(`${card.name} destroyed! Dealing ${damage} damage to all units.`);
            let unitsDamaged = false;
            players.forEach(player => {
                // Create a copy of the battlefield to iterate over,
                // as the original might be modified by cleanupBattlefield triggered by damage
                const currentBattlefield = [...player.battlefield];
                currentBattlefield.forEach(unit => {
                    // Check if the unit still exists on the actual battlefield before damaging
                    if (player.battlefield.find(bfUnit => bfUnit.instanceId === unit.instanceId)) {
                        unit.hp -= damage;
                        log(`${unit.name} takes ${damage} damage from explosion (HP: ${unit.hp}/${unit.maxHp}).`);
                        unitsDamaged = true;
                    }
                });
            });
             // If units were damaged, trigger another cleanup check
             if (unitsDamaged) {
                 cleanupBattlefield(); // Trigger cleanup again
             }
             // updateUI() will be called by cleanupBattlefield if needed
            break;
         // Add more destroyed effect cases here
         default:
             log(`Unknown destroyed effect: ${card.destroyedEffect}`);
     }
}

console.log("gameLogic.js loaded");
