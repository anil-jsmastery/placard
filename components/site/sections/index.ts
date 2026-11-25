import type { SectionType } from "@/lib/sections/schemas";
import type { SectionProps } from "@/lib/site/types";
import { About } from "./about";
import { Contact } from "./contact";
import { Details } from "./details";
import { Experience } from "./experience";
import { Gallery } from "./gallery";
import { Intro } from "./intro";
import { Services } from "./services";
import { Testimonials } from "./testimonials";
import { Work } from "./work";
import { Writing } from "./writing";

export const SECTION_COMPONENTS: { [T in SectionType]: React.ComponentType<{ props: SectionProps<T>; anchor?: string }> } = {
  Intro, Work, About, Experience, Services, Testimonials, Gallery, Writing, Details, Contact,
};
