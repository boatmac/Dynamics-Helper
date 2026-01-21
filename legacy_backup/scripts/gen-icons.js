"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

// CRC32 table
const CRC_TABLE = (() => {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcInput);
  return Buffer.concat([u32be(data.length), typeBuf, data, u32be(crc)]);
}

function makeSolidColorPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // \x89PNG\r\n\x1A\n

  // IHDR: width(4) height(4) bit depth(1) color type(1) compression(1) filter(1) interlace(1)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth: 8
  ihdr.writeUInt8(6, 9);  // color type: 6 = RGBA
  ihdr.writeUInt8(0, 10); // compression: 0 (deflate)
  ihdr.writeUInt8(0, 11); // filter: 0 (adaptive)
  ihdr.writeUInt8(0, 12); // interlace: 0 (no interlace)

  // Raw image data with filter byte per row (0 means "None")
  const raw = Buffer.alloc(height * (1 + width * 4));
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0; // filter type byte
    for (let x = 0; x < width; x++) {
      raw[off++] = rgba.r;
      raw[off++] = rgba.g;
      raw[off++] = rgba.b;
      raw[off++] = rgba.a;
    }
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return png;
}

function main() {
  const outDir = path.join(process.cwd(), "icons");
  ensureDir(outDir);

  const sizes = [16, 32, 48, 128];
  // Blue #2563EB with full alpha
  const color = { r: 0x25, g: 0x63, b: 0xEB, a: 0xFF };

  sizes.forEach((s) => {
    const png = makeSolidColorPng(s, s, color);
    const outPath = path.join(outDir, `${s}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`Wrote ${outPath}`);
  });

  console.log("Done generating placeholder PNG icons.");
}

if (require.main === module) {
  main();
}
