// 1. Banco de Dados Simulado (Traduzido)
const foodDB = [
  { id: 1, name: "Ovo", unit: "", referenceAmount: 1, protein: 6, carbs: 0.5, fats: 5, calories: 75 },
  { id: 2, name: "Peito de Frango", unit: "g", referenceAmount: 100, protein: 26, carbs: 0, fats: 3, calories: 160  },  
  { id: 3, name: "Proteína Evilha Grouth", unit: "doses", referenceAmount: 1, protein: 24, carbs: 1.5, fats: 3, calories: 128  }, 
  { id: 4, name: "Aveia", unit: "g", referenceAmount: 30, protein: 4.8, carbs: 17, fats: 2, calories: 102  },
  { id: 5, name: "Pão Integral", unit: "fatias", referenceAmount: 1, protein: 2, carbs: 10, fats: 1, calories: 60  },
  { id: 6, name: "Leite", unit: "mL", referenceAmount: 100, protein: 3.2, carbs: 4.7, fats: 3.2, calories: 60  },
];

// 2. Estado (Começa vazio para que o usuário crie as seções manualmente)
const meals = {};
let currentMeal = null; // Rastreia para qual refeição o modal está adicionando

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  populateFoodDropdown();
  renderApp();
  
  // Atualiza a unidade (g, ml) no modal dinamicamente
  document.getElementById("food-select").addEventListener("change", (e) => {
    const foodId = parseInt(e.target.value);
    const food = foodDB.find(f => f.id === foodId);
    document.getElementById("unit-label").innerText = food.unit;
  });

  // Permite adicionar seção apertando a tecla "Enter"
  document.getElementById("new-section-name").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSection();
    }
  });
});

// Criar nova Seção de Refeição
function addSection() {
  const inputEl = document.getElementById("new-section-name");
  const sectionName = inputEl.value.trim();

  if (!sectionName) {
    alert("Por favor, digite um nome para a refeição.");
    return;
  }

  if (meals[sectionName]) {
    alert("Uma refeição com este nome já existe!");
    return;
  }

  meals[sectionName] = []; // Cria a array vazia para a nova seção
  inputEl.value = ""; // Limpa o input
  renderApp();
}

// Remover uma Seção inteira
function deleteSection(mealName) {
  if (confirm(`Tem certeza que deseja excluir "${mealName}" e todos os seus itens?`)) {
    delete meals[mealName];
    renderApp();
  }
}

// Preencher o <select> do modal
function populateFoodDropdown() {
  const select = document.getElementById("food-select");
  select.innerHTML = foodDB.map(f => 
    `<option value="${f.id}">${f.name} (por ${f.referenceAmount}${f.unit})</option>`
  ).join("");
}

// 3. Interações do Modal

function openModal(mealName, editIndex = -1) {
  currentMeal = mealName;
  document.getElementById("modal-title").innerText = editIndex > -1 ? `Editar Item em ${mealName}` : `Adicionar em ${mealName}`;
  document.getElementById("edit-index").value = editIndex;
  
  if (editIndex > -1) {
    const item = meals[mealName][editIndex];
    document.getElementById("food-select").value = item.foodId;
    document.getElementById("food-qty").value = item.quantity;
    const food = foodDB.find(f => f.id === item.foodId);
    document.getElementById("unit-label").innerText = food.unit;
  } else {
    document.getElementById("food-select").selectedIndex = 0;
    document.getElementById("food-qty").value = 100;
    document.getElementById("unit-label").innerText = foodDB[0].unit;
  }
  
  document.getElementById("add-item-modal").style.display = "block";
}

function closeModal() {
  document.getElementById("add-item-modal").style.display = "none";
}

// Cálculo de Macros e Salvar
function saveItem() {
  const foodId = parseInt(document.getElementById("food-select").value);
  const qty = parseFloat(document.getElementById("food-qty").value);
  const editIndex = parseInt(document.getElementById("edit-index").value);
  
  if (!qty || qty <= 0) return alert("Por favor, insira uma quantidade válida.");

  const food = foodDB.find(f => f.id === foodId);
  const ratio = qty / food.referenceAmount;

  const entry = {
    foodId: food.id,
    name: food.name,
    quantity: qty,
    unit: food.unit,
    protein: food.protein * ratio,
    carbs: food.carbs * ratio,
    fats: food.fats * ratio,
    calories: food.calories * ratio
  };

  if (editIndex > -1) {
    meals[currentMeal][editIndex] = entry;
  } else {
    meals[currentMeal].push(entry);
  }

  closeModal();
  renderApp();
}

function deleteItem(mealName, index) {
  meals[mealName].splice(index, 1);
  renderApp();
}

function formatNum(num) {
  return parseFloat(num).toFixed(1);
}

// 4. Renderização do Layout
function renderApp() {
  const container = document.getElementById("meals-container");
  container.innerHTML = "";
  
  let grandTotals = { protein: 0, carbs: 0, fats: 0, calories: 0 };
  const mealKeys = Object.keys(meals);

  if (mealKeys.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhuma refeição criada. Adicione uma refeição acima para começar.</div>`;
  }

  mealKeys.forEach(mealName => {
    let subTotals = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    
    let html = `
      <div class="meal-section">
        <div class="meal-header">
          <h2>${mealName}</h2>
          <div class="meal-actions">
            <button class="btn-primary" onclick="openModal('${mealName}')">+ Adicionar Item</button>
            <button class="btn-danger" onclick="deleteSection('${mealName}')">Excluir Refeição</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Alimento</th>
              <th>Qtd</th>
              <th>Proteína</th>
              <th>Carbos</th>
              <th>Gordura</th>
              <th>Calorias</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
    `;

    meals[mealName].forEach((item, index) => {
      subTotals.protein += item.protein;
      subTotals.carbs += item.carbs;
      subTotals.fats += item.fats;
      subTotals.calories += item.calories;

      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}${item.unit}</td>
          <td>${formatNum(item.protein)}g</td>
          <td>${formatNum(item.carbs)}g</td>
          <td>${formatNum(item.fats)}g</td>
          <td>${formatNum(item.calories)}kcal</td>
          <td class="actions">
            <button onclick="openModal('${mealName}', ${index})">Editar</button>
            <button onclick="deleteItem('${mealName}', ${index})">Remover</button>
          </td>
        </tr>
      `;
    });

    html += `
          <tr class="subtotal">
            <td colspan="2">Subtotal</td>
            <td>${formatNum(subTotals.protein)}g</td>
            <td>${formatNum(subTotals.carbs)}g</td>
            <td>${formatNum(subTotals.fats)}g</td>
            <td>${formatNum(subTotals.calories)}kcal</td>
            <td></td>
          </tr>
          </tbody>
        </table>
      </div>
    `;

    grandTotals.protein += subTotals.protein;
    grandTotals.carbs += subTotals.carbs;
    grandTotals.fats += subTotals.fats;
    grandTotals.calories += subTotals.calories;

    container.innerHTML += html;
  });

  // Renderizar Total Geral
  document.getElementById("grand-total-section").innerHTML = `
    <h2>Total Geral Diário</h2>
    <p>
       <strong>Proteína:</strong> ${formatNum(grandTotals.protein)}g &nbsp;|&nbsp; 
       <strong>Carboidratos:</strong> ${formatNum(grandTotals.carbs)}g &nbsp;|&nbsp; 
       <strong>Gorduras:</strong> ${formatNum(grandTotals.fats)}g &nbsp;|&nbsp; 
       <strong>Calorias:</strong> ${formatNum(grandTotals.calories)}kcal
    </p>
  `;
}