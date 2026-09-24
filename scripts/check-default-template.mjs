import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import ts from "typescript";
import { chromium } from "@playwright/test";

const output = "artifacts/default-template";
await mkdir(output, { recursive: true });

const source = await readFile("src/lib/types.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const moduleUrl =
  "data:text/javascript;base64," + Buffer.from(compiled, "utf8").toString("base64");
const {
  DEFAULT_TEMPLATE_CONFIG,
  resolveTemplateFontSize,
  renderText
} = await import(moduleUrl);

const svg = await readFile("public/default-certificate-v2.svg", "utf8");
const background =
  "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");

const samples = [
  {
    name: "standard",
    values: {
      participant_name: "Taufik Iqbal Ramdhani",
      certificate_number: "ITTS/TRAINING/2026/0001",
      event_title: "Pelatihan Data Analytics dan Artificial Intelligence 2026",
      event_date: "25 September 2026",
      organizer: "Institut Teknologi Tangerang Selatan",
      signatory: "Dr. Nama Penandatangan"
    }
  },
  {
    name: "long-title",
    values: {
      participant_name: "Nama Peserta Dengan Gelar Profesional",
      certificate_number: "ITTS/WORKSHOP/DIGITAL-TRANSFORMATION/2026/0001",
      event_title:
        "International Workshop on Artificial Intelligence, Data Analytics, Cybersecurity, Digital Transformation, and Emerging Technology for Industry 2026",
      event_date: "25 September 2026",
      organizer:
        "Institut Teknologi Tangerang Selatan bersama Mitra Industri dan Institusi Pendidikan",
      signatory: "Ketua Pelaksana Kegiatan dan Penanggung Jawab Program"
    }
  }
];

const results = [];
const browser = await chromium.launch({ headless: true });

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

try {
  for (const sample of samples) {
    const fieldMarkup = DEFAULT_TEMPLATE_CONFIG.fields
      .filter(field => !field.hidden)
      .map(field => {
        const rendered = renderText(field.template, sample.values);
        const size = resolveTemplateFontSize(field, rendered);
        return `
          <div
            class="field"
            data-field="${field.id}"
            data-font-size="${size}"
            style="
              left:${field.x}%;
              top:${field.y}%;
              width:${field.width}%;
              font-size:${size}px;
              font-weight:${field.fontWeight};
              color:${field.color};
              text-align:${field.align};
              font-style:${field.italic ? "italic" : "normal"};
              line-height:${field.lineHeight ?? 1.12};
              letter-spacing:${field.letterSpacing ?? 0}px;
            "
          >${escapeHtml(rendered)}</div>
        `;
      })
      .join("");

    const qr = DEFAULT_TEMPLATE_CONFIG.qr;
    const page = await browser.newPage({ viewport: { width: 1180, height: 850 } });
    await page.setContent(`
      <!doctype html>
      <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            background: #eef3f4;
            font-family: Arial, sans-serif;
          }
          .canvas {
            position: relative;
            width: 1123px;
            height: 794px;
            overflow: hidden;
            background: white;
            box-shadow: 0 18px 45px rgba(15,23,42,.14);
          }
          .canvas > img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          }
          .field {
            position: absolute;
            transform: translate(-50%, -50%);
            padding: 3px 5px;
            overflow-wrap: break-word;
            white-space: normal;
          }
          .qr {
            position: absolute;
            transform: translate(-50%, -50%);
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
            aspect-ratio: 1;
            padding: 6px;
            background: white;
            border: 1px solid #d6e0e3;
          }
          .qr i { background: #111827; }
          .qr i:nth-child(3n),
          .qr i:nth-child(5n) { background: white; }
        </style>
      </head>
      <body>
        <div class="canvas">
          <img src="${background}" />
          ${fieldMarkup}
          <div
            class="qr"
            data-field="qr"
            style="left:${qr.x}%;top:${qr.y}%;width:${qr.size}%"
          >
            ${Array.from({ length: 49 }, (_, i) => `<i data-cell="${i}"></i>`).join("")}
          </div>
        </div>
      </body>
      </html>
    `);

    await page.locator(".canvas img").waitFor({ state: "visible" });

    const boxes = {};
    for (const id of [
      "certificate-number",
      "participant-name",
      "event-title",
      "event-date",
      "organizer",
      "signatory",
      "qr"
    ]) {
      const locator = page.locator(`[data-field="${id}"]`);
      const box = await locator.boundingBox();
      assert.ok(box, `Missing bounding box for ${id}`);
      boxes[id] = box;

      assert.ok(box.x >= 20, `${sample.name}: ${id} exceeds left safe edge`);
      assert.ok(box.x + box.width <= 1151, `${sample.name}: ${id} exceeds right safe edge`);
      assert.ok(box.y >= 28, `${sample.name}: ${id} exceeds top safe edge`);
      assert.ok(box.y + box.height <= 822, `${sample.name}: ${id} exceeds bottom safe edge`);
    }

    const bottom = id => boxes[id].y + boxes[id].height;
    assert.ok(
      bottom("certificate-number") < boxes["participant-name"].y,
      `${sample.name}: certificate number overlaps participant name`
    );
    assert.ok(
      bottom("participant-name") < boxes["event-title"].y,
      `${sample.name}: participant name overlaps event title`
    );
    assert.ok(
      bottom("event-title") < boxes["event-date"].y,
      `${sample.name}: event title overlaps event date`
    );
    assert.ok(
      bottom("event-date") < boxes.organizer.y,
      `${sample.name}: event date overlaps organizer`
    );

    const qrBox = boxes.qr;
    const signBox = boxes.signatory;
    const horizontalOverlap =
      Math.max(qrBox.x, signBox.x) <
      Math.min(qrBox.x + qrBox.width, signBox.x + signBox.width);
    assert.equal(
      horizontalOverlap,
      false,
      `${sample.name}: QR overlaps signatory horizontally`
    );

    const eventTitleFont = Number(
      await page.locator('[data-field="event-title"]').getAttribute("data-font-size")
    );

    if (sample.name === "long-title") {
      assert.ok(
        eventTitleFont < 24 && eventTitleFont >= 16,
        "Long title should auto-fit between 16px and 24px"
      );
    }

    await page.screenshot({
      path: `${output}/default-${sample.name}.png`,
      fullPage: true
    });

    results.push({
      sample: sample.name,
      eventTitleFont,
      boxes
    });
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log("PASS: default certificate safe-zone and auto-fit checks");
