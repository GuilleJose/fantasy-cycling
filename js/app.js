// ============================================================
// CONFIGURACIÓN DE LA API - CAMBIA SOLO ESTA LÍNEA PARA PRODUCCIÓN
// ============================================================
// Para desarrollo local:
const API_BASE_URL = 'https://fantasy-cycling-api.onrender.com/api';
// Para producción (Render), cambia a:
// const API_BASE_URL = 'https://tu-backend.onrender.com/api';
// ============================================================

console.log('🔧 API Base URL:', API_BASE_URL);

// Añadir estilos de animación para la bicicleta
(function addBikeStyles() {
  if (document.getElementById('bike-loading-styles')) return;
  
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
      font-size: 3rem;
    }
    .wheel-loader {
      animation: wheelSpin 0.8s linear infinite;
      display: inline-block;
      font-size: 1.8rem;
      margin-left: 5px;
    }
    .pedal-loader {
      animation: pedalMove 0.4s ease-in-out infinite;
      display: inline-block;
      font-size: 1.3rem;
      margin-left: 5px;
    }
    .bicycle-loading-container {
      padding: 2rem 0;
    }
    
    /* Estilos elegantes para el spinner de rueda de bicicleta */
    .elegant-bike-spinner {
      display: inline-block;
    }
    .spinner-ring {
      position: relative;
      width: 60px;
      height: 60px;
      animation: ringSpin 2s linear infinite;
    }
    .spinner-spoke {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 28px;
      height: 2px;
      background: #006630;
      transform-origin: left center;
      opacity: 0.6;
    }
    .spinner-spoke:nth-child(1) { transform: rotate(0deg) translateX(-50%); }
    .spinner-spoke:nth-child(2) { transform: rotate(45deg) translateX(-50%); }
    .spinner-spoke:nth-child(3) { transform: rotate(90deg) translateX(-50%); }
    .spinner-spoke:nth-child(4) { transform: rotate(135deg) translateX(-50%); }
    .spinner-spoke:nth-child(5) { transform: rotate(180deg) translateX(-50%); }
    .spinner-spoke:nth-child(6) { transform: rotate(225deg) translateX(-50%); }
    .spinner-spoke:nth-child(7) { transform: rotate(270deg) translateX(-50%); }
    .spinner-spoke:nth-child(8) { transform: rotate(315deg) translateX(-50%); }
    .spinner-center {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      background: #006630;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    @keyframes ringSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .spinner-ring::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 2px solid #006630;
      border-radius: 50%;
      border-top-color: transparent;
      animation: ringSpin 1s linear infinite;
    }
      .team-row-in-league {
  transition: all 0.2s ease;
  cursor: pointer;
}
.team-row-in-league:hover {
  background-color: #f0f7ff !important;
  transform: translateX(3px);
}
  `;
  document.head.appendChild(style);
})();

const content = document.getElementById("app-content");
let currentUser = null;
let ridersData = [];
let allRidersData = [];

// Obtener usuario actual
function getCurrentUser() {
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  const username = localStorage.getItem('username') || sessionStorage.getItem('username');
  const isAdmin = localStorage.getItem('isAdmin') === 'true' || sessionStorage.getItem('isAdmin') === 'true';
  
  if (userId) {
    return { id: userId, username, isAdmin };
  }
  return null;
}

// Verificar autenticación
function checkAuth() {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'index.html';
    return false;
  }
  
  // Mostrar usuario en el sidebar
  const usernameDisplay = document.getElementById('usernameDisplay');
  const topbarUsername = document.getElementById('topbarUsername');
  if (usernameDisplay) usernameDisplay.textContent = ` (${currentUser.username})`;
  if (topbarUsername) topbarUsername.textContent = currentUser.username;
  
  // Mostrar enlace de admin si es administrador
  const adminMenuLink = document.getElementById('adminMenuLink');
  if (adminMenuLink && currentUser.isAdmin) {
    adminMenuLink.style.display = 'block';
  }
  
  return true;
}


// Variable global para el nombre de la carrera
let raceNameGlobal = "Giro 2026";

// Función para obtener el nombre de la carrera desde la configuración
async function loadRaceName() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/config`);
    const config = await response.json();
    if (config && config.raceName) {
      raceNameGlobal = config.raceName;
    }
  } catch (err) {
    console.error("Error cargando nombre de carrera:", err);
  }
  return raceNameGlobal;
}

function updateRaceNameInCurrentPage() {
  // Título de corredores
  const ridersTitle = document.querySelector('#app-content .card-header .card-title');
  if (ridersTitle && ridersTitle.textContent.includes('Corredores de')) {
    ridersTitle.textContent = `Corredores de ${raceNameGlobal}`;
  }
  
  // Título de resultados
  const resultsTitle = document.querySelector('#app-content .card-header .card-title');
  if (resultsTitle && resultsTitle.textContent.includes('Resultados de')) {
    resultsTitle.textContent = `📊 Resultados de ${raceNameGlobal}`;
  }
}


// inicial
setupLogout();
if (checkAuth()) {
  // Primero cargar el nombre de la carrera, luego cargar la página
  loadRaceName().then(() => {
    loadPage("inicio");
  });
}

// Logout
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
  }
}

// VISTAS
const views = {
  team: `
    <div id="teamContent">
      <div class="card">
        <div class="card-body text-center bicycle-loading-container">
          <div class="elegant-bike-spinner">
            <div class="spinner-ring">
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-center"></div>
            </div>
          </div>
          <p class="text-muted mt-4 mb-0" style="font-size: 0.9rem; letter-spacing: 1px;">CARGANDO EQUIPO</p>
          <p class="text-muted small mt-1">⛁  preparando ciclistas  ⛁</p>
        </div>
      </div>
    </div>
  `,

inicio: `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">🏠 Inicio - Mis Ligas</h3>
    </div>
    <div class="card-body">
      <!-- Selector de Liga -->
      <div class="row mb-4">
        <div class="col-md-6">
          <label class="form-label fw-bold">🏆 Selecciona tu Liga:</label>
          <select id="homeLeagueSelector" class="form-select" onchange="loadHomeLeagueData()">
            <option value="">-- Cargando ligas... --</option>
          </select>
        </div>
        
        <!-- Selector de Etapa -->
        <div class="col-md-6">
          <label class="form-label fw-bold">📊 Ver puntos por:</label>
          <select id="homeStageSelector" class="form-select" onchange="loadHomeStageData()">
            <option value="total">🏆 Puntos Totales</option>
            ${Array.from({ length: 21 }, (_, i) => `<option value="${i + 1}">📍 Etapa ${i + 1}</option>`).join('')}
          </select>
          <div id="homeStageInfo" class="mt-2 small text-muted"></div>
        </div>
      </div>
      
      <!-- Contenedor de la tabla de clasificación -->
      <div id="homeRankingContainer">
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-muted mt-3">Selecciona una liga para ver la clasificación</p>
        </div>
      </div>
    </div>
  </div>
`,

riders: `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">Corredores de ${raceNameGlobal}</h3>
    </div>
    <div class="card-body">
      <!-- FILTROS Y ORDENACIÓN -->
      <div class="row mb-3">
        <div class="col-md-4">
          <input type="text" id="searchInput" class="form-control" placeholder="🔍 Buscar corredor...">
        </div>
        <div class="col-md-4">
          <select id="teamFilter" class="form-select">
            <option value="">Todos los equipos</option>
          </select>
        </div>
        <div class="col-md-4">
          <select id="sortFilter" class="form-select">
            <option value="price">💰 Precio (más caro)</option>
            <option value="price_asc">💰 Precio (más barato)</option>
            <option value="name">🔤 Nombre (A-Z)</option>
          </select>
        </div>
      </div>

      <div class="mb-2 text-muted" id="ridersCount"></div>

      <div class="table-responsive">
        <table class="table table-hover table-striped">
          <thead class="table-dark">
            <tr>
              <th>Equipo</th>
              <th>Nombre</th>
              <th>Precio (€M)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="ridersTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>
`,

leagues: `
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h3 class="card-title mb-0">🏆 Ligas de Fantasy Cycling</h3>
      <button class="btn btn-primary" onclick="openCreateLeagueModal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Crear Liga
      </button>
    </div>
    <div class="card-body">
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text">🔍</span>
            <input type="text" id="leagueSearchInput" class="form-control" placeholder="Buscar por nombre o código...">
          </div>
        </div>
        <div class="col-md-6 text-end">
          <button class="btn btn-outline-success" onclick="showJoinLeagueModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            Unirse a Liga por Código
          </button>
        </div>
      </div>
      
      <div class="table-responsive">
        <table class="table table-hover table-striped" id="leaguesTable">
          <thead class="table-dark">
            <tr>
              <th>Nombre</th>
              <th>Código</th>
              <th>Creador</th>
              <th>Equipos</th>
              <th>Máx. Equipos</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="leaguesTableBody">
            <tr>
              <td colspan="8" class="text-center text-muted py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando ligas...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- MODAL CREAR LIGA -->
  <div id="createLeagueModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 1000;">
    <div class="modal-dialog" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; max-width: 500px; width: 90%;">
      <div class="modal-content">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #dee2e6;">
          <h5 class="modal-title">🏆 Crear Nueva Liga</h5>
          <button type="button" onclick="closeCreateLeagueModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <form id="createLeagueForm">
            <div class="mb-3">
              <label class="form-label">Nombre de la Liga *</label>
              <input type="text" class="form-control" id="leagueName" required maxlength="50">
              <small class="text-muted">Máximo 50 caracteres</small>
            </div>
            <div class="mb-3">
              <label class="form-label">Número máximo de equipos *</label>
              <input type="number" class="form-control" id="maxTeams" value="10" min="2" max="50" required>
              <small class="text-muted">Entre 2 y 50 equipos</small>
            </div>
            <div class="mb-3 form-check">
              <input type="checkbox" class="form-check-input" id="isPrivate">
              <label class="form-check-label">Liga Privada</label>
              <small class="text-muted d-block">(Próximamente: las ligas privadas requerirán invitación)</small>
            </div>
            <button type="submit" class="btn btn-primary w-100">Crear Liga</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL UNIRSE A LIGA -->
  <div id="joinLeagueModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 1000;">
    <div class="modal-dialog" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; max-width: 450px; width: 90%;">
      <div class="modal-content">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #dee2e6;">
          <h5 class="modal-title">🔗 Unirse a Liga por Código</h5>
          <button type="button" onclick="closeJoinLeagueModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <form id="joinLeagueForm">
            <div class="mb-3">
              <label class="form-label">Código de la Liga *</label>
              <input type="text" class="form-control" id="joinCode" placeholder="Ej: 123456" maxlength="6" required>
              <small class="text-muted">Ingresa el código de 6 dígitos de la liga</small>
            </div>
            <button type="submit" class="btn btn-success w-100">Unirse a la Liga</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL DETALLES DE LIGA -->
  <div id="leagueDetailsModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 1000;">
    <div class="modal-dialog modal-lg" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; max-width: 800px; width: 90%; max-height: 85vh; overflow-y: auto;">
      <div class="modal-content">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #dee2e6;">
          <h5 class="modal-title" id="leagueDetailsTitle">Detalles de la Liga</h5>
          <button type="button" onclick="closeLeagueDetailsModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body" id="leagueDetailsBody" style="padding: 1.5rem;">
          <div class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`,
  

ranking: `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">🏆 Clasificación General de Equipos</h3>
    </div>
    <div class="card-body">
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text">🔍</span>
            <input type="text" id="rankingSearchInput" class="form-control" placeholder="Buscar por nombre de equipo o director...">
          </div>
        </div>
        <div class="col-md-6 text-end">
          <span class="text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Haz click en cualquier equipo para ver más detalles
          </span>
        </div>
      </div>
      
      <div class="table-responsive">
        <table class="table table-hover table-striped" id="rankingTable">
          <thead class="table-dark">
            <tr>
              <th style="width: 60px;">#</th>
              <th>Equipo</th>
              <th>Director</th>
              <th style="width: 120px;">Puntos Totales</th>
              <th style="width: 100px;">Corredores</th>
            </tr>
          </thead>
          <tbody id="rankingTableBody">
            <tr>
              <td colspan="5" class="text-center text-muted py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando clasificación...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- MODAL DETALLES DEL EQUIPO -->
  <div id="teamDetailsModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 1000;">
    <div class="modal-dialog modal-lg" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; max-width: 900px; width: 95%; max-height: 85vh; overflow-y: auto;">
      <div class="modal-content">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #dee2e6; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h5 class="modal-title" id="teamDetailsTitle">Detalles del Equipo</h5>
          <button type="button" onclick="closeTeamDetailsModal()" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: white;">&times;</button>
        </div>
        <div class="modal-body" id="teamDetailsBody" style="padding: 1.5rem;">
          <div class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando datos del equipo...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
`,

results: `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">📊 Resultados de ${raceNameGlobal}</h3>
    </div>
    <div class="card-body">
      <div class="row mb-4">
        <div class="col-md-6">
          <label for="stageFilter" class="form-label fw-bold">Selecciona una etapa o clasificación:</label>
          <select id="stageFilter" class="form-select">
            <option value="">-- Selecciona una opción --</option>
            <option value="general">🏆 Clasificación General</option>
            <option disabled>──────────</option>
            ${Array.from({ length: 21 }, (_, i) => `<option value="stage-${i + 1}">📍 Etapa ${i + 1}</option>`).join('')}
          </select>
        </div>
<div class="col-md-6 text-end">
  ${currentUser?.isAdmin ? `
  <button class="btn btn-outline-primary" onclick="refreshResults()" id="refreshResultsBtn">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
      <path d="M23 4v6h-6"></path>
      <path d="M1 20v-6h6"></path>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
    </svg>
    Actualizar desde web
  </button>
  ` : ''}
</div>
      </div>
      
      <div id="resultsContent">
        <div class="alert alert-info text-center">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          <strong>Cargando última etapa...</strong>
        </div>
      </div>
    </div>
  </div>
`,
  
// En app.js, reemplaza la vista 'admin' por esta versión actualizada:

admin: `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">⚙️ Panel de Administración</h3>
    </div>
    <div class="card-body">
      <div class="row">
        <div class="col-md-6">
          <div class="mb-4">
            <h4>📊 Resultados de ${raceNameGlobal}</h4>
            <div class="mb-3">
              <label class="form-label">Número de Etapa</label>
              <div class="input-group">
                <input type="number" id="stageToUpdate" class="form-control" placeholder="1-21" min="1" max="21">
                <button id="updateSingleStageBtn" class="btn btn-info">Actualizar Etapa</button>
              </div>
            </div>
            <div class="mb-3">
              <div class="input-group">
                <input type="number" id="stageToDelete" class="form-control" placeholder="Número de etapa (1-21)" min="1" max="21">
                <button id="deleteStageDataBtn" class="btn btn-danger">🗑️ Eliminar Datos de Etapa</button>
              </div>
              <small class="text-muted d-block mt-1">
                ⚠️ Al eliminar una etapa, se restarán todos los puntos de esa etapa de los corredores y equipos.
              </small>
            </div>
            <button id="updateAllStagesBtn" class="btn btn-primary w-100 mt-2">
              📥 Actualizar TODAS las etapas
            </button>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="mb-4">
            <h4>💰 Gestión de Precios</h4>
            <button id="recalculatePricesBtn" class="btn btn-info w-100" style="background-color: #17a2b8; border: none;">
              🏷️ Recalcular Precios de Todos los Corredores
            </button>
            <button id="recalculatePointsBtn" class="btn btn-warning w-100 mt-2" style="background-color: #ffc107; border: none;">
              🔄 Recalcular Puntos de Todos los Corredores/Equipos
            </button>
            <div class="alert alert-secondary mt-3 small">
              <strong>📊 Fórmula de precios:</strong><br>
              • Basado en PCS Rank<br>
              <strong>Rango:</strong> 4M€ - 35M€
            </div>
          </div>
        </div>
      </div>
      
      <div class="row mt-3">
        <div class="col-md-6">
          <div class="mb-4">
            <h4>📋 Gestión de Corredores</h4>
            <button id="importPcsBtnAdmin" class="btn btn-secondary mb-2 w-100" style="background-color: #006630;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon me-2"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="2" x2="12" y2="16"/></svg>
              Importar corredores desde ProCyclingStats
            </button>
            <button id="updateStatusesBtn" class="btn btn-warning w-100 mt-2">
              🔄 Actualizar datos de ciclistas
            </button>
            <button id="deleteAllBtnAdmin" class="btn btn-danger w-100 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon me-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Borrar todos los corredores
            </button>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="mb-4">
            <h4>💾 Copias de Seguridad</h4>
            <div class="row">
              <div class="col-6">
                <button id="createBackupBtn" class="btn btn-warning w-100 mb-2">
                  💾 Descargar Copia de Seguridad
                </button>
              </div>
              <div class="col-6">
                <button id="restoreBackupBtn" class="btn btn-info w-100 mb-2">
                  📤 Restaurar Copia de Seguridad
                </button>
              </div>
            </div>
            <input type="file" id="backupFileInput" accept=".json" style="display: none;">
          </div>
        </div>
      </div>
      
      <div class="row mt-3">
        <div class="col-12">
          <div class="mb-4">
            <h4>⚙️ Configuración del Sistema</h4>
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Nombre de la Carrera</label>
                  <input type="text" id="raceName" class="form-control">
                </div>
                <div class="mb-3">
                  <label class="form-label">Número máximo de corredores por equipo</label>
                  <input type="number" id="maxRiders" class="form-control" min="1" max="20">
                </div>
                <div class="mb-3">
                  <label class="form-label">Presupuesto por equipo (millones €)</label>
                  <input type="number" id="budget" class="form-control" min="10" step="5">
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">Fecha máxima para hacer/modificar equipo</label>
                  <input type="datetime-local" id="maxTeamCreationDate" class="form-control">
                  <small class="text-muted">Deja en blanco si no hay límite.</small>
                </div>
              </div>
            </div>
            <hr>
            <h5 class="mb-3">URLs de ProCyclingStats</h5>
            <div class="row">
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">URL importar corredores</label>
                  <input type="text" id="pcsImportUrl" class="form-control">
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">URL actualizar corredores</label>
                  <input type="text" id="pcsUpdateRidersUrl" class="form-control">
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label">URL actualizar etapas</label>
                  <input type="text" id="pcsUpdateStagesUrl" class="form-control">
                </div>
              </div>
            </div>
            <button id="saveConfigBtn" class="btn btn-success w-100">
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
`,
};


function fixPhotoUrl(url) {
  if (!url) return null;
  
  let cleanUrl = url.trim();
  
  // Si ya tiene https:// duplicado, corregirlo
  if (cleanUrl.includes('https://www.https://')) {
    cleanUrl = cleanUrl.replace('https://www.https://', 'https://');
  }
  
  // Corregir el caso "procyclingstats.comimages" (falta la barra)
  if (cleanUrl.includes('procyclingstats.comimages')) {
    cleanUrl = cleanUrl.replace('procyclingstats.comimages', 'https://www.procyclingstats.com/images');
  }
  
  // Corregir doble barra
  if (cleanUrl.includes('procyclingstats.com//')) {
    cleanUrl = cleanUrl.replace('procyclingstats.com//', 'https://www.procyclingstats.com/');
  }
  
  // Si la URL tiene https:// al principio pero está mal formada
  if (cleanUrl.startsWith('https://') && cleanUrl.includes('https://', 8)) {
    cleanUrl = 'https://' + cleanUrl.split('https://').pop();
  }
  
  // Si la URL es válida, devolverla
  if (cleanUrl.startsWith('https://www.procyclingstats.com')) {
    return cleanUrl;
  }
  
  if (cleanUrl.startsWith('http')) {
    return cleanUrl;
  }
  
  // Si empieza con //, añadir https:
  if (cleanUrl.startsWith('//')) {
    return 'https:' + cleanUrl;
  }
  
  // Si empieza con /, añadir dominio
  if (cleanUrl.startsWith('/')) {
    return 'https://www.procyclingstats.com' + cleanUrl;
  }
  
  // Si empieza con images/ (sin barra inicial)
  if (cleanUrl.startsWith('images/')) {
    return 'https://www.procyclingstats.com/' + cleanUrl;
  }
  
  // Si no empieza con nada reconocible, asumir que es una ruta relativa
  if (cleanUrl.includes('riders/')) {
    // Asegurar que no haya http duplicado
    if (cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    return 'https://www.procyclingstats.com/' + cleanUrl;
  }
  
  return cleanUrl;
}

function loadPage(page) {
  if (!checkAuth()) return;
  
  content.innerHTML = views[page] || "<p>Página no encontrada</p>";
  
  updateRaceNameInCurrentPage();

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("active");
    if (link.dataset.page === page) {
      link.classList.add("active");
    }
  });

  // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
  requestAnimationFrame(() => {
    if (page === "inicio") {
      // Pequeño retraso extra para asegurar que los elementos están en el DOM
      setTimeout(() => initHomePage(), 50);
    } else if (page === "riders") {
      setTimeout(() => initRidersPage(), 50);
    } else if (page === "team") {
      setTimeout(() => initTeamPage(), 50);
    } else if (page === "admin") {
      setTimeout(() => initAdminPage(), 50);
    } else if (page === "leagues") {
      setTimeout(() => initLeaguesPage(), 50);
    } else if (page === "results") {
      setTimeout(() => {
        initResultsPage();
      }, 50);
    } else if (page === "ranking") {
      setTimeout(() => {
        addRankingStyles();
        initRankingPage();
      }, 50);
    }
  });
}

