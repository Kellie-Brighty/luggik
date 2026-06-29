export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface PricingSettings {
  baseAddress: string;
  baseLatitude: number;
  baseLongitude: number;
  baseFare: number;
  baseDistance: number;
  perKmRate: number;
  maxRadius: number;
}

export class PricingService {
  /**
   * Calculates the great-circle distance between two points on the Earth's surface using the Haversine formula.
   * Returns distance in kilometers.
   */
  public static calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generates a quote for a specific logistics company based on their settings and the requested route.
   */
  public static generateQuote(
    pickup: Location,
    dropoff: Location,
    companySettings: PricingSettings
  ): { price: number, distanceKm: number } | null {
    
    // 1. Calculate distance from Office to Pickup
    const officeToPickup = this.calculateHaversineDistance(
      companySettings.baseLatitude,
      companySettings.baseLongitude,
      pickup.latitude,
      pickup.longitude
    );

    // Calculate distance from Office to Dropoff
    const officeToDropoff = this.calculateHaversineDistance(
      companySettings.baseLatitude,
      companySettings.baseLongitude,
      dropoff.latitude,
      dropoff.longitude
    );

    // If either pickup or dropoff is outside their max radius, they don't service this errand
    if (officeToPickup > companySettings.maxRadius || officeToDropoff > companySettings.maxRadius) {
      return null;
    }

    // 2. Calculate distance from Pickup to Dropoff
    const pickupToDropoff = this.calculateHaversineDistance(
      pickup.latitude,
      pickup.longitude,
      dropoff.latitude,
      dropoff.longitude
    );

    // We multiply by 1.3 to roughly estimate road/driving distance vs straight line
    const ROUTING_FACTOR = 1.3;
    const totalDistance = (officeToPickup + pickupToDropoff) * ROUTING_FACTOR;

    // 3. Calculate Fee
    let totalFee = companySettings.baseFare;
    
    if (totalDistance > companySettings.baseDistance) {
      const extraDistance = totalDistance - companySettings.baseDistance;
      totalFee += (extraDistance * companySettings.perKmRate);
    }

    // Round to nearest 10
    totalFee = Math.ceil(totalFee / 10) * 10;

    return {
      price: totalFee,
      distanceKm: Number(totalDistance.toFixed(1))
    };
  }
}
