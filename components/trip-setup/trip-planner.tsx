"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place, PriceRange } from "@/lib/catalog/schema";
import { generateItinerary } from "@/lib/planner/generate";
import type { CityAllocation, Itinerary, Pace, TravelParty, TripInput } from "@/lib/planner/types";
import { deleteGuestItinerary, listGuestItineraries } from "@/lib/persistence/guest-store";
import { ItineraryEditor } from "@/components/itinerary/itinerary-editor";
import { minutesFromTime, roundUpToHalfHour, timeFromMinutes } from "@/lib/catalog/hours";
import { findDayConflicts } from "@/lib/planner/conflicts";
import type { TravelGap } from "@/lib/planner/types";
import { datesInRange, sortCityAllocations } from "@/lib/planner/city-allocations";
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
    { id: "city-allocation-1", city: cities[0], dates: [initialDate] },
  ]);
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("19:00");
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<PriceRange | "any">("any");
  const [pace, setPace] = useState<Pace>("balanced");
  const [party, setParty] = useState<TravelParty>("couple");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [saved, setSaved] = useState<Itinerary[]>([]);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [cloudSaved, setCloudSaved] = useState<Itinerary[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const tags = useMemo(() => [...new Set(places.flatMap((place) => place.tags))].sort(), [places]);
  const tripDates = useMemo(() => datesInRange(startDate, endDate), [endDate, startDate]);
  const visibleSaved = showAllSaved ? saved : saved.slice(0, 3);

  useEffect(() => {
    try { setSaved(listGuestItineraries()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Saved trips could not be read."); }
    fetch("/api/itineraries")
      .then(async (response) => {
        if (response.status === 401 || response.status === 503) return null;
        if (!response.ok) throw new Error("Account trips could not be read.");
        return response.json() as Promise<{ itineraries: Itinerary[] }>;
      })
      .then((result) => setCloudSaved(result?.itineraries ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Account trips could not be read."));
  }, []);

  const refreshSavedTrips = async () => {
    setSaved(listGuestItineraries());
    const response = await fetch("/api/itineraries");
    if (response.status === 401 || response.status === 503) return;
    if (!response.ok) throw new Error("Account trips could not be read.");
    const result = await response.json() as { itineraries: Itinerary[] };
    setCloudSaved(result.itineraries);
  };

  const importDeviceTrips = async () => {
    setError("");
    try {
      const localTrips = listGuestItineraries();
      if (!localTrips.length) return;
      const responses = await Promise.all(localTrips.map((trip) =>
        fetch("/api/itineraries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trip),
        }),
      ));
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(failed.status === 401 ? "Sign in before importing device trips." : "Import failed.");
      await refreshSavedTrips();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Device trips could not be imported.");
    }
  };

  const removeDeviceTrip = (id: string) => {
    try {
      deleteGuestItinerary(id);
      const remaining = saved.filter((trip) => trip.id !== id);
      setSaved(remaining);
      if (remaining.length <= 3) setShowAllSaved(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The saved trip could not be removed.");
    }
  };

  const syncDates = (field: "start" | "end", value: string) => {
    const nextStart = field === "start" ? value : startDate;
    const nextEnd = field === "end" ? value : endDate;
    if (field === "start") setStartDate(value); else setEndDate(value);
    const allowedDates = datesInRange(nextStart, nextEnd);
    setAllocations((current) => {
      const filtered = current.map((allocation) => ({
        ...allocation,
        dates: allocation.dates.filter((date) => allowedDates.includes(date)),
      }));
      const assignedDates = new Set(filtered.flatMap((allocation) => allocation.dates));
      const unassignedDates = allowedDates.filter((date) => !assignedDates.has(date));
      if (filtered[0]) filtered[0] = { ...filtered[0], dates: [...filtered[0].dates, ...unassignedDates].sort() };
      return sortCityAllocations(filtered);
    });
  };

  const updateAllocation = (id: string, value: CityAllocation) => {
    setAllocations((current) => sortCityAllocations(
      current.map((allocation) => allocation.id === id ? value : allocation),
    ));
  };

  const removeAllocation = (id: string) => {
    setAllocations((current) => {
      const removedDates = current.find((allocation) => allocation.id === id)?.dates ?? [];
      const remaining = current.filter((allocation) => allocation.id !== id);
      if (remaining[0]) remaining[0] = { ...remaining[0], dates: [...remaining[0].dates, ...removedDates].sort() };
      return sortCityAllocations(remaining);
    });
  };

  const addAllocation = () => {
    setAllocations((current) => {
      const assignedDates = new Set(current.flatMap((allocation) => allocation.dates));
      const firstUnassignedDate = tripDates.find((date) => !assignedDates.has(date));
      return sortCityAllocations([
        ...current,
        {
          id: `city-allocation-${Date.now()}`,
          city: cities.find((city) => !current.some((allocation) => allocation.city === city)) ?? cities[0],
          dates: firstUnassignedDate ? [firstUnassignedDate] : [],
        },
      ]);
    });
  };

  const submit = async () => {
    setError("");
    setGenerating(true);
    const cityAllocations = allocations.map(({ city, dates }) => ({ city, dates }));
    const input: TripInput = { name, startDate, endDate, cityAllocations, dayStart, dayEnd, interests, budget, pace, party };
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
    if (step === 2) {
      const unassignedDate = tripDates.find((date) =>
        !allocations.some((allocation) => allocation.dates.includes(date))
      );
      if (allocations.some((allocation) => !allocation.dates.length) || unassignedDate) {
        setStepError(unassignedDate
          ? `Choose at least one city for ${unassignedDate}.`
          : "Choose at least one date for every city or remove the empty city.");
        return;
      }
    }
    setStep((current) => Math.min(3, current + 1));
  };

  if (itinerary) {
    return <ItineraryEditor itinerary={itinerary} onChange={setItinerary} onClose={() => { setItinerary(null); void refreshSavedTrips(); }} />;
  }

  return (
    <section className="planner-shell">
      <div className="section-heading">
        <div><p className="eyebrow">RULE-BASED PLANNER</p><h1>Shape your trip</h1><p>Every suggestion is generated locally from your dates, preferences, and realistic daily windows.</p></div>
      </div>
      {saved.length > 0 && (
        <aside className="saved-trips">
          <h2>Saved on this device</h2>
          <div className="saved-grid">
            {visibleSaved.map((trip) => (
              <div className="saved-trip-item" key={trip.id}>
                <button className="saved-trip-open" type="button" onClick={() => setItinerary(trip)}>
                  <strong>{trip.input.name}</strong>
                  <span>{trip.input.startDate} → {trip.input.endDate}</span>
                </button>
                <button
                  aria-label={`Remove ${trip.input.name} from this device`}
                  className="saved-trip-remove"
                  title="Remove saved trip"
                  type="button"
                  onClick={() => removeDeviceTrip(trip.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="saved-trips-actions">
            {saved.length > 3 && (
              <button
                aria-expanded={showAllSaved}
                className="text-button"
                type="button"
                onClick={() => setShowAllSaved((current) => !current)}
              >
                {showAllSaved ? "Show less" : `Show more (${saved.length - 3})`}
              </button>
            )}
            <button className="button button-secondary" type="button" onClick={importDeviceTrips}>Import device trips to account</button>
          </div>
        </aside>
      )}
      {cloudSaved.length > 0 && (
        <aside className="saved-trips saved-trips-cloud">
          <h2>Saved to your account</h2>
          <div className="saved-grid">{cloudSaved.map((trip) => <button type="button" key={trip.id} onClick={() => setItinerary(trip)}><strong>{trip.input.name}</strong><span>{trip.input.startDate} → {trip.input.endDate}</span></button>)}</div>
        </aside>
      )}
      <PlannerProgress currentStep={step} />
      <div className="planner-workspace">
        <form
          className="trip-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 3) void submit();
          }}
        >
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
              <p className="step-intro">Choose one or more dates for each city. You can use the same date for nearby cities; the planner will finish one city before moving to the next and keep your trip in date order.</p>
              <div className="allocation-list">
                {allocations.map((allocation) => (
                  <CityAllocationRow
                    allocation={allocation}
                    canRemove={allocations.length > 1}
                    cities={cities}
                    key={allocation.id}
                    onChange={(value) => updateAllocation(allocation.id!, value)}
                    onRemove={() => removeAllocation(allocation.id!)}
                    tripDates={tripDates}
                  />
                ))}
              </div>
              <button className="button button-secondary" type="button" onClick={addAllocation}>Add another city</button>
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
              <button className="button button-primary button-large" disabled={generating} type="button" onClick={() => void submit()}>
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
