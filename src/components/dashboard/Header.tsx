import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Plus, Library, MessageSquare, User, LogOut, Bell, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardView } from "@/types/dashboard";
import { useState, useEffect } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  isAdmin?: boolean;
}

export const Header = ({ currentView, setCurrentView, isAdmin }: HeaderProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { playNotificationSound } = useNotificationSound();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUnreadCount(0);
        return;
      }

      console.log('Fetching unread count for user:', user.id);

      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error('Error fetching unread count:', error);
        throw error;
      }
      
      const count = data?.length || 0;
      console.log('Unread notification count:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('header_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('New notification in header:', payload);
        playNotificationSound();
        fetchUnreadCount();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('Notification updated in header:', payload);
        fetchUnreadCount();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('Notification deleted in header:', payload);
        fetchUnreadCount();
      })
      .subscribe((status) => {
        console.log('Header notification subscription status:', status);
      });

    return () => {
      console.log('Cleaning up header notification subscription');
      supabase.removeChannel(channel);
    };
  }, [playNotificationSound]);

  const navItems = [
    { id: "discover", label: "Discover", icon: Search },
    { id: "sell", label: "Sell Book", icon: Plus },
    { id: "my-books", label: "My Books", icon: Library },
    { id: "requests", label: "Requests", icon: MessageSquare },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BookMarket</span>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => setCurrentView("discover")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "discover"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Discover
              </button>
              <button
                onClick={() => setCurrentView("sell")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "sell"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sell Book
              </button>
              <button
                onClick={() => setCurrentView("my-books")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "my-books"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Books
              </button>
              <button
                onClick={() => setCurrentView("requests")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "requests"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sell Requests
              </button>
              <button
                onClick={() => setCurrentView("my-requests")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "my-requests"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Requests
              </button>
              <button
                onClick={() => setCurrentView("transactions")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "transactions"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Transactions
              </button>
              {isAdmin && (
                <button
                  onClick={() => setCurrentView("admin")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "admin"
                      ? "bg-red-100 text-red-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setCurrentView("notifications")}
                className={`p-2 rounded-full transition-colors ${
                  currentView === "notifications"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt="" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentView("profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex justify-between py-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={currentView === id ? "default" : "ghost"}
                onClick={() => setCurrentView(id as DashboardView)}
                className="flex flex-col items-center space-y-1 h-auto py-2 px-3"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
            <Button
              variant={currentView === "notifications" ? "default" : "ghost"}
              onClick={() => setCurrentView("notifications")}
              className="flex flex-col items-center space-y-1 h-auto py-2 px-3 relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="text-xs">Alerts</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};