import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, MapPin, Loader2, Building2, Check, AlertTriangle } from "lucide-react";
import { useJsApiLoader, Autocomplete, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { luggikMapStyle } from "../utils/mapStyles";
import BankSelector from '../components/BankSelector';

const libraries: "places"[] = ["places"];

export default function BuyerDashboard() {
  const navigate = useNavigate();

  const [itemName, setItemName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState(""); 
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");

  const [vendorBankCode, setVendorBankCode] = useState("");
  const [vendorAccountNumber, setVendorAccountNumber] = useState("");
  const [vendorAccountName, setVendorAccountName] = useState("");
  const [verifyingVendorAccount, setVerifyingVendorAccount] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);

  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [fetchingQuotes, setFetchingQuotes] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [activeErrand, setActiveErrand] = useState<{ id: string, state: string } | null>(null);

  const [pickupAutocomplete, setPickupAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [dropoffAutocomplete, setDropoffAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverPin, setRecoverPin] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const itemPriceNum = Number(priceAmount.replace(/,/g, "")) || 0;
  const deliveryFeeNum = selectedQuote ? selectedQuote.priceAmount : 0;
  const platformFee = 50;
  const total = itemPriceNum + deliveryFeeNum + platformFee;

  useEffect(() => {
    const checkActiveErrands = async () => {
      try {
        const stored = localStorage.getItem('luggik_buyer_errands');
        if (stored) {
          const errands = JSON.parse(stored);
          if (errands && errands.length > 0) {
            for (let i = errands.length - 1; i >= 0; i--) {
              const currentId = errands[i];
              const docSnap = await getDoc(doc(db, "errands", currentId));
              if (docSnap.exists()) {
                const data = docSnap.data();
                if (!['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED_BY_BUYER'].includes(data.state)) {
                  setActiveErrand({ id: currentId, state: data.state });
                  break; // Found the active one, stop searching
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to check active errands', e);
      }
    };
    checkActiveErrands();
  }, []);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch('/api/banks');
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) setBanks(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch banks", err);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    const verifyAccount = async () => {
      if (vendorAccountNumber.length === 10 && vendorBankCode) {
        setVerifyingVendorAccount(true);
        setVendorAccountName("");
        try {
          const res = await fetch('/api/banks/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountNumber: vendorAccountNumber, bankCode: vendorBankCode })
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.data && data.data.accountName) {
              setVendorAccountName(data.data.accountName);
            } else {
              setVendorAccountName("Account not found");
            }
          } else {
            setVendorAccountName("Verification failed");
          }
        } catch (err) {
          setVendorAccountName("Verification error");
        } finally {
          setVerifyingVendorAccount(false);
        }
      } else {
        setVendorAccountName("");
      }
    };
    verifyAccount();
  }, [vendorAccountNumber, vendorBankCode]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords && isLoaded && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: pickupCoords,
          destination: dropoffCoords,
          // Using TWO_WHEELER (if available) or WALKING to ignore strict driving rules (like one-ways and highway bias) and find the most direct physical line
          travelMode: window.google.maps.TravelMode.WALKING,
          provideRouteAlternatives: true,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            let shortestRouteIndex = 0;
            let minDistance = Infinity;

            result.routes.forEach((route, index) => {
              let totalDistance = 0;
              route.legs.forEach(leg => {
                if (leg.distance) {
                  totalDistance += leg.distance.value;
                }
              });
              if (totalDistance < minDistance) {
                minDistance = totalDistance;
                shortestRouteIndex = index;
              }
            });

            // Keep only the shortest route so the renderer draws it
            result.routes = [result.routes[shortestRouteIndex]];
            
            setDirections(result);
          } else {
            console.error("Directions request failed due to " + status);
            setDirections(null);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [pickupCoords, dropoffCoords, isLoaded]);

  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) {
      setQuotes([]);
      setSelectedQuote(null);
      return;
    }

    const fetchQuotes = async () => {
      setFetchingQuotes(true);
      try {
        const res = await fetch("/api/errands/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupLocation: { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
            dropoffLocation: { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng }
          })
        });

        if (!res.ok) {
          throw new Error("Failed to fetch quotes");
        }

        const data = await res.json();
        setQuotes(data.quotes || []);
        setSelectedQuote(null);
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setFetchingQuotes(false);
      }
    };

    fetchQuotes();
  }, [pickupCoords, dropoffCoords]);

  const onPickupPlaceChanged = () => {
    if (pickupAutocomplete !== null) {
      const place = pickupAutocomplete.getPlace();
      if (place.geometry?.location) {
        setPickupAddress(place.formatted_address || place.name || "");
        setPickupCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    }
  };

  const onDropoffPlaceChanged = () => {
    if (dropoffAutocomplete !== null) {
      const place = dropoffAutocomplete.getPlace();
      if (place.geometry?.location) {
        setDropoffAddress(place.formatted_address || place.name || "");
        setDropoffCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    }
  };

  const handlePayAndCreate = async () => {
    if (!selectedQuote) return;

    setLoading(true);
    try {
      const payload = {
        buyerId: `anon-${Date.now()}`,
        sellerId: `vendor-${Date.now()}`,
        itemName,
        priceAmount: itemPriceNum,
        deliveryFee: deliveryFeeNum,
        currency: 'NGN',
        pickupLocation: {
          address: pickupAddress,
          latitude: pickupCoords!.lat,
          longitude: pickupCoords!.lng
        },
        dropoffLocation: {
          address: dropoffAddress,
          latitude: dropoffCoords!.lat,
          longitude: dropoffCoords!.lng
        },
        buyerName,
        sellerName: vendorName,
        buyerPhone,
        sellerPhone: vendorPhone,
        buyerEmail,
        sellerEmail: vendorEmail,
        runnerId: selectedQuote.companyId,
        runnerCompanyName: selectedQuote.companyName,
        vendorBankDetails: {
          bankCode: vendorBankCode,
          accountNumber: vendorAccountNumber,
          accountName: vendorAccountName
        }
      };

      const response = await fetch("/api/errands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create errand");

      const newId = data.errandId;

      try {
        const stored = localStorage.getItem('luggik_buyer_errands');
        const errands = stored ? JSON.parse(stored) : [];
        if (!errands.includes(newId)) {
          errands.push(newId);
          localStorage.setItem('luggik_buyer_errands', JSON.stringify(errands));
        }
      } catch (e) {
        console.error('Failed to save to local storage', e);
      }

      navigate(`/buyer/checkout/${newId}`, { 
        state: { 
          trackingPin: data.trackingPin, 
          masterPin: data.masterPin 
        } 
      });
    } catch (e: any) {
      console.error(e);
      setErrorModalMessage(e.message || 'Failed to create errand. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onLoadDropoff = (autocomplete: google.maps.places.Autocomplete) => {
    setDropoffAutocomplete(autocomplete);
  };

  const handleRecoverHistory = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!recoverPhone || !recoverPin) {
      setErrorModalMessage("Please enter your phone number and PIN.");
      return;
    }
    setRecoverLoading(true);
    try {
      const response = await fetch("/api/buyers/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: recoverPhone, masterPin: recoverPin })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to recover history");
      
      if (data.errandIds && data.errandIds.length > 0) {
        localStorage.setItem('luggik_buyer_errands', JSON.stringify(data.errandIds));
        
        for (let i = data.errandIds.length - 1; i >= 0; i--) {
          const currentId = data.errandIds[i];
          const docSnap = await getDoc(doc(db, "errands", currentId));
          if (docSnap.exists()) {
            const errandData = docSnap.data();
            if (!['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED_BY_BUYER'].includes(errandData.state)) {
              setActiveErrand({ id: currentId, state: errandData.state });
              break;
            }
          }
        }
        
        // Show success state
        setRecoverySuccess(true);
      } else {
        setErrorModalMessage("No errands found for this phone number and PIN.");
      }
    } catch (e: any) {
      setErrorModalMessage(e.message || "Failed to recover history");
    } finally {
      setRecoverLoading(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-[#4466b0]" /></div>;

  return (
    <div className="min-h-screen bg-luggik-bg font-sans overflow-hidden flex flex-col">
      
      {/* Navigation Container */}
      <div className="pt-6 px-6 flex justify-center w-full mb-8">
        <nav className="flex items-center justify-between px-8 py-3 bg-transparent border border-[#EAEAEA] rounded-full w-full max-w-[1200px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36]">
              <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
            </div>
            <span className="text-[18px] font-bold tracking-tight text-[#111111] font-['Space_Grotesk',sans-serif]">Luggik</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-8">
            <Link to="/runner/login" className="text-[14px] font-medium text-[#111111] hover:opacity-80 transition-opacity">
              Driver Login
            </Link>
            <Link to="/buyer" className="flex items-center justify-center bg-black text-white px-6 py-2.5 rounded-full font-medium text-[14px] hover:bg-gray-900 transition-colors shadow-sm">
              Start an errand
            </Link>
          </div>
        </nav>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pb-24 mt-[71px]">
        
        {activeErrand && (
          <div className="w-full max-w-[1200px] mb-6 bg-[#F7F4EC] border border-[#EAEAEA] rounded-[24px] p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#EAEAEA] rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#6E6B5E]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#0B0F0E]">You have an active order</p>
                <p className="text-[13px] text-[#6E6B5E]">
                  {activeErrand.state === 'CREATED' || activeErrand.state === 'PENDING_VERIFICATION' ? 'Waiting for payment transfer to secure escrow.' : 'Order is currently in progress.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (activeErrand.state === 'CREATED' || activeErrand.state === 'ESCROW_LOCKED' || activeErrand.state === 'PENDING_VERIFICATION') {
                  navigate(`/buyer/checkout/${activeErrand.id}`);
                } else {
                  navigate(`/buyer/tracking/${activeErrand.id}`);
                }
              }}
              className="bg-[#0B0F0E] text-white px-5 py-2.5 rounded-full font-semibold text-[13px] hover:bg-[#2A2925] transition-colors whitespace-nowrap"
            >
              Resume
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-[#111111] tracking-tight">Start an errand</h1>
            <p className="text-[#6E6B5E] mt-1">Secure escrow delivery for your valuable items</p>
          </div>
          <button 
            onClick={() => {
              setRecoverySuccess(false);
              setShowRecoverModal(true);
            }}
            className="px-4 py-2 bg-white border border-[#DDDDD8] text-[#111111] text-sm font-medium rounded-full hover:bg-[#F7F4EC] transition-colors shadow-sm"
          >
            Recover History
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column - Form */}
          <div className="flex-1 w-full bg-transparent border border-[#EAEAEA] rounded-[24px] p-8 md:p-10">
            
            {/* Header */}
            <div className="flex items-start gap-4 mb-10">
              <div className="w-[44px] h-[44px] rounded-[14px] border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center shrink-0">
                <Box className="w-5 h-5 text-[#6E6B5E]" strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h2 className="text-[20px] font-bold text-[#0B0F0E] mb-1">Errand details</h2>
                <p className="text-[14px] text-[#6E6B5E] leading-[1.6]">
                  Tell us what you're buying from, and where it's going. Your payment is held in escrow until the vendor delivers.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]">1</div>
              <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Item Information</span>
              <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Item name</label>
                <input 
                  type="text" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)} 
                  className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Item price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A398] font-medium">₦</span>
                  <input 
                    type="text" 
                    value={priceAmount} 
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setPriceAmount(raw ? parseInt(raw, 10).toLocaleString("en-US") : "");
                    }} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-9 pr-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]">2</div>
              <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Your Details (Dropoff)</span>
              <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
            </div>

            <div className="space-y-4 mb-10">
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your name</label>
                <input 
                  type="text" 
                  value={buyerName} 
                  onChange={(e) => setBuyerName(e.target.value)} 
                  className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your email</label>
                  <input 
                    type="email" 
                    value={buyerEmail} 
                    onChange={(e) => setBuyerEmail(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your phone</label>
                  <input 
                    type="tel" 
                    value={buyerPhone} 
                    onChange={(e) => setBuyerPhone(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your address (delivery location)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A398]" strokeWidth={1.5} />
                  {!isLoaded ? (
                    <div className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 flex items-center gap-2 text-[15px] text-[#A8A398]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                    </div>
                  ) : (
                    <Autocomplete onLoad={onLoadDropoff} onPlaceChanged={onDropoffPlaceChanged}>
                      <input 
                        type="text" 
                        value={dropoffAddress} 
                        onChange={(e) => setDropoffAddress(e.target.value)} 
                        placeholder="Start typing your address..."
                        className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                      />
                    </Autocomplete>
                  )}
                </div>
              </div>
            </div>

            {/* Map Visualizer */}
            {isLoaded && (pickupCoords || dropoffCoords) && (
              <div className="mb-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]"><MapPin className="w-3.5 h-3.5" /></div>
                  <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Route Map</span>
                  <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
                </div>
                <div className="border border-[#DDDDD8] rounded-[16px] overflow-hidden shadow-sm">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '320px' }}
                    center={pickupCoords || dropoffCoords || { lat: 6.5244, lng: 3.3792 }}
                    zoom={12}
                    options={{ disableDefaultUI: true, styles: luggikMapStyle }}
                  >
                    {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#FFCC00', strokeWeight: 5 } }} />}
                    {!directions && pickupCoords && <Marker position={pickupCoords} label="P" />}
                    {!directions && dropoffCoords && <Marker position={dropoffCoords} label="D" />}
                  </GoogleMap>
                </div>
              </div>
            )}

            {/* Section 3 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]">3</div>
              <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Vendor Details (Pickup)</span>
              <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
            </div>

            <div className="space-y-4 mb-10">
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor name / business name</label>
                <input 
                  type="text" 
                  value={vendorName} 
                  onChange={(e) => setVendorName(e.target.value)} 
                  className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor email</label>
                  <input 
                    type="email" 
                    value={vendorEmail} 
                    onChange={(e) => setVendorEmail(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor phone</label>
                  <input 
                    type="tel" 
                    value={vendorPhone} 
                    onChange={(e) => setVendorPhone(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor address (pickup location)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A398]" strokeWidth={1.5} />
                  {!isLoaded ? (
                    <div className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 flex items-center gap-2 text-[15px] text-[#A8A398]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                    </div>
                  ) : (
                    <Autocomplete onLoad={(inst) => setPickupAutocomplete(inst)} onPlaceChanged={onPickupPlaceChanged}>
                      <input 
                        type="text" 
                        value={pickupAddress} 
                        onChange={(e) => setPickupAddress(e.target.value)} 
                        placeholder="Start typing vendor address..."
                        className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                      />
                    </Autocomplete>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor Bank</label>
                  <BankSelector 
                    banks={banks} 
                    value={vendorBankCode} 
                    onChange={setVendorBankCode} 
                    className="w-full"
                    buttonClassName="bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:border-[#CCCCCC]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Account Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={vendorAccountNumber}
                    onChange={(e) => setVendorAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]"
                    placeholder="0123456789"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Verified Account Name</label>
                <div className="w-full bg-white border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[14px] text-[#A8A398] flex items-center gap-2">
                  {verifyingVendorAccount ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    vendorAccountName || "Enter 10-digit account number to verify"
                  )}
                </div>
              </div>
            </div>

            {/* Fallback button if coords not selected */}
            {!pickupCoords || !dropoffCoords ? (
              <div className="flex justify-end pt-4">
                <button disabled className="bg-[#EAEAEA] text-[#A8A398] px-8 py-3.5 rounded-full font-semibold text-[15px] cursor-not-allowed">
                  Continue to payment
                </button>
              </div>
            ) : null}

          </div>
          
          {/* Right Column */}
          <div className="w-full lg:w-[420px] flex flex-col sticky top-8">
            {/* Escrow summary */}
            <div className="bg-[#15140F] rounded-[24px] p-8 text-[#F7F4EC] shadow-xl">
              <h3 className="text-[17px] font-bold mb-3 font-['Space_Grotesk',sans-serif]">Escrow summary</h3>
              <p className="text-[13px] text-[#A8A398] leading-[1.6] mb-8">
                This is what gets locked in escrow. Funds are released to the vendor only after you confirm delivery.
              </p>

              <div className="flex flex-col">
                <div className="flex items-center justify-between py-4 border-b border-white/10">
                  <span className="text-[13px] text-[#A8A398]">Item cost</span>
                  <span className="text-[14px] font-semibold">₦{itemPriceNum.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-white/10">
                  <span className="text-[13px] text-[#A8A398]">Delivery fee</span>
                  <span className="text-[14px] font-semibold">{selectedQuote ? `₦${deliveryFeeNum.toLocaleString()}` : "-"}</span>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-white/10">
                  <span className="text-[13px] text-[#A8A398]">Platform fee</span>
                  <span className="text-[14px] font-semibold">₦{platformFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-white/10">
                  <span className="text-[13px] text-[#A8A398]">Vendor</span>
                  <span className="text-[13px] font-medium truncate max-w-[150px] text-right">{vendorName || "-"}</span>
                </div>
                <div className="flex items-center justify-between py-5">
                  <span className="text-[14px] font-medium text-white">Total lock</span>
                  <span className="text-[24px] font-bold text-luggik-yellow font-['Space_Grotesk',sans-serif]">₦{total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Logistics Suggestions */}
            {(pickupCoords && dropoffCoords) && (
              <div className="bg-[#15140F] rounded-[24px] p-8 mt-6 shadow-xl text-[#F7F4EC]">
                <h3 className="text-[17px] font-bold mb-6 text-[#F7F4EC] font-['Space_Grotesk',sans-serif]">Delivery Quotes</h3>
                
                {fetchingQuotes ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#A8A398]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#F7F4EC] mb-4" />
                    <p className="font-medium text-[14.5px]">Calculating route...</p>
                  </div>
                ) : !quotes.length ? (
                  <div className="bg-[#1C1B18] border border-white/10 text-center p-8 rounded-[16px]">
                    <p className="text-[#F7F4EC] font-semibold text-[16px] mb-1">No delivery partners found</p>
                    <p className="text-[14px] text-[#A8A398]">Try adjusting locations.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {quotes.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedQuote(q)}
                          className={`w-full p-4 rounded-[14px] border text-left flex items-center justify-between gap-4 transition-all ${selectedQuote?.companyId === q.companyId ? 'border-luggik-yellow bg-[#1C1B18] ring-1 ring-luggik-yellow' : 'border-white/10 hover:border-white/20 bg-transparent'}`}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`w-11 h-11 bg-[#1C1B18] border rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors ${selectedQuote?.companyId === q.companyId ? 'border-luggik-yellow/30' : 'border-white/10'}`}>
                              <Building2 className={`w-5 h-5 ${selectedQuote?.companyId === q.companyId ? 'text-luggik-yellow' : 'text-[#F7F4EC]'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[15px] text-[#F7F4EC] truncate">{q.companyName}</p>
                              <p className="text-[13px] text-[#A8A398] mt-0.5">{q.distanceKm} km</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-luggik-yellow text-[18px] font-['Space_Grotesk',sans-serif]">₦{q.priceAmount.toLocaleString()}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedQuote && (
                      <div className="mt-8 pt-6 border-t border-white/10 flex flex-col">
                        <button 
                          type="button" 
                          onClick={handlePayAndCreate}
                          disabled={loading} 
                          className="w-full bg-luggik-yellow text-[#0B0F0E] px-8 py-3.5 rounded-full font-semibold text-[15px] hover:brightness-105 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0px_8px_16px_-6px_rgba(255,204,0,0.4)]"
                        >
                          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                          Pay & Lock Escrow
                        </button>
                        <p className="text-[12px] text-[#A8A398] mt-4 flex items-center justify-center gap-1">
                          🔒 Secured by Nomba Trust Engine
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Recover History Modal */}
      {showRecoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {recoverySuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">History Recovered!</h3>
                <p className="text-sm text-gray-500 mb-8">We successfully restored your errands to this device.</p>
                
                <div className="flex flex-col gap-3">
                  <Link 
                    to="/buyer/history"
                    className="w-full px-4 py-3 bg-[#4466b0] text-white font-medium rounded-xl hover:bg-[#385596] transition-colors flex items-center justify-center"
                  >
                    View All Past Errands
                  </Link>
                  <button 
                    onClick={() => {
                      setShowRecoverModal(false);
                      setRecoverySuccess(false);
                    }}
                    className="w-full px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {activeErrand ? "Go to Active Errand" : "Back to Dashboard"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Recover Your History</h3>
                <p className="text-sm text-gray-500 mb-6">Enter your phone number and Master PIN to restore your active errands.</p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={recoverPhone}
                      onChange={(e) => setRecoverPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4466b0]/20 focus:border-[#4466b0] transition-all outline-none"
                      placeholder="e.g. 08012345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Master PIN</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      value={recoverPin}
                      onChange={(e) => setRecoverPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4466b0]/20 focus:border-[#4466b0] transition-all outline-none font-mono tracking-[0.5em] text-center text-lg"
                      placeholder="****"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowRecoverModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleRecoverHistory}
                    disabled={recoverLoading}
                    className="flex-1 px-4 py-3 bg-[#4466b0] text-white font-medium rounded-xl hover:bg-[#385596] transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {recoverLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Recover'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Oops!</h3>
            <p className="text-gray-500 mb-6 text-sm">{errorModalMessage}</p>
            <button 
              onClick={() => setErrorModalMessage(null)}
              className="w-full px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
