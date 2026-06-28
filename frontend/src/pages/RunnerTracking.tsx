import { ArrowLeft, Navigation, Loader2, Package, CheckSquare, Truck, CheckCheck, PhoneCall } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ChatBox from "../components/ChatBox";

interface Errand {
  id: string;
  itemName: string;
  state: string;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  sellerPhone: string;
  buyerPhone: string;
}

export default function RunnerTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchErrand();
    
    const interval = setInterval(() => {
      fetchErrand();
    }, 3000);

    return () => {
      clearInterval(interval);
      stopGpsTracking();
    };
  }, [id]);

  // When errand state changes to IN_PROGRESS, start tracking
  useEffect(() => {
    if (errand?.state === 'IN_PROGRESS' && !gpsActive) {
      startGpsTracking();
    } else if (errand?.state === 'DELIVERED') {
      stopGpsTracking();
    }
  }, [errand?.state]);

  const fetchErrand = async () => {
    try {
      const res = await fetch(`/api/errands/${id}`);
      const data = await res.json();
      if (res.ok) setErrand(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateState = async (newState: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/errands/${id}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState })
      });
      if (res.ok) {
        setErrand(prev => prev ? { ...prev, state: newState } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGpsActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await fetch(`/api/tracking/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              timestamp: new Date().toISOString()
            })
          });
          console.log(`[GPS] Pushed location: ${latitude}, ${longitude}`);
        } catch (e) {
          console.error("Failed to push GPS", e);
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-nomba-yellow" /></div>;
  }

  if (!errand) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Errand not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/runner')} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Active Delivery</h1>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider ${
            errand.state === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {errand.state.replace('_', ' ')}
          </div>
        </header>

        {/* Map / Tracking Simulator Placeholder */}
        <div className="bg-slate-200 w-full h-48 rounded-2xl mb-6 flex flex-col items-center justify-center border border-slate-300 relative overflow-hidden">
          {gpsActive ? (
            <>
              <div className="absolute inset-0 bg-nomba-yellow/10 animate-pulse"></div>
              <Navigation className="w-10 h-10 text-nomba-dark animate-bounce" />
              <p className="mt-2 text-sm font-semibold text-nomba-dark bg-white px-3 py-1 rounded-full shadow-sm">Broadcasting GPS Location...</p>
            </>
          ) : (
            <>
              <Package className="w-10 h-10 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-500">Map available during transit</p>
            </>
          )}
        </div>

        {/* Action Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">{errand.itemName}</h2>
            <p className="text-slate-500 text-sm mt-1">Order ID: {errand.id}</p>
          </div>

          {/* Stepper Actions */}
          <div className="space-y-4">
            
            <button 
              onClick={() => updateState('PENDING_VERIFICATION')}
              disabled={updating || errand.state !== 'ACCEPTED'}
              className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                errand.state === 'ACCEPTED' ? 'bg-nomba-yellow text-nomba-dark hover:brightness-105 shadow-md hover:shadow-nomba-yellow/25' 
                : errand.state === 'CREATED' ? 'bg-slate-100 text-slate-400'
                : 'bg-green-500 text-white'
              }`}
            >
              {updating && errand.state === 'ACCEPTED' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
              {errand.state === 'ACCEPTED' ? '1. Request Buyer Verification' : 'Verification Requested'}
            </button>

            {errand.state === 'PENDING_VERIFICATION' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-800">Buyer Verification</h3>
                  <a href={`tel:${errand.buyerPhone}`} className="flex items-center gap-1 text-sm bg-slate-900 text-white px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors">
                    <PhoneCall className="w-4 h-4" /> Call Buyer
                  </a>
                </div>
                <p className="text-sm text-slate-500 mb-4">Send pictures of the item to the buyer below. They must approve before you can start transit.</p>
                <ChatBox errandId={errand.id} />
              </div>
            )}

            <button 
              onClick={() => updateState('IN_PROGRESS')}
              disabled={updating || errand.state !== 'ITEM_VERIFIED'}
              className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                errand.state === 'ITEM_VERIFIED' ? 'bg-nomba-yellow text-nomba-dark hover:brightness-105 shadow-md' 
                : errand.state === 'ACCEPTED' ? 'bg-slate-100 text-slate-400'
                : 'bg-green-500 text-white'
              }`}
            >
              {updating && errand.state === 'ITEM_VERIFIED' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
              {errand.state === 'ITEM_VERIFIED' ? '2. Start Transit (Enable GPS)' : errand.state === 'IN_PROGRESS' || errand.state === 'DELIVERED' ? 'In Transit' : 'Start Transit'}
            </button>

            <button 
              onClick={() => updateState('DELIVERED')}
              disabled={updating || errand.state !== 'IN_PROGRESS'}
              className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                errand.state === 'IN_PROGRESS' ? 'bg-nomba-dark text-nomba-yellow hover:bg-black shadow-md' 
                : errand.state === 'DELIVERED' ? 'bg-green-500 text-white'
                : 'bg-slate-100 text-slate-400'
              }`}
            >
              {updating && errand.state === 'IN_PROGRESS' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCheck className="w-5 h-5" />}
              {errand.state === 'DELIVERED' ? 'Delivery Completed!' : '3. Confirm Delivery'}
            </button>

          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Vendor Contact</p>
              <p className="font-medium text-slate-800">{errand.sellerPhone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Buyer Contact</p>
              <p className="font-medium text-slate-800">{errand.buyerPhone}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
