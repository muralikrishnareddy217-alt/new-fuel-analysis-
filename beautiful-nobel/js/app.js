/**
 * AERO // FUEL 3D - Master Application Controller
 * Wires routing, Three.js 3D viewport, Chart.js analytics, UI events & keyboard shortcuts.
 */
(function(window) {
  'use strict';

  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  class Application {
    constructor() {
      this.currentPage = "overview";
      this.threeViewer = null;
      this.store = window.FuelStore;
      this.ui = window.FuelUI;
      this.charts = window.FuelCharts;
      this.catalog = window.FuelCatalog;
      this.insights = window.FuelInsights;
    }

    init() {
      // Initialize UI subsystems
      this.ui.init();

      // Apply saved user settings (theme, animation, etc.)
      this.applySavedSettings();

      // Setup Live Clock
      this.initClock();

      // Initialize Three.js 3D Viewer
      this.initThreeViewer();

      // Setup Navigation & Router
      this.setupNavigation();

      // Wire Forms & Inputs
      this.setupEventListeners();

      // Load initial view & data
      this.refreshAllData();

      // Handle direct hash navigation
      const initialHash = window.location.hash.replace("#", "") || "overview";
      this.navigate(initialHash);
    }

    applySavedSettings() {
      const settings = this.store.getSettings();
      document.documentElement.setAttribute("data-theme", settings.theme || "dark");
      document.documentElement.setAttribute("data-animation-quality", settings.animationQuality || "high");

      if (settings.reducedMotion) {
        document.documentElement.classList.add("reduced-motion");
      } else {
        document.documentElement.classList.remove("reduced-motion");
      }

      // Populate Settings Form
      const themeSelect = document.getElementById("settingTheme");
      const qualitySelect = document.getElementById("settingQuality");
      const motionCheckbox = document.getElementById("settingReducedMotion");

      if (themeSelect) themeSelect.value = settings.theme || "dark";
      if (qualitySelect) qualitySelect.value = settings.animationQuality || "high";
      if (motionCheckbox) motionCheckbox.checked = !!settings.reducedMotion;
    }

    initClock() {
      const clockEl = document.getElementById("topNavClock");
      if (!clockEl) return;

      const updateClock = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        clockEl.textContent = `${dateStr} • ${timeStr}`;
      };

      updateClock();
      setInterval(updateClock, 1000);
    }

    initThreeViewer() {
      const container = document.getElementById("heroCarCanvas");
      if (!container) return;

      const settings = this.store.getSettings();
      const records = this.store.getRecords();
      let initialColor = "#004fc7";
      if (records.length > 0 && records[0].color) {
        initialColor = records[0].color;
      }

      try {
        this.threeViewer = new window.FuelThreeViewer("heroCarCanvas", {
          autoRotate: !settings.reducedMotion,
          rotationSpeed: 0.6,
          paintColor: initialColor,
          quality: settings.animationQuality || "high"
        });
      } catch (err) {
        console.warn("Failed to create Three.js viewer:", err);
      }
    }

    setupNavigation() {
      // Sidebar links
      document.querySelectorAll(".sidebar-nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const target = item.dataset.page;
          if (target) this.navigate(target);
        });
      });

      // Quick CTA buttons
      document.querySelectorAll("[data-nav-target]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const target = btn.dataset.navTarget;
          if (target) this.navigate(target);
        });
      });

      // Sidebar mobile drawer toggle
      const sidebarToggle = document.getElementById("sidebarToggleBtn");
      const sidebar = document.getElementById("appSidebar");
      if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", () => {
          sidebar.classList.toggle("mobile-open");
        });
      }

      // Close mobile sidebar when clicking outside
      document.addEventListener("click", (e) => {
        if (sidebar && sidebar.classList.contains("mobile-open")) {
          if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove("mobile-open");
          }
        }
      });

      // Handle window popstate (back/forward)
      window.addEventListener("hashchange", () => {
        const hash = window.location.hash.replace("#", "") || "overview";
        if (hash !== this.currentPage) {
          this.navigate(hash, false);
        }
      });
    }

    navigate(pageName, updateHash = true) {
      const validPages = ["overview", "add", "vehicles", "search", "all", "analytics", "reports", "settings"];
      const targetPage = validPages.includes(pageName) ? pageName : "overview";

      this.currentPage = targetPage;
      if (updateHash) {
        window.location.hash = targetPage;
      }

      // Update Sidebar Active state
      document.querySelectorAll(".sidebar-nav-item").forEach(item => {
        const isMatch = item.dataset.page === targetPage;
        item.classList.toggle("active", isMatch);
      });

      // Update Views Display
      document.querySelectorAll(".app-view-panel").forEach(view => {
        const isMatch = view.id === `view-${targetPage}`;
        view.classList.toggle("active", isMatch);
      });

      // Close mobile sidebar if open
      const sidebar = document.getElementById("appSidebar");
      if (sidebar) sidebar.classList.remove("mobile-open");

      // Trigger view-specific refreshes
      this.onPageActivated(targetPage);

      // Scroll to top of content
      const mainContent = document.getElementById("mainContentArea");
      if (mainContent) mainContent.scrollTop = 0;
    }

    onPageActivated(page) {
      const records = this.store.getRecords();
      const metrics = this.store.getMetrics(records);

      switch (page) {
        case "overview":
          this.ui.renderOverviewKPIs(metrics);
          this.ui.renderRecentRecordsTable(records);
          this.ui.renderRankingsLeaderboard(metrics.vehicleStats);
          this.refreshOverviewCharts(records);
          break;

        case "add":
          if (!this.ui.wizardState.isEdit) {
            this.ui.resetWizard();
          }
          break;

        case "search":
          this.ui.renderSearchResults();
          break;

        case "all":
          this.ui.renderAllRecordsView();
          break;

        case "analytics":
          this.refreshAnalyticsPage(records);
          break;

        case "reports":
          this.refreshReportsPage(records, metrics);
          break;

        case "vehicles":
          this.refreshVehiclesCatalogPage();
          break;

        case "settings":
          this.applySavedSettings();
          break;
      }

      if (window.lucide) window.lucide.createIcons();
    }

    refreshAllData() {
      const records = this.store.getRecords();
      const metrics = this.store.getMetrics(records);

      // Sidebar storage indicator
      const counterEl = document.getElementById("sidebarRecordCount");
      if (counterEl) counterEl.textContent = `${records.length} records`;

      // Update current active page
      this.onPageActivated(this.currentPage);
    }

    refreshOverviewCharts(records) {
      const monthly = this.store.getMonthlyTrends(records);
      const metrics = this.store.getMetrics(records);

      this.charts.renderTrendsChart("overviewTrendsChart", monthly);
    }

    refreshAnalyticsPage(records) {
      const monthly = this.store.getMonthlyTrends(records);
      const metrics = this.store.getMetrics(records);

      this.charts.renderTrendsChart("analyticsTrendsChart", monthly);
      this.charts.renderCostChart("analyticsCostChart", monthly);
      this.charts.renderEfficiencyChart("analyticsEfficiencyChart", metrics.vehicleStats);
      this.charts.renderFuelDistributionChart("analyticsFuelShareChart", records);

      // Render Vehicle Intelligence
      const insightsData = this.insights.generateInsights(records);
      this.ui.renderInsightsPanel(insightsData);

      // Populate Trip Estimator Vehicle Dropdown
      const estimatorSelect = document.getElementById("estimatorVehicleSelect");
      if (estimatorSelect) {
        const vehicleNames = Object.keys(metrics.vehicleStats);
        estimatorSelect.innerHTML = `
          <option value="">Fleet Average (${metrics.avgEfficiency} km/L)</option>
          ${vehicleNames.map(name => `
            <option value="${esc(name)}">${esc(name)} (${metrics.vehicleStats[name].efficiency} km/L)</option>
          `).join("")}
        `;
      }

      // Initial run of trip estimator
      this.runTripEstimator();
    }

    refreshReportsPage(records, metrics) {
      const tableBody = document.getElementById("reportTableBody");
      const summaryContainer = document.getElementById("reportSummaryKPIs");
      const dateEl = document.getElementById("reportGeneratedDate");

      if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }

      if (summaryContainer) {
        summaryContainer.innerHTML = `
          <div class="report-kpi">
            <span>Total Records</span>
            <strong>${metrics.totalRecords}</strong>
          </div>
          <div class="report-kpi">
            <span>Total Distance</span>
            <strong>${metrics.totalDistance.toLocaleString()} km</strong>
          </div>
          <div class="report-kpi">
            <span>Total Fuel</span>
            <strong>${metrics.totalFuel.toLocaleString()} L</strong>
          </div>
          <div class="report-kpi">
            <span>Average Mileage (Weighted)</span>
            <strong>${metrics.avgEfficiency} km/L</strong>
          </div>
          <div class="report-kpi">
            <span>Total Fuel Expense</span>
            <strong>₹ ${metrics.totalCost.toLocaleString('en-IN')}</strong>
          </div>
          <div class="report-kpi">
            <span>Avg Operating Cost</span>
            <strong>₹ ${metrics.avgCostPerKm.toFixed(2)} / km</strong>
          </div>
        `;
      }

      if (tableBody) {
        if (!records.length) {
          tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No fuel records found for report generation.</td></tr>`;
        } else {
          tableBody.innerHTML = records.map(r => `
            <tr>
              <td>#${r.id}</td>
              <td>${esc(r.date)}</td>
              <td><strong>${esc(r.vehicle)}</strong> (${r.year})</td>
              <td>${esc(r.fuel)}</td>
              <td>${r.distance.toLocaleString()} km</td>
              <td>${r.litres.toLocaleString()} L</td>
              <td><strong>${r.efficiency} km/L</strong></td>
              <td>₹ ${r.totalCost.toLocaleString('en-IN')}</td>
            </tr>
          `).join("");
        }
      }
    }

    refreshVehiclesCatalogPage() {
      const container = document.getElementById("catalogBrandsGrid");
      if (!container) return;

      const catalog = this.catalog;
      const brands = catalog.getBrands();

      container.innerHTML = brands.map(brand => {
        const models = catalog.getModels(brand);
        return `
          <div class="catalog-brand-card tilt-card">
            <div class="brand-header">
              <h4>${esc(brand)}</h4>
              <span class="models-count-tag">${models.length} models</span>
            </div>
            <div class="brand-models-preview">
              ${models.slice(0, 5).map(m => `<span class="model-badge">${esc(m)}</span>`).join("")}
              ${models.length > 5 ? `<span class="model-badge more">+${models.length - 5} more</span>` : ''}
            </div>
            <button type="button" class="btn btn-secondary btn-sm select-brand-cta" data-brand="${esc(brand)}">
              Select for Fill-up
            </button>
          </div>
        `;
      }).join("");

      container.querySelectorAll(".select-brand-cta").forEach(btn => {
        btn.addEventListener("click", () => {
          const brand = btn.dataset.brand;
          this.ui.resetWizard();
          this.ui.wizardState.brand = brand;
          const brandInput = document.getElementById("brandSearch");
          if (brandInput) brandInput.value = brand;
          this.ui.renderBrandSelection();
          this.ui.renderModelSelection();
          this.navigate("add");
          this.ui.showWizardStep(2);
        });
      });

      this.ui.initTiltCards();
    }

    runTripEstimator() {
      const distInput = document.getElementById("estimatorDistance");
      const vehicleSelect = document.getElementById("estimatorVehicleSelect");
      const priceInput = document.getElementById("estimatorPrice");

      const dist = distInput ? parseFloat(distInput.value) || 250 : 250;
      const vehicle = vehicleSelect ? vehicleSelect.value : "";
      const price = priceInput ? parseFloat(priceInput.value) || 102.5 : 102.5;

      const result = this.insights.estimateTrip(dist, vehicle, price);
      this.ui.renderTripEstimator(result);
    }

    setupEventListeners() {
      // 1. Wizard Buttons
      document.getElementById("wizardNextBtn")?.addEventListener("click", () => {
        if (!this.ui.validateCurrentStep()) return;

        if (this.ui.wizardState.step < 4) {
          this.ui.showWizardStep(this.ui.wizardState.step + 1);
        } else {
          this.ui.saveWizardRecord();
        }
      });

      document.getElementById("wizardBackBtn")?.addEventListener("click", () => {
        if (this.ui.wizardState.step > 1) {
          this.ui.showWizardStep(this.ui.wizardState.step - 1);
        }
      });

      document.getElementById("wizardCancelBtn")?.addEventListener("click", () => {
        this.ui.resetWizard();
        this.navigate("overview");
      });

      // Wizard Brand & Model Search inputs
      document.getElementById("brandSearch")?.addEventListener("input", () => {
        this.ui.renderBrandSelection();
      });

      document.getElementById("modelSearch")?.addEventListener("input", () => {
        this.ui.renderModelSelection();
      });

      // Step 3 Live Calculations
      ["distance", "litres", "cost", "year", "fuel", "color", "recordDate", "recordNotes"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => {
          this.ui.updateWizardCalculations();
        });
      });

      // 3D Car Viewport Controls in Hero
      document.getElementById("btnToggleHeadlights")?.addEventListener("click", () => {
        if (this.threeViewer) {
          const on = this.threeViewer.toggleHeadlights();
          this.ui.showToast(`Headlights ${on ? 'ON' : 'OFF'}`, 'info', 1800);
        }
      });

      document.getElementById("btnToggleWireframe")?.addEventListener("click", () => {
        if (this.threeViewer) {
          const wire = this.threeViewer.toggleWireframe();
          this.ui.showToast(`Wireframe Hologram ${wire ? 'ON' : 'OFF'}`, 'info', 1800);
        }
      });

      document.getElementById("btnToggleAutoRotate")?.addEventListener("click", (e) => {
        if (this.threeViewer && this.threeViewer.controls) {
          const current = this.threeViewer.controls.autoRotate;
          this.threeViewer.setAutoRotate(!current);
          e.currentTarget.classList.toggle("active", !current);
          this.ui.showToast(`Auto-rotation ${!current ? 'ENABLED' : 'PAUSED'}`, 'info', 1800);
        }
      });

      document.querySelectorAll("[data-cam-view]").forEach(btn => {
        btn.addEventListener("click", () => {
          const view = btn.dataset.camView;
          if (this.threeViewer) {
            this.threeViewer.setCameraView(view);
          }
        });
      });

      // Color Swatches in Hero Telemetry Bar
      document.querySelectorAll(".hero-color-swatch").forEach(swatch => {
        swatch.addEventListener("click", () => {
          const hex = swatch.dataset.color;
          if (this.threeViewer) {
            this.threeViewer.setPaintColor(hex);
            this.ui.showToast(`Vehicle Paint: ${swatch.title}`, 'info', 1500);
          }
        });
      });

      // 2. Search & Filter Listeners
      const searchInput = document.getElementById("searchFilterQuery");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          this.ui.searchState.query = e.target.value;
          this.ui.renderSearchResults();
        });
      }

      document.getElementById("searchFilterFuel")?.addEventListener("change", (e) => {
        this.ui.searchState.fuel = e.target.value;
        this.ui.renderSearchResults();
      });

      document.getElementById("searchFilterYear")?.addEventListener("change", (e) => {
        this.ui.searchState.year = e.target.value;
        this.ui.renderSearchResults();
      });

      document.getElementById("searchFilterSort")?.addEventListener("change", (e) => {
        this.ui.searchState.sortBy = e.target.value;
        this.ui.renderSearchResults();
      });

      document.getElementById("viewModeTableBtn")?.addEventListener("click", (e) => {
        this.ui.searchState.viewMode = "table";
        document.getElementById("viewModeTableBtn")?.classList.add("active");
        document.getElementById("viewModeCardsBtn")?.classList.remove("active");
        this.ui.renderSearchResults();
      });

      document.getElementById("viewModeCardsBtn")?.addEventListener("click", (e) => {
        this.ui.searchState.viewMode = "cards";
        document.getElementById("viewModeCardsBtn")?.classList.add("active");
        document.getElementById("viewModeTableBtn")?.classList.remove("active");
        this.ui.renderSearchResults();
      });

      document.getElementById("clearSearchFiltersBtn")?.addEventListener("click", () => {
        this.ui.resetSearchFilters();
      });

      // 3. Global Edit & Delete Record Handlers (delegated)
      document.addEventListener("click", (e) => {
        // Edit Button
        const editBtn = e.target.closest(".edit-record-btn");
        if (editBtn) {
          const id = editBtn.dataset.id;
          const record = this.store.getRecordById(id);
          if (record) {
            this.ui.resetWizard(true, record);
            this.navigate("add");
          }
          return;
        }

        // Delete Button
        const delBtn = e.target.closest(".del-record-btn");
        if (delBtn) {
          const id = delBtn.dataset.id;
          const record = this.store.getRecordById(id);
          const vehicleName = record ? record.vehicle : `Record #${id}`;

          this.ui.showConfirmModal(
            "Delete Fuel Record",
            `Are you sure you want to permanently delete the fuel entry for ${vehicleName}? This action cannot be undone.`,
            "Delete Entry",
            () => {
              const success = this.store.deleteRecord(id);
              if (success) {
                this.ui.showToast(`Deleted fuel record #${id} successfully.`, "success");
                this.refreshAllData();
              } else {
                this.ui.showToast("Failed to delete record.", "error");
              }
            },
            true // isDanger
          );
          return;
        }
      });

      // 4. Trip Estimator Inputs
      ["estimatorDistance", "estimatorPrice"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => {
          this.runTripEstimator();
        });
      });
      document.getElementById("estimatorVehicleSelect")?.addEventListener("change", () => {
        this.runTripEstimator();
      });

      // 5. Data Management (Export CSV, JSON, Import, Demo Fleet, Reset)
      document.getElementById("btnExportCSV")?.addEventListener("click", () => {
        const csv = this.store.exportCSV();
        if (!csv) {
          this.ui.showToast("No records available to export.", "warning");
          return;
        }
        this.downloadFile(csv, `fuel_records_${new Date().toISOString().split('T')[0]}.csv`, "text/csv;charset=utf-8;");
        this.ui.showToast("CSV report downloaded successfully!", "success");
      });

      document.getElementById("btnExportJSON")?.addEventListener("click", () => {
        const json = this.store.exportJSON();
        this.downloadFile(json, `fuel_backup_${new Date().toISOString().split('T')[0]}.json`, "application/json");
        this.ui.showToast("JSON database backup created successfully!", "success");
      });

      document.getElementById("btnImportJSON")?.addEventListener("click", () => {
        const fileInput = document.getElementById("jsonFileInput");
        if (fileInput) fileInput.click();
      });

      document.getElementById("jsonFileInput")?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target.result;
          const result = this.store.importJSON(content);
          if (result.success) {
            this.ui.showToast(`Restored ${result.count} records from backup file!`, "success");
            this.refreshAllData();
          } else {
            this.ui.showToast(`Restore failed: ${result.error}`, "error");
          }
          // Reset file input
          e.target.value = "";
        };
        reader.readAsText(file);
      });

      const triggerLoad500 = () => {
        this.ui.showConfirmModal(
          "Generate & Load 500 Car Records",
          "This will automatically generate and update 500 complete car records covering all 49 automotive brands, random models, realistic fuel types (Petrol, Diesel, Hybrid, CNG, Electric, LPG), and varied dates across 2024 to 2026. Existing records will be replaced.",
          "Generate 500 Records",
          () => {
            const records = this.store.load500Records();
            this.ui.showToast(`Successfully generated and updated ${records.length} car records across 49 brands!`, "success", 4000);
            this.refreshAllData();
          }
        );
      };

      document.getElementById("btnGenerate500Records")?.addEventListener("click", triggerLoad500);
      document.getElementById("btnLoad500AllRecords")?.addEventListener("click", triggerLoad500);
      document.getElementById("btnLoadSampleData")?.addEventListener("click", triggerLoad500);
      document.getElementById("emptyBannerLoadDemoBtn")?.addEventListener("click", triggerLoad500);

      document.getElementById("btnClearAllData")?.addEventListener("click", () => {
        this.ui.showConfirmModal(
          "Clear All Local Storage Data",
          "Are you sure you want to erase all fuel records from your browser's localStorage? This cannot be reversed.",
          "Erase Everything",
          () => {
            this.store.clearAllRecords();
            this.ui.showToast("All fuel records have been erased from browser storage.", "warning");
            this.refreshAllData();
          },
          true
        );
      });

      document.getElementById("btnPrintReport")?.addEventListener("click", () => {
        window.print();
      });

      // 6. Settings Form Listeners
      document.getElementById("settingTheme")?.addEventListener("change", (e) => {
        const settings = this.store.getSettings();
        settings.theme = e.target.value;
        this.store.saveSettings(settings);
        this.applySavedSettings();
        this.ui.showToast(`Theme changed to ${e.target.value}`, "info", 1500);
      });

      document.getElementById("settingQuality")?.addEventListener("change", (e) => {
        const settings = this.store.getSettings();
        settings.animationQuality = e.target.value;
        this.store.saveSettings(settings);
        this.applySavedSettings();
        this.ui.showToast(`Graphics quality set to ${e.target.value}. Reloading 3D engine...`, "info", 2000);
        // Reinitialize viewer
        if (this.threeViewer) {
          this.threeViewer.destroy();
          this.initThreeViewer();
        }
      });

      document.getElementById("settingReducedMotion")?.addEventListener("change", (e) => {
        const settings = this.store.getSettings();
        settings.reducedMotion = e.target.checked;
        this.store.saveSettings(settings);
        this.applySavedSettings();
        if (this.threeViewer) {
          this.threeViewer.setAutoRotate(!e.target.checked);
        }
        this.ui.showToast(e.target.checked ? "Reduced motion active" : "Full animation active", "info", 1500);
      });

      // 7. Global Keyboard Shortcuts
      document.addEventListener("keydown", (e) => {
        // Quick search shortcut: "/" or "Ctrl+K"
        if ((e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") ||
            (e.ctrlKey && e.key.toLowerCase() === "k")) {
          e.preventDefault();
          this.navigate("search");
          const searchInp = document.getElementById("searchFilterQuery");
          if (searchInp) searchInp.focus();
        }

        // New record shortcut: "n" when not typing in form
        if (e.key.toLowerCase() === "n" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA" && !e.ctrlKey) {
          e.preventDefault();
          this.ui.resetWizard();
          this.navigate("add");
        }

        // Escape closes modals
        if (e.key === "Escape") {
          this.ui.hideModal();
        }
      });
    }

    downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Initialize application on DOM ready
  window.addEventListener("DOMContentLoaded", () => {
    window.app = new Application();
    window.app.init();
  });

})(window);
