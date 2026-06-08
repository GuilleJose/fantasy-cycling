const API_URL = "http://localhost:3000/api";
const appContent = document.getElementById("app-content");
let currentTeam = {};
let maillots = ["rabobank.png"]; // Lista de maillots disponibles

// Añadir los estilos de animación
(function addStyles() {
  const style = document.createElement('style');
  style.id = 'bike-loading-styles';
  style.textContent = `
    @keyframes bikeRide {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }
    @keyframes wheelSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pedalMove {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .bike-loader {
      animation: bikeRide 0.6s ease-in-out infinite;
      display: inline-block;
      font-size: 3.5rem;
    }
    .wheel-loader {
      animation: wheelSpin 0.8s linear infinite;
      display: inline-block;
      font-size: 2rem;
      margin-left: 5px;
    }
    .pedal-loader {
      animation: pedalMove 0.4s ease-in-out infinite;
      display: inline-block;
      font-size: 1.5rem;
      margin-left: 5px;
    }
  `;
  document.head.appendChild(style);
})();

// Mostrar loading con bicicleta animada
function showBicycleLoading() {
  appContent.innerHTML = `
    <div class="text-center" style="padding: 4rem 0;">
      <div>
        <span class="bike-loader">🚴</span>
        <span class="wheel-loader">⚙️</span>
        <span class="pedal-loader">👟</span>
      </div>
      <p class="text-muted mt-4 mb-1" style="font-size: 1.1rem;">Preparando tu equipo ciclista</p>
      <p class="text-muted small">Estamos ajustando los pedales para ti...</p>
      <div class="progress mt-4" style="max-width: 250px; margin: 0 auto; height: 4px;">
        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%; background-color: #006630;"></div>
      </div>
    </div>
  `;
}

// Inicializar la página
async function initTeam() {
  showBicycleLoading(); // Mostrar bicicleta mientras carga
  
  // Pequeño delay para asegurar que se ve la animación
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await loadMaillots();
  await loadTeam();
  renderTeamPage();
}

// Cargar lista de maillots disponibles
async function loadMaillots() {
  try {
    const response = await fetch(`${API_URL}/team/maillots`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.maillots) && data.maillots.length > 0) {
        maillots = data.maillots;
        return;
      }
    }

    // Fallback si el backend no responde o no hay maillots
    maillots = ["rabobank.png"];
  } catch (err) {
    console.error("Error cargando maillots:", err);
    maillots = ["rabobank.png"];
  }
}

// Cargar datos del equipo
async function loadTeam() {
  try {
    const response = await fetch(`${API_URL}/team/`);
    currentTeam = await response.json();
  } catch (err) {
    console.error("Error cargando equipo:", err);
    currentTeam = {
      teamName: "Mi Equipo",
      directorName: "Director",
      riders: [],
      maillotImage: "rabobank.png",
      totalPrice: 0,
      totalPoints: 0
    };
  }
}

