const GOOGLE_PLACES_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_PLACES_DETAILS_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/details/json";

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

  const places = (data.results ?? []).slice(0, input.limit ?? 5);

  const detailed = await Promise.all(
    places.map(async (place) => {
      // Fetch details to get phone/website which are not returned by textsearch
      try {
        const detailParams = new URLSearchParams({
          place_id: place.place_id,
          key: apiKey,
          fields:
            "name,formatted_phone_number,international_phone_number,formatted_address,website,rating,user_ratings_total,types",
        });
        const detailRes = await fetch(
          `${GOOGLE_PLACES_DETAILS_ENDPOINT}?${detailParams.toString()}`,
        );
        if (!detailRes.ok) throw new Error(`details status ${detailRes.status}`);
        const detailJson = (await detailRes.json()) as GooglePlaceDetailsResponse;
        const detail = detailJson.result ?? {};
        return {
          id: place.place_id,
          name: place.name,
          phone: detail.formatted_phone_number ?? detail.international_phone_number,
          website: detail.website,
          rating: detail.rating ?? place.rating ?? undefined,
          reviewCount: detail.user_ratings_total ?? place.user_ratings_total ?? undefined,
          address: detail.formatted_address ?? place.formatted_address,
          source: "google",
          metadata: {
            category: input.category,
            types: detail.types ?? place.types,
          },
        } satisfies ExternalContractorProfile;
      } catch (error) {
        console.error("Place details fetch failed", error);
        return {
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
        } satisfies ExternalContractorProfile;
      }
    }),
  );

  return detailed;
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
    types?: string[];
  }>;
  status?: string;
  error_message?: string;
};

type GooglePlaceDetailsResponse = {
  result?: {
    name?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
  };
  status?: string;
  error_message?: string;
};
