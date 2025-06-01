
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Upload, X } from "lucide-react";

export const SellBook = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    condition: "good",
    priceRange: 20,
    transferType: "both",
    description: "",
    locationAddress: "",
    postalCode: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // For demo purposes, we'll use placeholder images
    // In production, you'd upload to Supabase storage
    const newImages = Array.from(files).map((file, index) => 
      `https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&auto=format&q=60`
    );
    
    setImages(prev => [...prev, ...newImages].slice(0, 3));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("books").insert({
        seller_id: user.id,
        title: formData.title,
        author: formData.author,
        condition: formData.condition,
        price_range: formData.priceRange,
        transfer_type: formData.transferType,
        description: formData.description || null,
        location_address: formData.locationAddress || null,
        postal_code: formData.postalCode || null,
        images: images,
        status: "available",
        listing_paid: false, // Will be updated after Stripe payment
      });

      if (error) throw error;

      toast({
        title: "Book listed successfully!",
        description: "Your book is now available for purchase. Complete payment to activate listing.",
      });

      // Reset form
      setFormData({
        title: "",
        author: "",
        condition: "good",
        priceRange: 20,
        transferType: "both",
        description: "",
        locationAddress: "",
        postalCode: "",
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
            <Plus className="h-5 w-5" />
            <span>List Your Book</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleInputChange("author", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <Label>Condition *</Label>
              <RadioGroup
                value={formData.condition}
                onValueChange={(value) => handleInputChange("condition", value)}
                className="flex flex-wrap gap-4 mt-2"
              >
                {["excellent", "good", "fair", "poor"].map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <RadioGroupItem value={condition} id={condition} />
                    <Label htmlFor={condition} className="capitalize">
                      {condition}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Price Range */}
            <div>
              <Label>Price Range *</Label>
              <RadioGroup
                value={formData.priceRange.toString()}
                onValueChange={(value) => handleInputChange("priceRange", Number(value))}
                className="flex gap-4 mt-2"
              >
                {[20, 35, 50].map((price) => (
                  <div key={price} className="flex items-center space-x-2">
                    <RadioGroupItem value={price.toString()} id={`price-${price}`} />
                    <Label htmlFor={`price-${price}`}>₹{price}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Transfer Type */}
            <div>
              <Label>Transfer Type *</Label>
              <RadioGroup
                value={formData.transferType}
                onValueChange={(value) => handleInputChange("transferType", value)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self-transfer" id="self-transfer" />
                  <Label htmlFor="self-transfer">Self Transfer Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shipping" id="shipping" />
                  <Label htmlFor="shipping">Shipping Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both">Both</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the book's condition, any notes, etc."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="locationAddress">Location Address</Label>
                <Input
                  id="locationAddress"
                  placeholder="City, Area"
                  value={formData.locationAddress}
                  onChange={(e) => handleInputChange("locationAddress", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="123456"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <Label>Book Images (Max 3)</Label>
              <div className="mt-2">
                {images.length < 3 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload images</p>
                    </label>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Book ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Listing Fee Notice */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Listing Fee:</strong> ₹50 (payable after listing creation)
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Your book will be visible to buyers after payment confirmation.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating Listing..." : "List Book"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
