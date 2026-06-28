import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Loader2, Package } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  kycStatus: string | null;
  companyName: string | null;
  loading: boolean;
  refreshKycStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  kycStatus: null,
  companyName: null,
  loading: true,
  refreshKycStatus: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKycStatus = async (uid: string) => {
    try {
      const res = await fetch(`/api/kyc/status/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setKycStatus(data.kycStatus);
        setCompanyName(data.companyName);
      } else if (res.status === 404) {
        setKycStatus('missing');
        setCompanyName('');
      }
    } catch (e) {
      console.error("Failed to fetch KYC status", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchKycStatus(currentUser.uid);
      } else {
        setKycStatus(null);
        setCompanyName(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshKycStatus = async () => {
    if (user) {
      await fetchKycStatus(user.uid);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 bg-nomba-yellow rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Package className="w-8 h-8 text-nomba-dark" />
        </div>
        <Loader2 className="w-8 h-8 text-nomba-dark animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Authenticating...</h2>
        <p className="text-slate-500 mt-2">Setting up your Luggik experience safely.</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, kycStatus, companyName, loading, refreshKycStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
