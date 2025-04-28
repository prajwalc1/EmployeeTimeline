import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Employee, LeaveRequest } from "@db/schema";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  // Get current employee data
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees']
  });

  // Get employee ID from localStorage
  const selectedEmployeeId = localStorage.getItem('selectedEmployeeId');
  const currentEmployee = employees?.find(e => e.id.toString() === selectedEmployeeId);

  // Get monthly total hours
  const { data: monthlyTotal, isLoading: isLoadingTotal } = useQuery<{ totalHours: string }>({
    queryKey: ['/api/time-entries/monthly-total', selectedEmployeeId],
    enabled: !!selectedEmployeeId,
    staleTime: 1000 * 60, // Refresh every minute
    refetchInterval: 1000 * 60 // Refresh every minute
  });

  // Get leave requests
  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests']
  });

  if (isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Willkommen, {currentEmployee?.name || 'Mitarbeiter'}!
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Arbeitszeit diesen Monat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isLoadingTotal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Berechne...</span>
                </>
              ) : (
                <p className="text-2xl font-bold">
                  {monthlyTotal?.totalHours || '0'} Stunden
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urlaubstage übrig</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currentEmployee?.annualLeaveBalance || '0'} Tage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offene Urlaubsanträge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {leaveRequests?.filter(req => 
                req.status === 'PENDING' && 
                req.employeeId.toString() === selectedEmployeeId
              ).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kalender</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            locale={de}
            selected={new Date()}
            className="rounded-md border"
          />
        </CardContent>
      </Card>
    </div>
  );
}