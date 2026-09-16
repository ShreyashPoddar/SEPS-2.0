import dotenv from "dotenv";
dotenv.config();
import prisma from "./lib/db.js";

// Helper to map a single token or segment into canonical specializations.
function mapTokenToSpecializations(raw) {
  const t = raw.trim().toLowerCase();
  if (!t) return [];
  if (/^(all|any|open|open to all|all branches|all departments|all specializations|all specialization|\*)$/i.test(t)) {
    return ["All Specializations"];
  }
  const res = [];
  if (t.includes("data science") || t.includes("053")) res.push("Dept of ECE (Data Science)");
  if (t.includes("cyber physical") || /\bcps\b/i.test(t) || t.includes("052")) res.push("Dept of ECE (Cyber Physical Systems)");
  if (t.includes("vlsi") || t.includes("067")) res.push("Dept of ECE (VLSI Design)");
  if (
    t.includes("electronics and computer") ||
    t.includes("elec. comp") ||
    t.includes("comp.engg") ||
    t.includes("043")
  ) {
    res.push("Dept of Electronics and Computer Engineering");
  }
  if (t.includes("integrated") || t.includes("meso") || t.includes("705")) res.push("Dept of ECE (M.Tech Integrated)");
  if (/\bcse\b/i.test(t) || t.includes("computer science")) res.push("Dept of CSE");
  if (/\b(it|information technology)\b/i.test(t)) res.push("Dept of IT");
  if (/\b(mech|mechanical)\b/i.test(t)) res.push("Dept of Mechanical");
  if (/\b(biomedical|biomed|bme)\b/i.test(t)) res.push("Dept of Biomedical");

  if (
    t.includes("core") ||
    t.includes("electronics & communication") ||
    t.includes("electronics and communication") ||
    (/\bece\b/i.test(t) && res.length === 0)
  ) {
    res.push("Dept of ECE (Core - Electronics & Communication)");
  }
  return res;
}

// Canonical string literals from the dropdown
export function mapRawStreamToCanonical(rawStream) {
  if (!rawStream || typeof rawStream !== "string" || !rawStream.trim()) {
    return "All Specializations";
  }

  const s = rawStream.trim();
  if (
    /^(all|any|open|open to all|all branches|all departments|all specializations|all specialization|\*)$/i.test(s)
  ) {
    return "All Specializations";
  }

  const segments = s.split(/[,/;&|\n]+/g);
  const matched = new Set();

  for (const seg of segments) {
    for (const m of mapTokenToSpecializations(seg)) {
      matched.add(m);
    }
  }

  // Fallback: analyze whole string if no segment produced matches
  if (matched.size === 0) {
    for (const m of mapTokenToSpecializations(s)) {
      matched.add(m);
    }
  }

  // If no specific branch matched, default to "All Specializations"
  if (matched.size === 0) {
    return "All Specializations";
  }

  return Array.from(matched).join(", ");
}

async function migrateProjects() {
  console.log("🔍 Connecting to database and fetching projects...");
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} project(s) in database.`);

  let updatedCount = 0;
  for (const project of projects) {
    const oldStream = project.stream;
    const newStream = mapRawStreamToCanonical(oldStream);

    console.log(`\n📌 Project: "${project.projectTitle}" (ID: ${project.id})`);
    console.log(`   Old Stream: "${oldStream}"`);
    console.log(`   New Stream: "${newStream}"`);

    if (oldStream !== newStream) {
      await prisma.project.update({
        where: { id: project.id },
        data: { stream: newStream },
      });
      console.log(`   ✅ Updated in database!`);
      updatedCount++;
    } else {
      console.log(`   ⚡ Already matching canonical format.`);
    }
  }

  console.log(`\n🎉 Migration complete! Updated ${updatedCount} / ${projects.length} projects.`);
}

migrateProjects()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration error:", err.message || err);
    process.exit(1);
  });
