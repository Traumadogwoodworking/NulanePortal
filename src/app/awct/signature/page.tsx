"use client";

import { useState, useRef, useEffect } from "react";
import { usePortalSession } from "@/lib/portalSession";
import { useRouter } from "next/navigation";

// AWCT Design Colors (Corporate)
const AWCT_BLUE = "#0047AB"; // Cobalt/Royal Blue
const AWCT_DARK = "#1E293B"; // Slate-800
const AWCT_GRAY = "#64748B"; // Slate-500

interface SignatureFormData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  office: string;
  website: string;
}

export default function AwctSignaturePage() {
  const { session, isAwct, status } = usePortalSession();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState<SignatureFormData>({
    fullName: session?.user?.display_name || "Authorized Operator",
    title: "Operations Specialist",
    email: session?.user?.email || "operator@awct.com",
    phone: "(555) 012-3456",
    office: "AWCT Corporate Hub",
    website: "www.awct.com",
  });

  // Access Gating (AWCT Only)
  useEffect(() => {
    if (status === "success" && !isAwct) {
      router.replace("/");
    }
  }, [isAwct, status, router]);

  if (status === "loading") return <div className="p-10 font-black animate-pulse">AUTHORIZING...</div>;
  if (!isAwct) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const drawSignature = (ctx: CanvasRenderingContext2D) => {
    const width = 600;
    const height = 200;

    // Clear background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Left Contact Block (Text)
    ctx.textAlign = "left";

    // Full Name
    ctx.fillStyle = AWCT_DARK;
    ctx.font = "bold 24px Inter, system-ui, sans-serif";
    ctx.fillText(formData.fullName, 20, 50);

    // Title
    ctx.fillStyle = AWCT_BLUE;
    ctx.font = "600 16px Inter, system-ui, sans-serif";
    ctx.fillText(formData.title.toUpperCase(), 20, 75);

    // Divider Line (Decorative Line next to contact info)
    ctx.strokeStyle = "#e2e8f0"; // Slate-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 95);
    ctx.lineTo(280, 95);
    ctx.stroke();

    // Contact Details
    ctx.fillStyle = AWCT_GRAY;
    ctx.font = "400 14px Inter, system-ui, sans-serif";
    ctx.fillText(`e: ${formData.email}`, 20, 115);
    ctx.fillText(`p: ${formData.phone}`, 20, 135);
    ctx.fillText(`o: ${formData.office}`, 20, 155);
    ctx.fillText(`w: ${formData.website}`, 20, 175);

    // Right Branding Block (AWCT IDENTITY)
    // Vertical Vertical Divider
    ctx.strokeStyle = AWCT_BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(310, 30);
    ctx.lineTo(310, 170);
    ctx.stroke();

    // AWCT Text (Logo placeholder since we lack asset)
    ctx.textAlign = "center";
    ctx.fillStyle = AWCT_BLUE;
    ctx.font = "900 48px Inter, system-ui, sans-serif";
    ctx.fillText("AWCT", 450, 100);
    
    ctx.fillStyle = AWCT_DARK;
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("AMERICAN WHEEL & CAR", 450, 125);

    // Lower Transport Motif (Conceptual Train Line)
    ctx.strokeStyle = AWCT_BLUE;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(330, 150);
    ctx.lineTo(570, 150);
    ctx.stroke();
    
    // Tiny Train Tracks Motif
    for (let i = 340; i < 570; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, 145);
        ctx.lineTo(i, 155);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawSignature(ctx);
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `AWCT_Signature_${formData.fullName.replace(/\s+/g, "_")}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <div className="p-8 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">AWCT Signature Generator</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Tenant-Only Marketing & Branding Utility</p>
        </div>
        <div className="flex items-center gap-4">
           {/* Visual Brand Indicator */}
           <div className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-black ring-1 ring-slate-700/20">
              TENANT: AMERICAN WHEEL & CAR
           </div>
        </div>
      </div>

      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        {/* EDITOR FORM */}
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl self-start">
          <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">1</span>
            Operator Information
          </h2>
          <div className="space-y-5">
            {[
              { label: "Full Name", name: "fullName", type: "text" },
              { label: "Designation / Title", name: "title", type: "text" },
              { label: "Operational Email", name: "email", type: "email" },
              { label: "Phone", name: "phone", type: "text" },
              { label: "Office / Hub Location", name: "office", type: "text" },
              { label: "Website", name: "website", type: "text" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name as keyof SignatureFormData]}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-700"
                />
              </div>
            ))}
          </div>
        </div>

        {/* LIVE PREVIEW & EXPORT */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl">
             <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">2</span>
                Real-time Preview
              </h2>

              {/* CARD PREVIEW (HTML) */}
              <div id="signature-card-preview" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex h-[200px] w-full max-w-[600px] mx-auto group ring-1 ring-slate-100">
                  {/* LEFT BLOCK */}
                  <div className="p-6 flex-1 flex flex-col justify-center gap-0.5">
                      <div className="text-xl font-black text-slate-900 leading-tight">{formData.fullName}</div>
                      <div className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3">{formData.title}</div>
                      
                      <div className="w-full h-[1px] bg-slate-100 mb-3" />

                      <div className="space-y-0.5">
                         <div className="text-[11px] font-bold text-slate-500"><span className="text-slate-700 font-black">e</span> {formData.email}</div>
                         <div className="text-[11px] font-bold text-slate-500"><span className="text-slate-700 font-black">p</span> {formData.phone}</div>
                         <div className="text-[11px] font-bold text-slate-500 text-xs mt-1 font-black uppercase tracking-tight">{formData.office}</div>
                         <div className="text-[11px] font-bold text-slate-600 underline underline-offset-2">{formData.website}</div>
                      </div>
                  </div>

                  {/* LOGO BAR */}
                  <div className="w-[2px] bg-slate-200 my-6" />

                  {/* RIGHT BLOCK */}
                  <div className="w-[200px] flex flex-col items-center justify-center p-6 relative gap-1">
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">AWCT</div>
                      <div className="text-[8px] font-black text-slate-800 tracking-[0.2em] whitespace-nowrap">AMERICAN WHEEL & CAR</div>
                      
                      {/* Industrial Motif Representation */}
                      <div className="absolute bottom-4 left-6 right-6 h-[2px] bg-slate-200 flex items-center gap-[15px]">
                         {[...Array(10)].map((_, i) => (
                           <div key={i} className="h-2 w-[1px] bg-slate-300" />
                         ))}
                      </div>
                  </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                 <button 
                  onClick={handleDownload}
                  className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3"></path></svg>
                    Download Card (Static PNG)
                 </button>
                 <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest px-8">
                    Note: High-fidelity GIF generation functionality is staged for the next operational slice.
                 </p>
              </div>
          </div>

          <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z"/></svg>
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-slate-300">Technical Brief</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-4">
                 Signatures are generated at 600x200px using the Nulane Canvas Renderer to preserve industrial design alignment.
              </p>
              <div className="flex flex-wrap gap-2">
                 <span className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-black tracking-widest text-white/50 border border-white/10 uppercase">600DPI Render</span>
                 <span className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-black tracking-widest text-white/50 border border-white/10 uppercase">AWCT Blue: #0047AB</span>
              </div>
          </div>
        </div>
      </main>

      {/* HIDDEN RENDER CANVAS */}
      <canvas ref={canvasRef} width="600" height="200" className="hidden" />
    </div>
  );
}
