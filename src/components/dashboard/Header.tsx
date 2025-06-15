
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Plus, Library, MessageSquare, User, LogOut, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardView } from "@/types/dashboard";
import { useState, useEffect } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";

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
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">BookEx</h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={currentView === id ? "default" : "ghost"}
                onClick={() => setCurrentView(id as DashboardView)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Button>
            ))}
          </nav>

          {/* Notification Bell and Sign Out */}
          <div className="flex items-center space-x-2">
            <Button
              variant={currentView === "notifications" ? "default" : "ghost"}
              onClick={() => setCurrentView("notifications")}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center rounded-full animate-pulse"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
              <span className="hidden sm:inline ml-2">Notifications</span>
            </Button>
            
            <Button variant="outline" onClick={handleSignOut} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
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
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[1rem] h-4 flex items-center justify-center rounded-full"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
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
