import { Loader2, AlertCircle, LogOut, CheckCircle2, Check, Lock, Package, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../utils/timeUtils";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { notificationSound } from "../utils/audio";
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
  actualRiderId?: string;
}

export default function RiderFeed() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [historyErrands, setHistoryErrands] = useState<Errand[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [activeErrand, setActiveErrand] = useState<Errand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const prevErrandsLengthRef = useRef(0);
  const navigate = useNavigate();
  const { user, role, companyId } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/runner/login';
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
      
      const allRiderErrands = errandsData.filter(e => e.actualRiderId === user?.uid);
      allRiderErrands.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setHistoryErrands(allRiderErrands);

      // Find if the rider has an active errand
      const active = errandsData.find(e => 
        e.actualRiderId === user?.uid && 
        ['PENDING_VERIFICATION', 'ITEM_VERIFIED', 'IN_PROGRESS', 'ARRIVED_AT_DROPOFF'].includes(e.state)
      );
      setActiveErrand(active || null);

      // Filter locally to avoid requiring complex composite indexes in Firestore
      errandsData = errandsData.filter(e => e.state === 'ACCEPTED');
      
      // Sort locally by creation date
      errandsData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      // Play sound if new errands were added
      if (errandsData.length > prevErrandsLengthRef.current && prevErrandsLengthRef.current !== 0) {
        notificationSound.playDouble();
      }
      prevErrandsLengthRef.current = errandsData.length;

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
        body: JSON.stringify({ actualRiderId: user?.uid })
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
    <div className="min-h-screen bg-[#F7F4EC] font-sans flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-[#F7F4EC] border-b border-[#EAEAEA]">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36] shadow-sm">
            <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
          </div>
          <span className="text-[18px] font-bold tracking-tight text-[#15140F] font-['Space_Grotesk',sans-serif]">Luggik</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[#EAEAEA] border border-[#DDDDD8] rounded-full transition-colors text-[13px] font-semibold text-[#6E6B5E] hover:text-[#15140F]"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </header>

      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <h1 className="text-[20px] font-bold text-[#15140F] font-['Space_Grotesk',sans-serif]">Rider feed</h1>
          <div className="flex bg-[#EAEAEA] rounded-full p-1 sm:ml-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${activeTab === 'available' ? 'bg-white text-[#15140F] shadow-sm' : 'text-[#6E6B5E] hover:text-[#15140F]'}`}
            >
              Available
              {activeTab === 'available' && <span className="ml-2 bg-[#F7F4EC] text-[#15140F] px-1.5 py-0.5 rounded-full text-[10px]">{errands.length}</span>}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${activeTab === 'history' ? 'bg-white text-[#15140F] shadow-sm' : 'text-[#6E6B5E] hover:text-[#15140F]'}`}
            >
              History
            </button>
          </div>
        </div>

        {activeTab === 'available' ? (
          <>
            {activeErrand && (
          <div className="bg-[#15140F] rounded-[24px] p-6 mb-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-[#2A2925]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3E3C36] flex items-center justify-center shrink-0 border border-[#4B4941]">
                <Package className="w-6 h-6 text-[#FFCC00]" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#A8A398] uppercase tracking-wider mb-1">Active Errand</p>
                <h3 className="font-bold text-[18px] text-white">{activeErrand.itemName}</h3>
                <p className="text-[#8A8165] text-[13px] font-medium">{activeErrand.state.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <Link 
              to={`/runner/tracking/${activeErrand.id}`}
              className="w-full sm:w-auto px-8 py-3 bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] rounded-full text-[14px] font-bold transition-colors shrink-0 text-center shadow-[0_4px_14px_rgba(255,204,0,0.3)]"
            >
              Resume tracking
            </Link>
          </div>
        )}

        <div className="space-y-6">
          {loading && (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
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
            <div key={errand.id} className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-6">
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-bold text-[#15140F] text-[16px] min-w-0">{errand.itemName}</h3>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider block mb-1">DELIVERY FEE</span>
                  <span className="text-[18px] font-bold text-[#15140F] leading-none">₦{errand.deliveryFee?.toLocaleString() || "2,400"}</span>
                </div>
              </div>

              <div className="relative pl-6 py-2">
                {/* Vertical Line */}
                <div className="absolute left-[5px] top-[14px] bottom-[14px] w-[2px] border-l-2 border-dashed border-[#DDDDD8]"></div>
                
                {/* Pickup */}
                <div className="relative mb-8">
                  <div className="absolute left-[-24px] top-1.5 w-3 h-3 rounded-full border-[2px] border-[#A8A398] bg-white"></div>
                  <p className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider mb-1">PICKUP</p>
                  <p className="text-[14px] font-medium text-[#15140F]">{errand.pickupLocation?.address || 'Vendor Location'}</p>
                </div>
                
                {/* Dropoff */}
                <div className="relative">
                  <div className="absolute left-[-24px] top-1.5 w-3 h-3 rounded-full bg-[#15140F]"></div>
                  <p className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider mb-1">DROPOFF</p>
                  <p className="text-[14px] font-medium text-[#15140F]">{errand.dropoffLocation?.address || 'Buyer Location'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 pt-6 border-t border-[#F7F4EC] gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-[rgba(255,204,0,0.15)] text-[#E5A800] text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[rgba(255,204,0,0.3)]">
                    <Lock className="w-3 h-3" />
                    Escrow funded
                  </div>
                  <div className="bg-[#F7F4EC] border border-[#EAEAEA] text-[#6E6B5E] text-[11px] font-medium px-3 py-1.5 rounded-full">
                    ~4 km
                  </div>
                  <div className="bg-[#F7F4EC] border border-[#EAEAEA] text-[#6E6B5E] text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap">
                    {formatRelativeTime(errand.createdAt)}
                  </div>
                </div>

                <button 
                  onClick={() => handleAccept(errand.id)}
                  disabled={acceptingId === errand.id}
                  className="w-full sm:w-auto px-8 py-3 bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] rounded-full text-[14px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(255,204,0,0.3)] shrink-0 flex justify-center"
                >
                  {acceptingId === errand.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Start errand"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
        ) : (
          <div className="space-y-6">
            {!loading && historyErrands.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-2">No History</h3>
                <p className="text-slate-500">You haven't accepted any errands yet.</p>
              </div>
            )}
            
            {historyErrands.map(errand => (
              <div key={errand.id} className="bg-white rounded-[24px] p-6 border border-[#EAEAEA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-4 hover:border-[#DDDDD8] transition-colors cursor-pointer" onClick={() => navigate(`/runner/tracking/${errand.id}`)}>
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#15140F] text-[16px] mb-1">{errand.itemName}</h3>
                    <p className="text-[#8A8165] text-[13px] font-medium">{formatRelativeTime(errand.createdAt)}</p>
                  </div>
                  <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                    errand.state === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                    ['PENDING_VERIFICATION', 'ITEM_VERIFIED', 'IN_PROGRESS', 'ARRIVED_AT_DROPOFF'].includes(errand.state) ? 'bg-[#FFF5CC] text-[#E5A800]' : 
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {errand.state.replace(/_/g, ' ')}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-[#F7F4EC]">
                   <p className="text-[14px] font-medium text-[#15140F] flex items-center gap-2"><MapPin className="w-4 h-4 text-[#A8A398]" /> {errand.dropoffLocation?.address}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
