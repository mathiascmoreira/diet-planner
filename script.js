// 1. Banco de Dados Padrão (Usado caso o localStorage esteja vazio)
const defaultFoodDB = [
  { id: 1, name: "Ovo", unit: "", referenceAmount: 1, protein: 6, carbs: 0.5, fats: 5, calories: 75 },
  { id: 2, name: "Peito de Frango", unit: "g", referenceAmount: 100, protein: 26, carbs: 0, fats: 3, calories: 160  },  
  { id: 3, name: "Proteína Evilha Grouth", unit: "doses", referenceAmount: 1, protein: 24, carbs: 1.5, fats: 3, calories: 128  }, 
  { id: 4, name: "Aveia", unit: "g", referenceAmount: 30, protein: 4.8, carbs: 17, fats: 2, calories: 102  },
  { id: 5, name: "Pão Integral", unit: "fatias", referenceAmount: 1, protein: 2, carbs: 10, fats: 1, calories: 60  },
  { id: 6, name: "Leite", unit: "mL", referenceAmount: 100, protein: 3.2, carbs: 4.7, fats: 3.2, calories: 60  },
];

// 2. Estado Global & LocalStorage
let foodDB = JSON.parse(localStorage.getItem('dietApp_foods')) || defaultFoodDB;
let meals = JSON.parse(localStorage.getItem('dietApp_meals')) || {};
let currentMeal = null; 

// Função para salvar tudo no LocalStorage
function saveData() {
  localStorage.setItem('dietApp_foods', JSON.stringify(foodDB));
  localStorage.setItem('dietApp_meals', JSON.stringify(meals));
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  renderApp();
  renderFoodDB();
  
  document.getElementById("food-select").addEventListener("change", (e) => {
    const foodId = parseInt(e.target.value);
    const food = foodDB.find(f => f.id === foodId);
    if(food) document.getElementById("unit-label").innerText = food.unit;
  });

  document.getElementById("new-section-name").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSection();
    }
  });
});

// ==========================================
// SEÇÕES DE REFEIÇÕES (CRUD)
// ==========================================

function addSection() {
  const inputEl = document.getElementById("new-section-name");
  const sectionName = inputEl.value.trim();

  if (!sectionName) return alert("Digite um nome para a refeição.");
  if (meals[sectionName]) return alert("Uma refeição com este nome já existe!");

  meals[sectionName] = []; 
  inputEl.value = ""; 
  saveData();
  renderApp();
}

function deleteSection(mealName) {
  if (confirm(`Tem certeza que deseja excluir "${mealName}"?`)) {
    delete meals[mealName];
    saveData();
    renderApp();
  }
}

function editSectionName(oldName) {
  const newName = prompt("Digite o novo nome da refeição:", oldName);
  if (!newName || newName.trim() === "" || newName === oldName) return;
  if (meals[newName]) return alert("Já existe uma refeição com esse nome.");

  // Copia os dados para a nova chave e deleta a antiga
  meals[newName] = meals[oldName];
  delete meals[oldName];
  saveData();
  renderApp();
}

// ==========================================
// ITENS DA REFEIÇÃO (MODAL E CÁLCULOS)
// ==========================================

function populateFoodDropdown() {
  const select = document.getElementById("food-select");
  select.innerHTML = foodDB.map(f => 
    `<option value="${f.id}">${f.name} (por ${f.referenceAmount}${f.unit})</option>`
  ).join("");
  
  if(foodDB.length > 0) {
    document.getElementById("unit-label").innerText = foodDB[0].unit;
  }
}

function openModal(mealName, editIndex = -1) {
  if (foodDB.length === 0) return alert("O banco de alimentos está vazio. Adicione alimentos primeiro!");
  
  populateFoodDropdown();
  currentMeal = mealName;
  document.getElementById("modal-title").innerText = editIndex > -1 ? `Editar em ${mealName}` : `Adicionar em ${mealName}`;
  document.getElementById("edit-index").value = editIndex;
  
  if (editIndex > -1) {
    const item = meals[mealName][editIndex];
    document.getElementById("food-select").value = item.foodId;
    document.getElementById("food-qty").value = item.quantity;
    const food = foodDB.find(f => f.id === item.foodId);
    if(food) document.getElementById("unit-label").innerText = food.unit;
  } else {
    document.getElementById("food-select").selectedIndex = 0;
    document.getElementById("food-qty").value = foodDB[0].referenceAmount;
  }
  
  document.getElementById("add-item-modal").style.display = "block";
}

function closeModal() { document.getElementById("add-item-modal").style.display = "none"; }

