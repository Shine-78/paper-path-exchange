
import { Button } from "@/components/ui/button";
import { Search, Plus, Library, MessageSquare, User, Shield } from "lucide-react";
import { DashboardView } from "@/types/dashboard";

interface MobileBottomNavProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  isAdmin?: boolean;
}

export const MobileBottomNav = ({ currentView, setCurrentView, isAdmin }: MobileBottomNavProps) => {
  const baseNavItems = [
    { id: "discover", label: "Discover", icon: Search },
    { id: "sell", label: "Sell", icon: Plus },
    { id: "my-books", label: "My Books", icon: Library },
    { id: "requests", label: "Requests", icon: MessageSquare },
  ] as const;

  // Add admin item if user is admin, otherwise add profile
  const navItems = isAdmin 
    ? [...baseNavItems, { id: "admin", label: "Admin", icon: Shield }]
    : [...baseNavItems, { id: "profile", label: "Profile", icon: User }];

  const handleNavClick = (view: DashboardView) => {
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    setCurrentView(view);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            onClick={() => handleNavClick(id as DashboardView)}
            className={`flex flex-col items-center space-y-1 h-auto py-3 px-3 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
              currentView === id 
                ? id === "admin" 
                  ? "text-purple-600 bg-purple-50 shadow-sm scale-105" 
                  : "text-blue-600 bg-blue-50 shadow-sm scale-105"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Icon className={`h-5 w-5 transition-all duration-200 ${
              currentView === id 
                ? id === "admin" 
                  ? "text-purple-600 scale-110" 
                  : "text-blue-600 scale-110"
                : "text-gray-600"
            }`} />
            <span className={`text-xs transition-all duration-200 truncate ${
              currentView === id 
                ? id === "admin" 
                  ? "text-purple-600 font-semibold" 
                  : "text-blue-600 font-semibold"
                : "text-gray-600"
            }`}>
              {label}
            </span>
          </Button>
        ))}
      </div>
      
      {/* Safe area indicator */}
      <div className="h-safe-area-inset-bottom bg-white/95"></div>
    </nav>
  );
};
