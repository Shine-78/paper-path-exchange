
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;
  private locationWatchId: number | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      console.log('Starting location request...');
      
      if (!navigator.geolocation) {
        const error = {
          code: 0,
          message: 'Geolocation is not supported by this browser. Please use a modern browser or enable location services.'
        };
        console.error('Geolocation not supported:', error);
        reject(error);
        return;
      }

      // Check if we have a recent cached location (less than 2 minutes old)
      if (this.currentLocation && this.currentLocation.timestamp) {
        const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
        if (this.currentLocation.timestamp > twoMinutesAgo) {
          console.log('Using recent cached location:', this.currentLocation);
          resolve(this.currentLocation);
          return;
        }
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 20000, // 20 seconds timeout
        maximumAge: 120000 // 2 minutes cache
      };

      console.log('Requesting GPS location with options:', options);

      const successCallback = (position: GeolocationPosition) => {
        console.log('GPS location success:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        this.currentLocation = location;
        resolve(location);
      };

      const errorCallback = (error: GeolocationPositionError) => {
        console.error('GPS location error:', {
          code: error.code,
          message: error.message
        });
        
        const locationError: LocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code)
        };
        reject(locationError);
      };

      // Request location with proper error handling
      try {
        navigator.geolocation.getCurrentPosition(
          successCallback,
          errorCallback,
          options
        );
      } catch (e) {
        console.error('Exception during location request:', e);
        reject({
          code: -1,
          message: 'Failed to request location. Please try again.'
        });
      }
    });
  }

  public getCachedLocation(): LocationData | null {
    // Check if cached location is still valid (less than 5 minutes old)
    if (this.currentLocation && this.currentLocation.timestamp) {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      if (this.currentLocation.timestamp > fiveMinutesAgo) {
        return this.currentLocation;
      } else {
        console.log('Cached location expired, clearing it');
        this.currentLocation = null;
      }
    }
    return this.currentLocation;
  }

  public clearCachedLocation(): void {
    console.log('Clearing cached location');
    this.currentLocation = null;
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access denied. Please allow location access in your browser settings and try again.';
      case 2:
        return 'Location unavailable. Please check your GPS/internet connection and try again.';
      case 3:
        return 'Location request timeout. Please try again with a stable connection.';
      default:
        return 'Unable to get your location. Please try again or enter your address manually.';
    }
  }

  public async checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!navigator.geolocation) {
      return 'unsupported';
    }

    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('Location permission status:', permission.state);
        return permission.state;
      } catch (error) {
        console.log('Permission query not supported:', error);
        return 'prompt';
      }
    }

    return 'prompt';
  }
}

export const locationService = LocationService.getInstance();
