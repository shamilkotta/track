"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Mail, Paperclip, Plus, Upload, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  currencies,
  isCurrency,
  isJobType,
  isLeadPlatform,
  isLeadStatus,
  isPriority,
  isReminderTime,
  isReplyStatus,
  isSource,
  isStage,
  formatTagsInput,
  isWorkMode,
  jobTypes,
  leadPlatforms,
  leadStatuses,
  parseTagsInput,
  priorities,
  reminderTimes,
  replyStatuses,
  sources,
  stages,
  workModes,
  type ApplicationFormValues,
  type Company,
  type CoverLetter,
  type Currency,
  type JobType,
  type LeadFormValues,
  type LeadPlatform,
  type LeadStatus,
  type Priority,
  type ReminderTime,
  type ReplyStatus,
  type Resume,
  type Source,
  type Stage,
  type WorkMode,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

type CompanyOption =
  | { kind: "company"; id: string; label: string; company: Company }
  | { kind: "create"; id: string; label: string; name: string };

type ResumeOption =
  | { kind: "none"; id: "none"; label: string }
  | { kind: "resume"; id: string; label: string; resume: Resume }
  | { kind: "upload"; id: "upload"; label: string };

type CoverLetterOption =
  | { kind: "none"; id: "none"; label: string }
  | { kind: "letter"; id: string; label: string; letter: CoverLetter }
  | { kind: "write"; id: "write"; label: string }
  | { kind: "upload"; id: "upload"; label: string };

export function CompanyMark({
  logo,
  color,
  large = false,
}: {
  logo: string;
  color: string;
  large?: boolean;
}) {
  return (
    <Avatar size={large ? "lg" : "default"} className="rounded-lg after:rounded-lg">
      <AvatarFallback className={cn("rounded-lg text-sm font-semibold", color)}>
        {logo}
      </AvatarFallback>
    </Avatar>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  const variant =
    stage === "Offer"
      ? "default"
      : stage === "Rejected" || stage === "Withdrawn"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{stage}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={priority === "High" ? "outline" : "secondary"}>{priority}</Badge>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const variant =
    status === "Converted"
      ? "default"
      : status === "Closed"
        ? "destructive"
        : status === "Replied" || status === "Meeting booked"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => formatTagsInput(value));
  const focusedRef = useRef(false);
  const external = formatTagsInput(value);

  useEffect(() => {
    if (!focusedRef.current) setText(external);
  }, [external]);

  function commit(raw: string) {
    const tags = parseTagsInput(raw);
    onChange(tags);
    setText(formatTagsInput(tags));
  }

  return (
    <Input
      value={text}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        onChange(parseTagsInput(next));
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(text);
        }
      }}
      placeholder={placeholder}
    />
  );
}

