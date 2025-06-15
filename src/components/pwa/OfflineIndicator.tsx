
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRetry, setShowRetry] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRetry(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setTimeout(() => setShowRetry(true), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isOnline) return null;

  return (
    <div className={`fixed top-4 z-50 ${
      isMobile ? 'left-4 right-4' : 'left-1/2 transform -translate-x-1/2'
    }`}>
      <div className="bg-red-500 text-white rounded-lg p-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <div>
            <span className="font-medium">You're offline</span>
            {isMobile && (
              <p className="text-xs text-red-100 mt-1">
                Some features may be limited
              </p>
            )}
          </div>
        </div>
        
        {showRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            className="bg-white text-red-600 hover:bg-red-50 ml-3"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
