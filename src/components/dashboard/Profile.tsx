
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, MapPin } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  location_address?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

interface ProfileProps {
  user: User | null;
}

export const Profile = ({ user }: ProfileProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setProfile(prev => prev ? { ...prev, latitude, longitude } : null);
        setGettingLocation(false);
        toast({
          title: "Success",
          description: "Location updated successfully",
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Error",
          description: "Failed to get current location",
          variant: "destructive",
        });
        setGettingLocation(false);
      }
    );
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          location_address: profile.location_address,
          postal_code: profile.postal_code,
          latitude: profile.latitude,
          longitude: profile.longitude,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-600">Profile not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateProfile} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="locationAddress">Location Address</Label>
              <Input
                id="locationAddress"
                placeholder="City, Area, State"
                value={profile.location_address || ""}
                onChange={(e) => setProfile({ ...profile, location_address: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="123456"
                value={profile.postal_code || ""}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center space-x-2"
              >
                <MapPin className="h-4 w-4" />
                <span>{gettingLocation ? "Getting Location..." : "Get Current Location"}</span>
              </Button>
              {profile.latitude && profile.longitude && (
                <span className="text-sm text-green-600">
                  ✓ Location saved
                </span>
              )}
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full">
            Download My Data
          </Button>
          <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
