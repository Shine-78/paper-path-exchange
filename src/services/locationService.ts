
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
      if (!navigator.geolocation) {
        reject({
          code: 0,
          message: 'Geolocation is not supported by this browser. Please use a modern browser that supports location services.'
        });
        return;
      }

      // Check if we have a recent cached location (less than 5 minutes old)
      if (this.currentLocation && this.currentLocation.timestamp) {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (this.currentLocation.timestamp > fiveMinutesAgo) {
          console.log('Using recent cached location');
          resolve(this.currentLocation);
          return;
        }
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 300000 // 5 minutes
      };

      console.log('Requesting current location with options:', options);

      const successCallback = (position: GeolocationPosition) => {
        console.log('Location success:', position);
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
        console.error('Location error:', error);
        const locationError: LocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code)
        };
        reject(locationError);
      };

      navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        options
      );
    });
  }

  public getCachedLocation(): LocationData | null {
    // Check if cached location is still valid (less than 10 minutes old)
    if (this.currentLocation && this.currentLocation.timestamp) {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (this.currentLocation.timestamp > tenMinutesAgo) {
        return this.currentLocation;
      } else {
        console.log('Cached location is too old, clearing it');
        this.currentLocation = null;
      }
    }
    return this.currentLocation;
  }

  public clearCachedLocation(): void {
    this.currentLocation = null;
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access was denied. Please enable location permissions in your browser settings and try again.';
      case 2:
        return 'Your location could not be determined. Please check your internet connection and GPS settings.';
      case 3:
        return 'Location request timed out. Please try again or check your internet connection.';
      default:
        return 'An unknown error occurred while getting your location. Please try again.';
    }
  }

  public async requestLocationPermission(): Promise<LocationData> {
    try {
      console.log('Requesting location permission...');
      return await this.getCurrentLocation();
    } catch (error) {
      console.error('Location permission request failed:', error);
      throw error;
    }
  }

  public async checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!navigator.geolocation) {
      return 'unsupported';
    }

    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      } catch (error) {
        console.log('Permission query not supported:', error);
        return 'prompt';
      }
    }

    return 'prompt';
  }

  public startWatchingLocation(callback: (location: LocationData) => void, errorCallback?: (error: LocationError) => void): void {
    if (!navigator.geolocation) {
      errorCallback?.({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute
    };

    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        this.currentLocation = location;
        callback(location);
      },
      (error) => {
        const locationError: LocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code)
        };
        errorCallback?.(locationError);
      },
      options
    );
  }

  public stopWatchingLocation(): void {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }
}

export const locationService = LocationService.getInstance();
