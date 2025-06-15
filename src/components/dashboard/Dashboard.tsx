
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Header } from "./Header";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { BookDiscovery } from "./BookDiscovery";
import { SellBook } from "./SellBook";
import { MyBooks } from "./MyBooks";
import { Requests } from "./Requests";
import { Profile } from "./Profile";
import { NotificationCenter } from "./NotificationCenter";
import { AdminDashboard } from "./AdminDashboard";
import { TransactionHistory } from "./TransactionHistory";
import { PWAInstallPrompt } from "../pwa/PWAInstallPrompt";
import { OfflineIndicator } from "../pwa/OfflineIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardView } from "@/types/dashboard";

interface DashboardProps {
  user: User | null;
}

export const Dashboard = ({ user }: DashboardProps) => {
  const [currentView, setCurrentView] = useState<DashboardView>("discover");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminData, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        if (!error && adminData) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case "discover":
        return <BookDiscovery />;
      case "sell":
        return <SellBook />;
      case "my-books":
        return <MyBooks />;
      case "requests":
        return <Requests />;
      case "profile":
        return <Profile user={user} />;
      case "notifications":
        return <NotificationCenter />;
      case "admin":
        return isAdmin ? <AdminDashboard /> : <BookDiscovery />;
      case "transactions":
        return <TransactionHistory />;
      default:
        return <BookDiscovery />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PWAInstallPrompt />
      <OfflineIndicator />
      
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          isAdmin={isAdmin}
        />
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader 
          currentView={currentView} 
          setCurrentView={setCurrentView}
        />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav 
          currentView={currentView} 
          setCurrentView={setCurrentView}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};
