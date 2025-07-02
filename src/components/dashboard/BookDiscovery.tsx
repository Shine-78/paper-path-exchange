
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookCard } from "./BookCard";
import { Search, MapPin, Filter, BookOpen, Sparkles, Grid3X3, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationPermissionDialog } from "@/components/location/LocationPermissionDialog";
import { locationService, LocationData } from "@/services/locationService";

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
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string | "">("");
  const [selectedISBN, setSelectedISBN] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | "">("");
  const [selectedRadius, setSelectedRadius] = useState<number | "">(10);
  const [userCoords, setUserCoords] = useState<{lat: number; lng: number} | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{label: string, filters: any}[]>([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  // Initialize location on component mount
  useEffect(() => {
    const cachedLocation = locationService.getCachedLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setUserCoords({ lat: cachedLocation.latitude, lng: cachedLocation.longitude });
      console.log('Using cached location:', cachedLocation);
    }
  }, []);

  const handleLocationGranted = useCallback((location: LocationData) => {
    console.log('Location granted:', location);
    setUserLocation(location);
    setUserCoords({ lat: location.latitude, lng: location.longitude });
  }, []);

  const handleLocationDenied = useCallback(() => {
    console.log('Location denied');
    setUserLocation(null);
    setUserCoords(null);
  }, []);

  // Fetch books function with proper error handling
  const fetchBooks = useCallback(async () => {
    console.log('Fetching books with filters:', {
      searchTerm,
      selectedGenre,
      selectedYear,
      selectedISBN,
      selectedCondition,
      selectedPriceRange,
      selectedRadius,
      userCoords
    });

    setLoading(true);
    try {
      const filters: Record<string, any> = {
        status: "available"
      };

      if (selectedGenre) filters.genre = selectedGenre;
      if (selectedYear) filters.publication_year = Number(selectedYear);
      if (selectedISBN) filters.isbn = selectedISBN;
      if (selectedCondition) filters.condition = selectedCondition;
      if (selectedPriceRange) filters.price_range = selectedPriceRange;

      let query = supabase.from("books").select("*").match(filters);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
      }

      const { data: booksData, error: booksError } = await query.order("created_at", { ascending: false });

      if (booksError) {
        console.error('Books fetch error:', booksError);
        throw booksError;
      }

      const sellerIds = booksData?.map(book => book.seller_id).filter(Boolean) || [];
      let profilesData: any[] = [];
      
      if (sellerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, location_address, average_rating, review_count")
          .in("id", sellerIds);
        
        if (profilesError) {
          console.error('Profiles fetch error:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      const booksWithProfiles: Book[] = (booksData || []).map(book => ({
        ...book,
        profiles: profilesData.find(profile => profile.id === book.seller_id)
      }));

      let filteredBooks = booksWithProfiles;
      
      // Apply location filter only if we have user coordinates and a selected radius
      if (userCoords && selectedRadius && selectedRadius !== 9999) {
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
      console.log('Books fetched successfully:', filteredBooks.length);

      // Update search history
      const filterSummary = [
        searchTerm && `Search: "${searchTerm}"`,
        selectedGenre && `Genre: ${selectedGenre}`,
        selectedYear && `Year: ${selectedYear}`,
        selectedISBN && `ISBN: ${selectedISBN}`,
        selectedCondition && `Condition: ${selectedCondition}`,
        selectedPriceRange && `Price: ₹${selectedPriceRange}`,
        userCoords && selectedRadius && selectedRadius !== 9999 && `Within ${selectedRadius}km`
      ]
        .filter(Boolean)
        .join(" | ");
      
      if (filterSummary) {
        setSearchHistory((prev) => [filterSummary, ...prev.filter((h) => h !== filterSummary)].slice(0, 7));
      }
    } catch (error: any) {
      console.error('Error fetching books:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch books. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedGenre, selectedYear, selectedISBN, selectedCondition, selectedPriceRange, selectedRadius, userCoords, toast]);

  // Fetch books when filters change
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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

  const handleLoadSearch = (filters: any) => {
    setSearchTerm(filters.searchTerm || "");
    setSelectedGenre(filters.selectedGenre || "");
    setSelectedYear(filters.selectedYear || "");
    setSelectedISBN(filters.selectedISBN || "");
    setSelectedCondition(filters.selectedCondition || "");
    setSelectedPriceRange(filters.selectedPriceRange || "");
    setSelectedRadius(filters.selectedRadius || 10);
  };

  const handleEnableLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      handleLocationGranted(location);
      toast({
        title: "Location Enabled",
        description: "Your location has been successfully captured for better book discovery.",
      });
    } catch (error: any) {
      console.error('Failed to get location:', error);
      toast({
        title: "Location Error",
        description: error.message || "Failed to get your location. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading && books.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex justify-center items-center">
        <LocationPermissionDialog 
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
        />
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full animate-ping h-16 w-16 border-4 border-blue-300 opacity-20 mx-auto"></div>
          </div>
          <p className="text-gray-600 animate-pulse">Discovering amazing books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LocationPermissionDialog 
        onLocationGranted={handleLocationGranted}
        onLocationDenied={handleLocationDenied}
      />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            animation: 'pulse 2s infinite'
          }}></div>
        </div>
        <div className="relative px-6 py-16 text-center">
          <div className="animate-fade-in">
            <Sparkles className="h-12 w-12 mx-auto mb-4 animate-bounce" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Discover Amazing Books
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Find your next favorite read from thousands of books shared by our community
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Search and Filters */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-filter backdrop-blur-lg hover:shadow-3xl transition-all duration-500 animate-slide-in-right">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3 text-2xl">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Search & Filter
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                {isFiltersExpanded ? 'Simple' : 'Advanced'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              <Input
                placeholder="Search by title, author, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              />
            </div>

            {/* Quick Filters */}
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200 hover:shadow-md"
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200 hover:shadow-md"
              >
                <option value="">All Conditions</option>
                {conditions.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value ? Number(e.target.value) : "")}
                className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200 hover:shadow-md"
              >
                <option value="">All Prices</option>
                {priceRanges.map((price) => (
                  <option key={price} value={price}>Up to ₹{price}</option>
                ))}
              </select>
            </div>

            {/* Advanced Filters */}
            <div className={`space-y-4 transition-all duration-500 overflow-hidden ${isFiltersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  type="number"
                  placeholder="Publication Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200"
                  min={1800}
                  max={new Date().getFullYear()}
                />
                <Input
                  placeholder="ISBN"
                  value={selectedISBN}
                  onChange={(e) => setSelectedISBN(e.target.value)}
                  className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200"
                />
              </div>

              {/* Location Filter */}
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                <MapPin className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-700">Within</span>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 transition-colors duration-200"
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
                <span className="font-medium text-gray-700">of me</span>
                {userLocation ? (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Location enabled
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnableLocation}
                    className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
                  >
                    📍 Enable location
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={fetchBooks} 
                disabled={loading}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Search className="h-5 w-5 mr-2" />
                {loading ? 'Searching...' : 'Search Books'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSaveSearch}
                className="h-12 px-6 rounded-xl border-2 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
              >
                Save Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <Card className="shadow-xl border-0 bg-white/70 backdrop-filter backdrop-blur-sm animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <BookmarkIcon className="w-5 h-5 mr-2 text-purple-500" />
                <span className="text-purple-700">Saved Searches</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((s, i) => (
                  <Badge 
                    key={i} 
                    className="cursor-pointer bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 hover:from-purple-200 hover:to-blue-200 transition-all duration-300 transform hover:scale-105 px-3 py-2 text-sm" 
                    onClick={() => handleLoadSearch(s.filters)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && (
          <Card className="shadow-xl border-0 bg-white/70 backdrop-filter backdrop-blur-sm animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Search className="w-4 h-4 mr-2 text-blue-500" />
                <span className="text-blue-700">Recent Searches</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchHistory.slice(0, 3).map((item, i) => (
                  <div key={i} className="text-sm text-gray-600 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between bg-white/80 backdrop-filter backdrop-blur-sm p-6 rounded-xl shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {books.length} Books Found
              </h2>
              <p className="text-gray-600">Discover your next favorite read</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="transition-all duration-200"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="transition-all duration-200"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        {books.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-filter backdrop-blur-sm">
            <CardContent className="text-center py-16">
              <div className="animate-bounce mb-6">
                <BookOpen className="h-20 w-20 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No books found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or explore different genres to find amazing books.
              </p>
              <Button 
                onClick={fetchBooks}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Search className="h-5 w-5 mr-2" />
                Search Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`transition-all duration-500 ${
            viewMode === 'grid' 
              ? 'grid gap-8 md:grid-cols-2 lg:grid-cols-3' 
              : 'space-y-6'
          }`}>
            {books.map((book, index) => (
              <div
                key={book.id}
                className="animate-fade-in transform transition-all duration-500 hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <BookCard book={book} />
              </div>
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
