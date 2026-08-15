"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ACADEMIC_YEARS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function JoinUniversity({
  defaults,
}: {
  defaults: { rollNumber: string | null; department: string | null; year: string | null };
}) {
  const router = useRouter();
  const [joinCode, setJoinCode] = React.useState("");
  const [rollNumber, setRollNumber] = React.useState(defaults.rollNumber ?? "");
  const [department, setDepartment] = React.useState(defaults.department ?? "");
  const [year, setYear] = React.useState(defaults.year ?? "");
  const [division, setDivision] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/university/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode, rollNumber, department, year, division }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not join.");
      toast.success(
        data.alreadyMember ? `Already a member of ${data.university}` : `Joined ${data.university}`,
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Join your university</CardTitle>
          <p className="text-sm text-text-muted">
            Enter the join code your faculty shared. This links your DSA Forge account to your
            institution so assigned assessments appear here.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={join} className="space-y-4">
            <Field label="Join code" required htmlFor="joinCode">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
                <Input
                  id="joinCode"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="FORGE-XXXX"
                  className="pl-9 font-mono tracking-widest"
                  required
                  maxLength={24}
                />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Roll number" htmlFor="rollNumber" hint="Used on result sheets.">
                <Input
                  id="rollNumber"
                  value={rollNumber}
                  onChange={(event) => setRollNumber(event.target.value)}
                  placeholder="21CS1043"
                />
              </Field>
              <Field label="Department" htmlFor="department">
                <Input
                  id="department"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  placeholder="Computer Science"
                />
              </Field>
              <Field label="Year" htmlFor="year">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Division" htmlFor="division">
                <Input
                  id="division"
                  value={division}
                  onChange={(event) => setDivision(event.target.value)}
                  placeholder="A"
                  maxLength={40}
                />
              </Field>
            </div>

            {error && (
              <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={pending} loadingText="Joining...">
              <GraduationCap className="size-4" />
              Join university
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this portal does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-text-muted">
          <div>
            <p className="font-medium text-text-primary">For students</p>
            <p className="mt-1">
              See assessments assigned to you, enter them during their window, solve DSA problems in
              C, C++, Java or Python, and get automatically evaluated results.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">For faculty</p>
            <p className="mt-1">
              Author your own problems with public, hidden, edge and stress test cases, build a
              paper, assign 23 / 30 / 40 / 50 or any number of students, schedule it, and get marks
              plus class analytics without hand-grading anything.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Integrity</p>
            <p className="mt-1">
              Timers, marks and test access are all enforced server-side. Structural code similarity
              is surfaced as a review indicator for faculty — never as an accusation.
            </p>
          </div>
          <p className="rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs">
            Need faculty access? An existing faculty member or a platform admin grants it — joining
            with a code always creates a student membership.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
