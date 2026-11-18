import { Mail, MapPin, Phone } from "lucide-react";
import type { SOCIAL_PLATFORMS } from "@/lib/sections/schemas";
import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";

const PLATFORM_LABELS: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  instagram: "Instagram", facebook: "Facebook", x: "X", linkedin: "LinkedIn", youtube: "YouTube",
  tiktok: "TikTok", github: "GitHub", whatsapp: "WhatsApp", website: "Website",
};

const textLink = "underline decoration-site-border underline-offset-4 hover:decoration-current";

export function Contact({ heading, email, phone, address, socials }: SectionProps<"Contact">) {
  const hasDetails = address || phone || email || socials.length > 0;
  return (
    <section data-section="Contact" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 @5xl:grid-cols-2">
        <h2 className="text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        {hasDetails && (
          <div className="space-y-5 text-lg">
            {address && (
              <p className="flex items-start gap-3">
                <MapPin className="shrink-0 mt-1 size-5 text-site-muted" aria-hidden="true" />
                {address}
              </p>
            )}
            {phone && (
              <p className="flex items-start gap-3">
                <Phone className="shrink-0 mt-1 size-5 text-site-muted" aria-hidden="true" />
                <SafeLink href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={textLink}>{phone}</SafeLink>
              </p>
            )}
            {email && (
              <p className="flex items-start gap-3">
                <Mail className="shrink-0 mt-1 size-5 text-site-muted" aria-hidden="true" />
                <SafeLink href={`mailto:${email}`} className={`${textLink} [overflow-wrap:anywhere]`}>{email}</SafeLink>
              </p>
            )}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {socials.map((social, i) => (
                  <SafeLink
                    key={i}
                    href={social.url}
                    className="inline-flex h-9 items-center rounded-site border border-site-border bg-site-surface px-4 text-sm font-semibold"
                  >
                    {PLATFORM_LABELS[social.platform]}
                  </SafeLink>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
