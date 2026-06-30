import { ArrowRight, Eye, ShieldCheck, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import heroImageOne from "../assets/hero-image-one.png";
import heroImageTwo from "../assets/hero-image-two.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-luggik-bg font-sans overflow-hidden flex flex-col">
      
      {/* Navigation Container */}
      <div className="pt-6 px-6 flex justify-center w-full">
        <nav className="flex items-center justify-between px-8 py-3 bg-white rounded-full w-full max-w-[1200px] shadow-sm">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#D9D9D9] rounded-sm"></div>
            <span className="text-[17px] font-bold tracking-tight text-luggik-text">Luggik</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-8">
            <Link to="/runner/login" className="text-[14px] font-medium text-luggik-text hover:opacity-80 transition-opacity">
              Driver Login
            </Link>
            <Link to="/buyer" className="flex items-center justify-center bg-black text-white px-6 py-2.5 rounded-full font-medium text-[14px] hover:bg-gray-900 transition-colors shadow-sm">
              Start an errand
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <main 
        className="w-full max-w-[1300px] mx-auto px-6 pb-24 relative flex flex-col lg:flex-row items-center justify-between"
        style={{ marginTop: '107px' }}
      >
        
        {/* LEFT COLUMN - MOCKUPS */}
        <div className="hidden lg:flex flex-col gap-6 w-[280px] mt-10">
          {/* Image 1 */}
          <div className="p-4 bg-white rounded-[32px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] w-[240px] mx-auto rotate-[-2deg]">
             <img src={heroImageOne} alt="Courier" className="w-full h-auto rounded-[20px] object-cover aspect-square" />
          </div>
          
          {/* Tracking Card 1 */}
          <div className="bg-[#FAF9F5] rounded-[24px] p-6 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] border border-black/5 w-[260px] ml-4">
             <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-luggik-yellow mb-5">
               <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
               <span className="text-[10px] font-bold tracking-[0.2em] uppercase">In Transit</span>
             </div>
             <h3 className="text-[26px] font-bold tracking-tight text-luggik-text mb-3">ESC-04302</h3>
             <div className="flex items-center gap-1.5 text-[12px] text-[#666666] font-medium">
                <Eye className="w-4 h-4" />
                Accra &rarr; Kumasi
             </div>
          </div>
        </div>

        {/* CENTER COLUMN - TEXT & CTA */}
        <div className="flex-1 flex flex-col items-center text-center z-20 px-4 mt-0 lg:mt-0">
           {/* Top Tag */}
           <div className="inline-flex items-center gap-2 mb-8">
             <div className="w-1.5 h-1.5 rounded-full bg-luggik-yellow"></div>
             <span className="text-[11px] font-semibold tracking-[0.15em] text-[#999999] uppercase">Powered by Nomba</span>
           </div>

           {/* Headline */}
           <h1 className="text-[87px] font-bold leading-[1.05] tracking-normal text-luggik-text mb-8">
             Ship it.<br />
             <span className="relative inline-block">
               <span className="relative z-10">Pay it.</span>
               <span className="absolute bottom-[20%] left-0 right-0 h-[22%] bg-luggik-yellow -z-10"></span>
             </span> Trust it.
           </h1>

           {/* Subtitle */}
           <p className="text-[18px] text-[#666666] max-w-[620px] mx-auto mb-12 leading-[1.6] font-normal">
             Luggik holds payment in escrow until delivery is confirmed, so buyers don't pay blind, and carriers don't move freight on faith.
           </p>

           {/* Buttons */}
           <div className="flex flex-col sm:flex-row items-center gap-5 mb-16">
             <Link to="/buyer" className="flex items-center justify-center gap-2 bg-luggik-yellow text-luggik-text px-8 py-4 rounded-full font-semibold text-[16px] shadow-[0_8px_24px_-8px_rgba(255,204,0,0.6)] hover:-translate-y-0.5 transition-all w-full sm:w-auto">
               Start an errand <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
             </Link>
             <Link to="/runner/signup" className="flex items-center justify-center bg-transparent border border-[#E5E5E5] text-luggik-text px-8 py-4 rounded-full font-semibold text-[16px] hover:bg-black/5 transition-colors w-full sm:w-auto">
               Join as a courier
             </Link>
           </div>

           {/* Trust Icons below buttons */}
           <div className="flex items-center gap-10 justify-center">
             <div className="flex items-center gap-2.5 text-[#999999]">
               <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={1.25} />
               <span className="text-[13px] font-normal">Funds held, not gambled</span>
             </div>
             <div className="flex items-center gap-2.5 text-[#999999]">
               <Clock className="w-[18px] h-[18px]" strokeWidth={1.25} />
               <span className="text-[13px] font-normal">Released on confirmed delivery</span>
             </div>
           </div>
        </div>

        {/* RIGHT COLUMN - MOCKUPS */}
        <div className="hidden lg:flex flex-col gap-6 w-[280px] mt-24 relative z-10">
           {/* Image 2 */}
           <div className="p-4 bg-white rounded-[32px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] w-[240px] mx-auto rotate-[2deg]">
             <img src={heroImageTwo} alt="Buyer" className="w-full h-auto rounded-[20px] object-cover aspect-square" />
           </div>
           
           {/* Tracking Card 2 */}
           <div className="bg-[#FAF9F5] rounded-[24px] p-6 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] border border-black/5 w-[260px] mr-4 self-end">
             <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-luggik-yellow mb-5">
               <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
               <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Delivered</span>
             </div>
             <h3 className="text-[26px] font-bold tracking-tight text-luggik-text mb-3">ESC-04302</h3>
             <div className="flex items-center gap-1.5 text-[12px] text-[#666666] font-medium">
                <Eye className="w-4 h-4" />
                Accra &rarr; Kumasi
             </div>
          </div>
        </div>
      </main>

      {/* The Platform Section */}
      <section className="w-full px-6 py-24 bg-transparent relative z-10">
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col items-center text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-6">
               <div className="w-1.5 h-1.5 rounded-full bg-luggik-yellow"></div>
               <span className="text-[11px] font-semibold tracking-[0.15em] text-[#999999] uppercase">The Platform</span>
            </div>
            
            <h2 className="text-[48px] font-bold leading-[1.1] tracking-normal text-luggik-text mb-6 max-w-2xl mx-auto">
              Built for people moving packages
            </h2>
            
            <p className="text-[17px] text-[#777777] max-w-[700px] mx-auto leading-[1.6] font-normal">
              Not a generic payments wrapper, escrow rules, dispute flows, and tracking made specifically for packages that need delivery.
            </p>
          </div>

          {/* Features Grid */}
          <div className="border border-[#EAEAEA] rounded-[32px] overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#EAEAEA]">
            
            {/* Feature 1 */}
            <div className="p-10 md:p-12 flex flex-col items-start bg-transparent">
               <div className="mb-6 relative">
                 <div className="w-8 h-8 rounded-full border-[1.5px] border-luggik-text flex items-center justify-center relative">
                   <div className="w-2.5 h-3 border-[1.5px] border-luggik-text rounded-t-sm absolute -top-1"></div>
                   <div className="w-1 h-1.5 bg-luggik-text rounded-full mt-1"></div>
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-luggik-yellow absolute -right-1 bottom-0"></div>
               </div>
               <h3 className="text-[17px] font-bold text-luggik-text mb-4">Escrow by default</h3>
               <p className="text-[14.5px] text-[#888888] leading-[1.6]">
                 Every shipment routes payment through escrow automatically — there's no "trust me" tier to opt into.
               </p>
            </div>

            {/* Feature 2 */}
            <div className="p-10 md:p-12 flex flex-col items-start bg-transparent">
               <div className="mb-6 relative">
                 <div className="w-8 h-8 rounded-full border-[1.5px] border-luggik-text relative">
                   <div className="w-[1.5px] h-3 bg-luggik-text absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[90%]"></div>
                   <div className="w-[1.5px] h-2.5 bg-luggik-text absolute top-1/2 left-1/2 origin-bottom rotate-90 -translate-y-[100%] translate-x-[2px]"></div>
                 </div>
                 <div className="w-2 h-2 rounded-full bg-luggik-yellow border-[1.5px] border-[#FAF9F4] absolute -top-0.5 -right-0.5"></div>
               </div>
               <h3 className="text-[17px] font-bold text-luggik-text mb-4">Live milestone tracking</h3>
               <p className="text-[14.5px] text-[#888888] leading-[1.6]">
                 Pickup, transit, customs, delivery — each stage is timestamped and visible to both sides in real time.
               </p>
            </div>

            {/* Feature 3 */}
            <div className="p-10 md:p-12 flex flex-col items-start bg-transparent">
               <div className="mb-6 relative">
                 <div className="w-8 h-8 relative flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full text-luggik-text">
                       <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFCC00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                 </div>
               </div>
               <h3 className="text-[17px] font-bold text-luggik-text mb-4">Verified carriers only</h3>
               <p className="text-[14.5px] text-[#888888] leading-[1.6]">
                 Every carrier on Luggik is identity-checked and rated, so escrow protects you from more than just bad timing.
               </p>
            </div>

          </div>
        </div>
      </section>

      {/* Why Escrow Section */}
      <section className="w-full px-6 pb-24 pt-12 relative z-10">
        <div className="max-w-[1200px] mx-auto bg-[#15140F] rounded-[32px] p-12 md:p-16 lg:p-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Left Column - Text */}
          <div className="flex-1">
             <div className="inline-flex items-center gap-2 mb-8">
               <div className="w-1.5 h-1.5 rounded-full bg-luggik-yellow"></div>
               <span className="text-[11px] font-semibold tracking-[0.15em] text-[#999999] uppercase">Why Escrow</span>
             </div>
             
             <h2 className="text-[42px] font-bold leading-[1.1] tracking-[-0.0167em] text-[#F7F4EC] mb-6">
               Money moves only when the package does.
             </h2>
             
             <p className="text-[16px] text-[#A8A398] leading-[1.5] mb-12 max-w-[480px]">
               No advance payment into a stranger's account. No carrier hauling cargo on a promise. Luggik sits between both sides until delivery is proven.
             </p>

             <ul className="flex flex-col gap-5">
               <li className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-full border-[1.5px] border-luggik-yellow flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFCC00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-[14.5px] text-[#F7F4EC]">Buyer funds are locked before pickup</span>
               </li>
               <li className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-full border-[1.5px] border-luggik-yellow flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFCC00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-[14.5px] text-[#F7F4EC]">Carrier sees proof of funds, not a promise</span>
               </li>
               <li className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-full border-[1.5px] border-luggik-yellow flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFCC00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-[14.5px] text-[#F7F4EC]">Release requires confirmed, signed delivery</span>
               </li>
             </ul>
          </div>

          {/* Right Column - Ledger */}
          <div className="w-full lg:w-[480px] bg-[#F7F4EC]/5 border border-[#F7F4EC]/15 rounded-[24px] overflow-hidden">
             <div className="flex flex-col">
                <div className="flex items-center justify-between px-8 py-5 border-b border-[#F7F4EC]/10">
                  <span className="text-[13px] font-mono text-[#A8A398]">Shipment</span>
                  <span className="text-[13px] font-mono text-[#F7F4EC]">ESC-04417</span>
                </div>
                <div className="flex items-center justify-between px-8 py-5 border-b border-[#F7F4EC]/10">
                  <span className="text-[13px] font-mono text-[#A8A398]">Route</span>
                  <span className="text-[13px] font-mono text-[#F7F4EC]">Lagos &rarr; Abuja</span>
                </div>
                <div className="flex items-center justify-between px-8 py-5 border-b border-[#F7F4EC]/10">
                  <span className="text-[13px] font-mono text-[#A8A398]">Status</span>
                  <span className="text-[13px] font-mono text-luggik-yellow">Funds held</span>
                </div>
                <div className="flex items-center justify-between px-8 py-5 border-b border-[#F7F4EC]/10">
                  <span className="text-[13px] font-mono text-[#A8A398]">Carrier rating</span>
                  <span className="text-[13px] font-mono text-[#F7F4EC]">4.9 / 5</span>
                </div>
                <div className="flex items-center justify-between px-8 py-5 border-b border-[#F7F4EC]/10">
                  <span className="text-[13px] font-mono text-[#A8A398]">Est. release</span>
                  <span className="text-[13px] font-mono text-[#F7F4EC]">On delivery + sign-off</span>
                </div>
                <div className="flex items-center justify-between px-8 py-8">
                  <span className="text-[11px] font-mono text-[#A8A398] uppercase tracking-[0.1em]">Held in escrow</span>
                  <span className="text-[28px] font-bold text-[#F7F4EC]">₦150k</span>
                </div>
             </div>
          </div>
          
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full px-6 py-16">
        <div className="max-w-[1200px] mx-auto border-y border-[#EAEAEA] py-16 grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-[46px] font-bold text-luggik-text tracking-[-0.02em] leading-none">
              ₦48M<span className="text-luggik-yellow">+</span>
            </h3>
            <p className="text-[13px] text-[#999999]">Moved through escrow to date</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[46px] font-bold text-luggik-text tracking-[-0.02em] leading-none">
              99.2%
            </h3>
            <p className="text-[13px] text-[#999999]">Shipments released without dispute</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[46px] font-bold text-luggik-text tracking-[-0.02em] leading-none">
              6,400<span className="text-luggik-yellow">+</span>
            </h3>
            <p className="text-[13px] text-[#999999]">Verified carriers on the network</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[46px] font-bold text-luggik-text tracking-[-0.02em] leading-none">
              35
            </h3>
            <p className="text-[13px] text-[#999999]">Countries with active routes</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full px-6 pb-24 relative z-10">
        <div className="max-w-[1200px] mx-auto bg-[#0B0F0E] rounded-[32px] px-8 py-24 md:py-32 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-luggik-yellow/10 blur-[130px] rounded-full pointer-events-none translate-x-1/4 -translate-y-1/4"></div>

          <h2 className="text-[40px] md:text-[52px] font-bold leading-[1.1] tracking-[-0.02em] text-[#F7F4EC] mb-6 max-w-[800px] relative z-10">
            Stop choosing between<br />getting paid and getting paid<br />safely.
          </h2>
          <p className="text-[16px] text-[#A8A398] mb-12 relative z-10">
            Set up your first escrow-backed shipment in under five minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <Link to="/buyer" className="flex items-center justify-center bg-luggik-yellow text-luggik-text px-8 py-4 rounded-full font-semibold text-[15px] hover:bg-yellow-400 transition-colors w-full sm:w-auto min-w-[200px]">
              Start a shipment
            </Link>
            <button className="flex items-center justify-center bg-transparent border border-white/15 text-white px-8 py-4 rounded-full font-semibold text-[15px] hover:bg-white/5 transition-colors w-full sm:w-auto min-w-[200px]">
              Talk to sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 md:px-16 py-12">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-6 md:mb-0">
            <div className="w-[18px] h-[18px] bg-[#D9D9D9]"></div>
            <span className="font-bold text-[18px] tracking-tight text-luggik-text">Luggik</span>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/runner/login" className="text-[13px] font-semibold text-luggik-text hover:opacity-80 transition-opacity">
              Driver Login
            </Link>
            <Link to="/buyer" className="flex items-center justify-center bg-black text-white px-7 py-3 rounded-full font-semibold text-[13px] hover:bg-gray-900 transition-colors">
              Start an errand
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
