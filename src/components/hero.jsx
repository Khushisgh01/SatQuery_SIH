import React, { useEffect, useRef } from 'react';
import Starfield from './Starfield';
import satelliteWaterBody from '../assets/satellite-water-body.jpg';

export default function SkyLensLandingPage({ onLaunchDemo }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F2EDE6] font-['Space_Grotesk'] antialiased selection:bg-[#D4A843] selection:text-[#0A0A0F] relative isolate overflow-x-hidden">
      {/* Particle Background */}
      <Starfield count={45} />

    {/* Global CSS Inject for Bounding Box Glow & Pulse */}
    <style>{`
      @keyframes boxPulseSync {
        0%, 100% {
          opacity: 0.7;
          box-shadow: 0 0 8px rgba(212, 168, 67, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
          border-color: rgba(212, 168, 67, 0.8);
        }
        50% {
          opacity: 1;
          box-shadow: 0 0 16px rgba(212, 168, 67, 0.7), 0 4px 12px rgba(0, 0, 0, 0.3);
          border-color: rgba(212, 168, 67, 1);
        }
      }

      .animate-box-pulse {
        animation: boxPulseSync 3s ease-in-out infinite;
      }

      /* Recessed viewport shadow (Light source: top-left) */
      .recessed-viewport {
        box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.5), inset -1px -1px 2px rgba(212, 168, 67, 0.05);
        border: 1px solid rgba(212, 168, 67, 0.3);
        transform: perspective(1200px) rotateX(0.5deg);
      }

      /* Primary Orange CTA Elevation & Active state */
      .btn-cta-orange {
        background-color: #F47216;
        color: #F2EDE6;
        box-shadow: 0 4px 12px rgba(244, 114, 22, 0.3);
        transition: transform 150ms ease-out, box-shadow 150ms ease-out;
      }

      .btn-cta-orange:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(244, 114, 22, 0.4);
      }

      .btn-cta-orange:active {
        transform: translateY(0);
        box-shadow: 0 4px 12px rgba(244, 114, 22, 0.3);
      }

      /* Raised surface elevation for Stat blocks and Pipeline Card 3 */
      .raised-card-shadow {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
    `}</style>

      {/* Sticky navbar — carries the wordmark across the whole page,
          not just the hero, so the brand is visible after scrolling.
          No CTA here: the hero button below already owns that job,
          and having both visible at once read as a duplicate mistake. */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-8 bg-[#0A0A0F]/85 backdrop-blur-sm border-b border-[rgba(212,168,67,0.15)]">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.6" className="w-6 h-6 shrink-0">
            <circle cx="12" cy="12" r="7" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          <span className="font-['Space_Mono'] text-[16px] font-bold text-[#F2EDE6] tracking-wide">
            SKYLENS
          </span>
        </div>
      </nav>

      <div className="pt-16">
      <div className="lg:flex lg:items-stretch">
        {/* Updated Satellite Viewport Container */}
        <div 
          className="w-full lg:w-[55%] h-[500px] lg:h-[calc(100vh-64px)] relative rounded-[4px] overflow-hidden group cursor-crosshair"
          style={{ 
            transform: 'perspective(1200px) rotateX(0.5deg)',
            boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(212,168,67,0.05)',
            border: '1px solid rgba(212, 168, 67, 0.3)'
          }}
        >
          {/* Satellite Image */}
          <img 
            src={satelliteWaterBody} 
            alt="Satellite Analysis Viewport"
            className="w-full h-full object-cover filter brightness-90 contrast-110"
          />

          {/* Radial Vignette Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10, 10, 15, 0.4) 100%)'
            }}
          />

          {/* Bounding Box: Water Body Detection */}
          <div 
            className="absolute top-[67%] left-[65%] w-[32%] h-[18%] border-2 border-[#D4A843] rounded-[2px] animate-box-pulse cursor-pointer transition-transform duration-150 active:scale-[1.02]"
          >
            <span className="absolute -top-6 left-0 bg-[#141418] text-[#D4A843] font-['Space_Mono'] text-[10px] px-2 py-0.5 border border-[#D4A843]/40 rounded-[2px] uppercase tracking-wider">
              WATER_BODY · 96%
            </span>
          </div>

          {/* Status Overlay Ribbon */}
          <div className="absolute bottom-4 left-4 right-4 bg-[#141418]/90 border border-[#D4A843]/30 px-4 py-2.5 rounded-[4px] flex items-center justify-between">
            <span className="font-['Space_Mono'] text-[11px] text-[#D4A843] tracking-widest uppercase">
              DETECTED: 1 WATER BODY · CONFIDENCE 96%
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60">
              SENTINEL-2 L2A
            </span>
          </div>
        </div>

        {/* Right Side: Hero Details & Action (45%) */}
        <div className="lg:w-[45%] p-8 lg:p-16 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.6" className="w-5 h-5">
              <circle cx="12" cy="12" r="7" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
            <span className="font-['Space_Mono'] text-[15px] font-bold text-[#D4A843] uppercase tracking-[0.1em]">
              SkyLens
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#F2EDE6] leading-[1.15] mb-6">
            Ask your satellite images. <br />
            <span className="text-[#F2EDE6]">Get confidence-scored answers.</span>
          </h1>
          <p className="text-base text-[#F2EDE6]/60 leading-relaxed mb-8 max-w-xl">
            AI-routed geospatial analysis. Query any satellite image — flood extent, land cover change, infrastructure status — and receive a specialist model's answer with its confidence score in seconds.
          </p>

          <div className="mb-12">
            <button
              onClick={onLaunchDemo}
              className="bg-[#F47216] hover:bg-[#F47216] text-[#F2EDE6] font-semibold text-xs tracking-wider uppercase px-8 py-4 rounded-[4px] transition-all duration-150 ease-out hover:-translate-y-[1px] active:translate-y-0 btn-action-shadow">
              TRY A SAMPLE QUERY
            </button>
          </div>

          <div className="pt-8 border-t border-[rgba(212,168,67,0.15)] grid grid-cols-3 gap-6">
            <div>
              <div className="font-['Space_Mono'] text-2xl font-bold text-[#D4A843]">3</div>
              <div className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60 uppercase tracking-wider mt-1">
                SPECIALIZED MODELS
              </div>
            </div>
            <div>
              <div className="font-['Space_Mono'] text-2xl font-bold text-[#D4A843]">PDF</div>
              <div className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60 uppercase tracking-wider mt-1">
                AUDIT-FORMAT REPORTS
              </div>
            </div>
            <div>
              <div className="font-['Space_Mono'] text-2xl font-bold text-[#D4A843]">RLS</div>
              <div className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60 uppercase tracking-wider mt-1">
                ROW-LEVEL SECURED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PIPELINE SECTION */}
      <section className="py-24 px-8 max-w-7xl mx-auto">
        <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] uppercase tracking-[0.2em] mb-12">
          HOW IT WORKS
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1 */}
          <div className="bg-[#141418] border border-[rgba(212,168,67,0.15)] hover:border-[rgba(212,168,67,0.35)] transition-colors duration-200 p-8 rounded-[4px] flex flex-col justify-between relative">
            <div>
              <div className="w-10 h-10 rounded-full border border-[#D4A843]/40 flex items-center justify-center text-[#D4A843] font-['Space_Mono'] text-xs mb-6">
                ⊕
              </div>
              <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] mb-2">01</div>
              <h3 className="text-xl font-bold text-[#F2EDE6] mb-4">Agent Routes</h3>
              <p className="text-sm text-[#F2EDE6]/60 leading-relaxed">
                The orchestration layer parses your natural-language query and dispatches it to the right specialist pipeline based on task type.
              </p>
            </div>
            <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#D4A843]/40 font-['Space_Mono'] text-lg">
              →
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#141418] border border-[rgba(212,168,67,0.15)] hover:border-[rgba(212,168,67,0.35)] transition-colors duration-200 p-8 rounded-[4px] flex flex-col justify-between relative">
            <div>
              <div className="w-10 h-10 rounded-full border border-[#D4A843]/40 flex items-center justify-center text-[#D4A843] font-['Space_Mono'] text-xs mb-6">
                👁
              </div>
              <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] mb-2">02</div>
              <h3 className="text-xl font-bold text-[#F2EDE6] mb-4">Specialist Analyzes</h3>
              <p className="text-sm text-[#F2EDE6]/60 leading-relaxed">
                Domain models — detection, change analysis, classification — process the imagery in parallel with independent model provenance.
              </p>
            </div>
            <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#D4A843]/40 font-['Space_Mono'] text-lg">
              →
            </div>
          </div>

          {/* Card 3 (Elevated Confidence-Scored Output) */}
          <div className="bg-[#1A1A20] border-2 border-[#D4A843] p-8 rounded-[4px] flex flex-col justify-between raised-shadow relative">
            <div>
              <div className="w-10 h-10 rounded-full border border-[#D4A843] bg-[#D4A843]/10 flex items-center justify-center text-[#D4A843] font-['Space_Mono'] text-xs mb-6">
                ✓
              </div>
              <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] mb-2">03</div>
              <h3 className="text-xl font-bold text-[#F2EDE6] mb-4">Confidence-Scored Output</h3>
              <p className="text-sm text-[#F2EDE6]/60 leading-relaxed">
                The specialist model's finding is returned with its own confidence score, flagged for human review before use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. USP BAND */}
      <section className="py-24 px-8 border-y border-[rgba(212,168,67,0.15)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column: Mock Report Document */}
          <div className="bg-[#141418] border border-[rgba(212,168,67,0.3)] rounded-[4px] p-6 lg:p-8 recessed-shadow">
            <div className="flex justify-between items-center border-b border-[rgba(212,168,67,0.15)] pb-4 mb-6">
              <span className="font-['Space_Mono'] text-[11px] text-[#F2EDE6]/60 uppercase tracking-wider">
                ANALYSIS REPORT
              </span>
              <span className="font-['Space_Mono'] text-[11px] text-[#D4A843]">
                REF-2024-1847
              </span>
            </div>

            <div className="space-y-4 font-['Space_Mono'] text-xs mb-8">
              <div className="flex justify-between py-2 border-b border-[rgba(212,168,67,0.08)]">
                <span className="text-[#F2EDE6]/60">Model</span>
                <span className="text-[#D4A843]">GeoChat v2</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[rgba(212,168,67,0.08)]">
                <span className="text-[#F2EDE6]/60">Confidence</span>
                <span className="text-[#D4A843]">94.2%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[rgba(212,168,67,0.08)]">
                <span className="text-[#F2EDE6]/60">Generated by</span>
                <span className="text-[#F2EDE6]">[Analyst name]</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[rgba(212,168,67,0.08)]">
                <span className="text-[#F2EDE6]/60">Second review</span>
                <span className="text-[#F2EDE6]/60 border-b border-dashed border-[#F2EDE6]/40 pb-0.5">
                  Pending
                </span>
              </div>
            </div>

            <button className="bg-[#F47216] hover:bg-[#F47216] text-[#F2EDE6] font-semibold text-xs tracking-wider uppercase px-6 py-3 rounded-[4px] transition-all duration-150 ease-out hover:-translate-y-[1px] active:translate-y-0 btn-action-shadow">
              DOWNLOAD PDF
            </button>
          </div>

          {/* Right Column: Copy */}
          <div>
            <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] uppercase tracking-[0.2em] mb-4">
              WHY IT MATTERS
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#F2EDE6] leading-tight mb-6">
              Every answer ships with <span className="text-[#D4A843]">its own confidence score.</span>
            </h2>
            <p className="text-base text-[#F2EDE6]/60 leading-relaxed mb-6">
              SkyLens routes each query to the specialist model built for it — change detection, optical+SAR fusion, or vision-language Q&A — and returns its answer along with the model's own confidence score, never presented as a final, unreviewed verdict.
            </p>
            <p className="text-base text-[#F2EDE6]/60 leading-relaxed">
              Every session exports as a structured, timestamped PDF report attributed to the analyst who generated it — ready to attach to your team's review workflow, not a substitute for one.
            </p>
          </div>
        </div>
      </section>

      {/* 4. USE CASES SECTION (2+1 Asymmetric Grid) */}
      <section className="py-24 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Card 1 */}
          <div className="bg-[#141418] border border-[rgba(212,168,67,0.15)] hover:border-[rgba(212,168,67,0.35)] transition-colors duration-200 rounded-[4px] overflow-hidden flex flex-col">
            <div className="h-48 overflow-hidden recessed-shadow relative">
              <img 
                src="https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1000&auto=format&fit=crop" 
                alt="Disaster Response" 
                className="w-full h-full object-cover filter brightness-90"
              />
            </div>
            <div className="p-8">
              <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] mb-2">01</div>
              <h3 className="text-xl font-bold text-[#F2EDE6] mb-3">Disaster Response</h3>
              <p className="text-sm text-[#F2EDE6]/60 leading-relaxed">
                Rapidly assess flood extent, building damage, and displacement from pre- and post-event imagery, built to support fast decision-making during disaster response.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#141418] border border-[rgba(212,168,67,0.15)] hover:border-[rgba(212,168,67,0.35)] transition-colors duration-200 rounded-[4px] overflow-hidden flex flex-col">
            <div className="h-48 overflow-hidden recessed-shadow relative">
              <img 
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000&auto=format&fit=crop" 
                alt="Land Monitoring" 
                className="w-full h-full object-cover filter brightness-90"
              />
            </div>
            <div className="p-8">
              <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] mb-2">02</div>
              <h3 className="text-xl font-bold text-[#F2EDE6] mb-3">Land Monitoring</h3>
              <p className="text-sm text-[#F2EDE6]/60 leading-relaxed">
                Track deforestation, encroachment, and agricultural change over time using multi-temporal, change-detection imagery pairs.
              </p>
            </div>
          </div>
        </div>

        {/* Full-width Card 3 */}
        <div className="bg-[#141418] border border-[rgba(212,168,67,0.15)] hover:border-[rgba(212,168,67,0.35)] transition-colors duration-200 rounded-[4px] overflow-hidden grid grid-cols-1 md:grid-cols-2 items-center">
          <div className="h-64 md:h-full overflow-hidden recessed-shadow relative">
            <img 
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop" 
              alt="Infrastructure Planning" 
              className="w-full h-full object-cover filter brightness-90"
            />
          </div>
          <div className="p-8 lg:p-12">
            <div className="font-['Space_Mono'] text-[11px] text-[#D4A843] mb-2">03</div>
            <h3 className="text-2xl font-bold text-[#F2EDE6] mb-4">Infrastructure Planning</h3>
            <p className="text-sm text-[#F2EDE6]/60 leading-relaxed mb-8">
              Assess site conditions and monitor construction progress from optical and SAR imagery, with answers grounded in the specific scene you query.
            </p>
            <button
              onClick={onLaunchDemo}
              className="bg-[#F47216] hover:bg-[#F47216] text-[#F2EDE6] font-semibold text-xs tracking-wider uppercase px-6 py-3 rounded-[4px] transition-all duration-150 ease-out hover:-translate-y-[1px] active:translate-y-0 btn-action-shadow">
              SEE DEMO
            </button>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="w-full border-t border-[rgba(212,168,67,0.15)] py-6 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-['Space_Mono'] text-xs text-[#F2EDE6]/60">
          <div className="flex items-center gap-2">
            <span className="text-[#D4A843] font-bold">PARALLAX</span>
            <span>· Smart India Hackathon 2026</span>
          </div>
          <div>
            SkyLens — Satellite Analysis Platform
          </div>
          <div>
            Prototype
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
