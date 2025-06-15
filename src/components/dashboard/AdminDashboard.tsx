
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, MessageSquare, TrendingUp, Eye, Ban, Shield, Activity, DollarSign, User } from "lucide-react";

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

  const checkAdminStatus = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return false;

      // Check admin_users table
      const { data: adminUsers, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id);
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      if (adminUsers && adminUsers.length > 0) return true;

      // Fallback: allow email-based access
      const isAdminUser = user.email === "arnabmanna203@gmail.com";
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="text-center py-12">
          <Ban className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have admin privileges to access this dashboard.</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Admin Access:</strong> Contact the administrator to get admin privileges or use an authorized admin account.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-purple-100">Manage your BookEx platform</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Users</p>
                <p className="text-3xl font-bold text-blue-700">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Books</p>
                <p className="text-3xl font-bold text-green-700">{stats.totalBooks}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Transactions</p>
                <p className="text-3xl font-bold text-purple-700">{stats.totalTransactions}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Revenue</p>
                <p className="text-3xl font-bold text-orange-700">₹{stats.revenue}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="users" className="data-[state=active]:bg-white">Users Management</TabsTrigger>
          <TabsTrigger value="books" className="data-[state=active]:bg-white">Books Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Recent Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-400">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="books" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Recent Books</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {books.map((book) => (
                  <div key={book.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{book.title}</p>
                          <p className="text-sm text-gray-600">by {book.author}</p>
                          <p className="text-sm text-gray-600">
                            Seller: {book.seller?.full_name || book.seller?.email || 'Unknown'}
                          </p>
                          <p className="text-sm font-medium text-green-600">Price: ₹{book.price_range}</p>
                          <p className="text-xs text-gray-400">
                            Listed: {new Date(book.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={
                          book.status === 'available' ? 'bg-green-100 text-green-800 border-green-200' :
                          book.status === 'sold' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }
                      >
                        {book.status}
                      </Badge>
                      {book.status === 'available' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateBookStatus(book.id, 'inactive')}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Hide
                        </Button>
                      )}
                      {book.status === 'inactive' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateBookStatus(book.id, 'available')}
                          className="text-green-600 border-green-200 hover:bg-green-50"
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
