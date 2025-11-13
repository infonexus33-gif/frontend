// ==========================
// ✅ CONFIGURACIÓN GENERAL
// ==========================
const API_BASE = "https://backend-production-206d0.up.railway.app";
const PLANNER_API = `${API_BASE}/api/planner`;
const CLIENTS_API = `${API_BASE}/api/clients`;
const WELLNESS_API = `${API_BASE}/api/wellness`;

// --- Verificación de login ---
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

// --- Helper: controlar expiración de sesión ---
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
  const selectedHoras = Array.isArray(contenido.hora)
    ? contenido.hora
    : typeof contenido.hora === "string"
    ? JSON.parse(contenido.hora || "[]")
    : [];
  const selectedFormatos = Array.isArray(contenido.formato)
    ? contenido.formato
    : typeof contenido.formato === "string"
    ? JSON.parse(contenido.formato || "[]")
    : [];

  tr.dataset.id = contenido.id || "";

  tr.innerHTML = `
    <td><input type="date" value="${contenido?.fecha ? contenido.fecha.split("T")[0] : ""}" /></td>
    <td>
      <select multiple>
        ${horas
          .map(
            (h) =>
              `<option value="${h}" ${
                selectedHoras.includes(h) ? "selected" : ""
              }>${h}</option>`
          )
          .join("")}
      </select>
    </td>
    <td>
      <select multiple>
        ${formatos
          .map(
            (f) =>
              `<option value="${f}" ${
                selectedFormatos.includes(f) ? "selected" : ""
              }>${f}</option>`
          )
          .join("")}
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
    const horasSel = Array.from(
      tr.querySelectorAll("td:nth-child(2) select option:checked")
    ).map((o) => o.value);
    const formatosSel = Array.from(
      tr.querySelectorAll("td:nth-child(3) select option:checked")
    ).map((o) => o.value);
    const copy = tr.querySelector("textarea").value;
    const link = tr.querySelector('td:nth-child(5) input').value;
    const id = tr.dataset.id;

    if (!fecha || !horasSel.length || !formatosSel.length) {
      return alert("Completá fecha, hora y formato.");
    }

    const payload = {
      fecha,
      hora: horasSel,
      formato: formatosSel,
      copy,
      link,
    };

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `${PLANNER_API}/${id}` : PLANNER_API;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (!res.ok) return alert(data.error || "Error al guardar contenido");
      alert("Contenido guardado ✅");
      await cargarContenidos();
    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión al guardar contenido");
    }
  });

  // Eliminar contenido
  tr.querySelector(".deleteBtn").addEventListener("click", async () => {
    const id = tr.dataset.id;
    if (!id) return tr.remove();
    if (!confirm("¿Eliminar contenido?")) return;

    try {
      const res = await fetch(`${PLANNER_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (!res.ok) return alert(data.error || "Error al eliminar contenido");
      alert("Contenido eliminado 🗑️");
      tr.remove();
    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión al eliminar contenido");
    }
  });

  tableBody.appendChild(tr);
}

async function cargarContenidos() {
  if (!tableBody) return;
  tableBody.innerHTML = "";
  try {
    const res = await fetch(PLANNER_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkAuthError(res)) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach((c) => crearFilaContenido(c));
    }
  } catch (e) {
    console.warn("No se pudieron cargar contenidos:", e.message);
  }
}

addRowBtn?.addEventListener("click", () => crearFilaContenido());

