import {
  Award, Calendar, Camera, Clock, Code, Coffee, Gauge, Gift, Heart, Leaf, Package, Palette, PenTool,
  Rocket, ShieldCheck, Smile, Sparkles, Star, Truck, Type, Users, Utensils, Wheat, Zap, type LucideIcon,
} from "lucide-react";
import type { FEATURE_ICONS } from "@/lib/sections/schemas";
import type { SectionProps } from "@/lib/site/types";

export const FEATURE_ICON_COMPONENTS: Record<(typeof FEATURE_ICONS)[number], LucideIcon> = {
  sparkles: Sparkles, star: Star, heart: Heart, "shield-check": ShieldCheck, zap: Zap, clock: Clock,
  leaf: Leaf, wheat: Wheat, coffee: Coffee, utensils: Utensils, truck: Truck, package: Package,
  gift: Gift, camera: Camera, palette: Palette, "pen-tool": PenTool, code: Code, rocket: Rocket,
  users: Users, award: Award, calendar: Calendar, smile: Smile, gauge: Gauge, type: Type,
};

export function Features({ heading, columns, items }: SectionProps<"Features">) {
  return (
    <section data-section="Features" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="max-w-2xl text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        <div className={`mt-12 grid gap-6 @2xl:grid-cols-2 ${columns === "4" ? "@5xl:grid-cols-4" : "@5xl:grid-cols-3"}`}>
          {items.map((item, i) => {
            const Icon = FEATURE_ICON_COMPONENTS[item.icon];
            return (
              <div key={i} className="rounded-site border border-site-border bg-site-surface p-6">
                <span className="grid size-10 place-items-center rounded-site bg-site-accent text-site-accent-fg">
                  <Icon className="shrink-0 size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-site-muted">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
