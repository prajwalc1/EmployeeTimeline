import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaveRequest } from "@db/schema";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-500';
    case 'REJECTED':
      return 'bg-red-500';
    default:
      return 'bg-yellow-500';
  }
};

interface LeaveManagementProps {
  selectedEmployeeId: string;
}

export default function LeaveManagement({ selectedEmployeeId }: LeaveManagementProps) {
  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests']
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Urlaubsverwaltung</h1>

      <Card>
        <CardHeader>
          <CardTitle>Neuer Urlaubsantrag</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm employeeId={selectedEmployeeId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meine Urlaubsanträge</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Von</TableHead>
                <TableHead>Bis</TableHead>
                <TableHead>Art</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notizen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {format(new Date(request.startDate), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.endDate), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
