"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Assignment = {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
};

export function ScopeSelector({
  assignments,
  classId,
  subjectId,
  basePath = "/teacher",
}: {
  assignments: Assignment[];
  classId: string;
  subjectId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: { classId: string; subjectId: string }) {
    const sp = new URLSearchParams(params);
    sp.set("classId", next.classId);
    sp.set("subjectId", next.subjectId);
    router.push(`${basePath}/content?${sp.toString()}`);
  }

  const value = `${classId}:${subjectId}`;

  return (
    <div className="space-y-2">
      <Label>Périmètre</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          const [c, s] = v.split(":");
          update({ classId: c, subjectId: s });
        }}
      >
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {assignments.map((a) => (
            <SelectItem
              key={`${a.classId}:${a.subjectId}`}
              value={`${a.classId}:${a.subjectId}`}
            >
              {a.className} — {a.subjectName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
