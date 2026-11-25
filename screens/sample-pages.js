/*
  screens/sample-pages.js: reference content for the five portfolio kinds.
  KINDS: the onboarding cards. PROMPTS: three example prompts per kind (the first one builds PAGES[kind]).
  PAGES: what a good AI build looks like for that prompt (same shape as PageData).
  REFERENCE_PAGE: every section type once, used by site-sections.html and lib/site/sample-page.ts.
*/
(function () {
  const im = (id, alt) => ({ src: `/library/${id}.webp`, alt });
  let n = 0; const id = () => "s" + (++n);
  const sec = (type, props) => ({ type, props: { id: id(), ...props } });

  window.KINDS = [
    { key: "designer", label: "Designer", desc: "Product, UX, brand or visual design", icon: "pen-tool" },
    { key: "developer", label: "Developer", desc: "Projects, stack and what you've shipped", icon: "code" },
    { key: "photographer", label: "Photographer", desc: "Galleries, packages and bookings", icon: "camera" },
    { key: "artist", label: "Illustrator or artist", desc: "Your pieces, books and commissions", icon: "palette" },
    { key: "writer", label: "Writer", desc: "Articles, talks, books and newsletters", icon: "book-open", wide: true },
  ];

  window.PROMPTS = {
    designer: [
      "Portfolio for Maya Chen, a product designer in Singapore. Eight years in fintech: lead designer at Tandem since 2023, Grab Financial before that. Case studies: family budgets, card onboarding, savings goals and the Tandem design system. Open to contract work from January. Email maya@chen.design. Quote from Arjun Mehta, Head of Product at Tandem: ‘Maya turned our messiest flow into the one customers mention by name.’",
      "Brand designer in Lisbon who makes identities for restaurants and small hotels. Show five projects and a way to book a call.",
      "UX researcher moving into product design. Three case studies from my bootcamp and my last job in healthcare.",
    ],
    developer: [
      "Frontend developer in Lagos, Sam Okafor. Five years of React and Next.js, open to full-time roles, sam@okafor.dev. Projects: a checkout redesign, offline mode for a banking app, a Lagos transit map and a11y-lint, my accessibility linter. Talks: Shipping for 2G (2025) and Offline first, in practice (2024).",
      "Backend engineer who works on payments infrastructure in Go and Postgres. Open source projects and a link to my GitHub.",
      "iOS developer with two apps on the App Store. Show the apps, what they do and how many people use them.",
    ],
    photographer: [
      "Wedding photographer in Goa, Rhea Kamat. Show my best albums and three packages: full day, half day and printed albums. Booking next season now at hello@rheakamat.com. Add this from Priya and Karan: ‘We cried looking at the album. She caught moments we didn't know happened.’",
      "Food photographer in Melbourne working with restaurants and cookbooks. A big gallery and my rates.",
      "Landscape photographer selling prints. Mountains and coastlines, with print sizes and prices.",
    ],
    artist: [
      "Illustrator in Valencia, Tomás Reyes. I draw children's books and magazine pieces, pencil first, coloured digitally. Recent books: The Night Garden (2025) and the Fox and Kettle series (2024). A gallery and a way to commission me: hola@tomasreyes.art.",
      "Ceramic artist making tableware by hand. Collections, studio visits and stockists.",
      "Tattoo artist with a fine-line style. Flash, healed work and how to book.",
    ],
    writer: [
      "Technology journalist in Berlin, Lena Fischer. I write about labour and privacy for Wired and The Verge. Recent stories: The moderators who train the filters (Wired, 2025) and Inside Europe's fight over chat scanning (The Verge, 2025). Link my newsletter and let people pitch me at lena@fischer.press.",
      "Copywriter for SaaS companies. Before-and-after examples of landing pages I rewrote, and my rates.",
      "Novelist with a debut coming out in spring. The book, events and a newsletter sign-up.",
    ],
  };

  const maya = (all) => ({
    root: { props: { title: "Maya Chen", theme: "paper", font: "sans", favicon: "pen-tool", availability: "Available from January", description: "Maya Chen is a product designer in Singapore who makes fintech apps easier to understand.", showBadge: true } },
    content: [
      sec("Intro", { layout: "statement", headline: "I design money apps people actually understand.", intro: "Product designer with eight years in fintech. I lead design at Tandem in Singapore, and I'm open to contract work from January.", role: "Product designer, Singapore", primaryButton: { label: "Email me", href: "mailto:maya@chen.design" }, image: im("people-01", "Maya Chen, smiling, close up") }),
      sec("Work", { heading: "Selected work", layout: "grid", items: [
        { title: "Family budgets", summary: "Shared spending for households, from the first interviews to launch.", year: "2025", tags: ["Research", "iOS"], image: im("abstract-02", "Geometric shapes on a pink surface") },
        { title: "Card onboarding", summary: "A shorter, calmer way to get a new card set up.", year: "2024", tags: ["Web", "Growth"], image: im("product-04", "A smartphone beside its case") },
        { title: "Savings goals", summary: "Saving toward something, made to feel less like homework.", year: "2023", tags: ["iOS", "Android"], image: im("abstract-01", "A soft gradient of warm colours") },
        { title: "Tandem design system", summary: "Components and guidelines the whole product team shares.", year: "2022", tags: ["Systems"], image: im("abstract-03", "A stack of folded paper in soft light") },
      ] }),
      sec("About", { heading: "About", text: "I've spent eight years making money apps feel calm: fewer screens, plainer words and testing with real people before anything ships.", ...(all ? { more: "This longer paragraph is optional. It shows under the first one in a quieter colour." } : {}), image: im("office-04", "A woman working at a standing desk by a window") }),
      sec("Experience", { heading: "Experience", items: [
        { years: "2023 to now", role: "Lead product designer", company: "Tandem", note: "Card onboarding and savings" },
        { years: "Before 2023", role: "Product designer", company: "Grab Financial", note: "" },
      ] }),
      ...(all ? [
        sec("Services", { heading: "How I can help", items: [
          { title: "Product design", text: "End-to-end flows, from the first sketch to the last edge case." },
          { title: "Design systems", text: "Components, tokens and documentation teams actually use." },
          { title: "Research and testing", text: "Interviews and usability tests with the people you design for." },
        ] }),
        sec("Gallery", { heading: "From the studio", layout: "mosaic", images: [
          { image: im("office-08", "A whiteboard with sticky notes"), caption: "Mapping the card flow, 2024" },
          { image: im("office-07", "Sketching in a notebook with coloured pencils nearby"), caption: "First sketches" },
          { image: im("abstract-09", "A long shadow across white marble"), caption: "Moodboard" },
          { image: im("office-10", "Two people working on laptops in a sunlit office"), caption: "Testing with customers" },
          { image: im("abstract-06", "White buildings against a pale sky"), caption: "Brand study" },
        ] }),
        sec("Writing", { heading: "Writing and talks", items: [
          { title: "Why your onboarding has nine screens", outlet: "UX Collective", year: "2025", link: "https://uxdesign.cc" },
          { title: "Designing for people who hate money apps", outlet: "Talk, Config Asia", year: "2024", link: "https://config.figma.com" },
          { title: "Plain words in finance", outlet: "Newsletter", year: "2023", link: "https://mayachen.substack.com" },
        ] }),
      ] : []),
      sec("Testimonials", { heading: "Kind words", items: [{ quote: "Maya turned our messiest flow into the one customers mention by name.", name: "Arjun Mehta", role: "Head of Product, Tandem" }] }),
      ...(all ? [sec("Details", { items: [
        { label: "Based in", value: "Singapore" }, { label: "Open to", value: "Contract work" },
        { label: "Email", value: "maya@chen.design", link: "mailto:maya@chen.design" }, { label: "Elsewhere", value: "LinkedIn", link: "https://linkedin.com" },
      ] })] : []),
      sec("Contact", { heading: "Contact", email: "maya@chen.design", text: "Working on something people find confusing? Tell me about it.", socials: [{ platform: "linkedin", url: "https://linkedin.com" }] }),
    ],
  });

  window.PAGES = {
    designer: maya(false),
    developer: {
      root: { props: { title: "Sam Okafor", theme: "midnight", font: "mono", favicon: "code", availability: "Open to full-time roles", description: "Sam Okafor is a frontend developer in Lagos with five years of React and Next.js.", showBadge: true } },
      content: [
        sec("Intro", { layout: "statement", headline: "I build fast web apps that work on slow networks.", intro: "Frontend developer in Lagos with five years of React and Next.js. Open to full-time roles.", role: "Frontend developer, Lagos", primaryButton: { label: "Email me", href: "mailto:sam@okafor.dev" }, secondaryButton: { label: "GitHub", href: "https://github.com" } }),
        sec("Work", { heading: "Projects", layout: "list", items: [
          { title: "Checkout redesign", tags: ["Next.js"], image: im("product-04", "A smartphone beside its case") },
          { title: "Offline mode for a banking app", tags: ["PWA"], image: im("office-02", "A laptop and glasses on a wooden desk") },
          { title: "Lagos transit map", tags: ["Maps"], image: im("abstract-04", "Blurred lights at night") },
          { title: "a11y-lint", tags: ["Open source"], image: im("abstract-10", "A close-up of grey fabric texture") },
        ] }),
        sec("Writing", { heading: "Talks", items: [
          { title: "Shipping for 2G", outlet: "Talk", year: "2025" },
          { title: "Offline first, in practice", outlet: "Talk", year: "2024" },
        ] }),
        sec("Services", { heading: "What I work with", items: [
          { title: "React", text: "Five years, from small widgets to whole apps." },
          { title: "Next.js", text: "Server components, routing and caching." },
          { title: "Accessibility", text: "The reason a11y-lint exists." },
          { title: "Performance", text: "Pages that load on a slow connection." },
        ] }),
        sec("Contact", { heading: "Contact", email: "sam@okafor.dev", text: "Hiring for a frontend role? Send me a note.", socials: [{ platform: "github", url: "https://github.com" }, { platform: "linkedin", url: "https://linkedin.com" }] }),
      ],
    },
    photographer: {
      root: { props: { title: "Rhea Kamat", theme: "sunset", font: "serif", favicon: "camera", availability: "Booking next season", description: "Rhea Kamat is a wedding photographer based in Goa.", showBadge: true } },
      content: [
        sec("Intro", { layout: "split", headline: "Wedding photos that feel like the day did.", intro: "I'm a wedding photographer based in Goa, booking next season now.", role: "Wedding photographer, Goa", primaryButton: { label: "Check my dates", href: "mailto:hello@rheakamat.com" }, image: im("people-06", "A bride and groom walking on a hill") }),
        sec("Gallery", { heading: "Albums", layout: "mosaic", images: [
          { image: im("people-06", "A bride and groom walking on a hill"), caption: "Priya and Karan" },
          { image: im("people-03", "Friends around a table with wine glasses"), caption: "The long lunch" },
          { image: im("nature-04", "Waves breaking on a beach"), caption: "Before the ceremony" },
          { image: im("food-10", "Friends gathered around a table for a meal"), caption: "Family dinner" },
          { image: im("people-09", "Three people laughing together at a table"), caption: "Speeches" },
          { image: im("nature-06", "A meadow full of colourful wildflowers"), caption: "Portraits" },
        ] }),
        sec("Services", { heading: "Packages", items: [
          { title: "Full day", text: "From getting ready to the last dance." },
          { title: "Half day", text: "The ceremony and portraits." },
          { title: "Printed albums", text: "Your favourite photos, printed and bound." },
        ] }),
        sec("Testimonials", { heading: "From couples", items: [{ quote: "We cried looking at the album. She caught moments we didn't know happened.", name: "Priya and Karan", role: "" }] }),
        sec("Contact", { heading: "Check my dates", email: "hello@rheakamat.com", text: "Tell me your date and where you're getting married.", socials: [{ platform: "instagram", url: "https://instagram.com" }] }),
      ],
    },
    artist: {
      root: { props: { title: "Tomás Reyes", theme: "forest", font: "serif", favicon: "palette", availability: "Taking commissions", description: "Tomás Reyes draws children's books and magazine pieces in Valencia.", showBadge: true } },
      content: [
        sec("Intro", { layout: "statement", headline: "Pictures for stories that get read twice.", intro: "Illustrator in Valencia drawing children's books and magazine pieces. Pencil first, coloured digitally.", role: "Illustrator, Valencia", primaryButton: { label: "Commission a piece", href: "mailto:hola@tomasreyes.art" } }),
        sec("Gallery", { heading: "Recent pieces", layout: "grid", images: [
          { image: im("office-07", "Sketching in a notebook with coloured pencils nearby"), caption: "Sketchbook" },
          { image: im("abstract-02", "Geometric shapes on a pink surface"), caption: "Cover study" },
          { image: im("abstract-08", "A window of multicoloured glass"), caption: "Night colours" },
          { image: im("nature-06", "A meadow full of colourful wildflowers"), caption: "Field notes" },
          { image: im("abstract-01", "A soft gradient of warm colours"), caption: "Colour tests" },
          { image: im("product-08", "A pile of open paperback books"), caption: "Finished copies" },
        ] }),
        sec("Work", { heading: "Books", layout: "grid", items: [
          { title: "The Night Garden", summary: "Picture book.", year: "2025", tags: ["Picture book"], image: im("abstract-08", "A window of multicoloured glass") },
          { title: "Fox and Kettle", summary: "A series for early readers.", year: "2024", tags: ["Series"], image: im("abstract-01", "A soft gradient of warm colours") },
        ] }),
        sec("About", { heading: "How I work", text: "Every piece starts as a pencil drawing on paper. I colour it digitally, so the files are easy to print." }),
        sec("Contact", { heading: "Commissions", email: "hola@tomasreyes.art", text: "Books, covers and magazine pieces. Tell me about the story.", socials: [{ platform: "instagram", url: "https://instagram.com" }] }),
      ],
    },
    writer: {
      root: { props: { title: "Lena Fischer", theme: "mono", font: "serif", favicon: "book-open", availability: "Open to pitches", description: "Lena Fischer is a technology journalist in Berlin writing about labour and privacy.", showBadge: true } },
      content: [
        sec("Intro", { layout: "statement", headline: "I write about labour, privacy and the software in between.", intro: "Technology journalist in Berlin, writing for Wired and The Verge.", role: "Journalist, Berlin", primaryButton: { label: "Pitch me a story", href: "mailto:lena@fischer.press" }, secondaryButton: { label: "Newsletter", href: "https://substack.com" } }),
        sec("Writing", { heading: "Recent stories", items: [
          { title: "The moderators who train the filters", outlet: "Wired", year: "2025" },
          { title: "Inside Europe's fight over chat scanning", outlet: "The Verge", year: "2025" },
        ] }),
        sec("Details", { items: [{ label: "Based in", value: "Berlin" }, { label: "Writes for", value: "Wired, The Verge" }, { label: "Covers", value: "Labour and privacy" }] }),
        sec("Contact", { heading: "Pitch me", email: "lena@fischer.press", text: "Tips and story ideas welcome.", socials: [{ platform: "substack", url: "https://substack.com" }] }),
      ],
    },
  };
  window.REFERENCE_PAGE = maya(true);
  // A page someone built by hand from a blank start (Add tab, typed their own words). Plain on purpose: this is what Prettify gets.
  window.HAND_BUILT = (function () {
    const m = maya(false);
    m.root.props = { ...m.root.props, theme: "mono", font: "sans", spacing: "compact", favicon: "sparkles" };
    m.content.forEach((s) => {
      delete s.props.image;
      if (s.type === "Intro") { s.props.layout = "statement"; delete s.props.secondaryButton; }
      if (s.type === "Work") { s.props.layout = "list"; s.props.items.forEach((it) => delete it.image); }
    });
    return m;
  })();

})();