// ==========================
// 👥 CLIENTES + TOTAL MES
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
    <td><input type="date" value="${
      cliente.inicio_proyecto ? cliente.inicio_proyecto.split("T")[0] : ""
    }" /></td>
    <td><input type="date" value="${
      cliente.fin_proyecto ? cliente.fin_proyecto.split("T")[0] : ""
    }" /></td>
    <td>
      <select>
        ${prioridades
          .map(
            (p) =>
              `<option value="${p}" ${
                cliente.prioridad === p ? "selected" : ""
              }>${p}</option>`
          )
          .join("")}
      </select>
    </td>
    <td><textarea>${cliente.descripcion || ""}</textarea></td>
    <td>
      <button class="saveClient">💾</button>
      <button class="deleteClient">🗑️</button>
    </td>
  `;

  // Guardar cliente
  tr.querySelector(".saveClient").addEventListener("click", async () => {
    const id = tr.dataset.id;

    const data = {
      nombre: tr.children[0].querySelector("input").value,
      pago_mensual: parseFloat(tr.children[1].querySelector("input").value || 0),
      pagado: parseFloat(tr.children[2].querySelector("input").value || 0),
      inicio_proyecto: tr.children[3].querySelector("input").value || null,
      fin_proyecto: tr.children[4].querySelector("input").value || null,
      prioridad: tr.children[5].querySelector("select").value,
      descripcion: tr.children[6].querySelector("textarea").value,
    };

    if (!data.nombre) return alert("El nombre es obligatorio.");

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `${CLIENTS_API}/${id}` : CLIENTS_API;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (checkAuthError(res)) return;
      const result = await res.json();
      if (!res.ok) return alert(result.error || "Error al guardar cliente");
      alert(result.message || "Cliente guardado ✅");
      await cargarClientes();
      await actualizarTotalMes();
    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión al guardar cliente");
    }
  });

  // Eliminar cliente
  tr.querySelector(".deleteClient").addEventListener("click", async () => {
    const id = tr.dataset.id;
    if (id && !confirm("¿Eliminar cliente?")) return;

    try {
      if (id) {
        const res = await fetch(`${CLIENTS_API}/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (checkAuthError(res)) return;
        await res.json();
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión al eliminar cliente");
      return;
    }

    tr.remove();
    await actualizarTotalMes();
  });

  return tr;
}

async function cargarClientes() {
  if (!clientsBody) return;
  clientsBody.innerHTML = "";
  try {
    const res = await fetch(CLIENTS_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkAuthError(res)) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach((c) => clientsBody.appendChild(filaClienteTemplate(c)));
    }
  } catch (e) {
    console.warn("No se pudieron cargar clientes:", e.message);
  }
}

// Total mensual
async function actualizarTotalMes() {
  if (!mesSelect || !totalPagadoMes) return;
  const value = mesSelect.value;
  if (!value) {
    totalPagadoMes.textContent = "💰 Total mes: $0";
    return;
  }
  const [year, month] = value.split("-");
  try {
    const res = await fetch(`${CLIENTS_API}/total/${year}/${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkAuthError(res)) return;
    const data = await res.json();
    const total = Number(data.total_mes || 0).toFixed(2);
    totalPagadoMes.textContent = `💰 Total mes: $${total}`;
  } catch (e) {
    console.warn("No se pudo calcular total del mes:", e.message);
  }
}

addClientBtn?.addEventListener("click", () =>
  clientsBody.appendChild(filaClienteTemplate())
);
mesSelect?.addEventListener("change", actualizarTotalMes);

// ==========================
// 💫 MOOD TRACKER + CHART
// ==========================
const moodBtns = document.querySelectorAll(".mood-btn");
const energyRange = document.getElementById("energyRange");
const energyValue = document.getElementById("energyValue");
const moodCanvas = document.getElementById("moodChart");

let moodHistory = [];
let moodChart = null;

// Cargar historial desde localStorage
try {
  const stored = localStorage.getItem("moodHistory");
  if (stored) moodHistory = JSON.parse(stored);
} catch {
  moodHistory = [];
}

function saveMoodHistory() {
  localStorage.setItem("moodHistory", JSON.stringify(moodHistory));
}

function renderMoodChart() {
  if (!moodCanvas || typeof Chart === "undefined") return;
  const ctx = moodCanvas.getContext("2d");

  // Últimos 7
  const last = moodHistory.slice(-7);
  const labels = last.map((e) => e.dateLabel);
  const moods = last.map((e) => e.mood);
  const energy = last.map((e) => e.energy);

  if (moodChart) moodChart.destroy();

  moodChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Estado de ánimo",
          data: moods,
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Energía",
          data: energy,
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.3,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
        },
      },
    },
  });
}

energyRange?.addEventListener("input", () => {
  if (energyValue) energyValue.textContent = `${energyRange.value}%`;
});

moodBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    moodBtns.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    const mood = Number(btn.dataset.mood);
    const energy = Number(energyRange?.value || 60);

    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const dateLabel = today.toLocaleDateString();

    // Actualizo historial local (1 por día)
    moodHistory = moodHistory.filter((e) => e.date !== iso);
    moodHistory.push({ date: iso, dateLabel, mood, energy });
    saveMoodHistory();
    renderMoodChart();

    // Enviar al backend
    try {
      await fetch(`${WELLNESS_API}/mood`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mood, energy }),
      });
    } catch (err) {
      console.warn("No se pudo guardar mood en backend:", err.message);
    }
  });
});

// ==========================
// 🗓️ TIMELINE
// ==========================
const timelineText = document.getElementById("timelineText");
const addEntryBtn = document.getElementById("addEntryBtn");
const timelineEntries = document.getElementById("timelineEntries");

addEntryBtn?.addEventListener("click", async () => {
  const content = timelineText.value.trim();
  if (!content) return;

  try {
    await fetch(`${WELLNESS_API}/timeline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    const item = document.createElement("div");
    item.className = "timeline-item";
    const date = new Date().toLocaleDateString();
    item.innerHTML = `
      <div class="timeline-date">${date}</div>
      <div class="timeline-text">${content}</div>
    `;
    timelineEntries?.prepend(item);
    timelineText.value = "";
  } catch (err) {
    console.error(err);
    alert("No se pudo guardar la entrada de la línea de tiempo");
  }
});