function saveItem() {
  const foodId = parseInt(document.getElementById("food-select").value);
  const qty = parseFloat(document.getElementById("food-qty").value);
  const editIndex = parseInt(document.getElementById("edit-index").value);
  
  if (!qty || qty <= 0) return alert("Insira uma quantidade válida.");

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

  if (editIndex > -1) meals[currentMeal][editIndex] = entry;
  else meals[currentMeal].push(entry);

  saveData();
  closeModal();
  renderApp();
}

function deleteItem(mealName, index) {
  meals[mealName].splice(index, 1);
  saveData();
  renderApp();
}

// ==========================================
// BANCO DE ALIMENTOS (CRUD)
// ==========================================

function openFoodModal(editIndex = -1) {
  document.getElementById("food-modal-title").innerText = editIndex > -1 ? "Editar Alimento" : "Novo Alimento";
  document.getElementById("db-edit-index").value = editIndex;
  
  if (editIndex > -1) {
    const food = foodDB[editIndex];
    document.getElementById("db-food-name").value = food.name;
    document.getElementById("db-food-ref").value = food.referenceAmount;
    document.getElementById("db-food-unit").value = food.unit;
    document.getElementById("db-food-prot").value = food.protein;
    document.getElementById("db-food-carb").value = food.carbs;
    document.getElementById("db-food-fat").value = food.fats;
    document.getElementById("db-food-cal").value = food.calories;
  } else {
    document.getElementById("db-food-name").value = "";
    document.getElementById("db-food-ref").value = 100;
    document.getElementById("db-food-prot").value = 0;
    document.getElementById("db-food-carb").value = 0;
    document.getElementById("db-food-fat").value = 0;
    document.getElementById("db-food-cal").value = 0;
  }
  
  document.getElementById("food-modal").style.display = "block";
}

function closeFoodModal() { document.getElementById("food-modal").style.display = "none"; }

function saveFoodDB() {
  const name = document.getElementById("db-food-name").value.trim();
  const ref = parseFloat(document.getElementById("db-food-ref").value);
  const unit = document.getElementById("db-food-unit").value;
  const prot = parseFloat(document.getElementById("db-food-prot").value);
  const carb = parseFloat(document.getElementById("db-food-carb").value);
  const fat = parseFloat(document.getElementById("db-food-fat").value);
  const cal = parseFloat(document.getElementById("db-food-cal").value);
  const editIndex = parseInt(document.getElementById("db-edit-index").value);

  if (!name || isNaN(ref) || isNaN(prot) || isNaN(carb) || isNaN(fat) || isNaN(cal)) {
    return alert("Por favor, preencha todos os campos corretamente.");
  }

  const newFood = {
    id: editIndex > -1 ? foodDB[editIndex].id : Date.now(), // Gera ID único
    name, unit, referenceAmount: ref, protein: prot, carbs: carb, fats: fat, calories: cal
  };

  if (editIndex > -1) foodDB[editIndex] = newFood;
  else foodDB.push(newFood);

  saveData();
  closeFoodModal();
  renderFoodDB();
}

function deleteFood(index) {
  if (confirm(`Excluir "${foodDB[index].name}" do banco de dados?`)) {
    foodDB.splice(index, 1);
    saveData();
    renderFoodDB();
  }
}

function renderFoodDB() {
  const container = document.getElementById("food-db-container");
  
  if (foodDB.length === 0) {
    container.innerHTML = `<div class="empty-state">Banco de alimentos vazio.</div>`;
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Alimento</th>
          <th>Ref.</th>
          <th>Prot</th>
          <th>Carb</th>
          <th>Gord</th>
          <th>Kcal</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  `;

  foodDB.forEach((food, index) => {
    html += `
      <tr>
        <td><strong>${food.name}</strong></td>
        <td>${food.referenceAmount}${food.unit}</td>
        <td>${food.protein}g</td>
        <td>${food.carbs}g</td>
        <td>${food.fats}g</td>
        <td>${food.calories}</td>
        <td class="actions">
          <button onclick="openFoodModal(${index})">Editar</button>
          <button onclick="deleteFood(${index})">Excluir</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ==========================================
// RENDERIZAÇÃO PRINCIPAL
// ==========================================

function formatNum(num) { return parseFloat(num).toFixed(1); }

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
            <button class="btn-primary" onclick="openModal('${mealName}')">+ Item</button>
            <button class="btn-secondary" onclick="editSectionName('${mealName}')">Renomear</button>
            <button class="btn-danger" onclick="deleteSection('${mealName}')">Excluir</button>
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