import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Bell, Settings, LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardView } from "@/types/dashboard";
import { useState, useEffect } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MobileHeaderProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  isAdmin?: boolean;
}

export const MobileHeader = ({ currentView, setCurrentView, isAdmin }: MobileHeaderProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { playNotificationSound } = useNotificationSound();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel('mobile_header_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        playNotificationSound();
        fetchUnreadCount();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNotificationSound]);

  const getPageTitle = () => {
    switch (currentView) {
      case "discover": return "Discover Books";
      case "sell": return "Sell Book";
      case "my-books": return "My Books";
      case "requests": return "Requests";
      case "profile": return "Profile";
      case "notifications": return "Notifications";
      case "admin": return "Admin Dashboard";
      case "preferences": return "Settings";
      default: return "BookEx";
    }
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">BookEx</h1>
            <p className="text-xs text-gray-500">{getPageTitle()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("notifications")}
            className="relative p-2"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center rounded-full animate-pulse"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white">
              <DropdownMenuItem onClick={() => setCurrentView("preferences")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              {/* Admin Panel - Only visible to admins */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setCurrentView("admin")}
                    className="bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
