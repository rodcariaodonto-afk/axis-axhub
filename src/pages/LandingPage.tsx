import { useEffect } from "react";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import ModulesSection from "@/components/landing/ModulesSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import PlansSection from "@/components/landing/PlansSection";
import ContactSection from "@/components/landing/ContactSection";
import LandingFooter from "@/components/landing/LandingFooter";
import WhatsAppFAB from "@/components/landing/WhatsAppFAB";

export default function LandingPage() {
  useEffect(() => {
    document.title = "AXIS — CRM + ERP + Governança com IA para PMEs";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute(
      "content",
      "Plataforma B2B de CRM, ERP, WhatsApp, automações e BI com governança e IA nativa para PMEs venderem e operarem com previsibilidade."
    );
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F172A]" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <main>
        <LandingHero />
        <ModulesSection />
        <BenefitsSection />
        <PlansSection />
        <ContactSection />
      </main>
      <LandingFooter />
      <WhatsAppFAB />
    </div>
  );
}
