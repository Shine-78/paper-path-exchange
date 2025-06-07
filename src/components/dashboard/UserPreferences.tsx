
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell } from "lucide-react";

interface UserPreferences {
  id?: string;
  email_notifications: boolean;
  push_notifications: boolean;
  book_match_alerts: boolean;
  price_drop_alerts: boolean;
  new_books_nearby: boolean;
  max_distance_km: number;
  preferred_genres: string[];
}

export const UserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    push_notifications: true,
    book_match_alerts: true,
    price_drop_alerts: true,
    new_books_nearby: true,
    max_distance_km: 10,
    preferred_genres: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Since user_preferences table doesn't exist in types yet, use edge function
      try {
        const response = await fetch('/api/get-preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setPreferences(data);
          }
        }
      } catch (error) {
        // Use defaults if preferences don't exist
        console.log("Preferences not found, using defaults");
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use edge function to handle preferences update
      const response = await fetch('/api/update-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          preferences: preferences
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast({
        title: "Success",
        description: "Preferences saved successfully",
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, email_notifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Push Notifications</Label>
                <p className="text-sm text-gray-600">Receive push notifications in browser</p>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, push_notifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Book Match Alerts</Label>
                <p className="text-sm text-gray-600">Get notified when books matching your interests are listed</p>
              </div>
              <Switch
                checked={preferences.book_match_alerts}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, book_match_alerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Price Drop Alerts</Label>
                <p className="text-sm text-gray-600">Get notified when book prices drop</p>
              </div>
              <Switch
                checked={preferences.price_drop_alerts}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, price_drop_alerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">New Books Nearby</Label>
                <p className="text-sm text-gray-600">Get notified about new books in your area</p>
              </div>
              <Switch
                checked={preferences.new_books_nearby}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, new_books_nearby: checked })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="maxDistance">Maximum Distance (km)</Label>
            <Input
              id="maxDistance"
              type="number"
              min="1"
              max="100"
              value={preferences.max_distance_km}
              onChange={(e) => setPreferences({ 
                ...preferences, 
                max_distance_km: parseInt(e.target.value) || 10 
              })}
              className="mt-1"
            />
            <p className="text-sm text-gray-600 mt-1">
              How far are you willing to travel for book pickup/delivery?
            </p>
          </div>

          <Button onClick={savePreferences} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
