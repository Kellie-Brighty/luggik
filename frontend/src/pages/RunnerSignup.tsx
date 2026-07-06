import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { Loader2, Eye, EyeOff}  from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import slideOne from "../assets/slide-one.png";
import slideTwo from "../assets/slide-two.png";
import slideThree from "../assets/slide-three.png";

const slides = [slideOne, slideTwo, slideThree];

export default function RunnerSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refreshKycStatus } = useAuth();

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
      {/* Left Column (Image Carousel) */}
      <div className="relative w-full lg:w-1/2 h-[40vh] lg:h-screen p-4 lg:p-6 flex flex-col">
        <div className="relative w-full h-full rounded-[24px] overflow-hidden shadow-xl">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={slide}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            </div>
          ))}

          {/* Text Overlay */}
          <div className="absolute bottom-12 left-10 right-10 z-20">
            <h1 className="text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.02em] font-bold text-white font-['Space_Grotesk',sans-serif] mb-6">
              Deliver with confidence.<br />Get paid on time.
            </h1>
            
            {/* Carousel Dots */}
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
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
