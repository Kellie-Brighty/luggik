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
  const [wizardStep, setWizardStep] = useState(1);
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
  const [isBannerMinimized, setIsBannerMinimized] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);

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
    try {
      const storedDetails = localStorage.getItem('luggik_buyer_details');
      if (storedDetails) {
        const details = JSON.parse(storedDetails);
        if (details.buyerName) setBuyerName(details.buyerName);
        if (details.buyerEmail) setBuyerEmail(details.buyerEmail);
        if (details.buyerPhone) setBuyerPhone(details.buyerPhone);
      }
    } catch (e) {
      console.error('Failed to load buyer details', e);
    }
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
        
        // Save buyer details for next time
        localStorage.setItem('luggik_buyer_details', JSON.stringify({ buyerName, buyerEmail, buyerPhone }));
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

  // const onLoadDropoff = (autocomplete: google.maps.places.Autocomplete) => {
  //   setDropoffAutocomplete(autocomplete);
  // };

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
    <div className="min-h-screen bg-luggik-bg font-sans pb-12 lg:pb-0 relative">
      {/* Header - Fixed on mobile, Pill on desktop */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#EAEAEA] lg:relative lg:bg-transparent lg:border-none lg:backdrop-blur-none lg:pt-6 lg:px-6 lg:flex lg:justify-center w-full">
        <nav className="flex items-center justify-between px-6 py-4 lg:px-8 lg:py-3 lg:bg-transparent lg:border lg:border-[#EAEAEA] lg:rounded-full w-full lg:max-w-[1200px]">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36]">
              <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
            </div>
            <span className="text-[18px] font-bold tracking-tight text-[#111111] font-['Space_Grotesk',sans-serif]">Luggik</span>
          </Link>

          <div className="flex items-center gap-4 lg:gap-8">
            <button 
              onClick={() => {
                setRecoverySuccess(false);
                setShowRecoverModal(true);
              }}
              className="px-4 py-2 lg:px-6 lg:py-2.5 bg-white border border-[#DDDDD8] text-[#111111] text-sm lg:text-[14px] font-medium lg:font-medium rounded-full hover:bg-[#F7F4EC] transition-colors shadow-sm"
            >
              Recover History
            </button>
          </div>
        </nav>
      </div>

      {/* MOBILE FULL-SCREEN MAP */}
      <div 
        className="fixed inset-0 z-0 lg:hidden"
        onClick={() => setIsDrawerMinimized(true)}
        onTouchStart={() => setIsDrawerMinimized(true)}
      >
         {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={pickupCoords || dropoffCoords || { lat: 6.5244, lng: 3.3792 }}
              zoom={12}
              options={{ disableDefaultUI: true, styles: luggikMapStyle, gestureHandling: 'greedy' }}
            >
              {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#FFCC00', strokeWeight: 5 } }} />}
              {!directions && pickupCoords && <Marker position={pickupCoords} label="P" />}
              {!directions && dropoffCoords && <Marker position={dropoffCoords} label="D" />}
            </GoogleMap>
         ) : (
           <div className="w-full h-full bg-[#EAEAEA] flex items-center justify-center">
             <Loader2 className="w-6 h-6 animate-spin text-[#A8A398]" />
           </div>
         )}
      </div>

      <div className="max-w-[1200px] mx-auto px-0 lg:px-6 mt-[71px] lg:mt-4 relative z-10">
        
        {/* Active Errand Banner */}
        {activeErrand && (
          <div className={`mb-6 mx-4 lg:mx-0 bg-[#F7F4EC] border border-[#EAEAEA] rounded-[24px] flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300 shadow-md lg:shadow-none transition-all ${isBannerMinimized ? 'p-2 w-auto inline-flex' : 'p-4 w-auto'}`}>
            <div className={`flex items-center ${isBannerMinimized ? 'gap-2' : 'gap-4'} cursor-pointer`} onClick={() => setIsBannerMinimized(!isBannerMinimized)}>
              <div className="w-10 h-10 bg-[#EAEAEA] rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#6E6B5E]" />
              </div>
              {!isBannerMinimized && (
                <div>
                  <p className="text-[15px] font-semibold text-[#0B0F0E]">You have an active order</p>
                  <p className="text-[13px] text-[#6E6B5E] hidden sm:block">
                    {activeErrand.state === 'CREATED' || activeErrand.state === 'PENDING_VERIFICATION' ? 'Waiting for payment transfer.' : 'Order is currently in progress.'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeErrand.state === 'CREATED' || activeErrand.state === 'ESCROW_LOCKED' || activeErrand.state === 'PENDING_VERIFICATION') {
                    navigate(`/buyer/checkout/${activeErrand.id}`);
                  } else {
                    navigate(`/buyer/tracking/${activeErrand.id}`);
                  }
                }}
                className="bg-[#0B0F0E] text-white px-5 py-2.5 rounded-full font-semibold text-[13px] hover:bg-[#2A2925] transition-colors whitespace-nowrap shrink-0 ml-2"
              >
                Resume
              </button>
              {!isBannerMinimized && (
                <button onClick={() => setIsBannerMinimized(true)} className="text-[#6E6B5E] hover:bg-[#EAEAEA] rounded-full p-2 lg:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Title (Desktop Only) */}
        <div className="hidden lg:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-[#111111] tracking-tight">Start an errand</h1>
            <p className="text-[#6E6B5E] mt-1">Secure escrow delivery for your valuable items</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Form Container: Bottom Sheet on Mobile, Left Column on Desktop */}
          <div className={`
            fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pt-6 h-[70dvh] overflow-y-auto transition-transform duration-300
            ${isDrawerMinimized ? 'translate-y-[calc(100%-120px)]' : 'translate-y-0'}
            lg:relative lg:bg-transparent lg:shadow-none lg:rounded-[24px] lg:border lg:border-[#EAEAEA] lg:p-8 lg:md:p-10 lg:flex-1 lg:h-auto lg:overflow-visible lg:translate-y-0
          `}>
            
            {/* Invisible drag overlay for header */}
            <div className="absolute top-0 left-0 right-0 h-24 lg:hidden cursor-pointer z-10" onClick={() => setIsDrawerMinimized(!isDrawerMinimized)}></div>

            {/* Mobile Drag Indicator */}
            <div className="flex flex-col items-center justify-center mb-6 lg:hidden relative z-20 pointer-events-none">
              <div className="w-12 h-1.5 bg-[#EAEAEA] rounded-full mb-2"></div>
              <p className="text-[11px] font-semibold text-[#A8A398] uppercase tracking-wider">
                {isDrawerMinimized ? "Tap to expand form" : "Tap to view map"}
              </p>
            </div>
            
            {/* Desktop Header */}
            <div className="hidden lg:flex items-start gap-4 mb-10">
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

            {/* Mobile Wizard Header */}
            <div className="lg:hidden flex items-center justify-between mb-6">
               <h2 className="text-[20px] font-bold text-[#0B0F0E]">
                 {wizardStep === 1 ? "Where & What?" : wizardStep === 2 ? "Who's involved?" : "Review & Pay"}
               </h2>
               <div className="text-[13px] font-semibold text-[#6E6B5E] bg-[#F7F4EC] px-3 py-1 rounded-full">
                 Step {wizardStep} of 4
               </div>
            </div>

            {/* WIZARD STEP 1 */}
            <div className={`space-y-6 ${wizardStep !== 1 ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#0B0F0E] lg:bg-[#F7F4EC] text-white lg:text-[#6E6B5E] flex items-center justify-center text-[12px] font-medium">1</div>
                <span className="text-[12px] font-bold lg:font-medium text-[#0B0F0E] lg:text-[#6E6B5E] tracking-[0.06em] uppercase">Item Information</span>
                <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 lg:mb-10">
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

              {/* Dropoff & Pickup Location grouped for mobile convenience */}
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Dropoff Location</label>
                <div className="relative mb-4">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" strokeWidth={1.5} />
                  {!isLoaded ? (
                    <div className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 flex items-center gap-2 text-[15px] text-[#A8A398]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                    </div>
                  ) : (
                    <Autocomplete onLoad={(inst) => setDropoffAutocomplete(inst)} onPlaceChanged={onDropoffPlaceChanged}>
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

                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Pickup Location (Vendor)</label>
                <div className="relative mb-4">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" strokeWidth={1.5} />
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

              {/* Mobile Only: Next Button */}
              <button 
                onClick={() => setWizardStep(2)}
                disabled={!itemName || !priceAmount || !dropoffCoords || !pickupCoords}
                className="w-full lg:hidden bg-[#0B0F0E] text-white py-[14px] rounded-full font-bold text-[15px] hover:bg-[#2A2925] disabled:opacity-50 mt-4"
              >
                Next Step
              </button>
            </div>

            {/* Desktop Map Visualizer */}
            {isLoaded && (pickupCoords || dropoffCoords) && (
              <div className="mb-10 hidden lg:block">
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

            {/* WIZARD STEP 2 */}
            <div className={`space-y-6 ${wizardStep !== 2 ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#0B0F0E] lg:bg-[#F7F4EC] text-white lg:text-[#6E6B5E] flex items-center justify-center text-[12px] font-medium">2</div>
                <span className="text-[12px] font-bold lg:font-medium text-[#0B0F0E] lg:text-[#6E6B5E] tracking-[0.06em] uppercase">Your Details</span>
                <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
              </div>

              <div className="space-y-4 mb-6 lg:mb-10">
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
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#0B0F0E] lg:bg-[#F7F4EC] text-white lg:text-[#6E6B5E] flex items-center justify-center text-[12px] font-medium">3</div>
                <span className="text-[12px] font-bold lg:font-medium text-[#0B0F0E] lg:text-[#6E6B5E] tracking-[0.06em] uppercase">Vendor Details</span>
                <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
              </div>

              <div className="space-y-4 mb-6 lg:mb-10">
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

              {/* Mobile Only: Back / Next */}
              <div className="flex gap-4 lg:hidden mt-4">
                <button 
                  onClick={() => setWizardStep(1)}
                  className="w-1/3 bg-[#F7F4EC] text-[#0B0F0E] py-[14px] rounded-full font-bold text-[15px] border border-[#EAEAEA]"
                >
                  Back
                </button>
                <button 
                  onClick={() => setWizardStep(3)}
                  disabled={!buyerName || !vendorName || !vendorAccountNumber || !vendorBankCode || vendorAccountName === "Account not found" || vendorAccountName === "Verification failed"}
                  className="flex-1 bg-[#0B0F0E] text-white py-[14px] rounded-full font-bold text-[15px] disabled:opacity-50"
                >
                  Review Quotes
                </button>
              </div>

            </div>
          </div>
          
          {/* Right Column: Quotes & Summary (Step 3 & 4 on Mobile, Right Column on Desktop) */}
          <div className={`w-full lg:w-[420px] lg:flex flex-col lg:sticky lg:top-8 transition-transform duration-300 ${(wizardStep !== 3 && wizardStep !== 4) ? 'hidden' : `block z-40 fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 pt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] h-[70dvh] overflow-y-auto ${isDrawerMinimized ? 'translate-y-[calc(100%-120px)]' : 'translate-y-0'} lg:relative lg:shadow-none lg:bg-transparent lg:p-0 lg:h-auto lg:overflow-visible lg:translate-y-0`}`}>
            
            {/* Invisible drag overlay for header */}
            <div className="absolute top-0 left-0 right-0 h-24 lg:hidden cursor-pointer z-0" onClick={() => setIsDrawerMinimized(!isDrawerMinimized)}></div>

            {/* Mobile Drag Indicator / Back button */}
            <div className="flex flex-col items-center justify-center mb-6 lg:hidden relative z-10">
              <div className="w-12 h-1.5 bg-[#EAEAEA] rounded-full mb-2 pointer-events-none"></div>
              <p className="text-[11px] font-semibold text-[#A8A398] uppercase tracking-wider mb-4 pointer-events-none">
                {isDrawerMinimized ? "Tap to expand form" : "Tap to view map"}
              </p>
              <div className="flex items-center justify-between w-full">
                <button onClick={(e) => { e.stopPropagation(); setWizardStep(wizardStep === 4 ? 3 : 2); setIsDrawerMinimized(false); }} className="text-[#6E6B5E] text-[14px] font-medium underline relative z-20">
                  Back to {wizardStep === 4 ? "Logistics" : "Edit"}
                </button>
                <div className="text-[13px] font-semibold text-[#6E6B5E] bg-[#F7F4EC] px-3 py-1 rounded-full pointer-events-none">Step {wizardStep} of 4</div>
              </div>
            </div>

            {/* Logistics Suggestions (Step 3 on Mobile, Top on Desktop) */}
            {(pickupCoords && dropoffCoords) && (
              <div className={`bg-[#15140F] rounded-[24px] p-6 lg:p-8 shadow-xl text-[#F7F4EC] ${wizardStep === 4 ? 'hidden lg:block lg:mb-6' : 'block mb-4 lg:mb-6'}`}>
                <h3 className="text-[17px] font-bold mb-2 text-[#F7F4EC] font-['Space_Grotesk',sans-serif]">Delivery Quotes</h3>
                <p className="text-[13px] text-[#A8A398] mb-6 leading-[1.6]">
                  Choose a partner. All logistics companies are fully verified by the government.
                </p>
                
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

                    {/* Mobile Only: View Summary Button */}
                    {selectedQuote && (
                      <div className="mt-8 pt-6 border-t border-white/10 flex flex-col lg:hidden">
                        <button 
                          type="button" 
                          onClick={() => setWizardStep(4)} 
                          disabled={!selectedQuote}
                          className="w-full bg-[#F7F4EC] text-[#111111] py-[16px] rounded-full font-bold text-[16px] hover:bg-[#EAEAEA] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center"
                        >
                          View Summary
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Escrow summary (Step 4 on Mobile, Bottom on Desktop) */}
            <div className={`bg-[#15140F] rounded-[24px] p-6 lg:p-8 text-[#F7F4EC] shadow-xl ${wizardStep === 3 ? 'hidden lg:block' : 'block'}`}>
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
                
                {/* Lock Escrow Button */}
                <div className="mt-4 pt-6 border-t border-white/10 flex flex-col">
                  <button 
                    type="button" 
                    onClick={handlePayAndCreate} 
                    disabled={loading || !selectedQuote || vendorAccountName === "Account not found" || vendorAccountName === "Verification failed" || !buyerName || !vendorName}
                    className="w-full bg-[#FFCC00] text-[#111111] py-[16px] rounded-full font-bold text-[16px] hover:bg-[#E6B800] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</> : "Lock Escrow & Dispatch"}
                  </button>
                  <p className="text-[12px] text-center text-[#A8A398] mt-4 flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Secure Nomba Escrow Payment
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Recover Modal */}
      {showRecoverModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {recoverySuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-[22px] font-bold text-[#0B0F0E] mb-2 font-['Space_Grotesk',sans-serif]">History Recovered!</h3>
                <p className="text-[15px] text-[#6E6B5E] mb-8">
                  Your past errands and sessions have been securely restored to this device.
                </p>
                <div className="flex flex-col gap-3">
                  {activeErrand && (
                    <button 
                      onClick={() => {
                        setShowRecoverModal(false);
                        if (activeErrand.state === 'CREATED' || activeErrand.state === 'ESCROW_LOCKED' || activeErrand.state === 'PENDING_VERIFICATION') {
                          navigate(`/buyer/checkout/${activeErrand.id}`);
                        } else {
                          navigate(`/buyer/tracking/${activeErrand.id}`);
                        }
                      }}
                      className="w-full bg-[#FFCC00] text-[#111111] py-[14px] rounded-full font-bold text-[15px] hover:bg-[#E6B800] transition-colors shadow-[0_2px_12px_rgba(255,204,0,0.2)]"
                    >
                      Resume Active Errand
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      setShowRecoverModal(false);
                      navigate('/buyer/history');
                    }}
                    className={`w-full ${activeErrand ? 'bg-white border border-[#EAEAEA] text-[#111111] hover:bg-gray-50' : 'bg-[#FFCC00] text-[#111111] border border-transparent shadow-[0_2px_12px_rgba(255,204,0,0.2)] hover:bg-[#E6B800] font-bold'} py-[14px] rounded-full font-semibold text-[15px] transition-colors`}
                  >
                    View Errand History
                  </button>

                  {!activeErrand && (
                    <button 
                      onClick={() => {
                        setShowRecoverModal(false);
                        window.location.reload();
                      }}
                      className="w-full bg-white border border-[#EAEAEA] text-[#111111] py-[14px] rounded-full font-semibold text-[15px] hover:bg-gray-50 transition-colors"
                    >
                      Return to Dashboard
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-[22px] font-bold text-center text-[#0B0F0E] mb-2 font-['Space_Grotesk',sans-serif]">Recover History</h3>
                <p className="text-[15px] text-center text-[#6E6B5E] mb-6">
                  Enter your phone number and Master PIN to recover your previous errands.
                </p>

                {errorModalMessage && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center border border-red-100">
                    {errorModalMessage}
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      value={recoverPhone} 
                      onChange={(e) => setRecoverPhone(e.target.value)} 
                      placeholder="08012345678"
                      className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Master PIN</label>
                    <input 
                      type="text" 
                      value={recoverPin} 
                      onChange={(e) => setRecoverPin(e.target.value.toUpperCase())} 
                      placeholder="e.g. A1B2C3D4"
                      maxLength={8}
                      className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC] text-center tracking-widest font-mono uppercase" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleRecoverHistory}
                    disabled={recoverLoading}
                    className="w-full py-3.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#111111] font-bold rounded-[12px] shadow-[0_2px_12px_rgba(255,204,0,0.2)] transition-all flex items-center justify-center gap-2"
                  >
                    {recoverLoading ? 'Recovering...' : 'Recover History'}
                  </button>
                  <button 
                    onClick={() => setShowRecoverModal(false)}
                    className="w-full bg-transparent border border-[#EAEAEA] text-[#0B0F0E] py-[14px] rounded-full font-semibold text-[15px] hover:bg-[#F7F4EC] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );

}
