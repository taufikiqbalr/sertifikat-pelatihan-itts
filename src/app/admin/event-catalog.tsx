"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDateId, type EventRecord } from "@/lib/types";

export type EventSummary = EventRecord & {
  certificate_count: number;
  valid_count: number;
  revoked_count: number;
};

const statusLabels: Record<EventRecord["status"], string> = {
  active: "Aktif",
  draft: "Draft",
  archived: "Arsip"
};

export default function EventCatalog({ events }: { events: EventSummary[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EventRecord["status"]>("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesStatus = status === "all" || event.status === status;
      const matchesQuery =
        !normalized ||
        event.title.toLowerCase().includes(normalized) ||
        event.organizer.toLowerCase().includes(normalized) ||
        event.certificate_prefix.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [events, query, status]);

  return (
    <section className="catalog-shell">
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kegiatan, penyelenggara, atau prefix..."
            aria-label="Cari kegiatan"
          />
        </div>
        <div className="filter-pills" aria-label="Filter status kegiatan">
          {[
            ["all", "Semua"],
            ["active", "Aktif"],
            ["draft", "Draft"],
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
        <div className="event-card-grid">
          {filtered.map((event) => (
            <article className="event-card" key={event.id}>
              <div className="event-card-topline">
                <span
                  className={
                    "badge " +
                    (event.status === "active"
                      ? "badge-valid"
                      : event.status === "archived"
                        ? "badge-neutral"
                        : "badge-draft")
                  }
                >
                  {statusLabels[event.status]}
                </span>
                <span className="template-kind">
                  {event.template_image_url ? "Template custom" : "Template ITTS"}
                </span>
              </div>

              <div className="event-card-copy">
                <p className="event-date">{formatDateId(event.event_date)}</p>
                <h3>{event.title}</h3>
                <p>{event.organizer}</p>
              </div>

              <div className="event-metrics">
                <div>
                  <span>Sertifikat</span>
                  <strong>{event.certificate_count}</strong>
                </div>
                <div>
                  <span>Valid</span>
                  <strong>{event.valid_count}</strong>
                </div>
                <div>
                  <span>Dicabut</span>
                  <strong>{event.revoked_count}</strong>
                </div>
              </div>

              <div className="event-card-footer">
                <div>
                  <span className="meta-label">Prefix nomor</span>
                  <code>{event.certificate_prefix}</code>
                </div>
                <Link className="btn btn-secondary btn-small" href={"/admin/events/" + event.id}>
                  Kelola →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⌕</div>
          <h3>Tidak ada kegiatan yang sesuai</h3>
          <p>Ubah kata pencarian atau filter status untuk menampilkan kegiatan lainnya.</p>
        </div>
      )}
    </section>
  );
}
