import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PartnerCard, PartnerProfileModal, type Partner } from "./PartnerCard";
import { RevealOnScroll } from "./RevealOnScroll";

export const PartnersSection = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("partners")
      .select("id,name,designation,company,bio,photo_url,company_logo_url,linkedin_url,twitter_url,website_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("[PartnersSection] failed to load partners", error);
          return;
        }
        setPartners((data as Partner[]) || []);
      });
  }, []);

  return (
    <section id="partners" className="py-20 md:py-28 relative overflow-hidden">
      {/* Ambient background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 -left-32 h-96 w-96 rounded-full bg-[hsl(var(--perfy-electric))]/10 blur-3xl" />
        <div className="absolute bottom-10 -right-32 h-96 w-96 rounded-full bg-[hsl(var(--perfy-cyan))]/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 relative">
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-16">
            <span className="text-xs tracking-[0.3em] text-[hsl(var(--perfy-cyan))]">LEADERSHIP & PARTNERS</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold text-white">
              The minds <span className="text-electric">behind PERFY</span>
            </h2>
            <p className="mt-4 text-[hsl(var(--perfy-muted))] max-w-2xl mx-auto">
              A curated ecosystem of operators, strategists, and specialists working in coordination to engineer business performance.
            </p>
          </div>
        </RevealOnScroll>

        {partners.length === 0 ? (
          <div className="text-center text-[hsl(var(--perfy-muted))] py-12">
            Partners will appear here once added in the admin panel.
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-w-6xl mx-auto">
            {partners.map((p, i) => (
              <RevealOnScroll key={p.id} delay={i * 0.06} className="h-full">
                <PartnerCard p={p} onOpen={setActiveId} />
              </RevealOnScroll>
            ))}
          </div>
        )}
      </div>

      <PartnerProfileModal
        partners={partners}
        activeId={activeId}
        onClose={() => setActiveId(null)}
        onNavigate={setActiveId}
      />
    </section>
  );
};
