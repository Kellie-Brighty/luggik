import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle2, Check, AlertTriangle, Copy, CheckSquare, Loader2 } from "lucide-react";
import { db } from "../firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

export default function BuyerCheckout() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { trackingPin, masterPin } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [_liveErrand, setLiveErrand] = useState<any>(null);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMasterPinAlert, setShowMasterPinAlert] = useState(!!masterPin);

  useEffect(() => {
    if (!id) return;
    const fetchErrand = async () => {
      const docRef = doc(db, "errands", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.virtualAccount) {
          setVirtualAccount(data.virtualAccount);
        }
      }
    };
    fetchErrand();

    const unsub = onSnapshot(doc(db, "errands", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveErrand({ id: docSnap.id, ...data });
        if (data.virtualAccount) {
          setVirtualAccount(data.virtualAccount);
        }
      }
    });
    return () => unsub();
  }, [id]);

  const platformFee = 50;
  const total = _liveErrand ? (Number(_liveErrand.priceAmount) + Number(_liveErrand.deliveryFee) + platformFee) : 0;

  const executeCancelOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/errands/${id}/cancel`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (response.ok) {
        setShowCancelModal(false);
        try {
          const stored = localStorage.getItem('luggik_buyer_errands');
          if (stored) {
            const errands = JSON.parse(stored).filter((storedId: string) => storedId !== id);
            localStorage.setItem('luggik_buyer_errands', JSON.stringify(errands));
          }
        } catch (e) {}
        navigate('/');
      } else {
        setCancelError(data.error || 'Failed to cancel order.');
        setShowCancelModal(false);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      setCancelError('Failed to cancel order. Please try again.');
      setShowCancelModal(false);
    } finally {
      setLoading(false);
    }
  };

  if (!_liveErrand) {
    return (
      <div className="min-h-screen bg-luggik-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0B0F0E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luggik-bg font-sans p-6 flex flex-col">
      <div className="pt-6 px-6 flex justify-center w-full mb-8">
        <nav className="flex items-center justify-between px-8 py-3 bg-transparent border border-[#EAEAEA] rounded-full w-full max-w-[1200px]">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36]">
              <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
            </div>
            <span className="text-[18px] font-bold tracking-tight text-[#111111] font-['Space_Grotesk',sans-serif]">Luggik</span>
          </Link>
        </nav>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-transparent border border-[#EAEAEA] p-6 md:p-10 rounded-[24px] text-center max-w-lg w-full mx-auto">
          <div className="w-16 h-16 bg-[#F7F4EC] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#DDDDD8]">
            <CheckCircle2 className="w-8 h-8 text-[#0B0F0E]" />
          </div>
          <h2 className="text-[24px] font-bold text-[#0B0F0E] mb-2 font-['Space_Grotesk',sans-serif]">Escrow Pending</h2>
          <p className="text-[15px] text-[#6E6B5E] mb-6">
            Transfer exactly ₦{total.toLocaleString()} to lock this escrow and assign a rider.
          </p>

          {virtualAccount ? (
            <div className="bg-[#F7F4EC] p-5 rounded-xl mb-6 border border-[#DDDDD8] text-left">
              <p className="text-[12px] font-mono text-[#6E6B5E] uppercase tracking-wider mb-1">Virtual Account</p>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[28px] font-bold text-[#0B0F0E] tracking-tight">{virtualAccount.accountNumber}</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(virtualAccount.accountNumber);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 hover:bg-[#EAEAEA] rounded-md transition-colors flex items-center justify-center"
                  title="Copy Account Number"
                >
                  {copied ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-[#6E6B5E]" />}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#6E6B5E] whitespace-nowrap">Bank</span>
                  <span className="text-[13px] font-medium text-[#0B0F0E] text-right">{virtualAccount.bankName}</span>
                </div>
                <div className="flex justify-between items-start mt-1">
                  <span className="text-[13px] text-[#6E6B5E] whitespace-nowrap mr-4">Account Name</span>
                  <span className="text-[13px] font-medium text-[#0B0F0E] text-right">{virtualAccount.accountName}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#F7F4EC] p-4 rounded-xl mb-6 border border-[#DDDDD8]">
              <p className="text-[12px] font-mono text-[#6E6B5E] uppercase tracking-wider">Tracking ID</p>
              <p className="text-[18px] font-semibold text-[#0B0F0E] mt-1">{id}</p>
            </div>
          )}

          {_liveErrand && (
            <div className="bg-[#F7F4EC] p-4 rounded-xl mb-6 border border-[#DDDDD8] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6E6B5E]">Item price</span>
                <span className="text-[13px] font-medium text-[#0B0F0E]">₦{Number(_liveErrand.priceAmount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6E6B5E]">Delivery fee</span>
                <span className="text-[13px] font-medium text-[#0B0F0E]">₦{Number(_liveErrand.deliveryFee).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6E6B5E]">Platform fee</span>
                <span className="text-[13px] font-medium text-[#0B0F0E]">₦{platformFee.toLocaleString()}</span>
              </div>
            </div>
          )}

          {_liveErrand?.state === 'ESCROW_LOCKED' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
              <h4 className="text-green-800 font-semibold mb-1">Payment Confirmed!</h4>
              <p className="text-sm text-green-700 text-center mb-4">Your transfer has been received and securely locked in escrow. Your runner is being dispatched!</p>
              <button 
                onClick={() => navigate(`/buyer/tracking/${id}`)}
                className="w-full bg-green-600 text-white py-[12px] rounded-full font-semibold text-[14px] hover:bg-green-700 transition-colors shadow-sm"
              >
                Continue to Tracking
              </button>
            </div>
          ) : (
            <div className="bg-[#F7F4EC] border border-[#DDDDD8] rounded-xl p-4 mb-4 flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-[#0B0F0E] animate-spin mb-2" />
              <h4 className="text-[#0B0F0E] font-semibold text-sm text-center">Awaiting Transfer...</h4>
              <p className="text-[13px] text-[#6E6B5E] text-center mt-1">
                We are actively listening for your payment. This screen will update automatically once received.
              </p>
            </div>
          )}
          <button 
            onClick={() => setShowCancelModal(true)} 
            disabled={loading}
            className="w-full bg-transparent border border-red-200 text-red-600 py-[14px] rounded-full font-semibold text-[15px] hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
          >
            Cancel Order
          </button>
        </div>
        </div>

        {(trackingPin || _liveErrand?.trackingPin) && _liveErrand.state !== 'PENDING_ESCROW' && (
          <div className="bg-white rounded-3xl p-8 border border-[#EAEAEA] shadow-[0_2px_20px_rgba(0,0,0,0.03)] w-full max-w-md mx-auto text-left mt-6">
            <h3 className="text-xl font-bold text-[#111111] mb-2">Share with Vendor</h3>
            <p className="text-[#6E6B5E] text-sm mb-6">Send this secure link and PIN to the vendor so they can verify the escrow and track the rider.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">Tracking Link</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/share/${id}`}
                    className="flex-1 bg-[#F9F9F9] border border-[#EAEAEA] rounded-xl px-4 py-3 text-[#111111] text-sm outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="bg-[#2A2925] text-white px-4 py-3 rounded-xl hover:bg-[#111111] transition-colors flex items-center justify-center min-w-[50px]"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">Tracking PIN</label>
                <div className="bg-[#F9F9F9] border border-[#EAEAEA] rounded-xl px-4 py-3 text-center">
                  <span className="font-mono text-2xl tracking-[0.25em] font-bold text-[#4466b0]">{trackingPin || _liveErrand?.trackingPin}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-[22px] font-bold text-center text-[#0B0F0E] mb-2 font-['Space_Grotesk',sans-serif]">Cancel Order?</h3>
            <p className="text-[15px] text-center text-[#6E6B5E] mb-8">
              Are you sure you want to cancel this order? If you have already transferred funds to the virtual account, your cancellation will be rejected.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeCancelOrder}
                disabled={loading}
                className="w-full bg-red-600/90 text-white py-[14px] rounded-full font-semibold text-[15px] hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
              <button 
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="w-full bg-transparent border border-[#EAEAEA] text-[#0B0F0E] py-[14px] rounded-full font-semibold text-[15px] hover:bg-[#F7F4EC] transition-colors disabled:opacity-50"
              >
                No, keep it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Error Modal */}
      {cancelError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-[22px] font-bold text-center text-[#0B0F0E] mb-3 font-['Space_Grotesk',sans-serif]">luggik.delivery says</h3>
            <p className="text-[15px] text-center text-[#6E6B5E] mb-8">
              {cancelError}
            </p>
            <button 
              onClick={() => setCancelError(null)}
              className="w-full bg-[#5856D6] text-white py-[14px] rounded-full font-semibold text-[15px] hover:bg-[#4B49B6] transition-colors shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showMasterPinAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Luggik!</h3>
            <p className="text-sm text-gray-500 mb-4">
              Since this is your first time, we've generated a secure <strong>Master PIN</strong> for you. 
              If you ever clear your browser cache or change devices, you can use your phone number and this PIN to recover your order history.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mb-6">
              <span className="font-mono text-3xl tracking-[0.25em] font-bold text-[#4466b0]">{masterPin}</span>
            </div>
            <button 
              onClick={() => setShowMasterPinAlert(false)}
              className="w-full px-4 py-3 bg-[#4466b0] text-white font-medium rounded-xl hover:bg-[#385596] transition-colors"
            >
              I have saved my Master PIN
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
