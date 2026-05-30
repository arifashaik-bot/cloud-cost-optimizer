// ==================== CONFIGURATION ====================
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://cloud-cost-optimizer-1-kvp0.onrender.com/api';
let currentProvider = null;
let currentResources = [];
let savingsChart = null;
let fixedResources = new Set();
let connectedProvider = null;
let currentTotalWaste = 0;

// Chart instances
let awsCostChartInstance = null;
let gcpTimelineChartInstance = null;
let azureVMChartInstance = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeSavingsCalculator();
  initializeDownloadButton();
});

async function initializeApp() {
  try {
    await loadProviders();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Error loading providers', 'error');
  }
}

// ==================== PROVIDER LOADING ====================
async function loadProviders() {
  try {
    const response = await fetch(`${API_BASE}/all-providers`);
    const providers = await response.json();
    
    const providerGrid = document.getElementById('providerGrid');
    providerGrid.innerHTML = '';

    providers.forEach(provider => {
      const card = createProviderCard(provider);
      providerGrid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading providers:', error);
    showToast('Failed to load cloud providers', 'error');
  }
}

function createProviderCard(provider) {
  const card = document.createElement('div');
  card.className = 'provider-card';
  card.id = `provider-${provider.id}`;

  const isConnected = connectedProvider === provider.id;
  const statusClass = isConnected ? 'connected' : '';

  card.innerHTML = `
    <div class="provider-icon">${provider.icon}</div>
    <div class="provider-name">${provider.name}</div>
    <div class="provider-status ${statusClass}" id="status-${provider.id}">
      <i class="fas fa-circle-notch"></i>
      <span id="status-text-${provider.id}">${isConnected ? 'Connected ✓' : 'Not Connected'}</span>
    </div>
    <div class="provider-buttons">
      <button class="btn btn-primary" id="connect-btn-${provider.id}" data-provider-id="${provider.id}">
        <i class="fas fa-plug"></i> <span class="btn-text">${isConnected ? 'Disconnect' : 'Connect'}</span>
      </button>
      <button class="btn btn-primary" id="scan-btn-${provider.id}" style="display: ${isConnected ? 'flex' : 'none'};" onclick="scanResources('${provider.id}')">
        <i class="fas fa-search"></i> <span>Scan</span>
      </button>
    </div>
  `;

  const connectBtn = card.querySelector(`#connect-btn-${provider.id}`);
  connectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    connectProvider(provider.id);
  });

  return card;
}

// ==================== PROVIDER CONNECTION ====================
function connectProvider(providerId) {
  try {
    if (connectedProvider === providerId) {
      disconnectProvider(providerId);
      return;
    }

    if (connectedProvider) {
      disconnectProvider(connectedProvider);
    }

    connectedProvider = providerId;
    updateAllProviderCards();
    showToast(`Connected to ${getProviderName(providerId)} successfully!`, 'success');
  } catch (error) {
    console.error('Connection error:', error);
    showToast('Connection failed', 'error');
  }
}

function disconnectProvider(providerId) {
  try {
    connectedProvider = null;
    updateAllProviderCards();
    showToast(`Disconnected from ${getProviderName(providerId)}`, 'info');
  } catch (error) {
    console.error('Disconnection error:', error);
  }
}

function updateAllProviderCards() {
  const providerIds = ['aws', 'gcp', 'azure'];
  
  providerIds.forEach(providerId => {
    const isConnected = connectedProvider === providerId;
    
    const statusDiv = document.getElementById(`status-${providerId}`);
    const statusText = document.getElementById(`status-text-${providerId}`);
    
    if (isConnected) {
      statusDiv.classList.add('connected');
      statusText.textContent = 'Connected ✓';
    } else {
      statusDiv.classList.remove('connected');
      statusText.textContent = 'Not Connected';
    }
    
    const scanBtn = document.getElementById(`scan-btn-${providerId}`);
    if (scanBtn) {
      scanBtn.style.display = isConnected ? 'flex' : 'none';
    }
    
    const connectBtn = document.getElementById(`connect-btn-${providerId}`);
    if (connectBtn) {
      const btnText = connectBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = isConnected ? 'Disconnect' : 'Connect';
      }
    }
  });
}

function getProviderName(providerId) {
  const names = {
    'aws': 'AWS',
    'gcp': 'Google Cloud',
    'azure': 'Azure'
  };
  return names[providerId] || providerId;
}

