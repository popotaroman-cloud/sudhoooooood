(function () {
  "use strict";

  var nav = document.getElementById("nav");
  var navItems = nav.querySelectorAll(".navi");
  var panels = document.querySelectorAll(".pnl");

  nav.addEventListener("click", function (e) {
    var item = e.target.closest(".navi");
    if (!item) return;
    var key = item.dataset.p;
    navItems.forEach(function (n) { n.classList.toggle("on", n === item); });
    panels.forEach(function (p) { p.classList.toggle("on", p.dataset.p === key); });
  });

  var root = document.documentElement;
  var themeBtn = document.getElementById("theme");
  var themeIcon = themeBtn.querySelector("i");
  function prefersDark() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function isDark() {
    if (root.classList.contains("dark")) return true;
    if (root.classList.contains("light")) return false;
    return prefersDark();
  }
  function syncIcon() { themeIcon.className = isDark() ? "ti ti-sun" : "ti ti-moon"; }
  themeBtn.addEventListener("click", function () {
    var dark = isDark();
    root.classList.remove("dark", "light");
    root.classList.add(dark ? "light" : "dark");
    syncIcon();
  });
  syncIcon();

  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    showToast(btn.dataset.act + " — ตัวอย่าง mockup");
  });

  var catSearch = document.getElementById("catsearch");
  if (catSearch) {
    catSearch.addEventListener("input", function () {
      var q = catSearch.value.toLowerCase();
      document.querySelectorAll("#catlist .cat-row").forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().indexOf(q) > -1 ? "" : "none";
      });
    });
  }

  var DATASETS = {
    staff: {
      cols: ["ชื่อ", "หน่วยงาน", "ตำแหน่ง", "เงินเดือน", "เริ่มงาน"],
      sensitiveCol: 3,
      lineage: "อ่านจาก read model · source: StaffOnboardedEvent (hr) · ล่าสุด 42 วินาทีที่แล้ว",
      rows: [
        ["สมชาย ใจดี", "คณิตศาสตร์", "อาจารย์", "48,500", "2562"],
        ["ปรียา วงศ์ไทย", "การเงิน", "เจ้าหน้าที่", "32,000", "2564"],
        ["มาลี พรหมมา", "บุคคล", "เจ้าหน้าที่", "29,800", "2565"]
      ]
    },
    enroll: {
      cols: ["นักศึกษา", "รหัสวิชา", "หลักสูตร", "สถานะ"],
      sensitiveCol: -1,
      lineage: "อ่านจาก read model · source: EnrollmentConfirmedEvent (academic) · ล่าสุด 3 นาทีที่แล้ว",
      rows: [
        ["มานี ก.", "CS101", "วิทยาการคอมพิวเตอร์", "ลงทะเบียนแล้ว"],
        ["ปกรณ์ ส.", "CS210", "วิทยาการคอมพิวเตอร์", "ลงทะเบียนแล้ว"],
        ["ศิริ ท.", "MA102", "สถิติประยุกต์", "รอชำระเงิน"]
      ]
    },
    budget: {
      cols: ["หน่วยงาน", "ปีงบ", "จัดสรร", "ใช้ไป"],
      sensitiveCol: -1,
      lineage: "อ่านจาก read model · source: BudgetAllocatedEvent (finance) · ล่าสุด 18 วินาทีที่แล้ว",
      rows: [
        ["คณิตศาสตร์", "2569", "1,200,000", "640,000"],
        ["ฟิสิกส์", "2569", "980,000", "410,000"],
        ["สำนักงานคณบดี", "2569", "2,500,000", "1,820,000"]
      ]
    }
  };

  var qDataset = document.getElementById("qdataset");
  var qSens = document.getElementById("qsens");
  var qHead = document.getElementById("qhead");
  var qBody = document.getElementById("qbody");
  var qLineage = document.getElementById("qlineage");

  function renderQuery() {
    if (!qDataset) return;
    var d = DATASETS[qDataset.value];
    var showSens = qSens.checked;
    qHead.innerHTML = "<tr>" + d.cols.map(function (c, i) {
      return "<th>" + c + (i === d.sensitiveCol ? " 🔒" : "") + "</th>";
    }).join("") + "</tr>";
    qBody.innerHTML = d.rows.map(function (r) {
      return "<tr>" + r.map(function (cell, i) {
        if (i === d.sensitiveCol && !showSens) {
          return '<td class="masked">••••••</td>';
        }
        return "<td>" + cell + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var note = d.lineage;
    if (d.sensitiveCol > -1) {
      note += showSens ? " · แสดงข้อมูลอ่อนไหว (role อนุญาต)" : " · ข้อมูลอ่อนไหวถูก mask โดย OPA";
    }
    qLineage.textContent = note;
  }
  if (qDataset) {
    qDataset.addEventListener("change", renderQuery);
    qSens.addEventListener("change", renderQuery);
    renderQuery();
  }

  var VERIFY = {
    "CERT-2569-0142": { status: "valid", label: "ใบรับรองการอบรม", holder: "ศิริ ท.", extra: "ออก 2569 · ลงนามดิจิทัลถูกต้อง" },
    "CARD-2569-3310": { status: "valid", label: "บัตรนักศึกษาดิจิทัล", holder: "มานี ก.", extra: "หน่วยงาน: วิทยาการคอมพิวเตอร์" },
    "CERT-2568-0099": { status: "expired", label: "หนังสือรับรอง", holder: "—", extra: "หมดอายุ 30 ก.ย. 2568" }
  };
  var vBtn = document.getElementById("vbtn");
  var vCode = document.getElementById("vcode");
  var vResult = document.getElementById("vresult");
  function renderVerify() {
    var code = (vCode.value || "").trim().toUpperCase();
    if (!code) { vResult.innerHTML = ""; return; }
    var rec = VERIFY[code];
    if (!rec) {
      vResult.innerHTML = '<div class="vcard dang"><p class="vtitle"><i class="ti ti-circle-x" style="color:var(--text-danger)"></i> ไม่พบ credential</p><p class="r-sub">ไม่มีเลขที่นี้ในระบบ — อาจเป็นเอกสารปลอม</p></div>';
      return;
    }
    if (rec.status === "valid") {
      vResult.innerHTML = '<div class="vcard ok"><p class="vtitle"><i class="ti ti-circle-check" style="color:var(--text-success)"></i> ' + rec.label + ' <span class="tag t-ok">valid</span></p><p class="r-sub">ผู้ถือ: ' + rec.holder + '</p><p class="r-sub">' + rec.extra + '</p></div>';
    } else {
      vResult.innerHTML = '<div class="vcard dang"><p class="vtitle"><i class="ti ti-alert-circle" style="color:var(--text-danger)"></i> ' + rec.label + ' <span class="tag t-dang">' + rec.status + '</span></p><p class="r-sub">' + rec.extra + '</p></div>';
    }
  }
  if (vBtn) {
    vBtn.addEventListener("click", renderVerify);
    vCode.addEventListener("keydown", function (e) { if (e.key === "Enter") renderVerify(); });
  }
})();
