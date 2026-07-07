import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2, ArrowLeft, Package, Clock, ShieldCheck, XCircle, ArrowRight } from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function BuyerHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errands, setErrands] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const stored = localStorage.getItem('luggik_buyer_errands');
        if (stored) {
          const errandIds = JSON.parse(stored);
          if (errandIds && errandIds.length > 0) {
            const fetchedErrands: any[] = [];
            // Fetch backwards to show newest first
            for (let i = errandIds.length - 1; i >= 0; i--) {
              const docSnap = await getDoc(doc(db, "errands", errandIds[i]));
              if (docSnap.exists()) {
                fetchedErrands.push({ id: docSnap.id, ...docSnap.data() });
              }
            }
            
            // Explicitly sort by date descending to ensure most recent is always first
            fetchedErrands.sort((a, b) => {
              const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0);
              const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0);
              return dateB - dateA;
            });
            
            setErrands(fetchedErrands);
          }
        }
      } catch (e) {
        console.error('Failed to fetch history', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[12px] font-semibold border border-green-200">
            <Check className="w-3.5 h-3.5" />
            Delivered
          </span>
        );
      case 'CANCELLED':
      case 'REJECTED_BY_BUYER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-[12px] font-semibold border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'CREATED':
      case 'PENDING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-[12px] font-semibold border border-yellow-200">
            <Clock className="w-3.5 h-3.5" />
            Pending Payment
          </span>
        );
      case 'ESCROW_LOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Escrow Locked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold border border-blue-200">
            <Package className="w-3.5 h-3.5" />
            In Progress
          </span>
        );
    }
  };

  const handleErrandClick = (errand: any) => {
    if (errand.state === 'CREATED' || errand.state === 'ESCROW_LOCKED' || errand.state === 'PENDING_VERIFICATION') {
      navigate(`/buyer/checkout/${errand.id}`);
    } else {
      navigate(`/buyer/tracking/${errand.id}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-[#4466b0]" /></div>;
  }

  return (
    <div className="min-h-screen bg-luggik-bg font-sans overflow-hidden flex flex-col">
      
      {/* Navigation Container */}
      <div className="pt-6 px-4 sm:px-6 flex justify-center w-full mb-8">
        <nav className="flex items-center justify-between px-4 sm:px-8 py-3 bg-transparent border border-[#EAEAEA] rounded-[24px] sm:rounded-full w-full max-w-[1200px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
            <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36] shrink-0">
              <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
            </div>
            <span className="text-[16px] sm:text-[18px] font-bold tracking-tight text-[#111111] font-['Space_Grotesk',sans-serif]">Luggik</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-8">
            <Link to="/runner/login" className="hidden sm:block text-[14px] font-medium text-[#111111] hover:opacity-80 transition-opacity">
              Driver Login
            </Link>
            <Link to="/buyer" className="flex items-center justify-center bg-black text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium text-[13px] sm:text-[14px] hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap">
              Start an errand
            </Link>
          </div>
        </nav>
      </div>

      <div className="max-w-[800px] mx-auto px-6 pb-24 w-full">
        
        <div className="flex items-center gap-4 mb-8">
          <Link to="/buyer" className="w-10 h-10 bg-white border border-[#DDDDD8] rounded-full flex items-center justify-center hover:bg-[#F7F4EC] transition-colors shadow-sm shrink-0">
            <ArrowLeft className="w-5 h-5 text-[#111111]" />
          </Link>
          <div>
            <h1 className="text-[32px] font-bold text-[#111111] tracking-tight">Your Past Errands</h1>
            <p className="text-[#6E6B5E] mt-1">Review your delivery history and active orders</p>
          </div>
        </div>

        {errands.length === 0 ? (
          <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-[#F7F4EC] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-[#6E6B5E]" />
            </div>
            <h3 className="text-[20px] font-bold text-[#111111] mb-2">No history found</h3>
            <p className="text-[#6E6B5E] mb-6 max-w-sm">
              You haven't created any errands yet, or your history hasn't been recovered.
            </p>
            <Link 
              to="/buyer"
              className="bg-[#0B0F0E] text-white px-6 py-3 rounded-full font-medium text-[14px] hover:bg-[#2A2925] transition-colors"
            >
              Start a new errand
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {errands.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((errand) => {
              const dateVal = errand.createdAt?.seconds ? new Date(errand.createdAt.seconds * 1000) : new Date(errand.createdAt || Date.now());
              return (
              <div 
                key={errand.id}
                onClick={() => handleErrandClick(errand)}
                className="bg-white border border-[#EAEAEA] rounded-[20px] p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between hover:border-[#DDDDD8] hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-[#F7F4EC] rounded-[14px] flex items-center justify-center shrink-0 border border-[#EAEAEA]">
                    <Package className="w-6 h-6 text-[#6E6B5E]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold text-[#111111] mb-1 group-hover:text-[#4466b0] transition-colors">
                      {errand.itemName || "Unnamed Item"}
                    </h3>
                    <div className="flex items-center gap-2 text-[13px] text-[#6E6B5E]">
                      <span className="font-medium text-[#111111]">
                        ₦{Number(errand.priceAmount || 0).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>{dateVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t border-[#EAEAEA] sm:border-0 pt-4 sm:pt-0">
                  {getStatusBadge(errand.state)}
                  
                  <div className="w-8 h-8 rounded-full bg-[#F7F4EC] flex items-center justify-center group-hover:bg-[#111111] transition-colors">
                    <ArrowRight className="w-4 h-4 text-[#6E6B5E] group-hover:text-white" />
                  </div>
                </div>
              </div>
            )})}
            
            {/* Pagination Controls */}
            {errands.length > pageSize && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#EAEAEA]">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-[#DDDDD8] bg-white rounded-lg text-sm font-medium text-[#111111] hover:bg-[#F7F4EC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-[#6E6B5E] font-medium">
                  Page {currentPage} of {Math.ceil(errands.length / pageSize)}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(errands.length / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(errands.length / pageSize)}
                  className="px-4 py-2 border border-[#DDDDD8] bg-white rounded-lg text-sm font-medium text-[#111111] hover:bg-[#F7F4EC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
