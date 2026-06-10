import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Default Permissions ──
  const permissionData = [
    { key: 'projects.view', group: 'projects', displayName: 'View Projects' },
    { key: 'projects.create', group: 'projects', displayName: 'Create Projects' },
    { key: 'projects.edit', group: 'projects', displayName: 'Edit Projects' },
    { key: 'projects.delete', group: 'projects', displayName: 'Delete Projects' },
    { key: 'tasks.view', group: 'tasks', displayName: 'View Tasks' },
    { key: 'tasks.create', group: 'tasks', displayName: 'Create Tasks' },
    { key: 'tasks.edit', group: 'tasks', displayName: 'Edit Tasks' },
    { key: 'tasks.delete', group: 'tasks', displayName: 'Delete Tasks' },
    { key: 'tasks.assign', group: 'tasks', displayName: 'Assign Tasks' },
    { key: 'members.view', group: 'members', displayName: 'View Members' },
    { key: 'members.manage', group: 'members', displayName: 'Manage Members' },
    { key: 'comments.create', group: 'comments', displayName: 'Create Comments' },
    { key: 'comments.delete', group: 'comments', displayName: 'Delete Comments' },
    { key: 'admin.access', group: 'admin', displayName: 'Access Admin Panel' },
    { key: 'admin.users', group: 'admin', displayName: 'Manage Users' },
    { key: 'admin.roles', group: 'admin', displayName: 'Manage Roles' },
    { key: 'admin.settings', group: 'admin', displayName: 'Manage Settings' },
    { key: 'admin.board', group: 'admin', displayName: 'Manage Board Config' },
    { key: 'admin.pages', group: 'admin', displayName: 'Manage Pages' },
    { key: 'admin.navigation', group: 'admin', displayName: 'Manage Navigation' },
  ];

  for (const perm of permissionData) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: perm,
    });
  }
  console.log(`  Created ${permissionData.length} permissions`);

  // ── Default Roles ──
  const allPermissions = await prisma.permission.findMany();

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', displayName: 'מנהל מערכת', color: '#ef4444', isSystem: true },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: { name: 'editor', displayName: 'עורך', color: '#3b82f6', isSystem: true },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer', displayName: 'צופה', color: '#6b7280', isSystem: true },
  });

  // Admin role gets all permissions
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Editor role gets project/task/comment permissions
  const editorPerms = allPermissions.filter((p) => ['projects', 'tasks', 'comments', 'members'].includes(p.group));
  await prisma.rolePermission.deleteMany({ where: { roleId: editorRole.id } });
  await prisma.rolePermission.createMany({
    data: editorPerms.map((p) => ({ roleId: editorRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Viewer role gets view permissions
  const viewerPerms = allPermissions.filter((p) => p.key.includes('.view') || p.key === 'comments.create');
  await prisma.rolePermission.deleteMany({ where: { roleId: viewerRole.id } });
  await prisma.rolePermission.createMany({
    data: viewerPerms.map((p) => ({ roleId: viewerRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  console.log('  Created 3 default roles with permissions');

  // ── Default Board Statuses ──
  const statusData = [
    { key: 'TODO', label_he: 'לביצוע', label_en: 'To Do', color: 'text-slate-600 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-700', position: 0, isDefault: true },
    { key: 'IN_PROGRESS', label_he: 'בעבודה', label_en: 'In Progress', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30', position: 1, isDefault: true },
    { key: 'REVIEW', label_he: 'בבדיקה', label_en: 'Review', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', position: 2, isDefault: true },
    { key: 'DONE', label_he: 'הושלם', label_en: 'Done', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', position: 3, isDefault: true },
  ];

  for (const status of statusData) {
    await prisma.boardStatus.upsert({
      where: { key: status.key },
      update: status,
      create: status,
    });
  }
  console.log('  Created 4 default board statuses');

  // ── Default Board Priorities ──
  const priorityData = [
    { key: 'LOW', label_he: 'נמוכה', label_en: 'Low', color: 'text-slate-500', dotColor: 'bg-slate-400', position: 0 },
    { key: 'MEDIUM', label_he: 'בינונית', label_en: 'Medium', color: 'text-blue-500', dotColor: 'bg-blue-400', position: 1 },
    { key: 'HIGH', label_he: 'גבוהה', label_en: 'High', color: 'text-orange-500', dotColor: 'bg-orange-400', position: 2 },
    { key: 'URGENT', label_he: 'דחופה', label_en: 'Urgent', color: 'text-red-500', dotColor: 'bg-red-500', position: 3 },
  ];

  for (const priority of priorityData) {
    await prisma.boardPriority.upsert({
      where: { key: priority.key },
      update: priority,
      create: priority,
    });
  }
  console.log('  Created 4 default board priorities');

  // ── Default System Settings ──
  const settingsData = [
    { key: 'app.name', value: 'רמי לוי תקשורת', type: 'string', group: 'general', label_he: 'שם האפליקציה', label_en: 'Application Name' },
    { key: 'app.maintenance', value: 'false', type: 'boolean', group: 'general', label_he: 'מצב תחזוקה', label_en: 'Maintenance Mode' },
    { key: 'app.registration', value: 'true', type: 'boolean', group: 'auth', label_he: 'אפשר הרשמה', label_en: 'Allow Registration' },
    { key: 'app.max_projects', value: '50', type: 'number', group: 'limits', label_he: 'מקסימום פרויקטים', label_en: 'Max Projects' },
    { key: 'app.max_tasks_per_project', value: '500', type: 'number', group: 'limits', label_he: 'מקסימום משימות לפרויקט', label_en: 'Max Tasks per Project' },
  ];

  for (const setting of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }
  console.log('  Created 5 default system settings');

  // ── Default Users ──
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Approve & promote real admin user if exists
  const realAdmin = await prisma.user.findUnique({ where: { email: 'tal.ya@rami-levy.co.il' } });
  if (realAdmin) {
    await prisma.user.update({
      where: { email: 'tal.ya@rami-levy.co.il' },
      data: { globalRole: 'SUPER_ADMIN', isApproved: true },
    });
    console.log('  Approved and promoted tal.ya@rami-levy.co.il to SUPER_ADMIN');
  }

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskflow.com' },
    update: { globalRole: 'SUPER_ADMIN', isApproved: true },
    create: {
      name: 'מנהל המערכת',
      email: 'admin@taskflow.com',
      password: hashedPassword,
      globalRole: 'SUPER_ADMIN',
      isApproved: true,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'sarah@taskflow.com' },
    update: { isApproved: true },
    create: {
      name: 'שרה כהן',
      email: 'sarah@taskflow.com',
      password: hashedPassword,
      globalRole: 'USER',
      isApproved: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'david@taskflow.com' },
    update: { isApproved: true },
    create: {
      name: 'דוד לוי',
      email: 'david@taskflow.com',
      password: hashedPassword,
      globalRole: 'USER',
      isApproved: true,
    },
  });

  console.log('  Created 3 users (admin as SUPER_ADMIN)');

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  // ── Default Project ──
  const project = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      name: 'פרויקט לדוגמה',
      description: 'פרויקט לדוגמה עם משימות שונות לבדיקת המערכת',
      ownerId: admin.id,
    },
  });

  // ── Project Members ──
  for (const member of [
    { userId: admin.id, role: 'OWNER' },
    { userId: user1.id, role: 'ADMIN' },
    { userId: user2.id, role: 'MEMBER' },
  ]) {
    await prisma.projectMember.upsert({
      where: { userId_projectId: { userId: member.userId, projectId: project.id } },
      update: {},
      create: { ...member, projectId: project.id },
    });
  }

  // ── Default Tasks ──
  const tasks = [
    { title: 'עיצוב ממשק המשתמש', description: 'יצירת עיצוב ראשוני למערכת', status: 'DONE', priority: 'HIGH', position: 0, assigneeId: user1.id },
    { title: 'בניית API בסיסי', description: 'יצירת נקודות קצה בסיסיות', status: 'DONE', priority: 'URGENT', position: 1, assigneeId: admin.id },
    { title: 'אימות משתמשים', description: 'הוספת מערכת הרשמה והתחברות', status: 'IN_PROGRESS', priority: 'HIGH', position: 0, assigneeId: admin.id },
    { title: 'לוח קנבאן', description: 'בניית לוח קנבאן עם גרירה ושחרור', status: 'IN_PROGRESS', priority: 'MEDIUM', position: 1, assigneeId: user1.id },
    { title: 'ניהול צוות', description: 'הוספת יכולת ניהול חברי צוות', status: 'REVIEW', priority: 'MEDIUM', position: 0, assigneeId: user2.id },
    { title: 'התראות', description: 'הוספת מערכת התראות בזמן אמת', status: 'TODO', priority: 'LOW', position: 0, assigneeId: null },
    { title: 'דוחות וסטטיסטיקות', description: 'בניית דף דוחות מפורט', status: 'TODO', priority: 'MEDIUM', position: 1, assigneeId: null },
    { title: 'אפליקציית מובייל', description: 'פיתוח גרסה למובייל', status: 'TODO', priority: 'LOW', position: 2, assigneeId: user2.id },
  ];

  for (const task of tasks) {
    const existing = await prisma.task.findFirst({
      where: { title: task.title, projectId: project.id },
    });
    if (!existing) {
      await prisma.task.create({ data: { ...task, projectId: project.id } });
    }
  }

  console.log(`  Created ${tasks.length} demo tasks`);

  // ── Default Chat Channel ──
  const generalChannel = await prisma.chatChannel.upsert({
    where: { id: 'general' },
    update: {},
    create: {
      id: 'general',
      name: 'כללי',
      description: 'ערוץ כללי לכל חברי הצוות',
      isGeneral: true,
    },
  });

  for (const u of [admin, user1, user2]) {
    await prisma.chatMember.upsert({
      where: { channelId_userId: { channelId: generalChannel.id, userId: u.id } },
      update: {},
      create: { channelId: generalChannel.id, userId: u.id },
    });
  }
  console.log('  Created general chat channel');

  // ── Audit log for seed ──
  await prisma.auditLog.create({
    data: {
      action: 'system.seed',
      entity: 'System',
      details: JSON.stringify({ message: 'Database seeded with default data' }),
      userId: admin.id,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
