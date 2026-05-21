// ==========================================
// CONFIGURAÇÕES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://pfgoavahnkcdiazwqhrp.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_ewsjcrQisrjN6P1k5Eez9g_lXglk6u3';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation' // Retorna os dados após insert/update
};

// ==========================================
// ESTADO GLOBAL
// ==========================================
let foodDB = [];
let mealsDB = [];
let mealItemsDB = [];
let currentMealId = null;

// Função auxiliar para fazer requisições à API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = { method, headers: HEADERS };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(`${SUPABASE_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(await response.text());
    
    // Se for GET ou tiver Prefer: return=representation, tenta extrair o JSON
    if (method === 'GET' || response.headers.get('content-length') !== '0') {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return null;
  } catch (error) {
    console.error("Erro na API:", error);
    alert("Ocorreu um erro ao comunicar com o banco de dados.");
  }
}

// ==========================================
// INICIALIZAÇÃO E CARREGAMENTO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  
  document.getElementById("food-select").addEventListener("change", (e) => {
    const foodId = parseInt(e.target.value);
    const food = foodDB.find(f => f.id === foodId);
    if (food) document.getElementById("unit-label").innerText = food.unit;
  });

  document.getElementById("new-section-name").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSection();
    }
  });
});

async function loadData() {
  // Busca todas as tabelas em paralelo
  foodDB = await apiRequest('/foods?order=name.asc') || [];
  mealsDB = await apiRequest('/meals?order=id.asc') || [];
  mealItemsDB = await apiRequest('/meal_items') || [];

  // Se o banco de alimentos estiver vazio, semeia os dados padrão
  if (foodDB.length === 0) {
    await seedDefaultFoods();
  } else {
    renderApp();
    renderFoodDB();
  }
}

async function seedDefaultFoods() {
  const defaultFoods = [
    { name: "Peito de Frango", unit: "g", reference_amount: 100, protein: 31, carbs: 0, fats: 3.6, calories: 165 },
    { name: "Arroz Branco", unit: "g", reference_amount: 100, protein: 2.7, carbs: 28, fats: 0.3, calories: 130 },
    { name: "Azeite de Oliva", unit: "ml", reference_amount: 15, protein: 0, carbs: 0, fats: 14, calories: 119 },
    { name: "Brócolis", unit: "g", reference_amount: 100, protein: 2.8, carbs: 7, fats: 0.4, calories: 34 },
    { name: "Aveia em Flocos", unit: "g", reference_amount: 100, protein: 16.9, carbs: 66.3, fats: 6.9, calories: 389 },
    { name: "Ovos Inteiros", unit: "un", reference_amount: 1, protein: 6, carbs: 0.5, fats: 5, calories: 70 }
  ];
  await apiRequest('/foods', 'POST', defaultFoods);
  await loadData(); // Recarrega após inserir
}

// ==========================================
// SEÇÕES DE REFEIÇÕES (CRUD API)
// ==========================================
async function addSection() {
  const inputEl = document.getElementById("new-section-name");
  const sectionName = inputEl.value.trim();

  if (!sectionName) return alert("Digite um nome para a refeição.");
  if (mealsDB.some(m => m.name.toLowerCase() === sectionName.toLowerCase())) {
    return alert("Uma refeição com este nome já existe!");
  }

  await apiRequest('/meals', 'POST', { name: sectionName });
  inputEl.value = ""; 
  await loadData();
}

async function deleteSection(id, mealName) {
  if (confirm(`Tem certeza que deseja excluir "${mealName}"? Todos os itens serão apagados.`)) {
    await apiRequest(`/meals?id=eq.${id}`, 'DELETE');
    await loadData();
  }
}

async function editSectionName(id, oldName) {
  const newName = prompt("Digite o novo nome da refeição:", oldName);
  if (!newName || newName.trim() === "" || newName === oldName) return;
  if (mealsDB.some(m => m.name.toLowerCase() === newName.toLowerCase())) {
    return alert("Já existe uma refeição com esse nome.");
  }

  await apiRequest(`/meals?id=eq.${id}`, 'PATCH', { name: newName });
  await loadData();
}

