import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import BuyerDashboard from "./pages/BuyerDashboard";
import RunnerDashboard from "./pages/RunnerDashboard";
import RunnerTracking from "./pages/RunnerTracking";
import BuyerTracking from "./pages/BuyerTracking";
import RunnerSignup from "./pages/RunnerSignup";
import RunnerLogin from "./pages/RunnerLogin";
import ProfileCompletion from "./pages/ProfileCompletion";
import RunnerKyc from "./pages/RunnerKyc";
import RiderFeed from "./pages/RiderFeed";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/buyer" element={<BuyerDashboard />} />
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
