const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Load mock data
const mockDataPath = path.join(__dirname, 'mock-data.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

// Helper: Get provider by ID
function getProvider(providerId) {
  return mockData.providers.find(p => p.id === providerId);
}

// Helper: Get resource by ID
function getResource(resourceId) {
  for (let provider of mockData.providers) {
    const resource = provider.resources.find(r => r.id === resourceId);
    if (resource) {
      return { resource, provider };
    }
  }
  return null;
}

// ==================== API ENDPOINTS ====================

// 1. GET /api/all-providers - List all providers
app.get('/api/all-providers', (req, res) => {
  const providers = mockData.providers.map(p => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    color: p.color,
    totalWaste: p.totalWaste,
    resourceCount: p.resources.length
  }));
  res.json(providers);
});

// 2. GET /api/resources/:provider - Get resources for specific provider
app.get('/api/resources/:provider', (req, res) => {
  const provider = getProvider(req.params.provider);
  
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  res.json({
    provider: {
      id: provider.id,
      name: provider.name,
      icon: provider.icon,
      color: provider.color,
      totalWaste: provider.totalWaste
    },
    resources: provider.resources.map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      monthlyCost: r.monthlyCost,
      wasteReason: r.wasteReason,
      severity: r.severity,
      savings: r.savings
    })),
    stats: {
      totalWaste: provider.totalWaste,
      resourceCount: provider.resources.length,
      potentialSavings: provider.resources.reduce((sum, r) => sum + r.savings, 0),
      criticalCount: provider.resources.filter(r => r.severity === 'critical').length,
      highCount: provider.resources.filter(r => r.severity === 'high').length
    }
  });
});

// 3. POST /api/analyze/:resourceId - Get AI analysis for resource
app.post('/api/analyze/:resourceId', (req, res) => {
  const result = getResource(req.params.resourceId);
  
  if (!result) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const { resource, provider } = result;

  res.json({
    resourceId: resource.id,
    resourceName: resource.name,
    resourceType: resource.type,
    provider: provider.name,
    monthlyCost: resource.monthlyCost,
    severity: resource.severity,
    monthlySavings: resource.savings,
    annualSavings: resource.savings * 12,
    rootCause: resource.rootCause,
    recommendation: resource.recommendation,
    codeExample: resource.codeExample,
    estimatedImplementationTime: '5-15 minutes'
  });
});

// 4. POST /api/fix/:resourceId - Simulate fixing resource (no permanent effect)
app.post('/api/fix/:resourceId', (req, res) => {
  const result = getResource(req.params.resourceId);
  
  if (!result) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const { resource } = result;

  // Simulate processing delay
  setTimeout(() => {
    res.json({
      success: true,
      message: `Successfully optimized ${resource.name}`,
      monthlySavings: resource.savings,
      annualSavings: resource.savings * 12
    });
  }, 300);
});

// 5. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cloud Cost Optimizer Backend running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation:`);
  console.log(`   GET  http://localhost:${PORT}/api/all-providers`);
  console.log(`   GET  http://localhost:${PORT}/api/resources/:provider`);
  console.log(`   POST http://localhost:${PORT}/api/analyze/:resourceId`);
  console.log(`   POST http://localhost:${PORT}/api/fix/:resourceId`);
});