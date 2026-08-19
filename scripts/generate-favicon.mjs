import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const sourcePath = join(projectRoot, "src/app/icon.png");
const outputPath = join(projectRoot, "src/app/favicon.ico");
const sizes = [16, 32, 48, 64, 256];

const images = await Promise.all(
  sizes.map((size) =>
    sharp(sourcePath)
      .resize(size, size, { fit: "contain", kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9 })
      .toBuffer()
  )
);

const directorySize = 6 + images.length * 16;
const header = Buffer.alloc(directorySize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

let imageOffset = directorySize;
images.forEach((image, index) => {
  const entryOffset = 6 + index * 16;
  const size = sizes[index];
  header.writeUInt8(size === 256 ? 0 : size, entryOffset);
  header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
  header.writeUInt8(0, entryOffset + 2);
  header.writeUInt8(0, entryOffset + 3);
  header.writeUInt16LE(1, entryOffset + 4);
  header.writeUInt16LE(32, entryOffset + 6);
  header.writeUInt32LE(image.length, entryOffset + 8);
  header.writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += image.length;
});

await writeFile(outputPath, Buffer.concat([header, ...images]));
console.log(`Generated ${outputPath} from ${sourcePath} (${sizes.join(", ")}px)`);
