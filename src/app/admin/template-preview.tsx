import {
  renderText,
  resolveTemplateFontSize,
  type CertificateTemplateRecord,
  type TemplateConfig
} from "@/lib/types";

const sample = {
  participant_name: "Nama Peserta",
  certificate_number: "ITTS/CERT/2026/0001",
  event_title: "Pelatihan & Webinar ITTS",
  event_date: "24 September 2026",
  organizer: "Institut Teknologi Tangerang Selatan",
  signatory: "Ketua Pelaksana"
};

export default function TemplatePreview({
  template,
  config,
  imageUrl,
  className = "",
  values
}: {
  template?: CertificateTemplateRecord;
  config?: TemplateConfig;
  imageUrl?: string | null;
  className?: string;
  values?: Record<string, string>;
}) {
  const resolvedConfig = config ?? template?.template_config;
  const resolvedImage = imageUrl === undefined ? template?.template_image_url : imageUrl;

  if (!resolvedConfig) return null;

  const resolvedValues = { ...sample, ...values };

  return (
    <div className={"template-thumbnail " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedImage || "/default-certificate.svg"}
        alt={template ? "Preview " + template.name : "Preview template"}
      />
      {resolvedConfig.fields
        .filter((field) => !field.hidden)
        .map((field) => {
          const rendered = renderText(field.template, resolvedValues);
          const fittedSize = resolveTemplateFontSize(field, rendered);

          return (
            <div
              key={field.id}
              style={{
                position: "absolute",
                left: field.x + "%",
                top: field.y + "%",
                width: field.width + "%",
                transform: "translate(-50%, -50%)",
                fontSize: fittedSize / 11.23 + "cqw",
                fontWeight: field.fontWeight,
                color: field.color,
                textAlign: field.align,
                fontStyle: field.italic ? "italic" : "normal",
                lineHeight: field.lineHeight ?? 1.05,
                letterSpacing: field.letterSpacing
                  ? field.letterSpacing / 11.23 + "cqw"
                  : undefined,
                overflow: "hidden",
                overflowWrap: "break-word"
              }}
            >
              {rendered}
            </div>
          );
        })}
      {!resolvedConfig.qr.hidden ? (
        <div
          className="thumbnail-qr"
          style={{
            left: resolvedConfig.qr.x + "%",
            top: resolvedConfig.qr.y + "%",
            width: resolvedConfig.qr.size + "%"
          }}
        >
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}
