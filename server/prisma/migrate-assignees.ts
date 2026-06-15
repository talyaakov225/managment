import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting multi-assignee migration...');

  const tasks = await prisma.$queryRawUnsafe<Array<{ id: string; assigneeId: string | null; projectId: string }>>(
    `SELECT id, assigneeId, projectId FROM Task WHERE assigneeId IS NOT NULL`
  ).catch(() => []);

  if (tasks.length > 0) {
    console.log(`Found ${tasks.length} tasks with old assigneeId to migrate...`);

    for (const task of tasks) {
      try {
        await prisma.taskAssignee.upsert({
          where: { taskId_userId: { taskId: task.id, userId: task.assigneeId! } },
          update: {},
          create: { taskId: task.id, userId: task.assigneeId! },
        });
        console.log(`  Migrated task ${task.id} -> assignee ${task.assigneeId}`);
      } catch (err) {
        console.warn(`  Skipped task ${task.id}: ${(err as Error).message}`);
      }
    }
  } else {
    console.log('No old assigneeId data found to migrate.');
  }

  const tasksWithoutCreator = await prisma.$queryRawUnsafe<Array<{ id: string; projectId: string }>>(
    `SELECT t.id, t.projectId FROM Task t WHERE t.creatorId IS NULL OR t.creatorId = ''`
  ).catch(() => []);

  if (tasksWithoutCreator.length > 0) {
    console.log(`Found ${tasksWithoutCreator.length} tasks without creatorId, assigning project owner...`);

    for (const task of tasksWithoutCreator) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: task.projectId },
          select: { ownerId: true },
        });
        if (project) {
          await prisma.$executeRawUnsafe(
            `UPDATE Task SET creatorId = ? WHERE id = ?`,
            project.ownerId,
            task.id
          );
          console.log(`  Set creatorId for task ${task.id} -> ${project.ownerId}`);
        }
      } catch (err) {
        console.warn(`  Skipped task ${task.id}: ${(err as Error).message}`);
      }
    }
  } else {
    console.log('All tasks have creatorId set.');
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
