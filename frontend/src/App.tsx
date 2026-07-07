import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import BuyerDashboard from "./pages/BuyerDashboard";
import BuyerCheckout from "./pages/BuyerCheckout";
import VendorTracking from "./pages/VendorTracking";
import RunnerDashboard from "./pages/RunnerDashboard";
import RunnerTracking from "./pages/RunnerTracking";
import BuyerTracking from "./pages/BuyerTracking";
import RunnerSignup from "./pages/RunnerSignup";
import RunnerLogin from "./pages/RunnerLogin";
import ProfileCompletion from "./pages/ProfileCompletion";
import RunnerKyc from "./pages/RunnerKyc";
import RiderFeed from "./pages/RiderFeed";
import BuyerHistory from "./pages/BuyerHistory";
import { unlockAudio } from "./utils/audio";
import PwaInstallBanner from "./components/PwaInstallBanner";

function App() {
  useEffect(() => {
    const handleUnlock = () => {
      unlockAudio();
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };

    document.addEventListener('click', handleUnlock);
    document.addEventListener('touchstart', handleUnlock);

    return () => {
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };
  }, []);

  return (
    <AuthProvider>
      <PwaInstallBanner />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/buyer/history" element={<BuyerHistory />} />
          <Route path="/buyer/checkout/:id" element={<BuyerCheckout />} />
          <Route path="/share/:id" element={<VendorTracking />} />
          <Route path="/buyer/tracking/:id" element={<BuyerTracking />} />
          <Route path="/runner/login" element={<RunnerLogin />} />
          <Route path="/runner/signup" element={<RunnerSignup />} />
          <Route path="/runner/complete-profile" element={<ProfileCompletion />} />
          <Route path="/runner/kyc" element={<RunnerKyc />} />
          <Route path="/runner" element={<RunnerDashboard />} />
          <Route path="/runner/tracking/:id" element={<RunnerTracking />} />
          <Route path="/rider/feed" element={<RiderFeed />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