// ==========================================
// ITENS DA REFEIÇÃO (MODAL E CRUD API)
// ==========================================
function populateFoodDropdown() {
  const select = document.getElementById("food-select");
  select.innerHTML = foodDB.map(f => 
    `<option value="${f.id}">${f.name} (por ${f.reference_amount}${f.unit})</option>`
  ).join("");
  
  if (foodDB.length > 0) document.getElementById("unit-label").innerText = foodDB[0].unit;
}

function openModal(mealId, itemId = null) {
  if (foodDB.length === 0) return alert("O banco de alimentos está vazio.");
  
  populateFoodDropdown();
  currentMealId = mealId;
  const meal = mealsDB.find(m => m.id === mealId);
  
  document.getElementById("modal-title").innerText = itemId ? `Editar em ${meal.name}` : `Adicionar em ${meal.name}`;
  document.getElementById("edit-index").value = itemId || "";
  
  if (itemId) {
    const item = mealItemsDB.find(mi => mi.id === itemId);
    document.getElementById("food-select").value = item.food_id;
    document.getElementById("food-qty").value = item.quantity;
    const food = foodDB.find(f => f.id === item.food_id);
    if (food) document.getElementById("unit-label").innerText = food.unit;
  } else {
    document.getElementById("food-select").selectedIndex = 0;
    document.getElementById("food-qty").value = foodDB[0].reference_amount;
  }
  
  document.getElementById("add-item-modal").style.display = "block";
}

function closeModal() { document.getElementById("add-item-modal").style.display = "none"; }

async function saveItem() {
  const foodId = parseInt(document.getElementById("food-select").value);
  const qty = parseFloat(document.getElementById("food-qty").value);
  const itemId = document.getElementById("edit-index").value;
  
  if (!qty || qty <= 0) return alert("Insira uma quantidade válida.");

  const payload = { meal_id: currentMealId, food_id: foodId, quantity: qty };

  if (itemId) {
    await apiRequest(`/meal_items?id=eq.${itemId}`, 'PATCH', payload);
  } else {
    await apiRequest(`/meal_items`, 'POST', payload);
  }

  closeModal();
  await loadData();
}

async function deleteItem(itemId) {
  if (confirm("Remover este item da refeição?")) {
    await apiRequest(`/meal_items?id=eq.${itemId}`, 'DELETE');
    await loadData();
  }
}

// ==========================================
// BANCO DE ALIMENTOS (CRUD API)
// ==========================================
function toggleFoodDB() {
  const section = document.getElementById("food-db-section");
  section.style.display = section.style.display === "none" ? "block" : "none";
}

