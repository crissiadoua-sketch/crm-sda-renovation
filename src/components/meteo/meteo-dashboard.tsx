"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Wind, Droplets, Thermometer, RefreshCw, MapPin, AlertTriangle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Villes configurées                                                   */
/* ------------------------------------------------------------------ */

export const VILLES_DEFAUT = [
  { nom: "Cugnaux",                 lat: 43.5404, lon: 1.3354 },
  { nom: "Toulouse",                lat: 43.6047, lon: 1.4442 },
  { nom: "Muret",                   lat: 43.4644, lon: 1.3304 },
  { nom: "Colomiers",               lat: 43.6109, lon: 1.3328 },
  { nom: "Blagnac",                 lat: 43.6367, lon: 1.3873 },
  { nom: "Tournefeuille",           lat: 43.5852, lon: 1.3432 },
  { nom: "Saint-Jory",              lat: 43.7295, lon: 1.4136 },
  { nom: "Saint-Orens",             lat: 43.5551, lon: 1.5091 },
  { nom: "Labège",                  lat: 43.5586, lon: 1.5246 },
  { nom: "Croix-Falgarde",          lat: 43.5105, lon: 1.3961 },
  { nom: "Carcassonne",             lat: 43.2119, lon: 2.3533 },
  { nom: "Agen",                    lat: 44.2022, lon: 0.6218 },
  { nom: "Montauban",               lat: 44.0178, lon: 1.3556 },
  { nom: "Tarbes",                  lat: 43.2328, lon: 0.0780 },
  { nom: "Pau",                     lat: 43.2951, lon: -0.3708 },
  { nom: "Foix",                    lat: 42.9640, lon: 1.6059 },
  { nom: "Auch",                    lat: 43.6461, lon: 0.5856 },
] as const;

/* ------------------------------------------------------------------ */
/*  Codes météo WMO → label + emoji                                     */
/* ------------------------------------------------------------------ */

function weatherInfo(code: number): { label: string; emoji: string; intemperies: boolean } {
  const map: [number[], { label: string; emoji: string; intemperies: boolean }][] = [
    [[0],         { label: "Ciel dégagé",          emoji: "☀️",  intemperies: false }],
    [[1],         { label: "Principalement dégagé", emoji: "🌤️", intemperies: false }],
    [[2],         { label: "Partiellement nuageux", emoji: "⛅",  intemperies: false }],
    [[3],         { label: "Couvert",               emoji: "☁️",  intemperies: false }],
    [[45, 48],    { label: "Brouillard",             emoji: "🌫️", intemperies: true  }],
    [[51, 53],    { label: "Bruine légère",          emoji: "🌦️", intemperies: false }],
    [[55],        { label: "Bruine forte",           emoji: "🌧️", intemperies: true  }],
    [[61],        { label: "Pluie légère",           emoji: "🌧️", intemperies: false }],
    [[63],        { label: "Pluie modérée",          emoji: "🌧️", intemperies: true  }],
    [[65],        { label: "Pluie forte",            emoji: "🌧️", intemperies: true  }],
    [[71, 73, 75, 77], { label: "Neige",            emoji: "❄️",  intemperies: true  }],
    [[80],        { label: "Averses légères",        emoji: "🌦️", intemperies: false }],
    [[81],        { label: "Averses modérées",       emoji: "🌧️", intemperies: true  }],
    [[82],        { label: "Averses violentes",      emoji: "⛈️", intemperies: true  }],
    [[85, 86],    { label: "Averses de neige",       emoji: "🌨️", intemperies: true  }],
    [[95],        { label: "Orage",                  emoji: "⛈️", intemperies: true  }],
    [[96, 99],    { label: "Orage avec grêle",       emoji: "⛈️", intemperies: true  }],
  ];
  for (const [codes, info] of map) {
    if ((codes as number[]).includes(code)) return info;
  }
  return { label: "Inconnu", emoji: "❓", intemperies: false };
}

function windDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

/* ------------------------------------------------------------------ */
/*  Types API                                                            */
/* ------------------------------------------------------------------ */

interface WeatherData {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  admin1?: string;
}

