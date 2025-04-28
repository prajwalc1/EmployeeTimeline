import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { WORK_RULES, PROJECTS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimeEntryFormData = {
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  project: string;
  notes?: string;
};

interface TimeEntryFormProps {
  employeeId: string;
}

export default function TimeEntryForm({ employeeId }: TimeEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<TimeEntryFormData>({
    defaultValues: {
      date: format(today, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: WORK_RULES.minBreakDuration,
      project: 'INTERNAL'
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: TimeEntryFormData) => {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          employeeId: Number(employeeId), // Ensure employeeId is a number
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 400) {
          throw new Error(errorText);
        }
        throw new Error("Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      toast({
        title: "Zeiterfassung gespeichert",
        description: "Die Arbeitszeit wurde erfolgreich erfasst."
      });
      reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const onSubmit = (data: TimeEntryFormData) => {
    setIsSubmitting(true);

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ungültiges Datumsformat. Bitte verwenden Sie YYYY-MM-DD"
      });
      setIsSubmitting(false);
      return;
    }

    const startHours = parseInt(data.startTime.split(':')[0]);
    const endHours = parseInt(data.endTime.split(':')[0]);
    const startMinutes = parseInt(data.startTime.split(':')[1]);
    const endMinutes = parseInt(data.endTime.split(':')[1]);
    const workMinutes = (endHours - startHours) * 60 + (endMinutes - startMinutes) - data.breakDuration;

    if (workMinutes < 0) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Endzeit kann nicht vor Startzeit liegen."
      });
      setIsSubmitting(false);
      return;
    }

    if (workMinutes / 60 > WORK_RULES.maxDailyHours) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Die maximale Arbeitszeit von ${WORK_RULES.maxDailyHours} Stunden wurde überschritten.`
      });
      setIsSubmitting(false);
      return;
    }

    if (data.breakDuration < WORK_RULES.minBreakDuration) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Die Mindestpause von ${WORK_RULES.minBreakDuration} Minuten wurde unterschritten.`
      });
      setIsSubmitting(false);
      return;
    }

    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">
            Datum <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            {...register("date", {
              required: "Datum ist erforderlich"
            })}
          />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">
            Startzeit <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startTime"
            type="time"
            {...register("startTime", {
              required: "Startzeit ist erforderlich"
            })}
          />
          {errors.startTime && (
            <p className="text-sm text-destructive">{errors.startTime.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">
            Endzeit <span className="text-destructive">*</span>
          </Label>
          <Input
            id="endTime"
            type="time"
            {...register("endTime", {
              required: "Endzeit ist erforderlich"
            })}
          />
          {errors.endTime && (
            <p className="text-sm text-destructive">{errors.endTime.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="breakDuration">
            Pause (Minuten) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="breakDuration"
            type="number"
            min={WORK_RULES.minBreakDuration}
            {...register("breakDuration", {
              required: "Pausendauer ist erforderlich",
              min: {
                value: WORK_RULES.minBreakDuration,
                message: `Mindestpause von ${WORK_RULES.minBreakDuration} Minuten ist erforderlich`
              }
            })}
          />
          {errors.breakDuration && (
            <p className="text-sm text-destructive">{errors.breakDuration.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="project">
            Projekt <span className="text-destructive">*</span>
          </Label>
          <Select
            defaultValue="INTERNAL"
            onValueChange={(value) => setValue("project", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Projekt auswählen" />
            </SelectTrigger>
            <SelectContent>
              {PROJECTS.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.project && (
            <p className="text-sm text-destructive">{errors.project.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Zusätzliche Informationen zur Arbeitszeit"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird gespeichert..." : "Zeit erfassen"}
      </Button>
    </form>
  );
}