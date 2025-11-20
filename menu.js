// =============================
// 📜 menu.js – Lavvo menu NO/EN
// =============================
(function () {
  // URL de la hoja de cálculo de Google (publicada como CSV)
  // Tu spreadsheet ID: 1yjhrRr1-ac2V74ihbnOjVJ38k9kJkRCU7i7GCssZijA
  // IMPORTANTE: Debes publicar la hoja como CSV desde Google Sheets:
  // File > Share > Publish to web > Sheet 1 > CSV > Publish
  var DEFAULT_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1yjhrRr1-ac2V74ihbnOjVJ38k9kJkRCU7i7GCssZijA/export?format=csv&gid=0";

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
    if (lang === "en") {
      if (catNo === "Drikke") return "Hot drinks and mulled beverages";
      if (catNo === "Matretter") return "Warm dishes and Christmas favourites";
      if (catNo === "Dessert") return "Sweet endings";
      if (catNo === "Annet") return "For both children and adults";
      return "";
    } else {
      if (catNo === "Drikke") return "Varme drikker og gløgg";
      if (catNo === "Matretter") return "Varme retter og julefavoritter";
      if (catNo === "Dessert") return "Søte avslutninger";
      if (catNo === "Annet") return "For store og små";
      return "";
    }
  }

  function formatPrice(row) {
    if (row._price == null || isNaN(row._price)) return "";
    var cur = row.currency || "NOK";
    return row._price.toString() + " " + cur;
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
          hasPhoto: hasPhoto(row)
        });
      });
    });
    return snapshotKeyArray(arr);
  }

  function buildSnapshotFromDOM(dynamic, lang) {
    var cards = dynamic.querySelectorAll(".lavvo-card");
    if (!cards.length) return "[]";

    var arr = [];
    cards.forEach(function (card) {
      var catDiv = card.closest(".lavvo-category");
      var cat = "";
      if (catDiv) {
        cat = catDiv.getAttribute("data-category") || "";
        if (!cat) {
          var titleEl = catDiv.querySelector(".lavvo-category-title");
          cat = titleEl ? titleEl.textContent.trim() : "";
        }
      }

      var nameEl = card.querySelector(".lavvo-card-name");
      var descEl = card.querySelector(".lavvo-card-desc");
      var priceEl = card.querySelector(".lavvo-card-price");

      var name = nameEl ? nameEl.textContent.trim() : "";
      var desc = descEl ? descEl.textContent.trim() : "";
      var allergensAttr = (card.getAttribute("data-allergens") || "").trim();
      var price = priceEl ? priceEl.textContent.trim() : "";
      var takehomeAttr = card.getAttribute("data-takehome") === "true";
      var soldoutAttr = card.getAttribute("data-soldout") === "true";
      var hasPhotoAttr = card.classList.contains("lavvo-card-hasphoto");

      arr.push({
        category: cat,
        name: name,
        description: desc,
        allergens: allergensAttr,
        price: price,
        takehome: takehomeAttr,
        soldout: soldoutAttr,
        hasPhoto: hasPhotoAttr
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

      html += '<div class="lavvo-grid">';

      g.items.forEach(function (row) {
        var name = pickLang(row, "item_name", lang);
        var desc = pickLang(row, "description", lang);
        var allergens = pickLang(row, "allergens", lang);
        var price = formatPrice(row);
        var takehome = isTakeHome(row);
        var soldout = isSoldOut(row);
        var photo = hasPhoto(row);

        var cardClasses = ["lavvo-card"];
        if (soldout) cardClasses.push("lavvo-card-soldout");
        if (photo) cardClasses.push("lavvo-card-hasphoto");
        else cardClasses.push("lavvo-card-noimage");

        html += '<div class="' + cardClasses.join(" ") + '"';
        html += ' data-category="' + escapeHtml(catNo) + '"';
        html += ' data-allergens="' + escapeHtml(allergens) + '"';
        html += ' data-takehome="' + (takehome ? "true" : "false") + '"';
        html += ' data-soldout="' + (soldout ? "true" : "false") + '">';

        if (photo) {
          var imgUrl = row.image_url || PLACEHOLDER_IMG;
          html +=
            '<div class="lavvo-card-image" style="background-image:url(\'' +
            imgUrl +
            "');\"></div>";
        }

        html += '<div class="lavvo-card-body">';

        if (soldout) {
          html +=
            '<div class="lavvo-card-soldout-badge">UTSOLGT</div>';
        }

        html +=
          '<div class="lavvo-card-name">' + escapeHtml(name) + "</div>";

        if (desc) {
          html +=
            '<p class="lavvo-card-desc">' +
            escapeHtml(desc) +
            "</p>";
        }
        if (allergens) {
          if (lang === "en") {
            html +=
              '<p class="lavvo-card-desc">Allergens: ' +
              escapeHtml(allergens) +
              ".</p>";
          } else {
            html +=
              '<p class="lavvo-card-desc">Allergener: ' +
              escapeHtml(allergens) +
              ".</p>";
          }
        }
        if (price) {
          html +=
            '<div class="lavvo-card-price">' +
            escapeHtml(price) +
            "</div>";
        }

        html += "</div></div>";
      });

      html += "</div></div>";
    });

    return html;
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

    var cards = root.querySelectorAll(".lavvo-card");
    cards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var allergens = (card.getAttribute("data-allergens") || "").trim();
      var takehome = card.getAttribute("data-takehome") === "true";

      var show = true;
      if (selectedCat !== "all" && cat !== selectedCat) show = false;
      if (onlyAllerg && !allergens) show = false;
      if (onlyTake && !takehome) show = false;

      card.classList.toggle("lavvo-hidden", !show);
    });

    var cats = root.querySelectorAll(".lavvo-category");
    cats.forEach(function (catDiv) {
      var visible =
        catDiv.querySelectorAll(".lavvo-card:not(.lavvo-hidden)").length > 0;
      catDiv.classList.toggle("lavvo-hidden", !visible);
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

  // ---------- Mensaje "Updating menu ..." ----------
  function showStatus(root, lang) {
    var existing = root.querySelector(".lavvo-status");
    if (existing) return existing;

    var status = document.createElement("div");
    status.className = "lavvo-status";
    status.textContent =
      lang === "en" ? "Updating menu ..." : "Oppdaterer meny ...";

    var inner = root.querySelector(".lavvo-menu-inner") || root;
    inner.appendChild(status);
    return status;
  }

  function hideStatus(status) {
    if (status && status.parentNode) {
      status.parentNode.removeChild(status);
    }
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
      var domSnapshot = null;

      if (dynamic.querySelector(".lavvo-card")) {
        domSnapshot = buildSnapshotFromDOM(dynamic, lang);
      }

      if (domSnapshot && domSnapshot === newSnapshot) {
        console.log("✅ Menu is already up to date (" + lang + ")");
        initFilters(root);
        return;
      }

      console.log("🔄 Menu update detected (" + lang + ")");

      var newHTML = buildMenuHTML(groups, lang);
      dynamic.innerHTML = newHTML;
      initFilters(root);
    });
  }

  // ---------- Inicialización ----------
  function init() {
    console.log("🚀 Lavvo menu script loading...");
    fetchCSV(CSV_URL)
      .then(function (rows) {
        console.log("📊 CSV data loaded:", rows.length, "rows");
        var groups = normalizeRows(rows);
        renderAll(groups);
      })
      .catch(function (err) {
        console.error("❌ Error loading menu:", err);
      });
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
