import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Lock, CheckCircle2, Check } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { luggikMapStyle } from "../utils/mapStyles";

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export default function VendorTracking() {
  const { id } = useParams<{ id: string }>();
  // const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errandData, setErrandData] = useState<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [isAuthReady, setIsAuthReady] = useState(false);

  // Authenticate anonymously so Firestore doesn't reject reads, only if not already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/errands/${id}/verify-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingPin: pin })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid PIN");
      
      setErrandData(data.errand);
    } catch (e: any) {
      setError(e.message || "Failed to verify PIN");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!errandData || !id || !isAuthReady) return;
    
    // Subscribe to public_tracking for live updates after PIN is verified
    const unsub = onSnapshot(doc(db, "public_tracking", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setErrandData((prev: any) => ({
          ...prev,
          state: data.state || prev.state,
          actualRiderName: data.actualRiderName || prev.actualRiderName,
          actualRiderPlateNumber: data.actualRiderPlateNumber || prev.actualRiderPlateNumber,
          actualRiderImageUrl: data.actualRiderImageUrl || prev.actualRiderImageUrl,
          runnerCompanyName: data.runnerCompanyName || prev.runnerCompanyName,
          currentLocation: data.currentLocation || prev.currentLocation
        }));
      }
    });

    return () => unsub();
  }, [id, !!errandData, isAuthReady]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F4EC]"><Loader2 className="w-8 h-8 animate-spin text-[#111111]" /></div>;
  }

  if (!errandData) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-[#EAEAEA]">
          <div className="w-16 h-16 bg-[#F7F4EC] rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#111111]" />
          </div>
          <h2 className="text-[24px] font-bold text-center text-[#111111] mb-2">Track Errand</h2>
          <p className="text-[#6E6B5E] text-center text-[15px] mb-8">Enter the 4-digit Tracking PIN provided by the buyer to view the rider's status.</p>
          
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full text-center tracking-[1em] text-3xl font-mono py-4 bg-[#F9F9F9] border border-[#EAEAEA] rounded-xl outline-none focus:border-[#111111] transition-colors"
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>
            
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="w-full bg-[#111111] text-white py-[16px] rounded-full font-semibold text-[15px] hover:bg-black transition-colors disabled:opacity-50 flex justify-center items-center h-[56px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'View Tracking'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const center = {
    lat: errandData.pickupLocation.latitude,
    lng: errandData.pickupLocation.longitude
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-sans flex flex-col">
      <div className="bg-white border-b border-[#EAEAEA] p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36]">
            <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
          </div>
          <div>
            <h1 className="font-bold text-[#111111] text-[18px]">Luggik</h1>
            <p className="text-[#6E6B5E] text-xs">For {errandData.itemName}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[20px] font-bold text-[#111111]">₦{Number(errandData.priceAmount).toLocaleString()}</p>
          <div className="flex items-center gap-1 text-green-600 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Escrow Funded</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-[400px]">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          center={center}
          zoom={14}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            styles: luggikMapStyle
          }}
        >
          {/* We only show the pickup marker here to protect the buyer's dropoff location */}
          <Marker 
            position={center}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#111111"/><circle cx="12" cy="9" r="3" fill="#FFCC00"/></svg>'),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32),
            }}
          />
          {errandData.currentLocation && (
            <Marker 
              position={{ lat: errandData.currentLocation.latitude, lng: errandData.currentLocation.longitude }}
              label="🚚"
              zIndex={999}
            />
          )}
        </GoogleMap>
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-[#EAEAEA] max-w-md mx-auto">
            <h3 className="text-lg font-bold text-[#111111] mb-1">Rider Status</h3>
            <p className="text-[#6E6B5E] text-sm mb-4">
              {errandData.state === 'ACCEPTED' ? 'Rider is on the way to pickup' :
               errandData.state === 'PENDING_VERIFICATION' ? 'Rider is at your location for verification' :
               errandData.state === 'ITEM_VERIFIED' ? 'Item verified, rider preparing to transit' :
               errandData.state === 'IN_PROGRESS' ? 'Item is in transit to destination' :
               errandData.state === 'DELIVERED' ? 'Item has been successfully delivered' :
               'Awaiting rider assignment'}
            </p>
            
            {errandData.actualRiderName && (
              <div className="flex items-center gap-4 bg-[#F9F9F9] p-4 rounded-xl border border-[#EAEAEA]">
                {errandData.actualRiderImageUrl ? (
                  <img src={errandData.actualRiderImageUrl} alt="Rider" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#EAEAEA] flex items-center justify-center text-[#111111] font-bold">
                    {errandData.actualRiderName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-[#111111]">{errandData.actualRiderName}</p>
                  <p className="text-sm text-[#6E6B5E]">{errandData.runnerCompanyName} • {errandData.actualRiderPlateNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
