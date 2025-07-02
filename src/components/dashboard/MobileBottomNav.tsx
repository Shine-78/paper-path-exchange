
import { Button } from "@/components/ui/button";
import { Search, Plus, Library, MessageSquare, User, Shield } from "lucide-react";
import { DashboardView } from "@/types/dashboard";

interface MobileBottomNavProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  isAdmin?: boolean;
}

export const MobileBottomNav = ({ currentView, setCurrentView, isAdmin }: MobileBottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around items-center">
        <button
          onClick={() => setCurrentView("discover")}
          className={`flex flex-col items-center space-y-1 px-2 py-1 rounded ${
            currentView === "discover" ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs">Discover</span>
        </button>
        
        <button
          onClick={() => setCurrentView("sell")}
          className={`flex flex-col items-center space-y-1 px-2 py-1 rounded ${
            currentView === "sell" ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs">Sell</span>
        </button>
        
        <button
          onClick={() => setCurrentView("my-books")}
          className={`flex flex-col items-center space-y-1 px-2 py-1 rounded ${
            currentView === "my-books" ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <Book className="h-5 w-5" />
          <span className="text-xs">My Books</span>
        </button>
        
        <button
          onClick={() => setCurrentView("requests")}
          className={`flex flex-col items-center space-y-1 px-2 py-1 rounded ${
            currentView === "requests" ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">Requests</span>
        </button>

        <button
          onClick={() => setCurrentView("my-requests")}
          className={`flex flex-col items-center space-y-1 px-2 py-1 rounded ${
            currentView === "my-requests" ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-xs">My Req</span>
        </button>
        
        <button
          onClick={() => setCurrentView("profile")}
          className={`flex flex-col items-center space-y-1 px-2 py-1 rounded ${
            currentView === "profile" ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
};
