import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Dojah from 'dojah-kyc-sdk-react';
import { ShieldCheck, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RunnerKyc() {
  const navigate = useNavigate();
  const { user, refreshKycStatus, role, kycStatus } = useAuth();

  const [kycCompleted, setKycCompleted] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [kycSubmitted, setKycSubmitted] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/runner/login');
      return;
    }
    if (role === 'rider') {
      navigate('/rider/feed');
    }
  }, [user, role, navigate]);

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (kycSubmitted && !kycCompleted) {
      intervalId = setInterval(async () => {
        await refreshKycStatus();
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [kycSubmitted, kycCompleted, refreshKycStatus]);

  React.useEffect(() => {
    if (kycStatus === 'approved' && kycSubmitted) {
      setKycCompleted(true);
      setTimeout(() => navigate('/runner'), 2000);
    }
  }, [kycStatus, kycSubmitted, navigate]);

  const appID = "6a40209b109a584f7d53e715";
  const publicKey = "test_pk_SSKxQFTCplZVGXQXZBn4exBLB";

  const response = async (type: string, data: any) => {
    console.log('[Dojah Callback]', type, data);
    if (type === 'success') {
      setShowWidget(false);
      setKycSubmitted(true);
    } else if (type === 'error') {
      console.error('Dojah verification failed', data);
      setShowWidget(false);
    } else if (type === 'close') {
      console.log('Dojah widget closed');
      setShowWidget(false);
    }
  };

  const renderRightContent = () => {
    if (kycCompleted) {
      return (
        <div className="w-full max-w-[420px] bg-white p-10 rounded-2xl shadow-sm text-center border border-[rgba(11,15,14,0.08)]">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-[24px] font-bold text-black font-['Space_Grotesk',sans-serif] mb-3">Verification Complete</h2>
          <p className="text-[14.5px] text-[#6E6B5E] mb-8">Your logistics profile has been approved.</p>
          <Loader2 className="w-6 h-6 animate-spin text-[#0B0F0E] mx-auto" />
        </div>
      );
    }

    return (
      <div className="w-full max-w-[420px] bg-white p-10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[rgba(11,15,14,0.06)] text-center">
        <ShieldCheck className="w-12 h-12 text-[#0B0F0E] mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="text-[22px] tracking-[-0.01em] font-bold text-black font-['Space_Grotesk',sans-serif] mb-3">
          Business Verification
        </h2>
        <p className="text-[14.5px] text-[#6E6B5E] leading-[22px] mb-8">
          To ensure the safety of our escrow platform, all logistics partners must complete business identity verification before accepting deliveries.
        </p>
        
        {kycSubmitted ? (
          <div className="py-6 border-t border-[rgba(11,15,14,0.06)]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B0F0E] mx-auto" />
            <p className="text-[14px] text-[#6E6B5E] mt-4 font-medium">
              {kycSubmitted ? "Awaiting Dojah verification results..." : "Processing..."}
            </p>
          </div>
        ) : showWidget ? (
          <div className="py-4 border-t border-[rgba(11,15,14,0.06)]">
            <Dojah
              appID={appID}
              publicKey={publicKey}
              type="custom"
              userData={{ email: user?.email || '' }}
              config={{ widget_id: "6a40f31b109a584f7d56fb21" }}
              metadata={{ uid: user?.uid || '' }}
              response={response}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowWidget(true)}
            className="w-full bg-[#0B0F0E] text-white py-[14px] rounded-xl text-[14.5px] font-semibold hover:bg-black transition-colors shadow-sm"
          >
            Start Verification
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F7F4EC] font-[Inter,sans-serif]">
      {/* Left Column (Dark) */}
      <div className="relative w-full lg:w-1/2 bg-[#15140F] min-h-[50vh] lg:min-h-screen flex flex-col justify-center overflow-hidden">
        {/* Glow background */}
        <div className="absolute right-[-20%] bottom-[-10%] w-[520px] h-[520px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,204,0,0.13)_0%,rgba(0,0,0,0)_70%)] pointer-events-none rounded-full"></div>
        
        <div className="relative z-10 w-full max-w-[600px] mx-auto px-8 lg:px-20 py-12 flex flex-col h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-16 lg:mb-auto hover:opacity-90 transition-opacity">
            <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36]">
              <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
            </div>
            <span className="text-[18px] font-bold tracking-tight text-[#F7F4EC] font-['Space_Grotesk',sans-serif]">Luggik</span>
          </Link>

          <div className="mt-8 mb-auto">
            {/* Runner portal badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,204,0,0.12)] border border-[rgba(255,204,0,0.25)] mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] shadow-[0_0_0_3px_rgba(255,204,0,0.22)]"></div>
              <span className="text-[11px] font-mono text-[#FFCC00] uppercase tracking-[0.1em] pt-0.5">Runner portal</span>
            </div>

            <h1 className="text-[40px] leading-[44px] tracking-[-0.02em] font-bold text-[#F7F4EC] font-['Space_Grotesk',sans-serif] mb-6">
              Deliver with confidence.<br/>Get paid on time.
            </h1>

            <p className="text-[15px] leading-[24.75px] text-[#A8A398] mb-12">
              Every errand you run is backed by funded escrow — your payment is locked in before you pick up, released the moment delivery is confirmed.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              {/* Stat 1 */}
              <div className="flex-1 bg-[rgba(247,244,236,0.05)] border border-[rgba(247,244,236,0.1)] rounded-[16px] p-5">
                <div className="flex items-baseline mb-1">
                  <span className="text-[24px] tracking-[-0.02em] font-bold text-[#F7F4EC] font-['Space_Grotesk',sans-serif]">6,400</span>
                  <span className="text-[24px] tracking-[-0.02em] font-bold text-[#FFCC00] font-['Space_Grotesk',sans-serif] ml-1">+</span>
                </div>
                <p className="text-[12px] leading-[16.8px] text-[#A8A398]">Active runners on the network</p>
              </div>

              {/* Stat 2 */}
              <div className="flex-1 bg-[rgba(247,244,236,0.05)] border border-[rgba(247,244,236,0.1)] rounded-[16px] p-5">
                <div className="flex items-baseline mb-1">
                  <span className="text-[24px] tracking-[-0.02em] font-bold text-[#F7F4EC] font-['Space_Grotesk',sans-serif]">99</span>
                  <span className="text-[24px] tracking-[-0.02em] font-bold text-[#FFCC00] font-['Space_Grotesk',sans-serif] ml-1">%</span>
                </div>
                <p className="text-[12px] leading-[16.8px] text-[#A8A398]">Same-day payout rate</p>
              </div>
            </div>

            {/* Track widget */}
            <div className="bg-[rgba(247,244,236,0.04)] border border-[rgba(247,244,236,0.09)] rounded-[18px] p-5">
              <div className="text-[10.5px] font-mono text-[#A8A398] uppercase tracking-[0.08em] mb-6">Live errand · ESC-04417</div>
              
              <div className="flex items-center justify-between relative px-2">
                {/* Connecting lines */}
                <div className="absolute left-6 right-6 top-[15px] h-[1.5px] -z-10 flex">
                  <div className="w-1/3 h-full bg-[#FFCC00] opacity-60"></div>
                  <div className="w-1/3 h-full bg-[#FFCC00] opacity-60"></div>
                  <div className="w-1/3 h-full bg-[rgba(247,244,236,0.12)]"></div>
                </div>

                {/* Nodes */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[32px] h-[32px] rounded-full bg-[#FFCC00] flex items-center justify-center">
                    <Check className="w-[14px] h-[14px] text-[#15140F]" strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.04em]">Funded</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-[32px] h-[32px] rounded-full bg-[#FFCC00] flex items-center justify-center">
                    <Check className="w-[14px] h-[14px] text-[#15140F]" strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.04em]">Picked up</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-[32px] h-[32px] rounded-full bg-[rgba(255,204,0,0.15)] border border-[#FFCC00] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFCC00]"></div>
                  </div>
                  <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-[0.04em]">In transit</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-[32px] h-[32px] rounded-full bg-[rgba(247,244,236,0.08)] border border-[rgba(247,244,236,0.15)] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8A398" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-[0.04em]">Released</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-[12.5px] text-[#A8A398]">
            © 2026 Luggik · Secure Escrow & Logistics
          </div>
        </div>
      </div>

      {/* Right Column (Light) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative">
        {renderRightContent()}
      </div>
    </div>
  );
}
