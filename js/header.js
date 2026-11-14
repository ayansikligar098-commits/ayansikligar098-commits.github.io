// Shared site header: brand, tools navigation, Download App button
// (Note 3 — link + version read live from settings/config) and the
// account chip (login state + premium badge, same data as the app).
import {
  auth, onAuthStateChanged, signOut, loadConfig, loadProfile, isPremium, esc
} from "./fb.js";

const NAV = [
  ["/", "🏠 Home"],
  ["/tools.html", "🧰 All Tools"],
  ["/spin.html", "🎡 Spin & Earn", "New"],
  ["/bonus.html", "🎁 Bonus Code"],
  ["/premium.html", "👑 Premium"],
  ["/invite.html", "🤝 Invite & Earn"],
  ["/settings.html", "⚙️ Settings"],
  ["/support.html", "💬 Support"]
];

export function renderHeader(activePath) {
  const host = document.getElementById("siteHeader");
  if (!host) return;
  const path = activePath || location.pathname;
  host.innerHTML = `
  <header class="site-header">
    <a class="brand" href="/"><span class="mark">▦</span> Link To QR</a>
    <nav class="site-nav">
      ${NAV.map(([href, label, badge]) =>
        `<a href="${href}" class="${path === href ? "on" : ""}">${label}${badge ? `<span class="nav-badge">${badge}</span>` : ""}</a>`).join("")}
    </nav>
    <div class="side-prem">
      <div class="sp-t">👑 Go Premium</div>
      <p>Saare tools unlimited, bina kisi limit ke</p>
      <a class="btn" href="/premium.html">Upgrade Now</a>
    </div>
    <div class="site-head-right">
      <a class="btn" id="dlAppBtn" href="#" style="display:none">⬇ Download App <span class="ver" id="dlVer"></span></a>
      <span class="acct-chip" id="acctChip"><a class="btn ghost" href="/login.html">Login</a></span>
    </div>
  </header>`;

  // Download App button: live from settings/config (apkUrl +
  // latestVersionName) — the same fields the Admin app edits and the
  // Android in-app update check reads. Hidden until a URL exists.
  loadConfig().then(cfg => {
    const url = (cfg.apkUrl || "").trim();
    if (!url) return;
    const btn = document.getElementById("dlAppBtn");
    const ver = document.getElementById("dlVer");
    if (!btn) return;
    btn.href = url;
    btn.style.display = "";
    if (cfg.latestVersionName) ver.textContent = "v" + String(cfg.latestVersionName).replace(/^v/i, "");
  });

  onAuthStateChanged(auth, async (user) => {
    const chip = document.getElementById("acctChip");
    if (!chip) return;
    if (!user) {
      chip.innerHTML = `<a class="btn ghost" href="/login.html">Login</a>`;
      return;
    }
    const profile = await loadProfile(user.uid);
    const prem = isPremium(profile);
    const name = user.displayName || user.email || "Account";
    chip.innerHTML = `
      ${prem ? '<span class="prem-badge">PREMIUM</span>' : ""}
      <b title="${esc(user.email || "")}">${esc(name)}</b>
      <a class="btn ghost" href="/premium.html">My Premium</a>
      <button class="btn ghost" id="logoutBtn" type="button">Logout</button>`;
    const lb = document.getElementById("logoutBtn");
    if (lb) lb.addEventListener("click", async () => { await signOut(auth); location.href = "/"; });
  });
}

renderHeader();
