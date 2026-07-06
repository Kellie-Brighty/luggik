import { ArrowLeft, Loader2, PhoneCall, CheckCircle2, AlertCircle, ArrowRight, Store, User, MapPin, ScanLine } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ChatBox from "../components/ChatBox";
import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { luggikMapStyle } from "../utils/mapStyles";
import { Scanner } from '@yudiel/react-qr-scanner';

const libraries: "places"[] = ["places"];

interface Errand {
  id: string;
  itemName: string;
  state: string;
  pickupLocation: { address: string, latitude: number, longitude: number };
  dropoffLocation: { address: string, latitude: number, longitude: number };
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
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    if (errand?.pickupLocation?.latitude && errand?.dropoffLocation?.latitude && isLoaded && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: errand.pickupLocation.latitude, lng: errand.pickupLocation.longitude },
          destination: { lat: errand.dropoffLocation.latitude, lng: errand.dropoffLocation.longitude },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [errand?.pickupLocation?.latitude, errand?.dropoffLocation?.latitude, isLoaded]);

  useEffect(() => {
    fetchErrand();
    
    if (errand?.state === 'DELIVERED' || errand?.state === 'REJECTED_BY_BUYER') {
      return () => { stopGpsTracking(); };
    }

    const interval = setInterval(() => {
      fetchErrand();
    }, 3000);

    return () => {
      clearInterval(interval);
      stopGpsTracking();
    };
  }, [id, errand?.state]);

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
        setCurrentPosition({ lat: latitude, lng: longitude });
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
        } catch (e) {
          console.error("Failed to push GPS", e);
        }
      },
      (error) => {
        // Log warnings but do not break the app; watchPosition will automatically retry
        console.warn('Geolocation warning:', error.message);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
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
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F4EC]"><Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" /></div>;
  }

  if (!errand) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F4EC] text-slate-500">Errand not found</div>;
  }

  const getStepStatus = () => {
    const state = errand.state;
    if (state === 'ACCEPTED' || state === 'PENDING_VERIFICATION') return 1;
    if (state === 'ITEM_VERIFIED' || state === 'IN_PROGRESS') return 2;
    if (state === 'ARRIVED_AT_DROPOFF' || state === 'DELIVERED') return 3;
    return 1;
  };

  const step = getStepStatus();

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-sans flex flex-col pb-12">
      {/* Navbar */}
      <header className="flex items-center justify-between px-8 py-4 bg-[#F7F4EC] border-b border-[#EAEAEA]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/runner')} className="text-[#15140F] hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-bold text-[#15140F]">Active Delivery</h1>
        </div>
        <div className="bg-[#EAEAEA] text-[#6E6B5E] text-[12px] font-mono px-3 py-1.5 rounded-full border border-[#DDDDD8]">
          {errand.id.substring(0,8)}...
        </div>
      </header>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 py-6 border-b border-[#EAEAEA] w-full max-w-4xl mx-auto px-6">
        {/* Step 1 */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${step > 1 ? 'bg-[#027A48] text-white' : step === 1 ? 'bg-[#FFCC00] text-[#15140F]' : 'border border-[#DDDDD8] text-[#A8A398]'}`}>1</div>
          <span className={`text-[13px] ${step >= 1 ? 'font-bold text-[#15140F]' : 'font-medium text-[#A8A398]'}`}>Verify</span>
        </div>
        <div className={`w-16 sm:w-32 h-[2px] ${step > 1 ? 'bg-[#027A48]' : 'bg-[#EAEAEA]'}`}></div>
        {/* Step 2 */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${step > 2 ? 'bg-[#027A48] text-white' : step === 2 ? 'bg-[#FFCC00] text-[#15140F]' : 'border border-[#DDDDD8] text-[#A8A398]'}`}>2</div>
          <span className={`text-[13px] ${step >= 2 ? 'font-bold text-[#15140F]' : 'font-medium text-[#A8A398]'}`}>Transit</span>
        </div>
        <div className={`w-16 sm:w-32 h-[2px] ${step > 2 ? 'bg-[#027A48]' : 'bg-[#EAEAEA]'}`}></div>
        {/* Step 3 */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${step === 3 ? 'bg-[#FFCC00] text-[#15140F]' : 'border border-[#DDDDD8] text-[#A8A398]'}`}>3</div>
          <span className={`text-[13px] ${step >= 3 ? 'font-bold text-[#15140F]' : 'font-medium text-[#A8A398]'}`}>Deliver</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 py-8">
        
        {/* Map */}
        <div className="w-full h-[280px] rounded-[16px] overflow-hidden mb-8 border border-[#EAEAEA] shadow-sm relative">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={currentPosition ? currentPosition : errand?.pickupLocation ? { lat: errand.pickupLocation.latitude, lng: errand.pickupLocation.longitude } : { lat: 6.5244, lng: 3.3792 }}
              zoom={currentPosition ? 15 : 12}
              options={{ disableDefaultUI: true, zoomControl: true, styles: luggikMapStyle }}
            >
              {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#FFCC00', strokeWeight: 5 } }} />}
              {currentPosition && <Marker position={currentPosition} label="🚚" zIndex={999} />}
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-[#EAEAEA] flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00] mb-2" />
              <p className="text-[#A8A398] font-medium">Loading Map...</p>
            </div>
          )}

          {gpsActive && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-[#EAEAEA] text-[12px] font-bold text-[#15140F] flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Broadcasting GPS
            </div>
          )}
        </div>
        
        {/* Details block */}
        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#15140F] mb-1">{errand.itemName}</h2>
          <p className="text-[13px] text-[#A8A398] font-medium mb-4">Order ID: {errand.id}</p>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#A8A398] font-bold">
            <div className={`w-2.5 h-2.5 rounded-full ${(errand.state === 'PENDING_VERIFICATION' || errand.state === 'IN_PROGRESS' || errand.state === 'ARRIVED_AT_DROPOFF') ? 'bg-[#FFCC00]' : 'bg-[#EAEAEA]'}`}></div>
            {errand.state === 'IN_PROGRESS' ? 'IN TRANSIT - EN ROUTE TO BUYER' : errand.state === 'ARRIVED_AT_DROPOFF' ? 'CONFIRM DELIVERY' : errand.state.replace('_', ' ')}
          </div>
        </div>

        {/* Action Panel (Verification or Delivery block depending on state) */}
        {errand.state === 'PENDING_VERIFICATION' && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            {/* Yellow warning banner */}
            <div className="bg-[#FFF8E6] border border-[#FFEA80] rounded-[12px] p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-[#E5A800] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#6E6B5E]">
                Send pictures of the item to the buyer. <strong className="text-[#15140F]">They must approve</strong> before you can start transit.
              </p>
            </div>

            {/* Buyer Verification block */}
            <div className="bg-transparent border border-[#EAEAEA] rounded-[16px] overflow-hidden mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-[15px] font-bold text-[#15140F]">Buyer verification</h3>
                  <p className="text-[13px] text-[#A8A398] mt-1 max-w-[280px] leading-relaxed">Share photos of the item so the buyer can confirm it matches what they ordered.</p>
                </div>
                <a href={`tel:${errand.buyerPhone}`} className="flex items-center gap-2 bg-[#15140F] hover:bg-[#2A2925] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-[24px] text-[13px] font-semibold transition-colors shadow-sm shrink-0 whitespace-nowrap">
                  <PhoneCall className="w-4 h-4 shrink-0" /> 
                  <span className="leading-tight">Call buyer</span>
                </a>
              </div>
              
              <div className="bg-[#FAFAFA] border-t border-[#EAEAEA]">
                <ChatBox errandId={errand.id} viewerRole="runner" />
              </div>
            </div>
          </div>
        )}

        {errand.state === 'ITEM_VERIFIED' && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-[#ECFDF3] border border-[#D1FADF] rounded-[12px] p-4 flex items-start gap-3 mb-6">
              <CheckCircle2 className="w-5 h-5 text-[#027A48] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[13px] font-bold text-[#027A48] mb-0.5">Verification successful</h3>
                <p className="text-[13px] text-[#027A48]/80">The buyer has confirmed the item. You can now safely begin transit.</p>
              </div>
            </div>
          </div>
        )}

        {errand.state === 'IN_PROGRESS' && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[16px] p-5 mb-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h3 className="text-[16px] font-bold text-[#15140F] mb-1">You're on your way</h3>
              <p className="text-[13px] text-[#A8A398] mb-6 leading-relaxed">
                Head to the dropoff address. Contact the buyer if you run into any issues en route.
              </p>
              
              <div className="relative pl-6 mb-6">
                <div className="absolute top-2 bottom-2 left-1.5 w-[2px] bg-gradient-to-b from-[#10B981] to-[#EAEAEA]"></div>
                
                <div className="mb-6 relative">
                  <div className="absolute -left-[26.5px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-[3px] border-[#10B981] z-10"></div>
                  <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider mb-0.5">Pickup (Done)</div>
                  <div className="text-[14px] text-[#15140F] font-medium leading-snug">{errand.pickupLocation.address}</div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-[26.5px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#15140F] z-10"></div>
                  <div className="text-[10px] font-bold text-[#A8A398] uppercase tracking-wider mb-0.5">Dropoff</div>
                  <div className="text-[14px] text-[#15140F] font-medium leading-snug">{errand.dropoffLocation.address}</div>
                </div>
              </div>

              <a href={`tel:${errand.buyerPhone}`} className="flex items-center justify-center gap-2 w-full bg-[#15140F] hover:bg-[#2A2925] text-white py-3.5 rounded-[24px] text-[14px] font-bold transition-colors shadow-sm">
                <PhoneCall className="w-4 h-4" /> Call buyer
              </a>
            </div>

            <div className="flex gap-3 mb-8">
              <div className="flex-1 bg-[#EAEAEA]/40 border border-[#EAEAEA] rounded-[12px] p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-[#EAEAEA]">
                  <Store className="w-5 h-5 text-[#6E6B5E]" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-[#A8A398] uppercase tracking-wider mb-0.5">Vendor</div>
                  <div className="text-[13px] font-bold text-[#15140F] truncate">{errand.sellerPhone}</div>
                </div>
              </div>
              
              <div className="flex-1 bg-[#EAEAEA]/40 border border-[#EAEAEA] rounded-[12px] p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-[#EAEAEA]">
                  <User className="w-5 h-5 text-[#6E6B5E]" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-[#A8A398] uppercase tracking-wider mb-0.5">Buyer</div>
                  <div className="text-[13px] font-bold text-[#15140F] truncate">{errand.buyerPhone}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {errand.state === 'ARRIVED_AT_DROPOFF' && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[16px] p-5 mb-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h3 className="text-[16px] font-bold text-[#15140F] mb-1">Confirm handoff</h3>
              <p className="text-[13px] text-[#A8A398] mb-6 leading-relaxed">
                Scan the buyer's secure QR code to verify the handoff. This securely releases payment from escrow.
              </p>
              
              <button 
                onClick={() => setIsScanning(true)}
                className="w-full border border-dashed border-[#DDDDD8] bg-[#F7F4EC] rounded-[12px] p-4 flex items-center gap-3 hover:bg-[#F2EFE5] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[#EAEAEA] flex items-center justify-center shrink-0 group-hover:bg-[#DDDDD8] transition-colors">
                  <ScanLine className="w-5 h-5 text-[#6E6B5E]" />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#15140F]">Scan QR Code</div>
                  <div className="text-[12px] text-[#A8A398] font-medium">Tap to open camera scanner</div>
                </div>
              </button>
            </div>

            <div className="flex gap-3 mb-8">
              <div className="flex-1 bg-[#EAEAEA]/40 border border-[#EAEAEA] rounded-[12px] p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-[#EAEAEA]">
                  <Store className="w-5 h-5 text-[#6E6B5E]" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-[#A8A398] uppercase tracking-wider mb-0.5">Vendor</div>
                  <div className="text-[13px] font-bold text-[#15140F] truncate">{errand.sellerPhone}</div>
                </div>
              </div>
              
              <div className="flex-1 bg-[#EAEAEA]/40 border border-[#EAEAEA] rounded-[12px] p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-[#EAEAEA]">
                  <User className="w-5 h-5 text-[#6E6B5E]" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-[#A8A398] uppercase tracking-wider mb-0.5">Buyer</div>
                  <div className="text-[13px] font-bold text-[#15140F] truncate">{errand.buyerPhone}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls at the very bottom */}
        <div className="flex flex-col gap-4 mt-8">
          {errand.state === 'ACCEPTED' ? (
            <button 
              onClick={() => updateState('PENDING_VERIFICATION')}
              disabled={updating}
              className="w-full py-4 rounded-full font-bold text-[15px] transition-colors bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] shadow-[0_4px_14px_rgba(255,204,0,0.3)] flex justify-center items-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Request verification
            </button>
          ) : errand.state === 'PENDING_VERIFICATION' ? (
            <button 
              disabled={true}
              className="w-full py-4 rounded-full font-bold text-[15px] bg-[#FFF5CC] text-[#E5A800] flex justify-center items-center gap-2 cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" /> Start transit
            </button>
          ) : errand.state === 'ITEM_VERIFIED' ? (
             <button 
              onClick={() => updateState('IN_PROGRESS')}
              disabled={updating}
              className="w-full py-4 rounded-full font-bold text-[15px] transition-colors bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] shadow-[0_4px_14px_rgba(255,204,0,0.3)] flex justify-center items-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Start transit
            </button>
          ) : errand.state === 'IN_PROGRESS' ? (
            <button 
              onClick={() => updateState('ARRIVED_AT_DROPOFF')}
              disabled={updating}
              className="w-full py-4 rounded-full font-bold text-[15px] transition-colors bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] shadow-[0_4px_14px_rgba(255,204,0,0.3)] flex justify-center items-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              I've arrived at dropoff
            </button>
          ) : errand.state === 'ARRIVED_AT_DROPOFF' ? (
            <button 
              disabled={true}
              className="w-full py-4 rounded-full font-bold text-[15px] bg-[#F2ECD8] text-[#8A8165] flex justify-center items-center gap-2 cursor-not-allowed transition-colors"
            >
              <CheckCircle2 className="w-5 h-5" />
              Awaiting QR scan...
            </button>
          ) : null}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <button onClick={() => setIsScanning(false)} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-white font-bold text-lg">Scan Buyer's QR Code</h2>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative bg-black">
            <Scanner 
              onScan={(result) => {
                const text = result[0]?.rawValue;
                if (text === `luggik-delivery-${errand.id}`) {
                  setIsScanning(false);
                  updateState('DELIVERED');
                } else {
                  setScanError("Invalid QR Code. Make sure you are scanning the correct buyer's screen.");
                  setTimeout(() => setScanError(null), 3000);
                }
              }}
              components={{ finder: true, audio: false } as any}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
            
            {scanError && (
              <div className="absolute bottom-10 left-4 right-4 bg-red-500 text-white p-4 rounded-xl text-center font-bold shadow-lg animate-in fade-in slide-in-from-bottom-4">
                {scanError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
