"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CertificateTemplateRecord } from "@/lib/types";
import TemplatePreview from "./template-preview";

export default function TemplateLibrary({
  templates
}: {
  templates: CertificateTemplateRecord[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "archived">("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return templates.filter((template) => {
      const statusMatch = status === "all" || template.status === status;
      const queryMatch =
        !normalized ||
        template.name.toLowerCase().includes(normalized) ||
        (template.description ?? "").toLowerCase().includes(normalized);
      return statusMatch && queryMatch;
    });
  }, [query, status, templates]);

  return (
    <div className="template-library-shell">
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau deskripsi template..."
            aria-label="Cari template"
          />
        </div>
        <div className="filter-pills">
          {[
            ["all", "Semua"],
            ["active", "Aktif"],
            ["archived", "Arsip"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={"filter-pill " + (status === value ? "active" : "")}
              onClick={() => setStatus(value as typeof status)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="template-library-grid">
          {filtered.map((template) => (
            <article className="template-library-card" key={template.id}>
              <Link href={"/admin/templates/" + template.id} className="template-card-preview-link">
                <TemplatePreview template={template} />
              </Link>

              <div className="template-card-body">
                <div className="template-card-heading">
                  <div>
                    <div className="template-badges">
                      <span
                        className={
                          "badge " +
                          (template.status === "active" ? "badge-valid" : "badge-neutral")
                        }
                      >
                        {template.status === "active" ? "Aktif" : "Arsip"}
                      </span>
                      {template.is_default ? (
                        <span className="badge badge-default">Default</span>
                      ) : null}
                    </div>
                    <h3>{template.name}</h3>
                  </div>
                  <span className="usage-pill">
                    {template.usage_count ?? 0} kegiatan
                  </span>
                </div>

                <p>
                  {template.description ||
                    "Template sertifikat tanpa deskripsi. Buka editor untuk menambahkan informasi."}
                </p>

                <div className="template-card-meta">
                  <span>{template.template_image_url ? "Background custom" : "Background ITTS"}</span>
                  <span>{template.template_config.fields.length} elemen teks</span>
                </div>

                <div className="template-card-actions">
                  <Link
                    className="btn btn-secondary btn-small"
                    href={"/admin/templates/" + template.id}
                  >
                    Edit template
                  </Link>
                  <Link
                    className="text-link"
                    href={"/admin/templates/" + template.id + "#usage"}
                  >
                    Riwayat penggunaan →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⌕</div>
          <h3>Template tidak ditemukan</h3>
          <p>Ubah kata pencarian atau filter status untuk melihat template lainnya.</p>
        </div>
      )}
    </div>
  );
}
