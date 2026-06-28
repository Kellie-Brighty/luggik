import { ArrowLeft, Navigation, Loader2, Package, CheckSquare, Truck, CheckCheck, MapPin, CheckCircle2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface Errand {
  id: string;
  itemName: string;
  state: string;
  priceAmount: number;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  runnerPhone?: string;
}

interface TrackingData {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export default function BuyerTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll for errand state and tracking updates every 3 seconds
  useEffect(() => {
    fetchErrand();
    fetchTracking();

    const interval = setInterval(() => {
      fetchErrand();
      fetchTracking();
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  const fetchErrand = async () => {
    try {
      const res = await fetch(`/api/errands/${id}`);
      if (res.ok) {
        setErrand(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/tracking/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latestLocation) {
          setTracking(data.latestLocation);
        }
      }
    } catch (e) {
      console.error("Failed to fetch tracking", e);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-nomba-yellow" /></div>;
  }

  if (!errand) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Errand not found</div>;
  }

  // Progress Bar Helper
  const getProgressWidth = () => {
    switch (errand.state) {
      case 'CREATED': return '0%';
      case 'ACCEPTED': return '25%';
      case 'ITEM_VERIFIED': return '50%';
      case 'IN_PROGRESS': return '75%';
      case 'DELIVERED': return '100%';
      default: return '0%';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/buyer')} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Track Order</h1>
          </div>
          <div className="text-sm font-mono text-slate-500">
            ID: {errand.id.substring(0, 8)}...
          </div>
        </header>

        {/* Status Progress Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">{errand.itemName}</h2>
          
          <div className="relative w-full h-2 bg-slate-100 rounded-full mb-8">
            <div 
              className="absolute top-0 left-0 h-full bg-nomba-yellow rounded-full transition-all duration-1000 ease-in-out"
              style={{ width: getProgressWidth() }}
            ></div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className={`flex flex-col items-center gap-2 ${['ACCEPTED', 'ITEM_VERIFIED', 'IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'text-nomba-dark' : 'text-slate-300'}`}>
              <CheckSquare className="w-5 h-5" />
              <p className="text-[10px] font-bold uppercase">Accepted</p>
            </div>
            <div className={`flex flex-col items-center gap-2 ${['ITEM_VERIFIED', 'IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'text-nomba-dark' : 'text-slate-300'}`}>
              <Package className="w-5 h-5" />
              <p className="text-[10px] font-bold uppercase">Verified</p>
            </div>
            <div className={`flex flex-col items-center gap-2 ${['IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'text-nomba-dark' : 'text-slate-300'}`}>
              <Truck className="w-5 h-5" />
              <p className="text-[10px] font-bold uppercase">In Transit</p>
            </div>
            <div className={`flex flex-col items-center gap-2 ${errand.state === 'DELIVERED' ? 'text-green-600' : 'text-slate-300'}`}>
              <CheckCheck className="w-5 h-5" />
              <p className="text-[10px] font-bold uppercase">Delivered</p>
            </div>
          </div>
        </div>

        {/* Live Map / GPS Mock */}
        <div className="bg-slate-200 w-full h-64 rounded-2xl mb-6 flex flex-col items-center justify-center border border-slate-300 relative overflow-hidden">
          {errand.state === 'IN_PROGRESS' && tracking ? (
            <>
              <div className="absolute inset-0 bg-nomba-dark/5"></div>
              <div className="absolute w-full h-full p-4 flex flex-col justify-end">
                <div className="bg-white/90 backdrop-blur-sm self-start px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Lat: {tracking.latitude.toFixed(4)}, Lng: {tracking.longitude.toFixed(4)}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-nomba-yellow/20 rounded-full animate-ping"></div>
                <Navigation className="w-10 h-10 text-nomba-dark relative z-10" />
              </div>
              <p className="mt-6 text-sm font-semibold text-slate-700 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">Runner is moving towards you...</p>
            </>
          ) : errand.state === 'DELIVERED' ? (
             <div className="flex flex-col items-center text-green-700">
               <CheckCircle2 className="w-12 h-12 mb-2" />
               <p className="font-semibold">Package Delivered Successfully</p>
             </div>
          ) : (
            <>
              <MapPin className="w-10 h-10 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-500">Live tracking will appear during transit</p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
