/**
 * Migrate RX media (DB-referenced + local leftovers) to S3 under `rx/`,
 * then rewrite DB paths to public CDN URLs.
 *
 * Usage: node --env-file=.env scripts/migrate-media-to-s3.mjs
 */
const fs = require("fs");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const NEXT_ROOT = process.cwd();
const LARAVEL_ROOT = path.resolve(
  NEXT_ROOT,
  "../rx/rx_system_laravel"
);

const client = new S3Client({
  region: process.env.S3_REGION || "eu-central",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

const Bucket = process.env.S3_BUCKET_NAME;
const CdnBase = (process.env.S3_CDN_URL || "").replace(/\/$/, "");

if (!Bucket || !CdnBase || !process.env.S3_ACCESS_KEY) {
  console.error("S3 env vars missing");
  process.exit(1);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

/** DB path → S3 object key (without changing semantics). */
function toS3Key(storedPath) {
  const relative = String(storedPath)
    .trim()
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "")
    .replace(/^fayastaff\//, "")
    .replace(/^rx\//, "");
  if (!relative || relative.includes("..")) return null;
  return `rx/${relative}`;
}

function toCdnUrl(storedPath) {
  const key = toS3Key(storedPath);
  return key ? `${CdnBase}/${key}` : null;
}

function candidateDiskPaths(storedPath) {
  const raw = String(storedPath).trim().replace(/^\/+/, "");
  const withoutUploads = raw.replace(/^uploads\//, "");
  const out = new Set();

  // Next public uploads
  out.add(path.join(NEXT_ROOT, "public", "uploads", withoutUploads));
  out.add(path.join(NEXT_ROOT, "public", raw));

  // Laravel public + storage mappings
  // DB often stores `storage/logos/x` while disk is `storage/app/public/logos/x`
  out.add(path.join(LARAVEL_ROOT, "public", raw));
  out.add(path.join(LARAVEL_ROOT, "storage", "app", "public", raw.replace(/^storage\//, "")));
  out.add(path.join(LARAVEL_ROOT, "public", "storage", raw.replace(/^storage\//, "")));
  out.add(path.join(LARAVEL_ROOT, "storage", "app", "public", withoutUploads));

  return [...out];
}

function findLocalFile(storedPath) {
  for (const abs of candidateDiskPaths(storedPath)) {
    try {
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    } catch {
      // continue
    }
  }
  return null;
}

async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(absPath, key) {
  const Body = fs.readFileSync(absPath);
  await client.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body,
      ContentType: contentTypeFor(absPath),
    })
  );
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".gitkeep" || name === ".gitignore" || name === ".DS_Store") {
      continue;
    }
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walkFiles(abs, out);
    else out.push(abs);
  }
  return out;
}

async function ensureUploaded(storedPath) {
  const key = toS3Key(storedPath);
  if (!key) return { status: "invalid", storedPath };

  if (await objectExists(key)) {
    return { status: "exists", storedPath, key, cdn: toCdnUrl(storedPath) };
  }

  const abs = findLocalFile(storedPath);
  if (!abs) return { status: "missing", storedPath, key };

  await uploadFile(abs, key);
  return { status: "uploaded", storedPath, key, cdn: toCdnUrl(storedPath), from: abs };
}

async function collectDbRefs() {
  const refs = [];

  const recipes = await prisma.recipeSettings.findMany({
    select: { id: true, logoPath: true, designImagePath: true, doctorId: true },
  });
  for (const r of recipes) {
    if (r.logoPath) {
      refs.push({
        table: "recipeSettings",
        id: r.id,
        field: "logoPath",
        path: r.logoPath,
        doctorId: r.doctorId,
      });
    }
    if (r.designImagePath) {
      refs.push({
        table: "recipeSettings",
        id: r.id,
        field: "designImagePath",
        path: r.designImagePath,
        doctorId: r.doctorId,
      });
    }
  }

  const prescriptions = await prisma.prescription.findMany({
    where: {
      OR: [{ xrayImage: { not: null } }, { analysisImage: { not: null } }],
    },
    select: { id: true, xrayImage: true, analysisImage: true },
  });
  for (const p of prescriptions) {
    if (p.xrayImage) {
      refs.push({
        table: "prescription",
        id: p.id,
        field: "xrayImage",
        path: p.xrayImage,
      });
    }
    if (p.analysisImage) {
      refs.push({
        table: "prescription",
        id: p.id,
        field: "analysisImage",
        path: p.analysisImage,
      });
    }
  }

  const teeth = await prisma.dentalToothImage.findMany({
    select: { id: true, imageUrl: true },
  });
  for (const t of teeth) {
    if (t.imageUrl) {
      refs.push({
        table: "dentalToothImage",
        id: t.id,
        field: "imageUrl",
        path: t.imageUrl,
      });
    }
  }

  const users = await prisma.user.findMany({
    where: { profileImage: { not: null } },
    select: { id: true, profileImage: true },
  });
  for (const u of users) {
    if (u.profileImage) {
      refs.push({
        table: "user",
        id: u.id,
        field: "profileImage",
        path: u.profileImage,
      });
    }
  }

  return refs;
}

async function updateRef(ref, cdnUrl) {
  if (ref.table === "recipeSettings") {
    await prisma.recipeSettings.update({
      where: { id: ref.id },
      data: { [ref.field]: cdnUrl },
    });
  } else if (ref.table === "prescription") {
    await prisma.prescription.update({
      where: { id: ref.id },
      data: { [ref.field]: cdnUrl },
    });
  } else if (ref.table === "dentalToothImage") {
    await prisma.dentalToothImage.update({
      where: { id: ref.id },
      data: { imageUrl: cdnUrl },
    });
  } else if (ref.table === "user") {
    await prisma.user.update({
      where: { id: ref.id },
      data: { profileImage: cdnUrl },
    });
  }
}

/** If DB points to a missing /uploads/{doctor}/design/X but another design exists locally, relink. */
async function healDoctorDesigns(refs) {
  const healed = [];
  for (const ref of refs) {
    if (ref.table !== "recipeSettings" || ref.field !== "designImagePath") {
      continue;
    }
    if (findLocalFile(ref.path) || (await objectExists(toS3Key(ref.path)))) {
      continue;
    }
    const doctorId = String(ref.doctorId);
    const dir = path.join(NEXT_ROOT, "public", "uploads", doctorId, "design");
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
    if (files.length === 0) continue;

    const newPath = `/uploads/${doctorId}/design/${files[0]}`;
    const result = await ensureUploaded(newPath);
    if (result.status === "missing") continue;
    const cdn = result.cdn || toCdnUrl(newPath);
    await updateRef(ref, cdn);
    healed.push({ doctorId, from: ref.path, to: cdn });
  }
  return healed;
}

async function uploadLooseTrees() {
  const trees = [
    {
      root: path.join(NEXT_ROOT, "public", "uploads"),
      toKey: (rel) => `rx/${rel}`,
    },
    {
      root: path.join(LARAVEL_ROOT, "storage", "app", "public"),
      toKey: (rel) => `rx/storage/${rel}`,
    },
    {
      root: path.join(LARAVEL_ROOT, "public", "images"),
      toKey: (rel) => `rx/images/${rel}`,
    },
  ];

  const summary = { uploaded: 0, exists: 0, failed: 0 };
  for (const tree of trees) {
    const files = walkFiles(tree.root);
    for (const abs of files) {
      const rel = path.relative(tree.root, abs).split(path.sep).join("/");
      const key = tree.toKey(rel);
      try {
        if (await objectExists(key)) {
          summary.exists++;
          continue;
        }
        await uploadFile(abs, key);
        summary.uploaded++;
      } catch (e) {
        summary.failed++;
        console.error("loose upload failed", key, e.message);
      }
    }
  }
  return summary;
}

async function main() {
  console.log("CDN:", CdnBase);
  console.log("Laravel root exists:", fs.existsSync(LARAVEL_ROOT));

  const loose = await uploadLooseTrees();
  console.log("loose trees:", loose);

  const refs = await collectDbRefs();
  console.log("db refs:", refs.length);

  const stats = {
    uploaded: 0,
    exists: 0,
    missing: 0,
    linked: 0,
    failed: 0,
  };
  const missing = [];

  for (const ref of refs) {
    // Already a CDN URL for our bucket — keep
    if (
      ref.path.startsWith(CdnBase + "/") ||
      ref.path.includes("your-objectstorage.com/fayastaff/rx/")
    ) {
      stats.exists++;
      continue;
    }

    try {
      const result = await ensureUploaded(ref.path);
      if (result.status === "missing") {
        stats.missing++;
        missing.push(ref);
        continue;
      }
      if (result.status === "uploaded") stats.uploaded++;
      if (result.status === "exists") stats.exists++;

      const cdn = result.cdn || toCdnUrl(ref.path);
      if (cdn && ref.path !== cdn) {
        await updateRef(ref, cdn);
        stats.linked++;
      }
    } catch (e) {
      stats.failed++;
      console.error("ref failed", ref.path, e.message);
    }
  }

  const healed = await healDoctorDesigns(missing);
  console.log("healed designs:", healed);

  const stillMissing = [];
  for (const ref of missing) {
    // re-read? healed already updated DB; filter healed paths
    if (healed.some((h) => h.from === ref.path)) continue;
    stillMissing.push({
      table: ref.table,
      field: ref.field,
      path: ref.path,
    });
  }

  console.log(
    JSON.stringify(
      {
        stats,
        stillMissingCount: stillMissing.length,
        stillMissing,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
