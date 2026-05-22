// ==========================================
// CONFIGURAÇÕES DO SUPABASE E SPINNER
// ==========================================
const SUPABASE_URL = 'https://pfgoavahnkcdiazwqhrp.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_ewsjcrQisrjN6P1k5Eez9g_lXglk6u3';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

function showSpinner() {
  document.getElementById('loading-spinner').style.display = 'flex';
}

function hideSpinner() {
  document.getElementById('loading-spinner').style.display = 'none';
}

// ==========================================
// ESTADO GLOBAL
// ==========================================
let foodDB = [];
let mealsDB = [];
let mealItemsDB = [];
let currentMealId = null;

async function apiRequest(endpoint, method = 'GET', body = null) {
  showSpinner();
  const options = { method, headers: HEADERS };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${SUPABASE_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(await response.text());

    if (method === 'GET' || response.headers.get('content-length') !== '0') {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return null;
  } catch (error) {
    console.error("Erro na API:", error);
    alert("Ocorreu um erro ao comunicar com o banco de dados.");
  } finally {
    hideSpinner();
  }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  document.getElementById("food-select").addEventListener("change", (e) => {
    const foodId = parseInt(e.target.value);
    const food = foodDB.find(f => f.id === foodId);
    if (food) document.getElementById("unit-label").innerText = food.unit;
  });

  document.getElementById("new-section-name").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSection();
    }
  });
});

async function loadData() {
  foodDB = await apiRequest('/foods?order=name.asc') || [];
  mealsDB = await apiRequest('/meals?order=id.asc') || [];
  mealItemsDB = await apiRequest('/meal_items') || [];

  if (foodDB.length === 0) {
    await seedDefaultFoods();
  } else {
    renderApp();
    renderFoodDB();
  }
}

async function seedDefaultFoods() {
  // Preços simulados para a carga inicial
  const defaultFoods = [
    { name: "Peito de Frango", unit: "g", reference_amount: 100, protein: 31, carbs: 0, fats: 3.6, calories: 165, price: 2.50 },
    { name: "Arroz Branco", unit: "g", reference_amount: 100, protein: 2.7, carbs: 28, fats: 0.3, calories: 130, price: 0.60 },
    { name: "Azeite de Oliva", unit: "ml", reference_amount: 15, protein: 0, carbs: 0, fats: 14, calories: 119, price: 1.50 },
    { name: "Brócolis", unit: "g", reference_amount: 100, protein: 2.8, carbs: 7, fats: 0.4, calories: 34, price: 1.20 },
    { name: "Aveia em Flocos", unit: "g", reference_amount: 100, protein: 16.9, carbs: 66.3, fats: 6.9, calories: 389, price: 0.90 },
    { name: "Ovos Inteiros", unit: "un", reference_amount: 1, protein: 6, carbs: 0.5, fats: 5, calories: 70, price: 0.80 }
  ];
  await apiRequest('/foods', 'POST', defaultFoods);
  await loadData();
}

// ==========================================
// SEÇÕES DE REFEIÇÕES
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
  if (confirm(`Tem certeza que deseja excluir "${mealName}"?`)) {
    await apiRequest(`/meals?id=eq.${id}`, 'DELETE');
    await loadData();
  }
}

async function editSectionName(id, oldName) {
  const newName = prompt("Digite o novo nome:", oldName);
  if (!newName || newName.trim() === "" || newName === oldName) return;
  if (mealsDB.some(m => m.name.toLowerCase() === newName.toLowerCase())) {
    return alert("Já existe uma refeição com esse nome.");
  }
  await apiRequest(`/meals?id=eq.${id}`, 'PATCH', { name: newName });
  await loadData();
}

// ==========================================
// ITENS DA REFEIÇÃO (MODAL)
// ==========================================
function populateFoodDropdown() {
  const select = document.getElementById("food-select");
  select.innerHTML = foodDB.map(f =>
    `<option value="${f.id}">${f.name} (por ${f.reference_amount}${f.unit})</option>`
  ).join("");
  if (foodDB.length > 0) document.getElementById("unit-label").innerText = foodDB[0].unit;
}

function openModal(mealId, itemId = null) {
  if (foodDB.length === 0) return alert("O banco está vazio.");
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

  if (itemId) await apiRequest(`/meal_items?id=eq.${itemId}`, 'PATCH', payload);
  else await apiRequest(`/meal_items`, 'POST', payload);

  closeModal();
  await loadData();
}

async function deleteItem(itemId) {
  if (confirm("Remover este item?")) {
    await apiRequest(`/meal_items?id=eq.${itemId}`, 'DELETE');
    await loadData();
  }
}

// ==========================================
// BANCO DE ALIMENTOS
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
    document.getElementById("db-food-price").value = food.price || 0; // Preço carregado aqui
  } else {
    document.getElementById("db-food-name").value = "";
    document.getElementById("db-food-ref").value = 100;
    document.getElementById("db-food-prot").value = 0;
    document.getElementById("db-food-carb").value = 0;
    document.getElementById("db-food-fat").value = 0;
    document.getElementById("db-food-cal").value = 0;
    document.getElementById("db-food-price").value = 0;
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
  const price = parseFloat(document.getElementById("db-food-price").value) || 0; // Captura o preço
  const foodId = document.getElementById("db-edit-index").value;

  if (!name || isNaN(ref) || isNaN(prot) || isNaN(carb) || isNaN(fat) || isNaN(cal)) {
    return alert("Preencha todos os campos corretamente.");
  }
  const payload = { name, unit, reference_amount: ref, protein: prot, carbs: carb, fats: fat, calories: cal, price };

  if (foodId) await apiRequest(`/foods?id=eq.${foodId}`, 'PATCH', payload);
  else await apiRequest(`/foods`, 'POST', payload);

  closeFoodModal();
  await loadData();
}

