
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookPlus, Upload, MapPin } from "lucide-react";

export const SellBook = () => {
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    condition: "",
    price_range: "",
    transfer_type: "",
    description: "",
    location_address: "",
    postal_code: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { toast } = useToast();

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
        setFormData(prev => ({ ...prev, latitude, longitude }));
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({
        title: "Error",
        description: "Maximum 5 images allowed",
        variant: "destructive",
      });
      return;
    }
    setImages(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.condition || !formData.price_range || !formData.transfer_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload images if any
      const imageUrls: string[] = [];
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('book-images')
          .upload(fileName, image);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // Continue without image if upload fails
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('book-images')
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }

      // Create book listing with "available" status instead of "draft"
      const { error } = await supabase
        .from("books")
        .insert({
          title: formData.title,
          author: formData.author,
          condition: formData.condition,
          price_range: parseInt(formData.price_range),
          transfer_type: formData.transfer_type,
          description: formData.description,
          location_address: formData.location_address,
          postal_code: formData.postal_code,
          latitude: formData.latitude,
          longitude: formData.longitude,
          seller_id: user.id,
          images: imageUrls,
          status: "available", // Use "available" instead of "draft"
          listing_paid: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book listed successfully! Pay security deposit to activate.",
      });

      // Reset form
      setFormData({
        title: "",
        author: "",
        condition: "",
        price_range: "",
        transfer_type: "",
        description: "",
        location_address: "",
        postal_code: "",
        latitude: null,
        longitude: null,
      });
      setImages([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookPlus className="h-5 w-5" />
            <span>List a Book for Sale</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter book title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Enter author name"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="condition">Condition *</Label>
                <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price_range">Price (₹) *</Label>
                <Select value={formData.price_range} onValueChange={(value) => setFormData({ ...formData, price_range: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">₹20</SelectItem>
                    <SelectItem value="35">₹35</SelectItem>
                    <SelectItem value="50">₹50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="transfer_type">Transfer Type *</Label>
              <Select value={formData.transfer_type} onValueChange={(value) => setFormData({ ...formData, transfer_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup-only">Pickup Only</SelectItem>
                  <SelectItem value="delivery-only">Delivery Only</SelectItem>
                  <SelectItem value="both">Both Pickup & Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="location_address">Location Address</Label>
                <Input
                  id="location_address"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  placeholder="City, Area, State"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="123456"
                />
              </div>
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
              {formData.latitude && formData.longitude && (
                <span className="text-sm text-green-600">
                  ✓ Location saved
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about the book..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="images">Book Images (Max 5)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <Upload className="h-4 w-4 text-gray-400" />
              </div>
              {images.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {images.length} image(s) selected
                </p>
              )}
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-800 font-semibold">Security Deposit Required</p>
              <p className="text-sm text-orange-600">
                After listing, you'll need to pay ₹100 security deposit to activate your listing.
                When your book sells, you'll receive the book price + ₹100 - ₹20 platform fee.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Listing Book..." : "List Book"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
