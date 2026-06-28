import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Save, MapPin } from 'lucide-react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries: "places"[] = ["places"];

export default function PricingSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [baseAddress, setBaseAddress] = useState("");
  const [baseLatitude, setBaseLatitude] = useState<number | null>(null);
  const [baseLongitude, setBaseLongitude] = useState<number | null>(null);
  const [baseFare, setBaseFare] = useState<number>(1500);
  const [baseDistance, setBaseDistance] = useState<number>(5);
  const [perKmRate, setPerKmRate] = useState<number>(100);
  const [maxRadius, setMaxRadius] = useState<number>(30);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/fleet/settings?companyId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.pricingSettings) {
            setBaseAddress(data.pricingSettings.baseAddress || "");
            setBaseLatitude(data.pricingSettings.baseLatitude || null);
            setBaseLongitude(data.pricingSettings.baseLongitude || null);
            setBaseFare(data.pricingSettings.baseFare || 1500);
            setBaseDistance(data.pricingSettings.baseDistance || 5);
            setPerKmRate(data.pricingSettings.perKmRate || 100);
            setMaxRadius(data.pricingSettings.maxRadius || 30);
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const onLoad = (autocompleteInst: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInst);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        setBaseAddress(place.formatted_address || place.name || "");
        setBaseLatitude(place.geometry.location.lat());
        setBaseLongitude(place.geometry.location.lng());
      }
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/fleet/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: user.uid,
          baseAddress,
          baseLatitude,
          baseLongitude,
          baseFare: Number(baseFare),
          baseDistance: Number(baseDistance),
          perKmRate: Number(perKmRate),
          maxRadius: Number(maxRadius)
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Pricing settings updated successfully!" });
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update settings");
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-nomba-yellow" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Pricing & Location Configuration</h2>
      
      {message && (
        <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Location Section */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-nomba-dark" />
            Base Office Location
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Address</label>
            {!isLoaded ? (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
              </div>
            ) : (
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <input
                  type="text"
                  placeholder="Enter your office address"
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nomba-yellow"
                  required
                />
              </Autocomplete>
            )}
            <p className="text-xs text-slate-500 mt-2">
              This location is used as the starting point to calculate distance to pickups.
            </p>
          </div>
        </div>

        {/* Pricing Rules */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Pricing Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Fare (₦)</label>
              <input
                type="number"
                min="0"
                value={baseFare}
                onChange={(e) => setBaseFare(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nomba-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Distance Included (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={baseDistance}
                onChange={(e) => setBaseDistance(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nomba-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate per extra km (₦)</label>
              <input
                type="number"
                min="0"
                value={perKmRate}
                onChange={(e) => setPerKmRate(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nomba-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Service Radius (km)</label>
              <input
                type="number"
                min="0"
                value={maxRadius}
                onChange={(e) => setMaxRadius(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nomba-yellow"
                required
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={saving || !baseLatitude}
          className="w-full py-4 bg-nomba-dark hover:bg-black text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center transition-colors gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "Saving Configuration..." : "Save Pricing Configuration"}
        </button>
      </form>
    </div>
  );
}