// ==================== RESOURCE SCANNING ====================
async function scanResources(providerId) {
  try {
    if (connectedProvider !== providerId) {
      showToast('Please connect this provider first', 'error');
      return;
    }

    currentProvider = providerId;
    showLoadingSpinner(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(`${API_BASE}/resources/${providerId}`);
    const data = await response.json();

    currentResources = data.resources;
    currentTotalWaste = data.stats.totalWaste;
    updateDashboard(data);

    document.getElementById('providerSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('downloadPdfBtn').style.display = 'flex';

    showLoadingSpinner(false);
    showToast(`Scanned ${data.stats.resourceCount} resources!`, 'success');
  } catch (error) {
    console.error('Scan error:', error);
    showLoadingSpinner(false);
    showToast('Failed to scan resources', 'error');
  }
}

// ==================== DASHBOARD UPDATES ====================
function updateDashboard(data) {
  document.getElementById('totalWaste').textContent = `$${data.stats.totalWaste.toFixed(2)}`;
  document.getElementById('resourceCount').textContent = data.stats.resourceCount;
  document.getElementById('potentialSavings').textContent = `$${data.stats.potentialSavings.toFixed(2)}`;
  
  const monthsToPayoff = Math.ceil(data.stats.totalWaste / data.stats.potentialSavings) || 1;
  document.getElementById('payoffTime').textContent = `${monthsToPayoff} Month${monthsToPayoff > 1 ? 's' : ''}`;

  updateResourcesTable(data.resources);
  updateSavingsChart(data.stats.potentialSavings);
  updateSavingsCalculator(data.stats.totalWaste);
  showProviderFeatures(currentProvider);
}

function updateResourcesTable(resources) {
  const tbody = document.getElementById('resourcesTableBody');
  tbody.innerHTML = '';

  resources.forEach(resource => {
    if (fixedResources.has(resource.id)) return;

    const row = document.createElement('tr');
    row.id = `row-${resource.id}`;
    const severityClass = `severity-${resource.severity}`;

    row.innerHTML = `
      <td>${resource.type}</td>
      <td class="resource-name">${resource.name}</td>
      <td class="resource-cost">$${resource.monthlyCost.toFixed(2)}</td>
      <td>${resource.wasteReason}</td>
      <td>
        <span class="severity-badge ${severityClass}">
          ${resource.severity.charAt(0).toUpperCase() + resource.severity.slice(1)}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-small btn-secondary" onclick="analyzeResource('${resource.id}')">
            <i class="fas fa-lightbulb"></i> <span>Analyze</span>
          </button>
          <button class="btn btn-small btn-danger" onclick="fixResource('${resource.id}')">
            <i class="fas fa-magic"></i> <span>Fix</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function updateSavingsChart(totalPotentialSavings) {
  const ctx = document.getElementById('savingsChart').getContext('2d');

  if (savingsChart) {
    savingsChart.destroy();
  }

  const monthlyData = totalPotentialSavings;
  savingsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Month 1', 'Month 2', 'Month 3'],
      datasets: [{
        label: 'Accumulated Savings ($)',
        data: [monthlyData, monthlyData * 2, monthlyData * 3],
        backgroundColor: ['rgba(0, 212, 255, 0.2)', 'rgba(0, 212, 255, 0.4)', 'rgba(0, 212, 255, 0.6)'],
        borderColor: ['rgba(0, 212, 255, 1)', 'rgba(0, 212, 255, 1)', 'rgba(0, 212, 255, 1)'],
        borderWidth: 2,
        borderRadius: 8,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#ffffff', font: { size: 12, weight: 600 }, padding: 20 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#b8c5d6',
            callback: function(value) { return '$' + value.toFixed(0); }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }
        },
        x: {
          ticks: { color: '#b8c5d6' },
          grid: { display: false }
        }
      }
    }
  });
}

// ==================== RESOURCE ANALYSIS ====================
async function analyzeResource(resourceId) {
  try {
    const response = await fetch(`${API_BASE}/analyze/${resourceId}`, { method: 'POST' });
    const analysis = await response.json();
    showAnalysisModal(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    showToast('Failed to analyze resource', 'error');
  }
}

function showAnalysisModal(analysis) {
  document.getElementById('modalTitle').textContent = analysis.resourceName;
  document.getElementById('modalSeverity').className = `severity-badge severity-${analysis.severity}`;
  document.getElementById('modalSeverity').textContent = analysis.severity.toUpperCase();
  
  document.getElementById('modalType').textContent = analysis.resourceType;
  document.getElementById('modalProvider').textContent = analysis.provider;
  document.getElementById('modalCost').textContent = `$${analysis.monthlyCost.toFixed(2)}/month`;
  document.getElementById('modalSavings').textContent = `$${analysis.monthlySavings.toFixed(2)}/month ($${analysis.annualSavings.toFixed(2)}/year)`;
  document.getElementById('modalRootCause').textContent = analysis.rootCause;
  document.getElementById('modalRecommendation').textContent = analysis.recommendation;
  document.getElementById('modalCode').textContent = analysis.codeExample;
  document.getElementById('modalTime').textContent = analysis.estimatedImplementationTime;
  document.getElementById('modalFixBtn').dataset.resourceId = analysis.resourceId;

  document.getElementById('analysisModal').classList.remove('hidden');
}

document.getElementById('modalCloseBtn').addEventListener('click', () => {
  document.getElementById('analysisModal').classList.add('hidden');
});

document.getElementById('modalCancelBtn').addEventListener('click', () => {
  document.getElementById('analysisModal').classList.add('hidden');
});

document.getElementById('copyCodeBtn').addEventListener('click', () => {
  const code = document.getElementById('modalCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Code copied to clipboard!', 'success');
  });
});

document.getElementById('modalFixBtn').addEventListener('click', () => {
  const resourceId = document.getElementById('modalFixBtn').dataset.resourceId;
  document.getElementById('analysisModal').classList.add('hidden');
  fixResource(resourceId);
});

// ==================== RESOURCE FIXING ====================
async function fixResource(resourceId) {
  try {
    const response = await fetch(`${API_BASE}/fix/${resourceId}`, { method: 'POST' });
    const result = await response.json();

    fixedResources.add(resourceId);

    const row = document.getElementById(`row-${resourceId}`);
    if (row) {
      row.classList.add('removed');
      await new Promise(resolve => setTimeout(resolve, 400));
      row.remove();
    }

    refreshDashboard();
    showToast(`✓ Fixed ${result.message}`, 'success');
  } catch (error) {
    console.error('Fix error:', error);
    showToast('Failed to fix resource', 'error');
  }
}

async function fixAllResources() {
  try {
    const fixBtn = document.getElementById('fixAllBtn');
    fixBtn.disabled = true;
    fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Fixing All...</span>';

    for (const resource of currentResources) {
      if (!fixedResources.has(resource.id)) {
        await fixResource(resource.id);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    fixBtn.disabled = false;
    fixBtn.innerHTML = '<i class="fas fa-magic"></i> <span>Fix All</span>';
    
    // FEATURE 3: Trigger confetti animation
    triggerConfettiAnimation(currentTotalWaste);
    
    showToast('All resources optimized! 🎉', 'success');
  } catch (error) {
    console.error('Fix all error:', error);
    showToast('Error fixing all resources', 'error');
  }
}

async function refreshDashboard() {
  const response = await fetch(`${API_BASE}/resources/${currentProvider}`);
  const data = await response.json();

  const remainingResources = data.resources.filter(r => !fixedResources.has(r.id));
  
  const totalWaste = remainingResources.reduce((sum, r) => sum + r.monthlyCost, 0);
  const potentialSavings = remainingResources.reduce((sum, r) => sum + r.savings, 0);

  currentTotalWaste = totalWaste;

  document.getElementById('totalWaste').textContent = `$${totalWaste.toFixed(2)}`;
  document.getElementById('resourceCount').textContent = remainingResources.length;
  document.getElementById('potentialSavings').textContent = `$${potentialSavings.toFixed(2)}`;

  const monthsToPayoff = potentialSavings > 0 ? Math.ceil(totalWaste / potentialSavings) : 1;
  document.getElementById('payoffTime').textContent = `${monthsToPayoff} Month${monthsToPayoff > 1 ? 's' : ''}`;

  updateSavingsChart(potentialSavings);
  updateResourcesTable(remainingResources);
  updateSavingsCalculator(totalWaste);
  showProviderFeatures(currentProvider);
}

// ==================== BACK TO PROVIDERS ====================
document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('dashboardSection').classList.add('hidden');
      document.getElementById('providerSection').classList.remove('hidden');
      document.getElementById('downloadPdfBtn').style.display = 'none';
      fixedResources.clear();
      currentResources = [];
      currentProvider = null;
      loadProviders();
    });
  }

  const fixAllBtn = document.getElementById('fixAllBtn');
  if (fixAllBtn) {
    fixAllBtn.addEventListener('click', fixAllResources);
  }
});

// ==================== FEATURE 1: SAVINGS CALCULATOR ====================
function initializeSavingsCalculator() {
  const slider = document.getElementById('savingsSlider');
  const savingsText = document.getElementById('savingsText');

  slider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    updateSavingsText(value, savingsText);
  });
}

function updateSavingsCalculator(totalWaste) {
  const slider = document.getElementById('savingsSlider');
  const defaultValue = Math.round(totalWaste * 12 / 100) * 100;
  slider.max = Math.max(5000, defaultValue * 1.2);
  slider.value = defaultValue;
  
  const savingsText = document.getElementById('savingsText');
  updateSavingsText(defaultValue, savingsText);
}

function updateSavingsText(value, element) {
  if (value === 0) {
    element.textContent = 'If you fix these, you save $0 per year';
  } else {
    element.textContent = `If you fix these, you save $${value.toLocaleString()} per year`;
  }
}

// ==================== FEATURE 2: PDF DOWNLOAD ====================
function initializeDownloadButton() {
  const downloadBtn = document.getElementById('downloadPdfBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', generateAndDownloadPDF);
  }
}

function generateAndDownloadPDF() {
  try {
    const todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const provider = getProviderName(currentProvider);
    const totalWaste = document.getElementById('totalWaste').textContent;
    const resourceCount = document.getElementById('resourceCount').textContent;
    const potentialSavings = document.getElementById('potentialSavings').textContent;

    let reportContent = `CLOUD COST OPTIMIZATION REPORT\n`;
    reportContent += `${'='.repeat(60)}\n\n`;
    reportContent += `Generated: ${todayDate}\n`;
    reportContent += `Cloud Provider: ${provider}\n`;
    reportContent += `Total Waste: ${totalWaste}\n`;
    reportContent += `Potential Annual Savings: ${potentialSavings}\n`;
    reportContent += `Resources Analyzed: ${resourceCount}\n\n`;

    reportContent += `WASTEFUL RESOURCES\n`;
    reportContent += `${'-'.repeat(60)}\n\n`;

    const tbody = document.getElementById('resourcesTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        const type = cells[0].textContent;
        const name = cells[1].textContent;
        const cost = cells[2].textContent;
        const reason = cells[3].textContent;
        const severity = cells[4].textContent.trim();

        reportContent += `${index + 1}. ${name}\n`;
        reportContent += `   Type: ${type}\n`;
        reportContent += `   Monthly Cost: ${cost}\n`;
        reportContent += `   Waste Reason: ${reason}\n`;
        reportContent += `   Severity: ${severity}\n`;
        reportContent += `   Recommendation: Click "Analyze" button for detailed CLI commands\n\n`;
      }
    });

    reportContent += `${'='.repeat(60)}\n`;
    reportContent += `NEXT STEPS\n`;
    reportContent += `1. Review each resource by clicking "Analyze"\n`;
    reportContent += `2. Execute the provided CLI commands to fix issues\n`;
    reportContent += `3. Monitor your cloud costs after implementation\n`;
    reportContent += `4. Expected savings: ${potentialSavings}/year\n\n`;
    reportContent += `Generated by Cloud Cost Optimization Agent\n`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileName = `cloud-cost-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showToast(`Report downloaded: ${fileName}`, 'success');
  } catch (error) {
    console.error('PDF generation error:', error);
    showToast('Failed to generate report', 'error');
  }
}

// ==================== FEATURE 3: CONFETTI ANIMATION ====================
function triggerConfettiAnimation(savedAmount) {
  createConfetti();
  showSuccessMessage(savedAmount);
}

function createConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#ff006e', '#00d4ff', '#39ff14', '#ffd60a', '#ff9e00', '#7b2ff7'];
  const confettiCount = 80;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.backgroundColor = color;
    
    const left = Math.random() * 100;
    const delay = Math.random() * 0.2;
    const duration = 2 + Math.random() * 1;
    const rotation = Math.random() * 360;

    confetti.style.left = left + '%';
    confetti.style.top = '-10px';
    confetti.style.animation = `confettiFall ${duration}s linear ${delay}s forwards`;
    confetti.style.transform = `rotateZ(${rotation}deg)`;

    container.appendChild(confetti);
  }

  setTimeout(() => {
    const allConfetti = container.querySelectorAll('.confetti');
    allConfetti.forEach(c => c.remove());
  }, 3000);
}

function showSuccessMessage(savedAmount) {
  const message = document.getElementById('confettiMessage');
  message.textContent = `🎉 You saved $${savedAmount.toFixed(2)}! 🎉`;
  message.classList.remove('hidden');

  setTimeout(() => {
    message.classList.add('hidden');
  }, 3000);
}

// ==================== PROVIDER-SPECIFIC FEATURES ====================
function showProviderFeatures(providerId) {
  const providers = {
    'aws': ['aws-features', 'aws-features-2', 'aws-features-3'],
    'gcp': ['gcp-features', 'gcp-features-2', 'gcp-features-3'],
    'azure': ['azure-features', 'azure-features-2', 'azure-features-3']
  };

  // Hide all features
  Object.values(providers).forEach(features => {
    features.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  });

  // Show selected provider features
  if (providers[providerId]) {
    providers[providerId].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });

    if (providerId === 'aws') initializeAWSFeatures();
    else if (providerId === 'gcp') initializeGCPFeatures();
    else if (providerId === 'azure') initializeAzureFeatures();
  }
}

