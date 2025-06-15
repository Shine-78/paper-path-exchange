
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookPlus, Upload, MapPin, X } from "lucide-react";

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
    quantity: "1",
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
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
    if (files.length > 3) {
      toast({
        title: "Error",
        description: "Maximum 3 images allowed",
        variant: "destructive",
      });
      return;
    }
    
    setImages(files);
    
    // Create preview URLs for selected images
    const previewUrls = files.map(file => URL.createObjectURL(file));
    
    // Clean up old preview URLs
    imagePreview.forEach(url => URL.revokeObjectURL(url));
    setImagePreview(previewUrls);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(imagePreview[index]);
    
    setImages(newImages);
    setImagePreview(newPreviews);
  };

  const uploadImages = async (files: File[], userId: string): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (const image of files) {
      try {
        const fileExt = image.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        console.log("Uploading image:", fileName);
        
        const { error: uploadError } = await supabase.storage
          .from('book-images')
          .upload(fileName, image);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Warning",
            description: `Failed to upload image: ${image.name}. Error: ${uploadError.message}`,
            variant: "destructive",
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('book-images')
          .getPublicUrl(fileName);
        
        console.log("Image uploaded successfully:", publicUrl);
        imageUrls.push(publicUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: "Warning", 
          description: `Failed to upload image: ${image.name}`,
          variant: "destructive",
        });
      }
    }
    
    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.condition || !formData.price_range || !formData.transfer_type || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity < 1) {
      toast({
        title: "Error",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload images if any
      const imageUrls = await uploadImages(images, user.id);

      console.log("Creating book listing with data:", {
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
        status: "available",
        listing_paid: false,
        quantity: quantity,
      });

      // Create book listing with "available" status
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
          status: "available",
          listing_paid: false,
          quantity: quantity,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book listed successfully! Pay security deposit to activate.",
      });

      // Reset form and clean up preview URLs
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
        quantity: "1",
      });
      setImages([]);
      imagePreview.forEach(url => URL.revokeObjectURL(url));
      setImagePreview([]);
    } catch (error: any) {
      console.error("Error creating book listing:", error);
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

            <div className="grid gap-4 md:grid-cols-3">
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
                <Input
                  id="price_range"
                  type="number"
                  value={formData.price_range}
                  onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                  placeholder="Enter price"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Number of books"
                  min="1"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="transfer_type">Transfer Type *</Label>
              <Select value={formData.transfer_type} onValueChange={(value) => setFormData({ ...formData, transfer_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup Only</SelectItem>
                  <SelectItem value="delivery">Delivery Only</SelectItem>
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
              <Label htmlFor="images">Book Images (Max 3)</Label>
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
              
              {/* Image Preview Section */}
              {imagePreview.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {imagePreview.length} image(s) selected
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreview.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-800 font-semibold">Security Deposit Required</p>
              <p className="text-sm text-orange-600">
                After listing, you'll need to pay ₹50 security deposit to activate your listing.
                When your book sells, you'll receive the book price + ₹30 refund. Platform fee: ₹20.
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
