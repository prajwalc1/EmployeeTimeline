import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { TimeEntry, LeaveRequest } from "@db/schema";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';

export default function Reports() {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data: timeEntries } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries', {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    }]
  });

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests']
  });

  const exportToExcel = () => {
    if (!timeEntries) return;

    const wb = XLSX.utils.book_new();
    
    const timeData = timeEntries.map(entry => ({
      Datum: format(new Date(entry.date), 'dd.MM.yyyy'),
      Start: format(new Date(entry.startTime), 'HH:mm'),
      Ende: format(new Date(entry.endTime), 'HH:mm'),
      'Pause (Min)': entry.breakDuration,
      'Gesamtzeit (Std)': ((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2),
      Notizen: entry.notes
    }));

    const ws = XLSX.utils.json_to_sheet(timeData);
    XLSX.utils.book_append_sheet(wb, ws, "Zeiterfassung");
    
    XLSX.writeFile(wb, `Zeiterfassung_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Berichte</h1>

      <Card>
        <CardHeader>
          <CardTitle>Zeitraum auswählen</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div>
            <p className="mb-2">Von</p>
            <DatePicker
              selected={startDate}
              onSelect={(date: Date) => setStartDate(date)}
            />
          </div>
          <div>
            <p className="mb-2">Bis</p>
            <DatePicker
              selected={endDate}
              onSelect={(date: Date) => setEndDate(date)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Arbeitszeitübersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <p className="text-2xl font-bold">
                {timeEntries?.reduce((acc, entry) => {
                  const duration = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
                  return acc + (duration / (1000 * 60 * 60));
                }, 0).toFixed(1) || 0} Stunden
              </p>
              <Button onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urlaubsübersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Genommen: {leaveRequests?.filter(r => r.status === 'APPROVED').length || 0} Tage</p>
              <p>Offen: {leaveRequests?.filter(r => r.status === 'PENDING').length || 0} Anträge</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