// EVENTOS MENU
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    loadPage(link.dataset.page);
  });
});

// Manejar cambios en el filtro de etapas
document.addEventListener("change", function(e) {
  if (e.target.id === "stageFilter") {
    handleStageFilter(e.target.value);
  }
});

function handleStageFilter(stage) {
  if (!stage) {
    const resultsContent = document.getElementById("resultsContent");
    if (resultsContent) {
      resultsContent.innerHTML = `
        <div class="alert alert-info text-center">
          <strong>📋 Selecciona una etapa o la clasificación general</strong>
          <p class="mb-0 mt-2 small">Los datos se obtienen directamente de ProCyclingStats</p>
        </div>
      `;
    }
    return;
  }

  if (stage === 'general') {
    loadStageResults('general');
  } else if (stage.startsWith('stage-')) {
    const stageNum = stage.split('-')[1];
    loadStageResults(stageNum);
  }
}


// Cargar datos desde API
async function loadRiders() {
  try {
    const response = await fetch(`${API_BASE_URL}/riders`);
    if (!response.ok) throw new Error("Error al cargar corredores");
    allRidersData = await response.json();
    ridersData = [...allRidersData];
    console.log(`📋 Cargados ${allRidersData.length} corredores desde la base de datos`);
    return allRidersData;
  } catch (err) {
    console.error("Error cargando corredores:", err);
    allRidersData = [];
    ridersData = [];
    return [];
  }
}

// Cargar datos del equipo
async function loadTeam() {
  if (!currentUser) return null;
  
  try {
    const response = await fetch(`${API_BASE_URL}/team/${currentUser.id}`);
    if (!response.ok) throw new Error("Error al cargar equipo");
    const team = await response.json();
    return team;
  } catch (err) {
    console.error("Error cargando equipo:", err);
    return null;
  }
}

// Función para obtener el badge de estado
function getStatusBadge(status) {
  switch(status) {
    case 'active': return '<span class="badge bg-success">✅ Activo</span>';
    case 'retired': return '<span class="badge bg-danger">❌ Retirado</span>';
    case 'suspended': return '<span class="badge bg-warning">⚠️ Suspendido</span>';
    default: return '<span class="badge bg-secondary">❓ Desconocido</span>';
  }
}


// app.js - Modificar renderTableWithTeamStatus (sin columna de puntos)

async function renderTableWithTeamStatus() {
  const team = await loadTeam();
  const teamRiderIds = team?.riders?.map(r => r.riderId.toString()) || [];
  
  if (retiredRidersMap.size === 0) {
    await loadRetiredRiders();
  }
  
  const tbody = document.getElementById("ridersTableBody");
  const countSpan = document.getElementById("ridersCount");
  
  if (!tbody) return;

  if (!ridersData || ridersData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No hay corredores. El administrador debe importar los datos del Giro 2026</td></tr>`;
    if (countSpan) countSpan.innerHTML = "Mostrando 0 corredores";
    return;
  }

  if (countSpan) {
    countSpan.innerHTML = `Mostrando ${ridersData.length} corredor${ridersData.length !== 1 ? 'es' : ''}`;
  }

  tbody.innerHTML = ridersData.map((rider) => {
    const isInTeam = teamRiderIds.includes(rider._id.toString());
    const btnClass = isInTeam ? "btn-danger" : "btn-outline-success";
    const btnText = isInTeam ? "Quitar" : "Añadir";
    
    const isRetired = isRiderRetired(rider._id.toString());
    const retiredMark = isRetired ? ' <span style="color: #dc3545; font-weight: bold;">(X)</span>' : '';
    const retiredClass = isRetired ? 'retired-name' : '';
    
    return `
      <tr>
        <td style="vertical-align: middle;">${escapeHtml(rider.team || 'Sin equipo')}</td>
        <td style="vertical-align: middle;">
          <a href="javascript:void(0)" onclick="loadRiderData('${rider._id}', '${rider.name.replace(/'/g, "\\'")}')" style="cursor: pointer; color: #0d6efd; text-decoration: none; font-weight: 500;" class="${retiredClass}">
            ${escapeHtml(rider.name) || '-'}
          </a>${retiredMark}
        </td>
        <td style="vertical-align: middle;"><span class="fw-bold text-success">€${rider.price || 0}M</span></td>
        <td style="vertical-align: middle;">
          <button class="btn btn-sm ${btnClass} team-action-btn" data-rider-id="${rider._id}" data-rider-name="${rider.name}" data-in-team="${isInTeam}" ${isRetired ? 'disabled' : ''}>
            ${btnText}
          </button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll('.team-action-btn').forEach(btn => {
    btn.removeEventListener('click', handleTeamAction);
    btn.addEventListener('click', handleTeamAction);
  });
}



// Manejar acción del equipo (añadir/quitar)
async function handleTeamAction(e) {
  const btn = e.currentTarget;
  const riderId = btn.dataset.riderId;
  const riderName = btn.dataset.riderName;
  const inTeam = btn.dataset.inTeam === 'true';
  
  if (inTeam) {
    await removeFromTeam(riderId, riderName);
  } else {
    const rider = allRidersData.find(r => r._id === riderId);
    if (rider) {
      await addToTeam(rider);
    }
  }
}