// ==========================
// 🧩 TAREAS (MUST / SHOULD / WANT)
// ==========================
document.querySelectorAll(".add-task").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const listId = btn.dataset.list;
    const ul = document.getElementById(listId);
    if (!ul) return;

    const categoria =
      listId === "mustList" ? "Must" : listId === "shouldList" ? "Should" : "Want";

    const titulo = prompt(`Nueva tarea (${categoria}):`);
    if (!titulo) return;

    try {
      await fetch(`${WELLNESS_API}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ categoria, titulo }),
      });

      const li = document.createElement("li");
      li.innerHTML = `<span>${titulo}</span> <input type="checkbox" />`;
      ul.appendChild(li);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la tarea");
    }
  });
});

// ==========================
// 🔁 HABIT TRACKER RADIAL
// ==========================
const habitSvg = document.getElementById("habitTracker");

if (habitSvg) {
  const totalDays = 30;
  const habits = [
    { color: "#93c5fd" }, // azul
    { color: "#f9a8d4" }, // rosa
    { color: "#c4b5fd" }, // violeta
    { color: "#fbbf24" }, // amarillo
  ];

  const center = 600;     // punto central del SVG
  const ringWidth = 40;   // separación entre anillos
  const radiusStart = 150;

  // Dibujar círculos por hábito y día
  habits.forEach((habit, row) => {
    for (let day = 0; day < totalDays; day++) {
      const angle = (day / totalDays) * 2 * Math.PI - Math.PI / 2;
      const radius = radiusStart + row * ringWidth;

      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", 8);
      circle.setAttribute("stroke", habit.color);
      circle.setAttribute("opacity", "0.5");

      circle.addEventListener("click", async () => {
        circle.classList.toggle("active");
        const completed = circle.classList.contains("active");
        circle.style.opacity = completed ? "1" : "0.5";

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(day + 1).padStart(2, "0");
        const isoDay = `${yyyy}-${mm}-${dd}`;

        try {
          await fetch(`${WELLNESS_API}/habits`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ day: isoDay, completed }),
          });
        } catch (err) {
          console.warn("No se pudo guardar hábito:", err.message);
        }
      });

      habitSvg.appendChild(circle);
    }
  });

  // Agregar números (1–30)
  for (let day = 0; day < totalDays; day++) {
    const angle = (day / totalDays) * 2 * Math.PI - Math.PI / 2;
    const radius = radiusStart + habits.length * ringWidth + 20;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);

    const text = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("fill", "#111827");
    text.setAttribute("font-size", "10");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("alignment-baseline", "middle");
    text.textContent = day + 1;

    habitSvg.appendChild(text);
  }
}

// ==========================
// 🚪 LOGOUT
// ==========================
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});

// ==========================
// 🚀 CARGA INICIAL
// ==========================
cargarContenidos();
cargarClientes();
actualizarTotalMes();
renderMoodChart();