// ==================== AWS FEATURES ====================
function initializeAWSFeatures() {
  createAWSCostChart();
  updateEC2Metrics();
  updateS3Metrics();
}

function createAWSCostChart() {
  const ctx = document.getElementById('awsCostChart');
  if (!ctx) return;
  
  if (awsCostChartInstance) awsCostChartInstance.destroy();

  awsCostChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['EC2', 'RDS', 'S3', 'ELB', 'EBS', 'Others'],
      datasets: [{
        label: 'Monthly Cost',
        data: [14.60, 120.00, 45.80, 18.70, 8.20, 39.30],
        backgroundColor: ['rgba(255, 153, 0, 0.8)', 'rgba(255, 107, 107, 0.8)', 'rgba(0, 212, 255, 0.8)', 'rgba(81, 207, 102, 0.8)', 'rgba(123, 47, 247, 0.8)', 'rgba(255, 193, 7, 0.8)'],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#ffffff', font: { size: 11, weight: 600 }, padding: 15 } } }
    }
  });
}

function updateEC2Metrics() {
  const ec2Resources = currentResources.filter(r => r.type.includes('EC2'));
  const ec2Savings = ec2Resources.reduce((sum, r) => sum + r.savings, 0);
  document.getElementById('idleEc2Count').textContent = ec2Resources.length;
  document.getElementById('ec2Savings').textContent = `$${ec2Savings.toFixed(2)}`;
}