export function NativeSelectField<T extends string>({
  value,
  onChange,
  options,
  guard,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  guard: (value: unknown) => value is T;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (guard(next)) onChange(next);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CompanyPicker({
  companies,
  value,
  onChange,
  onCreate,
}: {
  companies: Company[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreate: (name: string) => Promise<string>;
}) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);

  const selectedCompany = companies.find((company) => company.id === value) ?? null;

  useEffect(() => {
    if (selectedCompany) {
      setQuery(selectedCompany.name);
    }
  }, [selectedCompany?.id, selectedCompany?.name]);

  const items = useMemo<CompanyOption[]>(() => {
    const existing: CompanyOption[] = companies.map((company) => ({
      kind: "company",
      id: company.id,
      label: company.name,
      company,
    }));
    const q = query.trim();
    const exact = companies.some((c) => c.name.toLowerCase() === q.toLowerCase());
    if (q && !exact) {
      existing.push({
        kind: "create",
        id: `create:${q}`,
        label: `Create "${q}"`,
        name: q,
      });
    }
    return existing;
  }, [companies, query]);

  const selectedItem: CompanyOption | null =
    items.find((item) => item.kind === "company" && item.id === value) ?? null;

  const handleInputValueChange = (nextQuery: string) => {
    setQuery(nextQuery);
    if (value && nextQuery !== selectedCompany?.name) {
      onChange(null);
    }
  };

  return (
    <Combobox
      items={items}
      value={selectedItem}
      inputValue={query}
      onValueChange={(item: CompanyOption | null) => {
        if (pending) return;
        if (!item) {
          onChange(null);
          setQuery("");
          return;
        }
        if (item.kind === "create") {
          setPending(true);
          void onCreate(item.name)
            .then((id) => {
              onChange(id);
              setQuery(item.name);
            })
            .finally(() => setPending(false));
          return;
        }
        onChange(item.company.id);
        setQuery(item.company.name);
      }}
      onInputValueChange={handleInputValueChange}
      itemToStringLabel={(item: CompanyOption) =>
        item.kind === "company" ? item.company.name : query
      }
      isItemEqualToValue={(a: CompanyOption, b: CompanyOption) => a.id === b.id}
    >
      <ComboboxInput
        className="w-full"
        placeholder="Search or create company"
        showClear={!!value || !!query.trim()}
      />
      <ComboboxContent>
        <ComboboxEmpty>No companies found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.kind === "company" ? (
                <span className="flex items-center gap-2">
                  <CompanyMark logo={item.company.logo} color={item.company.color} />
                  {item.company.name}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="size-4" />
                  {item.label}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function ResumePicker({
  resumes,
  value,
  onChange,
  onUpload,
  optional = false,
}: {
  resumes: Resume[];
  value: string | null;
  onChange: (id: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  optional?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const items = useMemo<ResumeOption[]>(
    () => [
      ...(optional ? [{ kind: "none" as const, id: "none" as const, label: "No resume" }] : []),
      ...resumes.map((resume) => ({
        kind: "resume" as const,
        id: resume.id,
        label: resume.name,
        resume,
      })),
      { kind: "upload", id: "upload", label: "Upload new resume" },
    ],
    [optional, resumes],
  );
  const selectedItem: ResumeOption | null =
    optional && value === null
      ? (items.find((item) => item.kind === "none") ?? null)
      : (items.find((item) => item.kind === "resume" && item.id === value) ?? null);

  return (
    <>
      <Combobox
        items={items}
        value={selectedItem}
        onValueChange={(item: ResumeOption | null) => {
          if (!item) return;
          if (item.kind === "upload") {
            fileRef.current?.click();
            return;
          }
          if (item.kind === "none") {
            onChange(null);
            return;
          }
          onChange(item.resume.id);
        }}
        itemToStringLabel={(item: ResumeOption) =>
          item.kind === "resume" ? item.resume.name : item.kind === "none" ? "No resume" : ""
        }
        isItemEqualToValue={(a: ResumeOption, b: ResumeOption) => a.id === b.id}
      >
        <ComboboxInput className="w-full" placeholder="Search or upload resume">
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Upload resume"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
            </InputGroupButton>
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxEmpty>No matching resumes.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.id} value={item}>
                {item.kind === "resume" ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="truncate">
                      {item.resume.name}
                      <span className="ml-1 text-muted-foreground">{item.resume.fileName}</span>
                    </span>
                  </span>
                ) : item.kind === "none" ? (
                  <span className="text-muted-foreground">No resume</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="size-4" />
                    Upload new resume
                  </span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void onUpload(file).then(onChange);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function CoverLetterPicker({
  coverLetters,
  value,
  onChange,
  onCreateText,
  onUpload,
}: {
  coverLetters: CoverLetter[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreateText: (name: string, body: string) => Promise<string>;
  onUpload: (file: File) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [writing, setWriting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const selected = coverLetters.find((c) => c.id === value) ?? null;

  const items = useMemo<CoverLetterOption[]>(
    () => [
      { kind: "none", id: "none", label: "No cover letter" },
      ...coverLetters.map((letter) => ({
        kind: "letter" as const,
        id: letter.id,
        label: letter.name,
        letter,
      })),
      { kind: "write", id: "write", label: "Write new text" },
      { kind: "upload", id: "upload", label: "Upload file" },
    ],
    [coverLetters],
  );

  const selectedItem: CoverLetterOption | null =
    value === null
      ? (items.find((item) => item.kind === "none") ?? null)
      : (items.find((item) => item.kind === "letter" && item.id === value) ?? null);

  return (
    <div className="flex flex-col gap-2">
      <Combobox
        items={items}
        value={selectedItem}
        onValueChange={(item: CoverLetterOption | null) => {
          if (!item) return;
          if (item.kind === "none") {
            onChange(null);
            setWriting(false);
            return;
          }
          if (item.kind === "write") {
            setWriting(true);
            setDraftName("New cover letter");
            setDraftBody("");
            return;
          }
          if (item.kind === "upload") {
            fileRef.current?.click();
            return;
          }
          onChange(item.letter.id);
          setWriting(false);
        }}
        itemToStringLabel={(item: CoverLetterOption) =>
          item.kind === "letter" ? item.letter.name : item.label
        }
        isItemEqualToValue={(a: CoverLetterOption, b: CoverLetterOption) => a.id === b.id}
      >
        <ComboboxInput className="w-full" placeholder="Search, write, or upload cover letter">
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Upload cover letter"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
            </InputGroupButton>
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxEmpty>No cover letters found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.id} value={item}>
                {item.kind === "letter" ? (
                  <span className="flex min-w-0 items-center gap-2">
                    {item.letter.kind === "file" ? (
                      <Paperclip className="size-4 text-muted-foreground" />
                    ) : (
                      <Mail className="size-4 text-muted-foreground" />
                    )}
                    <span className="truncate">
                      {item.letter.name}
                      <span className="ml-1 text-muted-foreground">
                        {item.letter.kind === "file" ? item.letter.fileName : "Text"}
                      </span>
                    </span>
                  </span>
                ) : item.kind === "none" ? (
                  <span className="flex items-center gap-2">
                    <X className="size-4" />
                    No cover letter
                  </span>
                ) : item.kind === "write" ? (
                  <span className="flex items-center gap-2">
                    <Plus className="size-4" />
                    Write new text
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="size-4" />
                    Upload file
                  </span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void onUpload(file).then(onChange);
          setWriting(false);
          e.target.value = "";
        }}
      />
      {writing && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <FieldGroup>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Text</FieldLabel>
              <Textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder="Write cover letter text..."
              />
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={!draftName.trim() || !draftBody.trim()}
                onClick={() => {
                  void onCreateText(draftName.trim(), draftBody.trim()).then((id) => {
                    onChange(id);
                    setWriting(false);
                  });
                }}
              >
                Save cover letter
              </Button>
              <Button type="button" variant="outline" onClick={() => setWriting(false)}>
                Cancel
              </Button>
            </div>
          </FieldGroup>
        </div>
      )}
      {selected?.kind === "text" && !writing && (
        <p className="line-clamp-3 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {selected.body}
        </p>
      )}
    </div>
  );
}

export function ApplicationFields({
  companies,
  resumes,
  coverLetters,
  values,
  setValues,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
}: {
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  values: ApplicationFormValues;
  setValues: (patch: Partial<ApplicationFormValues>) => void;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  return (
    <div className="flex flex-col gap-7">
      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Role & company
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Company name</FieldLabel>
            <CompanyPicker
              companies={companies}
              value={values.companyId}
              onChange={(id) => setValues({ companyId: id })}
              onCreate={onCreateCompany}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Role / job title</FieldLabel>
            <Input
              value={values.role}
              onChange={(e) => setValues({ role: e.target.value })}
              placeholder="e.g. Senior Product Designer"
            />
          </Field>
          <Field>
            <FieldLabel>Source</FieldLabel>
            <NativeSelectField
              value={values.source}
              onChange={(source: Source) => setValues({ source })}
              options={sources}
              guard={isSource}
            />
          </Field>
          <Field>
            <FieldLabel>Job type</FieldLabel>
            <NativeSelectField
              value={values.jobType}
              onChange={(jobType: JobType) => setValues({ jobType })}
              options={jobTypes}
              guard={isJobType}
            />
          </Field>
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input
              value={values.location}
              onChange={(e) => setValues({ location: e.target.value })}
              placeholder="City, State or country"
            />
          </Field>
          <Field>
            <FieldLabel>Remote type</FieldLabel>
            <NativeSelectField
              value={values.workMode}
              onChange={(workMode: WorkMode) => setValues({ workMode })}
              options={workModes}
              guard={isWorkMode}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Job link</FieldLabel>
            <Input
              type="url"
              value={values.jobUrl}
              onChange={(e) => setValues({ jobUrl: e.target.value })}
              placeholder="https://company.com/jobs/..."
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Company website</FieldLabel>
            <Input
              type="url"
              value={values.companyWebsite}
              onChange={(e) => setValues({ companyWebsite: e.target.value })}
              placeholder="https://company.com"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Status & timing
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <NativeSelectField
              value={values.stage}
              onChange={(stage: Stage) => setValues({ stage })}
              options={stages}
              guard={isStage}
            />
          </Field>
          <Field>
            <FieldLabel>Priority</FieldLabel>
            <NativeSelectField
              value={values.priority}
              onChange={(priority: Priority) => setValues({ priority })}
              options={priorities}
              guard={isPriority}
            />
          </Field>
          <Field>
            <FieldLabel>Reply status</FieldLabel>
            <NativeSelectField
              value={values.replyStatus}
              onChange={(replyStatus: ReplyStatus) => setValues({ replyStatus })}
              options={replyStatuses}
              guard={isReplyStatus}
            />
          </Field>
          <Field>
            <FieldLabel>Reminder time</FieldLabel>
            <NativeSelectField
              value={values.reminderTime}
              onChange={(reminderTime: ReminderTime) => setValues({ reminderTime })}
              options={reminderTimes}
              guard={isReminderTime}
            />
          </Field>
          <Field>
            <FieldLabel>Applied date</FieldLabel>
            <Input
              type="date"
              value={values.appliedDate}
              onChange={(e) => setValues({ appliedDate: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Next step date</FieldLabel>
            <Input
              type="date"
              value={values.nextStepDate}
              onChange={(e) => setValues({ nextStepDate: e.target.value })}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Next step</FieldLabel>
            <Input
              value={values.nextStepLabel}
              onChange={(e) => setValues({ nextStepLabel: e.target.value })}
              placeholder="e.g. Portfolio review, Follow up, Recruiter call"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Compensation
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Minimum compensation</FieldLabel>
            <Input
              value={values.compensationMin}
              onChange={(e) => setValues({ compensationMin: e.target.value })}
              placeholder="160000"
            />
          </Field>
          <Field>
            <FieldLabel>Maximum compensation</FieldLabel>
            <Input
              value={values.compensationMax}
              onChange={(e) => setValues({ compensationMax: e.target.value })}
              placeholder="190000"
            />
          </Field>
          <Field>
            <FieldLabel>Currency</FieldLabel>
            <NativeSelectField
              value={values.currency}
              onChange={(currency: Currency) => setValues({ currency })}
              options={currencies}
              guard={isCurrency}
            />
          </Field>
          <Field>
            <FieldLabel>Equity / bonus</FieldLabel>
            <Input
              value={values.equityBonus}
              onChange={(e) => setValues({ equityBonus: e.target.value })}
              placeholder="e.g. Equity + 15% bonus"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Materials & outreach
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Resume used</FieldLabel>
            <ResumePicker
              resumes={resumes}
              value={values.resumeId}
              onChange={(id) => setValues({ resumeId: id })}
              onUpload={onUploadResume}
              optional
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Cover letter</FieldLabel>
            <CoverLetterPicker
              coverLetters={coverLetters}
              value={values.coverLetterId}
              onChange={(id) => setValues({ coverLetterId: id })}
              onCreateText={onCreateCoverText}
              onUpload={onUploadCover}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Message sent</FieldLabel>
            <Textarea
              value={values.message}
              onChange={(e) => setValues({ message: e.target.value })}
              placeholder="Paste the message or introduction you sent..."
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Job description & notes
        </FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Job description</FieldLabel>
            <Textarea
              value={values.jobDescription}
              onChange={(e) => setValues({ jobDescription: e.target.value })}
              placeholder="Paste the full job description here..."
              className="min-h-32"
            />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              value={values.notes}
              onChange={(e) => setValues({ notes: e.target.value })}
              placeholder="Interview prep, research, concerns, follow-ups..."
            />
          </Field>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <TagsInput
              value={values.tags}
              onChange={(tags) => setValues({ tags })}
              placeholder="Design systems, B2B SaaS (comma or space separated)"
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Contact details
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Contact name</FieldLabel>
            <Input
              value={values.contactName}
              onChange={(e) => setValues({ contactName: e.target.value })}
              placeholder="e.g. Maya Chen"
            />
          </Field>
          <Field>
            <FieldLabel>Contact role</FieldLabel>
            <Input
              value={values.contactRole}
              onChange={(e) => setValues({ contactRole: e.target.value })}
              placeholder="Recruiter, hiring manager..."
            />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={values.contactEmail}
              onChange={(e) => setValues({ contactEmail: e.target.value })}
              placeholder="name@company.com"
            />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input
              type="tel"
              value={values.contactPhone}
              onChange={(e) => setValues({ contactPhone: e.target.value })}
              placeholder="+1 555 0100"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>LinkedIn / contact URL</FieldLabel>
            <Input
              type="url"
              value={values.contactUrl}
              onChange={(e) => setValues({ contactUrl: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Contact notes</FieldLabel>
            <Textarea
              value={values.contactNotes}
              onChange={(e) => setValues({ contactNotes: e.target.value })}
              placeholder="How you met, what they care about, last touchpoint..."
            />
          </Field>
        </div>
      </FieldSet>
    </div>
  );
}

export function LeadFields({
  companies,
  resumes,
  coverLetters,
  values,
  setValues,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
}: {
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  values: LeadFormValues;
  setValues: (patch: Partial<LeadFormValues>) => void;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  return (
    <div className="flex flex-col gap-7">
      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Person & company
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Company name</FieldLabel>
            <CompanyPicker
              companies={companies}
              value={values.companyId}
              onChange={(id) => setValues({ companyId: id })}
              onCreate={onCreateCompany}
            />
          </Field>
          <Field>
            <FieldLabel>Person name</FieldLabel>
            <Input
              value={values.personName}
              onChange={(e) => setValues({ personName: e.target.value })}
              placeholder="e.g. Maya Chen"
            />
          </Field>
          <Field>
            <FieldLabel>Person role</FieldLabel>
            <Input
              value={values.personRole}
              onChange={(e) => setValues({ personRole: e.target.value })}
              placeholder="Recruiter, hiring manager..."
            />
          </Field>
          <Field>
            <FieldLabel>Platform</FieldLabel>
            <NativeSelectField
              value={values.platform}
              onChange={(platform: LeadPlatform) => setValues({ platform })}
              options={leadPlatforms}
              guard={isLeadPlatform}
            />
          </Field>
          <Field>
            <FieldLabel>Company link</FieldLabel>
            <Input
              type="url"
              value={values.companyWebsite}
              onChange={(e) => setValues({ companyWebsite: e.target.value })}
              placeholder="https://company.com"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Profile link</FieldLabel>
            <Input
              type="url"
              value={values.profileUrl}
              onChange={(e) => setValues({ profileUrl: e.target.value })}
              placeholder="https://linkedin.com/in/... or x.com/..."
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Lead / thread link</FieldLabel>
            <Input
              type="url"
              value={values.leadUrl}
              onChange={(e) => setValues({ leadUrl: e.target.value })}
              placeholder="Link to DM, email thread, or CRM record"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Status & timing
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <NativeSelectField
              value={values.status}
              onChange={(status: LeadStatus) => setValues({ status })}
              options={leadStatuses}
              guard={isLeadStatus}
            />
          </Field>
          <Field>
            <FieldLabel>Priority</FieldLabel>
            <NativeSelectField
              value={values.priority}
              onChange={(priority: Priority) => setValues({ priority })}
              options={priorities}
              guard={isPriority}
            />
          </Field>
          <Field>
            <FieldLabel>Send date</FieldLabel>
            <Input
              type="date"
              value={values.sentDate}
              onChange={(e) => setValues({ sentDate: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Reminder time</FieldLabel>
            <NativeSelectField
              value={values.reminderTime}
              onChange={(reminderTime: ReminderTime) => setValues({ reminderTime })}
              options={reminderTimes}
              guard={isReminderTime}
            />
          </Field>
          <Field>
            <FieldLabel>Next step date</FieldLabel>
            <Input
              type="date"
              value={values.nextStepDate}
              onChange={(e) => setValues({ nextStepDate: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Next step</FieldLabel>
            <Input
              value={values.nextStepLabel}
              onChange={(e) => setValues({ nextStepLabel: e.target.value })}
              placeholder="e.g. Follow up, Book intro call"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Outreach materials
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Message sent</FieldLabel>
            <Textarea
              value={values.message}
              onChange={(e) => setValues({ message: e.target.value })}
              placeholder="Paste the DM, cold email, or intro you sent..."
              className="min-h-28"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Resume sent</FieldLabel>
            <ResumePicker
              resumes={resumes}
              value={values.resumeId}
              onChange={(id) => setValues({ resumeId: id })}
              onUpload={onUploadResume}
              optional
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Cover letter sent</FieldLabel>
            <CoverLetterPicker
              coverLetters={coverLetters}
              value={values.coverLetterId}
              onChange={(id) => setValues({ coverLetterId: id })}
              onCreateText={onCreateCoverText}
              onUpload={onUploadCover}
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Notes
        </FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              value={values.notes}
              onChange={(e) => setValues({ notes: e.target.value })}
              placeholder="Context, warm intro path, what they care about..."
            />
          </Field>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <TagsInput
              value={values.tags}
              onChange={(tags) => setValues({ tags })}
              placeholder="Warm intro, YC, Design (comma or space separated)"
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
