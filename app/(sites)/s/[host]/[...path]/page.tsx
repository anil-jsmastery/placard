import { notFound } from "next/navigation";

/** Any path below a site (the proxy sends site-host paths other than `/` to `/s/_/not-found`): the site 404. */
export default function SitePathNotFound() {
  notFound();
}
