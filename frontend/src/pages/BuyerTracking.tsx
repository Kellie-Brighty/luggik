import { ArrowLeft, Loader2, Package, CheckSquare, Truck, Check, Clock, Lock, Info } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../firebase";

import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { luggikMapStyle } from "../utils/mapStyles";

const libraries: "places"[] = ["places"];

interface Errand {
  id: string;
  itemName: string;
  state: string;
  priceAmount: number;
  pickupLocation: { address: string, latitude: number, longitude: number };
  dropoffLocation: { address: string, latitude: number, longitude: number };
  runnerPhone?: string;
  runnerCompanyName?: string;
  actualRiderName?: string;
  trackingPin?: string;
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
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Authenticate anonymously so Firestore doesn't reject reads, only if not already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsubErrand = onSnapshot(doc(db, "errands", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Errand;
        setErrand({ ...data, id: docSnap.id });
        setLoading(false);
      }
    });

    const unsubTracking = onSnapshot(doc(db, "public_tracking", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.currentLocation) {
          setTracking(data.currentLocation);
        }
      }
    });

    return () => {
      unsubErrand();
      unsubTracking();
    };
  }, [id]);

  // Scroll to QR code when arrived at dropoff
  useEffect(() => {
    if (errand?.state === 'ARRIVED_AT_DROPOFF' && qrRef.current) {
      setTimeout(() => {
        setIsDrawerMinimized(false); // Ensure drawer is open
        qrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500); // Small delay to let the UI render the QR code section first
    }
  }, [errand?.state]);

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
    <div className="min-h-screen bg-[#FDFBF7] font-sans flex flex-col relative overflow-hidden">
      
      {/* DESKTOP HEADER */}
      <div className="hidden lg:flex items-center justify-between px-8 py-6 bg-white border-b border-[#EAEAEA] relative z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/buyer')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[#111111]">Track Order</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
            {errand.id.substring(0, 8)}...
          </div>
          <button className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50">
            <Info className="w-4 h-4" /> Help
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col-reverse lg:flex-row flex-1 relative lg:h-[calc(100vh-80px)] h-[100vh] lg:max-w-[1200px] lg:mx-auto lg:w-full lg:gap-8">
        
        {/* LEFT COLUMN (Desktop 60%) / BOTTOM SHEET (Mobile) */}
        <div className={`
          fixed bottom-0 left-0 right-0 z-40 bg-[#FDFBF7] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pt-6 max-h-[85vh] overflow-y-auto transition-transform duration-300
          ${isDrawerMinimized ? 'translate-y-[calc(100%-140px)]' : 'translate-y-0'}
          lg:relative lg:shadow-none lg:rounded-none lg:p-8 lg:max-h-none lg:overflow-y-auto lg:translate-y-0 lg:w-[60%] lg:z-10
        `}>
            {/* Mobile Handle & Drag Overlay */}
            <div className="absolute top-0 left-0 right-0 h-16 lg:hidden cursor-pointer z-10" onClick={() => setIsDrawerMinimized(!isDrawerMinimized)}></div>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 lg:hidden relative z-20 pointer-events-none"></div>

            {/* Mobile Header (Hidden on Desktop) */}
            <div className="flex items-center justify-between w-full mb-6 lg:hidden relative z-20 pointer-events-none">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/buyer')} className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-full pointer-events-auto">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="text-xl font-bold text-slate-900">Track Order</h1>
              </div>
            </div>

            <div className="w-full space-y-4 lg:space-y-6 relative z-30 pb-12">
               
               {/* Rider on the way card (Dark) */}
               <div className="bg-[#1A1A1A] rounded-2xl p-5 flex items-center justify-between text-white shadow-md">
                   <div className="flex items-center gap-4">
                       <div className="w-2.5 h-2.5 rounded-full bg-nomba-yellow animate-pulse"></div>
                       <div>
                           <h3 className="font-bold text-sm">Rider is on the way</h3>
                           <p className="text-xs text-slate-400 mt-1">{errand.actualRiderName || 'Assigning Rider'} - {errand.runnerCompanyName || 'Logistics'}</p>
                       </div>
                   </div>
                   <div className="text-nomba-yellow text-xs font-bold font-mono tracking-widest uppercase">
                      -12 MIN
                   </div>
               </div>

               {/* QR Code Card */}
               <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-[0_2px_10px_rgba(0,0,0,0.02)]" ref={qrRef}>
                  <div className="flex justify-between items-start mb-6">
                     <div>
                         <h3 className="font-bold text-[#111111]">Your delivery QR code</h3>
                         <p className="text-xs text-[#6E6B5E] mt-1.5 max-w-[200px] leading-relaxed">Show this to the rider when they arrive. They'll scan it to confirm handoff and release payment.</p>
                     </div>
                     <div className="bg-[#FFF8E7] text-[#D9A01C] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
                         Waiting
                     </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-2">
                     <div className="bg-white border-2 border-[#EAEAEA] rounded-3xl p-5 shadow-sm mb-4">
                        <QRCodeSVG 
                          value={`luggik-delivery-${errand.id}`}
                          size={140}
                          bgColor={"#ffffff"}
                          fgColor={"#111111"}
                          level={"Q"}
                          includeMargin={false}
                          imageSettings={{ src: "/favicon.svg", height: 24, width: 24, excavate: true }}
                        />
                     </div>
                     <div className="text-center">
                         <p className="font-mono text-[11px] font-bold text-[#111111] tracking-widest">LGK-{errand.id.substring(0, 12).toUpperCase()}</p>
                         <p className="text-[10px] text-[#A3A199] mt-1.5">Unique to this order - expires after scan</p>
                     </div>
                     <div className="flex items-center gap-1.5 text-[10px] text-[#A3A199] mt-6">
                         <Clock className="w-3 h-3" />
                         Valid until delivery confirmed
                     </div>
                  </div>
               </div>

               {/* Progress Timeline Card */}
               <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <p className="text-[9px] font-bold text-[#A3A199] uppercase tracking-widest mb-4">ORDER #1 - {errand.id.substring(0, 16).toUpperCase()}</p>
                  
                  <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center pb-4 border-b border-[#F5F5F5]">
                          <span className="text-xs text-[#6E6B5E]">Logistics Partner</span>
                          <span className="text-xs font-bold text-[#111111]">{errand.runnerCompanyName || 'Pending'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-[#F5F5F5]">
                          <span className="text-xs text-[#6E6B5E]">Assigned Rider</span>
                          <span className="text-xs font-bold text-[#111111]">{errand.actualRiderName || 'Pending'}</span>
                      </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative w-full h-1 bg-[#F5F5F5] rounded-full mb-6">
                    <div className="absolute top-0 left-0 h-full bg-nomba-yellow transition-all duration-1000 ease-in-out rounded-full" style={{ width: getProgressWidth() }}></div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-center relative z-10">
                      <div className="flex flex-col items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${['ACCEPTED', 'ITEM_VERIFIED', 'IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'border-[#EAF6ED] bg-[#EAF6ED] text-[#2D8A39]' : 'border-[#EAEAEA] bg-white text-[#A3A199]'}`}>
                             <CheckSquare className="w-4 h-4" />
                          </div>
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${['ACCEPTED', 'ITEM_VERIFIED', 'IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'text-[#2D8A39]' : 'text-[#A3A199]'}`}>Accepted</p>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${['ITEM_VERIFIED', 'IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'border-[#EAF6ED] bg-[#EAF6ED] text-[#2D8A39]' : 'border-[#EAEAEA] bg-white text-[#A3A199]'}`}>
                             <Package className="w-4 h-4" />
                          </div>
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${['ITEM_VERIFIED', 'IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'text-[#2D8A39]' : 'text-[#A3A199]'}`}>Verified</p>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${['IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'border-nomba-yellow bg-[#FFF8E7] text-nomba-dark' : 'border-[#EAEAEA] bg-white text-[#A3A199]'}`}>
                             <Truck className="w-4 h-4" />
                          </div>
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${['IN_PROGRESS', 'DELIVERED'].includes(errand.state) ? 'text-nomba-dark' : 'text-[#A3A199]'}`}>In Transit</p>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${errand.state === 'DELIVERED' ? 'border-[#EAF6ED] bg-[#EAF6ED] text-[#2D8A39]' : 'border-[#EAEAEA] bg-[#F5F5F5] text-[#A3A199]'}`}>
                             <Check className="w-4 h-4" />
                          </div>
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${errand.state === 'DELIVERED' ? 'text-[#2D8A39]' : 'text-[#A3A199]'}`}>Delivered</p>
                      </div>
                  </div>
               </div>

               {/* Escrow Card (Dark) */}
               <div className="bg-[#1A1A1A] rounded-2xl p-5 flex items-center justify-between text-white border border-[#2A2A2A] shadow-md">
                   <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                           <Lock className="w-4 h-4 text-nomba-yellow" />
                       </div>
                       <div>
                           <p className="text-[9px] font-bold text-[#A3A199] uppercase tracking-widest mb-0.5">Held in Escrow</p>
                           <h2 className="text-xl font-bold">₦{errand.priceAmount.toLocaleString()}</h2>
                       </div>
                   </div>
                   <div className="bg-[#2A2A2A] text-nomba-yellow text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-[#3A3A3A]">
                       Pending Release
                   </div>
               </div>

               {/* Order Details */}
               <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <p className="text-[9px] font-bold text-[#A3A199] uppercase tracking-widest mb-6">Order Details</p>
                  
                  <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6E6B5E]">Item</span>
                          <span className="text-xs font-bold text-[#111111]">{errand.itemName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6E6B5E]">Item price</span>
                          <span className="text-xs font-bold text-[#111111]">₦{(errand.priceAmount - (errand.priceAmount * 0.1)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6E6B5E]">Delivery fee</span>
                          <span className="text-xs font-bold text-[#111111]">₦{(errand.priceAmount * 0.1).toLocaleString()}</span>
                      </div>
                  </div>

                  <div className="border-t border-[#F5F5F5] pt-6 mb-6">
                     <p className="text-[9px] font-bold text-[#A3A199] uppercase tracking-widest mb-4">Route</p>
                     <div className="relative pl-6 space-y-6">
                         {/* Line connector */}
                         <div className="absolute top-2 bottom-2 left-1.5 w-px bg-[#EAEAEA]"></div>
                         
                         <div className="relative">
                            <div className="absolute top-1 -left-[23px] w-3 h-3 rounded-full border-2 border-[#111111] bg-white"></div>
                            <p className="text-[8px] font-bold text-[#A3A199] uppercase tracking-widest mb-1">Pickup</p>
                            <p className="text-xs font-bold text-[#111111] leading-relaxed">{errand.pickupLocation.address}</p>
                         </div>
                         <div className="relative">
                            <div className="absolute top-1 -left-[23px] w-3 h-3 rounded-full bg-[#111111]"></div>
                            <p className="text-[8px] font-bold text-[#A3A199] uppercase tracking-widest mb-1">Dropoff</p>
                            <p className="text-xs font-bold text-[#111111] leading-relaxed">{errand.dropoffLocation.address}</p>
                         </div>
                     </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-[#F5F5F5]">
                      <span className="text-xs text-[#6E6B5E]">Order ID</span>
                      <span className="text-[11px] font-bold text-[#111111] font-mono tracking-widest">{errand.id.substring(0, 16).toUpperCase()}</span>
                  </div>
               </div>

            </div>
        </div>

        {/* MOBILE MAP BACKGROUND / DESKTOP RIGHT COLUMN (40%) */}
        <div className="absolute inset-0 lg:static lg:w-[40%] lg:h-full z-0 bg-slate-100 lg:bg-[#FDFBF7] lg:p-8">
          <div className="w-full h-full lg:h-[280px] lg:rounded-3xl lg:overflow-hidden lg:shadow-sm lg:border lg:border-[#EAEAEA] relative">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={tracking ? { lat: tracking.latitude, lng: tracking.longitude } : errand?.pickupLocation ? { lat: errand.pickupLocation.latitude, lng: errand.pickupLocation.longitude } : { lat: 6.5244, lng: 3.3792 }}
                  zoom={tracking ? 15 : 12}
                  options={{ disableDefaultUI: true, zoomControl: false, styles: luggikMapStyle, gestureHandling: 'greedy' }}
                >
                  {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#f2c94c', strokeWeight: 5 } }} />}
                  {tracking && <Marker position={{ lat: tracking.latitude, lng: tracking.longitude }} label="🚚" zIndex={999} />}
                </GoogleMap>
              ) : (
                <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-nomba-yellow mb-2" />
                </div>
              )}
              
              {/* Live Route Badge */}
              <div className="absolute top-6 left-6 lg:left-auto lg:right-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center gap-2 z-10">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-700 tracking-widest uppercase">Live Route</span>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
