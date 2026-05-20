import { useMemo, useState, useEffect, useCallback } from "react";
import { Linkedin, Twitter, Globe, GraduationCap, Briefcase, Sparkles, Building2, BookOpen, Award, X, ChevronLeft, ChevronRight, Calendar, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import perfyLogo from "@/assets/perfy-logo.png";
import finvngsLogo from "@/assets/finvngs-logo.jpeg";

export interface Partner {
  id: string;
  name: string;
  designation: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  company_logo_url?: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
}

const PartnerFallback = ({ id, name, full = false }: { id: string; name: string; full?: boolean }) => (
  <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--perfy-navy))]/60 to-black/60">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--perfy-electric),0.24),transparent_52%)]" />
    <svg viewBox="0 0 200 240" className={`relative z-10 ${full ? "h-4/5 w-4/5" : "h-3/5 w-3/5"} opacity-90`} fill="none" aria-label={`${name} placeholder portrait`} role="img">
      <defs>
        <linearGradient id={`g-${id}-${full ? "f" : "s"}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--perfy-electric))" stopOpacity="0.85" />
          <stop offset="100%" stopColor="hsl(var(--perfy-cyan))" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path d="M20 230 C 30 170, 70 150, 100 150 C 130 150, 170 170, 180 230 Z" fill={`url(#g-${id}-${full ? "f" : "s"})`} opacity="0.9" />
      <circle cx="100" cy="90" r="48" fill={`url(#g-${id}-${full ? "f" : "s"})`} />
      <ellipse cx="85" cy="75" rx="12" ry="8" fill="white" opacity="0.25" />
    </svg>
  </div>
);

// Bio parsing
type Section = { label: string; items: string[] };
type ParsedBio = { quote: string | null; paragraphs: string[]; sections: Section[] };

const SECTION_LABELS = [
  "Qualifications", "Qualification", "Core Skills", "Skills", "Key Skills",
  "Expertise", "Core Expertise", "Areas of Expertise", "Education",
  "Experience", "Specialization", "Specializations", "Certifications", "Achievements",
];

const splitItems = (s: string) =>
  s.split(/\s*(?:[•·;]|·|\u2022|\sand\s|,(?![^()]*\))|\s\|\s|\s\u2014\s)\s*/)
    .map((x) => x.replace(/^[-–—•·]\s*/, "").trim()).filter(Boolean);

const parseBio = (bio: string | null): ParsedBio => {
  if (!bio) return { quote: null, paragraphs: [], sections: [] };
  const blocks = bio.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  let quote: string | null = null;
  const paragraphs: string[] = [];
  const sections: Section[] = [];
  const labelRe = new RegExp(`^(${SECTION_LABELS.join("|")})s?\\s*:\\s*(.+)$`, "is");
  for (const block of blocks) {
    const clean = block.replace(/\s*\n\s*/g, " ").trim();
    if (!quote && /^["“"'][^]*["”"'][.!]?$/.test(clean) && clean.length < 220) {
      quote = clean.replace(/^["“"']|["”"'][.!]?$/g, "").trim();
      continue;
    }
    const m = clean.match(labelRe);
    if (m) {
      sections.push({ label: m[1].replace(/s$/, ""), items: splitItems(m[2].replace(/\.$/, "")) });
      continue;
    }
    const parts = clean.split(new RegExp(`(?=(?:${SECTION_LABELS.join("|")})s?\\s*:)`, "i"));
    if (parts.length > 1) {
      for (const part of parts) {
        const pm = part.match(labelRe);
        if (pm) sections.push({ label: pm[1].replace(/s$/, ""), items: splitItems(pm[2].replace(/\.$/, "")) });
        else if (part.trim()) paragraphs.push(part.trim());
      }
    } else paragraphs.push(clean);
  }
  return { quote, paragraphs, sections };
};

const sectionIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("qualif")) return GraduationCap;
  if (l.includes("educ")) return BookOpen;
  if (l.includes("skill") || l.includes("expert") || l.includes("special")) return Sparkles;
  if (l.includes("cert") || l.includes("achie")) return Award;
  if (l.includes("exper")) return Briefcase;
  return Sparkles;
};

