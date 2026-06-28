import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { Package, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function RunnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refreshKycStatus } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const res = await fetch(`/api/kyc/status/${userCredential.user.uid}`);
      if (res.ok) {
        const data = await res.json();
        await refreshKycStatus();
        if (data.kycStatus === 'approved') {
          navigate('/runner');
        } else {
          navigate('/runner/kyc');
        }
      } else if (res.status === 404) {
        navigate('/runner/complete-profile');
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
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
        await refreshKycStatus();
        if (data.kycStatus === 'approved') {
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
    <div className="min-h-screen bg-slate-50 font-sans p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-nomba-yellow rounded-xl flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-nomba-dark" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 mt-1">Log in to your Logistics Partner account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nomba-yellow focus:border-transparent transition-all"
              placeholder="company@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nomba-yellow focus:border-transparent transition-all pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-nomba-dark text-nomba-yellow py-3.5 rounded-xl font-medium hover:bg-black transition-colors mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div className="my-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-slate-200 after:mt-0.5 after:flex-1 after:border-t after:border-slate-200">
          <p className="mx-4 mb-0 text-center font-semibold text-slate-500 text-sm">OR</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-medium hover:bg-slate-50 transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account? <Link to="/runner/signup" className="text-nomba-dark font-semibold hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
