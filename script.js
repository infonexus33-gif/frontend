// ==========================
// ✅ CONFIGURACIÓN GENERAL
// ==========================
const API_BASE = "https://backend-production-206d0.up.railway.app";
const PLANNER_API = `${API_BASE}/api/planner`;
const CLIENTS_API = `${API_BASE}/api/clients`;
const WELLNESS_API = `${API_BASE}/api/wellness`;

// --- Verificación de login ---
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// --- Control de expiración de sesión ---
function checkAuthError(res) {
  if (res.status === 401 || res.status === 403) {
    alert("Tu sesión ha expirado. Volvé a iniciar sesión.");
    localStorage.clear();
    window.location.href = "login.html";
    return true;
  }
  return false;
}

// ==========================
// 📅 PLANIFICADOR
// ==========================
const tableBody = document.getElementById("tableBody");
const addRowBtn = document.getElementById("addRowBtn");

const horas = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const formatos = ["Reel", "History", "Feed post"];

function crearFilaContenido(contenido = {}) {
  const tr = document.createElement("tr");
  const selectedHoras = contenido?.hora || [];
  const selectedFormatos = contenido?.formato || [];

  tr.innerHTML = `
    <td><input type="date" value="${contenido?.fecha ? contenido.fecha.split("T")[0] : ""}" /></td>
    <td>
      <select multiple>
        ${horas.map(h => `<option value="${h}" ${selectedHoras.includes(h) ? "selected" : ""}>${h}</option>`).join("")}
      </select>
    </td>
    <td>
      <select multiple>
        ${formatos.map(f => `<option value="${f}" ${selectedFormatos.includes(f) ? "selected" : ""}>${f}</option>`).join("")}
      </select>
    </td>
    <td><textarea>${contenido?.copy || ""}</textarea></td>
    <td><input type="text" value="${contenido?.link || ""}" placeholder="https://..." /></td>
    <td>
      <button class="saveBtn">💾</button>
      <button class="deleteBtn">🗑️</button>
    </td>
  `;

  // Guardar contenido
  tr.querySelector(".saveBtn").addEventListener("click", async () => {
    const fecha = tr.querySelector('input[type="date"]').value;
    const horasSel = Array.from(tr.querySelectorAll("td:nth-child(2) select option:checked")).map(o => o.value);
    const formatosSel = Array.from(tr.querySelectorAll("td:nth-child(3) select option:checked")).map(o => o.value);
    const copy = tr.querySelector("textarea").value;
    const link = tr.querySelector('td:nth-child(5) input').value;

    if (!fecha || !horasSel.length || !formatosSel.length) {
      return alert("Completá fecha, hora y formato.");
    }

    try {
      const res = await fetch(PLANNER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fecha, hora: horasSel, formato: formatosSel, copy, link })
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      res.ok ? alert("Contenido guardado ✅") : alert(data.error || "Error al guardar contenido");
    } catch {
      alert("❌ Error de conexión al guardar contenido");
    }
  });

  // Eliminar contenido
  tr.querySelector(".deleteBtn").addEventListener("click", async () => {
    const id = contenido?.id;
    if (!id) return tr.remove();
    if (!confirm("¿Eliminar contenido?")) return;
    try {
      const res = await fetch(`${PLANNER_API}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
      if (checkAuthError(res)) return;
      const data = await res.json();
      res.ok ? (alert("Contenido eliminado 🗑️"), tr.remove()) : alert(data.error || "Error al eliminar");
    } catch {
      alert("❌ Error de conexión al eliminar contenido");
    }
  });

  tableBody.appendChild(tr);
}

async function cargarContenidos() {
  tableBody.innerHTML = "";
  try {
    const res = await fetch(PLANNER_API, { headers: { "Authorization": `Bearer ${token}` } });
    if (checkAuthError(res)) return;
    const data = await res.json();
    if (Array.isArray(data)) data.forEach(c => crearFilaContenido(c));
  } catch (e) {
    console.warn("No se pudieron cargar contenidos:", e.message);
  }
}
addRowBtn?.addEventListener("click", () => crearFilaContenido());

// ==========================
// 👥 CLIENTES
// ==========================
const clientsBody = document.getElementById("clientsBody");
const addClientBtn = document.getElementById("addClientBtn");
const mesSelect = document.getElementById("mesSelect");
const totalPagadoMes = document.getElementById("totalPagadoMes");

const prioridades = ["Baja", "Media", "Alta"];

function filaClienteTemplate(cliente = {}) {
  const tr = document.createElement("tr");
  tr.dataset.id = cliente.id || "";
  tr.innerHTML = `
    <td><input type="text" value="${cliente.nombre || ""}" placeholder="Nombre cliente" /></td>
    <td><input type="number" step="0.01" value="${cliente.pago_mensual || 0}" /></td>
    <td><input type="number" step="0.01" value="${cliente.pagado || 0}" /></td>
    <td><input type="date" value="${cliente.inicio_proyecto ? cliente.inicio_proyecto.split('T')[0] : ""}" /></td>
    <td><input type="date" value="${cliente.fin_proyecto ? cliente.fin_proyecto.split('T')[0] : ""}" /></td>
    <td>
      <select>
        ${prioridades.map(p => `<option value="${p}" ${cliente.prioridad === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
    </td>
    <td><textarea>${cliente.descripcion || ""}</textarea></td>
    <td><button class="saveClient">💾</button><button class="deleteClient">🗑️</button></td>
  `;

  tr.querySelector(".saveClient").addEventListener("click", async () => {
    const id = tr.dataset.id;
    const data = {
      nombre: tr.children[0].querySelector("input").value,
      pago_mensual: parseFloat(tr.children[1].querySelector("input").value || 0),
      pagado: parseFloat(tr.children[2].querySelector("input").value || 0),
      inicio_proyecto: tr.children[3].querySelector("input").value || null,
      fin_proyecto: tr.children[4].querySelector("input").value || null,
      prioridad: tr.children[5].querySelector("select").value,
      descripcion: tr.children[6].querySelector("textarea").value
    };
    if (!data.nombre) return alert("El nombre es obligatorio.");

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `${CLIENTS_API}/${id}` : CLIENTS_API;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (checkAuthError(res)) return;
      const result = await res.json();
      if (!res.ok) return alert(result.error || "Error al guardar cliente");
      alert(result.message || "Cliente guardado ✅");
      await cargarClientes();
      await actualizarTotalMes();
    } catch {
      alert("❌ Error de conexión al guardar cliente");
    }
  });

  tr.querySelector(".deleteClient").addEventListener("click", async () => {
    const id = tr.dataset.id;
    if (id && confirm("¿Eliminar cliente?")) {
      try {
        const res = await fetch(`${CLIENTS_API}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
        if (checkAuthError(res)) return;
        await res.json();
      } catch {
        return alert("❌ Error de conexión al eliminar");
      }
    }
    tr.remove();
    await actualizarTotalMes();
  });

  return tr;
}

async function cargarClientes() {
  clientsBody.innerHTML = "";
  try {
    const res = await fetch(CLIENTS_API, { headers: { "Authorization": `Bearer ${token}` } });
    if (checkAuthError(res)) return;
    const data = await res.json();
    if (Array.isArray(data)) data.forEach(c => clientsBody.appendChild(filaClienteTemplate(c)));
  } catch (e) {
    console.warn("No se pudieron cargar clientes:", e.message);
  }
}

async function actualizarTotalMes() {
  const value = mesSelect?.value;
  if (!value) return;
  const [year, month] = value.split("-");
  try {
    const res = await fetch(`${CLIENTS_API}/total/${year}/${month}`, { headers: { "Authorization": `Bearer ${token}` } });
    if (checkAuthError(res)) return;
    const data = await res.json();
    totalPagadoMes.textContent = `💰 Total mes: $${Number(data.total_mes || 0).toFixed(2)}`;
  } catch (e) {
    console.warn("No se pudo calcular total del mes:", e.message);
  }
}
addClientBtn?.addEventListener("click", () => clientsBody.appendChild(filaClienteTemplate()));

// ==========================
// 💫 WELLNESS MODULE
// ==========================
const moodBtns = document.querySelectorAll(".mood-btn");
const energyRange = document.getElementById("energyRange");
const energyValue = document.getElementById("energyValue");

moodBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    moodBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    const data = {
      mood: btn.dataset.mood,
      energy: energyRange?.value || 60
    };
    await fetch(`${WELLNESS_API}/mood`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(data)
    });
  });
});
energyRange?.addEventListener("input", () => (energyValue.textContent = `${energyRange.value}%`));

// TIMELINE
const timelineText = document.getElementById("timelineText");
const addEntryBtn = document.getElementById("addEntryBtn");
const timelineEntries = document.getElementById("timelineEntries");
addEntryBtn?.addEventListener("click", async () => {
  const content = timelineText.value.trim();
  if (!content) return;
  await fetch(`${WELLNESS_API}/timeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ content })
  });
  const item = document.createElement("div");
  item.className = "timeline-item";
  item.innerHTML = `<strong>${new Date().toLocaleDateString()}</strong>: ${content}`;
  timelineEntries.prepend(item);
  timelineText.value = "";
});

// TAREAS
document.querySelectorAll(".add-task").forEach(btn => {
  btn.addEventListener("click", async () => {
    const listId = btn.dataset.list;
    const ul = document.getElementById(listId);
    const categoria = listId === "mustList" ? "Must" : listId === "shouldList" ? "Should" : "Want";
    const titulo = prompt(`Nueva tarea (${categoria}):`);
    if (!titulo) return;
    await fetch(`${WELLNESS_API}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ categoria, titulo })
    });
    const li = document.createElement("li");
    li.innerHTML = `<span>${titulo}</span> <input type="checkbox" />`;
    ul.appendChild(li);
  });
});

// HABITS
const habitGrid = document.getElementById("habitGrid");
if (habitGrid) {
  for (let i = 1; i <= 30; i++) {
    const cell = document.createElement("div");
    cell.className = "habit-cell";
    cell.textContent = i;
    cell.addEventListener("click", async () => {
      cell.classList.toggle("checked");
      await fetch(`${WELLNESS_API}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ day: `2025-11-${String(i).padStart(2, "0")}`, completed: cell.classList.contains("checked") })
      });
    });
    habitGrid.appendChild(cell);
  }
}

// ==========================
// 🚀 CARGA INICIAL
// ==========================
cargarContenidos();
cargarClientes();
actualizarTotalMes();

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});
