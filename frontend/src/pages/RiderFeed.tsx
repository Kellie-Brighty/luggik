import { Loader2, AlertCircle, LogOut, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

interface Errand {
  id: string;
  itemName: string;
  priceAmount: number;
  deliveryFee: number;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  state: string;
  createdAt?: any;
}

export default function RiderFeed() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, role, companyId, userName } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (e) {
      console.error("Failed to logout", e);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/runner/login');
      return;
    }
    if (role === 'dispatcher') {
      navigate('/runner');
      return;
    }
    if (!companyId) {
      return;
    }

    const q = query(
      collection(db, "errands"), 
      where("runnerId", "==", companyId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let errandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Errand[];
      
      // Filter locally to avoid requiring complex composite indexes in Firestore
      errandsData = errandsData.filter(e => e.state === 'ACCEPTED');
      
      // Sort locally by creation date
      errandsData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setErrands(errandsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Errands listener error:", err);
      setError("Unable to listen for new errands in real-time. Missing permissions?");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role, companyId, navigate]);

  const handleAccept = async (errandId: string) => {
    setAcceptingId(errandId);
    try {
      const response = await fetch(`/api/errands/${errandId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualRiderName: userName || "Unknown Rider" })
      });
      
      if (!response.ok) {
        console.error("Failed to assign rider to errand");
      }

      // The rider navigates to the tracking page to begin the verification flow.
      navigate(`/runner/tracking/${errandId}`); 
    } catch (err) {
      console.error(err);
      navigate(`/runner/tracking/${errandId}`); 
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <div className="p-2 bg-nomba-yellow rounded-full">
            <CheckCircle2 className="w-6 h-6 text-nomba-dark" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex-1">Rider Feed</h1>
          <button 
            onClick={handleLogout} 
            className="text-sm font-medium text-slate-600 hover:text-red-600 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

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
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Errands Available</h3>
              <p className="text-slate-500">Wait for your dispatcher to accept new errands.</p>
            </div>
          )}

          {errands.map(errand => (
            <div key={errand.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{errand.itemName}</h3>
                  <p className="text-slate-500 text-sm">Delivery Fee: ₦{errand.deliveryFee?.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-nomba-yellow mt-2"></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">PICKUP</p>
                    <p className="text-sm text-slate-900">{errand.pickupLocation?.address || 'Vendor Location'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-nomba-dark mt-2"></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">DROPOFF</p>
                    <p className="text-sm text-slate-900">{errand.dropoffLocation?.address || 'Buyer Location'}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleAccept(errand.id)}
                disabled={acceptingId === errand.id}
                className="w-full py-4 bg-nomba-dark hover:bg-black text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {acceptingId === errand.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Start Errand"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
