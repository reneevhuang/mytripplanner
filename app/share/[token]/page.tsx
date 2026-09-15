import type { Metadata } from "next";
import { SharedItinerary } from "@/components/itinerary/shared-itinerary";

export const metadata: Metadata = {
  title: "Shared itinerary",
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  return <SharedItinerary token={(await params).token} />;
}
