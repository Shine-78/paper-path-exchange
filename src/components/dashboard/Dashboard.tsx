
import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { BookDiscovery } from "./BookDiscovery";
import { SellBook } from "./SellBook";
import { MyBooks } from "./MyBooks";
import { Profile } from "./Profile";
import { Requests } from "./Requests";
import { NotificationCenter } from "./NotificationCenter";
import { AdminDashboard } from "./AdminDashboard";
import { UserPreferences } from "./UserPreferences";

interface DashboardProps {
  user: User | null;
}

export type DashboardView = "discover" | "sell" | "my-books" | "requests" | "profile" | "notifications" | "admin" | "preferences";

export const Dashboard = ({ user }: DashboardProps) => {
  const [currentView, setCurrentView] = useState<DashboardView>("discover");

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
        return <AdminDashboard />;
      case "preferences":
        return <UserPreferences />;
      default:
        return <BookDiscovery />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileHeader currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="flex-1 px-4 py-4 pb-20 overflow-y-auto">
        {renderContent()}
      </main>
      
      <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
};
