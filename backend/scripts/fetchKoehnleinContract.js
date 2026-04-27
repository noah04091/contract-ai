/**
 * Read-only diagnose script for the Köhnlein customer support case.
 *
 * Purpose: locate Köhnlein's "Supplier agreement" contract in MongoDB,
 * print its metadata, and (with --download) fetch the file from S3 to a
 * local fixtures folder so we can test PR 1 (English-language pipeline)
 * against the real customer document.
 *
 * GUARANTEES:
 * - Read-only DB access: no inserts, updates, deletes
 * - No emails sent, no notifications triggered
 * - Customer is NOT informed (no audit log entries created by this script)
 * - Downloaded file lands in backend/scripts/_test-fixtures/ which is
 *   gitignored — never committed
 *
 * USAGE:
 *   node scripts/fetchKoehnleinContract.js                      # list only (safe default)
 *   node scripts/fetchKoehnleinContract.js --download           # also download from S3
 *   node scripts/fetchKoehnleinContract.js --download --analyze # download + Stage 0 dry-run
 *
 * Optional env override:
 *   KOEHNLEIN_QUERY="some search term"  # custom user-search regex (default matches Köhnlein/koehnlein)
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const database = require("../config/database");

const FIXTURES_DIR = path.join(__dirname, "_test-fixtures");

const DOWNLOAD = process.argv.includes("--download");
const ANALYZE = process.argv.includes("--analyze");

const userSearchTerm = process.env.KOEHNLEIN_QUERY || "köhnlein|koehnlein|köhn";

async function downloadFromS3(s3Key, targetPath) {
  const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: s3Key });
  const response = await s3.send(cmd);
  const stream = response.Body;
  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(targetPath);
    stream.pipe(fileStream);
    stream.on("error", reject);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

async function main() {
  console.log("=== Köhnlein contract diagnose (read-only) ===");
  console.log(`Query: /${userSearchTerm}/i`);
  console.log(`Mode: list${DOWNLOAD ? " + download" : ""}${ANALYZE ? " + Stage 0 analyze" : ""}\n`);

  const db = await database.connect();

  const userRegex = new RegExp(userSearchTerm, "i");
  const users = await db.collection("users").find(
    { $or: [{ email: userRegex }, { name: userRegex }, { firstName: userRegex }, { lastName: userRegex }] },
    { projection: { email: 1, name: 1, firstName: 1, lastName: 1, _id: 1 } }
  ).toArray();

  if (users.length === 0) {
    console.log("No matching user found. Try setting KOEHNLEIN_QUERY env var to a different term.");
    process.exit(0);
  }

  console.log(`Found ${users.length} matching user(s):`);
  for (const u of users) {
    const display = u.email || `${u.firstName || ""} ${u.lastName || ""} ${u.name || ""}`.trim();
    console.log(`  ${u._id.toString()}  ${display}`);
  }
  console.log();

  // Ensure fixtures dir exists (gitignored)
  if (DOWNLOAD && !fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  for (const u of users) {
    const userIdStr = u._id.toString();
    const contracts = await db.collection("contracts").find(
      { $or: [{ userId: userIdStr }, { userId: u._id }] },
      {
        projection: {
          name: 1, _id: 1, createdAt: 1,
          analyzed: 1, contractScore: 1,
          s3Key: 1, filePath: 1, uploadType: 1, mimeType: 1,
          documentCategory: 1,
          "legalPulse.lastChecked": 1, "legalPulse.status": 1, "legalPulse.aiGenerated": 1,
        },
      }
    ).toArray();

    console.log(`User ${u.email || userIdStr}: ${contracts.length} contract(s)`);

    for (const c of contracts) {
      console.log("───");
      console.log(`  _id:               ${c._id.toString()}`);
      console.log(`  name:              ${c.name}`);
      console.log(`  createdAt:         ${c.createdAt}`);
      console.log(`  analyzed:          ${c.analyzed}`);
      console.log(`  contractScore:     ${c.contractScore || "—"}`);
      console.log(`  documentCategory:  ${c.documentCategory || "—"}`);
      console.log(`  uploadType:        ${c.uploadType || "—"}`);
      console.log(`  s3Key:             ${c.s3Key || "—"}`);
      console.log(`  mimeType:          ${c.mimeType || "—"}`);
      console.log(`  legalPulse.status: ${c.legalPulse?.status || "—"}`);

      // Also show latest LegalPulseV2Result for this contract
      const v2 = await db.collection("legal_pulse_v2_results").findOne(
        { contractId: c._id.toString(), userId: userIdStr },
        {
          projection: { status: 1, rejectionReason: 1, "document.language": 1, "document.contractType": 1, createdAt: 1 },
          sort: { createdAt: -1 },
        }
      );
      if (v2) {
        console.log(`  V2 latest:         status=${v2.status}, lang=${v2.document?.language || "—"}, type=${v2.document?.contractType || "—"}, reason=${v2.rejectionReason || "—"}`);
      } else {
        console.log(`  V2 latest:         (no result)`);
      }

      // Download if requested
      if (DOWNLOAD && c.s3Key) {
        const safeName = c.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const localPath = path.join(FIXTURES_DIR, `${c._id.toString()}_${safeName}`);
        try {
          if (fs.existsSync(localPath)) {
            console.log(`  → download skipped (already exists): ${localPath}`);
          } else {
            await downloadFromS3(c.s3Key, localPath);
            const stats = fs.statSync(localPath);
            console.log(`  → downloaded ${stats.size} bytes → ${localPath}`);
          }

          if (ANALYZE) {
            const buf = fs.readFileSync(localPath);
            const { extractTextFromBuffer } = require("../services/textExtractor");
            const { runDocumentIntelligence } = require("../services/legalPulseV2/stages/00-documentIntelligence");
            const mime = c.mimeType || (c.name.toLowerCase().endsWith(".docx")
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "application/pdf");
            const { text } = await extractTextFromBuffer(buf, mime);
            const result = runDocumentIntelligence(text);
            console.log(`  → Stage 0 dry-run:`);
            console.log(`      language:         ${result.document.language}`);
            console.log(`      contractType:     ${result.document.contractType}`);
            console.log(`      typeConfidence:   ${result.document.contractTypeConfidence}`);
            console.log(`      qualityScore:     ${result.document.qualityScore}`);
            console.log(`      structureDetected:${result.document.structureDetected}`);
            console.log(`      cleanedTextLen:   ${result.document.cleanedTextLength}`);
            console.log(`      pageCount:        ${result.document.pageCount}`);
          }
        } catch (err) {
          console.error(`  ✗ download/analyze failed: ${err.message}`);
        }
      } else if (DOWNLOAD && !c.s3Key) {
        console.log(`  ✗ no s3Key — cannot download`);
      }
    }
    console.log();
  }

  console.log("=== done — no DB writes performed ===");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
