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

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  organizer: string;
  signatory: string;
  description: string | null;
  certificate_prefix: string;
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
  status: "valid" | "revoked";
  issued_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
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
  const date = typeof value === "string" ? new Date(value + (value.length <= 10 ? "T00:00:00" : "")) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
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
