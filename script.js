/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : แสดงสินค้า + กรองตาม mood
   - order.html   : เติมฟอร์มจาก URL parameter + ส่งออเดอร์ไป Apps Script
   - admin.html   : อ่านออเดอร์จาก Google Sheet (CSV) มาแสดงเป็นตาราง
   ========================================================================== */

var APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz4lhyUMG8MWwZuQHkjl1iLH387n4vKqI2gLpQE649OEwTaFR0UQg10-vWBbEVtCIhN4g/exec";

var SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUE5ZNBYnuZMFcrQkBv5WD1AocK6k2VbK8rPapcdljfsXsKNMdDc6GBU8Ddpqts5HgNEqHVOpIBEHy/pub?gid=0&single=true&output=csv";

var MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" }
];

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function formatPrice(n) {
  return Number(n).toLocaleString("th-TH");
}

function moodLabel(key) {
  for (var i = 0; i < MOODS.length; i++) {
    if (MOODS[i].key === key) return MOODS[i].label;
  }
  return key;
}

/* ชื่อที่ส่งไปหน้า order: ชื่อสินค้า + ไซส์ (ถ้ามี) */
function orderItemName(p) {
  return p.size ? p.name + " " + p.size : p.name;
}

/* --------------------------------------------------------------------------
   1) หน้า product.html
   -------------------------------------------------------------------------- */
function initProductPage() {
  var filterBar = document.getElementById("filter-bar");
  var list = document.getElementById("product-list");
  if (!filterBar || !list) return;

  var products = [];
  var currentMood = "all";

  function isValidMood(key) {
    return MOODS.some(function (m) { return m.key === key; });
  }

  function buildFilterBar() {
    filterBar.innerHTML = "";
    MOODS.forEach(function (m) {
      var btn = el("button", "chip" + (m.key !== "all" ? " mood-" + m.key : ""));
      btn.type = "button";
      btn.setAttribute("data-mood", m.key);
      if (m.key !== "all") btn.appendChild(el("span", "mood-dot"));
      btn.appendChild(el("span", null, m.label));
      btn.addEventListener("click", function () {
        setMood(m.key, true);
      });
      filterBar.appendChild(btn);
    });
  }

  function updateChips() {
    var chips = filterBar.querySelectorAll(".chip");
    for (var i = 0; i < chips.length; i++) {
      var active = chips[i].getAttribute("data-mood") === currentMood;
      chips[i].classList.toggle("is-active", active);
      chips[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function createCard(p) {
    var card = el("article", "card mood-" + p.mood);

    var media = el("div", "card__media");
    var img = el("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    media.appendChild(img);

    var body = el("div", "card__body");
    body.appendChild(el("h3", "card__title", p.name));

    var meta = el("p", "card__meta");
    var dotWrap = el("span", "mood-label");
    dotWrap.appendChild(el("span", "mood-dot"));
    dotWrap.appendChild(el("span", null, moodLabel(p.mood)));
    meta.appendChild(dotWrap);
    meta.appendChild(document.createTextNode("  "));
    meta.appendChild(el("span", null, p.size ? p.size : "โรลออน"));
    body.appendChild(meta);

    var footer = el("div", "card__footer");
    var price = el("span", "price", formatPrice(p.price));
    price.appendChild(el("small", null, "บาท"));

    var buy = el("a", "btn btn--small btn--gold", "สั่งซื้อ");
    buy.href =
      "order.html?item=" + encodeURIComponent(orderItemName(p)) +
      "&price=" + encodeURIComponent(p.price);

    footer.appendChild(price);
    footer.appendChild(buy);
    body.appendChild(footer);

    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  function render() {
    list.innerHTML = "";
    var shown = products.filter(function (p) {
      return currentMood === "all" || p.mood === currentMood;
    });

    if (shown.length === 0) {
      list.appendChild(el("p", "muted", "ไม่พบสินค้าในหมวดนี้"));
      return;
    }
    shown.forEach(function (p) {
      list.appendChild(createCard(p));
    });
  }

  function setMood(key, updateUrl) {
    currentMood = isValidMood(key) ? key : "all";
    updateChips();
    render();

    if (updateUrl && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      if (currentMood === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", currentMood);
      }
      window.history.replaceState(null, "", url.toString());
    }
  }

  buildFilterBar();
  list.appendChild(el("p", "muted", "กำลังโหลดสินค้า..."));

  var initialMood = (new URLSearchParams(window.location.search).get("mood") || "all").toLowerCase();

  fetch("products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      setMood(initialMood, false);
    })
    .catch(function (error) {
      console.error(error);
      list.innerHTML = "";
      list.appendChild(el("p", "form-status form-status--error", "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง"));
    });
}

/* --------------------------------------------------------------------------
   2) หน้า order.html
   -------------------------------------------------------------------------- */
function initOrderPage() {
  var form = document.getElementById("orderForm");
  if (!form) return;

  var itemsInput = document.getElementById("items");
  var totalInput = document.getElementById("total");

  /* เติมค่าจาก URL parameter ทันทีที่โหลดหน้า (ทั้ง items และ total) */
  var params = new URLSearchParams(window.location.search);
  var itemParam = params.get("item");
  var priceParam = params.get("price");

  if (itemsInput && itemParam !== null) itemsInput.value = itemParam;
  if (totalInput && priceParam !== null) totalInput.value = priceParam;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    var payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim()
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* --------------------------------------------------------------------------
   3) หน้า admin.html
   -------------------------------------------------------------------------- */

/* Parser CSV (รองรับ "..." ครอบข้อความ, "" แทน ", คอมมาและขึ้นบรรทัดใหม่ในช่อง, CRLF) */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function initAdminPage() {
  var tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  var COLS = 6;

  function showMessage(text, isError) {
    tbody.innerHTML = "";
    var tr = el("tr");
    var td = el("td", isError ? "form-status--error" : "muted", text);
    td.colSpan = COLS;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage("กำลังโหลดข้อมูล...", false);

  /* พารามิเตอร์ท้าย URL ช่วยเลี่ยงแคชของเบราว์เซอร์ */
  var url = SHEET_CSV_URL + "&_=" + Date.now();

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ""; });
      });

      /* ข้ามแถวหัวตาราง (ถ้ามี): แถวแรกที่ช่องวันเวลาไม่มีตัวเลขเลย */
      if (rows.length > 0 && !/\d/.test(rows[0][0] || "")) {
        rows.shift();
      }

      if (rows.length === 0) {
        showMessage("ยังไม่มีคำสั่งซื้อ", false);
        return;
      }

      /* Apps Script เพิ่มแถวต่อท้ายตามลำดับเวลา จึงกลับลำดับเพื่อให้ล่าสุดขึ้นก่อน */
      rows.reverse();

      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var tr = el("tr");
        for (var c = 0; c < COLS; c++) {
          tr.appendChild(el("td", null, r[c] !== undefined ? r[c] : ""));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage("โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง", true);
    });
}

/* --------------------------------------------------------------------------
   Init — ทำงานเฉพาะหน้าที่มี element ที่เกี่ยวข้อง
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
