import axios from "axios";

const OPENCAGE_API_KEY = "9178c7d0e0ed422e8c4d877dba7d1c1c";

export async function getLocationAndNearbyPlaces(pincode: string) {
  try {
    // Step 1: Get location details from postal pincode API
    const postalResponse = await axios.get(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const postalData = postalResponse.data[0].PostOffice[0];
    const location = {
      state: postalData.State,
      city: postalData.Block,
      district: postalData.District,
      pincode: pincode,
    };

    // Step 2: Get latitude and longitude from OpenCageData API
    const geocodeResponse = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${pincode}&key=${OPENCAGE_API_KEY}`
    );
    const { lat, lng } = geocodeResponse.data.results[0].geometry;

    // Step 3: Find nearby places within 100 km radius
    const nearbyResponse = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&radius=100000&key=${OPENCAGE_API_KEY}`
    );
    const nearbyPlaces = nearbyResponse.data.results.map((place: any) => ({
      placeName: place.formatted,
      pincode: place.components.postcode,
    }));


    return {
      success: true,
      location,
      nearbyPlaces,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch location and nearby places");
  }
}
