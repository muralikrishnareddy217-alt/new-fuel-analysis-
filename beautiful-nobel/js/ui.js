/**
 * AERO // FUEL 3D - UI Controller & Component Engine
 * Handles:
 * - 4-step wizard with live validation & edit support
 * - Animated number counters (odometers)
 * - 3D card tilt micro-interactions
 * - Glassmorphism modals & non-blocking toast notifications
 * - Search, multi-filtering, sorting, pagination, and view modes (Table / Cards)
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

  function formatCurrency(val) {
    const n = Number(val || 0);
    return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatNumber(val, decimals = 2) {
    const n = Number(val || 0);
    return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  const UI = {
    // Current wizard state
    wizardState: {
      step: 1,
      isEdit: false,
      editId: null,
      brand: "",
      model: "",
      year: 2024,
      fuel: "Petrol",
      color: "#00f0ff",
      distance: null,
      litres: null,
      cost: null,
      efficiency: null,
      date: new Date().toISOString().split("T")[0],
      notes: ""
    },

    // Search & Filter state
    searchState: {
      query: "",
      fuel: "all",
      year: "all",
      sortBy: "date_desc",
      viewMode: "table", // "table" or "cards"
      page: 1,
      pageSize: 8
    },

    // Records pagination state
    recordsPagination: {
      page: 1,
      pageSize: 10,
      sortBy: "id_desc"
    },

    init() {
      this.initTiltCards();
      this.initToasts();
      this.initModals();
    },

    /* ==========================================================================
       TOAST NOTIFICATIONS (Replaces browser alert)
       ========================================================================== */
    initToasts() {
      let container = document.getElementById("toastContainer");
      if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
      }
      this.toastContainer = container;
    },

    showToast(message, type = "info", duration = 3800) {
      if (!this.toastContainer) this.initToasts();

      const toast = document.createElement("div");
      toast.className = `toast-item toast-${type}`;

      const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };

      toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'ℹ'}</div>
        <div class="toast-message">${esc(message)}</div>
        <button type="button" class="toast-close" aria-label="Close">&times;</button>
      `;

      toast.querySelector(".toast-close").addEventListener("click", () => {
        this.dismissToast(toast);
      });

      this.toastContainer.appendChild(toast);

      // Trigger entrance animation
      setTimeout(() => toast.classList.add("show"), 10);

      // Auto dismiss
      setTimeout(() => {
        this.dismissToast(toast);
      }, duration);
    },

    dismissToast(toast) {
      if (!toast || !toast.parentNode) return;
      toast.classList.remove("show");
      toast.classList.add("hide");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    },

    /* ==========================================================================
       GLASSMORPHISM MODALS (Replaces browser confirm)
       ========================================================================== */
    initModals() {
      let modal = document.getElementById("cyberModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "cyberModal";
        modal.className = "cyber-modal-overlay";
        modal.innerHTML = `
          <div class="cyber-modal-card">
            <div class="cyber-modal-header">
              <h3 id="cyberModalTitle">Confirm Action</h3>
              <button type="button" class="cyber-modal-close" id="cyberModalClose">&times;</button>
            </div>
            <div class="cyber-modal-body" id="cyberModalBody">
              Are you sure?
            </div>
            <div class="cyber-modal-footer">
              <button type="button" class="btn btn-secondary" id="cyberModalCancel">Cancel</button>
              <button type="button" class="btn btn-primary" id="cyberModalConfirm">Confirm</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#cyberModalClose").addEventListener("click", () => this.hideModal());
        modal.querySelector("#cyberModalCancel").addEventListener("click", () => this.hideModal());
      }
      this.modalOverlay = modal;
    },

    showConfirmModal(title, message, confirmText = "Confirm", onConfirm, isDanger = false) {
      if (!this.modalOverlay) this.initModals();

      document.getElementById("cyberModalTitle").textContent = title;
      document.getElementById("cyberModalBody").innerHTML = `<p>${esc(message)}</p>`;

      const confirmBtn = document.getElementById("cyberModalConfirm");
      confirmBtn.textContent = confirmText;
      confirmBtn.className = isDanger ? "btn btn-danger" : "btn btn-primary";

      // Replace click handler
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

      newConfirmBtn.addEventListener("click", () => {
        this.hideModal();
        if (typeof onConfirm === "function") onConfirm();
      });

      this.modalOverlay.classList.add("active");
    },

    hideModal() {
      if (this.modalOverlay) {
        this.modalOverlay.classList.remove("active");
      }
    },

    /* ==========================================================================
       ANIMATED NUMBER COUNTERS
       ========================================================================== */
    animateNumber(element, targetValue, duration = 1200, prefix = "", suffix = "", decimals = 0) {
      if (!element) return;
      const target = Number(targetValue) || 0;
      const startValue = Number(element.dataset.currentVal) || 0;
      element.dataset.currentVal = target;

      const startTime = performance.now();

      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease Out Quart
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = startValue + (target - startValue) * ease;

        const formatted = current.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });

        element.textContent = `${prefix}${formatted}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          const finalFormatted = target.toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
          element.textContent = `${prefix}${finalFormatted}${suffix}`;
        }
      };

      requestAnimationFrame(update);
    },

    /* ==========================================================================
       3D TILT HOVER MICRO-INTERACTIONS
       ========================================================================== */
    initTiltCards() {
      const cards = document.querySelectorAll(".tilt-card");
      cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((y - centerY) / centerY) * -7;
          const rotateY = ((x - centerX) / centerX) * 7;

          card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
        });
      });
    },

    /* ==========================================================================
       ADD FUEL ENTRY - 4-STEP WIZARD
       ========================================================================== */
    resetWizard(isEdit = false, recordData = null) {
      const today = new Date().toISOString().split("T")[0];

      if (isEdit && recordData) {
        this.wizardState = {
          step: 1,
          isEdit: true,
          editId: recordData.id,
          brand: recordData.brand || "",
          model: recordData.model || "",
          year: recordData.year || 2024,
          fuel: recordData.fuel || "Petrol",
          color: recordData.color || "#00f0ff",
          distance: recordData.distance,
          litres: recordData.litres,
          cost: recordData.totalCost,
          efficiency: recordData.efficiency,
          date: recordData.date || today,
          notes: recordData.notes || ""
        };
      } else {
        this.wizardState = {
          step: 1,
          isEdit: false,
          editId: null,
          brand: "",
          model: "",
          year: 2024,
          fuel: "Petrol",
          color: "#00f0ff",
          distance: null,
          litres: null,
          cost: null,
          efficiency: null,
          date: today,
          notes: ""
        };
      }

      // Populate form controls
      const brandSearch = document.getElementById("brandSearch");
      const modelSearch = document.getElementById("modelSearch");
      const year = document.getElementById("year");
      const fuel = document.getElementById("fuel");
      const color = document.getElementById("color");
      const distance = document.getElementById("distance");
      const litres = document.getElementById("litres");
      const cost = document.getElementById("cost");
      const date = document.getElementById("recordDate");
      const notes = document.getElementById("recordNotes");

      if (brandSearch) brandSearch.value = this.wizardState.brand;
      if (modelSearch) modelSearch.value = this.wizardState.model;
      if (year) year.value = this.wizardState.year;
      if (fuel) fuel.value = this.wizardState.fuel;
      if (color) color.value = this.wizardState.color;
      if (distance) distance.value = this.wizardState.distance !== null ? this.wizardState.distance : "";
      if (litres) litres.value = this.wizardState.litres !== null ? this.wizardState.litres : "";
      if (cost) cost.value = this.wizardState.cost !== null ? this.wizardState.cost : "";
      if (date) date.value = this.wizardState.date;
      if (notes) notes.value = this.wizardState.notes;

      const wizardTitle = document.getElementById("wizardTitle");
      if (wizardTitle) {
        wizardTitle.textContent = isEdit ? "Edit Fuel Record" : "Add Vehicle / Fuel Record";
      }

      this.renderBrandSelection();
      this.renderModelSelection();
      this.updateWizardCalculations();
      this.showWizardStep(1);
    },

    showWizardStep(stepNum) {
      this.wizardState.step = stepNum;

      // Update Step Indicators
      document.querySelectorAll(".step-indicator-item").forEach((item, idx) => {
        const itemStep = idx + 1;
        item.classList.remove("active", "completed");
        if (itemStep < stepNum) item.classList.add("completed");
        else if (itemStep === stepNum) item.classList.add("active");
      });

      // Update Step panels
      document.querySelectorAll(".wizard-step-panel").forEach(panel => {
        const pStep = Number(panel.dataset.step);
        panel.classList.toggle("active", pStep === stepNum);
      });

      // Buttons
      const backBtn = document.getElementById("wizardBackBtn");
      const nextBtn = document.getElementById("wizardNextBtn");

      if (backBtn) {
        backBtn.style.visibility = stepNum === 1 ? "hidden" : "visible";
      }

      if (nextBtn) {
        if (stepNum === 4) {
          nextBtn.innerHTML = this.wizardState.isEdit
            ? `<span>Update Record</span> <i data-lucide="check"></i>`
            : `<span>Save Record</span> <i data-lucide="check"></i>`;
          nextBtn.classList.add("btn-accent");
        } else {
          nextBtn.innerHTML = `<span>Next Step</span> <i data-lucide="arrow-right"></i>`;
          nextBtn.classList.remove("btn-accent");
        }
      }

      // If at step 4, update summary preview
      if (stepNum === 4) {
        this.updateReviewScreen();
      }

      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    },

    renderBrandSelection() {
      const input = document.getElementById("brandSearch");
      const query = input ? input.value.trim() : "";
      const container = document.getElementById("brandResults");
      if (!container) return;

      const catalog = window.FuelCatalog;
      const matches = catalog.searchBrands(query, 18);
      container.innerHTML = "";

      matches.forEach(brand => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "brand-pill" + (this.wizardState.brand === brand ? " selected" : "");
        pill.innerHTML = `
          <span class="pill-dot"></span>
          <span class="pill-text">${esc(brand)}</span>
        `;
        pill.addEventListener("click", () => {
          this.wizardState.brand = brand;
          this.wizardState.model = "";
          if (input) input.value = brand;
          const modelInput = document.getElementById("modelSearch");
          if (modelInput) modelInput.value = "";
          this.renderBrandSelection();
          this.renderModelSelection();
          this.updateWizardCalculations();
        });
        container.appendChild(pill);
      });

      // Custom brand option
      if (query && !matches.some(m => m.toLowerCase() === query.toLowerCase())) {
        const customBtn = document.createElement("button");
        customBtn.type = "button";
        customBtn.className = "brand-pill custom-pill";
        customBtn.innerHTML = `
          <span class="custom-icon">+</span>
          <span>Use custom brand: <strong>"${esc(query)}"</strong></span>
        `;
        customBtn.addEventListener("click", () => {
          catalog.registerCustomBrand(query);
          this.wizardState.brand = query;
          this.wizardState.model = "";
          if (input) input.value = query;
          this.renderBrandSelection();
          this.renderModelSelection();
          this.updateWizardCalculations();
        });
        container.appendChild(customBtn);
      }
    },

    renderModelSelection() {
      const container = document.getElementById("modelResults");
      if (!container) return;

      const brand = this.wizardState.brand;
      const input = document.getElementById("modelSearch");
      const query = input ? input.value.trim() : "";
      container.innerHTML = "";

      if (!brand) {
        container.innerHTML = `
          <div class="empty-selection-hint">
            <i data-lucide="info"></i>
            <p>Please select or type a brand in Step 1 first.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const catalog = window.FuelCatalog;
      const matches = catalog.searchModels(brand, query, 18);

      matches.forEach(model => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "brand-pill" + (this.wizardState.model === model ? " selected" : "");
        pill.innerHTML = `
          <span class="pill-dot"></span>
          <span class="pill-text">${esc(model)}</span>
        `;
        pill.addEventListener("click", () => {
          this.wizardState.model = model;
          if (input) input.value = model;
          this.renderModelSelection();
          this.updateWizardCalculations();
        });
        container.appendChild(pill);
      });

      // Custom model option
      if (query && !matches.some(m => m.toLowerCase() === query.toLowerCase())) {
        const customBtn = document.createElement("button");
        customBtn.type = "button";
        customBtn.className = "brand-pill custom-pill";
        customBtn.innerHTML = `
          <span class="custom-icon">+</span>
          <span>Use model: <strong>"${esc(query)}"</strong></span>
        `;
        customBtn.addEventListener("click", () => {
          catalog.registerCustomModel(brand, query);
          this.wizardState.model = query;
          if (input) input.value = query;
          this.renderModelSelection();
          this.updateWizardCalculations();
        });
        container.appendChild(customBtn);
      }

      if (matches.length === 0 && !query) {
        container.innerHTML = `
          <div class="empty-selection-hint">
            <i data-lucide="edit-3"></i>
            <p>No predefined models for ${esc(brand)}. Type your model name above!</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
    },

    updateWizardCalculations() {
      const distInput = document.getElementById("distance");
      const litresInput = document.getElementById("litres");
      const costInput = document.getElementById("cost");
      const mileageDisplay = document.getElementById("mileageCalcDisplay");
      const costPerKmDisplay = document.getElementById("costPerKmDisplay");

      const dist = distInput ? parseFloat(distInput.value) : 0;
      const litres = litresInput ? parseFloat(litresInput.value) : 0;
      const cost = costInput ? parseFloat(costInput.value) : 0;

      let mileage = 0;
      let costPerKm = 0;

      if (dist > 0 && litres > 0) {
        mileage = Number((dist / litres).toFixed(2));
      }

      if (dist > 0 && cost > 0) {
        costPerKm = Number((cost / dist).toFixed(2));
      }

      this.wizardState.distance = dist > 0 ? dist : null;
      this.wizardState.litres = litres > 0 ? litres : null;
      this.wizardState.cost = cost > 0 ? cost : null;
      this.wizardState.efficiency = mileage > 0 ? mileage : null;

      if (mileageDisplay) {
        mileageDisplay.textContent = mileage > 0 ? `${mileage.toFixed(2)} km/L` : "-- km/L";
        mileageDisplay.classList.toggle("calculated", mileage > 0);
      }

      if (costPerKmDisplay) {
        costPerKmDisplay.textContent = costPerKm > 0 ? `₹ ${costPerKm.toFixed(2)} / km` : "₹ -- / km";
      }

      // Sync color with 3D viewer if available
      const colorInput = document.getElementById("color");
      if (colorInput && window.app && window.app.threeViewer) {
        this.wizardState.color = colorInput.value;
        window.app.threeViewer.setPaintColor(colorInput.value);
      }
    },

    validateCurrentStep() {
      const step = this.wizardState.step;

      if (step === 1) {
        if (!this.wizardState.brand) {
          this.showToast("Please pick a vehicle brand or type a custom brand.", "warning");
          const input = document.getElementById("brandSearch");
          if (input) input.focus();
          return false;
        }
        return true;
      }

      if (step === 2) {
        if (!this.wizardState.model) {
          this.showToast("Please pick a vehicle model or enter your model name.", "warning");
          const input = document.getElementById("modelSearch");
          if (input) input.focus();
          return false;
        }
        return true;
      }

      if (step === 3) {
        const yearInput = document.getElementById("year");
        const distInput = document.getElementById("distance");
        const litresInput = document.getElementById("litres");
        const costInput = document.getElementById("cost");

        const year = parseInt(yearInput.value, 10);
        const dist = parseFloat(distInput.value);
        const litres = parseFloat(litresInput.value);
        const cost = parseFloat(costInput.value);

        if (isNaN(year) || year < 1995 || year > 2035) {
          this.showToast("Please enter a valid model year (1995 - 2035).", "error");
          yearInput.focus();
          return false;
        }

        if (isNaN(dist) || dist <= 0) {
          this.showToast("Distance travelled must be a positive number greater than 0.", "error");
          distInput.focus();
          return false;
        }

        if (isNaN(litres) || litres <= 0) {
          this.showToast("Fuel consumed must be greater than 0 litres.", "error");
          litresInput.focus();
          return false;
        }

        if (isNaN(cost) || cost <= 0) {
          this.showToast("Total fuel cost must be greater than ₹ 0.", "error");
          costInput.focus();
          return false;
        }

        this.wizardState.year = year;
        this.wizardState.fuel = document.getElementById("fuel").value;
        this.wizardState.color = document.getElementById("color").value;
        this.wizardState.date = document.getElementById("recordDate").value || new Date().toISOString().split("T")[0];
        this.wizardState.notes = document.getElementById("recordNotes").value.trim();

        return true;
      }

      return true;
    },

    updateReviewScreen() {
      const s = this.wizardState;
      const carName = `${s.brand} ${s.model}`;
      const mileage = (s.distance > 0 && s.litres > 0) ? (s.distance / s.litres).toFixed(2) : "0.00";
      const costPerKm = (s.distance > 0 && s.cost > 0) ? (s.cost / s.distance).toFixed(2) : "0.00";

      const titleEl = document.getElementById("reviewCarTitle");
      const metaEl = document.getElementById("reviewCarMeta");
      const distEl = document.getElementById("reviewDist");
      const litresEl = document.getElementById("reviewLitres");
      const costEl = document.getElementById("reviewCost");
      const mileageEl = document.getElementById("reviewMileage");
      const costPerKmEl = document.getElementById("reviewCostPerKm");
      const colorSwatch = document.getElementById("reviewColorSwatch");

      if (titleEl) titleEl.textContent = carName;
      if (metaEl) metaEl.textContent = `${s.year} • ${s.fuel} • Date: ${s.date}`;
      if (distEl) distEl.textContent = `${formatNumber(s.distance)} km`;
      if (litresEl) litresEl.textContent = `${formatNumber(s.litres)} L`;
      if (costEl) costEl.textContent = formatCurrency(s.cost);
      if (mileageEl) mileageEl.textContent = `${mileage} km/L`;
      if (costPerKmEl) costPerKmEl.textContent = `₹ ${costPerKm} / km`;
      if (colorSwatch) {
        colorSwatch.style.backgroundColor = s.color;
        colorSwatch.title = `Color: ${s.color}`;
      }

      // Update 3D car paint to match review
      if (window.app && window.app.threeViewer) {
        window.app.threeViewer.setPaintColor(s.color);
      }
    },

    saveWizardRecord() {
      if (!this.validateCurrentStep()) return false;

      const s = this.wizardState;
      const store = window.FuelStore;

      const recordPayload = {
        vehicle: `${s.brand} ${s.model}`,
        brand: s.brand,
        model: s.model,
        year: s.year,
        fuel: s.fuel,
        color: s.color,
        distance: s.distance,
        litres: s.litres,
        totalCost: s.cost,
        efficiency: Number((s.distance / s.litres).toFixed(2)),
        date: s.date,
        notes: s.notes
      };

      if (s.isEdit && s.editId) {
        const updated = store.updateRecord(s.editId, recordPayload);
        if (updated) {
          this.showToast(`Updated entry for ${recordPayload.vehicle} successfully!`, "success");
          if (window.app) window.app.refreshAllData();
          if (window.app) window.app.navigate("overview");
          return true;
        } else {
          this.showToast("Failed to update record.", "error");
          return false;
        }
      } else {
        const added = store.addRecord(recordPayload);
        if (added) {
          this.showToast(`Fuel record for ${recordPayload.vehicle} saved!`, "success");
          this.resetWizard();
          if (window.app) window.app.refreshAllData();
          if (window.app) window.app.navigate("overview");
          return true;
        } else {
          this.showToast("Error saving record to localStorage.", "error");
          return false;
        }
      }
    },

    /* ==========================================================================
       DASHBOARD OVERVIEW RENDERING
       ========================================================================== */
    renderOverviewKPIs(metrics) {
      this.animateNumber(document.getElementById("kpiTotalDist"), metrics.totalDistance, 1000, "", " km", 1);
      this.animateNumber(document.getElementById("kpiTotalFuel"), metrics.totalFuel, 1000, "", " L", 1);
      this.animateNumber(document.getElementById("kpiTotalCost"), metrics.totalCost, 1200, "₹ ", "", 0);
      this.animateNumber(document.getElementById("kpiAvgMileage"), metrics.avgEfficiency, 900, "", " km/L", 2);
      this.animateNumber(document.getElementById("kpiCostPerKm"), metrics.avgCostPerKm, 900, "₹ ", " / km", 2);
      this.animateNumber(document.getElementById("kpiTotalVehicles"), metrics.totalVehicles, 800, "", "", 0);

      // Best Performer Pill
      const bestEl = document.getElementById("kpiBestVehicle");
      if (bestEl) {
        if (metrics.bestVehicle) {
          bestEl.textContent = `${metrics.bestVehicle.vehicle} (${metrics.bestVehicle.efficiency} km/L)`;
          bestEl.title = `Distance-weighted mileage: ${metrics.bestVehicle.efficiency} km/L`;
        } else {
          bestEl.textContent = "No data yet";
        }
      }

      // Empty State Banner toggle
      const emptyBanner = document.getElementById("overviewEmptyBanner");
      if (emptyBanner) {
        emptyBanner.style.display = metrics.totalRecords === 0 ? "flex" : "none";
      }
    },

    renderRecentRecordsTable(records, limit = 5) {
      const tbody = document.getElementById("recentRecordsTableBody");
      if (!tbody) return;

      const recent = records.slice(0, limit);
      if (!recent.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-table-cell">
              <div class="empty-state-mini">
                <p>No fuel entries logged yet. Click <strong>+ Add Fuel Entry</strong> to get started.</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = recent.map(r => `
        <tr>
          <td><span class="date-badge">${esc(r.date)}</span></td>
          <td>
            <div class="vehicle-cell">
              <span class="color-dot" style="background-color: ${esc(r.color)};"></span>
              <strong>${esc(r.vehicle)}</strong>
            </div>
          </td>
          <td><span class="fuel-badge badge-${esc(r.fuel.toLowerCase())}">${esc(r.fuel)}</span></td>
          <td>${formatNumber(r.distance)} km</td>
          <td>${formatNumber(r.litres)} L</td>
          <td><strong class="mileage-highlight">${formatNumber(r.efficiency)} km/L</strong></td>
          <td>${formatCurrency(r.totalCost)}</td>
        </tr>
      `).join("");
    },

    renderRankingsLeaderboard(vehicleStats) {
      const container = document.getElementById("vehicleLeaderboard");
      if (!container) return;

      const vehicles = Object.values(vehicleStats || {});
      if (!vehicles.length) {
        container.innerHTML = `
          <div class="empty-state-card">
            <p>Add records for multiple vehicles to view the efficiency leaderboard.</p>
          </div>
        `;
        return;
      }

      // Sort by efficiency descending
      vehicles.sort((a, b) => b.efficiency - a.efficiency);
      const topEfficiency = vehicles[0].efficiency || 1;

      container.innerHTML = vehicles.map((v, idx) => {
        const pct = Math.min(100, Math.round((v.efficiency / topEfficiency) * 100));
        const rankMedal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));

        return `
          <div class="leaderboard-item">
            <div class="rank-badge">${rankMedal}</div>
            <div class="rank-info">
              <div class="rank-header">
                <span class="rank-car-name">${esc(v.vehicle)}</span>
                <span class="rank-mileage">${v.efficiency} km/L</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
              <div class="rank-subtext">
                <span>${v.entriesCount} fill-up(s) • ${formatNumber(v.totalDistance)} km</span>
                <span>₹ ${v.costPerKm.toFixed(2)}/km</span>
              </div>
            </div>
          </div>
        `;
      }).join("");
    },

    /* ==========================================================================
       ALL RECORDS VIEW - PAGINATION & ACTIONS
       ========================================================================== */
    renderAllRecordsView() {
      const store = window.FuelStore;
      const records = store.getRecords();
      const tbody = document.getElementById("allRecordsTableBody");
      const countEl = document.getElementById("allRecordsCount");
      const summaryTotals = document.getElementById("allRecordsSummaryFooter");

      if (countEl) countEl.textContent = `Showing ${records.length} total entries`;

      if (!tbody) return;

      if (!records.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="empty-table-cell">
              <div class="empty-state-full">
                <div class="empty-icon">📂</div>
                <h3>No Fuel Records Found</h3>
                <p>Your vehicle log is currently empty. Start logging fill-ups or load the demo fleet.</p>
                <button type="button" class="btn btn-primary" id="emptyStateAddBtn">
                  <span>+ Add First Entry</span>
                </button>
              </div>
            </td>
          </tr>
        `;
        const addBtn = document.getElementById("emptyStateAddBtn");
        if (addBtn) addBtn.addEventListener("click", () => window.app.navigate("add"));
        if (summaryTotals) summaryTotals.style.display = "none";
        return;
      }

      // Pagination
      const page = this.recordsPagination.page;
      const pageSize = this.recordsPagination.pageSize;
      const startIdx = (page - 1) * pageSize;
      const pageRecords = records.slice(startIdx, startIdx + pageSize);

      tbody.innerHTML = pageRecords.map(r => `
        <tr>
          <td><span class="id-tag">#${r.id}</span></td>
          <td>${esc(r.date)}</td>
          <td>
            <div class="vehicle-cell">
              <span class="color-dot" style="background-color: ${esc(r.color)};"></span>
              <strong>${esc(r.vehicle)}</strong>
              <small class="text-muted">(${r.year})</small>
            </div>
          </td>
          <td><span class="fuel-badge badge-${esc(r.fuel.toLowerCase())}">${esc(r.fuel)}</span></td>
          <td>${formatNumber(r.distance)} km</td>
          <td>${formatNumber(r.litres)} L</td>
          <td><strong class="mileage-highlight">${formatNumber(r.efficiency)} km/L</strong></td>
          <td>${formatCurrency(r.totalCost)}</td>
          <td class="action-buttons-cell">
            <button type="button" class="btn-icon edit-record-btn" data-id="${r.id}" title="Edit Record">
              <i data-lucide="edit-2"></i>
            </button>
            <button type="button" class="btn-icon btn-icon-danger del-record-btn" data-id="${r.id}" title="Delete Record">
              <i data-lucide="trash-2"></i>
            </button>
          </td>
        </tr>
      `).join("");

      // Render Summary Footer
      if (summaryTotals) {
        summaryTotals.style.display = "table-footer-group";
        const metrics = store.getMetrics(records);
        document.getElementById("footerDist").textContent = `${formatNumber(metrics.totalDistance)} km`;
        document.getElementById("footerLitres").textContent = `${formatNumber(metrics.totalFuel)} L`;
        document.getElementById("footerEfficiency").textContent = `${formatNumber(metrics.avgEfficiency)} km/L (wt.)`;
        document.getElementById("footerCost").textContent = formatCurrency(metrics.totalCost);
      }

      this.renderPaginationControls(records.length, page, pageSize, "allRecordsPagination");

      if (window.lucide) window.lucide.createIcons();
    },

    renderPaginationControls(totalItems, currentPage, pageSize, containerId, onPageChange, onPageSizeChange) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const endItem = Math.min(currentPage * pageSize, totalItems);

      // Generate smart page numbers list
      const getPageNumbers = () => {
        if (totalPages <= 7) {
          return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [1];
        let left = Math.max(2, currentPage - 1);
        let right = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) {
          left = 2;
          right = 4;
        } else if (currentPage >= totalPages - 2) {
          left = totalPages - 3;
          right = totalPages - 1;
        }

        if (left > 2) pages.push('...');
        for (let p = left; p <= right; p++) pages.push(p);
        if (right < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
      };

      const pageNumbers = getPageNumbers();

      let html = `
        <div class="pagination-bar">
          <div class="pagination-left">
            <span class="page-info">Showing <strong>${startItem.toLocaleString('en-IN')}</strong> to <strong>${endItem.toLocaleString('en-IN')}</strong> of <strong>${totalItems.toLocaleString('en-IN')}</strong> records</span>
          </div>

          <div class="pagination-center">
            <button type="button" class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''} title="Previous Page">
              <i data-lucide="chevron-left"></i>
            </button>

            ${pageNumbers.map(p => {
              if (p === '...') return `<span class="page-ellipsis">...</span>`;
              return `<button type="button" class="page-btn num-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            }).join("")}

            <button type="button" class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''} title="Next Page">
              <i data-lucide="chevron-right"></i>
            </button>
          </div>

          <div class="pagination-right">
            <label for="${containerId}PageSize" style="font-size: 0.8rem; color: var(--text-secondary);">Rows:</label>
            <select id="${containerId}PageSize" class="page-size-select">
              <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 / page</option>
              <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 / page</option>
              <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 / page</option>
              <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 / page</option>
            </select>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Event handlers
      container.querySelector(".prev-btn")?.addEventListener("click", () => {
        if (currentPage > 1) {
          if (onPageChange) onPageChange(currentPage - 1);
          else {
            this.recordsPagination.page = currentPage - 1;
            this.renderAllRecordsView();
          }
        }
      });

      container.querySelector(".next-btn")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
          if (onPageChange) onPageChange(currentPage + 1);
          else {
            this.recordsPagination.page = currentPage + 1;
            this.renderAllRecordsView();
          }
        }
      });

      container.querySelectorAll(".num-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const p = Number(btn.dataset.page);
          if (p && p !== currentPage) {
            if (onPageChange) onPageChange(p);
            else {
              this.recordsPagination.page = p;
              this.renderAllRecordsView();
            }
          }
        });
      });

      container.querySelector(`#${containerId}PageSize`)?.addEventListener("change", (e) => {
        const newSize = Number(e.target.value) || 10;
        if (onPageSizeChange) onPageSizeChange(newSize);
        else {
          this.recordsPagination.pageSize = newSize;
          this.recordsPagination.page = 1;
          this.renderAllRecordsView();
        }
      });
    },

    /* ==========================================================================
       SEARCH & MULTI-FILTERING VIEW
       ========================================================================== */
    renderSearchResults() {
      const store = window.FuelStore;
      const allRecords = store.getRecords();
      const s = this.searchState;

      // Filter
      let filtered = allRecords.filter(r => {
        // Query search
        if (s.query) {
          const q = s.query.toLowerCase();
          const matchVehicle = (r.vehicle || "").toLowerCase().includes(q);
          const matchBrand = (r.brand || "").toLowerCase().includes(q);
          const matchModel = (r.model || "").toLowerCase().includes(q);
          const matchNotes = (r.notes || "").toLowerCase().includes(q);
          if (!matchVehicle && !matchBrand && !matchModel && !matchNotes) return false;
        }

        // Fuel filter
        if (s.fuel !== "all" && r.fuel.toLowerCase() !== s.fuel.toLowerCase()) {
          return false;
        }

        // Year filter
        if (s.year !== "all" && String(r.year) !== s.year) {
          return false;
        }

        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        switch (s.sortBy) {
          case "date_asc": return new Date(a.date) - new Date(b.date);
          case "date_desc": return new Date(b.date) - new Date(a.date);
          case "efficiency_desc": return b.efficiency - a.efficiency;
          case "efficiency_asc": return a.efficiency - b.efficiency;
          case "cost_desc": return b.totalCost - a.totalCost;
          case "cost_asc": return a.totalCost - b.totalCost;
          case "dist_desc": return b.distance - a.distance;
          default: return b.id - a.id;
        }
      });

      const countBadge = document.getElementById("searchResultsCount");
      if (countBadge) countBadge.textContent = `${filtered.length} found`;

      const container = document.getElementById("searchResultsContainer");
      if (!container) return;

      if (!filtered.length) {
        container.innerHTML = `
          <div class="empty-search-state">
            <div class="empty-icon">🔍</div>
            <h3>No matching vehicle entries found</h3>
            <p>Try adjusting your search keywords, clearing fuel type filters, or reset the filters.</p>
            <button type="button" class="btn btn-secondary" id="resetSearchFiltersBtn">
              Clear All Filters
            </button>
          </div>
        `;
        document.getElementById("resetSearchFiltersBtn")?.addEventListener("click", () => {
          this.resetSearchFilters();
        });
        return;
      }

      if (s.viewMode === "cards") {
        container.innerHTML = `
          <div class="cards-grid">
            ${filtered.map(r => `
              <div class="search-car-card tilt-card">
                <div class="card-top-bar">
                  <span class="color-dot" style="background-color: ${esc(r.color)};"></span>
                  <span class="card-date">${esc(r.date)}</span>
                  <span class="fuel-badge badge-${esc(r.fuel.toLowerCase())}">${esc(r.fuel)}</span>
                </div>
                <h4 class="card-title">${esc(r.vehicle)} <small>(${r.year})</small></h4>
                <div class="card-metrics-grid">
                  <div class="card-metric">
                    <span class="metric-label">Mileage</span>
                    <strong class="metric-val text-cyan">${r.efficiency} km/L</strong>
                  </div>
                  <div class="card-metric">
                    <span class="metric-label">Distance</span>
                    <strong class="metric-val">${formatNumber(r.distance)} km</strong>
                  </div>
                  <div class="card-metric">
                    <span class="metric-label">Fuel Used</span>
                    <strong class="metric-val">${formatNumber(r.litres)} L</strong>
                  </div>
                  <div class="card-metric">
                    <span class="metric-label">Total Cost</span>
                    <strong class="metric-val text-emerald">${formatCurrency(r.totalCost)}</strong>
                  </div>
                </div>
                <div class="card-actions">
                  <button type="button" class="btn btn-secondary btn-sm edit-record-btn" data-id="${r.id}">
                    <i data-lucide="edit-2"></i> Edit
                  </button>
                  <button type="button" class="btn btn-danger-ghost btn-sm del-record-btn" data-id="${r.id}">
                    <i data-lucide="trash-2"></i> Delete
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="table-responsive">
            <table class="cyber-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Fuel</th>
                  <th>Distance</th>
                  <th>Fuel Used</th>
                  <th>Mileage</th>
                  <th>Cost</th>
                  <th>Cost / KM</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(r => `
                  <tr>
                    <td>${esc(r.date)}</td>
                    <td>
                      <div class="vehicle-cell">
                        <span class="color-dot" style="background-color: ${esc(r.color)};"></span>
                        <strong>${esc(r.vehicle)}</strong>
                      </div>
                    </td>
                    <td><span class="fuel-badge badge-${esc(r.fuel.toLowerCase())}">${esc(r.fuel)}</span></td>
                    <td>${formatNumber(r.distance)} km</td>
                    <td>${formatNumber(r.litres)} L</td>
                    <td><strong class="mileage-highlight">${formatNumber(r.efficiency)} km/L</strong></td>
                    <td>${formatCurrency(r.totalCost)}</td>
                    <td>₹ ${r.costPerKm.toFixed(2)}/km</td>
                    <td>
                      <div class="table-actions">
                        <button type="button" class="btn-icon edit-record-btn" data-id="${r.id}" title="Edit">
                          <i data-lucide="edit-2"></i>
                        </button>
                        <button type="button" class="btn-icon btn-icon-danger del-record-btn" data-id="${r.id}" title="Delete">
                          <i data-lucide="trash-2"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      this.initTiltCards();
      if (window.lucide) window.lucide.createIcons();
    },

    resetSearchFilters() {
      this.searchState.query = "";
      this.searchState.fuel = "all";
      this.searchState.year = "all";
      this.searchState.sortBy = "date_desc";

      const queryInput = document.getElementById("searchFilterQuery");
      const fuelSelect = document.getElementById("searchFilterFuel");
      const yearSelect = document.getElementById("searchFilterYear");
      const sortSelect = document.getElementById("searchFilterSort");

      if (queryInput) queryInput.value = "";
      if (fuelSelect) fuelSelect.value = "all";
      if (yearSelect) yearSelect.value = "all";
      if (sortSelect) sortSelect.value = "date_desc";

      this.renderSearchResults();
    },

    /* ==========================================================================
       INSIGHTS & TRIP ESTIMATOR RENDERING
       ========================================================================== */
    renderInsightsPanel(insightsData) {
      const container = document.getElementById("intelligenceInsightsContainer");
      if (!container) return;

      if (!insightsData.hasData || !insightsData.insights.length) {
        container.innerHTML = `
          <div class="empty-insights-card">
            <i data-lucide="cpu"></i>
            <p>${esc(insightsData.message)}</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      container.innerHTML = insightsData.insights.map(item => `
        <div class="insight-card tilt-card">
          <div class="insight-header">
            <span class="insight-badge badge-${esc(item.badgeColor)}">${esc(item.badge)}</span>
            <span class="insight-category">${esc(item.category)}</span>
          </div>
          <h4 class="insight-title">${esc(item.title)}</h4>
          <div class="insight-value">${esc(item.value)}</div>
          <p class="insight-subtitle">${esc(item.subtitle)}</p>
          <div class="insight-details">${esc(item.details)}</div>
        </div>
      `).join("");

      this.initTiltCards();
    },

    renderTripEstimator(estimatorResult) {
      const resContainer = document.getElementById("tripEstimatorResult");
      if (!resContainer) return;

      if (!estimatorResult) {
        resContainer.innerHTML = "";
        return;
      }

      const r = estimatorResult;
      resContainer.innerHTML = `
        <div class="estimator-result-card">
          <div class="result-header">
            <span class="result-badge">PROJECTION</span>
            <h4>Estimated Trip Consumption for ${esc(r.vehicleName)}</h4>
          </div>
          <div class="result-stats-row">
            <div class="result-stat">
              <span class="res-label">Trip Distance</span>
              <strong class="res-val">${formatNumber(r.distanceKm)} km</strong>
            </div>
            <div class="result-stat">
              <span class="res-label">Estimated Fuel</span>
              <strong class="res-val text-cyan">${formatNumber(r.estimatedLitres)} Litres</strong>
            </div>
            <div class="result-stat">
              <span class="res-label">Estimated Fuel Cost</span>
              <strong class="res-val text-emerald">${formatCurrency(r.estimatedCost)}</strong>
            </div>
            <div class="result-stat">
              <span class="res-label">Cost / KM</span>
              <strong class="res-val">₹ ${r.estimatedCostPerKm} / km</strong>
            </div>
          </div>
          <p class="disclaimer-text">ℹ ${esc(r.disclaimer)}</p>
        </div>
      `;
    }
  };

  window.FuelUI = UI;

})(window);