// Función para añadir corredor al equipo
async function addToTeam(rider) {
  if (!currentUser) {
    alert("Debes iniciar sesión primero");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/team/add-rider/${currentUser.id}/${rider._id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(`❌ Error: ${error.error}`);
      return;
    }
    
    const updatedTeam = await response.json();
    
    // Obtener la configuración para saber el presupuesto total
    const configRes = await fetch(`${API_BASE_URL}/admin/config`);
    const config = await configRes.json();
    const totalBudget = config.budget || 100;
    
    const remainingBudget = totalBudget - updatedTeam.totalPrice;
    
    alert(`✅ ${rider.name} añadido a tu equipo!\n💰 Presupuesto restante: €${remainingBudget}M`);
    await renderTableWithTeamStatus();
  } catch (err) {
    console.error("Error al añadir al equipo:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Función para remover corredor del equipo
async function removeFromTeam(riderId, riderName) {
  if (!confirm(`¿Estás seguro de que quieres quitar a ${riderName} de tu equipo?`)) {
    return;
  }
  
  if (!currentUser) {
    alert("Debes iniciar sesión primero");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/team/remove-rider/${currentUser.id}/${riderId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(`❌ Error: ${error.error}`);
      return;
    }
    
    alert(`✅ ${riderName} removido de tu equipo!`);
    await renderTableWithTeamStatus();
  } catch (err) {
    console.error("Error al remover del equipo:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Actualizar puntos de corredor (solo admin)
async function updateRiderPoints(riderId, points) {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para editar puntos");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/update-rider-points/${riderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, points: parseInt(points) })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(`❌ Error: ${error.error}`);
      return;
    }
    
    alert("✅ Puntos actualizados correctamente");
    await renderTableWithTeamStatus();
  } catch (err) {
    console.error("Error al actualizar puntos:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Actualizar precio de corredor (solo admin)
async function updateRiderPrice(riderId, price) {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para editar precios");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/update-rider-price/${riderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, price: parseInt(price) })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(`❌ Error: ${error.error}`);
      return;
    }
    
    const data = await response.json();
    alert("✅ Precio actualizado correctamente");
    
    // Actualizar el precio en los datos locales
    const rider = allRidersData.find(r => r._id === riderId);
    if (rider) {
      rider.price = parseInt(price);
    }
    
    // Recargar la tabla
    await renderTableWithTeamStatus();
  } catch (err) {
    console.error("Error al actualizar precio:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Aplicar filtros
// Aplicar filtros y ordenación
function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  const teamFilter = document.getElementById("teamFilter");
  const sortFilter = document.getElementById("sortFilter");
  
  if (!searchInput) return;
  
  let filtered = [...allRidersData];
  
  const search = searchInput.value.toLowerCase();
  const team = teamFilter?.value || "";
  const sortBy = sortFilter?.value || "price";
  
  // Filtrar por búsqueda
  if (search) {
    filtered = filtered.filter(r => 
      r.name?.toLowerCase().includes(search) ||
      r.team?.toLowerCase().includes(search)
    );
  }
  
  // Filtrar por equipo
  if (team) {
    filtered = filtered.filter(r => r.team === team);
  }
  
  // ORDENAR según selección
  switch(sortBy) {
    case "price":
      // Precio más caro primero
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case "price_asc":
      // Precio más barato primero
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case "name":
      // Nombre A-Z
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
    case "name_desc":
      // Nombre Z-A
      filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      break;
    case "team":
      // Equipo A-Z
      filtered.sort((a, b) => (a.team || "").localeCompare(b.team || ""));
      break;
    default:
      // Por defecto: precio más caro primero
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  }
  
  ridersData = filtered;
}

// Inicializar página de corredores
async function initRidersPage() {
  const searchInput = document.getElementById("searchInput");
  const teamFilter = document.getElementById("teamFilter");
  const sortFilter = document.getElementById("sortFilter");
  
  await loadRiders();
  
  if (allRidersData.length > 0) {
    const teams = [...new Set(allRidersData.map(r => r.team).filter(t => t && t !== "Equipo no especificado"))];
    teams.sort();
    
    if (teamFilter) {
      teamFilter.innerHTML = '<option value="">📌 Todos los equipos</option>';
      teamFilter.innerHTML += teams.map(t => `<option value="${t.replace(/"/g, '&quot;')}">${t}</option>`).join("");
    }
  }
  
  // Event listeners
  if (searchInput) searchInput.addEventListener("input", async () => {
    applyFilters();
    await renderTableWithTeamStatus();
  });
  
  if (teamFilter) teamFilter.addEventListener("change", async () => {
    applyFilters();
    await renderTableWithTeamStatus();
  });
  
  if (sortFilter) sortFilter.addEventListener("change", async () => {
    applyFilters();
    await renderTableWithTeamStatus();
  });
  
  // Aplicar ordenación inicial (precio por defecto)
  applyFilters();
  await renderTableWithTeamStatus();
  console.log(`✅ Página de corredores inicializada con ${allRidersData.length} corredores`);
}

async function initAdminPage() {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para acceder al panel de administración");
    loadPage("riders");
    return;
  }
  
  // Cargar configuración actual
  try {
    const response = await fetch(`${API_BASE_URL}/admin/config`);
    const config = await response.json();
    const raceNameInput = document.getElementById("raceName");
    const maxRidersInput = document.getElementById("maxRiders");
    const budgetInput = document.getElementById("budget");
    const pcsImportUrlInput = document.getElementById("pcsImportUrl");
    const pcsUpdateRidersUrlInput = document.getElementById("pcsUpdateRidersUrl");
    const pcsUpdateStagesUrlInput = document.getElementById("pcsUpdateStagesUrl");
    const maxTeamCreationDateInput = document.getElementById("maxTeamCreationDate");
    
    if (raceNameInput) raceNameInput.value = config.raceName || "";
    if (maxRidersInput) maxRidersInput.value = config.maxRiders || 8;
    if (budgetInput) budgetInput.value = config.budget || 100;
    if (pcsImportUrlInput) pcsImportUrlInput.value = config.pcsImportUrl || "";
    if (pcsUpdateRidersUrlInput) pcsUpdateRidersUrlInput.value = config.pcsUpdateRidersUrl || "";
    if (pcsUpdateStagesUrlInput) pcsUpdateStagesUrlInput.value = config.pcsUpdateStagesUrl || "";
    
    if (maxTeamCreationDateInput && config.maxTeamCreationDate) {
      const date = new Date(config.maxTeamCreationDate);
      const dateString = date.toISOString().slice(0, 16);
      maxTeamCreationDateInput.value = dateString;
    }
  } catch (err) {
    console.error("Error cargando configuración:", err);
  }
  
  // Usar setTimeout para asegurar que el DOM esté listo
  setTimeout(() => {
    // Asignar eventos a los botones existentes
    const importPcsBtn = document.getElementById("importPcsBtnAdmin");
    const updateStatusesBtn = document.getElementById("updateStatusesBtn");
    const deleteAllBtn = document.getElementById("deleteAllBtnAdmin");
    const saveConfigBtn = document.getElementById("saveConfigBtn");
    const createBackupBtn = document.getElementById("createBackupBtn");
    const restoreBackupBtn = document.getElementById("restoreBackupBtn");
    const recalculatePricesBtn = document.getElementById("recalculatePricesBtn");
    const updateSingleStageBtn = document.getElementById("updateSingleStageBtn");
    const updateAllStagesBtn = document.getElementById("updateAllStagesBtn");
    

// ============ BOTÓN RECALCULAR PUNTOS (SIN CONFIRMACIÓN DE RECARGA) ============
const recalculatePointsBtn = document.getElementById("recalculatePointsBtn");
if (recalculatePointsBtn) {
  console.log("✅ Botón Recalcular Puntos encontrado");
  
  // Limpiar event listeners anteriores
  const newRecalcPointsBtn = recalculatePointsBtn.cloneNode(true);
  recalculatePointsBtn.parentNode.replaceChild(newRecalcPointsBtn, recalculatePointsBtn);
  
  newRecalcPointsBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    console.log("🖱️ Click en Recalcular Puntos");
    
    if (!confirm("⚠️ ¿Recalcular puntos de TODOS los corredores y equipos?\n\nEsto reiniciará todos los puntos y los volverá a calcular basándose en los resultados guardados en la base de datos.\n\n¿Continuar?")) {
      return;
    }
    
    const btn = this;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Recalculando puntos...';
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/recalculate-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        let message = `✅ Puntos recalculados!\n\n`;
        message += `💰 ${(data.totalPointsAssigned || 0).toLocaleString()} puntos asignados\n`;
        message += `📊 ${data.teamsUpdated || 0} equipos actualizados\n`;
        message += `🏆 ${data.leaguesUpdated || 0} ligas sincronizadas`;
        
        alert(message);
        
        // Actualizar vistas automáticamente sin recargar
        if (document.querySelector('[data-page="riders"].active')) {
          await loadRiders();
          await renderTableWithTeamStatus();
        }
        if (document.querySelector('[data-page="ranking"].active')) {
          await loadRanking();
        }
        if (document.querySelector('[data-page="team"].active')) {
          await initTeamPage();
        }
        
        // Mostrar notificación temporal
        const toast = document.createElement('div');
        toast.innerHTML = `
          <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #28a745; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeOut 3s ease forwards;">
            ✅ Puntos recalculados! (${(data.totalPointsAssigned || 0).toLocaleString()} pts)
          </div>
          <style>
            @keyframes fadeOut {
              0% { opacity: 1; transform: translateY(0); }
              70% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-20px); display: none; }
            }
          </style>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error recalculando puntos:", err);
      alert("❌ Error de conexión: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}
    
    // ============ BOTÓN ELIMINAR DATOS DE ETAPA ============
    const deleteStageDataBtn = document.getElementById("deleteStageDataBtn");
    if (deleteStageDataBtn) {
      console.log("✅ Botón Eliminar Datos de Etapa encontrado");
      const newDeleteStageBtn = deleteStageDataBtn.cloneNode(true);
      deleteStageDataBtn.parentNode.replaceChild(newDeleteStageBtn, deleteStageDataBtn);
      
      newDeleteStageBtn.addEventListener("click", async function(e) {
        e.preventDefault();
        
        const stageInput = document.getElementById("stageToDelete");
        const stageNumber = parseInt(stageInput?.value);
        
        if (!stageNumber || stageNumber < 1 || stageNumber > 21) {
          alert("Por favor, introduce un número de etapa válido (1-21)");
          return;
        }
        
        if (!confirm(`⚠️ ¿Eliminar TODOS los datos de la etapa ${stageNumber}?\n\nEsto:\n• Eliminará los resultados guardados de la etapa\n• Recalculará todos los puntos desde cero\n\n¿Continuar?`)) {
          return;
        }
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Eliminando etapa y recalculando puntos...';
        
        try {
          const response = await fetch(`${API_BASE_URL}/admin/delete-stage-data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: currentUser.id,
              stageNumber: stageNumber
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert(`✅ Etapa ${stageNumber} eliminada!\n\n📊 Puntos recalculados: ${data.pointsRecalculated.toLocaleString()} pts\n📋 Etapas procesadas: ${data.stagesProcessed}\n🔄 Ligas sincronizadas: ${data.leaguesUpdated || 0}`);
            
            if (stageInput) stageInput.value = "";
            
            // Recargar vistas
            if (document.querySelector('[data-page="riders"].active')) {
              await loadRiders();
              await renderTableWithTeamStatus();
            }
            if (document.querySelector('[data-page="ranking"].active')) {
              await loadRanking();
            }
            if (document.querySelector('[data-page="team"].active')) {
              await initTeamPage();
            }
            
            // Mostrar notificación temporal
            const toast = document.createElement('div');
            toast.innerHTML = `
              <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #dc3545; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeOut 3s ease forwards;">
                🗑️ Etapa ${stageNumber} eliminada! (${data.pointsRecalculated.toLocaleString()} pts recalculados)
              </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
            
          } else {
            alert("❌ Error: " + (data.error || "Error desconocido"));
          }
        } catch (err) {
          console.error("Error eliminando etapa:", err);
          alert("❌ Error de conexión: " + err.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    } else {
      console.error("❌ No se encontró el botón 'deleteStageDataBtn'");
    }
    
    // ============ BOTÓN ACTUALIZAR ETAPA INDIVIDUAL ============
    if (updateSingleStageBtn) {
      console.log("✅ Botón Actualizar Etapa encontrado");
      const newUpdateStageBtn = updateSingleStageBtn.cloneNode(true);
      updateSingleStageBtn.parentNode.replaceChild(newUpdateStageBtn, updateSingleStageBtn);
      
      newUpdateStageBtn.addEventListener("click", async function(e) {
        e.preventDefault();
        
        const stageInput = document.getElementById("stageToUpdate");
        const stageNumber = parseInt(stageInput?.value);
        
        if (!stageNumber || stageNumber < 1 || stageNumber > 21) {
          alert("Por favor, introduce un número de etapa válido (1-21)");
          return;
        }
        
        if (!confirm(`¿Actualizar resultados de la etapa ${stageNumber}?\n\nSe obtendrán los datos desde ProCyclingStats y se recalcúlan todos los puntos.`)) {
          return;
        }
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando etapa y recalculando puntos...';
        
        try {
          const response = await fetch(`${API_BASE_URL}/admin/update-stage-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: currentUser.id,
              stageNumber: stageNumber 
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert(`✅ Etapa ${stageNumber} actualizada!\n\n📊 Puntos recalculados: ${data.pointsRecalculated.toLocaleString()} pts\n📋 Etapas procesadas: ${data.stagesProcessed}\n🔄 Ligas sincronizadas: ${data.leaguesUpdated || 0}`);
            
            stageInput.value = "";
            
            // Recargar vistas
            if (document.querySelector('[data-page="riders"].active')) {
              await loadRiders();
              await renderTableWithTeamStatus();
            }
            if (document.querySelector('[data-page="ranking"].active')) {
              await loadRanking();
            }
            if (document.querySelector('[data-page="team"].active')) {
              await initTeamPage();
            }
            if (document.querySelector('[data-page="results"].active')) {
              const stageFilter = document.getElementById("stageFilter");
              if (stageFilter && stageFilter.value === `stage-${stageNumber}`) {
                loadStageResults(stageNumber);
              }
            }
            
            const toast = document.createElement('div');
            toast.innerHTML = `
              <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #17a2b8; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeOut 3s ease forwards;">
                📊 Etapa ${stageNumber} actualizada! (${data.pointsRecalculated.toLocaleString()} pts)
              </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
            
          } else {
            alert("❌ Error: " + (data.error || "Error desconocido"));
          }
        } catch (err) {
          console.error("Error:", err);
          alert("❌ Error de conexión: " + err.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }
    
    // ============ BOTÓN ACTUALIZAR TODAS LAS ETAPAS ============
    if (updateAllStagesBtn) {
      console.log("✅ Botón Actualizar Todas las Etapas encontrado");
      const newUpdateAllStagesBtn = updateAllStagesBtn.cloneNode(true);
      updateAllStagesBtn.parentNode.replaceChild(newUpdateAllStagesBtn, updateAllStagesBtn);
      
      newUpdateAllStagesBtn.addEventListener("click", async function(e) {
        e.preventDefault();
        
        if (!confirm("⚠️ ¿Actualizar TODAS las etapas?\n\nEsto puede tomar varios minutos. Se obtendrán los datos desde ProCyclingStats y se recalcúlan todos los puntos.")) {
          return;
        }
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando todas las etapas y recalculando puntos...';
        
        try {
          const response = await fetch(`${API_BASE_URL}/admin/update-all-stages-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id })
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert(`✅ ${data.message}\n\n📊 Puntos recalculados: ${data.pointsRecalculated.toLocaleString()} pts\n🔄 Ligas sincronizadas: ${data.leaguesUpdated || 0}`);
            
            // Recargar vistas
            if (document.querySelector('[data-page="riders"].active')) {
              await loadRiders();
              await renderTableWithTeamStatus();
            }
            if (document.querySelector('[data-page="ranking"].active')) {
              await loadRanking();
            }
            if (document.querySelector('[data-page="team"].active')) {
              await initTeamPage();
            }
            if (document.querySelector('[data-page="results"].active')) {
              const stageFilter = document.getElementById("stageFilter");
              if (stageFilter && stageFilter.value) {
                const selected = stageFilter.value;
                if (selected === 'general') {
                  loadStageResults('general');
                } else if (selected.startsWith('stage-')) {
                  const stageNum = selected.split('-')[1];
                  loadStageResults(stageNum);
                }
              }
            }
            
            const toast = document.createElement('div');
            toast.innerHTML = `
              <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #28a745; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeOut 4s ease forwards;">
                📊 Todas las etapas actualizadas! (${data.pointsRecalculated.toLocaleString()} pts)
              </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
            
          } else {
            alert("❌ Error: " + (data.error || "Error desconocido"));
          }
        } catch (err) {
          console.error("Error:", err);
          alert("❌ Error de conexión: " + err.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }
    
    // ============ BOTÓN RECALCULAR PRECIOS ============
    if (recalculatePricesBtn) {
      console.log("✅ Botón Recalcular Precios encontrado");
      const newRecalcPricesBtn = recalculatePricesBtn.cloneNode(true);
      recalculatePricesBtn.parentNode.replaceChild(newRecalcPricesBtn, recalculatePricesBtn);
      
      newRecalcPricesBtn.addEventListener("click", async function(e) {
        e.preventDefault();
        console.log("🖱️ Click en Recalcular Precios");
        
        if (!confirm("⚠️ ¿Recalcular precios de TODOS los corredores?\n\nEsto actualizará los precios según el PCS Rank.\n\nRango total: 4M€ - 35M€")) {
          return;
        }
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Recalculando precios...';
        
        try {
          const response = await fetch(`${API_BASE_URL}/admin/recalculate-prices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id })
          });
          
          const data = await response.json();
          
          if (data.success) {
            let message = `✅ Precios recalculados!\n\n`;
            message += `📊 ${data.updated} corredores actualizados\n`;
            message += `💰 Precio promedio: ${data.stats.averagePrice}M€\n`;
            message += `📉 Mínimo: ${data.stats.minPrice}M€\n`;
            message += `📈 Máximo: ${data.stats.maxPrice}M€\n`;
            
            alert(message);
            
            if (document.querySelector('[data-page="riders"].active')) {
              await loadRiders();
              await renderTableWithTeamStatus();
            }
            
            const toast = document.createElement('div');
            toast.innerHTML = `
              <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #17a2b8; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeOut 3s ease forwards;">
                💰 Precios recalculados! (Promedio: ${data.stats.averagePrice}M€)
              </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
          } else {
            alert("❌ Error: " + (data.error || "Error desconocido"));
          }
        } catch (err) {
          console.error("Error recalculando precios:", err);
          alert("❌ Error de conexión: " + err.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }
    
    // ============ OTROS BOTONES ============
    if (importPcsBtn) {
      const newImportBtn = importPcsBtn.cloneNode(true);
      importPcsBtn.parentNode.replaceChild(newImportBtn, importPcsBtn);
      newImportBtn.addEventListener("click", importFromProCyclingStats);
    }
    
    if (updateStatusesBtn) {
      const newUpdateBtn = updateStatusesBtn.cloneNode(true);
      updateStatusesBtn.parentNode.replaceChild(newUpdateBtn, updateStatusesBtn);
      newUpdateBtn.addEventListener("click", updateRiderStatuses);
    }
    
    if (deleteAllBtn) {
      const newDeleteAllBtn = deleteAllBtn.cloneNode(true);
      deleteAllBtn.parentNode.replaceChild(newDeleteAllBtn, deleteAllBtn);
      newDeleteAllBtn.addEventListener("click", deleteAllRiders);
    }
    
    if (saveConfigBtn) {
      const newSaveConfigBtn = saveConfigBtn.cloneNode(true);
      saveConfigBtn.parentNode.replaceChild(newSaveConfigBtn, saveConfigBtn);
      newSaveConfigBtn.addEventListener("click", saveSystemConfig);
    }
    
    if (createBackupBtn) {
      const newCreateBackupBtn = createBackupBtn.cloneNode(true);
      createBackupBtn.parentNode.replaceChild(newCreateBackupBtn, createBackupBtn);
      newCreateBackupBtn.addEventListener("click", createBackup);
    }
    
    if (restoreBackupBtn) {
      const newRestoreBackupBtn = restoreBackupBtn.cloneNode(true);
      restoreBackupBtn.parentNode.replaceChild(newRestoreBackupBtn, restoreBackupBtn);
      newRestoreBackupBtn.addEventListener("click", restoreBackup);
    }
    
    console.log("✅ Todos los botones del panel admin inicializados correctamente");
  }, 200);
}


const recalculatePricesBtn = document.getElementById("recalculatePricesBtn");
if (recalculatePricesBtn) {
  recalculatePricesBtn.addEventListener("click", async () => {
    if (!confirm("⚠️ ¿Recalcular precios de TODOS los corredores?\n\nEsto actualizará los precios según:\n• Ranking UCI (45%)\n• Victorias (30%)\n• Popularidad (15%)\n• Especialidad (10%)\n\nRango: 4M€ - 35M€")) {
      return;
    }
    
    const btn = recalculatePricesBtn;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Recalculando precios...';
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/recalculate-prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        let message = `✅ Precios recalculados!\n\n`;
        message += `📊 ${data.updated} corredores actualizados\n`;
        message += `💰 Precio promedio: ${data.stats.averagePrice}M€\n`;
        message += `📉 Mínimo: ${data.stats.minPrice}M€\n`;
        message += `📈 Máximo: ${data.stats.maxPrice}M€\n`;
        
        if (data.errors > 0) {
          message += `\n⚠️ ${data.errors} errores`;
        }
        
        alert(message);
        
        // Recargar la tabla si estamos en la página de corredores
        if (document.querySelector('[data-page="riders"].active')) {
          await loadRiders();
          await renderTableWithTeamStatus();
        }
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error recalculando precios:", err);
      alert("❌ Error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}




// ⭐ BOTÓN RECALCULAR PUNTOS (VERSIÓN CORREGIDA)
const recalculatePointsBtn = document.getElementById("recalculatePointsBtn");
if (recalculatePointsBtn) {
  recalculatePointsBtn.addEventListener("click", async () => {
    if (!confirm("⚠️ ¿Recalcular puntos de TODOS los corredores y equipos?\n\nEsto reiniciará todos los puntos y los volverá a calcular basándose en los resultados guardados en la base de datos.\n\n¿Continuar?")) {
      return;
    }
    
    const btn = recalculatePointsBtn;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Recalculando puntos...';
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/recalculate-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        let message = `✅ Puntos recalculados!\n\n`;
        message += `💰 ${data.totalPointsAssigned?.toLocaleString() || 0} puntos asignados\n\n`;
        message += `📊 ${data.teamsUpdated || 0} equipos actualizados\n`;
        message += `🏆 ${data.leaguesUpdated || 0} ligas sincronizadas`;
        
        alert(message);
        
        // Recargar la página para ver cambios
        if (confirm("¿Recargar la página para ver los cambios?")) {
          location.reload();
        }
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error recalculando puntos:", err);
      alert("❌ Error de conexión: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

// ⭐ BOTÓN ELIMINAR DATOS DE ETAPA
const deleteStageDataBtn = document.getElementById("deleteStageDataBtn");
if (deleteStageDataBtn) {
  deleteStageDataBtn.addEventListener("click", async () => {
    const stageInput = document.getElementById("stageToDelete");
    const stageNumber = parseInt(stageInput.value);
    
    if (!stageNumber || stageNumber < 1 || stageNumber > 21) {
      alert("Por favor, introduce un número de etapa válido (1-21)");
      return;
    }
    
    if (!confirm(`⚠️ ¿Eliminar TODOS los datos de la etapa ${stageNumber}?\n\nEsto:\n• Eliminará los resultados guardados de la etapa\n• Restará todos los puntos de esa etapa de los corredores y equipos\n• Los puntos se recalcularán automáticamente\n\nEsta acción NO se puede deshacer.\n\n¿Continuar?`)) {
      return;
    }
    
    const btn = deleteStageDataBtn;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Eliminando etapa...';
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/delete-stage-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.id,
          stageNumber: stageNumber
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Etapa ${stageNumber} eliminada!\n\n${data.pointsRemoved} puntos removidos\n${data.ridersAffected} corredores afectados`);
        stageInput.value = "";
        
        // Opcional: recargar la página
        if (confirm("¿Recargar la página para ver los cambios?")) {
          location.reload();
        }
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error eliminando etapa:", err);
      alert("❌ Error de conexión: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

// Actualizar el guardado de configuración para incluir la fecha
const saveConfigBtn = document.getElementById("saveConfigBtn");
if (saveConfigBtn) {
  saveConfigBtn.addEventListener("click", async () => {
    const raceName = document.getElementById("raceName")?.value || "";
    const maxRiders = parseInt(document.getElementById("maxRiders")?.value || 8);
    const budget = parseInt(document.getElementById("budget")?.value || 100);
    const pcsImportUrl = document.getElementById("pcsImportUrl")?.value || "";
    const pcsUpdateRidersUrl = document.getElementById("pcsUpdateRidersUrl")?.value || "";
    const pcsUpdateStagesUrl = document.getElementById("pcsUpdateStagesUrl")?.value || "";
    const maxTeamCreationDateInput = document.getElementById("maxTeamCreationDate");
    
    let maxTeamCreationDate = null;
    if (maxTeamCreationDateInput && maxTeamCreationDateInput.value) {
      // Convertir datetime-local a ISO string
      maxTeamCreationDate = new Date(maxTeamCreationDateInput.value).toISOString();
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          raceName,
          maxRiders,
          budget,
          pcsImportUrl,
          pcsUpdateRidersUrl,
          pcsUpdateStagesUrl,
          maxTeamCreationDate
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        let message = "✅ Configuración guardada correctamente";
        if (maxTeamCreationDate) {
          message += `\n📅 Fecha límite: ${new Date(maxTeamCreationDate).toLocaleString()}`;
        }
        alert(message);
      } else {
        alert("❌ Error al guardar configuración");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Error al guardar configuración");
    }
  });
}


// Importar desde Wikipedia
async function importFromWikipedia() {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para importar corredores");
    return;
  }
  
  try {
    const btn = document.getElementById("importBtnAdmin");
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Importando...';

    const response = await fetch(`${API_BASE_URL}/admin/import-riders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    const data = await response.json();

    if (data.success) {
      alert(`✅ ${data.count} corredores importados correctamente`);
      await loadRiders();
      if (document.querySelector('[data-page="riders"].active')) {
        await initRidersPage();
      }
    } else {
      alert("❌ Error: " + (data.error || data.message || "Error desconocido"));
    }
  } catch (err) {
    console.error("Error en importación:", err);
    alert("❌ Error al importar: " + err.message);
  } finally {
    const btn = document.getElementById("importBtnAdmin");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon me-2"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="2" x2="12" y2="16"/></svg> Importar corredores desde Wikipedia';
    }
  }
}

// Borrar todos los corredores - VERSIÓN CORREGIDA
async function deleteAllRiders() {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para borrar corredores");
    return;
  }
  
  if (!confirm("⚠️ ¿Estás seguro de que quieres borrar TODOS los corredores? Esta acción no se puede deshacer.")) return;

  try {
    const btn = document.getElementById("deleteAllBtnAdmin");
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Borrando...';

    const response = await fetch(`${API_BASE_URL}/admin/delete-all-riders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    const data = await response.json();

    if (data.success) {
      alert(`✅ ${data.deletedCount} corredores borrados correctamente`);
      ridersData = [];
      allRidersData = [];
      if (document.querySelector('[data-page="riders"].active')) {
        await initRidersPage();
      }
    } else {
      alert("❌ Error al borrar los corredores");
    }
  } catch (err) {
    console.error("Error al borrar:", err);
    alert("❌ Error: " + err.message);
  } finally {
    const btn = document.getElementById("deleteAllBtnAdmin");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon me-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Borrar todos los corredores';
    }
  }
}

// Importar desde ProCyclingStats - VERSIÓN ORIGINAL
async function importFromProCyclingStats() {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para importar corredores");
    return;
  }
  
  try {
    const btn = document.getElementById("importPcsBtnAdmin");
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Importando desde PCS...';

    const response = await fetch(`${API_BASE_URL}/admin/import-pcs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    const data = await response.json();

    if (data.success) {
      alert(`✅ ${data.count} corredores importados correctamente desde ProCyclingStats`);
      await loadRiders();
      if (document.querySelector('[data-page="riders"].active')) {
        await initRidersPage();
      }
    } else {
      alert("❌ Error: " + (data.error || data.message || "Error desconocido"));
    }
  } catch (err) {
    console.error("Error en importación desde PCS:", err);
    alert("❌ Error al importar desde ProCyclingStats: " + err.message);
  } finally {
    const btn = document.getElementById("importPcsBtnAdmin");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon me-2"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="2" x2="12" y2="16"/></svg> Importar corredores desde ProCyclingStats';
    }
  }
}

// Guardar configuración del sistema - VERSIÓN CORREGIDA
async function saveSystemConfig() {
  if (!currentUser?.isAdmin) return;
  
  const raceName = document.getElementById("raceName").value;
  const maxRiders = parseInt(document.getElementById("maxRiders").value);
  const budget = parseInt(document.getElementById("budget").value);
  const pcsImportUrl = document.getElementById("pcsImportUrl").value;
  const pcsUpdateRidersUrl = document.getElementById("pcsUpdateRidersUrl").value;
  const pcsUpdateStagesUrl = document.getElementById("pcsUpdateStagesUrl").value;
  const maxTeamCreationDate = document.getElementById("maxTeamCreationDate").value;
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId: currentUser.id, 
        raceName,
        maxRiders, 
        budget,
        pcsImportUrl,
        pcsUpdateRidersUrl,
        pcsUpdateStagesUrl,
        maxTeamCreationDate: maxTeamCreationDate || null
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
       raceNameGlobal = raceName;
      alert("✅ Configuración guardada correctamente");
    } else {
      alert("❌ Error al guardar configuración");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error al guardar configuración");
  }
}

// Crear copia de seguridad
async function createBackup() {
  if (!currentUser?.isAdmin) return;

  try {
    const btn = document.getElementById("createBackupBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Creando...';

    const response = await fetch(`${API_BASE_URL}/admin/backup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });

    const data = await response.json();

    if (data.success && data.data) {
      // Crear un blob y descargar
      const blob = new Blob([data.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'backup-fantasy-cycling.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert("✅ Copia de seguridad descargada correctamente");
    } else {
      alert("❌ Error al crear la copia de seguridad");
    }
  } catch (err) {
    console.error("Error en backup:", err);
    alert("❌ Error: " + err.message);
  } finally {
    const btn = document.getElementById("createBackupBtn");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '💾 Descargar Copia de Seguridad';
    }
  }
}

// Restaurar copia de seguridad
// Restaurar copia de seguridad
function restoreBackup() {
  if (!currentUser?.isAdmin) return;

  if (!confirm("⚠️ ¿Estás seguro de que quieres restaurar una copia de seguridad?\n\nSe perderán los datos actuales (excepto usuarios).\n\nEsta operación puede tomar unos segundos dependiendo del tamaño del archivo.")) {
    return;
  }

  const fileInput = document.getElementById("backupFileInput");
  if (fileInput) {
    fileInput.click();
  }
}

// Manejar restauración de archivo - Versión mejorada
document.addEventListener("change", async function(e) {
  if (e.target.id === "backupFileInput" && e.target.files.length > 0) {
    const file = e.target.files[0];
    
    // Verificar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`❌ El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El límite es 10MB.`);
      e.target.value = '';
      return;
    }
    
    try {
      const fileContent = await file.text();
      
      if (!currentUser?.isAdmin) {
        alert("No tienes permisos para restaurar");
        return;
      }

      const btn = document.getElementById("restoreBackupBtn");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Restaurando... (puede tomar unos segundos)';

      console.log(`📤 Enviando backup de ${(fileContent.length / 1024 / 1024).toFixed(2)}MB...`);

      const response = await fetch(`${API_BASE_URL}/admin/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.id,
          backupData: fileContent 
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ " + data.message);
        // Recargar la página para ver los cambios
        setTimeout(() => location.reload(), 1500);
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error restaurando:", err);
      alert("❌ Error: " + err.message);
    } finally {
      const btn = document.getElementById("restoreBackupBtn");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '📤 Restaurar Copia de Seguridad';
      }
      // Limpiar el input
      e.target.value = '';
    }
  }
});

// Manejar restauración de archivo
document.addEventListener("change", async function(e) {
  if (e.target.id === "backupFileInput" && e.target.files.length > 0) {
    const file = e.target.files[0];
    
    try {
      const fileContent = await file.text();
      
      if (!currentUser?.isAdmin) {
        alert("No tienes permisos para restaurar");
        return;
      }

      const btn = document.getElementById("restoreBackupBtn");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Restaurando...';

      const response = await fetch(`${API_BASE_URL}/admin/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.id,
          backupData: fileContent 
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ " + data.message);
        // Recargar la página para ver los cambios
        setTimeout(() => location.reload(), 1000);
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error restaurando:", err);
      alert("❌ Error: " + err.message);
    } finally {
      const btn = document.getElementById("restoreBackupBtn");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '📤 Restaurar Copia de Seguridad';
      }
      // Limpiar el input
      e.target.value = '';
    }
  }
});

// Función para obtener flag emoji
function getFlagEmoji(country) {
  const countryCodes = {
    'Australia': 'au', 'Austria': 'at', 'Italy': 'it', 'Belgium': 'be',
    'Spain': 'es', 'France': 'fr', 'Germany': 'de', 'Netherlands': 'nl',
    'Denmark': 'dk', 'Colombia': 'co', 'Slovenia': 'si', 'Great Britain': 'gb',
    'United Kingdom': 'gb', 'United States': 'us', 'USA': 'us', 'Norway': 'no',
    'Switzerland': 'ch', 'Portugal': 'pt', 'Ireland': 'ie', 'Canada': 'ca',
    'New Zealand': 'nz', 'Ecuador': 'ec', 'Eritrea': 'er', 'Estonia': 'ee',
    'Croatia': 'hr', 'Chile': 'cl', 'Uzbekistan': 'uz', 'Czechia': 'cz',
    'Czech Republic': 'cz', 'Venezuela': 've', 'South Africa': 'za', 'Malta': 'mt',
    'Slovakia': 'sk', 'Uruguay': 'uy'
  };
  
  const code = countryCodes[country];
  if (code) {
    return `<img src="https://flagcdn.com/24x18/${code}.png" alt="${country}" style="width: 20px; height: 15px; margin-right: 5px; vertical-align: middle;">`;
  }
  return '🚴';
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCIONES PARA GESTIÓN DEL EQUIPO
// ──────────────────────────────────────────────────────────────────────────────

let currentTeamObj = {};
let maillots = [];

function showTeamBicycleLoading() {
  const teamContent = document.getElementById("teamContent");
  if (teamContent) {
    teamContent.innerHTML = `
      <div class="card">
        <div class="card-body text-center" style="padding: 3rem 0;">
          <div class="elegant-bike-spinner">
            <div class="spinner-ring">
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-spoke"></div>
              <div class="spinner-center"></div>
            </div>
          </div>
          <p class="text-muted mt-4 mb-0" style="font-size: 0.9rem; letter-spacing: 1px;">CARGANDO EQUIPO</p>
          <p class="text-muted small mt-1">⛁  preparando ciclistas  ⛁</p>
        </div>
      </div>
    `;
  }
}

async function loadTeamData() {
  if (!currentUser) return null;
  
  try {
    // Pasar información sobre si es admin para la verificación de fecha
    const url = `${API_BASE_URL}/team/${currentUser.id}?requestingUserId=${currentUser.id}&isAdmin=${currentUser.isAdmin}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error al cargar equipo");
    currentTeamObj = await response.json();
    return currentTeamObj;
  } catch (err) {
    console.error("Error cargando equipo:", err);
    currentTeamObj = {
      teamName: "Mi Equipo",
      directorName: "Director",
      riders: [],
      maillotImage: "rabobank.png",
      totalPrice: 0,
      totalPoints: 0,
      canModify: true,
      deadlinePassed: false
    };
    return currentTeamObj;
  }
}

async function loadMaillots() {
  try {
    console.log("Cargando maillots...");
    const response = await fetch(`${API_BASE_URL}/team/maillots`);
    if (response.ok) {
      const data = await response.json();
      console.log("Maillots recibidos:", data.maillots);
      if (Array.isArray(data.maillots) && data.maillots.length > 0) {
        maillots = data.maillots;
        return;
      }
    }
    // Fallback
    maillots = ["rabobank.png"];
    console.log("Usando maillot por defecto");
  } catch (err) {
    console.error("Error cargando maillots:", err);
    maillots = ["rabobank.png"];
  }
}


// app.js - Modificar la parte de renderTeamPage donde se muestran los corredores

// app.js - Función renderTeamPage completa

function renderTeamPage() {
  const teamContent = document.getElementById("teamContent");
  if (!teamContent) return;

  const maxRiders = window.systemConfig?.maxRiders || 8;
  const totalBudget = window.systemConfig?.budget || 100;
  const ridersCount = currentTeamObj.riders?.length || 0;
  const usedBudget = currentTeamObj.totalPrice || 0;
  const canModify = currentTeamObj.canModify !== false;
  const deadlinePassed = currentTeamObj.deadlinePassed === true;
  const deadlineDate = currentTeamObj.deadlineDate;

  let deadlineWarning = "";
  if (deadlinePassed && !canModify) {
    deadlineWarning = `
      <div class="alert alert-danger mb-4">
        <strong>⛔ FECHA LÍMITE SUPERADA</strong><br>
        La fecha límite para modificar equipos era: ${deadlineDate ? new Date(deadlineDate).toLocaleString() : 'fecha no especificada'}<br>
        Ya no se pueden añadir, quitar corredores ni modificar los datos del equipo.
      </div>
    `;
  } else if (deadlineDate && new Date(deadlineDate) > new Date()) {
    deadlineWarning = `
      <div class="alert alert-info mb-4">
        <strong>📅 Fecha límite para modificaciones:</strong><br>
        ${new Date(deadlineDate).toLocaleString()}<br>
        Después de esta fecha no podrás modificar tu equipo.
      </div>
    `;
  }

  teamContent.innerHTML = `
    <div class="row">
      <div class="col-lg-8">
        ${deadlineWarning}
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Configuración del Equipo</h3>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Nombre del Equipo</label>
              <input type="text" class="form-control" id="teamName" value="${escapeHtml(currentTeamObj.teamName || '')}" ${!canModify ? 'disabled' : ''}>
            </div>
            <div class="mb-3">
              <label class="form-label">Nombre del Director</label>
              <input type="text" class="form-control" id="directorName" value="${escapeHtml(currentTeamObj.directorName || '')}" ${!canModify ? 'disabled' : ''}>
            </div>
            <div class="mb-3">
              <label class="form-label">Maillot del Equipo</label>
              <div style="display: flex; gap: 1rem; overflow-x: auto; padding: 1rem 0; flex-wrap: nowrap;">
                ${maillots.map(m => {
                  const nameWithoutExt = m.replace(/\.[^/.]+$/, "");
                  const isSelected = currentTeamObj.maillotImage === m;
                  return `
                    <div style="text-align: center; cursor: ${canModify ? 'pointer' : 'default'}; flex-shrink: 0;" ${canModify ? `onclick="selectMaillot('${m}')"` : ''}>
                      <div style="border: ${isSelected ? '3px solid #0d6efd' : '2px solid #dee2e6'}; border-radius: 8px; padding: 4px; margin-bottom: 8px;">
                        <img src="assets/maillots/${m}" alt="${nameWithoutExt}" style="height: 50px; width: auto; border-radius: 4px;">
                      </div>
                      <small style="color: ${isSelected ? '#0d6efd' : '#666'};">${nameWithoutExt}</small>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
            <button class="btn btn-primary" onclick="saveTeamConfig()" ${!canModify ? 'disabled' : ''}>Guardar Configuración</button>
            ${!canModify ? '<p class="text-muted mt-2 small">⚠️ La fecha límite para modificar equipos ha pasado.</p>' : ''}
          </div>
        </div>

        <div class="card mt-4">
          <div class="card-header">
            <h3 class="card-title">Corredores en el Equipo (${ridersCount} / ${maxRiders})</h3>
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
                ${currentTeamObj.riders && currentTeamObj.riders.length > 0 
                  ? currentTeamObj.riders.map(rider => {
                      const riderName = rider.riderName || 'Nombre no disponible';
                      const riderTeam = (rider.riderTeam && rider.riderTeam !== 'undefined' && rider.riderTeam !== 'null') ? rider.riderTeam : 'Sin equipo';
                      const riderPrice = rider.riderPrice ? `${rider.riderPrice}M€` : '0M€';
                      const riderPoints = rider.points || 0;
                      
                      // Verificar si el corredor está retirado usando el mapa global
                      const isRetired = isRiderRetired(rider.riderId?.toString());
                      const retiredMark = isRetired ? ' <span style="color: #dc3545; font-weight: bold;">(X)</span>' : '';
                      const retiredClass = isRetired ? 'retired-name' : '';
                      
                      return `
                        <tr>
                          <td style="vertical-align: middle;">
                            <a href="javascript:void(0)" onclick="showRiderDetailsFromTeam('${rider.riderId}', '${escapeHtml(riderName).replace(/'/g, "\\'")}')" style="cursor: pointer; color: #0d6efd; text-decoration: none;" class="${retiredClass}">
                              <strong>${escapeHtml(riderName)}</strong>${retiredMark}
                            </a>
                          </td>
                          <td style="vertical-align: middle;">${escapeHtml(riderTeam)}</td>
                          <td class="fw-bold text-success">${riderPrice}</td>
                          <td><span class="badge bg-info text-dark">${riderPoints} pts</span></td>
                          <td>
                            <button class="btn btn-sm btn-danger" onclick="removeRiderFromTeamPage('${rider.riderId}')" ${!canModify ? 'disabled' : ''}>
                              Quitar
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')
                  : '<tr><td colspan="5" class="text-center text-muted py-4">🚴 No hay corredores en tu equipo. Ve a la sección "Corredores" para añadir ciclistas.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h3 class="card-title mb-4">Resumen del Equipo</h3>
            <div class="row mb-4">
              <div class="col-8">
                <div class="mb-3">
                  <div class="text-muted small">Nombre del Equipo</div>
                  <div class="h5">${escapeHtml(currentTeamObj.teamName || 'Mi Equipo')}</div>
                </div>
                <div class="mb-3">
                  <div class="text-muted small">Director</div>
                  <div class="h5">${escapeHtml(currentTeamObj.directorName || 'Director')}</div>
                </div>
              </div>
              <div class="col-4 text-center">
                <img src="assets/maillots/${currentTeamObj.maillotImage || 'rabobank.png'}" alt="Maillot" style="max-height: 100px; border-radius: 8px;">
              </div>
            </div>
            <hr>
            <div class="mb-3">
              <div class="text-muted small">Corredores</div>
              <div class="h5">${ridersCount} / ${maxRiders}</div>
            </div>
            <div class="mb-3">
              <div class="text-muted small">Presupuesto</div>
              <div class="h5 ${usedBudget > totalBudget ? 'text-danger' : ''}">${usedBudget}M€ / ${totalBudget}M€</div>
            </div>
            <div class="mb-3">
              <div class="text-muted small">Puntos Totales</div>
              <div class="h5 text-success">${currentTeamObj.totalPoints || 0} pts</div>
            </div>
            <hr>
            <div class="alert alert-info">
              <strong>ℹ️ Info:</strong> Ve a la sección de <a href="#" data-page="riders" onclick="loadPage('riders'); return false;">Corredores</a> para añadir más ciclistas.
              ${deadlinePassed ? '<br><br><strong>⚠️ Nota:</strong> La fecha límite para modificar equipos ha pasado.' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Función para mostrar detalles del rider desde la página de equipo
window.showRiderDetailsFromTeam = async function(riderId, riderName) {
  console.log(`📋 Mostrando detalles de ${riderName} (${riderId})`);
  
  try {
    const modal = document.getElementById("riderModal");
    const modalBody = document.getElementById("riderModalBody");
    const modalTitle = document.getElementById("riderModalTitle");
    
    if (!modal || !modalBody) {
      console.error("Modal no encontrado");
      return;
    }
    
    modal.style.display = "block";
    if (modalTitle) modalTitle.textContent = "Cargando...";
    modalBody.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando datos de ${escapeHtml(riderName)} desde ProCyclingStats...</p>
        <p class="text-muted small mt-1">🚴 Obteniendo información actualizada del ciclista</p>
      </div>
    `;
    
    console.log(`🔍 Solicitando datos para riderId: ${riderId}`);
    
    const response = await fetch(`${API_BASE_URL}/riders/rider-data/${riderId}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Error desconocido");
    }
    
    console.log("✅ Datos recibidos:", result.data);
    renderRiderDetailsModal(result.data);
    
  } catch (err) {
    console.error("Error cargando datos:", err);
    const modalBody = document.getElementById("riderModalBody");
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="alert alert-warning">
          <strong>⚠️ Error:</strong> ${err.message}
          <p class="mt-2 mb-0">No se pudieron cargar los datos del ciclista. Intenta nuevamente más tarde.</p>
          <hr>
          <small class="text-muted">Esto puede deberse a problemas de conexión con ProCyclingStats o que el ciclista no existe en la base de datos.</small>
        </div>
      `;
    }
  }
};

// Función global para seleccionar maillot
window.selectMaillot = async function(maillotName) {
  currentTeamObj.maillotImage = maillotName;
  renderTeamPage();
};

// Función global para guardar configuración
window.saveTeamConfig = async function() {
  const teamName = document.getElementById("teamName").value;
  const directorName = document.getElementById("directorName").value;
  const maillotImage = currentTeamObj.maillotImage;

  if (!teamName.trim() || !directorName.trim()) {
    alert("Por favor, completa todos los campos");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/team/update/${currentUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, directorName, maillotImage })
    });

    if (!response.ok) {
      throw new Error("Error al guardar configuración");
    }

    currentTeamObj = await response.json();
    alert("✅ Configuración guardada correctamente");
    renderTeamPage();
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error al guardar configuración");
  }
};

// Función global para remover corredor desde la página de equipo
window.removeRiderFromTeamPage = async function(riderId) {
  if (!confirm("¿Estás seguro de que deseas remover este corredor?")) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/team/remove-rider/${currentUser.id}/${riderId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Error al remover corredor");
    }

    currentTeamObj = await response.json();
    alert("✅ Corredor removido correctamente");
    renderTeamPage();
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error al remover corredor");
  }
};

// Reemplazar la función initTeamPage en app.js

async function initTeamPage() {
  showTeamBicycleLoading();
  await loadMaillots();
  await loadTeamData();
  
  // Cargar configuración del sistema para actualizar límites
  try {
    const configRes = await fetch(`${API_BASE_URL}/admin/config`);
    const config = await configRes.json();
    window.systemConfig = {
      maxRiders: config.maxRiders || 8,
      budget: config.budget || 100
    };
    console.log("📋 Configuración cargada:", window.systemConfig);
  } catch (err) {
    console.error("Error cargando configuración:", err);
    window.systemConfig = { maxRiders: 8, budget: 100 };
  }
  
  renderTeamPage();
  console.log(`✅ Página del equipo inicializada`);
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCIONES PARA MODAL DE DETALLES DEL CICLISTA
// ──────────────────────────────────────────────────────────────────────────────



// Función para cargar datos del ciclista desde la BD (con scraping PCS)
async function loadRiderData(riderId, riderName) {
  try {
    const modal = document.getElementById("riderModal");
    const modalBody = document.getElementById("riderModalBody");
    const modalTitle = document.getElementById("riderModalTitle");
    
    if (!modal || !modalBody) return;
    
    modal.style.display = "block";
    modalTitle.textContent = "Cargando...";
    modalBody.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando datos de ${escapeHtml(riderName)} desde ProCyclingStats...</p>
        <p class="text-muted small mt-1">🚴 Obteniendo información actualizada del ciclista</p>
      </div>
    `;
    
    console.log(`🔍 Solicitando datos para riderId: ${riderId}`);
    
    const response = await fetch(`${API_BASE_URL}/riders/rider-data/${riderId}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Error desconocido");
    }
    
    console.log("✅ Datos recibidos:", result.data);
    renderRiderDetailsModal(result.data);
    
  } catch (err) {
    console.error("Error cargando datos:", err);
    const modalBody = document.getElementById("riderModalBody");
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="alert alert-warning">
          <strong>⚠️ Error:</strong> ${err.message}
          <p class="mt-2 mb-0">No se pudieron cargar los datos del ciclista. Intenta nuevamente más tarde.</p>
          <hr>
          <small class="text-muted">Esto puede deberse a problemas de conexión con ProCyclingStats o que el ciclista no existe en la base de datos.</small>
        </div>
      `;
    }
  }
}


function closeRiderModal() {
  const modal = document.getElementById("riderModal");
  if (modal) {
    modal.style.display = "none";
  }
}

const riderModal = document.getElementById("riderModal");
if (riderModal) {
  riderModal.addEventListener("click", function(event) {
    if (event.target === riderModal) {
      closeRiderModal();
    }
  });
}


// ==================== FUNCIONES DE LIGAS ====================

// Variables globales para ligas
let allLeagues = [];

// Cargar y mostrar ligas
async function loadLeagues() {
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/`);
    if (!response.ok) throw new Error("Error al cargar ligas");
    
    allLeagues = await response.json();
    renderLeaguesTable(allLeagues);
  } catch (err) {
    console.error("Error cargando ligas:", err);
    const tbody = document.getElementById("leaguesTableBody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar ligas: ${err.message}</td></tr>`;
    }
  }
}

// Renderizar tabla de ligas
function renderLeaguesTable(leagues) {
  const tbody = document.getElementById("leaguesTableBody");
  if (!tbody) return;
  
  if (!leagues || leagues.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay ligas disponibles. ¡Crea la primera!</td></tr>`;
    return;
  }
  
  tbody.innerHTML = leagues.map(league => {
    const isCreator = currentUser && league.creatorId === currentUser.id;
    
    return `
      <tr>
        <td><strong>${escapeHtml(league.name)}</strong></td>
        <td><code class="bg-light p-1 rounded">${league.code}</code></td>
        <td>${escapeHtml(league.creatorName)}</td>
        <td><span class="badge bg-info">${league.teamsCount || league.teams?.length || 0}</span> / ${league.maxTeams}</td>
        <td>${league.maxTeams}</td>
        <td>${league.isPrivate ? '<span class="badge bg-warning">🔒 Privada</span>' : '<span class="badge bg-success">🌍 Pública</span>'}</td>
        <td><span class="badge ${league.status === 'active' ? 'bg-success' : 'bg-secondary'}">${league.status === 'active' ? 'Activa' : 'Finalizada'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1" onclick="viewLeagueDetails('${league._id}')" title="Ver detalles">
            📋 Ver
          </button>
          ${isCreator ? `
            <button class="btn btn-sm btn-outline-danger" onclick="deleteLeague('${league._id}')" title="Eliminar liga">
              🗑️
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join("");
}

// Buscar ligas
function searchLeagues() {
  const searchInput = document.getElementById("leagueSearchInput");
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    renderLeaguesTable(allLeagues);
    return;
  }
  
  const filtered = allLeagues.filter(league => 
    league.name.toLowerCase().includes(searchTerm) ||
    league.code.toLowerCase().includes(searchTerm)
  );
  
  renderLeaguesTable(filtered);
}

// Abrir modal de crear liga
function openCreateLeagueModal() {
  const modal = document.getElementById("createLeagueModal");
  if (modal) {
    modal.style.display = "block";
    document.getElementById("leagueName").value = "";
    document.getElementById("maxTeams").value = "10";
    document.getElementById("isPrivate").checked = false;
  }
}

// Cerrar modal de crear liga
function closeCreateLeagueModal() {
  const modal = document.getElementById("createLeagueModal");
  if (modal) modal.style.display = "none";
}

// Crear nueva liga
async function createLeague(event) {
  event.preventDefault();
  
  const name = document.getElementById("leagueName").value.trim();
  const maxTeams = parseInt(document.getElementById("maxTeams").value);
  const isPrivate = document.getElementById("isPrivate").checked;
  
  if (!name) {
    alert("Por favor, ingresa un nombre para la liga");
    return;
  }
  
  if (maxTeams < 2 || maxTeams > 50) {
    alert("El número máximo de equipos debe estar entre 2 y 50");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        maxTeams,
        isPrivate,
        creatorId: currentUser.id,
        creatorName: currentUser.username
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Liga "${name}" creada exitosamente!\nCódigo de invitación: ${data.league.code}`);
      closeCreateLeagueModal();
      loadLeagues();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Error creando liga:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Abrir modal de unirse a liga
function showJoinLeagueModal() {
  const modal = document.getElementById("joinLeagueModal");
  if (modal) {
    modal.style.display = "block";
    document.getElementById("joinCode").value = "";
  }
}

// Cerrar modal de unirse a liga
function closeJoinLeagueModal() {
  const modal = document.getElementById("joinLeagueModal");
  if (modal) modal.style.display = "none";
}

// Unirse a liga por código
async function joinLeague(event) {
  event.preventDefault();
  
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  
  if (!code || code.length !== 6) {
    alert("Por favor, ingresa un código válido de 6 dígitos");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        userId: currentUser.id,
        username: currentUser.username
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Te has unido a la liga "${data.league.name}" exitosamente!`);
      closeJoinLeagueModal();
      loadLeagues();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Error uniéndose a liga:", err);
    alert(`❌ Error: ${err.message}`);
  }
}


// app.js - Reemplazar la función viewLeagueDetails

// app.js - Reemplazar la función viewLeagueDetails

async function viewLeagueDetails(leagueId) {
  const modal = document.getElementById("leagueDetailsModal");
  const body = document.getElementById("leagueDetailsBody");
  
  if (!modal || !body) return;
  
  modal.style.display = "block";
  body.innerHTML = `
    <div class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando detalles de la liga...</p>
    </div>
  `;
  
  try {
    // Sincronizar puntos de la liga
    await fetch(`${API_BASE_URL}/leagues/sync-points/${leagueId}`, {
      method: "POST"
    });
    
    // Obtener los datos actualizados
    const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}`);
    if (!response.ok) throw new Error("Error al cargar detalles");
    
    const league = await response.json();
    const isCreator = currentUser && league.creatorId === currentUser.id;
    const isMember = league.teams && league.teams.some(t => t.userId === currentUser.id);
    
    // Ordenar equipos por puntos (de mayor a menor)
    const sortedTeams = [...(league.teams || [])].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    
    // Guardar leagueId para uso posterior
    window.currentLeagueId = leagueId;
    
    body.innerHTML = `
      <div class="mb-4">
        <h4 class="mb-2">${escapeHtml(league.name)}</h4>
        <p class="text-muted mb-1">Creada por: <strong>${escapeHtml(league.creatorName)}</strong></p>
        <p class="text-muted mb-2">Código: <code class="bg-light p-1 rounded">${league.code}</code></p>
        <div class="row mt-3">
          <div class="col-6">
            <div class="text-center p-3 bg-light rounded">
              <div class="h3 mb-0">${league.teams?.length || 0}</div>
              <small class="text-muted">Equipos inscritos</small>
            </div>
          </div>
          <div class="col-6">
            <div class="text-center p-3 bg-light rounded">
              <div class="h3 mb-0">${league.maxTeams}</div>
              <small class="text-muted">Máximo de equipos</small>
            </div>
          </div>
        </div>
      </div>
      
      <hr>
      
      <!-- Selector de etapa - carga automática al cambiar -->
      <div class="mb-4">
        <label class="form-label fw-bold">📊 Ver puntos por:</label>
        <select id="stageSelector" class="form-select" onchange="loadLeagueRankingByStage('${leagueId}')">
          <option value="total">🏆 Puntos Totales</option>
          ${Array.from({ length: 21 }, (_, i) => `<option value="${i + 1}">📍 Etapa ${i + 1}</option>`).join('')}
        </select>
        <div id="stageInfo" class="mt-2 small text-muted"></div>
      </div>
      
      <!-- Tabla de clasificación -->
      <div id="leagueRankingContainer">
        <div class="table-responsive">
          <table class="table table-sm table-hover" id="leagueRankingTable">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>Usuario</th>
                <th>Equipo</th>
                <th>Puntos</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody id="leagueRankingBody"></tbody>
          </table>
        </div>
      </div>
      
      ${isMember && !isCreator ? `
        <hr>
        <div class="text-center mt-3">
          <button class="btn btn-outline-danger" onclick="leaveLeague('${league._id}')">Abandonar Liga</button>
        </div>
      ` : ''}
    `;
    
    // Cargar los puntos totales por defecto
    await renderLeagueRanking(leagueId, 'total', sortedTeams);
    
  } catch (err) {
    console.error("Error cargando detalles:", err);
    body.innerHTML = `<div class="alert alert-danger">Error al cargar detalles: ${err.message}</div>`;
  }
}

// Función para cargar el ranking de la liga según etapa seleccionada
async function loadLeagueRankingByStage(leagueId) {
  const stageSelector = document.getElementById("stageSelector");
  const selectedValue = stageSelector?.value;
  
  if (!selectedValue) return;
  
  const stageInfo = document.getElementById("stageInfo");
  const rankingBody = document.getElementById("leagueRankingBody");
  
  if (!rankingBody) return;
  
  // Mostrar loading
  rankingBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        Cargando...
      </td>
    </tr>
  `;
  
  if (selectedValue === 'total') {
    // Cargar puntos totales
    if (stageInfo) stageInfo.innerHTML = '';
    
    try {
      const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}`);
      if (!response.ok) throw new Error("Error al cargar datos");
      
      const league = await response.json();
      const sortedTeams = [...(league.teams || [])].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      
      await renderLeagueRanking(leagueId, 'total', sortedTeams);
    } catch (err) {
      console.error("Error:", err);
      rankingBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
  } else {
    // Cargar puntos por etapa específica
    const stageNumber = parseInt(selectedValue);
    if (stageInfo) stageInfo.innerHTML = '<span class="text-info">⏳ Cargando puntos de la etapa...</span>';
    
    try {
      const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}/points-by-stage/${stageNumber}`);
      
      if (!response.ok) throw new Error("Error al cargar datos");
      
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || "Error desconocido");
      
      if (stageInfo) {
        if (!data.hasResults) {
          stageInfo.innerHTML = '<span class="text-warning">⚠️ No hay resultados disponibles para esta etapa.</span>';
        } else {
          stageInfo.innerHTML = `<span class="text-success">✅ ${data.stageName} ${data.distanceKm ? `(${data.distanceKm} km)` : ''}</span>`;
        }
      }
      
      await renderLeagueRanking(leagueId, stageNumber, data.teamPoints);
      
    } catch (err) {
      console.error("Error:", err);
      rankingBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${err.message}</td></tr>`;
      if (stageInfo) stageInfo.innerHTML = `<span class="text-danger">❌ Error: ${err.message}</span>`;
    }
  }
}

// Función para renderizar el ranking de la liga
async function renderLeagueRanking(leagueId, type, teamsData) {
  const rankingBody = document.getElementById("leagueRankingBody");
  if (!rankingBody) return;
  
  if (!teamsData || teamsData.length === 0) {
    rankingBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No hay equipos en esta liga</td></tr>`;
    return;
  }
  
  const isStageView = type !== 'total';
  
  rankingBody.innerHTML = teamsData.map((team, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    
    // Para vista de etapa, mostrar detalles de corredores
    let detailsButton = '';
    let detailsHtml = '';
    
if (isStageView && team.ridersPoints && team.ridersPoints.length > 0) {
  const ridersDetails = team.ridersPoints.map(r => {
    // Badge para DNF/DNS en el detalle
    let retiredMark = '';
    if (r.positionType === 'DNF') retiredMark = ' <span class="badge bg-danger">DNF</span>';
    if (r.positionType === 'DNS') retiredMark = ' <span class="badge bg-warning">DNS</span>';
    if (r.positionType === 'DSQ') retiredMark = ' <span class="badge bg-dark">DSQ</span>';
    
    let positionText = '';
    if (r.position) {
      if (r.positionType === 'DNF') positionText = 'No terminó';
      else if (r.positionType === 'DNS') positionText = 'No salió';
      else if (r.positionType === 'DSQ') positionText = 'Descalificado';
      else positionText = `Pos ${r.position}`;
    }
    
    return `<div class="small">• ${escapeHtml(r.riderName)}${retiredMark}: <strong>${r.points} pts</strong> ${positionText ? `(${positionText})` : ''}</div>`;
  }).join('');
      
      const detailsId = `stage-details-${leagueId}-${index}`;
      detailsButton = `
        <button class="btn btn-sm btn-outline-info" onclick="toggleStageDetails('${detailsId}')">
          📋 Ver (${team.ridersPoints.length})
        </button>
        <div id="${detailsId}" style="display: none; margin-top: 10px;" class="bg-light p-2 rounded">
          <strong>Corredores con puntos:</strong>
          ${ridersDetails}
        </div>
      `;
    } else if (isStageView) {
      detailsButton = '<span class="text-muted small">Sin puntos</span>';
    } else {
      detailsButton = '';
    }
    
    return `
      <tr>
        <td><strong>${index + 1}</strong> ${medal}</td>
        <td>${escapeHtml(team.username)}${team.userId === currentUser?.id ? ' <span class="badge bg-primary">Tú</span>' : ''}</td>
        <td style="cursor: pointer;" onclick="viewTeamDetailsFromLeague('${team.userId}')">
          <strong style="color: #0d6efd;">${escapeHtml(team.teamName)}</strong>
        </td>
        <td><span class="badge ${team.totalPoints > 0 ? 'bg-success' : 'bg-secondary'} fs-6">${team.totalPoints.toLocaleString()} pts</span></td>
        <td>${detailsButton}</td>
      </tr>
    `;
  }).join('');
}

// Función global para toggle de detalles de etapa
window.toggleStageDetails = function(detailsId) {
  const detailsDiv = document.getElementById(detailsId);
  if (detailsDiv) {
    detailsDiv.style.display = detailsDiv.style.display === 'block' ? 'none' : 'block';
  }
};

// Función para ver detalles del equipo desde la liga
async function viewTeamDetailsFromLeague(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/ranking/team-by-user/${userId}`);
    if (!response.ok) throw new Error("Error al cargar el equipo");
    
    const data = await response.json();
    
    if (data.success && data.teamId) {
      // Guardar el userId actual para usarlo en el modal del equipo
      window.currentTeamUserId = userId;
      await viewTeamDetails(data.teamId);
    } else {
      alert("No se pudieron cargar los detalles del equipo");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Error al cargar los detalles del equipo: " + err.message);
  }
}

// Función para cargar puntos por etapa para una liga
async function loadStagePointsForLeague(leagueId) {
  const stageSelector = document.getElementById("stageSelector");
  const stageNumber = stageSelector?.value;
  
  if (!stageNumber) {
    alert("Por favor, selecciona una etapa");
    return;
  }
  
  const stageResultsContainer = document.getElementById("stageResultsContainer");
  const stageResultsTitle = document.getElementById("stageResultsTitle");
  const stagePointsBody = document.getElementById("stagePointsBody");
  const stageInfo = document.getElementById("stageInfo");
  const leagueRankingContainer = document.getElementById("leagueRankingContainer");
  
  // Mostrar loading
  if (stagePointsBody) {
    stagePointsBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-primary me-2"></div>
          Cargando puntos de la etapa ${stageNumber}...
        </td>
      </tr>
    `;
  }
  
  if (stageResultsContainer) {
    stageResultsContainer.style.display = "block";
  }
  
  if (stageInfo) {
    stageInfo.innerHTML = '<span class="text-info">⏳ Obteniendo datos...</span>';
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}/points-by-stage/${stageNumber}`);
    
    if (!response.ok) {
      throw new Error("Error al cargar puntos por etapa");
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Error desconocido");
    }
    
    // Actualizar título
    if (stageResultsTitle) {
      stageResultsTitle.innerHTML = `📍 ${data.stageName || `Etapa ${stageNumber}`} ${data.distanceKm ? `(${data.distanceKm} km)` : ''}`;
    }
    
    // Actualizar info
    if (stageInfo) {
      if (!data.hasResults) {
        stageInfo.innerHTML = '<span class="text-warning">⚠️ No hay resultados disponibles para esta etapa. Usa el botón "Actualizar desde web" en la sección de resultados.</span>';
      } else {
        stageInfo.innerHTML = `<span class="text-success">✅ ${data.teamPoints.length} equipos | ${data.teamPoints.reduce((sum, t) => sum + t.ridersPoints.filter(r => r.points > 0).length, 0)} corredores con puntos</span>`;
      }
    }
    
    // Renderizar tabla de puntos por etapa
    if (stagePointsBody && data.teamPoints) {
      if (data.teamPoints.length === 0) {
        stagePointsBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted py-4">
              No hay equipos en esta liga o aún no tienen puntos en esta etapa
            </td>
          </tr>
        `;
      } else {
        stagePointsBody.innerHTML = data.teamPoints.map((team, index) => {
          // Obtener los riders con puntos positivos
          const ridersWithPoints = team.ridersPoints.filter(r => r.points > 0);
          const ridersDetails = ridersWithPoints.map(r => 
            `${r.riderName}: ${r.points} pts${r.position ? ` (Pos ${r.position})` : ''}`
          ).join('<br>');
          
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
          
          return `
            <tr>
              <td><strong>${index + 1}</strong> ${medal}</td>
              <td>${escapeHtml(team.username)}${team.userId === currentUser?.id ? ' <span class="badge bg-primary">Tú</span>' : ''}</td>
              <td><strong>${escapeHtml(team.teamName)}</strong></td>
              <td><span class="badge bg-success fs-6">${team.totalPoints.toLocaleString()} pts</span></td>
              <td>
                ${ridersWithPoints.length > 0 ? `
                  <button class="btn btn-sm btn-outline-info" onclick="showStagePointsDetails(${index}, ${JSON.stringify(escapeHtml(team.username)).replace(/"/g, '&quot;')})" data-team-index="${index}">
                    📋 Ver detalles (${ridersWithPoints.length})
                  </button>
                  <div id="riderDetails-${index}" style="display: none; margin-top: 10px;" class="small bg-light p-2 rounded">
                    <strong>Corredores con puntos:</strong><br>
                    ${ridersDetails}
                  </div>
                ` : '<span class="text-muted">Sin puntos</span>'}
              </td>
            </tr>
          `;
        }).join('');
        
        // Añadir event listeners para los botones de detalles
        document.querySelectorAll('[onclick^="showStagePointsDetails"]').forEach(btn => {
          const onclickAttr = btn.getAttribute('onclick');
          btn.removeAttribute('onclick');
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const match = onclickAttr.match(/showStagePointsDetails\((\d+),/);
            if (match) {
              const index = parseInt(match[1]);
              const detailsDiv = document.getElementById(`riderDetails-${index}`);
              if (detailsDiv) {
                const isVisible = detailsDiv.style.display === 'block';
                // Ocultar todos los demás
                document.querySelectorAll('[id^="riderDetails-"]').forEach(div => {
                  div.style.display = 'none';
                });
                detailsDiv.style.display = isVisible ? 'none' : 'block';
              }
            }
          });
        });
      }
    }
    
    // Opcional: Ocultar la clasificación general si se está viendo una etapa
    if (leagueRankingContainer) {
      // Podrías añadir un botón para volver a la general
    }
    
  } catch (err) {
    console.error("Error cargando puntos por etapa:", err);
    if (stagePointsBody) {
      stagePointsBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger py-4">
            ❌ Error: ${err.message}
          </td>
        </tr>
      `;
    }
    if (stageInfo) {
      stageInfo.innerHTML = `<span class="text-danger">❌ Error al cargar datos: ${err.message}</span>`;
    }
  }
}

// Función global para mostrar detalles de puntos por etapa (fallback)
window.showStagePointsDetails = function(index, username) {
  const detailsDiv = document.getElementById(`riderDetails-${index}`);
  if (detailsDiv) {
    const isVisible = detailsDiv.style.display === 'block';
    // Ocultar todos los demás
    document.querySelectorAll('[id^="riderDetails-"]').forEach(div => {
      div.style.display = 'none';
    });
    detailsDiv.style.display = isVisible ? 'none' : 'block';
  }
};

// Manejador para el clic en la fila del equipo
function handleTeamRowClick(event) {
  // Evitar que el clic se propague si se hizo clic en un botón interno
  if (event.target.tagName === 'BUTTON') return;
  
  const row = event.currentTarget;
  const userId = row.dataset.userId;
  
  console.log("🖱️ Clic en equipo con userId:", userId);
  
  if (userId) {
    viewTeamDetailsFromLeague(userId);
  }
}

// Ver detalles del equipo desde la liga (reutiliza la función existente)
async function viewTeamDetailsFromLeague(userId) {
  console.log("🔍 viewTeamDetailsFromLeague llamado con userId:", userId);
  
  // Primero necesitamos obtener el teamId a partir del userId
  try {
    const response = await fetch(`${API_BASE_URL}/ranking/team-by-user/${userId}`);
    if (!response.ok) throw new Error("Error al cargar el equipo");
    
    const data = await response.json();
    console.log("📡 Respuesta de team-by-user:", data);
    
    if (data.success && data.teamId) {
      // Usar la función existente para mostrar los detalles del equipo
      viewTeamDetails(data.teamId);
    } else {
      console.error("No se encontró teamId para userId:", userId);
      alert("No se pudieron cargar los detalles del equipo");
    }
  } catch (err) {
    console.error("Error en viewTeamDetailsFromLeague:", err);
    alert("Error al cargar los detalles del equipo: " + err.message);
  }
}

// Cerrar modal de detalles
function closeLeagueDetailsModal() {
  const modal = document.getElementById("leagueDetailsModal");
  if (modal) modal.style.display = "none";
}

// Eliminar liga
async function deleteLeague(leagueId) {
  if (!confirm("¿Estás seguro de que quieres eliminar esta liga? Esta acción no se puede deshacer.")) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}/${currentUser.id}`, {
      method: "DELETE"
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert("✅ Liga eliminada correctamente");
      loadLeagues();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Error eliminando liga:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Abandonar liga
async function leaveLeague(leagueId) {
  if (!confirm("¿Estás seguro de que quieres abandonar esta liga?")) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/leave/${leagueId}/${currentUser.id}`, {
      method: "DELETE"
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert("✅ Has abandonado la liga");
      closeLeagueDetailsModal();
      loadLeagues();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Error abandonando liga:", err);
    alert(`❌ Error: ${err.message}`);
  }
}

// Función helper para escapar HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Inicializar página de ligas
async function initLeaguesPage() {
  await loadLeagues();
  
  // Configurar event listeners
  const searchInput = document.getElementById("leagueSearchInput");
  if (searchInput) {
    searchInput.removeEventListener("input", searchLeagues);
    searchInput.addEventListener("input", searchLeagues);
  }
  
  const createForm = document.getElementById("createLeagueForm");
  if (createForm) {
    createForm.removeEventListener("submit", createLeague);
    createForm.addEventListener("submit", createLeague);
  }
  
  const joinForm = document.getElementById("joinLeagueForm");
  if (joinForm) {
    joinForm.removeEventListener("submit", joinLeague);
    joinForm.addEventListener("submit", joinLeague);
  }
}


// ==================== FUNCIONES DE CLASIFICACIÓN ====================

let allRanking = [];

// Cargar clasificación general
async function loadRanking() {
  try {
    const response = await fetch(`${API_BASE_URL}/ranking/general`);
    if (!response.ok) throw new Error("Error al cargar clasificación");
    
    const data = await response.json();
    if (data.success) {
      allRanking = data.ranking;
      renderRankingTable(allRanking);
    } else {
      throw new Error(data.error || "Error desconocido");
    }
  } catch (err) {
    console.error("Error cargando ranking:", err);
    const tbody = document.getElementById("rankingTableBody");
    if (tbody) {
      tbody.innerHTML = `<td><td colspan="5" class="text-center text-danger py-4">❌ Error al cargar clasificación: ${err.message}</td></tr>`;
    }
  }
}

// Renderizar tabla de clasificación
function renderRankingTable(ranking) {
  const tbody = document.getElementById("rankingTableBody");
  if (!tbody) return;
  
  if (!ranking || ranking.length === 0) {
    tbody.innerHTML = `<td><td colspan="5" class="text-center text-muted py-4">No hay equipos registrados aún</td></tr>`;
    return;
  }
  
  tbody.innerHTML = ranking.map((team, index) => {
    // Medallas para los primeros 3
    let medalHtml = "";
    if (index === 0) medalHtml = "🥇 ";
    else if (index === 1) medalHtml = "🥈 ";
    else if (index === 2) medalHtml = "🥉 ";
    
    return `
      <tr style="cursor: pointer;" onclick="viewTeamDetails('${team.teamId}')" class="team-row">
        <td><strong>${medalHtml}${index + 1}</strong></td>
        <td>
          <strong>${escapeHtml(team.teamName)}</strong>
          <small class="d-block text-muted">@${escapeHtml(team.username)}</small>
        </td>
        <td>${escapeHtml(team.directorName)}</td>
        <td>
          <span class="badge bg-success fs-6 p-2">${team.totalPoints.toLocaleString()} pts</span>
        </td>
        <td><span class="badge bg-info">${team.ridersCount} corredores</span></td>
      </tr>
    `;
  }).join("");
}

// Buscar en clasificación
function searchRanking() {
  const searchInput = document.getElementById("rankingSearchInput");
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    renderRankingTable(allRanking);
    return;
  }
  
  const filtered = allRanking.filter(team => 
    team.teamName.toLowerCase().includes(searchTerm) ||
    team.directorName.toLowerCase().includes(searchTerm) ||
    team.username.toLowerCase().includes(searchTerm)
  );
  
  renderRankingTable(filtered);
}

// Ver detalles del equipo (modal)
async function viewTeamDetails(teamId) {
  const modal = document.getElementById("teamDetailsModal");
  const body = document.getElementById("teamDetailsBody");
  const title = document.getElementById("teamDetailsTitle");
  
  if (!modal || !body) return;
  
  modal.style.display = "block";
  if (title) title.textContent = "Detalles del Equipo";
  
  body.innerHTML = `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando datos del equipo...</p>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE_URL}/ranking/team/${teamId}`);
    if (!response.ok) throw new Error("Error al cargar detalles del equipo");
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    renderTeamDetailsModal(data);
  } catch (err) {
    console.error("Error cargando detalles:", err);
    body.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Error:</strong> ${err.message}
        <p class="mt-2 mb-0">No se pudieron cargar los detalles del equipo.</p>
      </div>
    `;
  }
}

// app.js - Función renderTeamDetailsModal completa

function renderTeamDetailsModal(data) {
  const body = document.getElementById("teamDetailsBody");
  const title = document.getElementById("teamDetailsTitle");
  const { team, leagues } = data;
  
  if (title) title.innerHTML = `🚴 ${escapeHtml(team.teamName)}`;
  
  const teamId = team.teamId;
  const userId = team.userId || (window.currentTeamUserId);
  
  const totalRiders = team.riders.length;
  const ridersWithPoints = team.riders.filter(r => (r.points || 0) > 0);
  const topRider = team.riders.length > 0 ? team.riders.reduce((max, r) => (r.points || 0) > (max.points || 0) ? r : max, team.riders[0]) : null;
  
  body.innerHTML = `
    <style>
      .team-stat-card {
        transition: transform 0.2s ease;
      }
      .team-stat-card:hover {
        transform: translateY(-2px);
      }
      #teamRidersBody tr {
        transition: background-color 0.2s ease;
      }
      #teamRidersBody tr:hover {
        background-color: #f8f9fa;
      }
      .retired-name {
        color: #dc3545 !important;
        text-decoration: line-through;
      }
    </style>
    
    <div class="row mb-4">
      <div class="col-md-4 text-center">
        <div class="card bg-light team-stat-card">
          <div class="card-body">
            <img src="assets/maillots/${team.maillotImage || 'rabobank.png'}" alt="Maillot" style="max-height: 100px; margin-bottom: 10px; border-radius: 8px;">
            <h5 class="mb-1">${escapeHtml(team.teamName)}</h5>
            <p class="text-muted small mb-0">${escapeHtml(team.directorName)}</p>
          </div>
        </div>
      </div>
      <div class="col-md-8">
        <div class="row">
          <div class="col-4">
            <div class="text-center p-2 bg-success bg-opacity-10 rounded team-stat-card">
              <div class="h3 mb-0 text-success" id="teamTotalPoints">${team.totalPoints.toLocaleString()}</div>
              <small class="text-muted">Puntos Totales</small>
            </div>
          </div>
          <div class="col-4">
            <div class="text-center p-2 bg-info bg-opacity-10 rounded team-stat-card">
              <div class="h3 mb-0 text-info">${totalRiders}</div>
              <small class="text-muted">Corredores</small>
            </div>
          </div>
          <div class="col-4">
            <div class="text-center p-2 bg-warning bg-opacity-10 rounded team-stat-card">
              <div class="h3 mb-0 text-warning">€${team.totalPrice || 0}M</div>
              <small class="text-muted">Presupuesto</small>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Selector de etapa para el equipo -->
    <div class="mb-4">
      <label class="form-label fw-bold small">📊 Ver puntos por:</label>
      <select id="teamStageSelector" class="form-select form-select-sm" onchange="loadTeamPointsByStage('${teamId}', '${userId || ''}')">
        <option value="total">🏆 Puntos Totales</option>
        ${Array.from({ length: 21 }, (_, i) => `<option value="${i + 1}">📍 Etapa ${i + 1}</option>`).join('')}
      </select>
      <div id="teamStageInfo" class="mt-2 small text-muted"></div>
    </div>
    
    <div id="teamRidersContainer">
      <h5 class="mb-3 mt-3">📋 Corredores del Equipo (${totalRiders})</h5>
      <div class="table-responsive mb-4">
        <table class="table table-sm table-hover" id="teamRidersTable">
          <thead class="table-light">
            <tr>
              <th style="width: 50px;">#</th>
              <th>Nombre</th>
              <th>Equipo Real</th>
              <th style="width: 80px;">Precio</th>
              <th style="width: 80px;">Puntos</th>
            </tr>
          </thead>
          <tbody id="teamRidersBody">
            ${team.riders.length > 0 
              ? team.riders.map((rider, idx) => {
                  const isRetired = isRiderRetired(rider.riderId?.toString());
                  const retiredMark = isRetired ? ' <span style="color: #dc3545; font-weight: bold;">(X)</span>' : '';
                  const retiredClass = isRetired ? 'retired-name' : '';
                  return `
                    <tr>
                      <td style="vertical-align: middle;">${idx + 1}</td>
                      <td style="vertical-align: middle;">
                        <strong class="${retiredClass}">${escapeHtml(rider.riderName)}</strong>${retiredMark}
                        ${rider.riderTeam ? `<br><small class="text-muted">${escapeHtml(rider.riderTeam)}</small>` : ''}
                      </td>
                      <td style="vertical-align: middle;">${escapeHtml(rider.riderTeam || '-')}</td>
                      <td style="vertical-align: middle;"><span class="fw-bold text-success">€${rider.riderPrice || 0}M</span></td>
                      <td style="vertical-align: middle;"><span class="badge ${(rider.points || 0) > 0 ? 'bg-success' : 'bg-secondary'} rider-points-${rider.riderId || idx}">${rider.points || 0} pts</span></td>
                    </tr>
                  `;
                }).join('')
              : '<tr><td colspan="5" class="text-center text-muted py-4">🚴 No hay corredores en este equipo</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
    
    ${ridersWithPoints.length > 0 ? `
      <div class="alert alert-info small">
        <strong>📊 Resumen de puntos:</strong>
        <div class="row mt-2">
          <div class="col-6">
            <i class="text-muted">🏆 Mejor corredor:</i>
            <div><strong>${escapeHtml(topRider?.riderName)}</strong> - ${topRider?.points || 0} pts</div>
          </div>
          <div class="col-6">
            <i class="text-muted">📈 Corredores con puntos:</i>
            <div><strong>${ridersWithPoints.length}</strong> de ${totalRiders}</div>
          </div>
        </div>
      </div>
    ` : ''}
    
    <h5 class="mb-3">🏆 Ligas en las que participa</h5>
    ${leagues && leagues.length > 0 ? `
      <div class="list-group">
        ${leagues.map(league => `
          <div class="list-group-item list-group-item-action">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${escapeHtml(league.name)}</strong>
                <br>
                <small class="text-muted">Código: <code>${league.code}</code></small>
              </div>
              <div class="text-end">
                <span class="badge ${league.status === 'active' ? 'bg-success' : 'bg-secondary'}">${league.status === 'active' ? 'Activa' : 'Finalizada'}</span>
                ${league.position ? `<div class="small mt-1">📍 Posición: ${league.position}/${league.teamsCount}</div>` : ''}
              </div>
            </div>
            <div class="mt-2">
              <small class="text-muted">
                👥 ${league.teamsCount}/${league.maxTeams} equipos
              </small>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="alert alert-secondary text-center">
        <p class="mb-0">🏁 Este equipo no pertenece a ninguna liga aún.</p>
        <small>¡Anima al director a unirse a una liga!</small>
      </div>
    `}
  `;
}

// app.js - Función loadTeamPointsByStage completa

async function loadTeamPointsByStage(teamId, userId) {
  const stageSelector = document.getElementById("teamStageSelector");
  const selectedValue = stageSelector?.value;
  
  if (!selectedValue) return;
  
  const teamStageInfo = document.getElementById("teamStageInfo");
  const ridersBody = document.getElementById("teamRidersBody");
  const totalPointsSpan = document.getElementById("teamTotalPoints");
  
  if (!ridersBody) return;
  
  // Mostrar loading
  ridersBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        Cargando...
      </td>
    </tr>
  `;
  
  if (selectedValue === 'total') {
    // Cargar puntos totales - recargar el equipo
    if (teamStageInfo) teamStageInfo.innerHTML = '';
    
    try {
      const response = await fetch(`${API_BASE_URL}/ranking/team/${teamId}`);
      if (!response.ok) throw new Error("Error al cargar datos");
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      const team = data.team;
      const totalPoints = team.totalPoints || 0;
      
      if (totalPointsSpan) totalPointsSpan.textContent = totalPoints.toLocaleString();
      if (teamStageInfo) teamStageInfo.innerHTML = '<span class="text-success">✅ Mostrando puntos totales</span>';
      
      // Renderizar tabla con puntos totales
      if (team.riders.length === 0) {
        ridersBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">🚴 No hay corredores en este equipo</td></tr>`;
      } else {
        ridersBody.innerHTML = team.riders.map((rider, idx) => `
          <tr>
            <td style="vertical-align: middle;">${idx + 1}</td>
            <td style="vertical-align: middle;">
              <strong>${escapeHtml(rider.riderName)}</strong>
              ${rider.riderTeam ? `<br><small class="text-muted">${escapeHtml(rider.riderTeam)}</small>` : ''}
            </td>
            <td style="vertical-align: middle;">${escapeHtml(rider.riderTeam || '-')}</td>
            <td style="vertical-align: middle;"><span class="fw-bold text-success">€${rider.riderPrice || 0}M</span></td>
            <td style="vertical-align: middle;"><span class="badge ${(rider.points || 0) > 0 ? 'bg-success' : 'bg-secondary'}">${rider.points || 0} pts</span></td>
          </tr>
        `).join('');
      }
      
    } catch (err) {
      console.error("Error:", err);
      ridersBody.innerHTML = `<td><td colspan="5" class="text-center text-danger">❌ Error: ${err.message}</td></tr>`;
      if (teamStageInfo) teamStageInfo.innerHTML = `<span class="text-danger">❌ Error: ${err.message}</span>`;
    }
  } else {
    // Cargar puntos por etapa específica
    const stageNumber = parseInt(selectedValue);
    if (teamStageInfo) teamStageInfo.innerHTML = '<span class="text-info">⏳ Cargando puntos de la etapa...</span>';
    
    try {
      // Obtener el equipo completo
      const teamResponse = await fetch(`${API_BASE_URL}/ranking/team/${teamId}`);
      if (!teamResponse.ok) throw new Error("Error al cargar equipo");
      
      const teamData = await teamResponse.json();
      if (!teamData.success) throw new Error(teamData.error);
      
      const team = teamData.team;
      
      // Obtener la etapa
      const stageResponse = await fetch(`${API_BASE_URL}/results/stage/${stageNumber}`);
      const stageResult = await stageResponse.json();
      
      let stage = null;
      if (stageResult.success && stageResult.stage) {
        stage = stageResult.stage;
      }
      
      // Sistema de puntuación
      const stagePoints = {
        1: 220, 2: 180, 3: 160, 4: 140, 5: 120,
        6: 110, 7: 95, 8: 80, 9: 70, 10: 60,
        11: 50, 12: 40, 13: 35, 14: 30, 15: 25,
        16: 20, 17: 16, 18: 12, 19: 8, 20: 4
      };
      
      const gcDailyPoints = {
        1: 30, 2: 26, 3: 22, 4: 18, 5: 16,
        6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
        11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
        16: 5, 17: 4, 18: 3, 19: 2, 20: 1
      };
      
      function getStagePoints(position) {
        return stagePoints[position] || 0;
      }
      
      function getGcDailyPoints(position) {
        if (!position) return 0;
        return gcDailyPoints[position] || 0;
      }
      
      function cleanNameForComparison(name) {
        if (!name) return '';
        return name.replace(/^\d+\s+/, '').trim().toLowerCase();
      }
      
      // Calcular puntos para cada rider en esta etapa
      const ridersWithStagePoints = [];
      let totalStagePoints = 0;
      
      for (const rider of team.riders) {
        let riderPoints = 0;
        let position = null;
        let gcPosition = null;
        
        if (stage && stage.results) {
          for (const result of stage.results) {
            const resultCleanName = cleanNameForComparison(result.riderName);
            const riderCleanName = cleanNameForComparison(rider.riderName);
            
            if (resultCleanName === riderCleanName || 
                resultCleanName.includes(riderCleanName) || 
                riderCleanName.includes(resultCleanName) ||
                (resultCleanName.split(' ').pop() === riderCleanName.split(' ').pop())) {
              
              position = result.position;
              gcPosition = result.gcPosition || result.generalClassificationPosition;
              riderPoints = getStagePoints(position) + getGcDailyPoints(gcPosition);
              break;
            }
          }
        }
        
        ridersWithStagePoints.push({
          riderId: rider.riderId,
          riderName: rider.riderName,
          riderTeam: rider.riderTeam,
          riderPrice: rider.riderPrice,
          points: rider.points,
          stagePoints: riderPoints,
          position: position,
          gcPosition: gcPosition
        });
        
        totalStagePoints += riderPoints;
      }
      
      // Actualizar puntos totales mostrados
      if (totalPointsSpan) totalPointsSpan.textContent = totalStagePoints.toLocaleString();
      
      const hasResults = stage && stage.results && stage.results.length > 0;
      if (teamStageInfo) {
        if (!hasResults) {
          teamStageInfo.innerHTML = '<span class="text-warning">⚠️ No hay resultados disponibles para esta etapa. Usa el botón "Actualizar desde web" en la sección de resultados.</span>';
        } else {
          teamStageInfo.innerHTML = `<span class="text-success">✅ Etapa ${stageNumber} ${stage?.name ? `- ${stage.name}` : ''} (puntos de etapa)</span>`;
        }
      }
      
      // Ordenar por puntos de etapa (mayor a menor)
      ridersWithStagePoints.sort((a, b) => b.stagePoints - a.stagePoints);
      
      // Renderizar tabla con puntos de etapa
      if (ridersWithStagePoints.length === 0) {
        ridersBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">🚴 No hay corredores en este equipo</td></tr>`;
      } else {
ridersBody.innerHTML = ridersWithStagePoints.map((rider, idx) => {
  const hasStagePoints = rider.stagePoints > 0;
  const isRetired = rider.isRetired === true || rider.status === 'retired' || (rider.stagePoints === 0 && rider.riderPrice > 5);
  const retiredMark = isRetired ? ' <span style="color: #dc3545; font-weight: bold;">(X)</span>' : '';
  const retiredClass = isRetired ? 'retired-name' : '';
  
  return `
    <tr>
      <td style="vertical-align: middle;">
        ${idx + 1} ${idx === 0 && hasStagePoints ? '🏆' : ''}
      </td>
      <td style="vertical-align: middle;">
        <strong class="${retiredClass}">${escapeHtml(rider.riderName)}</strong>${retiredMark}
        ${rider.position ? `<br><small class="text-muted">📍 Pos etapa: ${rider.position}${rider.gcPosition ? ` | GC: ${rider.gcPosition}` : ''}</small>` : ''}
        ${rider.riderTeam ? `<br><small class="text-muted">${escapeHtml(rider.riderTeam)}</small>` : ''}
      </td>
      <td style="vertical-align: middle;">${escapeHtml(rider.riderTeam || '-')}</td>
      <td style="vertical-align: middle;"><span class="fw-bold text-success">€${rider.riderPrice || 0}M</span></td>
      <td style="vertical-align: middle;">
        <span class="badge ${hasStagePoints ? 'bg-success' : 'bg-secondary'}">${rider.stagePoints} pts</span>
      </td>
    </tr>
  `;
}).join('');
      }
      
    } catch (err) {
      console.error("Error:", err);
      ridersBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">❌ Error: ${err.message}</td></tr>`;
      if (teamStageInfo) teamStageInfo.innerHTML = `<span class="text-danger">❌ Error: ${err.message}</span>`;
    }
  }
}

