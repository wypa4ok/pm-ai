const GOOGLE_PLACES_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

export interface ExternalContractorSearchInput {
  category?: string;
  term?: string;
  location: string;
  limit?: number;
}

export interface ExternalContractorProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  source: "google";
  metadata?: Record<string, unknown>;
}

export async function searchExternalContractors(
  input: ExternalContractorSearchInput,
): Promise<ExternalContractorProfile[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn(
      "GOOGLE_PLACES_API_KEY missing; skipping external contractor search.",
    );
    return [];
  }

  const params = new URLSearchParams({
    query: buildQuery(input),
    region: "us",
    key: apiKey,
  });

  const response = await fetch(`${GOOGLE_PLACES_ENDPOINT}?${params.toString()}`, {
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Places API error", response.status, text);
    return [];
  }

  const data = (await response.json()) as GooglePlacesResponse;

  if (data.status && data.status !== "OK") {
    console.error("Places API responded with", data.status, data.error_message);
    return [];
  }

  return (data.results ?? [])
    .slice(0, input.limit ?? 5)
    .map((place) => ({
      id: place.place_id,
      name: place.name,
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating ?? undefined,
      reviewCount: place.user_ratings_total ?? undefined,
      address: place.formatted_address,
      source: "google",
      metadata: {
        category: input.category,
        types: place.types,
      },
    }));
}

function buildQuery(input: ExternalContractorSearchInput) {
  const terms = [
    input.term ?? input.category ?? "contractor",
    input.location,
  ];
  return terms.filter(Boolean).join(" ");
}

type GooglePlacesResponse = {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    rating?: number;
    user_ratings_total?: number;
    website?: string;
    types?: string[];
  }>;
  status?: string;
  error_message?: string;
};
