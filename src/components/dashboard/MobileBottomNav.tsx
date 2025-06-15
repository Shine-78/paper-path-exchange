
import { Button } from "@/components/ui/button";
import { Search, Plus, Library, MessageSquare, User } from "lucide-react";
import { DashboardView } from "./Dashboard";

interface MobileBottomNavProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
}

export const MobileBottomNav = ({ currentView, setCurrentView }: MobileBottomNavProps) => {
  const navItems = [
    { id: "discover", label: "Discover", icon: Search },
    { id: "sell", label: "Sell", icon: Plus },
    { id: "my-books", label: "My Books", icon: Library },
    { id: "requests", label: "Requests", icon: MessageSquare },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            onClick={() => setCurrentView(id as DashboardView)}
            className={`flex flex-col items-center space-y-1 h-auto py-2 px-3 ${
              currentView === id 
                ? "text-blue-600 bg-blue-50" 
                : "text-gray-600"
            }`}
          >
            <Icon className={`h-5 w-5 ${currentView === id ? "text-blue-600" : "text-gray-600"}`} />
            <span className={`text-xs ${currentView === id ? "text-blue-600 font-medium" : "text-gray-600"}`}>
              {label}
            </span>
          </Button>
        ))}
      </div>
    </nav>
  );
};
