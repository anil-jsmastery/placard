/*
  screens/site-render.js: the reference markup for every portfolio section.
  renderSite(page, opts) turns a page object (the same shape as PageData in lib/site/types.ts)
  into the HTML that components/site/sections/*.tsx must produce, class for class.
  Used by site-sections.html and placard-app.html. Styles: site.css.
*/
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IMG_BASE = (window.SITE_IMG_BASE ?? "../public");
  const img = (im, cls = "") => im ? `<div class="pf-img ${cls}"><img src="${IMG_BASE}${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy"></div>` : "";
  const ph = (cls = "") => `<div class="pf-img pf-ph ${cls}" aria-hidden="true"></div>`;
  const two = (n) => String(n).padStart(2, "0");
  const arrow = '<span class="pf-arrow" aria-hidden="true">↗</span>';
  const a = (href, inner, cls = "") => href ? `<a class="${cls}" href="${esc(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>` : `<span class="${cls}">${inner}</span>`;
  const head = (h, n) => `<div class="pf-head-row"><h2 class="pf-h pf-h2">${esc(h)}</h2>${n != null ? `<span class="pf-label">(${two(n)})</span>` : ""}</div>`;
  const SOCIAL = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", github: "GitHub", dribbble: "Dribbble", behance: "Behance", youtube: "YouTube", substack: "Substack", website: "Website" };

  const S = {
    Intro: (p, root) => {
      const btns = (p.primaryButton ? a(p.primaryButton.href, `${esc(p.primaryButton.label)} ${arrow}`, "pf-btn") : "")
        + (p.secondaryButton ? a(p.secondaryButton.href, `${esc(p.secondaryButton.label)} ${arrow}`, "pf-link") : "");
      const under = `<div class="pf-under"><p>${esc(p.intro)}</p><div class="pf-meta">${p.role ? `<span class="pf-label">${esc(p.role)}</span>` : ""}${btns ? `<div class="pf-acts">${btns}</div>` : ""}</div></div>`;
      const split = p.layout === "split" && p.image;
      return `<section class="pf-sec pf-intro" data-layout="${split ? "split" : "statement"}"><div><h1>${esc(p.headline)}</h1>${under}</div>${split ? img(p.image) : ""}</section>`;
    },
    Work: (p) => {
      const items = p.items || [];
      const body = p.layout === "list"
        ? `<div class="pf-work-list">${items.map((it, i) => a(it.link, `<span class="pf-label">${two(i + 1)}</span><span class="pf-h">${esc(it.title)}</span><span class="pf-cat">${esc((it.tags || [])[0] || it.year || "")}</span>${it.image ? img(it.image, "pf-thumb") : "<span></span>"}`, "pf-row")).join("")}</div>`
        : `<div class="pf-work-grid">${items.map((it) => `<article class="pf-card">${a(it.link, `${img(it.image) || ph()}<div class="pf-card-top"><h3 class="pf-h pf-h3">${esc(it.title)}</h3>${it.year ? `<span class="pf-label">${esc(it.year)}</span>` : ""}</div>`)}${it.summary ? `<p>${esc(it.summary)}</p>` : ""}${(it.tags || []).length ? `<div class="pf-tags">${it.tags.map((t) => `<span class="pf-tag">${esc(t)}</span>`).join("")}</div>` : ""}</article>`).join("")}</div>`;
      return `<section class="pf-sec pf-work">${head(p.heading, items.length)}${body}</section>`;
    },
    About: (p) => `<section class="pf-sec pf-about"><span class="pf-label">${esc(p.heading)}</span><div><p class="pf-body">${esc(p.text)}</p>${p.more ? `<p>${esc(p.more)}</p>` : ""}${img(p.image)}</div></section>`,
    Experience: (p) => `<section class="pf-sec pf-exp">${head(p.heading)}${(p.items || []).map((it) => `<div class="pf-xrow"><span class="pf-label">${esc(it.years)}</span><span><b>${esc(it.role)}</b>, ${esc(it.company)}</span><span>${esc(it.note || "")}</span></div>`).join("")}</section>`,
    Services: (p) => `<section class="pf-sec">${head(p.heading)}<div class="pf-svc" data-cols="${(p.items || []).length >= 4 ? 4 : 3}">${(p.items || []).map((it, i) => `<div><span class="pf-label">${two(i + 1)}</span><h3 class="pf-h pf-h3">${esc(it.title)}</h3>${it.text ? `<p>${esc(it.text)}</p>` : ""}</div>`).join("")}</div></section>`,
    Testimonials: (p) => `<section class="pf-sec">${head(p.heading)}<div class="pf-quotes" data-count="${Math.min(3, (p.items || []).length)}">${(p.items || []).map((q) => `<figure class="pf-quote"><blockquote>${esc(q.quote)}</blockquote><figcaption>${esc(q.name)}${q.role ? `<span>, ${esc(q.role)}</span>` : ""}</figcaption></figure>`).join("")}</div></section>`,
    Gallery: (p) => `<section class="pf-sec">${p.heading ? head(p.heading, (p.images || []).length) : ""}<div class="pf-gal" data-layout="${p.layout === "mosaic" ? "mosaic" : "grid"}">${(p.images || []).map((g) => `<figure>${img(g.image) || ph()}${g.caption ? `<figcaption class="pf-label">${esc(g.caption)}</figcaption>` : ""}</figure>`).join("")}</div></section>`,
    Writing: (p) => `<section class="pf-sec">${head(p.heading, (p.items || []).length)}<div class="pf-writing">${(p.items || []).map((it) => a(it.link, `<span class="pf-h pf-h3">${esc(it.title)}</span><span class="pf-mute">${esc(it.outlet)}</span><span class="pf-label">${esc(it.year || "")}</span>${it.link ? arrow : "<span></span>"}`, "pf-wrow")).join("")}</div></section>`,
    Details: (p) => `<section class="pf-sec"><div class="pf-details" data-count="${(p.items || []).length === 3 ? 3 : 4}">${(p.items || []).map((d) => `<div><span class="pf-label">${esc(d.label)}</span>${a(d.link, esc(d.value))}</div>`).join("")}</div></section>`,
    Contact: (p) => `<section class="pf-sec pf-contact"><span class="pf-label">${esc(p.heading)}</span><div style="margin-top:14px">${a("mailto:" + p.email, esc(p.email), "pf-big")}</div>${p.text ? `<p>${esc(p.text)}</p>` : ""}${(p.socials || []).length ? `<div class="pf-socials">${p.socials.map((s) => a(s.url, `${SOCIAL[s.platform] || s.platform} ${arrow}`)).join("")}</div>` : ""}</section>`,
  };
  const NAV_LINK = { Work: "Work", About: "About", Writing: "Writing", Gallery: "Work", Contact: "Contact" };

  window.SECTION_RENDERERS = S;
  // Sets the theme, heading font and spacing on the .site element, then renders into it.
  window.mountSite = function (el, page, opts = {}) {
    const r = page.root.props;
    el.classList.add("site");
    el.dataset.theme = r.theme || "paper"; el.dataset.font = r.font || "sans"; el.dataset.spacing = r.spacing || "relaxed";
    el.innerHTML = window.renderSite(page, opts);
    return el;
  };
  window.renderSite = function (page, opts = {}) {
    const r = page.root.props, content = (page.content || []).filter((s) => !s.props.hidden);
    const links = [...new Set(content.map((s) => NAV_LINK[s.type]).filter(Boolean))].slice(0, 3);
    const wrap = (s, inner) => opts.editor ? `<div class="pf-block" data-sec="${esc(s.props.id)}" data-type="${s.type}">${inner}</div>` : inner;
    const nav = `<nav class="pf-nav" ${opts.editor ? 'data-sec="nav"' : ""}><span class="pf-name">${esc(r.title)}</span>${links.length ? `<span class="pf-links">${links.map((l) => `<a href="#">${l}</a>`).join("")}</span>` : ""}${r.availability ? `<span class="pf-avail"><span class="pf-dot"></span>${esc(r.availability)}</span>` : ""}</nav>`;
    const body = content.length ? content.map((s) => wrap(s, S[s.type](s.props, r))).join("")
      : (opts.editor ? `<div class="pf-empty"><div><b>Your page is empty</b>Add sections from the Add tab, then press Prettify to style it.</div></div>` : "");
    const foot = `<footer class="pf-foot" ${opts.editor ? 'data-sec="footer"' : ""}><span>© ${new Date().getFullYear()} ${esc(r.title)}</span>${r.showBadge !== false ? '<a class="pf-badge" href="#"><i></i>Made with Placard</a>' : ""}</footer>`;
    return nav + body + foot;
  };
})();
