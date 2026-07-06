import { Settings, LogOut, PackageSearch, Users, Loader2, AlertCircle, Image as UserPlus, Lock, CheckCircle2, Car, Clock, MapPin, ArrowRight, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../utils/timeUtils";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import PricingSettings from '../components/PricingSettings';

interface Errand {
  id: string;
  itemName: string;
  priceAmount: number;
  deliveryFee: number;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  state: string;
  actualRiderName?: string;
  actualRiderPlateNumber?: string;
  actualRiderImageUrl?: string;
  createdAt?: any;
}

export default function RunnerDashboard() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'errands' | 'fleet' | 'settings' | 'history'>('errands');
  const [companyErrands, setCompanyErrands] = useState<Errand[]>([]);
  
  const totalRevenue = companyErrands
    .filter(e => e.state === 'DELIVERED')
    .reduce((sum, errand) => sum + (errand.deliveryFee || 0), 0);
  
  // Rider creation state
  const [newRiderEmail, setNewRiderEmail] = useState("");
  const [newRiderPassword, setNewRiderPassword] = useState("");
  const [newRiderName, setNewRiderName] = useState("");
  const [newRiderPlateNumber, setNewRiderPlateNumber] = useState("");
  const [newRiderImageUrl, setNewRiderImageUrl] = useState("");
  
  const [creatingRider, setCreatingRider] = useState(false);

  // Rider edit state
  const [editingRider, setEditingRider] = useState<any | null>(null);
  const [editRiderName, setEditRiderName] = useState("");
  const [editRiderPassword, setEditRiderPassword] = useState("");
  const [editRiderPlateNumber, setEditRiderPlateNumber] = useState("");
  const [editRiderImageUrl, setEditRiderImageUrl] = useState("");
  const [updatingRider, setUpdatingRider] = useState(false);

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Modal State
  const [modalState, setModalState] = useState<{show: boolean, type: 'success'|'error', title: string, message: string}>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showModal = (type: 'success'|'error', title: string, message: string) => {
    setModalState({ show: true, type, title, message });
  };

  const navigate = useNavigate();
  const { user, kycStatus, role, companyName } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/runner/login');
    } catch (e) {
      console.error("Failed to logout", e);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/runner/login');
      return;
    }
    if (role === 'rider') {
      navigate('/rider/feed');
      return;
    }
    if (kycStatus !== 'approved') {
      navigate('/runner/kyc');
      return;
    }
    fetchRiders();

    const q = query(
      collection(db, "errands"), 
      where("state", "==", "ESCROW_LOCKED"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const errandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Errand[];
      setErrands(errandsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Errands listener error:", err);
      setError("Unable to listen for new errands in real-time. Missing permissions?");
      setLoading(false);
    });

    const companyErrandsQuery = query(
      collection(db, "errands"), 
      where("runnerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribeCompany = onSnapshot(companyErrandsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Errand[];
      setCompanyErrands(data);
    });

    return () => {
      unsubscribe();
      unsubscribeCompany();
    };
  }, [user, kycStatus, role, navigate]);

  const fetchRiders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/fleet/riders?companyId=${user.uid}`);
      if (!res.ok) throw new Error("Failed to fetch riders");
      const data = await res.json();
      setRiders(data.riders || []);
    } catch (err) {
      console.error("Failed to fetch riders", err);
      showModal('error', 'Error', 'Failed to fetch riders. Please try again.');
    }
  };

  const handleAccept = async (errandId: string) => {
    setAcceptingId(errandId);
    try {
      const response = await fetch(`/api/errands/${errandId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runnerId: user?.uid, runnerCompanyName: companyName })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept errand");
      }
      
      // Update local state to remove the errand
      setErrands(prev => prev.filter(e => e.id !== errandId));
      showModal('success', 'Errand Accepted!', 'It is now available for your riders in their feed.');
    } catch (err: any) {
      showModal('error', 'Error', err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCreateRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName || !newRiderEmail || !newRiderPassword) return;
    setCreatingRider(true);
    try {
      const res = await fetch("/api/fleet/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newRiderName, 
          email: newRiderEmail, 
          password: newRiderPassword, 
          companyId: user?.uid,
          plateNumber: newRiderPlateNumber,
          imageUrl: newRiderImageUrl
        })
      });
      if (res.ok) {
        setNewRiderName("");
        setNewRiderEmail("");
        setNewRiderPassword("");
        setNewRiderPlateNumber("");
        setNewRiderImageUrl("");
        fetchRiders();
        showModal('success', 'Rider Created', 'Rider account has been created successfully.');
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rider");
      }
    } catch (err: any) {
      showModal('error', 'Error', err.message);
    } finally {
      setCreatingRider(false);
    }
  };

  const handleUpdateRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRider) return;
    setUpdatingRider(true);
    try {
      const res = await fetch(`/api/fleet/riders/${editingRider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editRiderName, 
          password: editRiderPassword || undefined,
          plateNumber: editRiderPlateNumber,
          imageUrl: editRiderImageUrl,
          companyId: user?.uid 
        })
      });
      if (res.ok) {
        showModal('success', 'Rider Updated', 'Rider information was updated successfully.');
        setEditingRider(null);
        fetchRiders();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update rider");
      }
    } catch (err: any) {
      showModal('error', 'Error', err.message);
    } finally {
      setUpdatingRider(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Content = reader.result as string;

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: [{ name: file.name, content: base64Content }]
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            const imageUrl = data.results?.[0]?.url || data.url || data.secure_url || data.data?.url;
            if (imageUrl) {
              if (isEdit) setEditRiderImageUrl(imageUrl);
              else setNewRiderImageUrl(imageUrl);
            }
          } else {
            console.error("Upload failed with status:", res.status);
          }
        } catch (error) {
          console.error("Error uploading image: ", error);
        } finally {
          setIsUploadingImage(false);
        }
      };
      
      reader.onerror = () => {
        console.error("Error reading file");
        setIsUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file: ", error);
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-[Inter,sans-serif]">
      
      {/* Top Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-[#F7F4EC] border-b border-[#EAEAEA]">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-[24px] h-[24px] bg-[#2A2925] rounded-[4px] flex items-center justify-center border border-[#3E3C36] shadow-sm">
            <Check className="w-3.5 h-3.5 text-[#FFCC00]" strokeWidth={3} />
          </div>
          <span className="text-[18px] font-bold tracking-tight text-[#15140F] font-['Space_Grotesk',sans-serif]">Luggik</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#15140F] rounded-full pl-1.5 pr-5 py-1.5 flex items-center gap-3 border border-[#3E3C36]">
            <div className="w-7 h-7 bg-[#FFCC00] rounded-full flex items-center justify-center">
              <span className="font-bold text-[#15140F] text-sm">₦</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-[#A8A398] uppercase tracking-wider leading-none">TOTAL REVENUE</span>
              <span className="text-white font-bold text-sm leading-none mt-0.5">₦{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EAEAEA] rounded-full hover:bg-[rgba(11,15,14,0.03)] transition-colors text-sm font-medium text-[#6E6B5E]"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="w-full bg-[#15140F] py-3 px-8 flex justify-center items-center gap-12 border-b border-[#3E3C36]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[#A8A398] rounded-full"></div>
          <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider">HELD</span>
          <span className="text-white text-sm font-bold ml-1 font-mono">₦8,400</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[#FFCC00] rounded-full shadow-[0_0_8px_rgba(255,204,0,0.5)]"></div>
          <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider">IN TRANSIT</span>
          <span className="text-white text-sm font-bold ml-1 font-mono">₦3,200</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[#4ADE80] rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
          <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider">RELEASED TODAY</span>
          <span className="text-white text-sm font-bold ml-1 font-mono">₦2,570</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full bg-[#F7F4EC] border-b border-[#EAEAEA] px-8 flex justify-center">
        <div className="flex items-center gap-10">
          <button 
            onClick={() => setActiveTab('errands')}
            className={`flex items-center gap-2 py-4 text-[13.5px] font-semibold transition-all border-b-[2.5px] ${activeTab === 'errands' ? 'text-[#15140F] border-[#15140F]' : 'text-[#A8A398] border-transparent hover:text-[#6E6B5E]'}`}
          >
            <PackageSearch className="w-4 h-4" />
            Available Errands
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-4 text-[13.5px] font-semibold transition-all border-b-[2.5px] ${activeTab === 'history' ? 'text-[#15140F] border-[#15140F]' : 'text-[#A8A398] border-transparent hover:text-[#6E6B5E]'}`}
          >
            <Clock className="w-4 h-4" />
            My Errands
          </button>
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 py-4 text-[13.5px] font-semibold transition-all border-b-[2.5px] ${activeTab === 'fleet' ? 'text-[#15140F] border-[#15140F]' : 'text-[#A8A398] border-transparent hover:text-[#6E6B5E]'}`}
          >
            <Users className="w-4 h-4" />
            My Fleet
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-4 text-[13.5px] font-semibold transition-all border-b-[2.5px] ${activeTab === 'settings' ? 'text-[#15140F] border-[#15140F]' : 'text-[#A8A398] border-transparent hover:text-[#6E6B5E]'}`}
          >
            <Settings className="w-4 h-4" />
            Pricing & Location
          </button>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto p-8">

        {/* Tab Content */}
        {activeTab === 'errands' ? (
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-700 border border-red-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && errands.length > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <h2 className="text-[20px] font-bold text-[#15140F]">Available errands</h2>
                <div className="bg-white border border-[#EAEAEA] rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-[#6E6B5E]">
                  {errands.length}
                </div>
              </div>
            )}

            {!loading && !error && errands.length === 0 && (
              <div className="bg-transparent rounded-[24px] p-12 text-center border border-[#EAEAEA] shadow-sm">
                <PackageSearch className="w-12 h-12 text-[#A8A398] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#15140F] mb-2">No New Errands</h3>
                <p className="text-[#6E6B5E]">Check back later for new delivery requests.</p>
              </div>
            )}

            {errands.map(errand => (
              <div key={errand.id} className="bg-transparent border border-[#EAEAEA] rounded-[16px] p-6 hover:border-[#15140F] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                {/* Left Side Info */}
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider mb-2">{errand.id.substring(0, 10).toUpperCase()}</span>
                  <h3 className="text-[16px] font-bold text-[#15140F] mb-3">{errand.itemName}</h3>
                  
                  <div className="flex items-center gap-2 text-[13px] text-[#6E6B5E] mb-4 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#A8A398]" />
                    <span>{errand.pickupLocation?.address.split(',')[0]}, Lagos <ArrowRight className="w-3 h-3 inline mx-1 text-[#A8A398]" /> {errand.dropoffLocation?.address.split(',')[0]}, Lagos</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-[rgba(255,204,0,0.15)] text-[#E5A800] text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-[rgba(255,204,0,0.3)]">
                      <Lock className="w-3 h-3" />
                      Escrow funded
                    </div>
                    <div className="bg-[#F7F4EC] border border-[#EAEAEA] text-[#6E6B5E] text-[11px] font-medium px-2.5 py-1 rounded-full">
                      ~4 km
                    </div>
                    <div className="bg-[#F7F4EC] border border-[#EAEAEA] text-[#6E6B5E] text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
                      {formatRelativeTime(errand.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Right Side Info & Button */}
                <div className="flex flex-col items-end gap-6 w-full md:w-auto">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#A8A398] uppercase tracking-wider block mb-1">ITEM VALUE</span>
                    <span className="text-[20px] font-bold text-[#15140F] leading-none">₦{errand.priceAmount?.toLocaleString() || "24,000"}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleAccept(errand.id)}
                    disabled={acceptingId === errand.id}
                    className="w-full md:w-[140px] py-2.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] rounded-full text-[13.5px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(255,204,0,0.3)]"
                  >
                    {acceptingId === errand.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Claim errand"
                    )}
                  </button>
                </div>

              </div>
            ))}
          </div>
        ) : activeTab === 'fleet' ? (
          <div className="space-y-8">
            {/* Create Rider Form */}
            <div className="bg-transparent rounded-[24px] p-8 border border-[#EAEAEA] shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="w-4 h-4 text-[#15140F]" strokeWidth={2.5} />
                <h2 className="text-[16px] font-bold text-[#15140F]">Register new rider</h2>
              </div>
              <form onSubmit={handleCreateRider} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#15140F] mb-2">Full name</label>
                    <input
                      type="text"
                      value={newRiderName}
                      onChange={(e) => setNewRiderName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F7F4EC] border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] placeholder-[#A8A398] focus:outline-none focus:border-[#15140F] transition-colors"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#15140F] mb-2">Rider email</label>
                    <input 
                      type="email" 
                      required
                      value={newRiderEmail}
                      onChange={(e) => setNewRiderEmail(e.target.value)}
                      placeholder="rider@email.com"
                      className="w-full px-4 py-2.5 bg-[#F7F4EC] border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] placeholder-[#A8A398] focus:outline-none focus:border-[#15140F] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#15140F] mb-2">Temporary password</label>
                    <input 
                      type="password" 
                      required
                      value={newRiderPassword}
                      onChange={(e) => setNewRiderPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-[#F7F4EC] border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] placeholder-[#A8A398] focus:outline-none focus:border-[#15140F] transition-colors font-mono tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#15140F] mb-2">Vehicle plate <span className="text-[#A8A398] font-normal">(optional)</span></label>
                    <input 
                      type="text" 
                      value={newRiderPlateNumber}
                      onChange={(e) => setNewRiderPlateNumber(e.target.value)}
                      placeholder="ABC-123"
                      className="w-full px-4 py-2.5 bg-[#F7F4EC] border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] placeholder-[#A8A398] focus:outline-none focus:border-[#15140F] transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[12px] font-semibold text-[#15140F] mb-3">Rider photo <span className="text-[#A8A398] font-normal">(optional)</span></label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <button type="button" className="bg-[#15140F] text-white py-1.5 px-4 rounded-full text-[12px] font-bold">
                        Choose file
                      </button>
                    </div>
                    <span className="text-[12px] text-[#A8A398]">JPG or PNG, max 5MB</span>
                    
                    {isUploadingImage && <Loader2 className="w-4 h-4 animate-spin text-[#A8A398] ml-2" />}
                    {newRiderImageUrl && !isUploadingImage && (
                      <img src={newRiderImageUrl} alt="Rider" className="w-8 h-8 object-cover rounded-full border border-[#EAEAEA] ml-2" />
                    )}
                  </div>
                </div>

                <div className="pt-6 border-b border-[#EAEAEA] pb-8">
                  <button 
                    type="submit"
                    disabled={creatingRider || !newRiderEmail || !newRiderPassword || isUploadingImage}
                    className="w-full py-3.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] font-bold rounded-full disabled:opacity-50 flex items-center justify-center transition-colors shadow-[0_4px_14px_rgba(255,204,0,0.25)]"
                  >
                    {creatingRider ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create rider account"}
                  </button>
                </div>
              </form>

              {/* Rider List Section (inside the same card for seamless look as screenshot) */}
              <div className="pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-[14px] font-bold text-[#15140F]">My Fleet</h2>
                  <div className="bg-[#F7F4EC] border border-[#EAEAEA] rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#6E6B5E]">
                    {riders.length}
                  </div>
                </div>

                {riders.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[#A8A398] text-sm">You haven't added any riders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riders.map((r, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#F7F4EC] border border-[#EAEAEA] rounded-full overflow-hidden flex items-center justify-center shrink-0">
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt="Rider" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[12px] font-bold text-[#6E6B5E]">
                                {r.name ? r.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'RD'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-[#15140F] leading-tight mb-0.5">{r.name || 'Unnamed Rider'}</p>
                            <p className="text-[12px] text-[#A8A398] leading-tight">{r.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <span className="text-[11px] font-medium text-[#A8A398]">Added {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          
                          <button 
                            onClick={() => {
                              setEditingRider(r);
                              setEditRiderName(r.name || "");
                              setEditRiderPassword("");
                              setEditRiderPlateNumber(r.plateNumber || "");
                              setEditRiderImageUrl(r.imageUrl || "");
                            }}
                            className="text-[#15140F] text-[13px] font-bold hover:underline transition-all"
                          >
                            Edit
                          </button>
                          
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                            <span className="text-[10px] font-bold text-[#4ADE80] tracking-wider">ACTIVE</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-2"><Clock className="w-5 h-5 text-nomba-yellow"/> Active Errands</h2>
              {companyErrands.filter(e => !['DELIVERED', 'CANCELLED', 'REJECTED_BY_BUYER', 'DISPUTED'].includes(e.state)).length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <p className="text-slate-500 font-medium">No active errands. Accept some from the Available Errands tab!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {companyErrands.filter(e => !['DELIVERED', 'CANCELLED', 'REJECTED_BY_BUYER', 'DISPUTED'].includes(e.state)).map(errand => (
                    <div key={errand.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start justify-between gap-4 transition-all hover:shadow-md hover:border-nomba-yellow">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{errand.itemName}</h3>
                        <p className="text-sm text-slate-500 mb-2 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span> {errand.pickupLocation.address} <br/>
                          <span className="w-2 h-2 rounded-full bg-nomba-yellow"></span> {errand.dropoffLocation.address}
                        </p>
                        <div className="text-xs font-bold text-nomba-yellow bg-nomba-dark px-3 py-1.5 rounded-lg inline-block uppercase tracking-wider mb-4">
                          {errand.state.replace(/_/g, ' ')}
                        </div>
                        
                        {/* Rider Info */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                          {errand.actualRiderImageUrl ? (
                            <img src={errand.actualRiderImageUrl} alt={errand.actualRiderName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
                              <Car className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{errand.actualRiderName || 'Awaiting Rider'}</p>
                            {errand.actualRiderPlateNumber ? (
                              <p className="text-xs text-slate-500 font-medium">{errand.actualRiderPlateNumber}</p>
                            ) : (
                              <p className="text-xs text-slate-400 font-medium italic">Pending dispatch...</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[120px]">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Delivery Fee</p>
                        <p className="text-2xl font-black text-slate-900">₦{errand.deliveryFee?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500"/> History (Completed)</h2>
              {companyErrands.filter(e => ['DELIVERED', 'CANCELLED', 'REJECTED_BY_BUYER', 'DISPUTED'].includes(e.state)).length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <p className="text-slate-500 font-medium">No completed errands yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {companyErrands.filter(e => ['DELIVERED', 'CANCELLED', 'REJECTED_BY_BUYER', 'DISPUTED'].includes(e.state)).map(errand => (
                    <div key={errand.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start justify-between gap-4 opacity-80 hover:opacity-100 transition-opacity">
                      <div>
                        <h3 className="font-bold text-lg text-slate-700 line-through decoration-slate-300">{errand.itemName}</h3>
                        <p className="text-sm text-slate-500 mb-2 font-medium flex items-center gap-2">
                          {errand.pickupLocation.address} → {errand.dropoffLocation.address}
                        </p>
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block uppercase tracking-wider mb-4 ${errand.state === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {errand.state.replace(/_/g, ' ')}
                        </div>

                        {/* Rider Info */}
                        {errand.actualRiderName && (
                          <div className="flex items-center gap-2 mt-2">
                            {errand.actualRiderImageUrl ? (
                              <img src={errand.actualRiderImageUrl} alt={errand.actualRiderName} className="w-6 h-6 rounded-full object-cover grayscale" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                <Car className="w-3 h-3 text-slate-400" />
                              </div>
                            )}
                            <p className="text-xs font-semibold text-slate-500">{errand.actualRiderName}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Earned</p>
                        <p className="text-xl font-black text-slate-700">₦{errand.deliveryFee?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <PricingSettings />
        ) : null}
      </div>

      {/* Edit Rider Modal */}
      {editingRider && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#F7F4EC] rounded-[24px] p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-[16px] font-bold text-[#15140F] mb-6">Edit Rider</h2>
            <form onSubmit={handleUpdateRider} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#A8A398] mb-1.5">Full name</label>
                <input
                  type="text"
                  value={editRiderName}
                  onChange={(e) => setEditRiderName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] focus:outline-none focus:border-[#15140F] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A8A398] mb-1.5">New password</label>
                <input
                  type="password"
                  value={editRiderPassword}
                  onChange={(e) => setEditRiderPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] placeholder-[#A8A398] focus:outline-none focus:border-[#15140F] transition-colors font-mono tracking-widest"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A8A398] mb-1.5">Vehicle plate <span className="font-normal opacity-70">(optional)</span></label>
                <input
                  type="text"
                  value={editRiderPlateNumber}
                  onChange={(e) => setEditRiderPlateNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[#EAEAEA] rounded-[8px] text-[13px] text-[#15140F] placeholder-[#A8A398] focus:outline-none focus:border-[#15140F] transition-colors"
                  placeholder="ABC-123"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A8A398] mb-1.5">Rider photo <span className="font-normal opacity-70">(optional)</span></label>
                <div className="flex items-center w-full px-2 py-2 bg-transparent border border-[#EAEAEA] rounded-[8px]">
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <button type="button" className="bg-[#15140F] text-white py-1 px-3 rounded-[6px] text-[11px] font-medium mr-3">
                      Choose File
                    </button>
                  </div>
                  <span className="text-[12px] text-[#6E6B5E] flex-1">
                    {isUploadingImage ? 'Uploading...' : editRiderImageUrl ? 'Image selected' : 'No file chosen'}
                  </span>
                  {editRiderImageUrl && !isUploadingImage && (
                    <img src={editRiderImageUrl} alt="Rider" className="w-6 h-6 object-cover rounded-full ml-2" />
                  )}
                </div>
              </div>
              
              <div className="flex gap-4 mt-8 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRider(null)}
                  className="px-8 py-2.5 bg-[#15140F] hover:bg-black text-white text-[13px] font-bold rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRider || !editRiderName}
                  className="px-8 py-2.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#15140F] text-[13px] font-bold rounded-full disabled:opacity-50 transition-colors shadow-[0_4px_14px_rgba(255,204,0,0.2)]"
                >
                  {updatingRider ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Status Modal */}
      {modalState.show && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${modalState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {modalState.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{modalState.title}</h2>
              <p className="text-slate-500 mb-8">{modalState.message}</p>
              <button 
                onClick={() => setModalState(prev => ({...prev, show: false}))}
                className="w-full py-3 bg-nomba-dark text-nomba-yellow font-bold rounded-xl hover:bg-black transition-colors"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
