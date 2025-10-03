import { inflateRawSync } from "node:zlib";

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function columnLetterToIndex(ref: string): number {
  let result = 0;
  for (let i = 0; i < ref.length; i++) {
    const code = ref.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      result = result * 26 + (code - 64);
    } else if (code >= 97 && code <= 122) {
      result = result * 26 + (code - 96);
    }
  }
  return result - 1;
}

type ZipEntryMap = Map<string, Buffer>;

function parseZip(buffer: Buffer): ZipEntryMap {
  const entries: ZipEntryMap = new Map();
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  const minOffset = Math.max(0, buffer.length - 0x10000 - 22);
  for (let i = buffer.length - 22; i >= minOffset; i--) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Invalid XLSX file (EOCD not found)");
  }
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = centralDirectoryOffset;
  for (let i = 0; i < totalEntries; i++) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      throw new Error("Invalid central directory signature");
    }
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer
      .slice(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");
    offset += 46 + fileNameLength + extraLength + commentLength;

    const localSignature = buffer.readUInt32LE(localHeaderOffset);
    if (localSignature !== 0x04034b50) {
      throw new Error("Invalid local header signature");
    }
    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
    let data: Buffer;
    if (compression === 0) {
      data = Buffer.from(compressedData);
    } else if (compression === 8) {
      data = inflateRawSync(compressedData);
    } else {
      throw new Error(`Unsupported compression method ${compression} in ${fileName}`);
    }
    if (uncompressedSize !== 0 && data.length !== uncompressedSize) {
      // Some writers omit sizes in the local header; trust central directory values
      data = data.subarray(0, uncompressedSize);
    }
    entries.set(fileName, data);
  }
  return entries;
}

function extractTextFromXml(xml: string): string {
  const matches = Array.from(xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g));
  if (!matches.length) return "";
  return matches.map((m) => decodeXml(m[1])).join("");
}

function parseSharedStrings(content: string): string[] {
  const strings: string[] = [];
  const regex = /<si[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    strings.push(extractTextFromXml(match[1]));
  }
  return strings;
}

function parseWorkbook(entries: ZipEntryMap): { sheetPath: string } {
  const workbook = entries.get("xl/workbook.xml");
  if (!workbook) {
    throw new Error("workbook.xml not found in XLSX file");
  }
  const workbookXml = workbook.toString("utf8");
  const sheetMatch = /<sheet[^>]*r:id="([^"]+)"[^>]*>/i.exec(workbookXml);
  let target = "worksheets/sheet1.xml";
  if (sheetMatch) {
    const relId = sheetMatch[1];
    const rels = entries.get("xl/_rels/workbook.xml.rels");
    if (rels) {
      const relsXml = rels.toString("utf8");
      const relRegex = new RegExp(`<Relationship[^>]*Id="${relId}"[^>]*Target="([^"]+)"`, "i");
      const relMatch = relRegex.exec(relsXml);
      if (relMatch) {
        target = relMatch[1];
      }
    }
  }
  if (!target.startsWith("/")) {
    target = `xl/${target}`;
  } else {
    target = target.replace(/^\//, "xl/");
  }
  return { sheetPath: target };
}

function parseSheet(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<c([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    const rowCells: Record<number, string> = {};
    let maxIndex = -1;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellBody = cellMatch[2];
      const refMatch = /r="([A-Za-z]+)\d+"/.exec(attrs);
      let columnIndex = 0;
      if (refMatch) {
        columnIndex = columnLetterToIndex(refMatch[1]);
      } else {
        columnIndex = maxIndex + 1;
      }
      if (columnIndex > maxIndex) maxIndex = columnIndex;
      const typeMatch = /t="([^"]+)"/.exec(attrs);
      const type = typeMatch ? typeMatch[1] : "n";
      let value = "";
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(cellBody);
      if (type === "s") {
        const idx = vMatch ? parseInt(vMatch[1], 10) : NaN;
        if (Number.isFinite(idx) && idx >= 0 && idx < sharedStrings.length) {
          value = sharedStrings[idx];
        } else {
          value = "";
        }
      } else if (type === "inlineStr") {
        value = extractTextFromXml(cellBody);
      } else if (type === "b") {
        value = vMatch ? (vMatch[1].trim() === "1" ? "TRUE" : "FALSE") : "";
      } else {
        value = vMatch ? decodeXml(vMatch[1]) : "";
      }
      rowCells[columnIndex] = value;
    }
    if (maxIndex >= 0) {
      const normalized: string[] = [];
      for (let i = 0; i <= maxIndex; i++) {
        normalized.push(rowCells[i] ?? "");
      }
      rows.push(normalized);
    }
  }
  return rows;
}

function parseXlsx(buffer: Buffer): string[][] {
  const entries = parseZip(buffer);
  const { sheetPath } = parseWorkbook(entries);
  const sheetEntry = entries.get(sheetPath);
  if (!sheetEntry) {
    throw new Error(`Worksheet ${sheetPath} not found in XLSX file`);
  }
  const sharedStringsEntry = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsEntry ? parseSharedStrings(sharedStringsEntry.toString("utf8")) : [];
  return parseSheet(sheetEntry.toString("utf8"), sharedStrings);
}

function parseCsv(buffer: Buffer): string[][] {
  const text = buffer.toString("utf8").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const headerLine = lines.find((line) => line.trim().length > 0) ?? "";
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    current.push(field);
    field = "";
  };
  const pushRow = () => {
    if (current.length > 0 || field !== "") {
      pushField();
      rows.push(current.map((value) => value.trim()));
      current = [];
    }
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      pushField();
      continue;
    }
    if (!inQuotes && char === "\n") {
      pushRow();
      continue;
    }
    field += char;
  }
  if (field.length > 0 || current.length > 0) {
    pushRow();
  }
  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

function normaliseHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const headerMap: Record<string, string> = {
  projectid: "projectId",
  projectname: "projectName",
  moduleid: "moduleId",
  modulename: "moduleName",
  sectionid: "sectionId",
  sectionname: "sectionName",
  stepid: "stepId",
  steptitle: "stepTitle",
  stepdescription: "stepDescription",
};

export type ExcelRow = Record<string, string>;

export function parseExcel(buffer: Buffer): ExcelRow[] {
  const rows = buffer.subarray(0, 4).toString("binary") === "PK\u0003\u0004" ? parseXlsx(buffer) : parseCsv(buffer);
  if (!rows.length) {
    return [];
  }
  const headers = rows[0];
  const keys = headers.map((header, index) => {
    const normalised = normaliseHeaderKey(header);
    return headerMap[normalised] ?? header.trim() || `column${index + 1}`;
  });
  const dataRows = rows.slice(1);
  return dataRows
    .map((cells) => {
      const entry: ExcelRow = {};
      keys.forEach((key, index) => {
        entry[key] = (cells[index] ?? "").trim();
      });
      return entry;
    })
    .filter((row) => Object.values(row).some((value) => value.length > 0));
}

export function detectExcelFormat(buffer: Buffer): "xlsx" | "csv" {
  return buffer.subarray(0, 4).toString("binary") === "PK\u0003\u0004" ? "xlsx" : "csv";
}
