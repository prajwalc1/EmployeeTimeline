import { Switch, Route } from "wouter";
import Dashboard from "@/pages/Dashboard";
import EmployeeManagement from "@/pages/EmployeeManagement";
import TimeTracking from "@/pages/TimeTracking";
import LeaveManagement from "@/pages/LeaveManagement";
import Reports from "@/pages/Reports";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";

import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@db/schema";

function App() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Load selected employee from localStorage
  useEffect(() => {
    const savedEmployeeId = localStorage.getItem('selectedEmployeeId');
    if (savedEmployeeId) {
      setSelectedEmployeeId(savedEmployeeId);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedEmployeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-4">Willkommen</h1>
            <p className="mb-4">Bitte wählen Sie Ihren Namen aus der Liste:</p>
            <Select
              onValueChange={(value) => {
                setSelectedEmployeeId(value);
                localStorage.setItem('selectedEmployeeId', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name} - {employee.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentEmployeeId={selectedEmployeeId!} />
      <main className="flex-1 p-6 md:ml-64">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/employees" component={EmployeeManagement} />
          <Route path="/time-tracking">
            {() => <TimeTracking selectedEmployeeId={selectedEmployeeId} />}
          </Route>
          <Route path="/leave-management">
            {() => <LeaveManagement selectedEmployeeId={selectedEmployeeId} />}
          </Route>
          <Route path="/reports" component={Reports} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 - Seite nicht gefunden</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Die angeforderte Seite konnte nicht gefunden werden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;