function updateS3Metrics() {
  const s3Resources = currentResources.filter(r => r.type.includes('S3'));
  const s3Savings = s3Resources.reduce((sum, r) => sum + r.savings, 0);
  document.getElementById('oldBackupCount').textContent = s3Resources.length;
  document.getElementById('s3Savings').textContent = `$${s3Savings.toFixed(2)}`;
}

function optimizeEC2() {
  showToast('Optimizing EC2 instances...', 'info');
  currentResources.filter(r => r.type.includes('EC2')).forEach(r => fixResource(r.id));
}

function archiveS3() {
  showToast('Archiving old S3 backups...', 'info');
  currentResources.filter(r => r.type.includes('S3')).forEach(r => fixResource(r.id));
}

// ==================== GCP FEATURES ====================
function initializeGCPFeatures() {
  createGCPTimelineChart();
  updateComputeMetrics();
  updateStorageMetrics();
}

function createGCPTimelineChart() {
  const ctx = document.getElementById('gcpTimelineChart');
  if (!ctx) return;
  
  if (gcpTimelineChartInstance) gcpTimelineChartInstance.destroy();

  gcpTimelineChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'CPU Utilization %',
          data: [45, 52, 48, 55, 43, 28, 32],
          borderColor: '#4285F4',
          backgroundColor: 'rgba(66, 133, 244, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Memory Utilization %',
          data: [62, 58, 65, 70, 68, 35, 40],
          borderColor: '#EA4335',
          backgroundColor: 'rgba(234, 67, 53, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#ffffff', font: { size: 11, weight: 600 } } } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#b8c5d6', callback: function(value) { return value + '%'; } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: { ticks: { color: '#b8c5d6' }, grid: { display: false } }
      }
    }
  });
}

