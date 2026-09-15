"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place, PriceRange } from "@/lib/catalog/schema";
import { generateItinerary } from "@/lib/planner/generate";
import type { CityAllocation, Itinerary, Pace, TravelParty, TripInput } from "@/lib/planner/types";
import { listGuestItineraries } from "@/lib/persistence/guest-store";
import { ItineraryEditor } from "@/components/itinerary/itinerary-editor";
import { minutesFromTime, roundUpToHalfHour, timeFromMinutes } from "@/lib/catalog/hours";
import { findDayConflicts } from "@/lib/planner/conflicts";
import type { TravelGap } from "@/lib/planner/types";
import { PlannerProgress } from "./planner-progress";
import { CityAllocationRow } from "./city-allocation-row";
import { InterestSelector } from "./interest-selector";
import { TripSummary } from "./trip-summary";

async function addProviderRoutes(itinerary: Itinerary): Promise<Itinerary> {
  const legs = itinerary.days.flatMap((day) =>
    day.stops.slice(1).map((stop, index) => ({
      from: day.stops[index].place,
      to: stop.place,
      mode: "walking" as const,
    })),
  );
  if (!legs.length) return { ...itinerary, warnings: [] };

  const response = await fetch("/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legs }),
  });
  if (!response.ok) throw new Error("Real route estimates are unavailable.");
  const { routes } = await response.json() as { routes: TravelGap[] };
  let routeIndex = 0;
  const days = itinerary.days.map((day) => {
    let cursor = minutesFromTime(itinerary.input.dayStart);
    const stops = day.stops.map((stop, stopIndex) => {
      const travelFromPrevious = stopIndex === 0 ? null : routes[routeIndex++];
      cursor = roundUpToHalfHour(cursor + (travelFromPrevious?.minutes ?? 0));
      const updated = { ...stop, startTime: timeFromMinutes(cursor), travelFromPrevious };
      cursor += stop.durationMinutes;
      return updated;
    });
    const updated = { ...day, stops };
    return { ...updated, warnings: findDayConflicts(updated, itinerary.input.dayEnd) };
  });
  return { ...itinerary, days, warnings: [], updatedAt: new Date().toISOString() };
}

