import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import dotenv from 'dotenv';

// 加载 .env 中的 DATABASE_URL
dotenv.config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  console.log('🌱 开始写入种子数据...\n');

  // ---- 1. 写入 6 个角色 ----
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: '商务' },
      update: {},
      create: { code: '商务', name: '客户主理人/商务岗' },
    }),
    prisma.role.upsert({
      where: { code: '业务' },
      update: {},
      create: { code: '业务', name: '业务岗' },
    }),
    prisma.role.upsert({
      where: { code: '会计' },
      update: {},
      create: { code: '会计', name: '会计岗' },
    }),
    prisma.role.upsert({
      where: { code: '主管' },
      update: {},
      create: { code: '主管', name: '会计主管/部门主管' },
    }),
    prisma.role.upsert({
      where: { code: '总务' },
      update: {},
      create: { code: '总务', name: '总务岗' },
    }),
    prisma.role.upsert({
      where: { code: '管理员' },
      update: {},
      create: { code: '管理员', name: '管理员/老板' },
    }),
  ]);

  console.log(`✅ 已写入 ${roles.length} 个角色`);

  // ---- 2. 创建测试账号 ----
  const TEST_PASSWORD = '123456';
  const passwordHash = await hash(TEST_PASSWORD, 10);

  // 构建角色 code → id 的映射
  const roleMap = new Map(roles.map((r) => [r.code, r.id]));

  const testUserDefs = [
    { username: 'shangwu', realName: '商务张三', roleCode: '商务' as const },
    { username: 'yewu',    realName: '业务李四', roleCode: '业务' as const },
    { username: 'kuaiji',  realName: '会计王五', roleCode: '会计' as const },
    { username: 'zhuguan', realName: '主管赵六', roleCode: '主管' as const },
    { username: 'zongwu',  realName: '总务钱七', roleCode: '总务' as const },
    { username: 'admin',   realName: '管理员周八', roleCode: '管理员' as const },
  ];

  const createdUsers: Array<{
    username: string;
    realName: string;
    roleCode: string;
  }> = [];

  for (const def of testUserDefs) {
    await prisma.user.upsert({
      where: { username: def.username },
      update: {},
      create: {
        username: def.username,
        passwordHash,
        realName: def.realName,
        roleId: roleMap.get(def.roleCode)!,
      },
    });
    createdUsers.push({
      username: def.username,
      realName: def.realName,
      roleCode: def.roleCode,
    });
  }

  console.log(`✅ 已写入 ${createdUsers.length} 个测试账号\n`);

  // ---- 3. 写入 15 个服务模板（占位数据，真实内容等客户补充） ----
  const templates = [
    { serviceType: '注册',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '地址',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '开户',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '变更',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '注销',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '代理',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '社保',       materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '公积金',     materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '进出口备案', materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '食品证',     materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '道路运输证', materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '卫生证',     materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '代理记账',   materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '财务外包',   materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
    { serviceType: '合规项目',   materials: ['待客户补充'], steps: ['待客户补充'], duration: '待客户补充' },
  ];

  let templateCount = 0;
  for (const t of templates) {
    const existing = await prisma.serviceTemplate.findFirst({
      where: { serviceType: t.serviceType },
    });
    if (!existing) {
      await prisma.serviceTemplate.create({
        data: {
          serviceType: t.serviceType,
          requiredMaterials: t.materials,
          processSteps: t.steps,
          estimatedDuration: t.duration,
        },
      });
      templateCount++;
    }
  }

  console.log(`✅ 已写入 ${templateCount} 个服务模板（${templates.length - templateCount > 0 ? templates.length - templateCount : 0} 个已存在，跳过）\n`);

  // ---- 4. 打印测试账号列表 ----
  console.log('══════════════════════════════════════════');
  console.log('  测试账号列表（密码统一：123456）');
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('  用户名        密码      角色        姓名');
  console.log('  ─────────    ──────    ──────      ──────');
  for (const u of createdUsers) {
    console.log(
      `  ${u.username.padEnd(14)} ${TEST_PASSWORD.padEnd(9)} ${u.roleCode.padEnd(11)} ${u.realName}`,
    );
  }
  console.log('');
  console.log('══════════════════════════════════════════\n');
  console.log('🌱 种子数据写入完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据写入失败：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
