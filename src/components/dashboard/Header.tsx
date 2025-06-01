
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Plus, Library, MessageSquare, User, LogOut } from "lucide-react";
import { DashboardView } from "./Dashboard";

interface HeaderProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
}

export const Header = ({ currentView, setCurrentView }: HeaderProps) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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

          {/* Sign Out */}
          <Button variant="outline" onClick={handleSignOut} className="flex items-center space-x-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
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
          </div>
        </div>
      </div>
    </header>
  );
};
