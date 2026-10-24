/**
 * AERO // FUEL 3D - Data Store & LocalStorage Manager
 * Compatibility key: "fuel_records_v1"
 * Features: safe schema migration, distance-weighted aggregations, CSV/JSON backup & restore.
 */
(function(window) {
  'use strict';

  const STORAGE_KEY = "fuel_records_v1";
  const SETTINGS_KEY = "fuel_settings_v1";

  // Default User Preferences
  const defaultSettings = {
    theme: "dark", // "dark", "midnight", "cyberpunk", "light"
    animationQuality: "high", // "high", "medium", "low"
    reducedMotion: false,
    currency: "INR",
    unitDistance: "km",
    unitFuel: "L"
  };

  function sanitizeString(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseNumber(val, defaultVal = 0) {
    const num = Number(val);
    return (!isNaN(num) && isFinite(num)) ? num : defaultVal;
  }

  // Demo Dataset featuring BMW M5 Competition & fleet vehicles
  const sampleRecords = [
    {
      id: 100,
      vehicle: "BMW M5 Competition",
      brand: "BMW",
      model: "M5 Competition",
      distance: 540,
      litres: 47.5,
      totalCost: 4987.5,
      efficiency: 11.37,
      costPerKm: 9.24,
      year: 2024,
      fuel: "Petrol",
      color: "#004fc7",
      date: "2026-10-21",
      notes: "Expressway cruise with M xDrive & 4.4L V8 TwinPower Turbo"
    },
    {
      id: 101,
      vehicle: "Toyota Corolla",
      brand: "Toyota",
      model: "Corolla",
      distance: 620,
      litres: 34.4,
      totalCost: 3612,
      efficiency: 18.02,
      costPerKm: 5.83,
      year: 2023,
      fuel: "Petrol",
      color: "#2563eb",
      date: "2026-09-12",
      notes: "Highway commute to Pune & return"
    },
    {
      id: 102,
      vehicle: "Toyota Corolla",
      brand: "Toyota",
      model: "Corolla",
      distance: 480,
      litres: 28.2,
      totalCost: 2961,
      efficiency: 17.02,
      costPerKm: 6.17,
      year: 2023,
      fuel: "Petrol",
      color: "#2563eb",
      date: "2026-09-28",
      notes: "City peak traffic driving"
    },
    {
      id: 103,
      vehicle: "Hyundai Creta",
      brand: "Hyundai",
      model: "Creta",
      distance: 740,
      litres: 45.0,
      totalCost: 4050,
      efficiency: 16.44,
      costPerKm: 5.47,
      year: 2024,
      fuel: "Diesel",
      color: "#00f0ff",
      date: "2026-08-15",
      notes: "Expressway road trip"
    },
    {
      id: 104,
      vehicle: "Hyundai Creta",
      brand: "Hyundai",
      model: "Creta",
      distance: 510,
      litres: 33.5,
      totalCost: 3015,
      efficiency: 15.22,
      costPerKm: 5.91,
      year: 2024,
      fuel: "Diesel",
      color: "#00f0ff",
      date: "2026-09-04",
      notes: "Urban commute with AC full"
    },
    {
      id: 105,
      vehicle: "BMW 3 Series",
      brand: "BMW",
      model: "3 Series",
      distance: 430,
      litres: 32.0,
      totalCost: 3520,
      efficiency: 13.44,
      costPerKm: 8.19,
      year: 2022,
      fuel: "Petrol",
      color: "#ef4444",
      date: "2026-07-22",
      notes: "Weekend sports drive"
    },
    {
      id: 106,
      vehicle: "Tata Nexon",
      brand: "Tata",
      model: "Nexon",
      distance: 580,
      litres: 31.2,
      totalCost: 3276,
      efficiency: 18.59,
      costPerKm: 5.65,
      year: 2023,
      fuel: "Petrol",
      color: "#10b981",
      date: "2026-10-05",
      notes: "Intercity ring road run"
    },
    {
      id: 107,
      vehicle: "Honda City",
      brand: "Honda",
      model: "City",
      distance: 650,
      litres: 32.5,
      totalCost: 3412.5,
      efficiency: 20.00,
      costPerKm: 5.25,
      year: 2024,
      fuel: "Hybrid",
      color: "#8b5cf6",
      date: "2026-10-18",
      notes: "e:HEV regeneration mode in city"
    }
  ];

  window.FuelStore = {
    STORAGE_KEY: STORAGE_KEY,
    SETTINGS_KEY: SETTINGS_KEY,

    getSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...defaultSettings };
        return { ...defaultSettings, ...JSON.parse(raw) };
      } catch (e) {
        return { ...defaultSettings };
      }
    },

    saveSettings(settings) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
      } catch (e) {
        console.error("Failed to save settings:", e);
        return false;
      }
    },

    /**
     * Reads all records from localStorage 'fuel_records_v1',
     * applying non-destructive migration and sanitization.
     * Automatically seeds with 500 records on fresh initial launch.
     */
    getRecords() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
          // Fresh launch: initialize with 500 car fleet records automatically
          return this.load500Records();
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        return parsed.map((item, index) => this.migrateRecord(item, index));
      } catch (e) {
        console.error("Error reading fuel_records_v1:", e);
        return [];
      }
    },

    /**
     * Backward-compatible record migrator
     */
    migrateRecord(raw, fallbackIndex = 0) {
      const id = raw.id !== undefined && raw.id !== null ? raw.id : fallbackIndex + 1;
      let vehicle = String(raw.vehicle || "").trim();
      let brand = String(raw.brand || "").trim();
      let model = String(raw.model || "").trim();

      if (!brand && vehicle) {
        const parts = vehicle.split(" ");
        brand = parts[0] || "Custom";
        model = parts.slice(1).join(" ") || "Vehicle";
      } else if (!vehicle) {
        vehicle = [brand, model].filter(Boolean).join(" ") || "Unnamed Vehicle";
      }

      const distance = Math.max(0, parseNumber(raw.distance, 0));
      const litres = Math.max(0, parseNumber(raw.litres, 0));
      const totalCost = Math.max(0, parseNumber(raw.totalCost, 0));

      // Accurate efficiency calculation: distance / litres
      let efficiency = parseNumber(raw.efficiency, 0);
      if (distance > 0 && litres > 0) {
        efficiency = Number((distance / litres).toFixed(2));
      }

      const costPerKm = distance > 0 ? Number((totalCost / distance).toFixed(2)) : 0;
      const year = Math.min(2035, Math.max(1990, parseInt(raw.year, 10) || 2024));
      const fuel = String(raw.fuel || "Petrol").trim();
      const color = String(raw.color || "#00f0ff").trim();
      const date = raw.date && /^\d{4}-\d{2}-\d{2}/.test(raw.date)
        ? raw.date.substring(0, 10)
        : new Date().toISOString().split("T")[0];
      const notes = String(raw.notes || "").trim();

      return {
        id,
        vehicle,
        brand,
        model,
        distance,
        litres,
        totalCost,
        efficiency,
        costPerKm,
        year,
        fuel,
        color,
        date,
        notes
      };
    },

    saveRecords(records) {
      try {
        if (!Array.isArray(records)) return false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
      } catch (e) {
        console.error("Could not write to localStorage:", e);
        return false;
      }
    },

    addRecord(recordData) {
      const records = this.getRecords();
      const maxId = records.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      const newId = maxId + 1;

      const fullRecord = this.migrateRecord({
        ...recordData,
        id: newId
      });

      records.unshift(fullRecord);
      const saved = this.saveRecords(records);
      return saved ? fullRecord : null;
    },

    updateRecord(id, updatedFields) {
      const records = this.getRecords();
      const idx = records.findIndex(r => String(r.id) === String(id));
      if (idx === -1) return null;

      const merged = { ...records[idx], ...updatedFields, id: records[idx].id };
      const migrated = this.migrateRecord(merged);
      records[idx] = migrated;

      const saved = this.saveRecords(records);
      return saved ? migrated : null;
    },

    deleteRecord(id) {
      const records = this.getRecords();
      const filtered = records.filter(r => String(r.id) !== String(id));
      if (filtered.length === records.length) return false;
      return this.saveRecords(filtered);
    },

    getRecordById(id) {
      return this.getRecords().find(r => String(r.id) === String(id)) || null;
    },

    clearAllRecords() {
      return this.saveRecords([]);
    },

    /**
     * Procedurally generates a diverse, realistic dataset of 500 car fill-up records
     * covering all 49+ brands, random models, weighted fuel types, realistic dates, and costs.
     */
    generate500Records(count = 500) {
      const catalog = window.FuelCatalog || {};
      const brands = (catalog.brands && catalog.brands.length) ? catalog.brands : [
        "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick", "Cadillac",
        "Chevrolet", "Chrysler", "Citroen", "Dacia", "Dodge", "Ferrari", "Fiat", "Ford",
        "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Lamborghini",
        "Land Rover", "Lexus", "Lincoln", "Mahindra", "Maruti Suzuki", "Maserati", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi",
        "Nissan", "Peugeot", "Porsche", "Ram", "Renault", "Rolls-Royce", "Saab", "Subaru",
        "Suzuki", "Tata", "Tesla", "Toyota", "Volkswagen", "Volvo"
      ];
      const modelsMap = catalog.models || {};

      const colors = [
        "#004fc7", "#0b6647", "#c8102e", "#11141a", "#f3f4f6", "#4b5563",
        "#eab308", "#2563eb", "#64748b", "#00f0ff", "#8b5cf6", "#10b981",
        "#f97316", "#ec4899", "#d97706"
      ];

      const fuels = ["Petrol", "Diesel", "Hybrid", "CNG", "Electric", "LPG"];
      const notesList = [
        "Expressway commute between Mumbai and Pune",
        "City peak hour bumper-to-bumper office run",
        "Weekend highway drive with cruise control engaged",
        "Interstate road trip with 4 passengers & boot luggage",
        "Rainy monsoon commute with continuous AC",
        "Early morning airport speed run via bypass expressway",
        "Ring road bypass route with smooth traffic flow",
        "Hill station climb with steep inclines & hairpin bends",
        "Eco-mode city commute with auto start-stop active",
        "Autobahn / expressway high-speed cruise with dynamic mode",
        "Routine periodic tank fill-up at trusted COCO fuel station",
        "Late evening highway cruise in cool ambient temperature",
        "Suburban errand run with frequent short stops",
        "Long-distance cross-country highway expedition",
        "Morning office commute via elevated expressway"
      ];

      const perfBrands = new Set(["Ferrari", "Lamborghini", "Porsche", "Aston Martin", "Maserati", "Bentley", "Rolls-Royce"]);
      const generated = [];

      const startDate = new Date("2024-01-15").getTime();
      const endDate = new Date("2026-10-23").getTime();
      const timeSpan = endDate - startDate;

      // Always feature BMW M5 Competition with 15 sequential records to showcase telemetry progression
      for (let i = 0; i < 15; i++) {
        const t = startDate + (timeSpan / 15) * i + (Math.random() * 86400000 * 4 - 86400000 * 2);
        const d = new Date(Math.min(endDate, Math.max(startDate, t)));
        const dist = Number((420 + Math.random() * 260).toFixed(1));
        const eff = Number((10.2 + Math.random() * 2.6).toFixed(2));
        const litres = Number((dist / eff).toFixed(2));
        const price = Number((102.5 + Math.random() * 4.5).toFixed(2));
        const totalCost = Number((litres * price).toFixed(1));
        const costPerKm = Number((totalCost / dist).toFixed(2));

        generated.push({
          id: i + 1,
          vehicle: "BMW M5 Competition",
          brand: "BMW",
          model: "M5 Competition",
          distance: dist,
          litres: litres,
          totalCost: totalCost,
          efficiency: eff,
          costPerKm: costPerKm,
          year: 2024,
          fuel: "Petrol",
          color: "#004fc7",
          date: d.toISOString().split("T")[0],
          notes: notesList[i % notesList.length]
        });
      }

      // Generate remaining random records up to count
      for (let i = 15; i < count; i++) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const brandModels = modelsMap[brand] || ["Standard"];
        const model = brandModels[Math.floor(Math.random() * brandModels.length)];
        const vehicle = `${brand} ${model}`;

        let fuel = fuels[Math.floor(Math.random() * fuels.length)];
        if (brand === "Tesla") fuel = "Electric";
        else if (perfBrands.has(brand)) fuel = "Petrol";

        const year = 2020 + Math.floor(Math.random() * 6);
        const t = startDate + Math.random() * timeSpan;
        const d = new Date(t);

        const dist = Number((180 + Math.random() * 680).toFixed(1));
        let eff = 15.0;

        if (perfBrands.has(brand) || model.includes("M5") || model.includes("M3") || model.includes("AMG") || model.includes("RS")) {
          eff = Number((8.2 + Math.random() * 4.3).toFixed(2));
        } else if (fuel === "Hybrid") {
          eff = Number((19.5 + Math.random() * 7.3).toFixed(2));
        } else if (fuel === "Diesel") {
          eff = Number((14.0 + Math.random() * 5.5).toFixed(2));
        } else if (fuel === "CNG") {
          eff = Number((22.0 + Math.random() * 6.5).toFixed(2));
        } else if (fuel === "Electric") {
          eff = Number((25.0 + Math.random() * 7.0).toFixed(2));
        } else {
          eff = Number((12.0 + Math.random() * 5.5).toFixed(2));
        }

        const litres = Number((dist / eff).toFixed(2));

        let price = 102.0;
        if (fuel === "Diesel") price = 91.5 + Math.random() * 3.5;
        else if (fuel === "CNG") price = 81.0 + Math.random() * 4.5;
        else if (fuel === "Electric") price = 16.0 + Math.random() * 6.0;
        else price = 99.0 + Math.random() * 8.5;

        const totalCost = Number((litres * price).toFixed(1));
        const costPerKm = Number((totalCost / dist).toFixed(2));
        const color = colors[Math.floor(Math.random() * colors.length)];
        const note = notesList[Math.floor(Math.random() * notesList.length)];

        generated.push({
          id: i + 1,
          vehicle,
          brand,
          model,
          distance: dist,
          litres,
          totalCost,
          efficiency: eff,
          costPerKm,
          year,
          fuel,
          color,
          date: d.toISOString().split("T")[0],
          notes: note
        });
      }

      // Sort chronologically descending (newest first)
      generated.sort((a, b) => new Date(b.date) - new Date(a.date));
      generated.forEach((r, idx) => { r.id = idx + 1; });

      return generated;
    },

    load500Records() {
      const records = this.generate500Records(500);
      this.saveRecords(records);
      return records;
    },

    loadSampleDataset() {
      return this.load500Records();
    },

    /**
     * Computes comprehensive analytics and distance-weighted metrics
     */
    getMetrics(recordsList) {
      const records = recordsList || this.getRecords();
      const totalRecords = records.length;

      const totalDistance = records.reduce((sum, r) => sum + r.distance, 0);
      const totalFuel = records.reduce((sum, r) => sum + r.litres, 0);
      const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);

      // Distance-weighted average fuel efficiency
      const distanceWeightedEfficiency = (totalDistance > 0 && totalFuel > 0)
        ? (totalDistance / totalFuel)
        : 0;

      // Arithmetic mean for reference
      const arithmeticEfficiency = totalRecords > 0
        ? (records.reduce((sum, r) => sum + r.efficiency, 0) / totalRecords)
        : 0;

      const avgCostPerKm = totalDistance > 0
        ? (totalCost / totalDistance)
        : 0;

      // Group by distinct vehicles
      const vehicleStats = this.getGroupedVehicleStats(records);
      const totalVehicles = Object.keys(vehicleStats).length;

      // Best and worst performers
      let bestVehicle = null;
      let worstVehicle = null;
      let highestCostVehicle = null;

      const vehicleList = Object.values(vehicleStats);
      if (vehicleList.length > 0) {
        const sortedByEff = [...vehicleList].sort((a, b) => b.efficiency - a.efficiency);
        bestVehicle = sortedByEff[0];
        worstVehicle = sortedByEff[sortedByEff.length - 1];

        const sortedByCost = [...vehicleList].sort((a, b) => b.totalCost - a.totalCost);
        highestCostVehicle = sortedByCost[0];
      }

      return {
        totalRecords,
        totalVehicles,
        totalDistance: Number(totalDistance.toFixed(2)),
        totalFuel: Number(totalFuel.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        avgEfficiency: Number(distanceWeightedEfficiency.toFixed(2)),
        arithmeticAvgEfficiency: Number(arithmeticEfficiency.toFixed(2)),
        avgCostPerKm: Number(avgCostPerKm.toFixed(2)),
        bestVehicle,
        worstVehicle,
        highestCostVehicle,
        vehicleStats
      };
    },

    /**
     * Aggregates records by vehicle name using distance-weighted formulas
     */
    getGroupedVehicleStats(recordsList) {
      const records = recordsList || this.getRecords();
      const groups = {};

      records.forEach(r => {
        const name = r.vehicle || "Unknown Vehicle";
        if (!groups[name]) {
          groups[name] = {
            vehicle: name,
            brand: r.brand,
            model: r.model,
            fuel: r.fuel,
            color: r.color,
            year: r.year,
            totalDistance: 0,
            totalFuel: 0,
            totalCost: 0,
            entriesCount: 0,
            records: []
          };
        }
        groups[name].totalDistance += r.distance;
        groups[name].totalFuel += r.litres;
        groups[name].totalCost += r.totalCost;
        groups[name].entriesCount += 1;
        groups[name].records.push(r);
      });

      // Calculate weighted efficiency and cost/km
      Object.keys(groups).forEach(name => {
        const g = groups[name];
        g.efficiency = g.totalFuel > 0 ? Number((g.totalDistance / g.totalFuel).toFixed(2)) : 0;
        g.costPerKm = g.totalDistance > 0 ? Number((g.totalCost / g.totalDistance).toFixed(2)) : 0;
        // Sort individual records by date
        g.records.sort((a, b) => new Date(a.date) - new Date(b.date));
      });

      return groups;
    },

    /**
     * Aggregates records by Month (YYYY-MM)
     */
    getMonthlyTrends(recordsList) {
      const records = recordsList || this.getRecords();
      const months = {};

      records.forEach(r => {
        const monthKey = r.date ? r.date.substring(0, 7) : "Unknown";
        if (!months[monthKey]) {
          months[monthKey] = {
            month: monthKey,
            totalDistance: 0,
            totalFuel: 0,
            totalCost: 0,
            count: 0
          };
        }
        months[monthKey].totalDistance += r.distance;
        months[monthKey].totalFuel += r.litres;
        months[monthKey].totalCost += r.totalCost;
        months[monthKey].count += 1;
      });

      return Object.values(months)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(m => ({
          ...m,
          efficiency: m.totalFuel > 0 ? Number((m.totalDistance / m.totalFuel).toFixed(2)) : 0,
          costPerKm: m.totalDistance > 0 ? Number((m.totalCost / m.totalDistance).toFixed(2)) : 0
        }));
    },

    /**
     * CSV Export
     */
    exportCSV() {
      const records = this.getRecords();
      if (!records.length) return null;

      const headers = [
        "Record ID", "Date", "Vehicle", "Brand", "Model", "Year",
        "Fuel Type", "Distance (km)", "Fuel Used (L)", "Efficiency (km/L)",
        "Total Cost (INR)", "Cost per KM (INR)", "Color", "Notes"
      ];

      const csvRows = [headers.join(",")];

      records.forEach(r => {
        const row = [
          r.id,
          `"${r.date}"`,
          `"${(r.vehicle || "").replace(/"/g, '""')}"`,
          `"${(r.brand || "").replace(/"/g, '""')}"`,
          `"${(r.model || "").replace(/"/g, '""')}"`,
          r.year,
          `"${r.fuel}"`,
          r.distance,
          r.litres,
          r.efficiency,
          r.totalCost,
          r.costPerKm,
          `"${r.color}"`,
          `"${(r.notes || "").replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
      });

      return csvRows.join("\r\n");
    },

    /**
     * JSON Export
     */
    exportJSON() {
      const records = this.getRecords();
      const payload = {
        app: "AeroFuel3D",
        version: "2.0",
        exportedAt: new Date().toISOString(),
        totalRecords: records.length,
        records: records
      };
      return JSON.stringify(payload, null, 2);
    },

    /**
     * JSON Import with validation
     */
    importJSON(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        let incoming = [];

        if (Array.isArray(data)) {
          incoming = data;
        } else if (data && Array.isArray(data.records)) {
          incoming = data.records;
        } else {
          throw new Error("Invalid backup format: Expected an array of records.");
        }

        const sanitized = incoming.map((item, idx) => this.migrateRecord(item, idx));
        this.saveRecords(sanitized);
        return { success: true, count: sanitized.length };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  };

})(window);
