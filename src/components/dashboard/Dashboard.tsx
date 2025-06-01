
import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Header } from "./Header";
import { BookDiscovery } from "./BookDiscovery";
import { SellBook } from "./SellBook";
import { MyBooks } from "./MyBooks";
import { Profile } from "./Profile";
import { Requests } from "./Requests";

interface DashboardProps {
  user: User | null;
}

export type DashboardView = "discover" | "sell" | "my-books" | "requests" | "profile";

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
      default:
        return <BookDiscovery />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      <main className="container mx-auto px-4 py-6">
        {renderContent()}
      </main>
    </div>
  );
};
