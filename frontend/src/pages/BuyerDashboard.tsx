import { useState } from "react";
import { Link } from "react-router-dom";
import { Box, MapPin } from "lucide-react";

export default function BuyerDashboard() {
  const [itemName, setItemName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState(""); 
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");

  return (
    <div className="min-h-screen bg-luggik-bg font-sans overflow-hidden flex flex-col">
      
      {/* Navigation Container */}
      <div className="pt-6 px-6 flex justify-center w-full mb-8">
        <nav className="flex items-center justify-between px-8 py-3 bg-transparent border border-[#EAEAEA] rounded-full w-full max-w-[1200px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#D9D9D9] rounded-sm"></div>
            <span className="text-[17px] font-bold tracking-tight text-[#111111]">Luggik</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-8">
            <Link to="/runner/login" className="text-[14px] font-medium text-[#111111] hover:opacity-80 transition-opacity">
              Driver Login
            </Link>
            <Link to="/buyer" className="flex items-center justify-center bg-black text-white px-6 py-2.5 rounded-full font-medium text-[14px] hover:bg-gray-900 transition-colors shadow-sm">
              Start an errand
            </Link>
          </div>
        </nav>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pb-24 mt-[71px]">
        
        <h1 className="text-[32px] font-bold text-[#111111] tracking-tight mb-8">
          Start an errand
        </h1>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column - Form */}
          <div className="flex-1 w-full bg-transparent border border-[#EAEAEA] rounded-[24px] p-8 md:p-10">
            
            {/* Header */}
            <div className="flex items-start gap-4 mb-10">
              <div className="w-[44px] h-[44px] rounded-[14px] border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center shrink-0">
                <Box className="w-5 h-5 text-[#6E6B5E]" strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h2 className="text-[20px] font-bold text-[#0B0F0E] mb-1">Errand details</h2>
                <p className="text-[14px] text-[#6E6B5E] leading-[1.6]">
                  Tell us what you're buying from, and where it's going. Your payment is held in escrow until the vendor delivers.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]">1</div>
              <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Item Information</span>
              <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Item name</label>
                <input 
                  type="text" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)} 
                  className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Item price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A398] font-medium">₦</span>
                  <input 
                    type="text" 
                    value={priceAmount} 
                    onChange={(e) => setPriceAmount(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-9 pr-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]">2</div>
              <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Your Details (Dropoff)</span>
              <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
            </div>

            <div className="space-y-4 mb-10">
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your name</label>
                <input 
                  type="text" 
                  value={buyerName} 
                  onChange={(e) => setBuyerName(e.target.value)} 
                  className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your email</label>
                  <input 
                    type="email" 
                    value={buyerEmail} 
                    onChange={(e) => setBuyerEmail(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your phone</label>
                  <input 
                    type="tel" 
                    value={buyerPhone} 
                    onChange={(e) => setBuyerPhone(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Your address (delivery location)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A398]" strokeWidth={1.5} />
                  <input 
                    type="text" 
                    value={dropoffAddress} 
                    onChange={(e) => setDropoffAddress(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-7 h-7 rounded-full border border-[#DDDDD8] bg-[#F7F4EC] flex items-center justify-center text-[12px] font-medium text-[#6E6B5E]">3</div>
              <span className="text-[12px] font-medium text-[#6E6B5E] tracking-[0.06em] uppercase">Vendor Details (Pickup)</span>
              <div className="flex-1 h-[1px] bg-[#DDDDD8]/50"></div>
            </div>

            <div className="space-y-4 mb-10">
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor name / business name</label>
                <input 
                  type="text" 
                  value={vendorName} 
                  onChange={(e) => setVendorName(e.target.value)} 
                  className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor email</label>
                  <input 
                    type="email" 
                    value={vendorEmail} 
                    onChange={(e) => setVendorEmail(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor phone</label>
                  <input 
                    type="tel" 
                    value={vendorPhone} 
                    onChange={(e) => setVendorPhone(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] px-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6E6B5E] mb-2">Vendor address (pickup location)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A398]" strokeWidth={1.5} />
                  <input 
                    type="text" 
                    value={pickupAddress} 
                    onChange={(e) => setPickupAddress(e.target.value)} 
                    className="w-full bg-[#F7F4EC] border border-[#DDDDD8] rounded-[12px] pl-10 pr-4 py-3.5 text-[15px] text-[#0B0F0E] font-medium focus:outline-none focus:border-[#CCCCCC]" 
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button className="bg-luggik-yellow text-[#0B0F0E] px-8 py-3.5 rounded-full font-semibold text-[15px] hover:brightness-105 transition-colors">
                Continue to payment
              </button>
            </div>

          </div>
          
          {/* Right Column - Summary */}
          <div className="w-full lg:w-[420px] bg-[#15140F] rounded-[24px] p-8 text-[#F7F4EC] shadow-xl sticky top-8">
            <h3 className="text-[17px] font-bold mb-3">Escrow summary</h3>
            <p className="text-[13px] text-[#A8A398] leading-[1.6] mb-8">
              This is what gets locked in escrow once you continue released to the vendor only after you confirm delivery.
            </p>

            <div className="flex flex-col">
              <div className="flex items-center justify-between py-4 border-b border-white/10">
                <span className="text-[13px] text-[#A8A398]">Item</span>
                <span className="text-[13px] font-medium">{itemName || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-white/10">
                <span className="text-[13px] text-[#A8A398]">Vendor</span>
                <span className="text-[13px] font-medium">{vendorName || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-white/10">
                <span className="text-[13px] text-[#A8A398]">Pickup</span>
                <span className="text-[13px] font-medium">{pickupAddress || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-[13px] text-[#A8A398]">Dropoff</span>
                <span className="text-[13px] font-medium">{dropoffAddress || "-"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
