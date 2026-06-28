import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Package className="w-8 h-8 text-nomba-dark" />
          <span className="text-2xl font-bold tracking-tight text-nomba-dark">Luggik</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/runner/login" className="text-slate-600 hover:text-nomba-dark font-medium transition-colors">
            Driver Login
          </Link>
          <Link to="/buyer" className="bg-nomba-yellow text-nomba-dark px-5 py-2.5 rounded-full font-medium hover:brightness-105 transition-colors shadow-sm">
            Buy Safely
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nomba-yellow/20 text-nomba-dark font-medium text-sm mb-8 border border-nomba-yellow/30">
          <ShieldCheck className="w-4 h-4" />
          Powered by Nomba Escrow
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-nomba-dark tracking-tight leading-tight max-w-4xl mx-auto mb-8">
          Buy from anyone. <br />
          <span className="text-nomba-yellow drop-shadow-sm">Without the fear.</span>
        </h1>
        
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
          The ultimate trust layer for Instagram and WhatsApp vendors. We lock your funds safely in escrow and only release them when our runner physically delivers your item.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/buyer" 
            className="flex items-center justify-center gap-2 bg-nomba-yellow text-nomba-dark px-8 py-4 rounded-full font-semibold text-lg hover:brightness-105 transition-all shadow-lg hover:shadow-nomba-yellow/25 w-full sm:w-auto hover:-translate-y-0.5"
          >
            Start an Errand
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link 
            to="/runner/signup" 
            className="flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-50 transition-all shadow-sm border border-slate-200 w-full sm:w-auto"
          >
            <Truck className="w-5 h-5 text-slate-500" />
            Join as a Runner
          </Link>
        </div>
      </main>
    </div>
  );
}
