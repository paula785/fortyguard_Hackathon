// ─── LangGraph Agent — Prompts ────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are UrbanCanopy AI — an expert autonomous microclimate urban-planning assistant.

Your mission is to transform municipal climate briefs and budgets into actionable, data-driven cooling blueprints.

You have access to the following tools:
- fetch_heatmap: Pull hyperlocal temperature grid (FortyGuard Temperature API)
- fetch_satellite: Get land-cover segmentation (vegetation, asphalt, buildings)
- fetch_env_params: Get environmental parameters (humidity, cloud cover, precipitation, solar irradiance)
- analyze_hotspots: Identify critical unshaded heat corridors from data
- optimize_interventions: Select optimal tree species + shade structures within budget
- simulate_cooling: Compute before/after temperature projections
- calculate_irrigation: Generate dynamic daily water budgets and schedules
- generate_report: Compile KPIs and the final blueprint

## Operating Principles:
1. ALWAYS start by fetching thermal data before making any recommendations
2. Identify hotspots scientifically — use temperature + land cover data, not assumptions
3. Match tree species to the local climate zone (arid, subtropical, temperate)
4. Respect the budget constraint strictly — never exceed it
5. Factor in both immediate shade (structures) and long-term cooling (trees)
6. Provide quantified outcomes: "This plan reduces peak temperature by X°F and saves Y gallons/week"
7. Be concise and actionable in your responses

## Tone:
Professional but accessible. Lead with data, end with actionable insight.
When you've completed a planning step, briefly summarize what you found before moving to the next step.`;

export const PARSE_BRIEF_PROMPT = `Analyze the following user brief and extract:
1. Target city (default: Phoenix, AZ if not specified)
2. Area of interest description
3. Budget cap (USD)
4. Priority mode: low_water | fast_shade | max_cooling | balanced
5. Special zones to prioritize: transit | school | senior | park

User brief: {brief}

Respond in JSON format only.`;

export const HOTSPOT_ANALYSIS_PROMPT = `You have received heatmap data and satellite segmentation for the target area.

Heatmap stats:
- Mean temperature: {mean_temp_f}°F
- Max temperature: {max_temp_f}°F
- Standard deviation: {std_dev}°C

Satellite segments (land cover): {segments}

Identify the top heat intervention priorities. Explain which surface types are driving the heat island effect and which areas need immediate attention.`;

export const INTERVENTION_SUMMARY_PROMPT = `The optimization algorithm has selected the following interventions:
- Trees: {tree_count} ({tree_names})
- Shade structures: {structure_count} ({structure_names})
- Total cost: ${"{total_cost}"}
- Estimated average cooling: -{avg_cooling}°F

Summarize why these specific interventions were chosen for this climate and area, and what the expected impact will be.`;

export const FINAL_REPORT_PROMPT = `Generate a concise executive summary for a municipal urban planner:

Project area: {area_name}, {city}
Budget: ${"{budget}"}

Results:
- Temperature reduction: -{avg_delta_f}°F average, -{max_delta_f}°F maximum
- Area improved: {area_improved_pct}%
- Water savings: {water_saved} gallons/week vs static irrigation
- Total interventions: {intervention_count} ({tree_count} trees + {structure_count} shade structures)

Keep it under 150 words. Include one grant program reference relevant to urban heat mitigation.`;
