import { ArrowLeft, Loader2, Package, CheckSquare, Truck, CheckCheck, MapPin, CheckCircle2, XCircle, CheckCircle, Copy, Check, QrCode } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../firebase";
import ChatBox from "../components/ChatBox";
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
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

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
        
        // Intercept approval to send an automated system message in chat
        if (newState === 'ITEM_VERIFIED') {
          try {
            await addDoc(collection(db, 'chats', id as string, 'messages'), {
              text: '✅ Item Approved. Please pick it up and start transit.',
              senderId: 'buyer',
              senderName: 'Buyer',
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error('Failed to send automated chat message', e);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
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
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">{errand.itemName}</h2>
            {(errand.runnerCompanyName || errand.actualRiderName) && (
              <div className="mt-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 inline-block w-full">
                {errand.runnerCompanyName && (
                  <p className="text-slate-600 flex items-center justify-between">
                    <span className="font-medium text-slate-500">Logistics Partner</span> 
                    <span className="font-semibold text-slate-900">{errand.runnerCompanyName}</span>
                  </p>
                )}
                {errand.actualRiderName && (
                  <p className="text-slate-600 mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-medium text-slate-500">Assigned Rider</span> 
                    <span className="font-semibold text-slate-900">{errand.actualRiderName}</span>
                  </p>
                )}
              </div>
            )}
          </div>
          
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

        {/* Share Tracking Link */}
        <div className="bg-white rounded-3xl p-8 border border-[#EAEAEA] shadow-[0_2px_20px_rgba(0,0,0,0.03)] w-full mb-6">
          <h3 className="text-xl font-bold text-[#111111] mb-2">Share with Vendor</h3>
          <p className="text-[#6E6B5E] text-sm mb-6">Send this secure link and PIN to the vendor so they can verify the escrow and track the rider.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">Tracking Link</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={window.location.href}
                  className="flex-1 bg-[#F9F9F9] border border-[#EAEAEA] rounded-xl px-4 py-3 text-[#111111] text-sm outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-[#2A2925] text-white px-4 py-3 rounded-xl hover:bg-[#111111] transition-colors flex items-center justify-center min-w-[50px]"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {errand.trackingPin && (
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">Tracking PIN</label>
                <div className="bg-[#F9F9F9] border border-[#EAEAEA] rounded-xl px-4 py-3 text-center">
                  <span className="font-mono text-2xl tracking-[0.25em] font-bold text-[#4466b0]">{errand.trackingPin}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {errand.state === 'PENDING_VERIFICATION' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Item Verification Required</h2>
            <p className="text-slate-500 text-sm mb-4">Your runner is at the vendor. Please communicate with them to verify the item. You must approve the item before they can pick it up.</p>
            
            <ChatBox errandId={errand.id} viewerRole="buyer" />

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => updateState('REJECTED_BY_BUYER')}
                disabled={updating}
                className="flex-1 py-3 bg-red-50 text-red-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Reject & Cancel
              </button>
              <button
                onClick={() => updateState('ITEM_VERIFIED')}
                disabled={updating}
                className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Approve & Pick Up
              </button>
            </div>
          </div>
        )}

        {errand.state === 'ARRIVED_AT_DROPOFF' && (
          <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#EAEAEA] mb-6 text-center">
            <div className="w-16 h-16 bg-[#F7F4EC] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-[#111111]" />
            </div>
            <h2 className="text-2xl font-bold text-[#111111] mb-2">Delivery Handshake</h2>
            <p className="text-[#6E6B5E] text-sm mb-8 max-w-sm mx-auto">
              Your runner has arrived! Please show them this secure QR code to scan. This will confirm the handoff and release the escrow.
            </p>
            
            <div className="bg-white border-2 border-[#EAEAEA] rounded-3xl p-6 inline-block mx-auto shadow-sm">
              <QRCodeSVG 
                value={`luggik-delivery-${errand.id}`}
                size={220}
                bgColor={"#ffffff"}
                fgColor={"#111111"}
                level={"H"}
                includeMargin={false}
              />
            </div>
          </div>
        )}

        {/* Live Map / GPS Mock */}
        <div className="w-full h-80 rounded-2xl mb-6 overflow-hidden border border-slate-300 shadow-sm relative">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={tracking ? { lat: tracking.latitude, lng: tracking.longitude } : errand?.pickupLocation ? { lat: errand.pickupLocation.latitude, lng: errand.pickupLocation.longitude } : { lat: 6.5244, lng: 3.3792 }}
              zoom={tracking ? 15 : 12}
              options={{ disableDefaultUI: true, zoomControl: true, styles: luggikMapStyle }}
            >
              {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#f2c94c', strokeWeight: 5 } }} />}
              {tracking && <Marker position={{ lat: tracking.latitude, lng: tracking.longitude }} label="🚚" zIndex={999} />}
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-nomba-yellow mb-2" />
              <p className="text-slate-500 font-medium">Loading Map...</p>
            </div>
          )}

          {/* Overlay Status */}
          {['CREATED', 'ESCROW_LOCKED', 'DELIVERED', 'REJECTED_BY_BUYER', 'CANCELLED', 'COMPLETED'].includes(errand.state) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              {errand.state === 'DELIVERED' ? (
                <div className="flex flex-col items-center text-green-700">
                  <CheckCircle2 className="w-12 h-12 mb-2" />
                  <p className="font-semibold text-lg">Package Delivered Successfully</p>
                </div>
              ) : errand.state === 'REJECTED_BY_BUYER' ? (
                <div className="flex flex-col items-center text-red-600">
                  <XCircle className="w-12 h-12 mb-2" />
                  <p className="font-semibold text-lg">Errand Cancelled</p>
                  <p className="text-sm mt-1 text-red-500 text-center">Your escrow refund is processing.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <MapPin className="w-10 h-10 mb-2" />
                  <p className="font-medium">Live tracking will appear during transit</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
