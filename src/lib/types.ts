export type TextAlign = "left" | "center" | "right";

export type TemplateField = {
  id: string;
  template: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: TextAlign;
  italic?: boolean;
  hidden?: boolean;
};

export type TemplateConfig = {
  fields: TemplateField[];
  qr: {
    x: number;
    y: number;
    size: number;
    hidden?: boolean;
  };
};

export type CertificateTemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  template_image_url: string | null;
  template_config: TemplateConfig;
  is_default: boolean;
  status: "active" | "archived";
  current_version_id: string | null;
  current_version: number;
  usage_count?: number;
  created_at: string;
  updated_at: string;
};

export type TemplateVersionRecord = {
  id: string;
  template_id: string;
  version_number: number;
  template_image_url: string | null;
  template_config: TemplateConfig;
  change_note: string | null;
  certificate_count?: number;
  created_at: string;
};

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  organizer: string;
  signatory: string;
  description: string | null;
  certificate_prefix: string;
  template_id: string | null;
  template_name?: string | null;
  template_current_version?: number | null;
  template_image_url: string | null;
  template_config: TemplateConfig;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type CertificateRecord = {
  id: string;
  public_id: string;
  event_id: string;
  participant_name: string;
  participant_email: string | null;
  certificate_number: string;
  custom_data: Record<string, string>;
  issuance_snapshot: Record<string, string>;
  template_version_id: string | null;
  template_version_number: number | null;
  status: "valid" | "revoked";
  issued_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
};

export type TemplateUsageRecord = {
  id: string;
  title: string;
  event_date: string;
  status: EventRecord["status"];
  certificate_count: number;
};

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  fields: [
    {
      id: "event-title",
      template: "{{event_title}}",
      x: 50,
      y: 31,
      width: 78,
      fontSize: 28,
      fontWeight: 700,
      color: "#0f3d4a",
      align: "center"
    },
    {
      id: "participant-name",
      template: "{{participant_name}}",
      x: 50,
      y: 47,
      width: 78,
      fontSize: 46,
      fontWeight: 700,
      color: "#132238",
      align: "center"
    },
    {
      id: "certificate-number",
      template: "Nomor: {{certificate_number}}",
      x: 50,
      y: 57,
      width: 70,
      fontSize: 16,
      fontWeight: 500,
      color: "#4b5563",
      align: "center"
    },
    {
      id: "event-date",
      template: "Diselenggarakan pada {{event_date}}",
      x: 50,
      y: 67,
      width: 70,
      fontSize: 17,
      fontWeight: 500,
      color: "#374151",
      align: "center"
    },
    {
      id: "organizer",
      template: "Penyelenggara: {{organizer}}",
      x: 50,
      y: 73,
      width: 70,
      fontSize: 16,
      fontWeight: 500,
      color: "#374151",
      align: "center"
    },
    {
      id: "signatory",
      template: "{{signatory}}",
      x: 50,
      y: 89,
      width: 36,
      fontSize: 16,
      fontWeight: 700,
      color: "#1f2937",
      align: "center"
    }
  ],
  qr: { x: 88, y: 82, size: 10 }
};

export function formatDateId(value: string | Date) {
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(value + "T00:00:00+07:00")
        : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" && value ? value : "—";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(date);
}

export function renderText(template: string, values: Record<string, string>) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => values[key] ?? "");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
