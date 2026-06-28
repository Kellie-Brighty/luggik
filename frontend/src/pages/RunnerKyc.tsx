import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dojah from 'dojah-kyc-sdk-react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RunnerKyc() {
  const navigate = useNavigate();
  const { user, refreshKycStatus } = useAuth();

  const [kycCompleted, setKycCompleted] = useState(false);
  const [showWidget, setShowWidget] = useState(false); // Added state to control widget visibility

  const [kycSubmitted, setKycSubmitted] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/runner/login');
    }
  }, [user, navigate]);

  // Poll the backend for real-time webhook updates once submitted
  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (kycSubmitted && !kycCompleted) {
      intervalId = setInterval(async () => {
        await refreshKycStatus();
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [kycSubmitted, kycCompleted, refreshKycStatus]);

  const { kycStatus } = useAuth();
  
  React.useEffect(() => {
    if (kycStatus === 'approved' && kycSubmitted) {
      setKycCompleted(true);
      setTimeout(() => navigate('/runner'), 2000);
    }
  }, [kycStatus, kycSubmitted, navigate]);

  // User provided Sandbox Keys
  const appID = "6a40209b109a584f7d53e715";
  const publicKey = "test_pk_SSKxQFTCplZVGXQXZBn4exBLB";

  const response = async (type: string, data: any) => {
    console.log('[Dojah Callback]', type, data);

    if (type === 'success') {
      setShowWidget(false);
      setKycSubmitted(true); // Triggers polling
    } else if (type === 'error') {
      console.error('Dojah verification failed', data);
      setShowWidget(false); // hide on error so user can try again
    } else if (type === 'close') {
      console.log('Dojah widget closed');
      setShowWidget(false); // hide if closed manually
    }
  };

  if (kycCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Complete</h2>
          <p className="text-slate-500 mb-6">Your logistics profile has been approved.</p>
          <Loader2 className="w-6 h-6 animate-spin text-nomba-yellow mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-slate-200 text-center">
        <ShieldCheck className="w-12 h-12 text-nomba-dark mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Business Verification</h1>
        <p className="text-slate-500 mb-8">
          To ensure the safety of our escrow platform, all logistics partners must complete business identity verification before accepting deliveries.
        </p>
        
        {kycSubmitted ? (
          <div className="py-4">
            <Loader2 className="w-8 h-8 animate-spin text-nomba-yellow mx-auto" />
            <p className="text-sm text-slate-500 mt-4">
              {kycSubmitted ? "Awaiting Dojah verification results..." : "Processing..."}
            </p>
          </div>
        ) : showWidget ? (
          <Dojah
            appID={appID}
            publicKey={publicKey}
            type="custom"
            userData={{ email: user?.email || '' }}
            config={{ widget_id: "6a40f31b109a584f7d56fb21" }} // Required for type="custom"
            metadata={{ uid: user?.uid || '' }}
            response={response}
          />
        ) : (
          <button
            onClick={() => setShowWidget(true)}
            className="w-full bg-slate-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Start Verification
          </button>
        )}
      </div>
    </div>
  );
}
