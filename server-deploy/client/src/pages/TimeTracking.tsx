import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TimeEntryForm from "@/components/TimeEntryForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TimeEntry } from "@db/schema";

interface TimeTrackingProps {
  selectedEmployeeId: string;
}

export default function TimeTracking({ selectedEmployeeId }: TimeTrackingProps) {
  const startDate = format(new Date(), 'yyyy-MM-01');
  const endDate = format(new Date(), 'yyyy-MM-dd');
  
  const { data: timeEntries } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries', { startDate, endDate, employeeId: selectedEmployeeId }]
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Zeiterfassung</h1>

      <Card>
        <CardHeader>
          <CardTitle>Neue Zeiterfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeEntryForm employeeId={selectedEmployeeId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Erfasste Zeiten</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Ende</TableHead>
                <TableHead>Pause (Min)</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Gesamtzeit</TableHead>
                <TableHead>Notizen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {entry.date}
                  </TableCell>
                  <TableCell>
                    {entry.startTime}
                  </TableCell>
                  <TableCell>
                    {entry.endTime}
                  </TableCell>
                  <TableCell>{entry.breakDuration}</TableCell>
                  <TableCell>{entry.project}</TableCell>
                  <TableCell>
                    {(() => {
                      const startParts = entry.startTime.split(':').map(Number);
                      const endParts = entry.endTime.split(':').map(Number);
                      const startMinutes = startParts[0] * 60 + startParts[1];
                      const endMinutes = endParts[0] * 60 + endParts[1];
                      const duration = (endMinutes - startMinutes - entry.breakDuration) / 60;
                      return `${duration.toFixed(2)}h`;
                    })()}
                  </TableCell>
                  <TableCell>{entry.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
