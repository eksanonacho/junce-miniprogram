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

  // ---- 3. 清理旧模板（P1 收尾：软删除旧名称模板，避免破坏已有 service_item 引用） ----
  const oldTypeNames = ['注册','地址','开户','变更','注销','代理','社保','公积金','食品证','道路运输证','卫生证','合规项目'];
  const oldCleanup = await prisma.serviceTemplate.updateMany({
    where: { serviceType: { in: oldTypeNames } },
    data: { isActive: false },
  });
  if (oldCleanup.count > 0) {
    console.log(`🧹 已停用 ${oldCleanup.count} 个旧模板（保留数据引用，API 不可见）`);
  }
  // 删除完全未被引用的旧模板（无 service_item / read_confirmation 引用）
  try {
    const unused = await prisma.serviceTemplate.findMany({
      where: {
        serviceType: { in: oldTypeNames },
        serviceItems: { none: {} },
        confirmations: { none: {} },
      },
      select: { id: true, serviceType: true },
    });
    if (unused.length > 0) {
      const unusedIds = unused.map(u => u.id);
      const deleted = await prisma.serviceTemplate.deleteMany({ where: { id: { in: unusedIds } } });
      console.log(`🗑️  已删除 ${deleted.count} 个未被引用的旧模板：${unused.map(u => u.serviceType).join(', ')}`);
    }
  } catch (e) {
    console.log('⚠️  旧模板删除跳过（存在引用约束）：', (e as any)?.message?.substring(0, 60));
  }

  // ---- 4. 写入 15 个服务模板（P1 真实业务内容） ----
  const templates = [
    {
      serviceType: '工商注册',
      materials: {
        materials: ['法人身份证原件', '股东身份证复印件', '注册地址证明（房产证或租赁合同）', '公司章程（可协助起草）', '企业名称预先核准申请书'],
        customerActions: ['确定公司名称（准备 3-5 个备选）', '确定注册资本与股权比例', '全体股东配合线上实名认证', '注册地址证明材料需在有效期内'],
        riskNotes: ['名称核准不通过需重新申请（1-2 个工作日额外耗时）', '注册地址如为住宅需额外提供居委会证明', '经营范围涉及前置许可的需先取得许可批文'],
        delivery: '营业执照正副本 + 公司印章一套（公章、财务章、法人章、发票章）+ 公司章程',
        serviceDescription: '代理客户完成内资有限责任公司工商设立登记，含名称核准、材料准备、线上提交、执照领取全流程。',
        suitableFor: '新设立有限责任公司',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '单一股东、无特殊经营范围，材料齐全' },
          { tier: '基础', desc: '2-5 名股东、常规经营范围' },
          { tier: '升级', desc: '含银行开户协助、税务报到' },
          { tier: '高端', desc: '含注册地址挂靠一年、全套印章刻制' },
          { tier: 'VIP', desc: '含加急办理（3 个工作日内）、注册后首月代理记账免费' },
        ],
      },
      steps: ['客户沟通与材料收集', '企业名称预先核准', '编制公司章程与股东决议', '线上/线下提交工商材料', '领取营业执照', '刻制印章', '银行开户（可选）', '税务报到（可选）'],
      duration: '5-15 个工作日（视名称核准与材料完整度）',
    },
    {
      serviceType: '注册地址挂靠',
      materials: {
        materials: ['法人身份证', '营业执照（如已取得）', '挂靠协议签署'],
        customerActions: ['确认挂靠地址所属行政区域', '签署地址挂靠协议', '配合工商/税务的地址核查'],
        riskNotes: ['部分行业对注册地址有特殊要求（如餐饮需实地经营地址）', '地址挂靠到期前 30 天需续签，否则可能导致经营异常名录'],
        delivery: '地址挂靠协议 + 地址使用证明',
        serviceDescription: '为客户提供合规的注册地址挂靠服务，适用无实际办公场地或异地经营的企业。',
        suitableFor: '无实地经营场地的小微企业、电商企业',
        responsibleRole: '商务',
        priceTiers: [
          { tier: '简易版', desc: '基础地址挂靠一年，不含信件代收' },
          { tier: '基础', desc: '含信件代收、通知转达' },
          { tier: '升级', desc: '含工商信函处理、税务地址变更同步' },
          { tier: '高端', desc: '含独立门牌号、前台接待转接服务' },
          { tier: 'VIP', desc: '含虚拟办公室服务、临时会议室使用权益' },
        ],
      },
      steps: ['确认客户行政区域需求', '匹配可用挂靠地址', '签署挂靠协议', '提供地址证明材料', '后续年度续签提醒'],
      duration: '1-3 个工作日',
    },
    {
      serviceType: '银行开户',
      materials: {
        materials: ['营业执照正副本', '法人身份证原件', '公章、财务章、法人章', '公司章程', '经营场地证明'],
        customerActions: ['法人本人需到场（部分银行支持远程视频见证）', '确定开户银行与账户类型（基本户/一般户）', '提供实际经营地址的门头照或办公照'],
        riskNotes: ['法人征信异常可能导致开户被拒', '部分银行对小微企业开户审核较严，耗时偏长', '反洗钱审核是银行开户的必经流程'],
        delivery: '银行开户许可证 + 网银 U 盾 + 账户信息回执',
        serviceDescription: '协助客户完成企业银行基本存款账户或一般账户开立，含预约、材料准备、陪同办理。',
        suitableFor: '所有新设立或需要增开账户的企业',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '线上预约+材料预审，客户自行前往' },
          { tier: '基础', desc: '含陪同办理、材料整理' },
          { tier: '升级', desc: '含上门拍照、银行绿色通道预约' },
          { tier: '高端', desc: '含法人免到场协调（限部分合作银行）' },
          { tier: 'VIP', desc: '含开户后首月银企对账辅导、网银操作培训' },
        ],
      },
      steps: ['确定开户银行与账户类型', '准备开户材料', '预约银行临柜时间', '陪同或指导客户开户', '领取开户许可证与网银', '协助首次银企对账'],
      duration: '5-10 个工作日（视银行审核进度）',
    },
    {
      serviceType: '工商变更',
      materials: {
        materials: ['营业执照正副本', '法人身份证', '变更事项相关证明（如新地址证明、新股东身份证等）', '股东会决议', '公司章程修正案'],
        customerActions: ['明确变更事项与变更后内容', '股东配合签署决议文件', '涉及股权转让需提供转让协议', '变更后需同步更新银行、税务、社保登记信息'],
        riskNotes: ['经营范围和注册资本变更可能触发税务稽查抽查', '股权转让涉及个人所得税，需提前规划', '变更材料不完整会导致退回补正，延长周期'],
        delivery: '新版营业执照 + 变更核准通知书',
        serviceDescription: '代理客户完成工商登记事项变更，包括名称、地址、经营范围、注册资本、股东、法人等变更。',
        suitableFor: '所有需变更登记事项的企业',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '单一事项变更（如仅变更地址），材料齐全' },
          { tier: '基础', desc: '单一事项变更，含材料起草' },
          { tier: '升级', desc: '多事项同步变更（如地址+经营范围）' },
          { tier: '高端', desc: '包含股权转让、增资减资等复杂变更' },
          { tier: 'VIP', desc: '含变更后续的银行/税务/社保全链路同步更新' },
        ],
      },
      steps: ['确认变更事项与变更后内容', '起草股东会决议与章程修正案', '收集完善变更材料', '线上/线下提交变更申请', '领取新营业执照', '同步更新税务、银行、社保登记'],
      duration: '5-15 个工作日（视变更事项复杂度）',
    },
    {
      serviceType: '公司注销',
      materials: {
        materials: ['营业执照正副本', '法人身份证', '股东会注销决议', '税务清税证明', '银行销户证明', '社保注销证明（如有）', '全部印章'],
        customerActions: ['股东一致同意注销决议', '配合完成税务清算（补税或退税）', '注销前结清所有债务、工资、社保', '提供近三年账簿与凭证供税务核查'],
        riskNotes: ['税务注销是整个流程中最耗时的环节，可能需 1-3 个月', '如有欠税、未申报记录，需先补申报并缴清税款及滞纳金', '简易注销仅适用未开业或无债权债务企业，不满足条件需走一般注销', '注销后法人征信记录保留 3 年'],
        delivery: '注销核准通知书 + 工商注销回执 + 税务注销回执',
        serviceDescription: '代理客户完成企业工商注销、税务注销全流程，含清算材料准备与提交。支持简易注销和一般注销两种路径。',
        suitableFor: '拟注销的企业',
        responsibleRole: '会计',
        priceTiers: [
          { tier: '简易版', desc: '适用未开业/无债权债务企业的简易注销，不含税务注销' },
          { tier: '基础', desc: '一般注销（工商+税务），账务清晰、无异常' },
          { tier: '升级', desc: '含税务清算协助、账簿整理' },
          { tier: '高端', desc: '含历史未申报补报、异常处理', },
          { tier: 'VIP', desc: '含社保注销、银行销户、公章缴销全链路' },
        ],
      },
      steps: ['评估适用简易注销还是一般注销', '股东会决议与清算组成立', '税务清算（申报、缴税/退税、清税证明）', '公示（简易注销 20 天/一般注销 45 天）', '提交工商注销申请', '银行销户、社保注销、印章缴销'],
      duration: '简易注销约 30 天；一般注销 2-4 个月（视税务清算进度）',
    },
    {
      serviceType: '资质代理',
      materials: {
        materials: ['营业执照', '法人身份证', '经营场所证明', '人员资质证书（视资质类型）', '管理制度文件（视资质类型）'],
        customerActions: ['明确所需资质类型与用途', '提供相关人员证书与社保记录', '配合现场核查（部分资质需要）'],
        riskNotes: ['不同资质审批权限不同（市/省/国家），周期差异大', '人员证书不达标是驳回主因', '部分资质有年检要求，需持续维护'],
        delivery: '许可证正副本 + 审批文件',
        serviceDescription: '代理企业申请各类行政许可与经营资质，涵盖食品、道路运输、卫生、进出口、建筑劳务等领域。',
        suitableFor: '需取得特定行业许可的企业',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '入门级资质咨询，确认资质类型与审批部门' },
          { tier: '基础', desc: '单一资质申请，材料齐全' },
          { tier: '升级', desc: '含材料起草与编撰' },
          { tier: '高端', desc: '含人员匹配与挂靠协调' },
          { tier: 'VIP', desc: '含加急办理+资质年检提醒服务' },
        ],
      },
      steps: ['确认资质类型与审批层级', '梳理材料清单', '准备与编撰申请材料', '提交审批', '配合现场核查（如需）', '领取许可证', '记录年检/续期时间'],
      duration: '15-60 个工作日（视资质类型与审批层级）',
    },
    {
      serviceType: '社保代办',
      materials: {
        materials: ['营业执照', '法人身份证', '员工身份证复印件', '员工劳动合同', '社保登记表'],
        customerActions: ['提供员工完整信息（姓名、身份证号、工资基数）', '确认参保城市与险种', '每月 5 日前确认缴费名单与基数变更'],
        riskNotes: ['逾期未缴将产生滞纳金（日万分之五）', '社保基数每年调整一次，需提前规划', '跨省转移接续需另行办理'],
        delivery: '社保登记回执 + 每月缴费凭证 + 年度社保台账',
        serviceDescription: '代理企业社保开户、员工增减员、月度缴费申报、社保台账维护。',
        suitableFor: '所有需要社保代办的企业',
        responsibleRole: '会计',
        priceTiers: [
          { tier: '简易版', desc: '月度社保申报缴费，1-5 人' },
          { tier: '基础', desc: '含增减员操作、社保台账，6-20 人' },
          { tier: '升级', desc: '含跨省转移接续、基数调整建议' },
          { tier: '高端', desc: '20 人以上、多险种多城市' },
          { tier: 'VIP', desc: '含工伤申报协助、社保政策解读与规划' },
        ],
      },
      steps: ['社保开户（新企业）', '收集员工信息', '确定缴费基数', '月度申报缴费', '增减员操作', '年度基数调整', '出具年度社保台账'],
      duration: '开户 5-10 个工作日；月度申报 1-2 个工作日',
    },
    {
      serviceType: '公积金代办',
      materials: {
        materials: ['营业执照', '法人身份证', '员工身份证复印件', '公积金缴存登记表'],
        customerActions: ['确定缴存比例（5%-12%）', '提供员工工资基数清单', '配合公积金中心核查'],
        riskNotes: ['公积金缴存比例一经确定年度内不可随意变更', '未按时缴存将影响员工公积金贷款资格'],
        delivery: '公积金开户回执 + 每月缴存凭证',
        serviceDescription: '代理企业住房公积金开户与月度缴存申报，含员工增减与基数调整。',
        suitableFor: '所有需为员工缴存公积金的企业',
        responsibleRole: '会计',
        priceTiers: [
          { tier: '简易版', desc: '月度缴存申报，1-5 人' },
          { tier: '基础', desc: '含增减员与年度基数调整' },
          { tier: '升级', desc: '含补缴、转移接续办理' },
          { tier: '高端', desc: '20 人以上批量处理，含基数优化建议' },
          { tier: 'VIP', desc: '含公积金贷款政策咨询与协助' },
        ],
      },
      steps: ['公积金开户（新企业）', '确定缴存比例与基数', '月度缴存申报', '员工增减处理', '年度基数调整'],
      duration: '开户 5-10 个工作日；月度申报 1 个工作日',
    },
    {
      serviceType: '进出口备案',
      materials: {
        materials: ['营业执照（经营范围需含进出口）', '法人身份证', '海关备案登记表', '外汇管理局备案表', '出入境检验检疫备案表'],
        customerActions: ['确认经营范围已包含进出口业务（如无则需先变更）', '提供企业英文名称', '配合海关现场核查（如有）', '取得资质后需持续做海关年报'],
        riskNotes: ['经营范围不含"货物进出口"或"技术进出口"需先变更营业执照', '海关编码取得后需在当年做首次年报', '出口退税资格需单独申请'],
        delivery: '海关进出口收发货人备案回执 + 外汇管理局备案 + 检验检疫备案',
        serviceDescription: '代理企业完成进出口经营权备案，含海关、外汇管理局、出入境检验检疫局的全套备案。',
        suitableFor: '拟开展进出口业务的企业',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '仅海关备案单项，客户自备全套材料' },
          { tier: '基础', desc: '海关备案+外汇备案，材料齐全' },
          { tier: '升级', desc: '含经营范围变更（如需）+全套备案' },
          { tier: '高端', desc: '含出口退税资格申请+电子口岸卡办理' },
          { tier: 'VIP', desc: '含首年海关年报代办+进出口财税辅导' },
        ],
      },
      steps: ['确认经营范围包含进出口业务', '办理对外贸易经营者备案', '海关进出口收发货人备案', '外汇管理局名录备案', '检验检疫备案', '申领电子口岸卡', '后续海关年报'],
      duration: '10-20 个工作日',
    },
    {
      serviceType: '食品经营许可证',
      materials: {
        materials: ['营业执照', '法人身份证', '经营场所平面图', '食品安全管理制度', '从业人员健康证', '食品经营设备清单'],
        customerActions: ['经营场所需符合食品安全卫生要求', '从业人员需办理健康证', '配合市场监管局现场核查', '确保经营场所布局图与实际一致'],
        riskNotes: ['现场核查未通过需整改后重新申请（额外 7-15 天）', '网络经营需额外提供平台信息', '许可证有效期 5 年，到期前需续期'],
        delivery: '食品经营许可证正副本',
        serviceDescription: '代理企业申请食品经营许可证，含材料准备、制度起草、现场核查陪同。',
        suitableFor: '餐饮、食品销售、食品生产类企业',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '基础材料审核+提交，客户自行配合现场核查' },
          { tier: '基础', desc: '材料准备+提交，客户自行配合核查' },
          { tier: '升级', desc: '含制度文件起草+平面图绘制指导' },
          { tier: '高端', desc: '含现场核查预审+陪同' },
          { tier: 'VIP', desc: '含整改方案+健康证办理指导' },
        ],
      },
      steps: ['确认经营项目与场地条件', '准备申请材料', '起草食品安全管理制度', '提交申请', '配合市场监管局现场核查', '整改（如需）', '领取许可证'],
      duration: '15-30 个工作日（含现场核查）',
    },
    {
      serviceType: '道路运输许可证',
      materials: {
        materials: ['营业执照（经营范围需含道路运输）', '法人身份证', '车辆行驶证', '驾驶员从业资格证', '安全生产管理制度', '停车场证明'],
        customerActions: ['确保经营范围包含道路运输（如无则需先变更）', '驾驶员需持有有效从业资格证', '提供停车场地租赁合同或产权证明', '车辆需通过营运车辆检测'],
        riskNotes: ['驾驶员从业资格证过期或缺失将直接导致驳回', '停车场面积不达标是常见驳回原因', '许可证取得后需配合年度审验'],
        delivery: '道路运输经营许可证正副本',
        serviceDescription: '代理企业申请道路运输经营许可证，含材料准备、制度起草、车辆与人员审核。',
        suitableFor: '货运、物流、客运类企业',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '基础材料审核+提交，客户自行完成车辆检测' },
          { tier: '基础', desc: '材料准备+提交，材料齐全' },
          { tier: '升级', desc: '含安全制度起草+停车场证明指导' },
          { tier: '高端', desc: '含车辆检测预约+驾驶员资质核查' },
          { tier: 'VIP', desc: '含经营范围变更（如需）+许可证年审代办' },
        ],
      },
      steps: ['确认经营范围与车辆/人员条件', '准备申请材料', '起草安全生产管理制度', '车辆营运检测', '提交申请', '领取许可证'],
      duration: '15-30 个工作日',
    },
    {
      serviceType: '卫生许可证',
      materials: {
        materials: ['营业执照', '法人身份证', '经营场所平面图', '卫生管理制度', '从业人员健康证', '消毒设施清单'],
        customerActions: ['经营场所需符合卫生标准', '从业人员需持有效健康证', '配备必要的消毒设施', '配合卫生部门现场审查'],
        riskNotes: ['现场卫生审查不达标需整改', '部分行业（如美容美发）有额外要求', '许可证到期前 30 日需申请续期'],
        delivery: '卫生许可证正副本',
        serviceDescription: '代理企业申请公共场所卫生许可证，含材料准备、制度起草、现场审查陪同。',
        suitableFor: '住宿、美容美发、洗浴、游泳馆、商场等公共场所经营者',
        responsibleRole: '业务',
        priceTiers: [
          { tier: '简易版', desc: '基础材料审核+提交，客户自行配合现场审查' },
          { tier: '基础', desc: '材料准备+提交' },
          { tier: '升级', desc: '含制度起草+消毒设施配置指导' },
          { tier: '高端', desc: '含现场预审查+整改指导' },
          { tier: 'VIP', desc: '含健康证办理指导+年度复审代办' },
        ],
      },
      steps: ['确认经营场所类别', '准备申请材料', '起草卫生管理制度', '提交申请', '配合现场审查', '整改（如需）', '领取许可证'],
      duration: '10-20 个工作日',
    },
    {
      serviceType: '代理记账',
      materials: {
        materials: ['营业执照', '法人身份证', '银行账户信息', '税控盘/UKey（如有）', '前期账务交接资料（如换代理）'],
        customerActions: ['每月 5 日前提供原始票据（收入、成本、费用发票）', '提供银行流水', '提供工资表（如有员工）', '配合税务申报确认'],
        riskNotes: ['逾期申报将产生罚款（最低 200 元/次）和滞纳金', '客户需对提供票据的真实性负责', '零申报连续超过 6 个月可能触发税务核查'],
        delivery: '月度记账凭证 + 月度财务报表 + 月度税务申报回执 + 年度账簿',
        serviceDescription: '为企业提供月度记账、凭证整理、财务报表编制、税务申报全流程代理记账服务。',
        suitableFor: '所有需要代理记账的企业',
        responsibleRole: '会计',
        priceTiers: [
          { tier: '简易版', desc: '小规模纳税人、零申报或极少票据、单一收入来源', amount: '200-400元/月' },
          { tier: '基础', desc: '小规模纳税人、月票据 20 张以内、业务类型单一', amount: '400-600元/月' },
          { tier: '升级', desc: '小规模纳税人、月票据 20-50 张、多项收入来源', amount: '600-1000元/月' },
          { tier: '高端', desc: '一般纳税人、月票据 50 张以上、多税率业务', amount: '1000-2000元/月' },
          { tier: 'VIP', desc: '一般纳税人、业务复杂、含月度经营分析报告、专属会计顾问', amount: '2000元起/月' },
        ],
      },
      steps: ['签订代理记账协议', '接收并整理客户月度票据', '编制记账凭证', '出具月度财务报表', '申报增值税、附加税、个税等', '季度申报企业所得税', '年度汇算清缴', '年度账簿整理归档'],
      duration: '持续服务；月度账务处理 3-5 个工作日',
    },
    {
      serviceType: '财务外包',
      materials: {
        materials: ['营业执照', '前期完整账务数据', '银行账户清单与流水', '历史税务申报记录', '业务合同与发票台账'],
        customerActions: ['提供完整的业务合同与发票', '配合财务流程梳理', '指定企业内部财务对接人'],
        riskNotes: ['财务外包不等于责任外包，企业仍需对财务合规负责', '前期账务不清晰将延长初期整理周期', '需签署保密协议与数据安全条款'],
        delivery: '月度财务报表 + 税务申报回执 + 财务分析报告 + 预算管理建议',
        serviceDescription: '为企业提供比代理记账更深度的财务服务，含账务整理、报表分析、预算管理、税务筹划建议、财务流程优化。区别于代理记账：财务外包更侧重"管理会计"而非"税务会计"。',
        suitableFor: '业务复杂度较高、有内部管理需求但无专职财务团队的企业',
        responsibleRole: '会计',
        priceTiers: [
          { tier: '简易版', desc: '基础财务数据整理+单月报表，适用试用期客户' },
          { tier: '基础', desc: '月度账务处理+财务报表，适用单主体、业务清晰的企业', amount: '1500-3000元/月' },
          { tier: '升级', desc: '含月度经营分析报告+预算对比', amount: '3000-5000元/月' },
          { tier: '高端', desc: '含税务筹划建议+现金流管理', amount: '5000-8000元/月' },
          { tier: 'VIP', desc: '含多主体合并报表+财务团队搭建咨询', amount: '8000元起/月' },
        ],
      },
      steps: ['签订财务外包协议与保密条款', '梳理企业当前财务流程', '整理前期账务（如不清晰）', '建立财务核算体系', '月度账务处理与报表出具', '月度经营分析与建议', '季度税务筹划沟通', '年度总结与下年预算编制'],
      duration: '持续服务；初期账务整理周期视复杂度 1-4 周',
    },
    {
      serviceType: '税务合规顾问',
      materials: {
        materials: ['营业执照', '近三年税务申报记录', '近三年财务报表', '当前税务登记信息', '过往税务稽查/处罚记录（如有）'],
        customerActions: ['提供完整的历史税务数据', '如实告知当前税务风险与疑虑', '配合制定并执行合规方案'],
        riskNotes: ['税务合规整改不能保证避免税务稽查', '历史欠税需在合规方案中一并处理', '税务政策变动频繁，需保持持续沟通'],
        delivery: '税务风险评估报告 + 合规整改方案 + 月度税务合规跟踪 + 政策变动提醒',
        serviceDescription: '为企业提供税务合规风险评估、整改方案制定与执行的顾问服务。适用于拟上市前合规梳理、税务稽查应对准备、重大交易前税务评估等场景。',
        suitableFor: '有税务合规需求的企业（上市前、稽查风险、重大交易等）',
        responsibleRole: '会计',
        priceTiers: [
          { tier: '简易版', desc: '单次税务健康快检+简要合规建议清单' },
          { tier: '基础', desc: '年度税务健康体检一次+合规建议' },
          { tier: '升级', desc: '季度税务合规跟踪+政策变动提醒' },
          { tier: '高端', desc: '含税务稽查应对方案+重大交易税务评估' },
          { tier: 'VIP', desc: '含专属税务顾问+月度合规例会+24 小时应急响应' },
        ],
      },
      steps: ['签署保密协议与顾问协议', '收集历史税务数据', '税务风险评估', '出具合规报告与整改方案', '协助执行整改措施', '持续税务政策跟踪与提醒', '季度/年度复评'],
      duration: '初次评估 2-4 周；持续顾问服务按月/季',
    },
  ];

  let templateCount = 0; let templateUpdated = 0;
  for (const t of templates) {
    const existing = await prisma.serviceTemplate.findFirst({
      where: { serviceType: t.serviceType },
    });
    if (existing) {
      await prisma.serviceTemplate.update({
        where: { id: existing.id },
        data: {
          requiredMaterials: t.materials,
          processSteps: t.steps,
          estimatedDuration: t.duration,
        },
      });
      templateUpdated++;
    } else {
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

  console.log(`✅ 已新增 ${templateCount} 个服务模板，已更新 ${templateUpdated} 个\n`);

  // ---- 5. 打印测试账号列表 ----
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
