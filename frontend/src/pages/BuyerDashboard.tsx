import { ArrowLeft, Package, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // Assuming firebase config is exported from here

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errandId, setErrandId] = useState<string | null>(null);
  const [liveErrand, setLiveErrand] = useState<any>(null);

  // Form State
  const [itemName, setItemName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const DELIVERY_FEE = 2500;
  const total = Number(priceAmount || 0) + DELIVERY_FEE;

  // Restore active errand from local storage on mount
  useEffect(() => {
    const checkActiveErrand = async () => {
      try {
        const stored = localStorage.getItem("luggik_buyer_errands");
        if (stored) {
          const errandIds: string[] = JSON.parse(stored);
          // Check from newest to oldest
          for (let i = errandIds.length - 1; i >= 0; i--) {
            const id = errandIds[i];
            const docRef = doc(db, "errands", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const state = docSnap.data().state;
              // If it's an ongoing errand, redirect to tracking
              if (state !== 'DELIVERED' && state !== 'REJECTED_BY_BUYER') {
                navigate(`/buyer/tracking/${id}`);
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore errand from local storage", e);
      }
    };
    checkActiveErrand();
  }, [navigate]);

  useEffect(() => {
    if (!success || !errandId) return;
    
    const unsubscribe = onSnapshot(doc(db, "errands", errandId), (docSnap) => {
      if (docSnap.exists()) {
        setLiveErrand(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, [success, errandId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !priceAmount || !vendorPhone || !buyerPhone || !buyerEmail || !vendorEmail || !pickupAddress || !dropoffAddress) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/errands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: "buyer-demo-123", // Hardcoded for demo
          sellerId: "vendor-demo-456", // Hardcoded for demo
          buyerEmail,
          sellerEmail: vendorEmail,
          itemName,
          priceAmount: Number(priceAmount),
          currency: "NGN",
          deliveryFee: DELIVERY_FEE,
          buyerPhone,
          sellerPhone: vendorPhone,
          pickupLocation: { address: pickupAddress },
          dropoffLocation: { address: dropoffAddress },
          metadata: {}
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Failed to create errand");

      const newId = data.errandId;
      setErrandId(newId);
      setSuccess(true);

      // Save to local storage
      try {
        const stored = localStorage.getItem("luggik_buyer_errands");
        const errandIds = stored ? JSON.parse(stored) : [];
        errandIds.push(newId);
        localStorage.setItem("luggik_buyer_errands", JSON.stringify(errandIds));
      } catch (e) {
        console.error("Failed to save errand to local storage", e);
      }

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Escrow Locked!</h2>
          <p className="text-slate-600 mb-6">
            We have secured ₦{total.toLocaleString()} and notified the vendor. Your runner is being assigned.
          </p>

          {/* Company Assignment Loader / Status */}
          <div className={`p-4 rounded-xl mb-4 text-sm flex flex-col gap-3 ${liveErrand?.runnerCompanyName ? 'bg-green-50 border border-green-200' : 'bg-nomba-light/30 border border-nomba-yellow/20 text-slate-700'}`}>
            {!liveErrand?.runnerCompanyName ? (
              <div className="flex items-center gap-3 justify-center">
                <Loader2 className="w-5 h-5 text-nomba-dark animate-spin" />
                <span>Assigning a verified logistics company near you...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 justify-center text-green-700 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                <span>Accepted by {liveErrand.runnerCompanyName}</span>
              </div>
            )}
          </div>

          {/* Rider Assignment Loader / Status */}
          {liveErrand?.runnerCompanyName && (
            <div className={`p-4 rounded-xl mb-6 text-sm flex flex-col gap-3 ${liveErrand?.actualRiderName ? 'bg-green-50 border border-green-200' : 'bg-nomba-light/30 border border-nomba-yellow/20 text-slate-700'}`}>
              {!liveErrand?.actualRiderName ? (
                <div className="flex items-center gap-3 justify-center">
                  <Loader2 className="w-5 h-5 text-nomba-dark animate-spin" />
                  <span>Assigning an available rider...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center text-green-700 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Rider Assigned: {liveErrand.actualRiderName}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl mb-6">
            <p className="text-sm font-mono text-slate-500">Tracking ID:</p>
            <p className="text-lg font-semibold text-slate-900">{errandId}</p>
          </div>
          <button onClick={() => navigate(`/buyer/tracking/${errandId}`)} className="w-full bg-nomba-dark text-nomba-yellow py-3 rounded-xl font-medium hover:bg-black transition-colors">
            Track Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Start an Errand</h1>
        </header>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-nomba-yellow" />
              Errand Details
            </h2>
            <p className="text-slate-500 text-sm mt-1">Tell us what you are buying, who you are buying from, and where it's going.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* SECTION: Item Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">1. Item Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                  <input required value={itemName} onChange={e => setItemName(e.target.value)} type="text" placeholder="e.g. Black Nike Shoes" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item Price (₦)</label>
                  <input required value={priceAmount} onChange={e => setPriceAmount(e.target.value)} type="number" placeholder="20000" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* SECTION: Your Information */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">2. Your Details (Dropoff)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Email</label>
                  <input required value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} type="email" placeholder="you@email.com" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Phone</label>
                  <input required value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} type="tel" placeholder="080..." className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" /> Your Address (Delivery Location)
                </label>
                <input required value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} type="text" placeholder="45 Home Avenue, Lagos" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
              </div>
            </div>

            {/* SECTION: Vendor Information */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">3. Vendor Details (Pickup)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Email</label>
                  <input required value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} type="email" placeholder="vendor@email.com" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Phone</label>
                  <input required value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} type="tel" placeholder="080..." className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" /> Vendor Address (Pickup Location)
                </label>
                <input required value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} type="text" placeholder="123 Market Street, Lagos" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all" />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
                <div className="text-center md:text-left">
                  <p className="text-slate-600">Total + Delivery</p>
                  <p className="text-3xl font-bold text-slate-900">₦{total.toLocaleString()}</p>
                </div>
                <button type="submit" disabled={loading} className="w-full md:w-auto bg-nomba-yellow text-nomba-dark px-10 py-4 rounded-xl font-semibold text-lg hover:brightness-105 transition-all shadow-md hover:shadow-nomba-yellow/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Pay & Lock Escrow
                </button>
              </div>
              <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
                🔒 Secured by Nomba Trust Engine
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
