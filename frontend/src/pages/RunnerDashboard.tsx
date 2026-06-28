import { ArrowLeft, Loader2, AlertCircle, LogOut, Users, PackageSearch, UserPlus, Mail, Lock, Eye, EyeOff, CheckCircle2, Car, ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

interface Errand {
  id: string;
  itemName: string;
  priceAmount: number;
  deliveryFee: number;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  state: string;
}

export default function RunnerDashboard() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'errands' | 'fleet'>('errands');
  
  // Rider creation state
  const [newRiderEmail, setNewRiderEmail] = useState("");
  const [newRiderPassword, setNewRiderPassword] = useState("");
  const [newRiderName, setNewRiderName] = useState("");
  const [newRiderPlateNumber, setNewRiderPlateNumber] = useState("");
  const [newRiderImageUrl, setNewRiderImageUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      window.location.href = '/';
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
      where("state", "==", "CREATED"),
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

    return () => unsubscribe();
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
          const res = await fetch('https://api.hicity.me/upload', {
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
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-6">
          <Link to="/" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex-1">Dispatcher Dashboard</h1>
          <button 
            onClick={handleLogout} 
            className="text-sm font-medium text-slate-600 hover:text-red-600 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-200 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('errands')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${activeTab === 'errands' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <PackageSearch className="w-5 h-5" />
            Available Errands
          </button>
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${activeTab === 'fleet' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-5 h-5" />
            My Fleet
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'errands' ? (
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-nomba-yellow" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-700 border border-red-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && errands.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">No New Errands</h3>
                <p className="text-slate-500">Check back later for new delivery requests.</p>
              </div>
            )}

            {errands.map(errand => (
              <div key={errand.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{errand.itemName}</h3>
                    <p className="text-slate-500 text-sm">Delivery Fee: ₦{errand.deliveryFee?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-nomba-yellow mt-2"></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">PICKUP</p>
                      <p className="text-sm text-slate-900">{errand.pickupLocation?.address || 'Vendor Location'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-nomba-dark mt-2"></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">DROPOFF</p>
                      <p className="text-sm text-slate-900">{errand.dropoffLocation?.address || 'Buyer Location'}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleAccept(errand.id)}
                  disabled={acceptingId === errand.id}
                  className="w-full py-4 bg-nomba-dark hover:bg-black text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {acceptingId === errand.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Accept Errand For Fleet"
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Create Rider Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-slate-700" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Register New Rider</h2>
              </div>
              <form onSubmit={handleCreateRider} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={newRiderName}
                      onChange={(e) => setNewRiderName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-dark focus:border-nomba-dark"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rider Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={newRiderEmail}
                      onChange={(e) => setNewRiderEmail(e.target.value)}
                      placeholder="rider@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={newRiderPassword}
                      onChange={(e) => setNewRiderPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Plate Number (Optional)</label>
                  <div className="relative">
                    <Car className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={newRiderPlateNumber}
                      onChange={(e) => setNewRiderPlateNumber(e.target.value)}
                      placeholder="ABC-123"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-yellow focus:border-nomba-yellow outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rider Photo (Optional)</label>
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-nomba-yellow file:text-nomba-dark transition-all cursor-pointer"
                      />
                    </div>
                    {isUploadingImage && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
                    {newRiderImageUrl && !isUploadingImage && (
                      <img src={newRiderImageUrl} alt="Rider" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
                    )}
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={creatingRider || !newRiderEmail || !newRiderPassword || isUploadingImage}
                  className="w-full py-3 bg-nomba-dark text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  {creatingRider ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Rider Account"}
                </button>
              </form>
            </div>

            {/* Rider List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">My Fleet ({riders.length})</h2>
              {riders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">You haven't added any riders yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {riders.map((r, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                          {r.imageUrl ? (
                            <img src={r.imageUrl} alt="Rider" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{r.name ? `${r.name} (${r.email})` : r.email}</p>
                          <p className="text-xs text-slate-500">Added {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setEditingRider(r);
                            setEditRiderName(r.name || "");
                            setEditRiderPassword("");
                            setEditRiderPlateNumber(r.plateNumber || "");
                            setEditRiderImageUrl(r.imageUrl || "");
                          }}
                          className="text-nomba-dark text-sm font-medium hover:underline"
                        >
                          Edit
                        </button>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Rider Modal */}
      {editingRider && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Rider</h2>
            <form onSubmit={handleUpdateRider} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={editRiderName}
                    onChange={(e) => setEditRiderName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-dark focus:border-nomba-dark"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password (Optional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    value={editRiderPassword}
                    onChange={(e) => setEditRiderPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-dark focus:border-nomba-dark"
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Plate Number (Optional)</label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={editRiderPlateNumber}
                    onChange={(e) => setEditRiderPlateNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-nomba-dark focus:border-nomba-dark"
                    placeholder="ABC-123"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rider Photo (Optional)</label>
                <div className="relative flex items-center gap-3">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-nomba-dark file:text-white transition-all cursor-pointer"
                    />
                  </div>
                  {isUploadingImage && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
                  {editRiderImageUrl && !isUploadingImage && (
                    <img src={editRiderImageUrl} alt="Rider" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm" />
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingRider(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRider || !editRiderName}
                  className="flex-1 py-3 bg-nomba-dark text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
                >
                  {updatingRider ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Changes"}
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