/* ------------------------------------------------------------------ */
/*  Fetch météo                                                          */
/* ------------------------------------------------------------------ */

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Europe%2FParis&forecast_days=7`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("API météo indisponible");
  return res.json();
}

async function geocode(query: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=fr&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

/* ------------------------------------------------------------------ */
/*  Composant "aperçu rapide" pour une ville                            */
/* ------------------------------------------------------------------ */

function VilleCard({
  ville,
  onClick,
  active,
}: {
  ville: { nom: string; lat: number; lon: number };
  onClick: () => void;
  active: boolean;
}) {
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);

  useEffect(() => {
    fetchWeather(ville.lat, ville.lon).then(d => {
      setTemp(Math.round(d.current.temperature_2m));
      setCode(d.current.weather_code);
    }).catch(() => {});
  }, [ville.lat, ville.lon]);

  const info = code !== null ? weatherInfo(code) : null;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all hover:shadow-md ${
        active
          ? "border-brand-blue bg-brand-blue text-white shadow-md"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-blue/40"
      }`}
    >
      <span className="text-xl">{info?.emoji ?? "⏳"}</span>
      <span className={`text-xs font-semibold truncate w-full ${active ? "text-white" : "text-slate-700"}`}>{ville.nom}</span>
      <span className={`text-sm font-bold ${active ? "text-white" : "text-brand-navy"}`}>
        {temp !== null ? `${temp}°C` : "…"}
      </span>
      {info?.intemperies && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
          ⚠ Intempéries
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard principal                                                  */
/* ------------------------------------------------------------------ */

export function MeteoDashboard() {
  const [villeActive, setVilleActive] = useState<{ nom: string; lat: number; lon: number }>(VILLES_DEFAUT[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Recherche de ville
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadWeather = useCallback(async (v: { nom: string; lat: number; lon: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(v.lat, v.lon);
      setWeather(data);
      setLastUpdate(new Date());
    } catch {
      setError("Impossible de charger les données météo. Vérifiez votre connexion Internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(villeActive);
  }, [villeActive, loadWeather]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const results = await geocode(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  };

  const selectGeoResult = (r: GeoResult) => {
    const v = { nom: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}`, lat: r.latitude, lon: r.longitude };
    setVilleActive(v);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const current = weather?.current;
  const daily = weather?.daily;
  const currentInfo = current ? weatherInfo(current.weather_code) : null;

  return (
    <div className="flex flex-col gap-5">

      {/* Grille villes rapides */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Villes configurées</p>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-white px-3 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/5"
          >
            <Search className="h-3 w-3" />
            Autre ville / département
          </button>
        </div>

        {/* Recherche libre */}
        {showSearch && (
          <div className="mb-3 rounded-xl border border-brand-blue/30 bg-white p-3 shadow-sm">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Nom de ville, département, région…"
                spellCheck
                lang="fr"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="rounded-lg bg-brand-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60"
              >
                {searching ? "…" : "Chercher"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectGeoResult(r)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
                  >
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">{r.name}</span>
                    {r.admin1 && <span className="text-slate-400">{r.admin1}</span>}
                    <span className="ml-auto text-xs text-slate-300">{r.country_code?.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
            {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
              <p className="mt-2 text-xs text-slate-400">Aucun résultat — appuyez sur Chercher ou saisissez au moins 2 caractères</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
          {VILLES_DEFAUT.map(v => (
            <VilleCard
              key={v.nom}
              ville={v}
              active={villeActive.nom === v.nom}
              onClick={() => setVilleActive(v)}
            />
          ))}
        </div>
      </div>

      {/* Panneau météo détaillé */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* En-tête ville sélectionnée */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-navy to-brand-blue px-5 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-white/70" />
            <h3 className="font-bold text-white text-lg">{villeActive.nom}</h3>
            {currentInfo?.intemperies && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-500/30 px-2 py-0.5 text-xs font-semibold text-white">
                <AlertTriangle className="h-3 w-3" />
                Conditions d&apos;intempéries
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-[11px] text-white/60">
                Mis à jour : {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => loadWeather(villeActive)}
              className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
              title="Actualiser"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-3 p-6 text-sm text-amber-700 bg-amber-50">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            {error}
          </div>
        ) : loading && !weather ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-blue" />
            <span className="ml-2 text-sm text-slate-500">Chargement des données météo…</span>
          </div>
        ) : current && currentInfo ? (
          <div className="p-5 flex flex-col gap-5">
            {/* Conditions actuelles */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <span className="text-6xl">{currentInfo.emoji}</span>
                <div>
                  <p className="text-4xl font-bold text-brand-navy">{Math.round(current.temperature_2m)}°C</p>
                  <p className="text-sm text-slate-500">Ressenti : {Math.round(current.apparent_temperature)}°C</p>
                  <p className="mt-1 text-base font-semibold text-slate-700">{currentInfo.label}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span>Humidité : <strong>{current.relative_humidity_2m}%</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Wind className="h-4 w-4 text-slate-400" />
                  <span>Vent : <strong>{Math.round(current.wind_speed_10m)} km/h {windDirection(current.wind_direction_10m)}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Thermometer className="h-4 w-4 text-brand-orange" />
                  <span>Précipitations : <strong>{current.precipitation} mm</strong></span>
                </div>
              </div>
            </div>

            {/* Alerte intempéries BTP */}
            {currentInfo.intemperies && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Conditions d&apos;intempéries détectées</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Ces conditions peuvent justifier un arrêt de chantier pour intempéries (L5424-8 du Code du travail).
                    Pensez à renseigner votre journal de chantier et à notifier les équipes.
                  </p>
                </div>
              </div>
            )}

            {/* Prévisions 7 jours */}
            {daily && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Prévisions 7 jours</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {daily.time.map((day, i) => {
                    const info = weatherInfo(daily.weather_code[i]);
                    const isToday = i === 0;
                    return (
                      <div
                        key={day}
                        className={`rounded-xl border p-3 text-center ${
                          isToday
                            ? "border-brand-blue/40 bg-brand-blue/5"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <p className={`text-xs font-semibold mb-1 ${isToday ? "text-brand-blue" : "text-slate-500"}`}>
                          {isToday ? "Aujourd'hui" : formatDay(day)}
                        </p>
                        <div className="text-2xl mb-1">{info.emoji}</div>
                        <p className="text-xs text-slate-500 mb-1">{info.label}</p>
                        <p className="text-xs font-bold text-brand-navy">
                          {Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°
                        </p>
                        {daily.precipitation_sum[i] > 0 && (
                          <p className="text-[10px] text-blue-500 mt-0.5">
                            🌧 {daily.precipitation_sum[i].toFixed(1)} mm
                          </p>
                        )}
                        {daily.wind_speed_10m_max[i] > 50 && (
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            💨 {Math.round(daily.wind_speed_10m_max[i])} km/h
                          </p>
                        )}
                        {info.intemperies && (
                          <p className="text-[10px] font-semibold text-red-500 mt-0.5">⚠ Intempéries</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note BTP */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Journal BTP — </span>
              Source : Open-Meteo (données météo libres) · Pour valider un arrêt pour intempéries, complétez le carnet de chantier et transmettez-le à votre assureur.
              Les données affichées sont indicatives : seules les données officielles Météo-France font foi en cas de litige.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
