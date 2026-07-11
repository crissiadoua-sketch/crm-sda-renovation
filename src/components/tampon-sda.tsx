import { COMPANY } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";

interface TamponSDAProps {
  className?: string;
  compact?: boolean;
}

export async function TamponSDA({ className = "", compact = false }: TamponSDAProps) {
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-lg border border-[#1E2F6E]/20 overflow-hidden shadow-sm ${className}`}>
        {/* Logo panel */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#F7941E] to-[#E6471D] px-2 py-1.5 self-stretch">
          <span className="text-white font-black text-base leading-none">S</span>
          <span className="text-white font-black text-[8px] leading-tight tracking-widest mt-0.5">RÉN.</span>
        </div>
        {/* Info panel */}
        <div className="pr-3 py-1.5">
          <p className="font-black text-[#1E2F6E] text-xs leading-tight">SDA RÉNOVATION</p>
          <p className="text-[9px] text-slate-500 leading-tight">{COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
          <p className="text-[9px] text-slate-500 leading-tight">{COMPANY.telephone}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex rounded-xl border border-[#1E2F6E]/20 overflow-hidden shadow-md ${className}`} style={{ minWidth: 340 }}>
      {/* Panneau gauche — identité visuelle */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#1976D2] to-[#1B3F94] px-5 py-4 gap-2">
        {/* Logo SDA */}
        <div
          className="flex items-end justify-center gap-0 leading-none select-none"
          style={{ fontFamily: "sans-serif" }}
        >
          <span
            className="font-black"
            style={{
              fontSize: 32,
              background: "linear-gradient(135deg, #F7941E, #E6471D)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            S
          </span>
          <span
            className="font-black"
            style={{
              fontSize: 32,
              background: "linear-gradient(135deg, #F7941E, #E6471D)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            D
          </span>
          <span
            className="font-black"
            style={{
              fontSize: 32,
              background: "linear-gradient(135deg, #F7941E, #E6471D)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            A
          </span>
        </div>
        <p className="text-white font-black text-[11px] tracking-[0.25em] uppercase">RÉNOVATION</p>
        <div className="w-full h-px bg-white/20 my-1" />
        <p className="text-white/70 text-[9px] tracking-wider">{COMPANY.site}</p>
        <p className="text-[#90CAF9] text-[9px] font-semibold tracking-widest uppercase">Tous Corps d'État</p>
      </div>

      {/* Panneau droit — coordonnées */}
      <div className="flex flex-col justify-center bg-white px-5 py-4 gap-1.5 flex-1">
        <p className="font-black text-[#1E2F6E] text-[15px] tracking-wide uppercase leading-tight">
          SDA RÉNOVATION
        </p>
        <div className="h-0.5 w-8 bg-gradient-to-r from-[#F7941E] to-[#E6471D] rounded-full" />

        <div className="flex flex-col gap-0.5 mt-1">
          <p className="text-[11px] text-slate-600 leading-snug">{COMPANY.adresse}</p>
          <p className="text-[11px] text-slate-600 leading-snug">{COMPANY.codePostal} {COMPANY.ville}</p>
          <p className="text-[11px] text-slate-600 leading-snug mt-1">{COMPANY.telephone}</p>
          <p className="text-[11px] text-[#1976D2] leading-snug"><EmailsDocument separator=" · " /></p>
        </div>

        <div className="h-0.5 w-full bg-gradient-to-r from-[#F7941E] to-[#E6471D] rounded-full mt-1" />

        <div className="flex flex-col gap-0.5 mt-1">
          <p className="text-[9px] text-slate-500 leading-tight">
            <span className="font-semibold">SIRET</span> {COMPANY.siret}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <span className="font-semibold">N° TVA</span> {COMPANY.tvaIntracommunautaire}
          </p>
          <p className="text-[9px] text-slate-400 italic leading-tight mt-0.5">{COMPANY.slogan}</p>
        </div>
      </div>
    </div>
  );
}

export async function TamponSDAprint({ className = "" }: { className?: string }) {
  return (
    <div className={`flex rounded border border-[#1E2F6E]/30 overflow-hidden ${className}`} style={{ width: 280, fontSize: 0 }}>
      <div className="flex flex-col items-center justify-center px-3 py-2 gap-1" style={{ background: "linear-gradient(to bottom, #1976D2, #1B3F94)" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#F7941E", lineHeight: 1 }}>SDA</span>
        <span style={{ fontSize: 6, fontWeight: 700, color: "white", letterSpacing: "0.2em" }}>RÉNOVATION</span>
        <span style={{ fontSize: 5, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{COMPANY.site}</span>
      </div>
      <div className="flex flex-col justify-center px-3 py-2 gap-0.5 flex-1 bg-white">
        <p style={{ fontSize: 9, fontWeight: 900, color: "#1E2F6E" }}>SDA RÉNOVATION</p>
        <p style={{ fontSize: 7, color: "#555" }}>{COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
        <p style={{ fontSize: 7, color: "#555" }}>{COMPANY.telephone} · <EmailsDocument /></p>
        <p style={{ fontSize: 6, color: "#777", marginTop: 2 }}>SIRET {COMPANY.siret} · TVA {COMPANY.tvaIntracommunautaire}</p>
        <p style={{ fontSize: 6, color: "#aaa", fontStyle: "italic" }}>{COMPANY.slogan}</p>
      </div>
    </div>
  );
}