function updateComputeMetrics() {
  const vmResources = currentResources.filter(r => r.type.includes('Compute Engine') || r.type.includes('Cloud'));
  const computeSavings = vmResources.reduce((sum, r) => sum + r.savings, 0);
  document.getElementById('oversizedVMs').textContent = vmResources.length;
  document.getElementById('computeSavings').textContent = `$${computeSavings.toFixed(2)}`;
}

function updateStorageMetrics() {
  const storageResources = currentResources.filter(r => r.type.includes('Cloud Storage'));
  const storageSavings = storageResources.reduce((sum, r) => sum + r.savings, 0);
  document.getElementById('lifecycleCount').textContent = storageResources.length;
  document.getElementById('storageSavings').textContent = `$${storageSavings.toFixed(2)}`;
}

function downsizeCompute() {
  showToast('Downsizing Compute Engine instances...', 'info');
  currentResources.filter(r => r.type.includes('Compute Engine') || r.type.includes('Cloud')).forEach(r => fixResource(r.id));
}

function applyStorageRules() {
  showToast('Applying Cloud Storage lifecycle rules...', 'info');
  currentResources.filter(r => r.type.includes('Cloud Storage')).forEach(r => fixResource(r.id));
}

// ==================== AZURE FEATURES ====================
function initializeAzureFeatures() {
  createAzureVMChart();
  updateSQLMetrics();
  updateTierMetrics();
}

