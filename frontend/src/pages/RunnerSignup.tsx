import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function RunnerSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refreshKycStatus } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const res = await fetch('/api/kyc/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email,
          companyName
        })
      });

      if (!res.ok) throw new Error("Failed to register company profile");

      await refreshKycStatus(userCredential.user.uid);
      navigate('/runner/kyc');
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const res = await fetch(`/api/kyc/status/${result.user.uid}`);
      if (res.ok) {
        const data = await res.json();
        await refreshKycStatus(result.user.uid);
        if (data.role === 'rider') {
          navigate('/rider/feed');
        } else if (data.kycStatus === 'approved') {
          navigate('/runner');
        } else {
          navigate('/runner/kyc');
        }
      } else if (res.status === 404) {
        navigate('/runner/complete-profile');
      }
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20">
        <div className="w-full max-w-[420px]">
          <h2 className="text-[32px] tracking-[-0.02em] font-bold text-black font-['Space_Grotesk',sans-serif] mb-2">Logistics Partner</h2>
          <p className="text-[14.5px] text-[#6E6B5E] leading-[22.48px] mb-10">
            Create an account to accept deliveries
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label className="block text-[13.5px] font-semibold text-[#0B0F0E] mb-2">Company Name</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-[14px] bg-[#EFEADA] border border-[rgba(11,15,14,0.13)] rounded-xl text-[14.5px] text-[#0B0F0E] placeholder:text-[#757575] focus:outline-none focus:border-[#0B0F0E] transition-colors"
                placeholder="E.g. FastMove Logistics"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[13.5px] font-semibold text-[#0B0F0E] mb-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-[14px] bg-[#EFEADA] border border-[rgba(11,15,14,0.13)] rounded-xl text-[14.5px] text-[#0B0F0E] placeholder:text-[#757575] focus:outline-none focus:border-[#0B0F0E] transition-colors"
                placeholder="company@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13.5px] font-semibold text-[#0B0F0E] mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  minLength={6}
                  className="w-full pl-4 pr-12 py-[14px] bg-[#EFEADA] border border-[rgba(11,15,14,0.13)] rounded-xl text-[14.5px] text-[#0B0F0E] placeholder:text-[#757575] focus:outline-none focus:border-[#0B0F0E] transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6E6B5E] hover:text-[#0B0F0E] focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#FFCC00] text-[#0B0F0E] py-[14px] rounded-full text-[15px] font-semibold shadow-[0px_10px_22px_-8px_rgba(255,204,0,0.55)] hover:bg-[#F2C200] transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Creating Account...' : 'Continue to KYC Verification'}
            </button>
          </form>

          <div className="my-8 flex items-center before:flex-1 before:border-t before:border-[rgba(11,15,14,0.13)] after:flex-1 after:border-t after:border-[rgba(11,15,14,0.13)]">
            <span className="mx-4 text-[12.5px] font-mono tracking-[0.06em] text-[#A8A398]">OR</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-transparent border border-[rgba(11,15,14,0.13)] text-[#0B0F0E] py-[13px] rounded-full text-[14.5px] font-medium hover:bg-[rgba(11,15,14,0.03)] transition-colors"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="mt-8 text-center text-[14px] text-[#6E6B5E]">
            Already have an account? <Link to="/runner/login" className="font-semibold text-[#0B0F0E] hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
