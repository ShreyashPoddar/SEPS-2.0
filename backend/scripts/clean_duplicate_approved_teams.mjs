// backend/scripts/clean_duplicate_approved_teams.mjs
import prisma from "../lib/db.js";

async function cleanDuplicates() {
  console.log("Checking for duplicate or phantom TeamApproved rows...");

  const allApproved = await prisma.teamApproved.findMany({
    include: { members: true, project: true },
    orderBy: { createdAt: "asc" },
  });

  const byProject = {};
  for (const t of allApproved) {
    if (!byProject[t.projectId]) byProject[t.projectId] = [];
    byProject[t.projectId].push(t);
  }

  const toDeleteIds = [];

  for (const [pid, teams] of Object.entries(byProject)) {
    if (teams.length === 1) {
      if (teams[0].members.length === 0) {
        console.log(`Marking solitary empty team ${teams[0].id} for project ${pid} for deletion`);
        toDeleteIds.push(teams[0].id);
      }
      continue;
    }

    const seenRoster = new Set();
    for (const tm of teams) {
      if (tm.members.length === 0) {
        console.log(`Marking phantom 0-member team ${tm.id} for project "${tm.project?.projectTitle}" for deletion`);
        toDeleteIds.push(tm.id);
        continue;
      }

      const rosterKey = tm.members
        .map((m) => (m.regNo || "").trim().toUpperCase())
        .sort()
        .join("_");

      if (seenRoster.has(rosterKey)) {
        console.log(
          `Marking duplicate clone team ${tm.id} (created at ${tm.createdAt.toISOString()}) for project "${tm.project?.projectTitle}" for deletion`
        );
        toDeleteIds.push(tm.id);
      } else {
        seenRoster.add(rosterKey);
      }
    }
  }

  console.log(`\nFound ${toDeleteIds.length} duplicate/phantom TeamApproved rows to delete.`);

  if (toDeleteIds.length > 0) {
    // Delete in bulk
    const deleteResult = await prisma.teamApproved.deleteMany({
      where: { id: { in: toDeleteIds } },
    });
    console.log(`Successfully deleted ${deleteResult.count} duplicate/phantom TeamApproved records.`);
  }

  const remainingCount = await prisma.teamApproved.count();
  console.log(`Remaining clean TeamApproved records in DB: ${remainingCount}`);

  process.exit(0);
}

cleanDuplicates().catch((err) => {
  console.error("Error during duplicate cleanup:", err);
  process.exit(1);
});