// Cerrar modal de detalles del equipo
function closeTeamDetailsModal() {
  const modal = document.getElementById("teamDetailsModal");
  if (modal) modal.style.display = "none";
}

// Inicializar página de clasificación
async function initRankingPage() {
  await loadRanking();
  
  const searchInput = document.getElementById("rankingSearchInput");
  if (searchInput) {
    searchInput.removeEventListener("input", searchRanking);
    searchInput.addEventListener("input", searchRanking);
  }
}

// Añadir estilos para las filas del ranking
function addRankingStyles() {
  if (document.getElementById('ranking-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ranking-styles';
  style.textContent = `
    .team-row {
      transition: all 0.2s ease;
    }
    .team-row:hover {
      background-color: #f0f7ff !important;
      transform: translateX(5px);
    }
    .team-row:active {
      transform: scale(0.99);
    }
  `;
  document.head.appendChild(style);
}

//Actualizar info de corredores (estado y estadistica)
// app.js - Reemplazar la función updateRiderStatuses existente

async function updateRiderStatuses() {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos");
    return;
  }
  
  // Confirmar con el usuario
  if (!confirm("⚠️ ¿Estás seguro de que quieres actualizar TODOS los ciclistas?\n\nEste proceso puede tomar varios minutos dependiendo de la cantidad de ciclistas.\n\nSe actualizarán: fotos, equipos, especialidades, rankings, etc.")) {
    return;
  }
  
  const btn = document.getElementById("updateStatusesBtn");
  if (!btn) return;
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando todos los ciclistas...';
  
  // Mostrar progreso
  let progressDiv = document.createElement('div');
  progressDiv.id = 'updateProgress';
  progressDiv.innerHTML = `
    <div class="alert alert-info mt-3">
      <strong>🔄 Actualizando ciclistas...</strong>
      <div class="progress mt-2" style="height: 20px;">
        <div id="updateProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%">0%</div>
      </div>
      <div id="updateStatus" class="mt-2 small text-muted">Iniciando actualización...</div>
    </div>
  `;
  btn.parentNode.insertBefore(progressDiv, btn.nextSibling);
  
  try {
    // Llamar a la nueva ruta que creamos
    const response = await fetch(`${API_BASE_URL}/riders/update-all-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Actualizar la barra de progreso al 100%
      const progressBar = document.getElementById('updateProgressBar');
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        progressBar.classList.remove('progress-bar-animated');
      }
      
      const statusDiv = document.getElementById('updateStatus');
      if (statusDiv) {
        statusDiv.innerHTML = `
          ✅ <strong>Actualización completada!</strong><br>
          📊 ${data.updated} ciclistas actualizados correctamente<br>
          ${data.errors > 0 ? `⚠️ ${data.errors} ciclistas con errores<br>` : ''}
          ${data.failedRiders && data.failedRiders.length > 0 ? `⚠️ Fallaron: ${data.failedRiders.slice(0, 5).join(', ')}${data.failedRiders.length > 5 ? '...' : ''}` : ''}
        `;
        statusDiv.className = 'mt-2 small text-success';
      }
      
      alert(`✅ Actualización completada!\n\n${data.updated} ciclistas actualizados correctamente\n${data.errors} errores`);
      
      // Recargar datos y refrescar tabla
      await loadRiders();
      if (document.querySelector('[data-page="riders"].active')) {
        await renderTableWithTeamStatus();
      }
    } else {
      throw new Error(data.error || "Error desconocido");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error al actualizar datos: " + err.message);
    
    const statusDiv = document.getElementById('updateStatus');
    if (statusDiv) {
      statusDiv.innerHTML = `❌ Error: ${err.message}`;
      statusDiv.className = 'mt-2 small text-danger';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
    
    // Eliminar el div de progreso después de 5 segundos
    setTimeout(() => {
      const progressDiv = document.getElementById('updateProgress');
      if (progressDiv) progressDiv.remove();
    }, 5000);
  }
}



// Función para cargar datos del ciclista desde la BD (no Wikipedia)
async function loadRiderData(riderId, riderName) {
  try {
    const modal = document.getElementById("riderModal");
    const modalBody = document.getElementById("riderModalBody");
    const modalTitle = document.getElementById("riderModalTitle");
    
    if (!modal || !modalBody) return;
    
    modal.style.display = "block";
    modalTitle.textContent = "Cargando...";
    modalBody.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando datos de ${escapeHtml(riderName)}...</p>
      </div>
    `;
    
    const response = await fetch(`${API_BASE_URL}/riders/rider-data/${riderId}`);
    
    if (!response.ok) {
      throw new Error("Error al cargar datos del ciclista");
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    renderRiderDetailsModal(result.data);
    
  } catch (err) {
    console.error("Error cargando datos:", err);
    const modalBody = document.getElementById("riderModalBody");
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="alert alert-warning">
          <strong>⚠️ Error:</strong> ${err.message}
          <p class="mt-2 mb-0">No se pudieron cargar los datos del ciclista.</p>
        </div>
      `;
    }
  }
}



function renderRiderDetailsModal(rider) {
  const modalTitle = document.getElementById("riderModalTitle");
  const modalBody = document.getElementById("riderModalBody");
  
  if (!modalTitle || !modalBody) return;
  
  modalTitle.textContent = rider.name;
  
  const riderId = rider._id;
  
  // ========== FUNCIÓN PARA EXTRAER ESPECIALIDADES ==========
  function extractSpecialties(data) {
    const possiblePaths = [
      'specialties',
      'pcsData.specialties',
      'pcsData.specialty',
      'speciality',
      'specialtyData'
    ];
    
    function getValueByPath(obj, path) {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    }
    
    for (const path of possiblePaths) {
      const specialties = getValueByPath(data, path);
      if (specialties && typeof specialties === 'object' && Object.keys(specialties).length > 0) {
        const expectedKeys = ['onedayraces', 'gc', 'tt', 'sprint', 'climber', 'hills'];
        const hasExpectedKey = expectedKeys.some(key => specialties[key] !== undefined);
        if (hasExpectedKey) return specialties;
      }
    }
    return null;
  }
  
  // Extraer especialidades
  let specialties = extractSpecialties(rider);
  if (!specialties && rider.specialties && typeof rider.specialties === 'object') {
    specialties = rider.specialties;
  }
  
  // Configuración de especialidades
  const specialtyConfig = {
    onedayraces: { label: "Clásicas / One Day", icon: "🏁", color: "#28a745" },
    gc: { label: "General Classification (GC)", icon: "👑", color: "#dc3545" },
    tt: { label: "Contrarreloj (TT)", icon: "⏱️", color: "#17a2b8" },
    sprint: { label: "Velocista (Sprint)", icon: "💨", color: "#fd7e14" },
    climber: { label: "Escalador (Climber)", icon: "⛰️", color: "#6f42c1" },
    hills: { label: "Rodador (Hills)", icon: "📈", color: "#e83e8c" }
  };
  
  // Normalizar valores de especialidades y encontrar el máximo
  const normalizedSpecialties = {};
  let maxSpecialtyValue = 0;
  let hasAnySpecialty = false;
  
  if (specialties) {
    for (const [key, config] of Object.entries(specialtyConfig)) {
      let value = specialties[key];
      if (value === undefined) value = specialties[config.label.toLowerCase()];
      if (value === undefined) value = specialties[key.toLowerCase()];
      
      if (typeof value === 'string') value = parseInt(value) || 0;
      if (typeof value !== 'number') value = 0;
      
      // Guardar el valor original sin normalizar
      normalizedSpecialties[key] = value;
      if (value > maxSpecialtyValue) {
        maxSpecialtyValue = value;
      }
      if (value > 0) hasAnySpecialty = true;
    }
  }
  
  // Si no hay especialidades o todas son 0, usar valores por defecto
  if (!hasAnySpecialty) {
    // Datos de ejemplo para mostrar la estructura
    for (const key of Object.keys(specialtyConfig)) {
      normalizedSpecialties[key] = 0;
    }
    maxSpecialtyValue = 100; // Valor por defecto para la escala
  }
  
  // Si el máximo es 0, usar 100 como fallback
  if (maxSpecialtyValue === 0) maxSpecialtyValue = 100;
  
  const getSpecialtyBar = (key, config, value) => {
    // Calcular porcentaje basado en el valor máximo de ESTE corredor
    const percentage = maxSpecialtyValue > 0 ? (value / maxSpecialtyValue) * 100 : 0;
    
    // Mostrar el valor real (no normalizado)
    const displayValue = value.toLocaleString();
    
    return `
      <div class="specialty-item mb-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="specialty-label" style="font-size: 0.85rem; font-weight: 500; min-width: 160px;">
            ${config.icon} ${config.label}
          </span>
          <span class="specialty-value fw-bold" style="color: ${config.color}; font-size: 0.9rem;">
            ${displayValue}
          </span>
        </div>
        <div class="progress" style="height: 10px; background-color: #e9ecef; border-radius: 5px; overflow: hidden;">
          <div class="progress-bar" style="width: ${percentage}%; background-color: ${config.color}; border-radius: 5px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);"></div>
        </div>
      </div>
    `;
  };
  
  // ========== EXTRAER DATOS PERSONALES ==========
  const pcsData = rider.pcsData || {};
  
  // ========== OBTENER Y CORREGIR URL DE LA FOTO ==========
  let photoUrl = null;
  
  const possiblePhotoSources = [
    rider.photo,
    rider.pcsData?.photo,
    pcsData.photo,
    rider.photoUrl,
    rider.image
  ];
  
  for (const source of possiblePhotoSources) {
    if (source && source !== 'null' && source !== '') {
      const cleanedUrl = fixPhotoUrl(source);
      if (cleanedUrl) {
        photoUrl = cleanedUrl;
        break;
      }
    }
  }
  
  if (!photoUrl && rider.pcsData) {
    const searchForPhoto = (obj, depth = 0) => {
      if (depth > 3) return null;
      for (const key of ['photo', 'image', 'img', 'picture', 'avatar']) {
        if (obj[key] && typeof obj[key] === 'string' && obj[key] !== 'null' && obj[key] !== '') {
          return fixPhotoUrl(obj[key]);
        }
      }
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          const found = searchForPhoto(obj[key], depth + 1);
          if (found) return found;
        }
      }
      return null;
    };
    const foundPhoto = searchForPhoto(rider.pcsData);
    if (foundPhoto) photoUrl = foundPhoto;
  }
  
  if (photoUrl && !photoUrl.startsWith('http')) {
    if (photoUrl.startsWith('//')) {
      photoUrl = 'https:' + photoUrl;
    } else if (!photoUrl.startsWith('https://') && !photoUrl.startsWith('http://')) {
      photoUrl = 'https://www.procyclingstats.com' + (photoUrl.startsWith('/') ? '' : '/') + photoUrl;
    }
  }
  
  const team = rider.team || pcsData.team || 'Sin equipo';
  const nationality = rider.nationality || pcsData.nationality || null;
  const age = rider.age || pcsData.age || null;
  const height = rider.height || pcsData.height || null;
  const weight = rider.weight || pcsData.weight || null;
  const birthDate = pcsData.birthDate || rider.dateOfBirth || null;
  const placeOfBirth = pcsData.placeOfBirth || rider.placeOfBirth || null;
  const specialty = rider.specialty || rider.riderType || pcsData.riderType || pcsData.specialty || null;
  
  const uciRank = rider.uciRank || pcsData.uciRank || null;
  const uciPoints = rider.uciPoints || pcsData.uciPoints || 0;
  const pcsRank = pcsData.pcsRank || null;
  
  const wins = rider.wins || pcsData.wins || 0;
  const gcWins = pcsData.gcWins || 0;
  const stageWins = pcsData.stageWins || 0;
  const grandTourWins = pcsData.grandTourWins || 0;
  
  let birthDateFormatted = '-';
  let ageDisplay = '-';
  if (birthDate) {
    birthDateFormatted = birthDate;
    if (age) ageDisplay = `${age} años`;
  } else if (age) {
    ageDisplay = `${age} años`;
  }
  
  let heightDisplay = '-';
  let weightDisplay = '-';
  if (height) {
    heightDisplay = typeof height === 'number' ? `${height.toFixed(2)}m` : height;
  }
  if (weight) {
    weightDisplay = typeof weight === 'number' ? `${weight}kg` : weight;
  }
  
  const hasRanking = uciRank || uciPoints > 0 || pcsRank;
  const hasPalmares = wins > 0 || gcWins > 0 || stageWins > 0 || grandTourWins > 0;
  
  const grandTours = rider.grandTours || pcsData.grandTours || 0;
  const tourStarts = pcsData.tourStarts || 0;
  const giroStarts = pcsData.giroStarts || 0;
  const vueltaStarts = pcsData.vueltaStarts || 0;
  const monumentWins = pcsData.monumentWins || 0;
  
  const popularity = rider.popularity || pcsData.popularity || null;
  const biography = pcsData.biography || '';
  
  // Mostrar información de escala
  const scaleInfo = hasAnySpecialty && maxSpecialtyValue > 100 ? 
    `<div class="text-muted small mb-2 text-end">📊 Escala relativa (máximo: ${maxSpecialtyValue.toLocaleString()})</div>` : '';
  
  let html = `
    <style>
      .specialty-item {
        transition: all 0.2s ease;
      }
      .specialty-item:hover {
        transform: translateX(5px);
      }
      .rider-stat-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: default;
      }
      .rider-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .team-badge {
        display: inline-block;
        background: linear-gradient(135deg, #006630 0%, #004d24 100%);
        color: white;
        padding: 2px 8px;
        border-radius: 16px;
        font-size: 0.7rem;
        font-weight: 500;
        margin-top: 4px;
      }
      .stat-number {
        font-size: 1.5rem;
        font-weight: bold;
        line-height: 1.2;
      }
      .specialties-container {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 12px;
        margin-top: 0.5rem;
      }
      .progress {
        background-color: #e9ecef !important;
        border-radius: 8px !important;
      }
      .progress-bar {
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .info-section {
        margin-bottom: 1.5rem;
      }
      .info-section h6 {
        font-weight: 700;
        border-left: 4px solid #006630;
        padding-left: 0.75rem;
        margin-bottom: 1rem;
        color: #1a1a2e;
      }
      .update-rider-btn {
        transition: all 0.3s ease;
      }
      .update-rider-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .rider-photo {
        width: 100%;
        max-width: 160px;
        height: 160px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        object-fit: cover;
        object-position: top;
      }
    </style>
    
<!-- Botón de actualización (solo admin) -->
${currentUser?.isAdmin ? `
<div class="mb-3 text-end">
  <button id="updateRiderBtn" class="btn btn-sm btn-warning update-rider-btn" onclick="updateSingleRider('${riderId}')" style="background-color: #ffc107; border: none; color: #000;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
      <path d="M23 4v6h-6"></path>
      <path d="M1 20v-6h6"></path>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
    </svg>
    🔄 Actualizar datos de este ciclista
  </button>
</div>
` : ''}
    
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
      <!-- Foto -->
      <div style="flex: 0 0 160px; text-align: center;">
        ${photoUrl ? 
          `<img src="${photoUrl}" alt="${rider.name}" class="rider-photo" loading="lazy" onerror="this.style.display='none'">` :
          `<div style="width: 160px; height: 160px; background: linear-gradient(135deg, #006630 0%, #004d24 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 3.5rem;">🚴</span>
          </div>`
        }
        ${team && team !== 'Sin equipo' ? `<div class="team-badge">${escapeHtml(team)}</div>` : ''}
      </div>
      
      <!-- Información principal -->
      <div style="flex: 1;">
        <h3 class="mb-2" style="color: #1a1a2e;">${escapeHtml(rider.name)}</h3>
        ${specialty ? `<span class="badge bg-primary me-2 mb-2">🏆 ${escapeHtml(specialty)}</span>` : ''}
        ${rider.teamCode ? `<span class="badge bg-secondary mb-2">${escapeHtml(rider.teamCode)}</span>` : ''}
        
        <div class="row g-2 mt-2">
          <div class="col-md-6">
            <div class="rider-stat-card p-2 bg-light rounded">
              <small class="text-muted d-block">📅 Nacimiento</small>
              <strong>${birthDateFormatted}</strong>
              ${ageDisplay !== '-' ? `<span class="text-muted ms-2">(${ageDisplay})</span>` : ''}
            </div>
          </div>
          <div class="col-md-6">
            <div class="rider-stat-card p-2 bg-light rounded">
              <small class="text-muted d-block">🌍 Nacionalidad</small>
              <strong>${nationality ? getFlagEmoji(nationality) + ' ' + escapeHtml(nationality) : '-'}</strong>
            </div>
          </div>
          <div class="col-md-6">
            <div class="rider-stat-card p-2 bg-light rounded">
              <small class="text-muted d-block">📏 Altura / Peso</small>
              <strong>${heightDisplay} / ${weightDisplay}</strong>
            </div>
          </div>
          <div class="col-md-6">
            <div class="rider-stat-card p-2 bg-light rounded">
              <small class="text-muted d-block">📍 Lugar de nacimiento</small>
              <strong>${escapeHtml(placeOfBirth || '-')}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // SECCIÓN DE ESPECIALIDADES CON ESCALA RELATIVA
  html += `
    <div class="info-section">
      <h6>📊 Especialidades del Ciclista</h6>
      ${scaleInfo}
      <div class="specialties-container">
  `;
  
  if (hasAnySpecialty) {
    let displayedCount = 0;
    for (const [key, config] of Object.entries(specialtyConfig)) {
      const value = normalizedSpecialties[key];
      if (value > 0) {
        html += getSpecialtyBar(key, config, value);
        displayedCount++;
      }
    }
    // También mostrar las que tienen valor 0 para que se vea que están en 0
    for (const [key, config] of Object.entries(specialtyConfig)) {
      const value = normalizedSpecialties[key];
      if (value === 0) {
        html += getSpecialtyBar(key, config, 0);
      }
    }
    if (displayedCount === 0) {
      html += `<div class="alert alert-warning text-center py-3 mb-0">⚠️ No hay datos de especialidades disponibles</div>`;
    }
  } else {
    html += `<div class="alert alert-info text-center py-3 mb-0">📭 Sin datos de especialidades. Haz clic en "Actualizar datos" para obtenerlos.</div>`;
  }
  
  html += `</div></div>`;
  
  // RANKING UCI
  if (hasRanking) {
    html += `
      <div class="info-section">
        <h6>📊 Clasificación UCI</h6>
        <div class="row">
          <div class="col-md-4 mb-2"><div class="text-center p-2 bg-light rounded rider-stat-card"><div class="stat-number text-primary">${uciRank || '-'}</div><small>Puesto Mundial</small></div></div>
          <div class="col-md-4 mb-2"><div class="text-center p-2 bg-light rounded rider-stat-card"><div class="stat-number text-success">${uciPoints > 0 ? uciPoints.toLocaleString() : '-'}</div><small>Puntos UCI</small></div></div>
          <div class="col-md-4 mb-2"><div class="text-center p-2 bg-light rounded rider-stat-card"><div class="stat-number text-info">${pcsRank || '-'}</div><small>Puesto PCS</small></div></div>
        </div>
      </div>
    `;
  }
  
  // PALMARÉS
  if (hasPalmares) {
    html += `
      <div class="info-section">
        <h6>🏆 Palmarés</h6>
        <div class="row">
          <div class="col-md-3 mb-2"><div class="text-center p-2 bg-success bg-opacity-10 rounded"><div class="stat-number text-success">${wins}</div><small>Victorias</small></div></div>
          <div class="col-md-3 mb-2"><div class="text-center p-2 bg-danger bg-opacity-10 rounded"><div class="stat-number text-danger">${gcWins}</div><small>GC Victorias</small></div></div>
          <div class="col-md-3 mb-2"><div class="text-center p-2 bg-warning bg-opacity-10 rounded"><div class="stat-number text-warning">${stageWins}</div><small>Etapas</small></div></div>
          <div class="col-md-3 mb-2"><div class="text-center p-2 bg-info bg-opacity-10 rounded"><div class="stat-number text-info">${grandTourWins}</div><small>Grandes Vueltas</small></div></div>
        </div>
      </div>
    `;
  }
  
  // GRANDES VUELTAS
  if (grandTours > 0 || tourStarts > 0 || giroStarts > 0 || vueltaStarts > 0) {
    let gtText = '';
    if (grandTours > 0) gtText += `${grandTours} participaciones`;
    if (tourStarts > 0) gtText += ` | Tour: ${tourStarts}`;
    if (giroStarts > 0) gtText += ` | Giro: ${giroStarts}`;
    if (vueltaStarts > 0) gtText += ` | Vuelta: ${vueltaStarts}`;
    html += `<div class="alert alert-secondary p-2 text-center mb-3"><strong>📌 Grandes Vueltas:</strong> ${gtText}</div>`;
  }
  
  // POPULARIDAD
  if (popularity && popularity > 0) {
    html += `<div class="text-center p-2 bg-light rounded mb-3"><small>⭐ Popularidad</small><div class="h5 mb-0">${popularity.toLocaleString()}</div></div>`;
  }
  
  // BIOGRAFÍA
  if (biography && biography.length > 50) {
    const bioShort = biography.length > 400 ? biography.substring(0, 400) + '...' : biography;
    html += `<div class="info-section"><h6>📝 Biografía</h6><p style="font-size:0.9rem;color:#555;">${escapeHtml(bioShort)}</p></div>`;
  }
  
  // FECHA ACTUALIZACIÓN
  const lastUpdate = pcsData.lastUpdated || rider.updatedAt;
  if (lastUpdate) {
    html += `<div class="text-center mt-3 pt-2 border-top"><small class="text-muted">Última actualización: ${new Date(lastUpdate).toLocaleString()}</small></div>`;
  }
  
  modalBody.innerHTML = html;
}



async function updateSingleRider(riderId) {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para actualizar ciclistas");
    return;
  }
  
  // Obtener el nombre del rider desde el modal
  const modalTitle = document.getElementById("riderModalTitle");
  const riderName = modalTitle ? modalTitle.textContent : "este ciclista";
  
  if (!confirm(`¿Actualizar los datos de ${riderName}?\n\nEsto obtendrá la información más reciente desde ProCyclingStats.`)) {
    return;
  }
  
  // Cambiar el botón a estado de carga
  const updateBtn = document.getElementById("updateRiderBtn");
  if (!updateBtn) {
    console.error("No se encontró el botón de actualizar");
    return;
  }
  
  const originalText = updateBtn.innerHTML;
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/riders/update-single/${riderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${riderName} actualizado correctamente!\n\n${data.updatedFields || 'Datos actualizados'}`);
      
      // Recargar los datos del rider y actualizar el modal
      const riderResponse = await fetch(`${API_BASE_URL}/riders/rider-data/${riderId}`);
      const riderData = await riderResponse.json();
      
      if (riderData.success) {
        renderRiderDetailsModal(riderData.data);
      }
      
      // Recargar la tabla de corredores
      await loadRiders();
      if (document.querySelector('[data-page="riders"].active')) {
        await renderTableWithTeamStatus();
      }
    } else {
      throw new Error(data.error || "Error desconocido");
    }
  } catch (err) {
    console.error("Error actualizando:", err);
    alert(`❌ Error al actualizar: ${err.message}`);
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.innerHTML = originalText;
    }
  }
}

// Hacer la función global
window.updateSingleRider = updateSingleRider;

// Hacer la función global para que pueda ser llamada desde el HTML
window.updateSingleRider = updateSingleRider;

// Actualizar precio de corredor (solo admin)
async function updateRiderPrice(riderId, price) {
  if (!currentUser?.isAdmin) {
    alert("No tienes permisos para editar precios");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/update-rider-price/${riderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, price: parseInt(price) })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(`❌ Error: ${error.error}`);
      return;
    }
    
    const data = await response.json();
    alert("✅ Precio actualizado correctamente");
    
    // Actualizar el precio en los datos locales
    const rider = allRidersData.find(r => r._id === riderId);
    if (rider) {
      rider.price = parseInt(price);
    }
    
    // Recargar la tabla
    await renderTableWithTeamStatus();
  } catch (err) {
    console.error("Error al actualizar precio:", err);
    alert(`❌ Error: ${err.message}`);
  }
}



// app.js - Modificar la parte de loadStageResults donde se renderiza

async function loadStageResults(stageNumber) {
  const resultsContent = document.getElementById("resultsContent");
  
  resultsContent.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-3">Cargando resultados de ${stageNumber === 'general' ? 'la clasificación general' : `la etapa ${stageNumber}`}...</p>
    </div>
  `;
  
  try {
    let url;
    if (stageNumber === 'general') {
      url = `${API_BASE_URL}/results/general-classification`;
    } else {
      url = `${API_BASE_URL}/results/stage/${stageNumber}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        resultsContent.innerHTML = `
          <div class="alert alert-warning">
            <strong>⚠️ Resultados no disponibles</strong>
            <p class="mb-0 mt-2">No hay resultados disponibles para ${stageNumber === 'general' ? 'la clasificación general' : `la etapa ${stageNumber}`}.</p>
            <hr>
            <p class="mb-0">Usa el botón <strong>"Actualizar desde web"</strong> para obtener los resultados desde ProCyclingStats.</p>
          </div>
        `;
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Error al cargar datos");
    }
    
    if (stageNumber === 'general') {
      if (data.classification && data.classification.length > 0) {
        renderGeneralClassification(data.classification);
      } else {
        resultsContent.innerHTML = `
          <div class="alert alert-info">
            <strong>ℹ️ Sin datos de clasificación general</strong>
            <p class="mb-0 mt-2">Aún no hay datos de clasificación general. Usa el botón "Actualizar desde web".</p>
          </div>
        `;
      }
    } else {
      if (data.stage && data.stage.results && data.stage.results.length > 0) {
        // Limpiar los tiempos duplicados en los datos antes de renderizar
        const cleanedStage = {
          ...data.stage,
          results: data.stage.results.map(result => {
            let cleanTime = result.time || '-';
            // Limpiar tiempo duplicado
            if (cleanTime && cleanTime.length > 10) {
              const halfLength = Math.floor(cleanTime.length / 2);
              const firstHalf = cleanTime.substring(0, halfLength);
              const secondHalf = cleanTime.substring(halfLength);
              if (firstHalf === secondHalf) {
                cleanTime = firstHalf;
              }
            }
            return { ...result, time: cleanTime };
          })
        };
        renderStageResults(cleanedStage);
      } else {
        resultsContent.innerHTML = `
          <div class="alert alert-info">
            <strong>ℹ️ Sin resultados para la etapa ${stageNumber}</strong>
            <p class="mb-0 mt-2">Aún no hay resultados para esta etapa. Usa el botón "Actualizar desde web".</p>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error("Error cargando resultados:", err);
    resultsContent.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Error:</strong> ${err.message}
        <p class="mt-2 mb-0">No se pudieron cargar los resultados.</p>
        <hr>
        <p class="mb-0">Usa el botón <strong>"Actualizar desde web"</strong> para obtener los resultados desde ProCyclingStats.</p>
      </div>
    `;
  }
}
// app.js - Reemplazar la función renderStageResults

function renderStageResults(stage) {
  const resultsContent = document.getElementById("resultsContent");
  
  if (!stage.results || stage.results.length === 0) {
    resultsContent.innerHTML = `
      <div class="alert alert-warning">
        <strong>⚠️ Sin resultados disponibles</strong>
        <p class="mb-0 mt-2">No hay resultados disponibles para la etapa ${stage.stageNumber}.</p>
      </div>
    `;
    return;
  }
  
  // Limpiar el nombre de la etapa
  let stageName = stage.name || '';
  if (stageName && stage.distanceKm) {
    stageName = stageName.replace(new RegExp(`\\s*${stage.distanceKm}km\\s*`, 'i'), '');
    stageName = stageName.replace(/\s{2,}/g, ' ').trim();
  }
  
  // Función para limpiar tiempo duplicado
  function cleanTimeValue(time) {
    if (!time || time === '-') return '-';
    let cleanTime = time.trim();
    
    if (cleanTime.length > 10) {
      const halfLength = Math.floor(cleanTime.length / 2);
      const firstHalf = cleanTime.substring(0, halfLength);
      const secondHalf = cleanTime.substring(halfLength);
      if (firstHalf === secondHalf) {
        cleanTime = firstHalf;
      }
    }
    
    if (cleanTime === ',,' || cleanTime === ',,0:00' || cleanTime === '0:00' || cleanTime === ',,0' || cleanTime === '0,0') {
      return '-';
    }
    
    if (cleanTime.startsWith(',,')) {
      cleanTime = cleanTime.substring(2);
      if (cleanTime === '0:00' || cleanTime === '0,0') return '-';
    }
    
    return cleanTime;
  }
  
  // Función para obtener el texto de posición SIN fondo
  function getPositionText(result) {
    if (result.positionType === 'DNF') {
      return '<span style="color: #dc3545; font-weight: bold;">❌ DNF</span>';
    }
    if (result.positionType === 'DNS') {
      return '<span style="color: #fd7e14; font-weight: bold;">⚠️ DNS</span>';
    }
    if (result.positionType === 'DSQ') {
      return '<span style="color: #6c757d; font-weight: bold;">⛔ DSQ</span>';
    }
    if (result.positionType === 'OTL') {
      return '<span style="color: #6c757d; font-weight: bold;">⏱️ OTL</span>';
    }
    // Solo el número, sin badge ni fondo
    return `<strong>${result.positionDisplay || result.position}</strong>`;
  }
  
  resultsContent.innerHTML = `
    <div class="alert alert-success mb-3">
      <strong>📍 Etapa ${stage.stageNumber}</strong>
      ${stageName ? `<br><small class="text-muted">${stageName}</small>` : ''}
      ${stage.distanceKm ? `<br><small class="text-muted">📏 ${stage.distanceKm} km</small>` : ''}
      <span class="badge bg-info ms-2">Actualizado: ${new Date(stage.lastUpdated).toLocaleString()}</span>
    </div>
    
    <div class="table-responsive">
      <table class="table table-hover table-striped" id="stageResultsTable">
        <thead class="table-dark">
          <tr>
            <th style="width: 80px;">Posición</th>
            <th>Corredor</th>
            <th>Equipo</th>
            <th>Tiempo</th>
            <th style="width: 80px;">Puntos</th>
          </tr>
        </thead>
        <tbody>
          ${stage.results.map(result => {
            // Limpiar tiempo duplicado
            let cleanTime = cleanTimeValue(result.time);
            
            // Para DNF/DNS, mostrar mensaje especial en tiempo
            let timeDisplay = cleanTime;
            if (result.positionType === 'DNF') timeDisplay = 'No terminó';
            if (result.positionType === 'DNS') timeDisplay = 'No salió';
            if (result.positionType === 'DSQ') timeDisplay = 'Descalificado';
            if (result.positionType === 'OTL') timeDisplay = 'Fuera de control';
            
            // Badge de retirado para el nombre
            const retiredBadge = (result.positionType === 'DNF' || result.positionType === 'DNS' || result.positionType === 'DSQ') 
              ? ' <span class="badge bg-danger" style="font-size: 0.7rem;">✖ RETIRADO</span>' 
              : '';
            
            // Icono de medalla para los primeros 3
            let medalIcon = '';
            if (!result.isRetired && result.position === 1) medalIcon = ' 🥇';
            else if (!result.isRetired && result.position === 2) medalIcon = ' 🥈';
            else if (!result.isRetired && result.position === 3) medalIcon = ' 🥉';
            
            return `
              <tr>
                <td style="vertical-align: middle;">${getPositionText(result)}${medalIcon}</td>
                <td style="vertical-align: middle;">
                  <strong>${escapeHtml(result.riderName)}</strong>${retiredBadge}
                  </td>
                <td style="vertical-align: middle;">${escapeHtml(result.team)}</td>
                <td style="vertical-align: middle;">${timeDisplay}</td>
                <td style="vertical-align: middle;"><span class="badge bg-success">${result.points || 0} pts</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// app.js - Reemplazar la función renderGeneralClassification

function renderGeneralClassification(classification) {
  const resultsContent = document.getElementById("resultsContent");
  
  if (!classification || classification.length === 0) {
    resultsContent.innerHTML = `
      <div class="alert alert-warning">
        <strong>⚠️ Sin clasificación disponible</strong>
        <p class="mb-0 mt-2">No hay clasificación general disponible actualmente.</p>
      </div>
    `;
    return;
  }
  
  // Función para limpiar tiempo duplicado
  function cleanTimeValue(time) {
    if (!time || time === '-') return '-';
    let cleanTime = time.trim();
    
    if (cleanTime.length > 10) {
      const halfLength = Math.floor(cleanTime.length / 2);
      const firstHalf = cleanTime.substring(0, halfLength);
      const secondHalf = cleanTime.substring(halfLength);
      if (firstHalf === secondHalf) {
        cleanTime = firstHalf;
      }
    }
    
    if (cleanTime === ',,' || cleanTime === ',,0:00' || cleanTime === '0:00') {
      return '-';
    }
    
    if (cleanTime.startsWith(',,')) {
      cleanTime = cleanTime.substring(2);
      if (cleanTime === '0:00') return '-';
    }
    
    return cleanTime;
  }
  
  // Función para obtener el texto de posición SIN fondo
  function getPositionText(result) {
    if (result.positionType === 'DNF') {
      return '<span style="color: #dc3545; font-weight: bold;">❌ DNF</span>';
    }
    if (result.positionType === 'DNS') {
      return '<span style="color: #fd7e14; font-weight: bold;">⚠️ DNS</span>';
    }
    if (result.positionType === 'DSQ') {
      return '<span style="color: #6c757d; font-weight: bold;">⛔ DSQ</span>';
    }
    // Solo el número, sin badge ni fondo
    return `<strong>${result.position}</strong>`;
  }
  
  resultsContent.innerHTML = `
    <div class="alert alert-info mb-3">
      <strong>🏆 Clasificación General de ${raceNameGlobal}</strong>
      <span class="badge bg-success ms-2">Actualizado: ${new Date().toLocaleString()}</span>
    </div>
    
    <div class="table-responsive">
      <table class="table table-hover table-striped" id="gcTable">
        <thead class="table-dark">
          <tr>
            <th style="width: 80px;">Posición</th>
            <th>Corredor</th>
            <th>Equipo</th>
            <th>Tiempo</th>
          </tr>
        </thead>
        <tbody>
          ${classification.map(result => {
            const cleanTime = cleanTimeValue(result.time);
            
            // Icono de medalla para los primeros 3
            let medalIcon = '';
            if (!result.isRetired && result.position === 1) medalIcon = ' 🥇';
            else if (!result.isRetired && result.position === 2) medalIcon = ' 🥈';
            else if (!result.isRetired && result.position === 3) medalIcon = ' 🥉';
            
            // Badge de retirado
            const retiredBadge = (result.positionType === 'DNF' || result.positionType === 'DNS' || result.positionType === 'DSQ') 
              ? ' <span class="badge bg-danger" style="font-size: 0.7rem;">✖ RETIRADO</span>' 
              : '';
            
            return `
              <tr>
                <td style="vertical-align: middle;">${getPositionText(result)}${medalIcon}</td>
                <td style="vertical-align: middle;">
                  <strong>${escapeHtml(result.riderName)}</strong>${retiredBadge}
                  </td>
                <td style="vertical-align: middle;">${escapeHtml(result.team)}</td>
                <td style="vertical-align: middle;">${cleanTime}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Inicializar página de resultados y cargar última etapa por defecto
async function initResultsPage() {
  const stageFilter = document.getElementById("stageFilter");
  if (stageFilter) {
    // Buscar la última etapa disponible en la base de datos
    try {
      const response = await fetch(`${API_BASE_URL}/results/last-stage`);
      const data = await response.json();
      
      if (data.success && data.lastStage) {
        // Seleccionar la última etapa
        stageFilter.value = `stage-${data.lastStage}`;
        loadStageResults(data.lastStage);
      } else {
        // Si no hay datos, seleccionar etapa 1 por defecto
        stageFilter.value = "stage-1";
        loadStageResults("1");
      }
    } catch (err) {
      console.error("Error cargando última etapa:", err);
      // Por defecto cargar etapa 1
      stageFilter.value = "stage-1";
      loadStageResults("1");
    }
  }
}

// Helper para iconos de medalla
function getMedalIcon(position) {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return '';
}

// Refrescar resultados
async function refreshResults() {
  const stageFilter = document.getElementById("stageFilter");
  const selectedValue = stageFilter.value;
  
  if (!selectedValue) {
    alert("Por favor, selecciona una etapa o la clasificación general primero");
    return;
  }
  
  const refreshBtn = document.getElementById("refreshResultsBtn");
  const originalText = refreshBtn.innerHTML;
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando...';
  
  try {
    let stageNumber;
    if (selectedValue === 'general') {
      stageNumber = 'general';
    } else {
      stageNumber = selectedValue.split('-')[1];
    }
    
    // Forzar recarga sin cache
    let url;
    if (stageNumber === 'general') {
      url = `${API_BASE_URL}/results/general-classification?cache=false`;
    } else {
      url = `${API_BASE_URL}/results/stage/${stageNumber}?cache=false`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Error al actualizar");
    }
    
    if (stageNumber === 'general') {
      renderGeneralClassification(data.classification);
    } else {
      renderStageResults(data.stage);
    }
    
    // Mostrar notificación de éxito
    showToast("✅ Datos actualizados correctamente", "success");
  } catch (err) {
    console.error("Error actualizando:", err);
    showToast("❌ Error al actualizar: " + err.message, "danger");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalText;
  }
}

async function updateSingleStage() {
  const stageInput = document.getElementById("stageToUpdate");
  const stageNumber = parseInt(stageInput.value);
  
  if (!stageNumber || stageNumber < 1 || stageNumber > 21) {
    alert("Por favor, introduce un número de etapa válido (1-21)");
    return;
  }
  
  if (!confirm(`¿Estás seguro de que quieres actualizar los resultados de la etapa ${stageNumber}?\nEsto actualizará los puntos de los corredores automáticamente.`)) {
    return;
  }
  
  const btn = document.getElementById("updateSingleStageBtn");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/update-stage-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId: currentUser.id,
        stageNumber: stageNumber 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.message}\n${data.ridersUpdated} corredores actualizados.`);
      stageInput.value = "";
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Error:", err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function updateAllStages() {
  if (!confirm("⚠️ ¿Estás seguro de que quieres actualizar TODAS las etapas?\n\nEsto puede tomar varios minutos. Los puntos de todos los corredores se recalcularán desde cero.")) {
    return;
  }
  
  const btn = document.getElementById("updateAllStagesBtn");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Actualizando todas las etapas...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/update-all-stages-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.message}\n${data.stagesUpdated} etapas actualizadas.\n${data.totalRidersUpdated} corredores recibieron puntos.`);
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error("Error:", err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}


// app.js - Añadir función para obtener corredores retirados

let retiredRidersMap = new Map(); // Mapa de IDs de corredores retirados

async function loadRetiredRiders() {
  try {
    const response = await fetch(`${API_BASE_URL}/riders/retired`);
    const data = await response.json();
    
    if (data.success) {
      retiredRidersMap.clear();
      data.retired.forEach(rider => {
        retiredRidersMap.set(rider._id.toString(), {
          reason: rider.retiredReason,
          stage: rider.retiredInStage
        });
      });
      console.log(`📋 Cargados ${retiredRidersMap.size} corredores retirados`);
    }
  } catch (err) {
    console.error("Error cargando corredores retirados:", err);
  }
}

// Función para verificar si un corredor está retirado
function isRiderRetired(riderId) {
  return retiredRidersMap.has(riderId);
}

// Función para obtener el motivo de retiro
function getRetiredReason(riderId) {
  const info = retiredRidersMap.get(riderId);
  return info ? info.reason : null;
}


// ==================== FUNCIONES PARA LA PÁGINA DE INICIO ====================

let userLeagues = [];
let currentHomeLeague = null;
let currentHomeStage = 'total';

// Cargar las ligas del usuario actual
async function loadUserLeagues() {
  if (!currentUser) return [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/leagues/user/${currentUser.id}`);
    if (!response.ok) throw new Error("Error al cargar tus ligas");
    
    userLeagues = await response.json();
    console.log(`📋 Cargadas ${userLeagues.length} ligas del usuario`);
    return userLeagues;
  } catch (err) {
    console.error("Error cargando ligas del usuario:", err);
    userLeagues = [];
    return [];
  }
}

// Rellenar el selector de ligas
function populateLeagueSelector() {
  const selector = document.getElementById("homeLeagueSelector");
  if (!selector) return;
  
  if (!userLeagues || userLeagues.length === 0) {
    selector.innerHTML = '<option value="">-- No estás en ninguna liga --</option>';
    const container = document.getElementById("homeRankingContainer");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning text-center">
          <strong>⚠️ No estás en ninguna liga</strong>
          <p class="mb-0 mt-2">Accede o crea una liga desde la sección <strong>Ligas</strong></p>
        </div>
      `;
    }
    return;
  }
  
  // Guardar el valor actual si existe
  const currentValue = selector.value;
  const validCurrentValue = currentValue && userLeagues.find(l => l._id === currentValue);
  
  // Rellenar el selector
  selector.innerHTML = userLeagues.map(league => 
    `<option value="${league._id}">${escapeHtml(league.name)} (${league.teams?.length || 0}/${league.maxTeams} equipos)</option>`
  ).join('');
  
  // Si hay un valor válido actual, mantenerlo; si no, seleccionar la primera
  if (validCurrentValue) {
    selector.value = currentValue;
    currentHomeLeague = userLeagues.find(l => l._id === currentValue);
  } else {
    selector.value = userLeagues[0]._id;
    currentHomeLeague = userLeagues[0];
  }
  
  console.log("✅ Liga seleccionada:", currentHomeLeague?.name);
}

// Cargar datos de la liga seleccionada
async function loadHomeLeagueData() {
  const selector = document.getElementById("homeLeagueSelector");
  const leagueId = selector?.value;
  
  console.log("🔄 loadHomeLeagueData - leagueId:", leagueId);
  
  if (!leagueId || !userLeagues.length) {
    const container = document.getElementById("homeRankingContainer");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning text-center">
          <strong>⚠️ No estás en ninguna liga</strong>
          <p class="mb-0 mt-2">Accede o crea una liga desde la sección <strong>Ligas</strong></p>
        </div>
      `;
    }
    return;
  }
  
  // Encontrar la liga seleccionada
  currentHomeLeague = userLeagues.find(l => l._id === leagueId);
  if (!currentHomeLeague) return;
  
  console.log("📊 Cargando datos para liga:", currentHomeLeague.name);
  
  // Mostrar loading
  const container = document.getElementById("homeRankingContainer");
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="text-muted mt-3">Cargando datos de ${escapeHtml(currentHomeLeague.name)}...</p>
      </div>
    `;
  }
  
  // Asegurar que el selector de etapa tenga "total" como valor
  const stageSelector = document.getElementById("homeStageSelector");
  if (stageSelector && !stageSelector.value) {
    stageSelector.value = 'total';
  }
  currentHomeStage = stageSelector?.value || 'total';
  
  // Cargar los datos según la etapa seleccionada
  await loadHomeStageData();
}

// Cargar datos según la etapa seleccionada
async function loadHomeStageData() {
  if (!currentHomeLeague) {
    console.log("No hay liga seleccionada");
    return;
  }
  
  const stageSelector = document.getElementById("homeStageSelector");
  const selectedValue = stageSelector?.value || 'total';
  currentHomeStage = selectedValue;
  
  const stageInfo = document.getElementById("homeStageInfo");
  const container = document.getElementById("homeRankingContainer");
  
  if (!container) return;
  
  console.log("🔄 loadHomeStageData - Etapa:", selectedValue, "Liga:", currentHomeLeague.name);
  
  // Mostrar loading
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-3">Cargando clasificación...</p>
    </div>
  `;
  
  if (selectedValue === 'total') {
    // Cargar puntos totales
    if (stageInfo) stageInfo.innerHTML = '';
    
    try {
      // Sincronizar puntos de la liga
      await fetch(`${API_BASE_URL}/leagues/sync-points/${currentHomeLeague._id}`, { method: "POST" });
      
      const response = await fetch(`${API_BASE_URL}/leagues/${currentHomeLeague._id}`);
      if (!response.ok) throw new Error("Error al cargar datos");
      
      const league = await response.json();
      const sortedTeams = [...(league.teams || [])].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      
      renderHomeRankingTable(sortedTeams, 'total');
      
    } catch (err) {
      console.error("Error:", err);
      container.innerHTML = `<div class="alert alert-danger">❌ Error: ${err.message}</div>`;
    }
  } else {
    // Cargar puntos por etapa específica
    const stageNumber = parseInt(selectedValue);
    if (stageInfo) stageInfo.innerHTML = '<span class="text-info">⏳ Cargando puntos de la etapa...</span>';
    
    try {
      const response = await fetch(`${API_BASE_URL}/leagues/${currentHomeLeague._id}/points-by-stage/${stageNumber}`);
      
      if (!response.ok) throw new Error("Error al cargar datos");
      
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || "Error desconocido");
      
      if (stageInfo) {
        if (!data.hasResults) {
          stageInfo.innerHTML = '<span class="text-warning">⚠️ No hay resultados disponibles para esta etapa.</span>';
        } else {
          stageInfo.innerHTML = `<span class="text-success">✅ ${data.stageName} ${data.distanceKm ? `(${data.distanceKm} km)` : ''}</span>`;
        }
      }
      
      renderHomeRankingTable(data.teamPoints, stageNumber);
      
    } catch (err) {
      console.error("Error:", err);
      container.innerHTML = `<div class="alert alert-danger">❌ Error: ${err.message}</div>`;
      if (stageInfo) stageInfo.innerHTML = `<span class="text-danger">❌ Error: ${err.message}</span>`;
    }
  }
}

// Renderizar la tabla de clasificación en la página de inicio
function renderHomeRankingTable(teamsData, type) {
  const container = document.getElementById("homeRankingContainer");
  if (!container) return;
  
  if (!teamsData || teamsData.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info text-center">
        <strong>ℹ️ No hay equipos en esta liga</strong>
        <p class="mb-0 mt-2">Comparte el código de la liga para que se unan más equipos.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-striped" id="homeRankingTable">
        <thead class="table-dark">
          <tr>
            <th style="width: 80px;">#</th>
            <th>Usuario</th>
            <th style="min-width: 200px;">Equipo</th>
            <th style="width: 120px;">Puntos</th>
          </tr>
        </thead>
        <tbody id="homeRankingBody"></tbody>
      </table>
    </div>
  `;
  
  const tbody = document.getElementById("homeRankingBody");
  
  tbody.innerHTML = teamsData.map((team, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    
    return `
      <tr>
        <td style="vertical-align: middle; font-size: 1.1rem;"><strong>${index + 1}</strong> ${medal}</td>
        <td style="vertical-align: middle;">${escapeHtml(team.username)}${team.userId === currentUser?.id ? ' <span class="badge bg-primary">Tú</span>' : ''}</td>
        <td style="vertical-align: middle; cursor: pointer;" onclick="viewTeamDetailsFromHome('${team.userId}')">
          <strong style="color: #0d6efd; font-size: 1rem;">${escapeHtml(team.teamName)}</strong>
        </td>
        <td style="vertical-align: middle;"><span class="badge ${team.totalPoints > 0 ? 'bg-success' : 'bg-secondary'} fs-6 p-2">${(team.totalPoints || 0).toLocaleString()} pts</span></td>
      </tr>
    `;
  }).join('');
}

// Inicializar página de inicio (CORREGIDO)
async function initHomePage() {
  console.log("🏠 Inicializando página de inicio...");
  
  // Mostrar loading
  const container = document.getElementById("homeRankingContainer");
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="text-muted mt-3">Cargando tus ligas...</p>
      </div>
    `;
  }
  
  // Cargar las ligas del usuario
  await loadUserLeagues();
  
  // Rellenar el selector (esto automáticamente cargará la primera liga si existe)
  populateLeagueSelector();
  
  // Asegurar que el selector de etapa tenga "total" como valor seleccionado
  const stageSelector = document.getElementById("homeStageSelector");
  if (stageSelector && !stageSelector.value) {
    stageSelector.value = 'total';
  }
  
  // SIEMPRE cargar los datos cuando se inicializa la página
  if (currentHomeLeague) {
    console.log("🔄 Cargando datos automáticamente para:", currentHomeLeague.name);
    await loadHomeLeagueData();
  }
  
  console.log("✅ Página de inicio inicializada con", userLeagues.length, "ligas");
}

// Función para toggle de detalles en la página de inicio
window.toggleHomeStageDetails = function(detailsId) {
  const detailsDiv = document.getElementById(detailsId);
  if (detailsDiv) {
    detailsDiv.style.display = detailsDiv.style.display === 'block' ? 'none' : 'block';
  }
};

// Ver detalles del equipo desde la página de inicio
async function viewTeamDetailsFromHome(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/ranking/team-by-user/${userId}`);
    if (!response.ok) throw new Error("Error al cargar el equipo");
    
    const data = await response.json();
    
    if (data.success && data.teamId) {
      window.currentTeamUserId = userId;
      await viewTeamDetails(data.teamId);
    } else {
      alert("No se pudieron cargar los detalles del equipo");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Error al cargar los detalles del equipo: " + err.message);
  }
}


// ==================== DECLARACIONES GLOBALES ====================
// Hacer funciones globales disponibles
//window.loadRiderWikipedia = loadRiderWikipedia;
window.closeRiderModal = closeRiderModal;
window.updateRiderPoints = updateRiderPoints;
window.importFromProCyclingStats = importFromProCyclingStats;
window.deleteAllRiders = deleteAllRiders;
window.saveSystemConfig = saveSystemConfig;

// También añade las funciones globales
window.openCreateLeagueModal = openCreateLeagueModal;
window.closeCreateLeagueModal = closeCreateLeagueModal;
window.showJoinLeagueModal = showJoinLeagueModal;
window.closeJoinLeagueModal = closeJoinLeagueModal;
window.viewLeagueDetails = viewLeagueDetails;
window.closeLeagueDetailsModal = closeLeagueDetailsModal;
window.deleteLeague = deleteLeague;
window.leaveLeague = leaveLeague;
window.initLeaguesPage = initLeaguesPage;
window.viewTeamDetails = viewTeamDetails;
window.closeTeamDetailsModal = closeTeamDetailsModal;
window.initRankingPage = initRankingPage;
window.addRankingStyles = addRankingStyles;
window.updateRiderStatuses = updateRiderStatuses;
window.updateRiderPrice = updateRiderPrice;
window.loadRiderData = loadRiderData;
window.updateRiderPrice = updateRiderPrice;
window.renderRiderDetailsModal = renderRiderDetailsModal;
window.initHomePage = initHomePage;
window.loadHomeLeagueData = loadHomeLeagueData;
window.loadHomeStageData = loadHomeStageData;
window.viewTeamDetailsFromHome = viewTeamDetailsFromHome;
window.toggleHomeStageDetails = toggleHomeStageDetails;



// Asegurar que closeRiderModal esté definida globalmente (por si acaso)
if (typeof window.closeRiderModal === 'undefined') {
  window.closeRiderModal = function() {
    const modal = document.getElementById("riderModal");
    if (modal) {
      modal.style.display = "none";
    }
  };
}