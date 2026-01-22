type XlsxSheet = {
  name: string;
  rows: Array<Array<string | number | null | undefined>>;
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < table.length; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toColumnName(index: number): string {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function buildSheetXml(rows: Array<Array<string | number | null | undefined>>): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => {
          const raw = cell == null ? "" : String(cell);
          const escaped = escapeXml(raw);
          const preserve = /^\s|\s$|\n/.test(raw);
          const ref = `${toColumnName(colIndex)}${rowIndex + 1}`;
          const spaceAttr = preserve ? ' xml:space="preserve"' : "";
          return `<c r="${ref}" t="inlineStr"><is><t${spaceAttr}>${escaped}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    "<sheetData>",
    rowXml,
    "</sheetData>",
    "</worksheet>",
  ].join("");
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*\\[\\]]/g, " ").trim();
  return cleaned.length ? cleaned.slice(0, 31) : "Sheet1";
}

function buildWorkbookXml(sheetName: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    "<sheets>",
    `<sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>`,
    "</sheets>",
    "</workbook>",
  ].join("");
}

function buildZip(entries: ZipEntry[]): Buffer {
  const fileParts: Buffer[] = [];
  const directoryParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const dataBuffer = entry.data;
    const checksum = crc32(dataBuffer);

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    fileParts.push(localHeader, dataBuffer);

    const directoryHeader = Buffer.alloc(46 + nameBuffer.length);
    directoryHeader.writeUInt32LE(0x02014b50, 0);
    directoryHeader.writeUInt16LE(20, 4);
    directoryHeader.writeUInt16LE(20, 6);
    directoryHeader.writeUInt16LE(0, 8);
    directoryHeader.writeUInt16LE(0, 10);
    directoryHeader.writeUInt16LE(0, 12);
    directoryHeader.writeUInt16LE(0, 14);
    directoryHeader.writeUInt32LE(checksum, 16);
    directoryHeader.writeUInt32LE(dataBuffer.length, 20);
    directoryHeader.writeUInt32LE(dataBuffer.length, 24);
    directoryHeader.writeUInt16LE(nameBuffer.length, 28);
    directoryHeader.writeUInt16LE(0, 30);
    directoryHeader.writeUInt16LE(0, 32);
    directoryHeader.writeUInt16LE(0, 34);
    directoryHeader.writeUInt16LE(0, 36);
    directoryHeader.writeUInt32LE(0, 38);
    directoryHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(directoryHeader, 46);

    directoryParts.push(directoryHeader);
    offset += localHeader.length + dataBuffer.length;
  }

  const directoryStart = offset;
  const directorySize = directoryParts.reduce((sum, part) => sum + part.length, 0);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(directorySize, 12);
  endRecord.writeUInt32LE(directoryStart, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, ...directoryParts, endRecord]);
}

export function buildXlsx(sheet: XlsxSheet): Buffer {
  const sheetName = sanitizeSheetName(sheet.name);
  const sheetXml = buildSheetXml(sheet.rows);
  const workbookXml = buildWorkbookXml(sheetName);

  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
          '<Default Extension="xml" ContentType="application/xml"/>',
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
          "</Types>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
          "</Relationships>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(workbookXml, "utf8"),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
          "</Relationships>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.from(sheetXml, "utf8"),
    },
  ];

  return buildZip(entries);
}