function createAzureVMChart() {
  const ctx = document.getElementById('azureVMChart');
  if (!ctx) return;
  
  if (azureVMChartInstance) azureVMChartInstance.destroy();

  azureVMChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['VM-1', 'VM-2', 'VM-3', 'VM-4', 'VM-5', 'VM-6'],
      datasets: [
        { label: 'CPU %', data: [25, 18, 72, 45, 30, 55], backgroundColor: 'rgba(0, 120, 212, 0.7)', borderColor: '#0078D4' },
        { label: 'Memory %', data: [35, 28, 68, 52, 40, 62], backgroundColor: 'rgba(107, 114, 207, 0.7)', borderColor: '#6B72CF' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#ffffff', font: { size: 11, weight: 600 } } } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#b8c5d6', callback: function(value) { return value + '%'; } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: { ticks: { color: '#b8c5d6' } }
      }
    }
  });
}

function updateSQLMetrics() {
  const sqlResources = currentResources.filter(r => r.type.includes('SQL'));
  const sqlSavings = sqlResources.reduce((sum, r) => sum + r.savings, 0);
  document.getElementById('overProvisionedDBs').textContent = sqlResources.length;
  document.getElementById('sqlSavings').textContent = `$${sqlSavings.toFixed(2)}`;
}

function updateTierMetrics() {
  const storageResources = currentResources.filter(r => r.type.includes('Storage') || r.type.includes('Blob'));
  const tieringSavings = storageResources.reduce((sum, r) => sum + r.savings, 0);
  document.getElementById('coldDataSize').textContent = (storageResources.length * 85).toString();
  document.getElementById('tieringSavings').textContent = `$${tieringSavings.toFixed(2)}`;
}

function optimizeSQL() {
  showToast('Right-sizing SQL databases...', 'info');
  currentResources.filter(r => r.type.includes('SQL')).forEach(r => fixResource(r.id));
}

function applyTiering() {
  showToast('Applying storage tiering policies...', 'info');
  currentResources.filter(r => r.type.includes('Storage') || r.type.includes('Blob')).forEach(r => fixResource(r.id));
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.4s ease-out forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ==================== LOADING SPINNER ====================
function showLoadingSpinner(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (show) {
    spinner.classList.remove('hidden');
  } else {
    spinner.classList.add('hidden');
  }
}
