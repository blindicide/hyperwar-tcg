// --- Pack Opening Logic ---

// Assumes access to global variables:
// - cardDatabase
// Assumes access to global functions:
// - From shared.js: addCardToTemporaryCollection, renderCollectionCard, log
// - From ui.js: updateUI (implicitly via renderCollectionCard potentially, though not directly called)

function generatePack() {
    // Ensure cardDatabase is populated (should be via shared.js promise)
    if (Object.keys(cardDatabase).length === 0) {
        console.error("Card database not loaded yet for generatePack!");
        return [];
    }

    const pack = [];
    const rarities = ["Common", "Rare", "Elite", "Super Rare", "Ultra Rare"];
    const cardsByRarity = {};

    // Separate cards by rarity (excluding templates)
    rarities.forEach(r => cardsByRarity[r] = []);
    for (const cardId in cardDatabase) {
        const card = cardDatabase[cardId];
        if (!card.isTemplate && card.rarity && cardsByRarity[card.rarity]) { // Check if rarity exists
            cardsByRarity[card.rarity].push(cardId);
        } else if (!card.isTemplate && !card.rarity) {
             console.warn(`Card ${cardId} missing rarity, excluding from packs.`);
        }
    }


    // Check if we have cards for each rarity needed
    if (!cardsByRarity["Common"] || cardsByRarity["Common"].length === 0 || !cardsByRarity["Rare"] || cardsByRarity["Rare"].length === 0) {
        console.error("Not enough Common or Rare card variety to generate packs!");
        log("Error: Not enough Common or Rare card variety to generate packs!");
        return []; // Return empty pack on error
    }

    // 1. Add 3 Common cards
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * cardsByRarity["Common"].length);
        pack.push(cardsByRarity["Common"][randomIndex]);
    }

    // 2. Add 1 Rare card
    const rareIndex = Math.floor(Math.random() * cardsByRarity["Rare"].length);
    pack.push(cardsByRarity["Rare"][rareIndex]);

    // 3. Add 1 Elite/Super Rare/Ultra Rare card
    const randomChance = Math.random();
    let chosenRarity = "Elite"; // Default to Elite if others aren't available

    // Determine available high rarities
    const availableHighRarities = rarities.slice(2).filter(r => cardsByRarity[r] && cardsByRarity[r].length > 0);

    if (randomChance < 0.05 && availableHighRarities.includes("Ultra Rare")) { // ~5% Ultra Rare
        chosenRarity = "Ultra Rare";
    } else if (randomChance < 0.30 && availableHighRarities.includes("Super Rare")) { // ~25% Super Rare (0.05 + 0.25 = 0.30)
        chosenRarity = "Super Rare";
    } else if (!availableHighRarities.includes("Elite")) {
         // Fallback if no Elite cards exist
         if (availableHighRarities.includes("Super Rare")) chosenRarity = "Super Rare";
         else if (availableHighRarities.includes("Ultra Rare")) chosenRarity = "Ultra Rare";
         else chosenRarity = "Rare"; // Absolute fallback to Rare if no higher exist
    } else {
         chosenRarity = "Elite"; // Stick with Elite if available and probabilities didn't hit higher
    }


     if (cardsByRarity[chosenRarity] && cardsByRarity[chosenRarity].length > 0) {
        const highRarityIndex = Math.floor(Math.random() * cardsByRarity[chosenRarity].length);
        pack.push(cardsByRarity[chosenRarity][highRarityIndex]);
    } else {
        // Fallback if the chosen rarity somehow has no cards (shouldn't happen with checks above, but safety first)
        console.warn(`No cards found for chosen high rarity ${chosenRarity}, adding another Rare.`);
        const fallbackRareIndex = Math.floor(Math.random() * cardsByRarity["Rare"].length);
        pack.push(cardsByRarity["Rare"][fallbackRareIndex]);
    }


    log(`Generated pack: ${pack.join(', ')}`);
    return pack; // Returns array of card IDs
}

function openPack() {
    const packCardIds = generatePack();
    if (packCardIds.length === 0) return; // Exit if pack generation failed

    const packResultsEl = document.getElementById('pack-results');
    if (!packResultsEl) {
        console.error("Pack results element not found!");
        return;
    }
    packResultsEl.innerHTML = '<h3>Pack Contents:</h3>'; // Clear previous results

    packCardIds.forEach(cardId => {
        addCardToTemporaryCollection(cardId); // Add card using function from shared.js
        const cardData = cardDatabase[cardId];
        const cardElement = renderCollectionCard(cardData); // Use renderer from shared.js
        if (cardElement) {
            packResultsEl.appendChild(cardElement);
        }
    });

    log("Opened a pack and added cards to temporary collection.");
    // In a real app, you might want to update a persistent collection display elsewhere
}

console.log("packs.js loaded");
