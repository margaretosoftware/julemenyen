// =============================
// 📜 menu.js – Lavvo menu NO/EN
// =============================
(function () {
  // URL de la hoja de cálculo de Google (publicada como CSV)
  // Esta URL ya está publicada y es accesible públicamente
  var DEFAULT_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSo0BYZqtNREhfTCo-ZPWCis5_84iokH3Bqi68itYeRYzjXNsyGK5BWw0omyzHQrwks4vB7yph5-bTk/pub?gid=0&single=true&output=csv";

  var CSV_URL =
    (typeof window !== "undefined" && window.MENY_CSV_URL) || DEFAULT_CSV_URL;

  // Marcamos qué platos son Take Home (por nombre NO)
  var TAKEHOME_ITEMS_NO = {
    "Rømmegrøt med spekemat": true,
    "Elgburger i briochebrød": true,
    "Julepølse i lefse": true,
    "Vegansk linsegryte": true,
    "Riskrem med rød saus": true,
    "Pepperkake og småkaker": true,
    "Karamellpudding": true,
    "Barnemeny: Pølse med potetmos": true
  };

  // Placeholder para cualquier plato con foto (da igual la URL real)
  var PLACEHOLDER_IMG =
    "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=1200&q=80";

  // ---------- CSV parsing (coma + comillas) ----------
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          row.push(field);
          field = "";
        } else if (c === "\n") {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
        } else if (c === "\r") {
          // ignorar
        } else {
          field += c;
        }
      }
    }
    row.push(field);
    rows.push(row);
    return rows;
  }

  function csvToObjects(matrix) {
    if (!matrix.length) return [];
    var headers = matrix[0].map(function (h) {
      return String(h || "").trim();
    });

    var out = [];
    for (var i = 1; i < matrix.length; i++) {
      var r = matrix[i];
      var hasData = r.some(function (x) {
        return String(x || "").trim() !== "";
      });
      if (!hasData) continue;

      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = (r[j] == null ? "" : String(r[j]).trim());
      }
      out.push(obj);
    }
    return out;
  }

  function fetchCSV(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("sheet answered " + res.status);
        return res.text();
      })
      .then(function (text) {
        var matrix = parseCSV(text);
        return csvToObjects(matrix);
      });
  }

  // ---------- Normalización y helpers ----------
  function normalizeRows(rows) {
    var filtered = rows.filter(function (r) {
      return String(r.available || "").toLowerCase() === "true";
    });

    var groupsMap = {};
    var groupsOrder = [];

    filtered.forEach(function (r) {
      var catNo = r.category || "Annet";
      if (!groupsMap[catNo]) {
        groupsMap[catNo] = {
          category: r.category || "Annet",
          category_en: r.category_en || "",
          items: []
        };
        groupsOrder.push(catNo);
      }
      r._price = r.price === "" ? null : Number(r.price);
      r._order = r.order === "" ? 0 : Number(r.order);
      groupsMap[catNo].items.push(r);
    });

    var groups = groupsOrder.map(function (cat) {
      return groupsMap[cat];
    });

    groups.forEach(function (g) {
      g.items.sort(function (a, b) {
        var ao = a._order - b._order;
        if (ao !== 0) return ao;
        return (a.item_name || "").localeCompare(b.item_name || "");
      });
    });

    return groups;
  }

  function pickLang(row, base, lang) {
    if (lang === "en") {
      return row[base + "_en"] || row[base] || "";
    }
    return row[base] || row[base + "_en"] || "";
  }

  function subtitleForCategory(catNo, lang) {
    // Subtítulos desactivados por petición del cliente
    return "";
  }

  function formatPrice(row) {
    if (row._price == null || isNaN(row._price)) return "";
    return row._price.toString() + ",-";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isTakeHome(row) {
    var nameNo = row.item_name || "";
    return !!TAKEHOME_ITEMS_NO[nameNo];
  }

  function isSoldOut(row) {
    return String(row.sold_out || "").toLowerCase() === "true";
  }

  function hasPhoto(row) {
    return !!(row.image_url && row.image_url.trim());
  }

  // ---------- Snapshots para detectar cambios ----------
  function snapshotKeyArray(arr) {
    arr.sort(function (a, b) {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    return JSON.stringify(arr);
  }

  function buildSnapshotFromGroups(groups, lang) {
    var arr = [];
    groups.forEach(function (g) {
      var catNo = g.category || "Annet";
      g.items.forEach(function (row) {
        arr.push({
          category: catNo,
          name: pickLang(row, "item_name", lang),
          description: pickLang(row, "description", lang),
          allergens: pickLang(row, "allergens", lang),
          price: formatPrice(row),
          takehome: isTakeHome(row),
          soldout: isSoldOut(row),
          hasPhoto: hasPhoto(row),
          imageUrl: row.image_url || ""
        });
      });
    });
    return snapshotKeyArray(arr);
  }

  function buildSnapshotFromDOM(dynamic, lang) {
    var photoCards = dynamic.querySelectorAll(".lavvo-photo-card");
    var textItems = dynamic.querySelectorAll(".lavvo-text-item");

    if (!photoCards.length && !textItems.length) return "[]";

    var arr = [];

    // Procesar photo cards
    photoCards.forEach(function (card) {
      var catDiv = card.closest(".lavvo-category");
      var cat = "";
      if (catDiv) {
        cat = catDiv.getAttribute("data-category") || "";
        if (!cat) {
          var titleEl = catDiv.querySelector(".lavvo-category-title");
          cat = titleEl ? titleEl.textContent.trim() : "";
        }
      }

      var nameEl = card.querySelector(".lavvo-photo-card-name");
      var descEl = card.querySelector(".lavvo-photo-card-desc");
      var priceEl = card.querySelector(".lavvo-photo-card-price");
      var imgEl = card.querySelector(".lavvo-photo-card-image");

      var name = nameEl ? nameEl.textContent.trim() : "";
      var desc = descEl ? descEl.textContent.trim() : "";
      var allergensAttr = (card.getAttribute("data-allergens") || "").trim();
      var price = priceEl ? priceEl.textContent.trim() : "";
      var takehomeAttr = card.getAttribute("data-takehome") === "true";
      var soldoutAttr = card.getAttribute("data-soldout") === "true";

      var imageUrl = "";
      if (imgEl) {
        var bgStyle = imgEl.style.backgroundImage;
        if (bgStyle) {
          var match = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
          imageUrl = match ? match[1] : "";
        }
      }

      arr.push({
        category: cat,
        name: name,
        description: desc,
        allergens: allergensAttr,
        price: price,
        takehome: takehomeAttr,
        soldout: soldoutAttr,
        hasPhoto: true,
        imageUrl: imageUrl
      });
    });

    // Procesar text items
    textItems.forEach(function (item) {
      var catDiv = item.closest(".lavvo-category");
      var cat = "";
      if (catDiv) {
        cat = catDiv.getAttribute("data-category") || "";
        if (!cat) {
          var titleEl = catDiv.querySelector(".lavvo-category-title");
          cat = titleEl ? titleEl.textContent.trim() : "";
        }
      }

      var nameEl = item.querySelector(".lavvo-text-item-name");
      var descEl = item.querySelector(".lavvo-text-item-desc");
      var priceEl = item.querySelector(".lavvo-text-item-price");

      var name = nameEl ? nameEl.textContent.trim() : "";
      var desc = descEl ? descEl.textContent.trim() : "";
      var allergensAttr = (item.getAttribute("data-allergens") || "").trim();
      var price = priceEl ? priceEl.textContent.trim() : "";
      var takehomeAttr = item.getAttribute("data-takehome") === "true";
      var soldoutAttr = item.getAttribute("data-soldout") === "true";

      arr.push({
        category: cat,
        name: name,
        description: desc,
        allergens: allergensAttr,
        price: price,
        takehome: takehomeAttr,
        soldout: soldoutAttr,
        hasPhoto: false,
        imageUrl: ""
      });
    });

    return snapshotKeyArray(arr);
  }

  // ---------- Generación de HTML ----------
  function buildMenuHTML(groups, lang) {
    var html = "";
    groups.forEach(function (g) {
      var catNo = g.category || "Annet";
      var catLabel =
        lang === "en"
          ? g.category_en || g.category || ""
          : g.category || g.category_en || "";
      var subtitle = subtitleForCategory(catNo, lang);

      html +=
        '<div class="lavvo-category" data-category="' +
        escapeHtml(catNo) +
        '">';
      html +=
        '<div class="lavvo-category-title">' +
        escapeHtml(catLabel) +
        "</div>";
      html += '<hr class="lavvo-category-rule">';
      if (subtitle) {
        html +=
          '<div class="lavvo-category-subtitle">' +
          escapeHtml(subtitle) +
          "</div>";
      }

      // Separar items con foto y sin foto
      var photoItems = [];
      var textItems = [];
      g.items.forEach(function(row) {
        if (hasPhoto(row)) {
          photoItems.push(row);
        } else {
          textItems.push(row);
        }
      });

      // Grid de items CON foto (arriba)
      if (photoItems.length > 0) {
        html += '<div class="lavvo-photo-grid">';
        photoItems.forEach(function (row) {
          var name = pickLang(row, "item_name", lang);
          var desc = pickLang(row, "description", lang);
          var allergens = pickLang(row, "allergens", lang);
          var price = formatPrice(row);
          var takehome = isTakeHome(row);
          var soldout = isSoldOut(row);
          var imgUrl = row.image_url || PLACEHOLDER_IMG;

          html += '<div class="lavvo-photo-card"';
          html += ' data-category="' + escapeHtml(catNo) + '"';
          html += ' data-allergens="' + escapeHtml(allergens) + '"';
          html += ' data-takehome="' + (takehome ? "true" : "false") + '"';
          html += ' data-soldout="' + (soldout ? "true" : "false") + '">';

          html += '<div class="lavvo-photo-card-image" style="background-image:url(' + "'" + imgUrl + "'" + ');">';

          // Badge de alérgenos si los hay
          if (allergens) {
            var allergenLabel = lang === "en" ? "Allergens" : "Allergener";
            html += '<div class="lavvo-allergen-badge">' + escapeHtml(allergenLabel) + '</div>';
          }

          // UTSOLGT centrado sobre la imagen
          if (soldout) {
            var soldoutLabel = lang === "en" ? "SOLD OUT" : "UTSOLGT";
            html += '<div class="lavvo-photo-card-soldout-overlay">' + escapeHtml(soldoutLabel) + '</div>';
          }

          html += '</div>';

          html += '<div class="lavvo-photo-card-body">';
          html += '<div class="lavvo-photo-card-name">' + escapeHtml(name) + "</div>";

          if (desc) {
            html += '<p class="lavvo-photo-card-desc">' + escapeHtml(desc) + "</p>";
          }

          if (allergens) {
            var allergenLabel = lang === "en" ? "Allergens" : "Allergener";
            html += '<p class="lavvo-photo-card-allergens"><em>' + escapeHtml(allergenLabel) + ': ' + escapeHtml(allergens) + '</em></p>';
          }

          if (price) {
            html += '<div class="lavvo-photo-card-price">' + escapeHtml(price) + "</div>";
          }

          html += "</div></div>";
        });
        html += '</div>';
      }

      // Lista de items SIN foto (abajo)
      if (textItems.length > 0) {
        html += '<div class="lavvo-text-list">';
        textItems.forEach(function (row) {
          var name = pickLang(row, "item_name", lang);
          var desc = pickLang(row, "description", lang);
          var allergens = pickLang(row, "allergens", lang);
          var price = formatPrice(row);
          var takehome = isTakeHome(row);
          var soldout = isSoldOut(row);

          html += '<div class="lavvo-text-item"';
          html += ' data-category="' + escapeHtml(catNo) + '"';
          html += ' data-allergens="' + escapeHtml(allergens) + '"';
          html += ' data-takehome="' + (takehome ? "true" : "false") + '"';
          html += ' data-soldout="' + (soldout ? "true" : "false") + '">';

          // Content column
          html += '<div class="lavvo-text-item-content">';

          html += '<div class="lavvo-text-item-header">';
          var nameClass = soldout ? "lavvo-text-item-name soldout" : "lavvo-text-item-name";
          html += '<h3 class="' + nameClass + '">' + escapeHtml(name);

          if (soldout) {
            var soldoutLabel = lang === "en" ? "SOLD OUT" : "UTSOLGT";
            html += '<span class="lavvo-text-item-soldout-badge">' + escapeHtml(soldoutLabel) + '</span>';
          }

          html += '</h3>';
          html += '</div>';

          if (desc) {
            html += '<p class="lavvo-text-item-desc">' + escapeHtml(desc) + "</p>";
          }

          if (allergens) {
            var allergenLabel = lang === "en" ? "Allergens" : "Allergener";
            html += '<p class="lavvo-text-item-allergens"><em>' + escapeHtml(allergenLabel) + ': ' + escapeHtml(allergens) + '</em></p>';
          }

          html += '</div>';

          // Price column
          if (price) {
            var priceClass = soldout ? "lavvo-text-item-price soldout" : "lavvo-text-item-price";
            html += '<div class="' + priceClass + '">' + escapeHtml(price) + "</div>";
          }

          html += "</div>";
        });
        html += '</div>';
      }

      html += "</div>";
    });

    return html;
  }

  // ---------- Extraer categorías únicas del CSV ----------
  function buildCategoryList(groups) {
    var categoriesMap = {}; // { 'Drikke': 'Drinks', 'Matretter': 'Food', ... }

    groups.forEach(function(g) {
      if (g.category) {
        var catNo = g.category;
        var catEn = g.category_en || catNo; // Fallback a NO si no hay EN
        categoriesMap[catNo] = catEn;
      }
    });

    return categoriesMap;
  }

  function initCategoryDropdown(root, categoriesMap, lang) {
    var dropdown = root.querySelector('#category-dropdown');
    if (!dropdown) return;

    var menu = dropdown.querySelector('.lavvo-dropdown-menu');
    if (!menu) return;

    var dropdownSelected = dropdown.querySelector('.lavvo-dropdown-selected');
    if (!dropdownSelected) return;

    // Asegurar que dropdownSelected tenga la propiedad 'value'
    if (!dropdownSelected.hasOwnProperty('value')) {
      Object.defineProperty(dropdownSelected, 'value', {
        get: function() {
          return this.getAttribute('data-value') || 'all';
        },
        set: function(val) {
          this.setAttribute('data-value', val);
        },
        configurable: true
      });
    }

    // Initialize value if not set
    if (!dropdownSelected.getAttribute('data-value')) {
      dropdownSelected.value = 'all';
    }

    // categoriesMap es { 'Drikke': 'Drinks', 'Matretter': 'Food', ... }
    var categoryKeys = Object.keys(categoriesMap);

    // Función para manejar click en items (reutilizable)
    function handleItemClick() {
      var allItems = menu.querySelectorAll('.lavvo-dropdown-item');

      // Update selected text and value
      dropdownSelected.textContent = this.textContent;
      dropdownSelected.value = this.getAttribute('data-value');

      // Update selected class
      allItems.forEach(function(i) { i.classList.remove('selected'); });
      this.classList.add('selected');

      // Close dropdown
      dropdown.classList.remove('active');

      // Trigger filter change event
      dropdownSelected.dispatchEvent(new Event('change'));
    }

    // Revisar items existentes
    var existingItems = menu.querySelectorAll('.lavvo-dropdown-item');
    var existingCategories = {};

    existingItems.forEach(function(item) {
      var val = item.getAttribute('data-value');

      // Mantener "all"
      if (val === 'all') {
        existingCategories[val] = true;
        return;
      }

      // Si la categoría pre-renderizada NO está en el CSV, eliminarla
      if (!categoriesMap[val]) {
        item.remove();
      } else {
        existingCategories[val] = true;

        // Actualizar el texto traducido si es necesario
        var categoryEn = categoriesMap[val];
        var expectedText = lang === 'en' ? categoryEn : val;
        if (item.textContent !== expectedText) {
          item.textContent = expectedText;
        }
      }
    });

    // Añadir categorías del CSV que no existan
    categoryKeys.forEach(function(categoryNo) {
      if (existingCategories[categoryNo]) {
        // Ya existe
        return;
      }

      var categoryEn = categoriesMap[categoryNo];
      var displayText = lang === 'en' ? categoryEn : categoryNo;

      var item = document.createElement('div');
      item.className = 'lavvo-dropdown-item';
      item.setAttribute('data-value', categoryNo); // Siempre usar el valor NO para filtrado
      item.textContent = displayText;

      // Añadir evento click usando la función compartida
      item.addEventListener('click', handleItemClick);

      menu.appendChild(item);
    });

    // IMPORTANTE: Asegurar que TODOS los items (pre-renderizados + nuevos)
    // usen delegación de eventos desde el menu
    // Esto evita conflictos con event listeners del HTML inline
    var allCurrentItems = menu.querySelectorAll('.lavvo-dropdown-item');
    allCurrentItems.forEach(function(item) {
      // Clonar el item para eliminar todos los event listeners anteriores
      var newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);

      // Añadir el nuevo event listener
      newItem.addEventListener('click', handleItemClick);
    });
  }

  // ---------- Generar modal de alérgenos ----------
  function buildAllergenModal(groups, lang) {
    var allergensSet = {};

    // Extraer todos los alérgenos únicos
    groups.forEach(function(g) {
      g.items.forEach(function(row) {
        var allergens = pickLang(row, "allergens", lang);
        if (allergens) {
          // Split por comas y limpiar espacios
          var parts = allergens.split(',');
          parts.forEach(function(allergen) {
            var cleaned = allergen.trim().toLowerCase();
            if (cleaned) {
              allergensSet[cleaned] = true;
            }
          });
        }
      });
    });

    var allergensList = Object.keys(allergensSet).sort();
    return allergensList;
  }

  function initAllergenModal(root, allergensList, lang) {
    var modal = root.querySelector('.lavvo-allergen-modal');
    if (!modal) return;

    var grid = modal.querySelector('.lavvo-allergen-grid');
    if (!grid) return;

    // Crear un Set para búsqueda rápida
    var csvAllergensSet = {};
    allergensList.forEach(function(allergen) {
      csvAllergensSet[allergen] = true;
    });

    // Obtener alérgenos ya existentes (pre-renderizados)
    var existingItems = grid.querySelectorAll('.lavvo-allergen-item');
    var existingAllergens = {};

    existingItems.forEach(function(item) {
      var cb = item.querySelector('input[type="checkbox"]');
      if (cb) {
        var value = cb.value;
        existingAllergens[value] = true;

        // Si el alérgeno pre-renderizado NO está en el CSV, eliminarlo
        if (!csvAllergensSet[value]) {
          item.remove();
        }
      }
    });

    // Añadir nuevos alérgenos del CSV que no existan
    allergensList.forEach(function(allergen) {
      if (existingAllergens[allergen]) {
        // Ya existe, no hacer nada
        return;
      }

      // Crear nuevo checkbox para alérgeno del CSV
      var item = document.createElement('div');
      item.className = 'lavvo-allergen-item';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'allergen-' + allergen.replace(/\s+/g, '-');
      checkbox.value = allergen;

      var label = document.createElement('label');
      label.htmlFor = checkbox.id;
      // Capitalizar primera letra
      label.textContent = allergen.charAt(0).toUpperCase() + allergen.slice(1);

      item.appendChild(checkbox);
      item.appendChild(label);
      grid.appendChild(item);
    });
  }

  // ---------- Filtros ----------
  function applyFilters(root) {
    var select = root.querySelector('[data-filter="category"]');
    var chkAllerg = root.querySelector(
      '[data-filter="allergier"], [data-filter="allergens"]'
    );
    var chkTake = root.querySelector('[data-filter="takehome"]');

    var selectedCat = select ? select.value : "all";
    var onlyAllerg = chkAllerg ? chkAllerg.checked : false;
    var onlyTake = chkTake ? chkTake.checked : false;

    // Get selected allergens from modal if applicable
    var selectedAllergens = [];
    if (onlyAllerg) {
      var allergenCheckboxes = document.querySelectorAll('.lavvo-allergen-item input[type="checkbox"]:checked');
      allergenCheckboxes.forEach(function(cb) {
        var values = cb.value.split(',');
        selectedAllergens = selectedAllergens.concat(values);
      });
    }

    // Filter photo cards
    var photoCards = root.querySelectorAll(".lavvo-photo-card");
    photoCards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var allergens = (card.getAttribute("data-allergens") || "").trim();
      var takehome = card.getAttribute("data-takehome") === "true";

      var show = true;
      if (selectedCat !== "all" && cat !== selectedCat) show = false;
      if (onlyTake && !takehome) show = false;

      // Check if item contains any selected allergens
      if (onlyAllerg && selectedAllergens.length > 0) {
        var itemHasAllergen = false;
        if (allergens) {
          var allergenLower = allergens.toLowerCase();
          for (var i = 0; i < selectedAllergens.length; i++) {
            if (allergenLower.indexOf(selectedAllergens[i].toLowerCase()) !== -1) {
              itemHasAllergen = true;
              break;
            }
          }
        }
        if (itemHasAllergen) show = false;
      }

      card.classList.toggle("lavvo-hidden", !show);
    });

    // Filter text items
    var textItems = root.querySelectorAll(".lavvo-text-item");
    textItems.forEach(function (item) {
      var cat = item.getAttribute("data-category") || "";
      var allergens = (item.getAttribute("data-allergens") || "").trim();
      var takehome = item.getAttribute("data-takehome") === "true";

      var show = true;
      if (selectedCat !== "all" && cat !== selectedCat) show = false;
      if (onlyTake && !takehome) show = false;

      // Check if item contains any selected allergens
      if (onlyAllerg && selectedAllergens.length > 0) {
        var itemHasAllergen = false;
        if (allergens) {
          var allergenLower = allergens.toLowerCase();
          for (var i = 0; i < selectedAllergens.length; i++) {
            if (allergenLower.indexOf(selectedAllergens[i].toLowerCase()) !== -1) {
              itemHasAllergen = true;
              break;
            }
          }
        }
        if (itemHasAllergen) show = false;
      }

      item.classList.toggle("lavvo-hidden", !show);
    });

    // Hide/show categories and grids
    var cats = root.querySelectorAll(".lavvo-category");
    cats.forEach(function (catDiv) {
      var visiblePhotos = catDiv.querySelectorAll(".lavvo-photo-card:not(.lavvo-hidden)").length;
      var visibleTexts = catDiv.querySelectorAll(".lavvo-text-item:not(.lavvo-hidden)").length;
      var visible = (visiblePhotos + visibleTexts) > 0;
      catDiv.classList.toggle("lavvo-hidden", !visible);

      // Hide/show grids within category
      var photoGrid = catDiv.querySelector(".lavvo-photo-grid");
      var textList = catDiv.querySelector(".lavvo-text-list");
      if (photoGrid) {
        photoGrid.classList.toggle("lavvo-hidden", visiblePhotos === 0);
      }
      if (textList) {
        textList.classList.toggle("lavvo-hidden", visibleTexts === 0);
      }
    });
  }

  function initFilters(root) {
    var select = root.querySelector('[data-filter="category"]');
    var chkAllerg = root.querySelector(
      '[data-filter="allergier"], [data-filter="allergens"]'
    );
    var chkTake = root.querySelector('[data-filter="takehome"]');

    if (select)
      select.addEventListener("change", function () {
        applyFilters(root);
      });
    if (chkAllerg)
      chkAllerg.addEventListener("change", function () {
        applyFilters(root);
      });
    if (chkTake)
      chkTake.addEventListener("change", function () {
        applyFilters(root);
      });

    applyFilters(root);
  }

  // ---------- Loading state ----------
  // The page carries a pre-rendered copy of the menu (for search engines and for
  // when the sheet cannot be read). It may be older than the sheet, so visitors
  // never see it while the sheet is on its way: it is hidden until the fresh menu
  // is in place, or until LOADING_MAX_MS has passed or the request has failed.
  var LOADING_MAX_MS = 5000;

  function addLoadingStyle() {
    var style = document.createElement("style");
    style.textContent =
      ".lavvo-menu-root.lavvo-loading .lavvo-menu-dynamic{visibility:hidden;max-height:60vh;overflow:hidden}";
    document.head.appendChild(style);
  }

  function startLoading(root) {
    var lang = (root.getAttribute("data-lang") || "no").toLowerCase();
    var status = root.querySelector(".lavvo-status");
    root.classList.add("lavvo-loading");
    if (status) {
      status.textContent = lang === "en" ? "Loading the menu..." : "Laster menyen...";
    }
  }

  function stopLoading(root) {
    var status = root.querySelector(".lavvo-status");
    root.classList.remove("lavvo-loading");
    if (status) {
      status.style.display = "none";
    }
  }

  function stopLoadingAll() {
    document.querySelectorAll(".lavvo-menu-root").forEach(stopLoading);
  }

  // ---------- Render global ----------
  function renderAll(groups) {
    var roots = document.querySelectorAll(".lavvo-menu-root");
    roots.forEach(function (root) {
      var lang = (root.getAttribute("data-lang") || "no").toLowerCase();
      if (lang !== "en") lang = "no";

      var dynamic = root.querySelector(".lavvo-menu-dynamic");
      if (!dynamic) return;

      var newSnapshot = buildSnapshotFromGroups(groups, lang);
      if (buildSnapshotFromDOM(dynamic, lang) !== newSnapshot) {
        dynamic.innerHTML = buildMenuHTML(groups, lang);
      }
      stopLoading(root);

      // SIEMPRE inicializar categorías y alérgenos (incluso si el menú no cambió)
      // Esto asegura que los filtros se llenen dinámicamente desde el CSV
      var categoriesMap = buildCategoryList(groups);
      initCategoryDropdown(root, categoriesMap, lang);

      var allergensList = buildAllergenModal(groups, lang);
      initAllergenModal(root, allergensList, lang);

      initFilters(root);
    });
  }

  // ---------- Inicialización ----------
  function init() {
    addLoadingStyle();
    document.querySelectorAll(".lavvo-menu-root").forEach(startLoading);
    setTimeout(stopLoadingAll, LOADING_MAX_MS);

    fetchCSV(CSV_URL)
      .then(function (rows) {
        var groups = normalizeRows(rows);
        if (!groups.length) throw new Error("the sheet has no available items");
        renderAll(groups);
      })
      .catch(function (err) {
        console.error("Error loading menu:", err);
        stopLoadingAll();
      });
  }

  // The script sits right after the menu in the page, so the menu is already there
  if (document.querySelector(".lavvo-menu-root")) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
