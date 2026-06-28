import { ArrowLeft, CheckCircle2, Navigation, PackageSearch, Loader2, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

// Matches the backend Errand interface
interface Errand {
  id: string;
  itemName: string;
  priceAmount: number;
  deliveryFee: number;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  state: string;
}

export default function RunnerDashboard() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, kycStatus } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/runner/login');
      return;
    }
    if (kycStatus !== 'approved') {
      navigate('/runner/kyc');
      return;
    }
    fetchErrands();
  }, [user, kycStatus, navigate]);

  const fetchErrands = async () => {
    try {
      const response = await fetch('/api/errands/available');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch errands");
      setErrands(data.errands || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (errandId: string) => {
    setAcceptingId(errandId);
    try {
      const response = await fetch(`/api/errands/${errandId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runnerId: "runner-demo-999" }) // Hardcoded runner ID for demo
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept errand");
      }

      // Navigate to the active delivery tracking screen
      navigate(`/runner/tracking/${errandId}`); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Available Errands</h1>
        </header>

        {/* Gig List */}
        <div className="space-y-4">
          
          {loading && (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-nomba-yellow" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-700 border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && errands.length === 0 && (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Errands Available</h3>
              <p className="text-slate-500">Waiting for buyers to lock funds in escrow...</p>
              <button onClick={fetchErrands} className="mt-4 text-nomba-dark font-medium hover:underline">
                Refresh List
              </button>
            </div>
          )}

          {errands.map(errand => (
            <div key={errand.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-nomba-yellow/50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 group-hover:text-nomba-yellow transition-colors">{errand.itemName}</h3>
                  <p className="text-slate-500 text-sm">Escrow Locked: ₦{errand.priceAmount.toLocaleString()}</p>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  +₦{(errand.deliveryFee || 2500).toLocaleString()} Fee
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <PackageSearch className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">PICKUP</p>
                    <p className="text-sm text-slate-700">{errand.pickupLocation?.address || "Address not provided"}</p>
                  </div>
                </div>
                
                <div className="w-0.5 h-4 bg-slate-200 ml-4"></div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-nomba-yellow/20 flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4 text-nomba-dark" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">DROPOFF</p>
                    <p className="text-sm text-slate-700">{errand.dropoffLocation?.address || "Address not provided"}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleAccept(errand.id)}
                disabled={acceptingId === errand.id}
                className="w-full bg-nomba-dark text-nomba-yellow py-3 rounded-xl font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {acceptingId === errand.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {acceptingId === errand.id ? "Accepting..." : "Accept Errand"}
              </button>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
