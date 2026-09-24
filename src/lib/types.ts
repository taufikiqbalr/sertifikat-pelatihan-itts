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
  /**
   * Optional rendering hints used to keep dynamic text inside a safe zone.
   * They do not change the stored text; only the rendered font size/leading.
   */
  autoFit?: boolean;
  minFontSize?: number;
  maxLines?: number;
  lineHeight?: number;
  letterSpacing?: number;
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

export const DEFAULT_TEMPLATE_IMAGE_URL = "/default-certificate-v2.svg";
export const SYSTEM_DEFAULT_TEMPLATE_ID = "template-default-itts";
export const SYSTEM_DEFAULT_TEMPLATE_REVISION = 2;
export const SYSTEM_DEFAULT_TEMPLATE_REVISION_NOTE =
  "SYSTEM_DEFAULT_PRESET_REVISION_2";

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  fields: [
    {
      id: "certificate-number",
      template: "{{certificate_number}}",
      x: 50,
      y: 27,
      width: 74,
      fontSize: 22,
      fontWeight: 800,
      color: "#0b5e66",
      align: "center",
      autoFit: true,
      minFontSize: 15,
      maxLines: 1,
      lineHeight: 1.05,
      letterSpacing: 0.15
    },
    {
      id: "participant-name",
      template: "{{participant_name}}",
      x: 50,
      y: 45,
      width: 78,
      fontSize: 44,
      fontWeight: 700,
      color: "#132238",
      align: "center",
      autoFit: true,
      minFontSize: 30,
      maxLines: 1,
      lineHeight: 1.05
    },
    {
      id: "event-title",
      template: "{{event_title}}",
      x: 50,
      y: 59.5,
      width: 76,
      fontSize: 24,
      fontWeight: 700,
      color: "#0f3d4a",
      align: "center",
      autoFit: true,
      minFontSize: 16,
      maxLines: 2,
      lineHeight: 1.12
    },
    {
      id: "event-date",
      template: "{{event_date}}",
      x: 50,
      y: 69.5,
      width: 60,
      fontSize: 15,
      fontWeight: 600,
      color: "#374151",
      align: "center",
      autoFit: true,
      minFontSize: 12,
      maxLines: 1,
      lineHeight: 1.1
    },
    {
      id: "organizer",
      template: "{{organizer}}",
      x: 50,
      y: 75,
      width: 72,
      fontSize: 14,
      fontWeight: 500,
      color: "#475569",
      align: "center",
      autoFit: true,
      minFontSize: 11,
      maxLines: 2,
      lineHeight: 1.12
    },
    {
      id: "signatory",
      template: "{{signatory}}",
      x: 72,
      y: 85.5,
      width: 30,
      fontSize: 15,
      fontWeight: 700,
      color: "#1f2937",
      align: "center",
      autoFit: true,
      minFontSize: 12,
      maxLines: 2,
      lineHeight: 1.1
    }
  ],
  qr: { x: 17.5, y: 85.5, size: 10 }
};

export function resolveTemplateFontSize(field: TemplateField, renderedText: string) {
  if (!field.autoFit || !renderedText.trim()) return field.fontSize;

  // The certificate canvas is authored at 1123 px wide. This deterministic
  // approximation keeps long dynamic values in their allocated safe zone
  // without relying on browser measurement before PNG/PDF export.
  const fieldWidthPx = 1123 * (Math.max(8, field.width) / 100);
  const lines = Math.max(1, field.maxLines ?? 1);
  const normalizedLength = renderedText.trim().replace(/\s+/g, " ").length;
  const averageGlyphWidth = 0.54;
  const estimatedFit =
    (fieldWidthPx * lines) / Math.max(1, normalizedLength * averageGlyphWidth);

  const minFontSize = Math.min(
    field.fontSize,
    field.minFontSize ?? Math.max(10, Math.round(field.fontSize * 0.68))
  );

  return Math.max(
    minFontSize,
    Math.min(field.fontSize, Math.floor(estimatedFit * 10) / 10)
  );
}

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
