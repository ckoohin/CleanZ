"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin } from "lucide-react";

const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || "";

interface Place {
  place_id: string;
  description: string;
}

interface GoongAutocompleteProps {
  onSelect: (place_id: string, description: string) => void;
  placeholder?: string;
  className?: string;
}

export const GoongAutocomplete = ({ onSelect, placeholder = "Tìm kiếm địa chỉ...", className = "" }: GoongAutocompleteProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.predictions) {
          setResults(data.predictions);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Autocomplete error", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const handleSelect = (place: Place) => {
    setQuery(place.description);
    setResults([]);
    setIsFocused(false);
    onSelect(place.place_id, place.description);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/80" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/80 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
        />
      </div>

      {isFocused && (query.length >= 3 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-lg border border-border/50 overflow-hidden z-50">
          {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Đang tìm kiếm...</div>}
          {!isLoading && results.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy kết quả phù hợp</div>}
          
          <ul className="max-h-60 overflow-y-auto">
            {results.map((place) => (
              <li 
                key={place.place_id}
                onClick={() => handleSelect(place)}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0 transition-colors"
              >
                <MapPin className="w-5 h-5 text-muted-foreground/80 mt-0.5 shrink-0" />
                <span className="text-sm text-foreground/90">{place.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
