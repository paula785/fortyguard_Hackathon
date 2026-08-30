<div align="center">

# 🌳 UrbanCanopy AI
### Autonomous Microclimate Urban-Planning Assistant
**Built for the FortyGuard Global AI Hackathon '26**
*Primary Track: **Track 06 — AI Agent Tools** · Secondary Track: **Track 01 — Urban Systems***

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FortyGuard API](https://img.shields.io/badge/FortyGuard_API-Hyperlocal_Temperature-orange?style=for-the-badge)](https://www.fortyguard.com/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-6.4.1-green?style=for-the-badge)](https://maplibre.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Autonomous_Agent-purple?style=for-the-badge)](https://www.langchain.com/)
[![Vitest](https://img.shields.io/badge/Vitest-20_Tests_Passing-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev/)

<p align="center">
  <em>Transform municipal climate briefs and capital budgets into parcel-level cooling blueprints. Powered by FortyGuard Temperature APIs, autonomous planning agents, and peer-reviewed microclimate physics.</em>
</p>

[Key Features](#-key-functional-pillars) • [System Architecture](#-system-architecture) • [FortyGuard API Integration](#-fortyguard-temperature-api-integration) • [Scientific Modeling](#-scientific--thermodynamic-modeling) • [Quickstart](#-quickstart-guide) • [Test Suite](#-automated-testing--verification)

</div>

---

## 📖 Executive Summary & Problem Statement

Urban Heat Islands (UHIs) cause unshaded asphalt corridors, transit stops, and school zones to reach surface temperatures exceeding **115°F–125°F+ (45°C–52°C)**. Municipal sustainability directors and urban planning officers face three critical bottlenecks:
1. **Coarse Data**: Macro weather forecasts lack street-level ($20\,\text{m}^2$) resolution.
2. **Complex Allocation**: Balancing fast shade vs. long-term canopy against strict capital budgets is computationally non-trivial.
3. **High Tree Mortality**: Over 40% of newly planted urban trees die within 5 years due to static, uncalibrated watering regimes.

**UrbanCanopy AI** is an autonomous microclimate planning system that ingests **FortyGuard Hyperlocal Temperature APIs**, discretizes urban parcels, and executes an **8-tool LangGraph agent pipeline** to produce actionable, procurement-ready cooling blueprints with dynamic diurnal irrigation schedules and pre-drafted federal grant proposals.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User["🏛️ Municipal Urban Planner / Natural Language Brief"] --> NextApp["UrbanCanopy AI (Next.js 15 App Router)"]
    NextApp --> Agent["🧠 Autonomous LangGraph Planning Agent (Gemini / Fallback Engine)"]
    
    subgraph FortyGuard["📡 FortyGuard Hyperlocal Temperature API Layer"]
        Agent -->|1| FG_Heat["POST /v1/heatmap (Street Temperature Grid)"]
        Agent -->|2| FG_Sat["POST /v1/satellite (Land-Cover Classification)"]
        Agent -->|3| FG_Env["POST /v1/env_params (Solar Irradiance & Heat Index)"]
        Agent -->|4| FG_Street["POST /v1/streetview (Sidewalk Shade Geometry)"]
        FG_Heat & FG_Sat & FG_Env & FG_Street --> Poll["Async Polling: GET /v1/status/{activity_id}"]
    end

    subgraph CoreEngine["🔬 Multi-Criteria Optimization & Thermodynamic Simulation Engine"]
        Poll --> Hotspot["Hotspot Detection & WHO Risk Z-Score Engine"]
        Hotspot --> Optimizer["Budget-Constrained Greedy Knapsack Optimizer"]
        Optimizer --> ThermoSim["Gaussian Thermal Plume & Eco-Physics Simulator"]
        ThermoSim --> WaterEngine["VPD-Based Dynamic Diurnal Irrigation Engine"]
    end

    subgraph DataLayer["🗄️ Spatial Storage & Caching Layer"]
        CoreEngine <--> PostGIS[("PostgreSQL + PostGIS (pg.Pool / Memory Store)")]
        CoreEngine <--> RedisQueue[("Redis Simulation Cache (ioredis / Memory Store)")]
    end

    subgraph UIOutputs["📊 Interactive Decision Dashboard & Deliverables"]
        ThermoSim --> MapCanvas["MapLibre GL 6 Canvas (Circular Swath & Before/After Toggle)"]
        Optimizer --> KPIDash["Real-Time Animated KPI Dashboard"]
        WaterEngine --> IrrigationTimeline["Diurnal Irrigation Timeline (Pre-Dawn 4–6 AM)"]
        ThermoSim --> ScenarioMatrix["Multi-Scenario Comparison Matrix"]
        CoreEngine --> GrantStudio["Municipal Blueprint & Grant Studio (FEMA / EPA / CSV / JSON)"]
    end
```

---

## 🚀 Key Functional Pillars

### 1. 🌡️ Hyperlocal Thermal Audit & WHO Risk Classification
* Ingests FortyGuard `/v1/heatmap` tile swaths with tile-by-tile temperature distributions.
* Evaluates **WHO Heat Risk Bands** using statistical $z$-score thresholds:
  * **Extreme Alert** ($\ge 40^\circ\text{C}$ or $z \ge 2.0\sigma$): Severe heatstroke danger. Immediate tensile shade required.
  * **High Risk** ($35^\circ\text{C}–40^\circ\text{C}$): Dangerous heat stress for transit commuters and outdoor workers.
  * **Moderate Risk** ($30^\circ\text{C}–35^\circ\text{C}$): Elevated asphalt thermal accumulation.
  * **Normal** ($< 30^\circ\text{C}$): Microclimate baseline.

### 2. 🧠 8-Tool LangGraph Autonomous Agent Pipeline
Directly addresses **Hackathon Track 06 (AI Agent Tools)** by orchestrating eight tool calls:
1. `fetch_heatmap`: Pulls street-level thermal grid for target coordinates.
2. `fetch_satellite`: Retrieves land-cover segmentation (asphalt, bare soil, canopy).
3. `fetch_env_params`: Ingests solar irradiance ($W/m^2$), humidity, and ambient temperature.
4. `analyze_hotspots`: Identifies critical corridors requiring immediate intervention.
5. `optimize_interventions`: Solves knapsack budget allocation across 15 tree species and 6 engineered structures.
6. `simulate_cooling`: Simulates before/after microclimate cooling with Gaussian thermal plume dispersion.
7. `calculate_irrigation`: Calculates diurnal water budgets with drought mode multipliers.
8. `generate_report`: Compiles executive KPI reports with federal grant mappings.

### 3. 🌳 Botanical & Engineered Intervention Catalog
* **15 Climate-Matched Tree Species**: Full USDA botanical profiles (*Desert Willow, Blue Palo Verde, Southern Live Oak, London Plane, Chinese Pistache, Velvet Mesquite, etc.*) including mature canopy spread, drought tolerance, base evapotranspiration rates, and unit procurement costs.
* **6 High-Albedo Engineered Structures**: Hyperbolic tensile sails ($\alpha = 0.85$), cantilevered transit shelters, hexagonal park gazebos, and modular pedestrian pergolas.
* **4 Optimization Modes**:
  * ⚖️ **Balanced**: Harmonizes capital cost, thermal drop, and water conservation.
  * 🌡️ **Max Cooling**: Maximizes absolute Fahrenheit temperature reduction.
  * 💧 **Low Water**: Prioritizes drought-resilient xeriscape species and zero-water tensile sails.
  * ⚡ **Fast Shade**: Deploys rapid engineered structures for immediate relief.

### 4. 💧 Dynamic Diurnal Water Budgeting
* Formulates weather-calibrated irrigation regimes prioritizing **pre-dawn watering windows (4:00 AM – 6:00 AM)** to eliminate evaporative loss by up to **40%**.
* Calculates dynamic daily gallons using our 6-factor formula:
  $$\text{Gallons} = \text{BaseRate} \times \text{GrowthStage} \times \text{TempMultiplier} \times \text{SolarFactor} \times (1 - \text{PrecipOffset}) \times \text{DroughtFactor}$$

### 5. 📄 Municipal Grant Studio & Export Engine
* **Pre-Drafted Grant Applications**:
  * **FEMA BRIC** (Building Resilient Infrastructure and Communities)
  * **EPA ECJCG** (Environmental and Climate Justice Community Grants)
  * **USDA UCF** (Urban & Community Forestry Program)
  * **HUD CDBG** (Community Development Block Grant)
* **GIS-Ready Coordinate Export**: Download intervention coordinates, catalog IDs, and costs in `.csv` format for direct import into ArcGIS / QGIS.
* **Structured Blueprint Export**: Download machine-readable `.json` municipal specifications.

---

## 📡 FortyGuard Temperature API Integration

UrbanCanopy AI integrates **all five FortyGuard core endpoints** with production-grade asynchronous polling:

| Endpoint | Method | Purpose in UrbanCanopy AI | Polling Mechanism |
| :--- | :---: | :--- | :---: |
| `/v1/heatmap` | `POST` | Hyperlocal temperature polygon distribution | Exponential backoff ($2\text{s} \rightarrow 8\text{s}$, $30\text{s}$ timeout) |
| `/v1/satellite` | `POST` | High-resolution land-cover segmentation | Async polling via `/v1/status/{id}` |
| `/v1/env_params` | `POST` | Solar irradiance ($W/m^2$), humidity & heat index | Async polling via `/v1/status/{id}` |
| `/v1/streetview` | `POST` | Sidewalk geometry and pedestrian exposure | Async polling via `/v1/status/{id}` |
| `/v1/heat_intelligence` | `POST` | Microclimate intelligence report generation | Async polling via `/v1/status/{id}` |
| `/v1/status/{activity_id}` | `GET` | Asynchronous job status and payload retrieval | Envelope unwrapping (`result.data.features`) |

```typescript
// Production Exponential Backoff Poller in src/lib/fortyguard-client.ts
async function pollActivity<R>(activityId: string): Promise<R> {
  const deadline = Date.now() + POLL_TIMEOUT_MS; // 30s timeout
  let interval = 2000; // 2s initial

  while (Date.now() < deadline) {
    await sleep(interval);
    const status = await getStatus(activityId);
    if (status.status === "SUCCESS") return unwrap(status.result);
    if (status.status === "FAILED") throw new Error(status.error);
    interval = Math.min(interval * 1.4, 8000); // 1.4x backoff up to 8s ceiling
  }
  throw new Error("Polling timeout reached; activating thermodynamic offline engine.");
}
```

---

## 🔬 Scientific & Thermodynamic Modeling

### 1. Thermodynamic Cooling Formula (`src/lib/simulation/eco-physics.ts`)
Rather than arbitrary heuristics, cooling is modeled from energy balance thermodynamics:
* **Solar Attenuation**: $\Delta T_{\text{rad}} = \frac{I_{\text{solar}} \times (1 - \tau_{\text{canopy}}) \times 0.18}{h_c}$ where $h_c \approx 16.5\,\text{W}/(\text{m}^2\cdot\text{K})$
* **Evapotranspiration Cooling**: $\Delta T_{\text{evap}} = \frac{Q_e \times 0.22}{h_c}$ where $Q_e = \frac{\text{Water}_{\text{kg/s}} \times 2.45\times 10^6\,\text{J/kg}}{\text{Canopy Area}}$
* **Gaussian Spatial Plume**: $\Delta T(d) = \Delta T_{\text{net}} \times \exp\left(-\left(\frac{d}{R_{\text{effective}}}\right)^2\right)$

### 2. USDA Forest Service i-Tree Eco Metrics
* **Carbon Sequestration**: $16.0–28.5\,\text{kg CO}_2/\text{tree/year}$ based on species growth rate.
* **Stormwater Interception**: $8.5\,\text{gal}/\text{m}^2/\text{year}$ of mature canopy.
* **HVAC Energy Reduction**: $210\,\text{kWh}/\text{tree/year}$ via building envelope shading.
* **20-Year Benefit-Cost Ratio (BCR)**: Evaluated at $\$0.14/\text{kWh}$, $\$8.20/1\text{k gal}$ stormwater management, and $\$51/\text{ton}$ EPA social cost of carbon.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 15.5 (App Router, Server Actions, API Route Handlers)
* **Language**: TypeScript 5.x (Strict Mode, 0 compile errors)
* **GIS & Visualization**: MapLibre GL 6.4.1 (Canvas Raster Swath, Interactive GeoJSON Layers)
* **Agentic AI**: LangGraph, Gemini 2.5 Flash, Tool-Calling Pipeline with fallback
* **Spatial Database**: PostgreSQL + PostGIS (`pg.Pool` with in-memory fallback)
* **High-Speed Cache**: Redis (`ioredis` with in-memory fallback)
* **Testing**: Vitest (`npm run test`, 20 tests in <1s)
* **Styling**: Vanilla CSS Design System with CSS variables and glassmorphism

---

## ⚡ Quickstart Guide

### Prerequisites
* **Node.js**: v18.17+ (v20+ or v22 LTS recommended)
* **npm**: v9+

### 1. Clone the Repository
```bash
git clone https://github.com/paula785/fortyguard_Hackathon.git
cd fortyguard_Hackathon
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file (or copy from `.env.example`):
```bash
cp .env.example .env.local
```

Configure your API keys:
```env
# FortyGuard Temperature API Credentials
FORTYGUARD_API_KEY=your_fortyguard_api_key_here
FORTYGUARD_BASE_URL=https://api.fortyguard.com/v1

# Optional: Google Gemini API Key for LangGraph Autonomous Agent
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Optional: PostgreSQL + PostGIS (Leave blank for instant zero-dependency in-memory mode)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/urbancool_db

# Optional: Redis Cache (Leave blank for instant zero-dependency in-memory mode)
REDIS_URL=redis://localhost:6379
```

> **Note**: UrbanCanopy AI features full zero-dependency fallback: if database or Redis URLs are omitted, it runs seamlessly out of the box using built-in memory stores!

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & Verification

Run the comprehensive unit test suite:
```bash
npm run test
```

Expected output:
```
 ✓ src/lib/fortyguard-client.test.ts (3 tests)
 ✓ src/lib/irrigation/water-calculator.test.ts (3 tests)
 ✓ src/lib/simulation/eco-physics.test.ts (2 tests)
 ✓ src/lib/simulation/thermal-simulator.test.ts (7 tests)
 ✓ src/lib/catalog/optimizer.test.ts (3 tests)
 ✓ src/lib/db/postgis-client.test.ts (2 tests)

 Test Files  6 passed (6)
      Tests  20 passed (20)
```

To run TypeScript verification:
```bash
npx tsc --noEmit
```

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/route.ts            # SSE streaming LangGraph agent endpoint
│   │   │   ├── heatmap/route.ts          # FortyGuard Heatmap proxy endpoint
│   │   │   └── v1/analysis/              # Asynchronous job dispatch & status routes
│   │   ├── globals.css                   # Full CSS design system & micro-animations
│   │   ├── layout.tsx                    # Root layout with MapLibre stylesheets & SEO
│   │   └── page.tsx                      # 3-Panel main dashboard and 6-tab workspace
│   ├── components/
│   │   ├── Chat/AgentChat.tsx            # AI Chat Assistant with streaming tool logs
│   │   ├── Dashboard/KPIPanel.tsx        # Real-time animated KPI counters
│   │   ├── Dashboard/AnalyticsDrawer.tsx # Deep-dive analytics and temperature curves
│   │   ├── Irrigation/WaterDashboard.tsx # Diurnal water budgeting & timelines
│   │   ├── Map/HeatMap.tsx               # MapLibre GL canvas & thermal swath engine
│   │   ├── Optimizer/OptimizerView.tsx   # Interactive knapsack allocation dashboard
│   │   ├── Report/BlueprintExport.tsx    # Federal grant generator (FEMA, EPA, USDA)
│   │   └── Report/ScenarioComparison.tsx # Multi-scenario side-by-side comparison matrix
│   ├── lib/
│   │   ├── agent/                        # LangGraph graph, 8 tools, and prompt definitions
│   │   ├── catalog/                      # 15 tree species, 6 shade structures, knapsack optimizer
│   │   ├── db/                           # PostGIS client with schema migrations & fallback
│   │   ├── irrigation/                   # 6-factor dynamic irrigation budget calculator
│   │   ├── queue/                        # Redis simulation cache & diagnostic pipeline worker
│   │   ├── simulation/                   # Thermal simulator & USDA i-Tree eco-physics engine
│   │   ├── fortyguard-client.ts          # Asynchronous FortyGuard API client & poller
│   │   └── fortyguard-types.ts           # 25+ TypeScript domain interfaces
│   └── store/
│       └── app-store.ts                  # Zustand global reactive state management
├── .env.example
├── Dockerfile                            # Multi-stage production Docker container
├── docker-compose.yml                    # PostgreSQL + PostGIS + Redis orchestration
├── vitest.config.ts                      # Automated test suite configuration
└── package.json
```

---

## 👥 Hackathon Submission & Authors

* **Project**: UrbanCanopy AI
* **Hackathon**: [FortyGuard Global AI Hackathon '26](https://www.fortyguard.com/hackathon26)
* **Challenge Tracks**: Track 06 (AI Agent Tools) & Track 01 (Urban Systems)
* **Repository**: [github.com/paula785/fortyguard_Hackathon](https://github.com/paula785/fortyguard_Hackathon)
* **API Partner**: [FortyGuard Temperature API](https://docs-api.fortyguard.com/)

---

<div align="center">
  <sub>Built with ❤️ for greener, cooler, and climate-resilient cities.</sub>
</div>
