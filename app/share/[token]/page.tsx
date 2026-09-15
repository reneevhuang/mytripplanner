import type { Metadata } from "next";
import { ItineraryEditor } from "@/components/itinerary/itinerary-editor";
import { SharedItinerary } from "@/components/itinerary/shared-itinerary";
import { getSharedItinerary } from "@/lib/persistence/shares";

export const metadata: Metadata = {
  title: "Shared itinerary",
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (token === "local") return <SharedItinerary token={token} />;

  const itinerary = await getSharedItinerary(token);
  if (!itinerary) {
    return (
      <section className="empty-state">
        <h1>Share unavailable</h1>
        <p>This share is unavailable or has been revoked.</p>
      </section>
    );
  }

  return <ItineraryEditor itinerary={itinerary} readOnly />;
}
