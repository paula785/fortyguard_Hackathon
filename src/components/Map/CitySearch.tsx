"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { buildAOIFromCenter } from "@/lib/fortyguard-client";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

const FEATURED_CITIES = [
  { name: "Demo Heatmap - California", lat: 34.0522, lon: -118.2437, tag: "FortyGuard Demo Swath" },
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074, tag: "Desert Hotspot" },
  { name: "Houston, TX", lat: 29.7604, lon: -95.3698, tag: "Humid Heat Island" },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918, tag: "Coastal Urban" },
  { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398, tag: "Arid Core" },
  { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708, tag: "Hyper-Arid" },
  { name: "Seville, Spain", lat: 37.3891, lon: -5.9845, tag: "Mediterranean Basin" },
];

export default function CitySearch({ onLocationSelect }: { onLocationSelect?: (lat: number, lon: number, name: string) => void }) {
  const { city, setCity, setLatLon, setAOI } = useAppStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search to Nominatim
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=6`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (latNum: number, lonNum: number, name: string) => {
    setCity(name);
    setLatLon(latNum, lonNum);
    const newAoi = buildAOIFromCenter(latNum, lonNum, 2);
    setAOI(newAoi);
    setIsOpen(false);
    setQuery("");
    if (onLocationSelect) {
      onLocationSelect(latNum, lonNum, name);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: 360 }}>
      {/* Search Input Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.4rem 0.85rem",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(52, 211, 153, 0.3)",
          borderRadius: "var(--radius-full, 9999px)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>🌍</span>
        <input
          type="text"
          value={isOpen ? query : query || city}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (!query) setQuery(city);
          }}
          placeholder="Search any city or address globally..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary, #f8fafc)",
            fontSize: "0.85rem",
            fontWeight: 600,
            width: "100%",
          }}
        />
        {isLoading ? (
          <div
            style={{
              width: 14,
              height: 14,
              border: "2px solid #34d399",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(52, 211, 153, 0.25)",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
            padding: "0.6rem",
            zIndex: 1000,
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {/* Nominatim Search Results */}
          {results.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#34d399",
                  fontWeight: 700,
                  padding: "0.2rem 0.4rem",
                }}
              >
                Global Geocoding Matches
              </div>
              {results.map((r) => {
                const parts = r.display_name.split(",");
                const title = parts.slice(0, 2).join(",");
                const subtitle = parts.slice(2, 4).join(",");
                return (
                  <button
                    key={r.place_id}
                    onClick={() => handleSelect(parseFloat(r.lat), parseFloat(r.lon), title)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "0.5rem 0.7rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid transparent",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      color: "#f8fafc",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(52, 211, 153, 0.15)";
                      e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>📍 {title}</div>
                    {subtitle && (
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
                        {subtitle}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 && !isLoading ? (
            <div style={{ padding: "0.8rem", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
              No locations found. Try city name or postal code.
            </div>
          ) : (
            /* Featured Urban Heat Presets */
            <div>
              <div
                style={{
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#34d399",
                  fontWeight: 700,
                  padding: "0.2rem 0.4rem 0.4rem",
                }}
              >
                Featured Microclimate Testbeds
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {FEATURED_CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleSelect(c.lat, c.lon, c.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.45rem 0.7rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid transparent",
                      borderRadius: "8px",
                      cursor: "pointer",
                      color: "#f8fafc",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(52, 211, 153, 0.15)";
                      e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <span>🏙️ {c.name}</span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#34d399",
                      }}
                    >
                      {c.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
