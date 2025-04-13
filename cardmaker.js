document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const cardType = document.getElementById("cardType");
    const unitFields = document.getElementById("unitFields");
    const traitsList = document.getElementById("traitsList");
    const factionSelect = document.getElementById("cardFaction");
    const countrySelect = document.getElementById("cardCountry");
    const cardForm = document.getElementById("cardForm");
    const outputArea = document.getElementById("outputArea");
    const cardJson = document.getElementById("cardJson");
    const copyJson = document.getElementById("copyJson");

    let traitsData = {};
    let loreData = {};

    // Show/hide unit fields
    function updateUnitFields() {
        unitFields.style.display = cardType.value === "Unit" ? "" : "none";
    }
    cardType.addEventListener("change", updateUnitFields);
    updateUnitFields();

    // Load traits.json and lore.json
    Promise.all([
        fetch("traits.json").then(r => r.json()),
        fetch("lore.json").then(r => r.json())
    ]).then(([traits, lore]) => {
        traitsData = traits;
        loreData = lore;
        populateTraits();
        populateFactions();
        populateCountries();
    });

    function populateTraits() {
        traitsList.innerHTML = "";
        Object.entries(traitsData).forEach(([id, trait]) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = id;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(trait.name));
            traitsList.appendChild(label);
        });
    }

    function populateFactions() {
        factionSelect.innerHTML = "";
        Object.entries(loreData.factions).forEach(([id, faction]) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = faction.name || id;
            factionSelect.appendChild(option);
        });
    }

    function populateCountries() {
        countrySelect.innerHTML = "";
        Object.entries(loreData.countries).forEach(([id, country]) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = country.name || id;
            countrySelect.appendChild(option);
        });
    }

    cardForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const type = cardType.value;
        const card = {
            name: document.getElementById("cardName").value,
            type,
            cost: parseInt(document.getElementById("cardCost").value, 10),
            description: document.getElementById("cardDescription").value,
            faction: factionSelect.value,
            country: countrySelect.value,
            rarity: document.getElementById("cardRarity").value,
            traits: Array.from(traitsList.querySelectorAll("input:checked")).map(cb => cb.value)
        };
        if (type === "Unit") {
            card.atk = parseInt(document.getElementById("cardAtk").value, 10);
            card.hp = parseInt(document.getElementById("cardHp").value, 10);
            card.maxHp = parseInt(document.getElementById("cardMaxHp").value, 10);
        }
        cardJson.textContent = JSON.stringify(card, null, 2);
        outputArea.style.display = "";
    });

    copyJson.addEventListener("click", () => {
        navigator.clipboard.writeText(cardJson.textContent);
        copyJson.textContent = "Copied!";
        setTimeout(() => (copyJson.textContent = "Copy to Clipboard"), 1200);
    });
});