export function TripPlanner({ places, cities, initialDate }: { places: Place[]; cities: string[]; initialDate: string }) {
  const [name, setName] = useState("My Italian journey");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [allocations, setAllocations] = useState<CityAllocation[]>([
    { city: cities[0], startDate: initialDate, endDate: initialDate },
  ]);
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("19:00");
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<PriceRange | "any">("any");
  const [pace, setPace] = useState<Pace>("balanced");
  const [party, setParty] = useState<TravelParty>("couple");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [saved, setSaved] = useState<Itinerary[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const tags = useMemo(() => [...new Set(places.flatMap((place) => place.tags))].sort(), [places]);

  useEffect(() => {
    try { setSaved(listGuestItineraries()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Saved trips could not be read."); }
  }, []);

  const syncDates = (field: "start" | "end", value: string) => {
    if (field === "start") setStartDate(value); else setEndDate(value);
    setAllocations((current) => current.map((allocation, index) => index === 0 ? { ...allocation, [field === "start" ? "startDate" : "endDate"]: value } : allocation));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setGenerating(true);
    const input: TripInput = { name, startDate, endDate, cityAllocations: allocations, dayStart, dayEnd, interests, budget, pace, party };
    try {
      const baseItinerary = generateItinerary(input, places);
      try {
        setItinerary(await addProviderRoutes(baseItinerary));
      } catch {
        setItinerary(baseItinerary);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The itinerary could not be generated.");
    } finally {
      setGenerating(false);
    }
  };

  const nextStep = () => {
    setStepError("");
    if (step === 1 && (!name.trim() || startDate > endDate || dayStart >= dayEnd)) {
      setStepError("Complete the trip basics with valid dates and daily times.");
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  if (itinerary) {
    return <ItineraryEditor itinerary={itinerary} onChange={setItinerary} onClose={() => { setItinerary(null); setSaved(listGuestItineraries()); }} />;
  }

  return (
    <section className="planner-shell">
      <div className="section-heading">
        <div><p className="eyebrow">RULE-BASED PLANNER</p><h1>Shape your trip</h1><p>Every suggestion is generated locally from your dates, preferences, and realistic daily windows.</p></div>
      </div>
      {saved.length > 0 && (
        <aside className="saved-trips">
          <h2>Saved on this device</h2>
          <div className="saved-grid">{saved.map((trip) => <button type="button" key={trip.id} onClick={() => setItinerary(trip)}><strong>{trip.input.name}</strong><span>{trip.input.startDate} → {trip.input.endDate}</span></button>)}</div>
        </aside>
      )}
      <PlannerProgress currentStep={step} />
      <div className="planner-workspace">
        <form className="trip-form" onSubmit={submit}>
          {step === 1 && (
            <fieldset className="planner-step-card">
              <legend>Trip basics</legend>
              <p className="step-intro">Name the trip and set the window you want each day to use.</p>
              <div className="form-grid">
                <label className="field field-wide">Trip name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
                <label className="field">Start date<input required type="date" value={startDate} onChange={(event) => syncDates("start", event.target.value)} /></label>
                <label className="field">End date<input required type="date" min={startDate} value={endDate} onChange={(event) => syncDates("end", event.target.value)} /></label>
                <label className="field">Daily start<input required step="1800" type="time" value={dayStart} onChange={(event) => setDayStart(event.target.value)} /></label>
                <label className="field">Daily end<input required step="1800" type="time" value={dayEnd} onChange={(event) => setDayEnd(event.target.value)} /></label>
              </div>
            </fieldset>
          )}
          {step === 2 && (
            <fieldset className="planner-step-card">
              <legend>Cities and dates</legend>
              <p className="step-intro">Assign exactly one city to every date in your trip.</p>
              <div className="allocation-list">
                {allocations.map((allocation, index) => (
                  <CityAllocationRow
                    allocation={allocation}
                    canRemove={allocations.length > 1}
                    cities={cities}
                    key={`${allocation.city}-${index}`}
                    onChange={(value) => setAllocations((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                    onRemove={() => setAllocations((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    tripEnd={endDate}
                    tripStart={startDate}
                  />
                ))}
              </div>
              <button className="button button-secondary" type="button" onClick={() => setAllocations((current) => [...current, { city: cities[0], startDate, endDate }])}>Add another city</button>
            </fieldset>
          )}
          {step === 3 && (
            <fieldset className="planner-step-card">
              <legend>Preferences</legend>
              <p className="step-intro">These preferences guide ranking; they never prevent you from editing the result.</p>
              <div className="form-grid">
                <label className="field">Budget<select value={budget} onChange={(event) => setBudget(event.target.value as PriceRange | "any")}><option value="any">Any</option>{["€", "€€", "€€€", "€€€€"].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="field">Pace<select value={pace} onChange={(event) => setPace(event.target.value as Pace)}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="full">Full</option></select></label>
                <label className="field">Travel party<select value={party} onChange={(event) => setParty(event.target.value as TravelParty)}><option value="solo">Solo</option><option value="couple">Couple</option><option value="family">Family</option><option value="friends">Friends</option></select></label>
              </div>
              <InterestSelector onChange={setInterests} selected={interests} tags={tags} />
            </fieldset>
          )}
          {(stepError || error) && <p className="form-error" role="alert">{stepError || error}</p>}
          <div className="planner-actions">
            {step > 1 && <button className="button button-secondary" type="button" onClick={() => setStep((current) => current - 1)}>Back</button>}
            {step < 3 ? (
              <button className="button button-primary" type="button" onClick={nextStep}>Continue</button>
            ) : (
              <button className="button button-primary button-large" disabled={generating} type="submit">
                {generating ? "Building your itinerary…" : "Generate itinerary"}
              </button>
            )}
          </div>
        </form>
        <TripSummary
          allocations={allocations}
          dayEnd={dayEnd}
          dayStart={dayStart}
          endDate={endDate}
          interestCount={interests.length}
          name={name}
          pace={pace}
          startDate={startDate}
        />
      </div>
    </section>
  );
}
