import { getImageById } from "../images/library";
import type { PageData } from "./types";

const img = (id: string) => {
  const image = getImageById(id);
  if (!image) throw new Error(`Unknown library image ${id}`);
  return { src: image.src, alt: image.alt };
};

const PHONE_HREF = "tel:+97715550142";
const EMAIL = "hello@emberandrye.example";

/** Ember & Rye, the page from screens/site-sections.html: all 11 sections in the reference order. */
export const SAMPLE_PAGE: PageData = {
  root: {
    props: {
      title: "Ember & Rye",
      theme: "sunset",
      font: "serif",
      favicon: "✨",
      description: "Sourdough baked at dawn in Patan.",
      showBadge: true,
    },
  },
  content: [
    {
      type: "Hero",
      props: {
        id: "Hero-ember-rye",
        headline: "Sourdough baked at dawn in Patan",
        subheadline: "Slow-fermented loaves, cardamom buns and a weekend brunch worth waking up for.",
        primaryButton: { label: "See the menu", href: "https://emberandrye.example/menu" },
        secondaryButton: { label: "Find us", href: "https://maps.google.com/?q=Mangal+Bazaar+Patan" },
        image: img("food-01"),
        layout: "split",
      },
    },
    {
      type: "About",
      props: {
        id: "About-ember-rye",
        heading: "Baked by two friends who missed real bread",
        text: "Ember & Rye started in a home kitchen in 2021. Today we bake every loaf by hand from local flour, a five-year-old starter and a lot of patience. Come early: the cardamom buns are usually gone by ten.",
        image: img("people-07"),
      },
    },
    {
      type: "Features",
      props: {
        id: "Features-ember-rye",
        heading: "Why people come back",
        columns: "3",
        items: [
          { icon: "wheat", title: "48-hour dough", text: "Long, slow fermentation for a crackly crust and an open, tangy crumb." },
          { icon: "leaf", title: "Local flour", text: "Stone-milled wheat and rye from farms in the valley, delivered every week." },
          { icon: "clock", title: "Fresh at 7 am", text: "The first loaves come out of the oven as we open the doors." },
        ],
      },
    },
    {
      type: "Services",
      props: {
        id: "Services-ember-rye",
        heading: "On the counter",
        items: [
          { title: "Country sourdough", text: "Our everyday loaf. Wheat, a little rye, water, salt.", price: "Rs 450" },
          { title: "Cardamom buns", text: "Box of four, rolled with brown butter and fresh cardamom.", price: "Rs 380" },
          { title: "Weekend brunch plate", text: "Saturday and Sunday, 8 am to 1 pm. Eggs, greens, toast and coffee.", price: "Rs 950" },
          { title: "Celebration cakes", text: "Order three days ahead. Chocolate rye, lemon and seasonal fruit.", price: "from Rs 2,400" },
        ],
      },
    },
    {
      type: "Gallery",
      props: {
        id: "Gallery-ember-rye",
        heading: "From the oven",
        images: [
          { image: img("food-01"), caption: "Morning loaves" },
          { image: img("food-02"), caption: "Cardamom buns" },
          { image: img("office-05"), caption: "The counter" },
          { image: img("food-07"), caption: "Weekend brunch" },
          { image: img("people-08"), caption: "Shaping at 4 am" },
          { image: img("food-08"), caption: "Chocolate rye cake" },
        ],
      },
    },
    {
      type: "Testimonials",
      props: {
        id: "Testimonials-ember-rye",
        heading: "What regulars say",
        items: [
          { quote: "The best bread in the valley. I plan my Saturday around the brunch plate.", name: "Sita Maharjan", role: "Regular since 2022" },
          { quote: "They made our wedding cake on four days’ notice and it was perfect.", name: "Rohan Karki", role: "Cake customer" },
          { quote: "Our office orders the bread box every Monday. Nobody skips breakfast now.", name: "Anita Thapa", role: "Office manager" },
        ],
      },
    },
    {
      type: "Pricing",
      props: {
        id: "Pricing-ember-rye",
        heading: "Join the bread club",
        plans: [
          {
            name: "Weekly loaf",
            price: "Rs 1,600",
            period: "/ month",
            features: ["One loaf a week", "Pick up any day"],
            button: { label: "Join", href: `mailto:${EMAIL}` },
            highlighted: false,
          },
          {
            name: "Family box",
            price: "Rs 3,200",
            period: "/ month",
            features: ["Two loaves and a box of buns a week", "Free delivery in Patan", "10% off cakes"],
            button: { label: "Join", href: `mailto:${EMAIL}` },
            highlighted: true,
          },
          {
            name: "Office box",
            price: "Rs 6,500",
            period: "/ month",
            features: ["Bread and pastries for 15 people", "Monday delivery"],
            button: { label: "Join", href: `mailto:${EMAIL}` },
            highlighted: false,
          },
        ],
      },
    },
    {
      type: "FAQ",
      props: {
        id: "FAQ-ember-rye",
        heading: "Questions",
        items: [
          { question: "Do you have gluten-free bread?", answer: "Not yet. Our kitchen handles a lot of wheat flour, so we can’t promise anything is gluten-free." },
          { question: "Can I order ahead?", answer: "Yes. Call before 5 pm and we’ll hold your order for the next morning." },
          { question: "Do you deliver?", answer: "Bread club members in Patan get free delivery. Everyone else can pick up at the shop." },
        ],
      },
    },
    {
      type: "CallToAction",
      props: {
        id: "CallToAction-ember-rye",
        heading: "Pre-order for the weekend",
        text: "Weekend loaves sell out by nine. Reserve yours by Friday evening.",
        button: { label: "Call to order", href: PHONE_HREF },
      },
    },
    {
      type: "Contact",
      props: {
        id: "Contact-ember-rye",
        heading: "Visit us",
        email: EMAIL,
        phone: "+977 1-555-0142",
        address: "Mangal Bazaar, Patan, Lalitpur",
        socials: [
          { platform: "instagram", url: "https://instagram.com/emberandrye" },
          { platform: "facebook", url: "https://facebook.com/emberandrye" },
        ],
      },
    },
    {
      type: "Links",
      props: {
        id: "Links-ember-rye",
        items: [
          { label: "Order on WhatsApp", href: "https://wa.me/97715550142" },
          { label: "Follow on Instagram", href: "https://instagram.com/emberandrye" },
          { label: "Directions on Google Maps", href: "https://maps.google.com/?q=Mangal+Bazaar+Patan" },
        ],
      },
    },
  ],
  zones: {},
};
