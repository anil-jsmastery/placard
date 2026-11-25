// What an agent sees: the page as text, with a numbered list of the things it can use.
// Numbers are stamped on the elements as data-swarm="<generation>:<number>", so an action always hits the element the
// agent saw; if the page changed in between, the old number no longer matches anything and the action fails cleanly.
//
// Rules learned the hard way:
// - Password fields show "(filled)" or "(empty)", never their value: an agent that sees a blank password types it again.
// - An element whose centre is visibly covered by something else (a drawer, a dialog, a popover) isn't offered.
//   Elements scrolled out of view, in the window or inside a scrolling panel, are offered: clicking scrolls to them.
// - A hidden radio or checkbox inside a styled label is offered as its label.
// - Inside frames (the editor's canvas, payment fields) only form fields and buttons are offered, not links:
//   links on the editor's canvas don't go anywhere.
const MAX_ITEMS = 150;
const MAX_TEXT = 3500;

function collect({ gen, start, main, max }) {
  const doc = document;
  doc.querySelectorAll("[data-swarm]").forEach((e) => e.removeAttribute("data-swarm"));
  const clean = (s, n = 80) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);
  // page text keeps its line breaks, so headings, paragraphs and buttons don't run together
  const block = (s, n) => (s || "").replace(/[ \t\u00a0]+/g, " ").replace(/ *\n\s*/g, "\n").trim().slice(0, n);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const SELECTOR = main
    ? "a[href], button, input:not([type=hidden]), textarea, select, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], [role=switch], [role=checkbox], [role=radio], [role=combobox], [contenteditable=''], [contenteditable=true]"
    : "button, input:not([type=hidden]), textarea, select, [role=button], [role=option], [role=switch], [role=checkbox], [role=radio], [role=combobox]";

  const hiddenByStyle = (el) => {
    for (let e = el; e && e !== doc.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === "none" || s.visibility === "hidden" || s.visibility === "collapse" || Number(s.opacity) === 0) return true;
    }
    return false;
  };
  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  };
  // outside the window, or outside the visible part of a scrolling panel: not covered, just scrolled away
  const scrolledAway = (el) => {
    const { x, y } = centre(el);
    if (x < 0 || y < 0 || x >= vw || y >= vh) return true;
    for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) {
        const b = a.getBoundingClientRect();
        if (x < b.left || x > b.right || y < b.top || y > b.bottom) return true;
      }
    }
    return false;
  };
  const covered = (el) => {
    if (scrolledAway(el)) return false;
    const { x, y } = centre(el);
    const top = doc.elementFromPoint(x, y);
    if (!top) return false;
    if (el === top || el.contains(top) || top.contains(el)) return false;
    if (el.labels && [...el.labels].some((l) => l === top || l.contains(top))) return false;
    return true;
  };
  const labelOf = (el) => {
    let t = el.getAttribute("aria-label") || "";
    const by = el.getAttribute("aria-labelledby");
    if (!t && by) t = by.split(/\s+/).map((id) => doc.getElementById(id)?.innerText || "").join(" ");
    if (!t && el.labels && el.labels.length) t = [...el.labels].map((l) => l.innerText).join(" ");
    if (!t && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) t = el.getAttribute("placeholder") || el.getAttribute("name") || "";
    if (!t) t = el.innerText || el.getAttribute("title") || el.getAttribute("alt") || el.querySelector?.("img[alt]")?.getAttribute("alt") || "";
    if (!t && el.tagName === "A") t = el.getAttribute("href") || "";
    return clean(t);
  };
  const stateOf = (el) => {
    const bits = [];
    if (el.disabled || el.getAttribute("aria-disabled") === "true") bits.push("disabled");
    if (el.getAttribute("aria-checked") === "true" || el.checked) bits.push("checked");
    if (el.getAttribute("aria-selected") === "true") bits.push("selected");
    if (el.getAttribute("aria-pressed") === "true") bits.push("pressed");
    if (el.getAttribute("aria-expanded") === "true") bits.push("open");
    return bits.length ? ` (${bits.join(", ")})` : "";
  };
  const describe = (el, target) => {
    const tag = el.tagName;
    const role = el.getAttribute("role");
    const type = (el.getAttribute("type") || "").toLowerCase();
    const label = labelOf(target === el ? el : target);
    if (tag === "INPUT" && (type === "checkbox" || type === "radio")) return `${type} "${label}"${stateOf(el)}`;
    if (tag === "INPUT" && type === "password") return `password field "${label}": ${el.value ? "(filled)" : "(empty)"}${stateOf(el)}`;
    if (tag === "INPUT" && /^(submit|button|reset)$/.test(type)) return `button "${clean(el.value || label)}"${stateOf(el)}`;
    if (tag === "INPUT") return `text field "${label}"${type && type !== "text" ? ` (${type})` : ""}: ${el.value ? `"${clean(el.value, 60)}"` : "(empty)"}${stateOf(el)}`;
    if (tag === "TEXTAREA") return `text box "${label}": ${el.value ? `"${clean(el.value, 60)}"` : "(empty)"}${stateOf(el)}`;
    if (tag === "SELECT") {
      const opts = [...el.options].slice(0, 10).map((o) => clean(o.text, 30));
      return `dropdown "${label}": "${clean(el.selectedOptions[0]?.text, 40)}" (options: ${opts.join(" | ")})${stateOf(el)}`;
    }
    if (el.isContentEditable && !role) return `editable text: "${clean(el.innerText, 60)}"`;
    if (tag === "SUMMARY") return `expandable "${label}"${el.parentElement?.open ? " (open)" : ""}`;
    if (tag === "A" || role === "link") {
      let where = "";
      try {
        const u = new URL(el.href, location.href);
        if (u.host !== location.host) where = ` (goes to ${u.host})`;
      } catch {}
      return `link "${label}"${where}`;
    }
    if (role === "tab") return `tab "${label}"${stateOf(el)}`;
    if (role === "option" || role === "menuitemradio") return `option "${label}"${stateOf(el)}`;
    if (role === "menuitem" || role === "menuitemcheckbox") return `menu item "${label}"${stateOf(el)}`;
    if (role === "switch" || role === "checkbox" || role === "radio") return `${role} "${label}"${stateOf(el)}`;
    if (role === "combobox") return `dropdown "${label}"${stateOf(el)}`;
    return `button "${label}"${stateOf(el)}`;
  };

  const items = [];
  const taken = [];
  let n = start;
  for (const el of doc.querySelectorAll(SELECTOR)) {
    if (items.length + start >= max) break;
    if (el.closest("[aria-hidden='true'], [inert]")) continue;
    if (taken.some((t) => t.contains(el))) continue;
    let target = el;
    const type = (el.getAttribute("type") || "").toLowerCase();
    const { w, h } = centre(el);
    if (el.tagName === "INPUT" && (type === "radio" || type === "checkbox") && (hiddenByStyle(el) || w < 4 || h < 4)) {
      target = el.closest("label") || (el.id && doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || null;
      if (!target) continue;
    }
    const box = centre(target);
    if (box.w < 2 || box.h < 2 || hiddenByStyle(target) || covered(target)) continue;
    const line = describe(el, target);
    if (/""/.test(line) && !/field|box|dropdown/.test(line)) continue; // an unnamed icon with nothing to say
    n += 1;
    target.setAttribute("data-swarm", `${gen}:${n}`);
    taken.push(target);
    items.push({ n, line: `[${n}] ${line}`, kind: el.tagName === "INPUT" ? type || "text" : el.tagName.toLowerCase(), password: type === "password" });
  }

  const notices = [];
  for (const d of doc.querySelectorAll("[role=dialog], [role=alertdialog], dialog[open]")) {
    if (!hiddenByStyle(d)) notices.push(`Dialog: ${block(d.innerText, 400).replace(/\n/g, " · ")}`);
  }
  for (const t of doc.querySelectorAll("[data-sonner-toast], [role=status], [role=alert]")) {
    const s = block(t.innerText, 200).replace(/\n/g, " · ");
    if (s && !hiddenByStyle(t)) notices.push(`Notice: ${s}`);
  }
  const body = block(doc.body?.innerText, main ? 2400 : 1200);
  return { items, text: [...notices, body].filter(Boolean).join("\n") };
}

export async function observe(page, gen) {
  const mainFrame = page.mainFrame();
  const frames = [mainFrame, ...page.frames().filter((f) => f !== mainFrame && !f.isDetached())];
  const lines = [];
  const byId = new Map();
  const texts = [];
  let n = 0;
  for (const frame of frames) {
    let r;
    try {
      r = await frame.evaluate(collect, { gen, start: n, main: frame === mainFrame, max: MAX_ITEMS });
    } catch {
      continue; // a frame that went away or can't be read (about:blank, navigating)
    }
    for (const it of r.items) {
      n = it.n;
      byId.set(it.n, { frame, ...it });
      lines.push(it.line);
    }
    if (r.text && frame !== mainFrame) texts.push(`Inside a frame on the page: ${r.text}`);
    else if (r.text) texts.unshift(r.text);
  }
  let title = "";
  try {
    title = await page.title();
  } catch {}
  return { gen, url: page.url(), title, text: texts.join("\n").slice(0, MAX_TEXT), lines, byId };
}
