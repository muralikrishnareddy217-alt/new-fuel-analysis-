/**
 * AERO // FUEL 3D - Vehicle Intelligence & Predictive Insights Engine
 * Derives data-backed telemetry observations from saved records.
 * Distinguishes historical measurements from future trip projections.
 */
(function(window) {
  'use strict';

  window.FuelInsights = {
    /**
     * Analyzes records and generates structured intelligence cards
     */
    generateInsights(records) {
      if (!records || records.length === 0) {
        return {
          hasData: false,
          message: "No fuel records recorded yet. Add your first fuel entry to activate vehicle intelligence.",
          insights: []
        };
      }

      const store = window.FuelStore;
      const metrics = store.getMetrics(records);
      const vehicleStats = metrics.vehicleStats;
      const vehicleList = Object.values(vehicleStats);
      const insights = [];

      // 1. Best Performing Vehicle
      if (metrics.bestVehicle) {
        const best = metrics.bestVehicle;
        insights.push({
          type: "best_efficiency",
          category: "Efficiency Leader",
          title: `${best.vehicle} leads fleet efficiency`,
          value: `${best.efficiency} km/L`,
          subtitle: `Tracked over ${best.totalDistance.toLocaleString()} km across ${best.entriesCount} fill-up(s)`,
          badge: "HIGHEST MILEAGE",
          badgeColor: "cyan",
          details: `Consistently outperforms the overall fleet average of ${metrics.avgEfficiency} km/L by ${metrics.avgEfficiency > 0 ? (((best.efficiency - metrics.avgEfficiency) / metrics.avgEfficiency) * 100).toFixed(1) : 0}%.`
        });
      }

      // 2. Highest Expenditure Vehicle
      if (metrics.highestCostVehicle) {
        const highest = metrics.highestCostVehicle;
        const pctOfTotal = metrics.totalCost > 0
          ? ((highest.totalCost / metrics.totalCost) * 100).toFixed(1)
          : 0;

        insights.push({
          type: "cost_leader",
          category: "Expenditure Hotspot",
          title: `${highest.vehicle} accounts for largest spend`,
          value: `₹ ${highest.totalCost.toLocaleString('en-IN')}`,
          subtitle: `${pctOfTotal}% of total recorded fleet fuel expenses`,
          badge: "HIGHEST SPEND",
          badgeColor: "rose",
          details: `Average operating fuel expense is ₹ ${highest.costPerKm.toFixed(2)} per kilometre driven.`
        });
      }

      // 3. Efficiency Spread (Delta between Best & Worst)
      if (vehicleList.length >= 2 && metrics.bestVehicle && metrics.worstVehicle) {
        const best = metrics.bestVehicle;
        const worst = metrics.worstVehicle;
        const diff = best.efficiency - worst.efficiency;
        const diffPct = worst.efficiency > 0 ? ((diff / worst.efficiency) * 100).toFixed(1) : 0;

        insights.push({
          type: "fleet_delta",
          category: "Vehicle Variance",
          title: `Fleet Mileage Variance: +${diff.toFixed(2)} km/L`,
          value: `${diffPct}% Spread`,
          subtitle: `Comparison: ${best.vehicle} vs. ${worst.vehicle}`,
          badge: "FLEET BENCHMARK",
          badgeColor: "violet",
          details: `${best.vehicle} (${best.efficiency} km/L) yields ${diffPct}% superior fuel economy compared to ${worst.vehicle} (${worst.efficiency} km/L).`
        });
      }

      // 4. Multi-entry Vehicle Trends (Tracking improvement or decline)
      const multiEntryVehicles = vehicleList.filter(v => v.records && v.records.length >= 2);
      multiEntryVehicles.forEach(veh => {
        const sortedRecs = [...veh.records].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstEff = sortedRecs[0].efficiency;
        const latestEff = sortedRecs[sortedRecs.length - 1].efficiency;
        const change = latestEff - firstEff;
        const changePct = firstEff > 0 ? ((change / firstEff) * 100).toFixed(1) : 0;

        const isImproving = change >= 0;
        insights.push({
          type: "trend_tracking",
          category: "Performance Trajectory",
          title: `${veh.vehicle}: ${isImproving ? 'Improving' : 'Declining'} Economy`,
          value: `${isImproving ? '+' : ''}${change.toFixed(2)} km/L`,
          subtitle: `${isImproving ? '+' : ''}${changePct}% shift across ${veh.records.length} sequential fills`,
          badge: isImproving ? "OPTIMIZED" : "ATTENTION",
          badgeColor: isImproving ? "emerald" : "amber",
          details: `Initial entry recorded ${firstEff} km/L; most recent logged record achieved ${latestEff} km/L.`
        });
      });

      // 5. Operating Cost Benchmark
      insights.push({
        type: "cost_per_km",
        category: "Operating Telemetry",
        title: "Fleet Average Fuel Cost / KM",
        value: `₹ ${metrics.avgCostPerKm.toFixed(2)} / km`,
        subtitle: `Aggregated from ₹ ${metrics.totalCost.toLocaleString('en-IN')} across ${metrics.totalDistance.toLocaleString()} km`,
        badge: "ECONOMIC METRIC",
        badgeColor: "blue",
        details: "Calculated using distance-weighted cumulative fuel expenditure divided by total distance logged."
      });

      return {
        hasData: true,
        metrics,
        insights
      };
    },

    /**
     * Estimates future trip fuel requirements and expense
     * Uses historical distance-weighted mileage as baseline.
     */
    estimateTrip(distanceKm, vehicleName, fuelPricePerLitre = 102.5) {
      const dist = Math.max(0, Number(distanceKm) || 0);
      const price = Math.max(0, Number(fuelPricePerLitre) || 100);

      const store = window.FuelStore;
      const records = store.getRecords();
      const metrics = store.getMetrics(records);
      const vehicleStats = metrics.vehicleStats;

      let baselineEfficiency = 15.0; // Standard fallback benchmark
      let vehicleFound = null;

      if (vehicleName && vehicleStats[vehicleName]) {
        vehicleFound = vehicleStats[vehicleName];
        if (vehicleFound.efficiency > 0) {
          baselineEfficiency = vehicleFound.efficiency;
        }
      } else if (metrics.avgEfficiency > 0) {
        baselineEfficiency = metrics.avgEfficiency;
      }

      const estimatedLitres = dist > 0 ? Number((dist / baselineEfficiency).toFixed(2)) : 0;
      const estimatedCost = Number((estimatedLitres * price).toFixed(2));
      const estimatedCostPerKm = dist > 0 ? Number((estimatedCost / dist).toFixed(2)) : 0;

      return {
        distanceKm: dist,
        vehicleName: vehicleFound ? vehicleFound.vehicle : (vehicleName || "Fleet Average"),
        baselineEfficiency,
        fuelPricePerLitre: price,
        estimatedLitres,
        estimatedCost,
        estimatedCostPerKm,
        basedOnEntries: vehicleFound ? vehicleFound.entriesCount : records.length,
        isProjection: true,
        disclaimer: "Historical projection based on saved log entries. Driving conditions, traffic, payload, and speed will influence real-world results."
      };
    }
  };

})(window);
