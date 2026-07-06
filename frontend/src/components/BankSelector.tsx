import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface BankSelectorProps {
  banks: { code: string; name: string }[];
  value: string;
  onChange: (code: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}

export default function BankSelector({ banks, value, onChange, className = '', buttonClassName = 'px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-nomba-yellow', placeholder = 'Select Bank' }: BankSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedBank = banks.find(b => b.code === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const filteredBanks = banks.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 ${buttonClassName}`}
      >
        <span className={selectedBank ? 'text-slate-900' : 'text-slate-500'}>
          {selectedBank ? selectedBank.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nomba-yellow"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-2">
            {filteredBanks.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No banks found</div>
            ) : (
              filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    onChange(bank.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 transition-colors ${value === bank.code ? 'bg-nomba-yellow/10 font-medium text-nomba-dark' : 'text-slate-700'}`}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
