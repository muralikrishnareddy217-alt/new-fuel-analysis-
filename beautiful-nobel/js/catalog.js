/**
 * AERO // FUEL 3D - Vehicle Brand & Model Catalog
 * Preserves all original brands and models from the original Fuel Consumption Analysis System
 * while providing extensible search and custom vehicle registration.
 */
(function(window) {
  'use strict';

  const brandCatalog = [
    "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick", "Cadillac",
    "Chevrolet", "Chrysler", "Citroen", "Dacia", "Dodge", "Ferrari", "Fiat", "Ford",
    "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Lamborghini",
    "Land Rover", "Lexus", "Lincoln", "Mahindra", "Maruti Suzuki", "Maserati", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi",
    "Nissan", "Peugeot", "Porsche", "Ram", "Renault", "Rolls-Royce", "Saab", "Subaru",
    "Suzuki", "Tata", "Tesla", "Toyota", "Volkswagen", "Volvo"
  ];

  const modelCatalog = {
    Acura: ["ILX", "MDX", "RDX", "TLX", "NSX", "Integra"],
    "Alfa Romeo": ["Giulia", "Stelvio", "Tonale", "4C", "MiTo"],
    "Aston Martin": ["DB11", "DBS", "Vantage", "Rapide", "DBX"],
    Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "R8", "RS5", "S4", "TT"],
    Bentley: ["Continental GT", "Flying Spur", "Bentayga", "Mulsanne"],
    BMW: ["M5 Competition", "M5 CS", "M5", "M3", "M4", "3 Series", "5 Series", "7 Series", "X5 M", "X7", "i8", "Z4", "i4", "iX"],
    Buick: ["Encore", "Enclave", "Regal", "LaCrosse"],
    Cadillac: ["CTS", "Escalade", "XT4", "XT5", "CT4", "CT5", "Lyriq"],
    Chevrolet: ["Camaro", "Corvette", "Malibu", "Cruze", "Impala", "Tahoe", "Silverado", "Bolt EV"],
    Chrysler: ["300", "Pacifica", "Voyager", "Aspen"],
    Citroen: ["C3", "C4", "C5", "Berlingo", "DS3", "Aircross"],
    Dacia: ["Sandero", "Duster", "Logan", "Lodgy", "Spring"],
    Dodge: ["Charger", "Challenger", "Durango", "Ram", "Hornet"],
    Ferrari: ["488 GTB", "F8 Tributo", "Roma", "SF90 Stradale", "Portofino", "296 GTB"],
    Fiat: ["500", "Panda", "Tipo", "Doblo", "124 Spider", "500e"],
    Ford: ["Focus", "Fiesta", "Mustang", "Explorer", "F-150", "Escape", "Bronco", "Mach-E"],
    Genesis: ["G80", "G90", "GV70", "GV80", "G70", "GV60"],
    GMC: ["Terrain", "Yukon", "Sierra", "Acadia", "Hummer EV"],
    Honda: ["Civic", "Accord", "City", "CR-V", "HR-V", "Pilot", "Jazz", "BR-V", "Amaze", "Elevate"],
    Hyundai: ["Elantra", "Accent", "Creta", "Tucson", "Santa Fe", "Ioniq 5", "Verna", "Venue", "i20"],
    Infiniti: ["Q50", "Q60", "QX50", "QX60", "QX80"],
    Jaguar: ["XE", "XF", "F-Pace", "E-Pace", "F-Type", "I-Pace"],
    Jeep: ["Wrangler", "Cherokee", "Grand Cherokee", "Compass", "Renegade", "Meridian"],
    Kia: ["Seltos", "Sportage", "Carnival", "Sonet", "Rio", "Cerato", "Sorento", "EV6", "Carens"],
    Lamborghini: ["Huracan", "Aventador", "Urus", "Gallardo", "Revuelto"],
    "Land Rover": ["Range Rover", "Discovery", "Defender", "Freelander", "Evoque", "Velar"],
    Lexus: ["IS", "ES", "RX", "NX", "GX", "LS", "UX", "RZ"],
    Lincoln: ["Navigator", "Corsair", "Aviator", "Nautilus"],
    Mahindra: ["Thar", "Scorpio-N", "XUV700", "XUV300", "Bolero", "XUV400 EV"],
    "Maruti Suzuki": ["Swift", "Baleno", "Dzire", "Brezza", "Alto", "WagonR", "Ertiga", "Grand Vitara", "Fronx", "Jimny"],
    Maserati: ["Ghibli", "Quattroporte", "Levante", "MC20", "Grecale"],
    Mazda: ["Mazda3", "Mazda6", "CX-5", "CX-9", "MX-5", "CX-30", "CX-90"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "AMG GT", "CLA", "EQE", "EQS"],
    Mini: ["Cooper", "Countryman", "Clubman", "One", "Aceman"],
    Mitsubishi: ["Lancer", "Outlander", "Pajero", "Eclipse Cross", "ASX"],
    Nissan: ["Altima", "Sentra", "Skyline", "Patrol", "Rogue", "GTR", "X-Trail", "Magnite", "Ariya"],
    Peugeot: ["208", "308", "508", "3008", "5008", "e-208"],
    Porsche: ["911", "Cayenne", "Panamera", "Macan", "Boxster", "Carrera", "Taycan"],
    Ram: ["1500", "2500", "3500", "ProMaster"],
    Renault: ["Clio", "Megane", "Captur", "Duster", "Kwid", "Triber", "Kiger"],
    "Rolls-Royce": ["Phantom", "Cullinan", "Ghost", "Wraith", "Spectre"],
    Saab: ["9-3", "9-5", "900", "Sonett"],
    Subaru: ["Impreza", "Legacy", "Outback", "WRX", "Forester", "Crosstrek", "BRZ", "Solterra"],
    Suzuki: ["Swift", "Baleno", "Vitara", "Jimny", "Ciaz", "Ignis", "S-Cross"],
    Tata: ["Nexon", "Punch", "Harrier", "Safari", "Tiago", "Altroz", "Nexon EV", "Curvv"],
    Tesla: ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Roadster"],
    Toyota: ["Corolla", "Camry", "Fortuner", "Prius", "Yaris", "RAV4", "Land Cruiser", "Hilux", "Innova Hycross", "Urban Cruiser"],
    "Volkswagen": ["Golf", "Polo", "Passat", "Jetta", "Tiguan", "Touareg", "Beetle", "Taigun", "Virtus", "ID.4"],
    Volvo: ["S60", "V60", "XC60", "XC90", "V90", "S90", "EX30", "EX90", "C40"]
  };

  const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"];

  const colorPresets = [
    { name: "Marina Bay Blue Metallic", hex: "#004fc7" },
    { name: "Isle of Man Green", hex: "#0b6647" },
    { name: "Toronto Red Metallic", hex: "#c8102e" },
    { name: "Black Sapphire Metallic", hex: "#11141a" },
    { name: "Alpine White", hex: "#f3f4f6" },
    { name: "Frozen Deep Gray", hex: "#4b5563" },
    { name: "Sao Paulo Yellow", hex: "#eab308" },
    { name: "Electric Cyan", hex: "#00f0ff" },
    { name: "Hyper Violet", hex: "#8b5cf6" },
    { name: "Emerald Green", hex: "#10b981" }
  ];

  window.FuelCatalog = {
    brands: brandCatalog,
    models: modelCatalog,
    fuelTypes: fuelTypes,
    colorPresets: colorPresets,

    getBrands() {
      return [...brandCatalog].sort();
    },

    getModels(brand) {
      if (!brand) return [];
      return modelCatalog[brand] ? [...modelCatalog[brand]].sort() : [];
    },

    searchBrands(query, limit = 16) {
      const q = (query || "").trim().toLowerCase();
      if (!q) return brandCatalog.slice(0, limit);
      return brandCatalog.filter(b => b.toLowerCase().includes(q)).slice(0, limit);
    },

    searchModels(brand, query, limit = 16) {
      const models = this.getModels(brand);
      const q = (query || "").trim().toLowerCase();
      if (!q) return models.slice(0, limit);
      return models.filter(m => m.toLowerCase().includes(q)).slice(0, limit);
    },

    registerCustomBrand(brandName) {
      const name = (brandName || "").trim();
      if (!name) return false;
      if (!brandCatalog.some(b => b.toLowerCase() === name.toLowerCase())) {
        brandCatalog.push(name);
        if (!modelCatalog[name]) {
          modelCatalog[name] = [];
        }
      }
      return true;
    },

    registerCustomModel(brandName, modelName) {
      const b = (brandName || "").trim();
      const m = (modelName || "").trim();
      if (!b || !m) return false;
      this.registerCustomBrand(b);
      if (!modelCatalog[b]) modelCatalog[b] = [];
      if (!modelCatalog[b].some(item => item.toLowerCase() === m.toLowerCase())) {
        modelCatalog[b].push(m);
      }
      return true;
    }
  };

})(window);