async function deleteFood(foodId, foodName) {
  if (mealItemsDB.some(mi => mi.food_id === foodId)) {
    return alert(`"${foodName}" está sendo usado em uma refeição.`);
  }
  if (confirm(`Excluir "${foodName}"?`)) {
    await apiRequest(`/foods?id=eq.${foodId}`, 'DELETE');
    await loadData();
  }
}

// ==========================================
// RENDERIZAÇÃO PRINCIPAL (Formatadores e Views)
// ==========================================
function formatNum(num) { return parseFloat(num).toFixed(1); }
function formatCurrency(num) { return "R$ " + parseFloat(num).toFixed(2); }

function renderFoodDB() {
  const container = document.getElementById("food-db-container");
  if (foodDB.length === 0) {
    container.innerHTML = `<div class="empty-state">Banco vazio.</div>`;
    return;
  }

  let html = `<div class="table-responsive"><table>
      <thead><tr><th>Alimento</th><th>Ref.</th><th>Prot</th><th>Carb</th><th>Gord</th><th>Kcal</th><th>Preço</th><th>Ações</th></tr></thead><tbody>`;

  foodDB.forEach((food) => {
    html += `<tr>
        <td><strong>${food.name}</strong></td>
        <td>${food.reference_amount}${food.unit}</td>
        <td>${food.protein}g</td>
        <td>${food.carbs}g</td>
        <td>${food.fats}g</td>
        <td>${food.calories}</td>
        <td>${formatCurrency(food.price || 0)}</td>
        <td class="actions">
          <button onclick="openFoodModal(${food.id})">Editar</button>
          <button onclick="deleteFood(${food.id}, '${food.name}')">Excluir</button>
        </td>
      </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderApp() {
  const container = document.getElementById("meals-container");
  container.innerHTML = "";
  // Totais Gerais agora rastreiam o preço
  let grandTotals = { protein: 0, carbs: 0, fats: 0, calories: 0, price: 0 };

  if (mealsDB.length === 0) {
    container.innerHTML = `<div class="empty-state">Adicione uma refeição acima para começar.</div>`;
    document.getElementById("grand-total-section").innerHTML = "";
    return;
  }

  mealsDB.forEach(meal => {
    // Subtotais da refeição agora rastreiam o preço
    let subTotals = { protein: 0, carbs: 0, fats: 0, calories: 0, price: 0 };
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
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>Alimento</th><th>Qtd</th><th>Proteína</th><th>Carbos</th><th>Gordura</th><th>Calorias</th><th>Custo</th><th>Ações</th></tr>
            </thead>
            <tbody>`;

    const items = mealItemsDB.filter(mi => mi.meal_id === meal.id);
    items.forEach(item => {
      const food = foodDB.find(f => f.id === item.food_id);
      if (!food) return;

      const ratio = item.quantity / food.reference_amount;
      const prot = food.protein * ratio;
      const carb = food.carbs * ratio;
      const fat = food.fats * ratio;
      const cal = food.calories * ratio;
      const price = (food.price || 0) * ratio; // Cálculo do preço proporcional

      subTotals.protein += prot; subTotals.carbs += carb;
      subTotals.fats += fat; subTotals.calories += cal; subTotals.price += price;

      html += `<tr>
          <td>${food.name}</td>
          <td>${item.quantity}${food.unit}</td>
          <td>${formatNum(prot)}g</td>
          <td>${formatNum(carb)}g</td>
          <td>${formatNum(fat)}g</td>
          <td>${formatNum(cal)}kcal</td>
          <td>${formatCurrency(price)}</td>
          <td class="actions">
            <button onclick="openModal(${meal.id}, ${item.id})">Editar</button>
            <button onclick="deleteItem(${item.id})">Remover</button>
          </td>
        </tr>`;
    });

    html += `<tr class="subtotal">
            <td colspan="2">Subtotal</td>
            <td>${formatNum(subTotals.protein)}g</td>
            <td>${formatNum(subTotals.carbs)}g</td>
            <td>${formatNum(subTotals.fats)}g</td>
            <td>${formatNum(subTotals.calories)}kcal</td>
            <td>${formatCurrency(subTotals.price)}</td>
            <td></td>
          </tr></tbody></table></div></div>`;

    grandTotals.protein += subTotals.protein; grandTotals.carbs += subTotals.carbs;
    grandTotals.fats += subTotals.fats; grandTotals.calories += subTotals.calories; grandTotals.price += subTotals.price;
    container.innerHTML += html;
  });

  // Mostrando o custo no painel total inferior
  document.getElementById("grand-total-section").innerHTML = `
    <h2>Total Geral Diário</h2>
    <p style="margin-bottom: 10px;">
       <span><strong>Proteína:</strong> ${formatNum(grandTotals.protein)}g | </span>
       <span><strong>Carbos:</strong> ${formatNum(grandTotals.carbs)}g | </span>
       <span><strong>Gorduras:</strong> ${formatNum(grandTotals.fats)}g | </span>
       <span><strong>Calorias:</strong> ${formatNum(grandTotals.calories)}kcal</span>
    </p>
    <p style="font-size: 1.3em; font-weight: bold; color: #2ecc71;">
       Custo Total: ${formatCurrency(grandTotals.price)}
    </p>`;
}