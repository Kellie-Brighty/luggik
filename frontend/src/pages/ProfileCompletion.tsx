import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileCompletion() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, refreshKycStatus } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/runner/login');
    }
  }, [user, navigate]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/kyc/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          companyName
        })
      });

      if (!res.ok) throw new Error("Failed to register company profile");

      await refreshKycStatus();
      navigate('/runner/kyc');
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
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
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="text-slate-500 mt-1 text-center">We need your company name to match your legal documents for KYC.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleCompleteProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nomba-yellow focus:border-transparent transition-all"
              placeholder="E.g. FastMove Logistics"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-nomba-dark text-nomba-yellow py-3.5 rounded-xl font-medium hover:bg-black transition-colors mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Saving...' : 'Continue to KYC'}
          </button>
        </form>
      </div>
    </div>
  );
}
