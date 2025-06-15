import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, MessageSquare, TrendingUp, Eye, Ban } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalBooks: number;
  totalTransactions: number;
  revenue: number;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  average_rating?: number;
  total_reviews?: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  price_range: number;
  status: string;
  created_at: string;
  seller: {
    email: string;
    full_name?: string;
  };
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBooks: 0,
    totalTransactions: 0,
    revenue: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // Update: check admin_users table first
  const checkAdminStatus = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return false;

      // First, check admin_users table for this user's id
      const { data: adminUsers, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id);
      if (error) {
        toast({
          title: "Error",
          description: "Could not access admin status. Please try again.",
          variant: "destructive",
        });
        return false;
      }
      if (adminUsers && adminUsers.length > 0) return true;

      // Fallback: allow legacy email-based access
      const isAdminUser =
        user.email === "admin@bookex.com" ||
        user.email === "admin9977@gmail.com" ||
        user.email?.includes("admin") ||
        false;
      return isAdminUser;
    } catch {
      return false;
    }
  };

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total books
      const { count: bookCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

      // Get completed transactions
      const { count: transactionCount } = await supabase
        .from('purchase_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Calculate revenue (₹20 per transaction)
      const revenue = (transactionCount || 0) * 20;

      setStats({
        totalUsers: userCount || 0,
        totalBooks: bookCount || 0,
        totalTransactions: transactionCount || 0,
        revenue
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard stats",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Map the data to include default values for missing properties
      const mappedUsers: User[] = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at || '',
        average_rating: 0, // Default since we don't have this data yet
        total_reviews: 0 // Default since we don't have this data yet
      }));
      
      setUsers(mappedUsers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          seller:profiles!seller_id(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch books",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const adminStatus = await checkAdminStatus();
      setIsAdmin(adminStatus);
      
      if (adminStatus) {
        await Promise.all([fetchStats(), fetchUsers(), fetchBooks()]);
      }
      setLoading(false);
    };

    initialize();
  }, []);

  const updateBookStatus = async (bookId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ status })
        .eq('id', bookId);

      if (error) throw error;

      setBooks(books.map(book => 
        book.id === bookId ? { ...book, status } : book
      ));

      toast({
        title: "Success",
        description: `Book status updated to ${status}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update book status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Ban className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have admin privileges to access this dashboard.</p>
          <p className="text-sm text-gray-500 mt-2">
            To access admin dashboard, use an email with 'admin' in it or contact the administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Admin Dashboard</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Books</p>
                <p className="text-2xl font-bold">{stats.totalBooks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold">₹{stats.revenue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      {(user.total_reviews || 0) > 0 && (
                        <p className="text-xs text-green-600">
                          Rating: {(user.average_rating || 0).toFixed(1)} ({user.total_reviews} reviews)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="books" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {books.map((book) => (
                  <div key={book.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{book.title}</p>
                      <p className="text-sm text-gray-600">by {book.author}</p>
                      <p className="text-sm text-gray-600">
                        Seller: {book.seller?.full_name || book.seller?.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">Price: ₹{book.price_range}</p>
                      <p className="text-xs text-gray-400">
                        Listed: {new Date(book.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={
                          book.status === 'available' ? 'bg-green-100 text-green-800' :
                          book.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {book.status}
                      </Badge>
                      {book.status === 'available' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateBookStatus(book.id, 'inactive')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Hide
                        </Button>
                      )}
                      {book.status === 'inactive' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateBookStatus(book.id, 'available')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Show
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
