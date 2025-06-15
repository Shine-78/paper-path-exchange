
import { useState } from "react";
import { Calendar, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DeliveryDateSelectorProps {
  onDateSelect: (date: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeliveryDateSelector = ({ onDateSelect, onCancel, loading }: DeliveryDateSelectorProps) => {
  const [selectedDate, setSelectedDate] = useState("");

  // Get tomorrow as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Get max date (30 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const handleSubmit = () => {
    if (selectedDate) {
      onDateSelect(selectedDate);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarDays className="h-5 w-5" />
          <span>Set Expected Delivery Date</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
          <Input
            id="deliveryDate"
            type="date"
            min={minDate}
            max={maxDateString}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Select a date between tomorrow and 30 days from now
          </p>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedDate || loading}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? "Accepting..." : "Accept Request"}
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
