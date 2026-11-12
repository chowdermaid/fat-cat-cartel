import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function EventBanner({ label, title, image, headingId, href, actions, className, children }: { label: string; title: string; image: string; headingId?: string; href?: string; actions?: ReactNode; className: string; children?: ReactNode }) {
  return <div className="@container min-w-0">
    <article aria-label={title} className={cn("grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-0.5 rounded-lg px-5 py-4 text-[#191b17] @[600px]:grid-cols-[96px_minmax(0,1fr)] @[850px]:gap-x-6 @[850px]:px-6", className)}>
      <div className="col-span-full flex min-h-7 items-end justify-between gap-4">
        <p className="text-xs leading-none font-extrabold tracking-[0.2em] uppercase opacity-75">{label}</p>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <img src={image} alt="" className={cn("size-16 object-contain @[600px]:size-24", children && "@[600px]:row-span-2")} />
      <h3 id={headingId} className="min-w-0 font-serif text-3xl leading-tight font-black @[850px]:text-4xl">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-sm underline decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring">{title}<ExternalLink aria-hidden="true" className="ml-1.5 inline size-4 align-baseline" /></a> : title}</h3>
      {children && <div className="col-span-2 min-w-0 space-y-3 @[600px]:col-span-1 @[600px]:col-start-2">{children}</div>}
    </article>
  </div>;
}
