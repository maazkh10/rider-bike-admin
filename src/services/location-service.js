import * as Location from "expo-location";

export const getLocationName = async (latitude, longitude) => {
  try {
    const result = await Location.reverseGeocodeAsync({
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    if (!result || result.length === 0) {
      return `${latitude}, ${longitude}`;
    }

    const location = result[0];

    const parts = [
      location.name,
      location.street,
      location.district,
      location.city,
      location.region,
    ].filter(Boolean);

    // Remove duplicates
    return [...new Set(parts)].join(", ");
  } catch (error) {
    console.log("Reverse geocoding error:", error);

    return `${latitude}, ${longitude}`;
  }
};