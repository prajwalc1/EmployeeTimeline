import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LEAVE_TYPES } from "@/lib/constants";

type LeaveRequestFormData = {
  startDate: string;
  endDate: string;
  type: string;
  notes: string;
  employeeId: number;
};

interface LeaveRequestFormProps {
  employeeId: string;
}

export default function LeaveRequestForm({ employeeId }: LeaveRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<LeaveRequestFormData>({
    defaultValues: {
      type: 'VACATION',
      notes: ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          employeeId: parseInt(employeeId),
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate)
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          throw new Error('Bitte melden Sie sich an, um einen Urlaubsantrag zu stellen.');
        }
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      toast({
        title: "Urlaubsantrag eingereicht",
        description: "Ihr Urlaubsantrag wurde erfolgreich eingereicht."
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

  const onSubmit = (data: LeaveRequestFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Von</Label>
          <Input
            id="startDate"
            type="date"
            {...register("startDate", { required: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Bis</Label>
          <Input
            id="endDate"
            type="date"
            {...register("endDate", { required: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Urlaubsart</Label>
        <Select 
          defaultValue="VACATION"
          onValueChange={(value) => setValue("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Urlaubsart auswählen" />
          </SelectTrigger>
          <SelectContent>
            {LEAVE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'VACATION' ? 'Urlaub' : 
                 type === 'SICK' ? 'Krankheit' :
                 type === 'PERSONAL' ? 'Persönlich' : 'Sonstiges'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          {...register("notes")}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird eingereicht..." : "Urlaub beantragen"}
      </Button>
    </form>
  );
}