function openFoodModal(foodId = null) {
  document.getElementById("food-modal-title").innerText = foodId ? "Editar Alimento" : "Novo Alimento";
  document.getElementById("db-edit-index").value = foodId || "";
  
  if (foodId) {
    const food = foodDB.find(f => f.id === foodId);
    document.getElementById("db-food-name").value = food.name;
    document.getElementById("db-food-ref").value = food.reference_amount;
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

async function saveFoodDB() {
  const name = document.getElementById("db-food-name").value.trim();
  const ref = parseFloat(document.getElementById("db-food-ref").value);
  const unit = document.getElementById("db-food-unit").value;
  const prot = parseFloat(document.getElementById("db-food-prot").value);
  const carb = parseFloat(document.getElementById("db-food-carb").value);
  const fat = parseFloat(document.getElementById("db-food-fat").value);
  const cal = parseFloat(document.getElementById("db-food-cal").value);
  const foodId = document.getElementById("db-edit-index").value;

  if (!name || isNaN(ref) || isNaN(prot) || isNaN(carb) || isNaN(fat) || isNaN(cal)) {
    return alert("Preencha todos os campos corretamente.");
  }

  const payload = {
    name, unit, reference_amount: ref, protein: prot, carbs: carb, fats: fat, calories: cal
  };

  if (foodId) {
    await apiRequest(`/foods?id=eq.${foodId}`, 'PATCH', payload);
  } else {
    await apiRequest(`/foods`, 'POST', payload);
  }

  closeFoodModal();
  await loadData();
}

async function deleteFood(foodId, foodName) {
  // Verifica se o alimento está em uso nas refeições
  const inUse = mealItemsDB.some(mi => mi.food_id === foodId);
  if (inUse) {
    return alert(`Não é possível excluir "${foodName}" porque ele está sendo usado em uma refeição.`);
  }

  if (confirm(`Excluir "${foodName}" do banco de dados?`)) {
    await apiRequest(`/foods?id=eq.${foodId}`, 'DELETE');
    await loadData();
  }
}

// ==========================================
// RENDERIZAÇÃO PRINCIPAL (UI e Matemática)
// ==========================================
function formatNum(num) { return parseFloat(num).toFixed(1); }

function renderFoodDB() {
  const container = document.getElementById("food-db-container");
  
  if (foodDB.length === 0) {
    container.innerHTML = `<div class="empty-state">Banco de alimentos vazio.</div>`;
    return;
  }

  let html = `<table>
      <thead>
        <tr><th>Alimento</th><th>Ref.</th><th>Prot</th><th>Carb</th><th>Gord</th><th>Kcal</th><th>Ações</th></tr>
      </thead><tbody>`;

  foodDB.forEach((food) => {
    html += `
      <tr>
        <td><strong>${food.name}</strong></td>
        <td>${food.reference_amount}${food.unit}</td>
        <td>${food.protein}g</td>
        <td>${food.carbs}g</td>
        <td>${food.fats}g</td>
        <td>${food.calories}</td>
        <td class="actions">
          <button onclick="openFoodModal(${food.id})">Editar</button>
          <button onclick="deleteFood(${food.id}, '${food.name}')">Excluir</button>
        </td>
      </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderApp() {
  const container = document.getElementById("meals-container");
  container.innerHTML = "";
  let grandTotals = { protein: 0, carbs: 0, fats: 0, calories: 0 };

  if (mealsDB.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhuma refeição criada. Adicione uma refeição acima para começar.</div>`;
    document.getElementById("grand-total-section").innerHTML = "";
    return;
  }

  mealsDB.forEach(meal => {
    let subTotals = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    
    let html = `
      <div class="meal-section">
        <div class="meal-header">
          <h2>${meal.name}</h2>
          <div class="meal-actions">
            <button class="btn-primary" onclick="openModal(${meal.id})">+ Item</button>
            <button class="btn-secondary" onclick="editSectionName(${meal.id}, '${meal.name}')">Renomear</button>
            <button class="btn-danger" onclick="deleteSection(${meal.id}, '${meal.name}')">Excluir</button>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Alimento</th><th>Qtd</th><th>Proteína</th><th>Carbos</th><th>Gordura</th><th>Calorias</th><th>Ações</th></tr>
          </thead>
          <tbody>`;

    // Filtra os itens desta refeição e faz os cálculos
    const items = mealItemsDB.filter(mi => mi.meal_id === meal.id);
    
    items.forEach(item => {
      const food = foodDB.find(f => f.id === item.food_id);
      if (!food) return; // Segurança caso o alimento não exista

      const ratio = item.quantity / food.reference_amount;
      const prot = food.protein * ratio;
      const carb = food.carbs * ratio;
      const fat = food.fats * ratio;
      const cal = food.calories * ratio;

      subTotals.protein += prot;
      subTotals.carbs += carb;
      subTotals.fats += fat;
      subTotals.calories += cal;

      html += `
        <tr>
          <td>${food.name}</td>
          <td>${item.quantity}${food.unit}</td>
          <td>${formatNum(prot)}g</td>
          <td>${formatNum(carb)}g</td>
          <td>${formatNum(fat)}g</td>
          <td>${formatNum(cal)}kcal</td>
          <td class="actions">
            <button onclick="openModal(${meal.id}, ${item.id})">Editar</button>
            <button onclick="deleteItem(${item.id})">Remover</button>
          </td>
        </tr>`;
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
      </div>`;

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
    </p>`;
}