

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookCard } from "./BookCard";
import { Search, MapPin, Filter, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  publication_year?: number;
  isbn?: string;
  condition: string;
  price_range: number;
  transfer_type: string;
  description?: string;
  location_address?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  seller_id: string;
  profiles?: {
    full_name: string;
    location_address: string;
    average_rating: number;
    review_count: number;
  };
}

const genres = ["Fiction", "Non-Fiction", "Textbook", "Comics", "Children", "Self-Help", "Fantasy", "Science"];
const priceRanges = [20, 35, 50];
const conditions = ["excellent", "good", "fair", "poor"];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Returns distance in kilometers between two lat/lng
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const BookDiscovery = () => {
  // Add new states for advanced filters & history
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string | "">("");
  const [selectedISBN, setSelectedISBN] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | "">("");
  const [selectedRadius, setSelectedRadius] = useState<number | "">(10); // radius in km
  const [userCoords, setUserCoords] = useState<{lat: number; lng: number} | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{label: string, filters: any}[]>([]);
  const { toast } = useToast();

  // Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: false }
      );
    }
  }, []);

  // Fetch books with advanced filters
  const fetchBooks = async () => {
    setLoading(true);
    try {
      // Build filters object
      const filters: Record<string, any> = {
        status: "available"
      };

      if (selectedGenre) filters.genre = selectedGenre;
      if (selectedYear) filters.publication_year = Number(selectedYear);
      if (selectedISBN) filters.isbn = selectedISBN;
      if (selectedCondition) filters.condition = selectedCondition;
      if (selectedPriceRange) filters.price_range = selectedPriceRange;

      // Use match() instead of chaining eq() calls to avoid type inference issues
      let query = supabase.from("books").select("*").match(filters);

      // Handle search term separately with text search
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
      }

      const { data: booksData, error: booksError } = await query.order("created_at", { ascending: false });

      if (booksError) throw booksError;

      // Fetch profiles separately to avoid complex type inference
      const sellerIds = booksData?.map(book => book.seller_id).filter(Boolean) || [];
      let profilesData: any[] = [];
      
      if (sellerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, location_address, average_rating, review_count")
          .in("id", sellerIds);
        
        if (!profilesError) {
          profilesData = profiles || [];
        }
      }

      // Combine books with profiles manually
      const booksWithProfiles: Book[] = (booksData || []).map(book => ({
        ...book,
        profiles: profilesData.find(profile => profile.id === book.seller_id)
      }));

      // Filter by radius (if user location is available)
      let filteredBooks = booksWithProfiles;
      if (userCoords && selectedRadius) {
        filteredBooks = booksWithProfiles.filter((book) => {
          if (book.latitude && book.longitude) {
            const dist = haversineDistance(
              userCoords.lat,
              userCoords.lng,
              book.latitude,
              book.longitude
            );
            return dist <= Number(selectedRadius);
          }
          return false;
        });
      }
      
      setBooks(filteredBooks);

      // Save to search history
      const filterSummary = [
        searchTerm && `Search: "${searchTerm}"`,
        selectedGenre && `Genre: ${selectedGenre}`,
        selectedYear && `Year: ${selectedYear}`,
        selectedISBN && `ISBN: ${selectedISBN}`,
        selectedCondition && `Condition: ${selectedCondition}`,
        selectedPriceRange && `Price: ₹${selectedPriceRange}`,
        userCoords && selectedRadius && `Within ${selectedRadius}km`
      ]
        .filter(Boolean)
        .join(" | ");
      if (filterSummary) {
        setSearchHistory((prev) => [filterSummary, ...prev.filter((h) => h !== filterSummary)].slice(0, 7));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line
  }, [searchTerm, selectedGenre, selectedYear, selectedISBN, selectedCondition, selectedPriceRange, selectedRadius, userCoords]);

  // "Save search" logic (client only for now)
  const handleSaveSearch = () => {
    const label = [
      searchTerm && `${searchTerm}`,
      selectedGenre && selectedGenre,
      selectedYear && selectedYear,
      selectedISBN && selectedISBN,
      selectedCondition && selectedCondition,
      selectedPriceRange && `₹${selectedPriceRange}`,
      userCoords && selectedRadius && `📍${selectedRadius}km`
    ].filter(Boolean).join(", ");
    setSavedSearches((prev) => [...prev, {
      label: label || `Custom Search ${savedSearches.length+1}`,
      filters: {
        searchTerm,
        selectedGenre,
        selectedYear,
        selectedISBN,
        selectedCondition,
        selectedPriceRange,
        selectedRadius
      }
    }]);
    toast({
      title: "Search Saved!",
      description: "Click on a saved search to quickly apply those filters.",
    });
  };

  // Restore saved search
  const handleLoadSearch = (filters: any) => {
    setSearchTerm(filters.searchTerm || "");
    setSelectedGenre(filters.selectedGenre || "");
    setSelectedYear(filters.selectedYear || "");
    setSelectedISBN(filters.selectedISBN || "");
    setSelectedCondition(filters.selectedCondition || "");
    setSelectedPriceRange(filters.selectedPriceRange || "");
    setSelectedRadius(filters.selectedRadius || 10);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Discover Books</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            <div>
              <Input
                type="number"
                placeholder="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full"
                min={1800}
                max={new Date().getFullYear()}
              />
            </div>
            <div>
              <Input
                placeholder="ISBN"
                value={selectedISBN}
                onChange={(e) => setSelectedISBN(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Conditions</option>
                {conditions.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Prices</option>
                {priceRanges.map((price) => (
                  <option key={price} value={price}>
                    ₹{price}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Geolocation-based filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <div className="flex items-center space-x-2 col-span-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>Within</span>
              <select
                className="p-1 border rounded"
                value={selectedRadius}
                onChange={e => setSelectedRadius(Number(e.target.value))}
              >
                <option value={3}>3 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
                <option value={9999}>Any distance</option>
              </select>
              <span>of me</span>
              {!userCoords && (
                <span className="ml-2 text-xs text-gray-400">Enable location for more relevant results</span>
              )}
            </div>
            <Button type="button" onClick={fetchBooks} className="col-span-1">
              <Filter className="h-4 w-4 mr-1" />
              Apply Filters
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveSearch} className="col-span-1">
              Save Search
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <BookmarkIcon className="w-5 h-5 mr-2" />
              Saved Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((s, i) => (
                <Badge key={i} className="cursor-pointer" onClick={() => handleLoadSearch(s.filters)}>
                  {s.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Search History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
              {searchHistory.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">{books.length} books found</p>
          <Button
            variant="outline"
            onClick={fetchBooks}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {books.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No books found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function BookmarkIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M17 3a2 2 0 0 1 2 2v16l-7-5-7 5V5a2 2 0 0 1 2-2h10Z" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}