const resolveUrl = (raw: string | null | undefined) => {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${v.replace(/^\/+/, "")}`;
};

const inferCompanyLogos = (companyNames: string[]) => {
  const normalized = companyNames.map((name) => name.toLowerCase());
  const logos: string[] = [];

  if (normalized.some((name) => name.includes("perfy"))) logos.push(perfyLogo);
  if (normalized.some((name) => name.includes("finvng") || name.includes("fin vng") || name.includes("venture capital"))) logos.push(finvngsLogo);

  return logos;
};

export const PartnerCard = ({
  p,
  onOpen,
}: {
  p: Partner;
  onOpen?: (id: string) => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedPhotoUrl = useMemo(() => resolveUrl(p.photo_url), [p.photo_url]);

  const companyNames = useMemo(() => {
    if (!p.company) return [] as string[];
    return p.company.split(/\s*[/,]\s*/).map((s) => s.trim()).filter(Boolean);
  }, [p.company]);

  const logoUrls = useMemo(() => {
    const explicit = p.company_logo_url
      ? p.company_logo_url.split(/[,\n]+/).map((s) => resolveUrl(s)).filter((x): x is string => Boolean(x))
      : [];

    return explicit.length > 0 ? explicit : inferCompanyLogos(companyNames);
  }, [companyNames, p.company_logo_url]);

  const showPhoto = Boolean(resolvedPhotoUrl) && !imageFailed;

  return (
    <article
      onClick={() => onOpen?.(p.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(p.id); } }}
      role="button"
      tabIndex={0}
      aria-label={`View ${p.name} profile`}
      className="group relative flex h-full w-full flex-col cursor-pointer rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0b0710] ring-1 ring-white/10 hover:ring-[hsl(var(--perfy-electric))]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--perfy-cyan))] hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-20px_hsl(var(--perfy-electric)/0.55)] transition-all duration-500"
    >
      {/* Animated border highlight */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
        background: "linear-gradient(135deg, hsl(var(--perfy-electric)/0.25), transparent 40%, hsl(var(--perfy-cyan)/0.25))",
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        padding: 1,
      }} />

      {/* Photo */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#1a0d12] to-black">
        {showPhoto ? (
          <img
            src={resolvedPhotoUrl!}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
            style={{ objectPosition: "center 8%" }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <PartnerFallback id={p.id} name={p.name} />
        )}
        {/* Subtle gradient overlay — only at the very bottom so faces stay clear */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        {/* Hover accent */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-[hsl(var(--perfy-electric))]/10 via-transparent to-[hsl(var(--perfy-cyan))]/10 pointer-events-none" />

        <span className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-white ring-1 ring-white/25 backdrop-blur-md opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          View profile <ChevronRight className="size-3" />
        </span>
      </div>

      {/* Info */}
      <div className="relative flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-3.5 bg-gradient-to-b from-[#1a0a10] to-[#0a0608] border-t border-white/10">
        <h3 className="text-[#ffffff] text-[13px] sm:text-[15px] font-bold font-display-perfy leading-tight line-clamp-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{p.name}</h3>
        {p.designation && (
          <p className="mt-1 text-[9.5px] sm:text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--perfy-electric))] line-clamp-2 leading-snug min-h-[2.2em]">{p.designation}</p>
        )}
        {(companyNames.length > 0 || logoUrls.length > 0) && (
          <div className="mt-auto pt-2.5 flex items-center gap-2 border-t border-white/10">
            <div className="flex shrink-0 items-center -space-x-1">
              {Array.from({ length: Math.min(Math.max(companyNames.length, logoUrls.length, 1), 2) }).map((_, idx) => {
                const url = logoUrls[idx];
                const label = companyNames[idx] || p.name;
                return (
                  <div key={idx} className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-white ring-2 ring-[hsl(var(--perfy-navy))] overflow-hidden shadow-md">
                    {url ? (
                      <img src={url} alt={`${label} logo`} className="h-full w-full object-contain p-0.5" loading="lazy" />
                    ) : (
                      <span className="text-[10px] font-bold text-[hsl(var(--perfy-navy))]">{label.charAt(0)}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="min-w-0 flex-1 truncate text-[10px] sm:text-[11px] font-bold tracking-wide text-[hsl(var(--perfy-cyan))] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {companyNames.length > 1 ? companyNames.join(" · ") : (companyNames[0] || "—")}
            </p>
          </div>
        )}
      </div>
    </article>
  );
};

// =============================================================================
// PROFILE MODAL — premium executive profile experience with nav
// =============================================================================

export const PartnerProfileModal = ({
  partners,
  activeId,
  onClose,
  onNavigate,
}: {
  partners: Partner[];
  activeId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const idx = partners.findIndex((x) => x.id === activeId);
  const open = idx >= 0;
  const p = open ? partners[idx] : null;

  useEffect(() => { setImageFailed(false); }, [activeId]);

  const goPrev = useCallback(() => {
    if (idx < 0) return;
    const next = (idx - 1 + partners.length) % partners.length;
    onNavigate(partners[next].id);
  }, [idx, partners, onNavigate]);

  const goNext = useCallback(() => {
    if (idx < 0) return;
    const next = (idx + 1) % partners.length;
    onNavigate(partners[next].id);
  }, [idx, partners, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  // Swipe nav (mobile)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(dx) > 60) { dx > 0 ? goPrev() : goNext(); }
    setTouchStart(null);
  };

  if (!p) return (
    <Dialog open={false} onOpenChange={() => onClose()}><DialogContent /></Dialog>
  );

  const resolvedPhotoUrl = resolveUrl(p.photo_url);
  const showPhoto = Boolean(resolvedPhotoUrl) && !imageFailed;
  const parsed = parseBio(p.bio);
  const companyNames = p.company ? p.company.split(/\s*[/,]\s*/).map((s) => s.trim()).filter(Boolean) : [];
  const explicitLogoUrls = (p.company_logo_url
    ? p.company_logo_url.split(/[,\n]+/).map((s) => resolveUrl(s)).filter((x): x is string => Boolean(x))
    : []) || [];
  const displayLogoUrls = explicitLogoUrls.length > 0 ? explicitLogoUrls : inferCompanyLogos(companyNames);

  const qualSection = parsed.sections.find((s) => /qualif|educ/i.test(s.label));
  const floatBadges = qualSection?.items.slice(0, 4) || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] h-[95vh] sm:h-[92vh] overflow-hidden border-[hsl(var(--perfy-electric))]/30 bg-[#070410] p-0 text-white backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-[0_40px_120px_-20px_hsl(var(--perfy-electric)/0.5)] [&>button]:hidden flex flex-col"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <VisuallyHidden>
          <DialogTitle>{p.name}</DialogTitle>
          <DialogDescription>{p.designation || "Executive profile"}</DialogDescription>
        </VisuallyHidden>

        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 bg-gradient-to-b from-black/90 to-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--perfy-cyan))]">
            <Sparkles className="size-3.5" />
            <span>Profile · {idx + 1} / {partners.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={goPrev}
              aria-label="Previous profile"
              className="rounded-full p-2 bg-white/5 hover:bg-white/15 text-white/90 ring-1 ring-white/10 transition"
            ><ChevronLeft className="size-4" /></button>
            <button
              onClick={goNext}
              aria-label="Next profile"
              className="rounded-full p-2 bg-white/5 hover:bg-white/15 text-white/90 ring-1 ring-white/10 transition"
            ><ChevronRight className="size-4" /></button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-1 rounded-full p-2 bg-white/5 hover:bg-[hsl(var(--perfy-electric))]/20 text-white ring-1 ring-white/10 transition"
            ><X className="size-4" /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
            {/* LEFT — portrait */}
            <div className="relative w-full bg-gradient-to-br from-[#0a0612] via-[hsl(var(--perfy-navy))]/40 to-black aspect-[4/5] sm:aspect-[5/6] md:aspect-auto md:sticky md:top-[44px] md:self-start md:h-[calc(92vh-44px)] overflow-hidden">
              {/* Animated light */}
              <div aria-hidden className="absolute inset-0 opacity-70 pointer-events-none">
                <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[hsl(var(--perfy-electric))]/30 blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[hsl(var(--perfy-cyan))]/20 blur-3xl animate-pulse [animation-delay:1.5s]" />
              </div>
              {showPhoto ? (
                <img
                  src={resolvedPhotoUrl!}
                  alt={p.name}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <PartnerFallback id={p.id} name={p.name} full />
              )}

              {/* Glass overlay for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/60 pointer-events-none" />

              {/* Floating qualification badges */}
              {floatBadges.length > 0 && (
                <div className="hidden md:flex absolute top-4 left-4 right-4 flex-wrap gap-1.5 z-10">
                  {floatBadges.map((q, i) => (
                    <span key={i} className="rounded-full bg-white/10 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white ring-1 ring-white/20 shadow-md">
                      {q}
                    </span>
                  ))}
                </div>
              )}

              {/* Name overlay (mobile only) */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden z-10">
                <h2 className="text-xl sm:text-2xl font-bold font-display-perfy text-white drop-shadow-lg leading-tight">{p.name}</h2>
                {p.designation && (
                  <p className="mt-1 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--perfy-cyan))] leading-snug">{p.designation}</p>
                )}
              </div>
            </div>

            {/* RIGHT — content */}
            <div className="flex flex-col gap-5 sm:gap-6 p-5 sm:p-7 md:p-8">
              {/* Desktop name block */}
              <div className="hidden md:block">
                <h2 className="text-2xl lg:text-[28px] font-bold font-display-perfy leading-tight">{p.name}</h2>
                {p.designation && (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--perfy-cyan))] leading-relaxed">{p.designation}</p>
                )}
              </div>

              {/* Company */}
              {companyNames.length > 0 && (
                <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-3.5 py-2.5">
                  <div className="flex shrink-0 items-center -space-x-1.5">
                    {(displayLogoUrls.length ? displayLogoUrls : [null]).slice(0, 2).map((url, i) => (
                      <div key={i} className="flex h-8 w-8 items-center justify-center rounded-md bg-white ring-2 ring-[hsl(var(--perfy-navy))] overflow-hidden shadow">
                        {url ? (
                          <img src={url} alt="logo" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <Building2 className="size-4 text-[hsl(var(--perfy-navy))]" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--perfy-cyan))]">Association</p>
                    <p className="text-[13px] font-semibold text-white truncate">{companyNames.join(" · ")}</p>
                  </div>
                </div>
              )}

              {/* Quote */}
              {parsed.quote && (
                <blockquote className="relative rounded-xl border-l-2 border-[hsl(var(--perfy-electric))] bg-gradient-to-r from-[hsl(var(--perfy-electric))]/10 to-transparent px-4 py-3">
                  <p className="text-[13px] sm:text-sm italic leading-relaxed text-white/90">"{parsed.quote}"</p>
                </blockquote>
              )}

              {/* Bio paragraphs as structured bullets */}
              {parsed.paragraphs.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4 text-[hsl(var(--perfy-cyan))]" />
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--perfy-cyan))]">Profile</h3>
                  </div>
                  <ul className="space-y-3">
                    {parsed.paragraphs.map((para, i) => (
                      <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-white/85">
                        <span className="mt-[7px] inline-block size-1.5 shrink-0 rounded-full bg-[hsl(var(--perfy-electric))] shadow-[0_0_10px_hsl(var(--perfy-electric))]" />
                        <span className="min-w-0">{para}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Sections */}
              {parsed.sections.map((sec, i) => {
                const Icon = sectionIcon(sec.label);
                return (
                  <section key={i}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon className="size-4 text-[hsl(var(--perfy-cyan))]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--perfy-cyan))]">{sec.label}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sec.items.map((q, j) => (
                        <span key={j} className="rounded-full border border-[hsl(var(--perfy-electric))]/30 bg-[hsl(var(--perfy-electric))]/10 px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-[hsl(var(--perfy-electric))]/20 transition">
                          {q}
                        </span>
                      ))}
                    </div>
                  </section>
                );
              })}

              {!parsed.paragraphs.length && !parsed.sections.length && !parsed.quote && (
                <p className="text-sm leading-relaxed text-white/80">Strategic partner in the PERFY ecosystem.</p>
              )}

              {/* CTAs */}
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {p.linkedin_url && (
                  <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--perfy-electric))] to-[hsl(var(--perfy-electric))]/80 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_8px_24px_-8px_hsl(var(--perfy-electric))] hover:-translate-y-0.5 transition-all">
                    <UserPlus className="size-4" /> Connect on LinkedIn
                  </a>
                )}
                <a href="#contact" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2.5 text-[12px] font-semibold text-white ring-1 ring-white/15 transition-all">
                  <Calendar className="size-4" /> Schedule Consultation
                </a>
              </div>

              {/* Social */}
              {(p.linkedin_url || p.twitter_url || p.website_url) && (
                <div className="pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap">
                  <Briefcase className="size-4 text-[hsl(var(--perfy-cyan))]" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--perfy-cyan))]">Connect</span>
                  <div className="ml-auto flex gap-2">
                    {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="rounded-full bg-white/5 p-2 text-white/85 hover:text-[hsl(var(--perfy-cyan))] hover:bg-white/10 transition"><Linkedin className="size-4" /></a>}
                    {p.twitter_url && <a href={p.twitter_url} target="_blank" rel="noreferrer" aria-label="Twitter" className="rounded-full bg-white/5 p-2 text-white/85 hover:text-[hsl(var(--perfy-cyan))] hover:bg-white/10 transition"><Twitter className="size-4" /></a>}
                    {p.website_url && <a href={p.website_url} target="_blank" rel="noreferrer" aria-label="Website" className="rounded-full bg-white/5 p-2 text-white/85 hover:text-[hsl(var(--perfy-cyan))] hover:bg-white/10 transition"><Globe className="size-4" /></a>}
                  </div>
                </div>
              )}

              {/* Thumbnail nav */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--perfy-cyan))] mb-2.5">Other leaders</p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                  {partners.map((tp) => {
                    const tUrl = resolveUrl(tp.photo_url);
                    const active = tp.id === p.id;
                    return (
                      <button
                        key={tp.id}
                        onClick={() => onNavigate(tp.id)}
                        aria-label={tp.name}
                        title={tp.name}
                        className={`relative shrink-0 size-12 rounded-full overflow-hidden ring-2 transition-all ${active ? "ring-[hsl(var(--perfy-electric))] scale-110" : "ring-white/15 hover:ring-white/40 opacity-60 hover:opacity-100"}`}
                      >
                        {tUrl ? (
                          <img src={tUrl} alt={tp.name} className="h-full w-full object-cover object-top" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-[hsl(var(--perfy-navy))] text-[11px] font-bold text-white">{tp.name.charAt(0)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
