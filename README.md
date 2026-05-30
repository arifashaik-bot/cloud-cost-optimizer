# Cloud Cost Optimization Agent

AI-powered tool that identifies and fixes wasteful cloud spending across AWS, Google Cloud, and Azure.

## Live Demo
🌐 Live Project: https://cloud-cost-optimizer-eight.vercel.app/

## Features

- **Multi-Cloud Support**: Switch between AWS, Google Cloud, and Azure
- **Waste Detection**: Automatically identifies idle instances, oversized databases, unattached storage, and more
- **AI-Powered Analysis**: Provides root cause explanations and fix recommendations
- **One-Click Fix**: Remove wasteful resources instantly
- **Fix All**: Optimize all resources with a single click
- **Cost Savings Calculator**: Project annual savings with interactive slider
- **PDF Report**: Download professional waste analysis report
- **Savings Projection Chart**: 3-month forecast showing cost reduction
- **Confetti Celebration**: Visual feedback when all waste is eliminated
- **Responsive Design**: Works on desktop, tablet, and mobile

## Supported Cloud Providers

| Provider | Resources Monitored | Demo Waste Amount |
|----------|---------------------|-------------------|
| AWS | EC2, RDS, EBS, S3, ELB, Snapshots, Elastic IP | $247.30 |
| Google Cloud | Compute Engine, Cloud SQL, Persistent Disk, Cloud Storage, Load Balancer, Static IP, Snapshots | $189.45 |
| Azure | Virtual Machine, SQL Database, Managed Disk, Blob Storage, Load Balancer, Public IP, Snapshots | $312.80 |

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Charts**: Chart.js
- **Styling**: Glassmorphism, gradients, dark theme
- **Icons**: Font Awesome / Emojis

## Prerequisites

- Node.js (version 14 or higher)
- Python 3 (for simple HTTP server)
- Modern web browser

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/arifashaik-bot/cloud-cost-optimizer.git
cd cloud-cost-optimizer
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Start the backend server

```bash
npm start
```

You should see:

```text
🚀 Cloud Cost Optimizer Backend running on http://localhost:5000
📊 API Documentation:
   GET  http://localhost:5000/api/all-providers
   GET  http://localhost:5000/api/resources/:provider
   POST http://localhost:5000/api/analyze/:resourceId
   POST http://localhost:5000/api/fix/:resourceId
```

Keep this terminal window open.

### 4. Start the frontend server

Open a new terminal window and run:

```bash
cd frontend
python -m http.server 3000
```

If Python is not available, use:

```bash
npx serve .
```

You should see:

```text
Serving HTTP on :: port 3000 (http://[::]:3000/)
```

### 5. Open the application

Open your browser and navigate to:

```text
http://localhost:3000
```

## How to Use

### Step 1: Select a Cloud Provider

Click on one of the provider cards:

- AWS - Orange card
- Google Cloud - Blue card
- Azure - Cyan card

### Step 2: Connect

Click the "Connect" button on your chosen provider card.

### Step 3: Scan Resources

Click the "Scan" button to load waste data for that provider.

### Step 4: Review Waste

The dashboard shows:

- Total monthly waste amount
- Number of wasteful resources
- Potential savings
- Payoff timeline
- List of all wasteful resources with severity badges

### Step 5: Analyze Individual Resources

Click "Analyze" on any resource to see:

- Root cause explanation
- AI-powered fix recommendation
- Command line code to fix the issue
- Monthly savings amount

### Step 6: Fix Resources

- Click "Fix" on individual resources to remove them one by one
- Click "Fix All" to optimize every resource at once
- Watch total waste decrease in real-time
- See confetti celebration when all waste is eliminated

### Step 7: Download Report

Click "Download Report" to generate a PDF with:

- Current date
- Cloud provider
- Total waste amount
- Complete list of resources with AI fix recommendations

### Step 8: Calculate Annual Savings

Use the savings slider to see projected 12-month savings:

- Drag the slider left or right
- Real-time display of potential annual savings
- Range: $0 to $5,000

## Project Structure

```text
cloud-cost-optimizer/
├── backend/
│   ├── server.js          # Express server and API endpoints
│   ├── package.json       # Node.js dependencies
│   └── mock-data.json     # Demo data for AWS, GCP, Azure
├── frontend/
│   ├── index.html         # Main application page
│   ├── style.css          # Styling and animations
│   └── script.js          # Frontend logic and API calls
├── .gitignore             # Git ignored files and folders
├── LICENSE                # MIT License
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | /api/resources/:provider | Get resources for specific provider |
| GET | /api/all-providers | Get list of all providers |
| POST | /api/analyze/:resourceId | Get AI analysis for resource |
| POST | /api/fix/:resourceId | Remove resource and update waste |

## Future Enhancements

- Real cloud API integration (AWS SDK, GCP SDK, Azure SDK)
- Scheduled automatic scans
- Email/Slack alerts
- Team collaboration features
- Historical cost tracking
- Machine learning cost prediction

## License

MIT

## Author

Shaik Arifa