// Renderizar la página de equipo
function renderTeamPage() {
  appContent.innerHTML = `
    <div class="row">
      <!-- Sección de configuración del equipo -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Configuración del Equipo</h3>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Nombre del Equipo</label>
              <input type="text" class="form-control" id="teamName" value="${currentTeam.teamName || ''}">
            </div>
            <div class="mb-3">
              <label class="form-label">Nombre del Director</label>
              <input type="text" class="form-control" id="directorName" value="${currentTeam.directorName || ''}">
            </div>
            <div class="mb-3">
              <label class="form-label">Maillot del Equipo</label>
              <div class="row">
                <div class="col-md-6">
                  <select class="form-select" id="maillotSelect" onchange="previewMaillot()">
                    ${maillots.map(m => `<option value="${m}" ${currentTeam.maillotImage === m ? 'selected' : ''}>${m}</option>`).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <img id="maillotPreview" src="assets/maillots/${currentTeam.maillotImage}" alt="Maillot" style="max-height: 150px; border-radius: 8px;">
                </div>
              </div>
            </div>
            <button class="btn btn-primary" onclick="saveTeamConfig()">Guardar Configuración</button>
          </div>
        </div>

        <!-- Sección de corredores del equipo -->
        <div class="card mt-4">
          <div class="card-header">
            <h3 class="card-title">Corredores en el Equipo (${currentTeam.riders?.length || 0}/8)</h3>
          </div>
          <div class="table-responsive">
            <table class="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Equipo</th>
                  <th>Precio</th>
                  <th>Puntos</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${currentTeam.riders && currentTeam.riders.length > 0 
                  ? currentTeam.riders.map(rider => `
                    <tr>
                      <td>${rider.riderName}</td>
                      <td>${rider.riderTeam}</td>
                      <td>€${rider.riderPrice}M</td>
                      <td><span class="badge bg-info text-dark">${rider.points}</span></td>
                      <td>
                        <button class="btn btn-sm btn-danger" onclick="removeRiderFromTeam('${rider.riderId}')">Quitar</button>
                      </td>
                    </tr>
                  `).join('')
                  : `<tr><td colspan="5" class="text-center text-muted">No hay corredores en tu equipo</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Resumen lateral -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h3 class="card-title mb-4">Resumen del Equipo</h3>
            <div class="mb-3">
              <div class="text-muted small">Nombre del Equipo</div>
              <div class="h5">${currentTeam.teamName || 'Mi Equipo'}</div>
            </div>
            <div class="mb-3">
              <div class="text-muted small">Director</div>
              <div class="h5">${currentTeam.directorName || 'Director'}</div>
            </div>
            <hr class="my-3">
            <div class="mb-3">
              <div class="text-muted small">Corredores</div>
              <div class="h5">${currentTeam.riders?.length || 0} / 8</div>
            </div>
            <div class="mb-3">
              <div class="text-muted small">Presupuesto Utilizado</div>
              <div class="h5">€${currentTeam.totalPrice || 0}M</div>
            </div>
            <div class="mb-3">
              <div class="text-muted small">Puntos Totales</div>
              <div class="h5 text-success">${currentTeam.totalPoints || 0}</div>
            </div>
            <hr class="my-3">
            <div class="alert alert-info">
              <strong>ℹ️ Info:</strong> Ve a la sección de <a href="dashboard.html">Corredores</a> para añadir más ciclistas.
            </div>
          </div>
        </div>

        <!-- Preview Maillot -->
        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">Maillot Seleccionado</h3>
          </div>
          <div class="card-body text-center">
            <img src="assets/maillots/${currentTeam.maillotImage}" alt="Maillot" style="max-height: 250px; border-radius: 8px;">
          </div>
        </div>
      </div>
    </div>
  `;
}

// Cambiar preview del maillot
function previewMaillot() {
  const select = document.getElementById("maillotSelect");
  const preview = document.getElementById("maillotPreview");
  if (select && preview) {
    preview.src = `assets/maillots/${select.value}`;
  }
}

// Guardar configuración del equipo
async function saveTeamConfig() {
  // Mostrar loading mientras guarda
  showBicycleLoading();
  
  const teamName = document.getElementById("teamName").value;
  const directorName = document.getElementById("directorName").value;
  const maillotImage = document.getElementById("maillotSelect").value;

  if (!teamName.trim() || !directorName.trim()) {
    alert("Por favor, completa todos los campos");
    renderTeamPage(); // Volver a renderizar si hay error
    return;
  }

  try {
    const response = await fetch(`${API_URL}/team/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, directorName, maillotImage })
    });

    if (!response.ok) {
      throw new Error("Error al guardar configuración");
    }

    currentTeam = await response.json();
    alert("✅ Configuración guardada correctamente");
    renderTeamPage();
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error al guardar configuración");
    renderTeamPage();
  }
}

// Remover corredor del equipo
async function removeRiderFromTeam(riderId) {
  if (!confirm("¿Estás seguro de que deseas remover este corredor?")) {
    return;
  }
  
  // Mostrar loading mientras elimina
  showBicycleLoading();

  try {
    const response = await fetch(`${API_URL}/team/remove-rider/${riderId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Error al remover corredor");
    }

    currentTeam = await response.json();
    alert("✅ Corredor removido correctamente");
    renderTeamPage();
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error al remover corredor");
    renderTeamPage();
  }
}

// Inicializar al cargar la página
document.addEventListener("DOMContentLoaded", initTeam);