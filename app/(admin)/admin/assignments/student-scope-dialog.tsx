"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { setStudentScope, type ActionState } from "@/lib/actions/assignments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Class = { id: string; name: string; subjects: { id: string; name: string }[] };

type Props = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    classId: string | null;
    grantedSubjectIds: string[];
  };
  classes: Class[];
  trigger: React.ReactNode;
};

export function StudentScopeDialog({ student, classes, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState<string>(student.classId ?? "__none__");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setStudentScope,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    }
  }, [state]);

  const currentClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {student.firstName} {student.lastName}
          </DialogTitle>
          <p className="text-sm text-zinc-500">{student.email}</p>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={student.id} />

          <div className="space-y-2">
            <Label htmlFor="classId">Classe</Label>
            <Select
              name="classId"
              value={classId}
              onValueChange={setClassId}
            >
              <SelectTrigger id="classId">
                <SelectValue placeholder="Non inscrit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">(Non inscrit)</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Matières autorisées</Label>
            {!currentClass ? (
              <p className="text-sm text-zinc-500">
                Sélectionnez une classe pour choisir les matières.
              </p>
            ) : currentClass.subjects.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Cette classe n&apos;a aucune matière associée.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {currentClass.subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={s.id}
                      defaultChecked={
                        student.classId === currentClass.id &&
                        student.grantedSubjectIds.includes(s.id)
                      }
                      className="h-4 w-4"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-500">
              L&apos;élève voit uniquement les matières cochées, même si la
              classe en propose d&apos;autres.
            </p>
          </div>

          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
