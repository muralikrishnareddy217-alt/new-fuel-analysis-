/**
 * AERO // FUEL 3D - Chart.js Visualization Engine
 * High-performance, responsive charts with glassmorphism tooltips & dark telemetry themes.
 */
(function(window) {
  'use strict';

  // Global Chart.js registry
  const chartInstances = {};

  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  function getThemeColors() {
    return {
      textColor: '#94a3b8',
      gridColor: 'rgba(255, 255, 255, 0.06)',
      tooltipBg: 'rgba(15, 23, 42, 0.95)',
      tooltipBorder: 'rgba(56, 189, 248, 0.3)',
      primary: '#00f0ff',
      secondary: '#8b5cf6',
      accent: '#38bdf8',
      rose: '#f43f5e',
      emerald: '#10b981',
      amber: '#f59e0b'
    };
  }

  window.FuelCharts = {
    /**
     * Renders or updates the Fuel Trends Chart (Distance vs Fuel Litres)
     */
    renderTrendsChart(canvasId, monthlyData) {
      if (!window.Chart) return;
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      destroyChart(canvasId);

      const colors = getThemeColors();
      const ctx = canvas.getContext('2d');

      if (!monthlyData || monthlyData.length === 0) {
        this.renderEmptyChart(ctx, "No timeline records available yet.");
        return;
      }

      const labels = monthlyData.map(m => m.month);
      const distances = monthlyData.map(m => m.totalDistance);
      const litres = monthlyData.map(m => m.totalFuel);

      // Create gradient
      const gradDist = ctx.createLinearGradient(0, 0, 0, 300);
      gradDist.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      gradDist.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Distance (km)',
              data: distances,
              borderColor: colors.primary,
              backgroundColor: gradDist,
              borderWidth: 2.5,
              tension: 0.38,
              fill: true,
              yAxisID: 'yDist',
              pointBackgroundColor: colors.primary,
              pointBorderColor: '#070b14',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'Fuel Used (L)',
              data: litres,
              borderColor: colors.secondary,
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              borderDash: [5, 4],
              tension: 0.38,
              fill: false,
              yAxisID: 'yFuel',
              pointBackgroundColor: colors.secondary,
              pointBorderColor: '#070b14',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: colors.textColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12 },
                usePointStyle: true,
                boxWidth: 8
              }
            },
            tooltip: {
              backgroundColor: colors.tooltipBg,
              borderColor: colors.tooltipBorder,
              borderWidth: 1,
              titleColor: '#f8fafc',
              bodyColor: '#e2e8f0',
              padding: 12,
              cornerRadius: 8,
              boxPadding: 4
            }
          },
          scales: {
            x: {
              grid: { color: colors.gridColor },
              ticks: { color: colors.textColor, font: { size: 11 } }
            },
            yDist: {
              type: 'linear',
              display: true,
              position: 'left',
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.textColor,
                callback: v => `${v} km`
              }
            },
            yFuel: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: colors.textColor,
                callback: v => `${v} L`
              }
            }
          }
        }
      });
    },

    /**
     * Renders Expenditure Breakdown & Trends Chart
     */
    renderCostChart(canvasId, monthlyData) {
      if (!window.Chart) return;
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      destroyChart(canvasId);

      const colors = getThemeColors();
      const ctx = canvas.getContext('2d');

      if (!monthlyData || monthlyData.length === 0) {
        this.renderEmptyChart(ctx, "No expenditure records found.");
        return;
      }

      const labels = monthlyData.map(m => m.month);
      const costs = monthlyData.map(m => m.totalCost);

      const gradCost = ctx.createLinearGradient(0, 0, 0, 300);
      gradCost.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
      gradCost.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

      chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Total Cost (₹ INR)',
            data: costs,
            backgroundColor: gradCost,
            borderColor: colors.emerald,
            borderWidth: 1.5,
            borderRadius: 6,
            barPercentage: 0.55
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: colors.tooltipBg,
              borderColor: colors.tooltipBorder,
              borderWidth: 1,
              titleColor: '#f8fafc',
              bodyColor: '#e2e8f0',
              padding: 12,
              callbacks: {
                label: ctx => ` ₹ ${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: colors.gridColor },
              ticks: { color: colors.textColor }
            },
            y: {
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.textColor,
                callback: v => `₹${v.toLocaleString('en-IN')}`
              }
            }
          }
        }
      });
    },

    /**
     * Renders Vehicle-by-Vehicle Mileage Comparison
     */
    renderEfficiencyChart(canvasId, vehicleStats) {
      if (!window.Chart) return;
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      destroyChart(canvasId);

      const colors = getThemeColors();
      const ctx = canvas.getContext('2d');

      const vehicles = Object.values(vehicleStats || {});
      if (!vehicles.length) {
        this.renderEmptyChart(ctx, "No vehicle mileage data.");
        return;
      }

      // Sort by efficiency descending
      vehicles.sort((a, b) => b.efficiency - a.efficiency);

      const labels = vehicles.map(v => v.vehicle);
      const efficiencies = vehicles.map(v => v.efficiency);
      const palette = ['#00f0ff', '#38bdf8', '#818cf8', '#a78bfa', '#ec4899', '#f43f5e', '#10b981'];

      const bgColors = vehicles.map((_, i) => palette[i % palette.length]);

      chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Fuel Mileage (km/L)',
            data: efficiencies,
            backgroundColor: bgColors,
            borderRadius: 6,
            barThickness: 20
          }]
        },
        options: {
          indexAxis: 'y', // Horizontal bars
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: colors.tooltipBg,
              borderColor: colors.tooltipBorder,
              borderWidth: 1,
              titleColor: '#f8fafc',
              bodyColor: '#e2e8f0',
              callbacks: {
                label: ctx => ` Mileage: ${ctx.raw} km/L`
              }
            }
          },
          scales: {
            x: {
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.textColor,
                callback: v => `${v} km/L`
              }
            },
            y: {
              grid: { display: false },
              ticks: { color: colors.textColor }
            }
          }
        }
      });
    },

    /**
     * Renders Fuel Type Distribution Doughnut
     */
    renderFuelDistributionChart(canvasId, records) {
      if (!window.Chart) return;
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      destroyChart(canvasId);

      const colors = getThemeColors();
      const ctx = canvas.getContext('2d');

      if (!records || !records.length) {
        this.renderEmptyChart(ctx, "No fuel distribution data.");
        return;
      }

      const counts = {};
      records.forEach(r => {
        const type = r.fuel || "Other";
        counts[type] = (counts[type] || 0) + r.litres;
      });

      const labels = Object.keys(counts);
      const data = Object.values(counts).map(v => Number(v.toFixed(1)));
      const colorMap = {
        Petrol: '#38bdf8',
        Diesel: '#f59e0b',
        Hybrid: '#10b981',
        Electric: '#00f0ff',
        CNG: '#a855f7',
        LPG: '#f43f5e'
      };

      const bgColors = labels.map(l => colorMap[l] || '#94a3b8');

      chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: bgColors,
            borderColor: '#070b14',
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: colors.textColor,
                font: { size: 11 },
                usePointStyle: true,
                padding: 12
              }
            },
            tooltip: {
              backgroundColor: colors.tooltipBg,
              borderColor: colors.tooltipBorder,
              borderWidth: 1,
              callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.raw} Litres`
              }
            }
          }
        }
      });
    },

    renderEmptyChart(ctx, message) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.restore();
    },

    destroyAll() {
      Object.keys(chartInstances).forEach(destroyChart);
    }
  };

})(window);
