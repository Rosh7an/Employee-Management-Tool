import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db';
import User from './models/User';
import Employee from './models/Employee';
import Department from './models/Department';
import LeaveRequest from './models/LeaveRequest';
import Payroll from './models/Payroll';
import PerformanceReview from './models/PerformanceReview';
import PerformanceQuarter from './models/PerformanceQuarter';
import Milestone from './models/Milestone';

// 14 quarters: Q1 2023 → Q2 2026
const PERIODS = [
  'Q1 2023','Q2 2023','Q3 2023','Q4 2023',
  'Q1 2024','Q2 2024','Q3 2024','Q4 2024',
  'Q1 2025','Q2 2025','Q3 2025','Q4 2025',
  'Q1 2026','Q2 2026',
];

// Ratings per employee key — tells a story over 14 quarters
const RATINGS: Record<string, number[]> = {
  sophia:  [4,4,4,5,5,5,5,5,5,5,5,5,5,5],  // Senior dev — consistently excellent
  ethan:   [2,3,3,3,4,4,4,4,5,5,5,5,5,5],  // Steady climb from junior
  lucas:   [3,3,4,3,4,4,4,5,4,5,5,5,5,5],  // Good with dip in mid-2024
  olivia:  [4,4,5,5,5,5,5,5,5,5,5,5,5,5],  // High performer from day one
  noah:    [3,3,3,4,4,4,4,4,5,4,5,5,5,5],  // Solid analyst improving
  ava:     [3,4,4,4,4,5,4,5,5,5,5,5,5,5],  // Marketing star
  liam:    [2,2,3,3,3,3,4,3,4,4,4,5,4,5],  // Slow but eventually strong
  emma:    [3,3,3,3,4,4,4,4,4,5,5,5,5,5],  // HR coordinator growth
  james:   [3,3,3,4,4,4,3,4,4,4,5,4,5,5],  // Recruiter with slight inconsistency
  ryan:    [4,4,5,5,5,5,5,5,5,5,5,5,5,5],  // Eng lead — top performer
  jessica: [4,5,4,5,5,5,5,5,5,5,5,5,5,5],  // Product manager — outstanding
  david:   [4,4,4,4,5,5,4,5,5,5,5,5,5,5],  // Marketing manager solid
  sarah:   [3,4,4,4,5,5,5,5,5,5,5,5,5,5],  // HR manager improving
};

const NOTES: Record<string, string[]> = {
  sophia: [
    'Delivered authentication module end-to-end with excellent code quality.',
    'Improved system performance by 20% through targeted refactoring work.',
    'Took complete ownership of critical API redesign project this quarter.',
    'Led architecture review sessions improving overall team code standards.',
    'Mentored two junior engineers resulting in improved team velocity.',
    'Delivered complex microservice integration ahead of schedule consistently.',
    'Outstanding technical design recognized across the engineering organization.',
    'Exceeded all delivery goals with exceptional quality and reliability.',
    'Proactively resolved three critical production incidents before escalation.',
    'Led platform migration with zero downtime and exemplary coordination.',
    'Drove engineering reliability initiative with measurable uptime improvement.',
    'Outstanding technical leadership with strong cross-team collaboration shown.',
    'Consistently sets the technical standard for the entire engineering org.',
    'Exceptional contributor across all dimensions of senior engineering work.',
  ],
  ethan: [
    'Learning pace is good; documentation and test coverage needs attention.',
    'Steady improvement in understanding of codebase and engineering practices.',
    'Better communication on blockers; first independent feature delivered.',
    'Code review contributions improving; quality is trending in right direction.',
    'Completed first large feature with minimal revision cycles required.',
    'Reliable contributor with noticeable confidence growth on complex tasks.',
    'Showing strong ownership on assigned backend module this quarter.',
    'Took initiative fixing long-standing regression bugs across multiple modules.',
    'Delivered difficult database optimization with strong effort and quality.',
    'Quality and speed of delivery has materially improved over the period.',
    'Demonstrated senior-level ownership; ready for more complex scoping work.',
    'Excellent growth trajectory; deserving of promotion consideration next cycle.',
    'Consistent high performance across engineering deliverables and standards.',
    'Outstanding quarter — exceeds expectations at current level consistently.',
  ],
  lucas: [
    'Good frontend fundamentals; needs to improve on cross-browser testing.',
    'Solid delivery of UI components for the new dashboard project.',
    'Improved component reuse and design system adherence this quarter.',
    'Some quality dips noted; deadline pressure affected output consistency.',
    'Returned strong after challenging period; UI delivery back on track.',
    'Excellent work on responsive redesign across all core product surfaces.',
    'Improved performance on complex animation and state management tasks.',
    'Outstanding frontend contribution to the product launch milestone.',
    'Reliable high-quality delivery on all assigned UI tasks this quarter.',
    'Exceptional work on accessibility initiative across the platform.',
    'Strong contributions to frontend architecture and component standards.',
    'Excellent delivery velocity with consistently high quality maintained.',
    'Demonstrated senior frontend capability; architecture input is valued.',
    'Outstanding quarter — consistently meets and exceeds frontend standards.',
  ],
  olivia: [
    'Exceptional UX research and design for the onboarding flow redesign.',
    'Delivered comprehensive design system documentation ahead of schedule.',
    'Led user testing sessions driving measurable improvements in conversion.',
    'Outstanding visual design quality on all product release deliverables.',
    'Excellent cross-functional collaboration with engineering on design spec.',
    'Best-in-class interaction design recognized across the product team.',
    'Delivered all design OKRs with exceptional quality and user impact.',
    'Outstanding product design thinking with strong data-driven approach.',
    'Exceptional design leadership on the mobile-first redesign initiative.',
    'Delivered highest-quality quarter of design output since joining.',
    'Created scalable design system adopted across the entire product suite.',
    'Exemplary contributions to product quality and UX standards company-wide.',
    'Exceptional design leadership with measurable impact on user satisfaction.',
    'Consistently delivers world-class design work with strong strategic insight.',
  ],
  noah: [
    'Good data analysis work; presentation skills need further development.',
    'Solid business requirements documentation for the new billing feature.',
    'Improved stakeholder communication and requirement clarification process.',
    'Strong analytical output; needs to improve cross-team coordination.',
    'Excellent requirements gathering for the quarterly roadmap planning.',
    'Delivered comprehensive competitive analysis report to product leadership.',
    'Strong improvement in SQL query work and data visualization quality.',
    'Reliable analytical contributor with improving strategic business judgment.',
    'Delivered all quarterly analysis goals with measurable stakeholder impact.',
    'Outstanding data-driven insights driving key product roadmap decisions.',
    'Excellent business analysis supporting successful feature prioritization.',
    'Created robust analytics framework adopted across the product organization.',
    'Exceptional business analysis quality with strong executive communication.',
    'Consistently delivers high-impact analysis supporting strategic direction.',
  ],
  ava: [
    'Strong campaign analytics and data-driven decision making demonstrated.',
    'Good collaboration with product team on go-to-market messaging strategy.',
    'Led content calendar initiative delivering excellent pipeline results.',
    'Campaign ROI exceeded quarterly targets by 35% with strong execution.',
    'Strong leadership on cross-functional marketing alignment meetings held.',
    'Fresh creative perspective brought strong impact to key product launch.',
    'Outstanding pipeline growth through demand generation strategy this quarter.',
    'Best-in-class competitor analysis delivered to executive leadership team.',
    'All quarterly targets met with strong revenue attribution results shown.',
    'Exceptional marketing performance across all key performance indicators.',
    'One of the strongest quarterly performances in marketing team history.',
    'Created scalable content framework now adopted across the whole company.',
    'Exemplary contributions to brand presence and market positioning goals.',
    'Consistently delivers high-impact work with strong strategic business value.',
  ],
  liam: [
    'Creative output is good; delivery timelines need more consistency.',
    'Strong content ideas but some deadlines were missed this quarter.',
    'Improved on-time delivery; content quality is trending positively.',
    'Some personal challenges affected output; team support provided.',
    'Returned with renewed energy; content engagement metrics improving.',
    'Good quarter overall; social media campaigns performing above targets.',
    'On-time delivery improved; quality is consistent and improving.',
    'Standout campaign content for the quarterly product launch event.',
    'Some delays in deliverables but completed work quality remains high.',
    'Collaboration with team improved considerably; stronger initiative shown.',
    'Strong social media campaigns delivered with excellent engagement results.',
    'Demonstrating more consistency and reliability in content production.',
    'Good progress with clear potential for continued growth in the role.',
    'Solid quarter; consistent delivery with creative quality on an upward trend.',
  ],
  emma: [
    'Good onboarding coordination and new employee experience management.',
    'Managed HR documentation and compliance tasks effectively this quarter.',
    'Strong support during company-wide performance review cycle completion.',
    'Coordinated multiple hiring rounds efficiently with positive candidate feedback.',
    'Excellent employee engagement initiatives launched with strong adoption.',
    'Built strong relationships with all department heads across the company.',
    'Improved HR processes reducing average onboarding time by 30%.',
    'Delivered comprehensive new joiner training program across all teams.',
    'Proactively identified employee satisfaction risks and addressed them.',
    'Outstanding coordination during the annual benefits enrollment period.',
    'Created robust HR knowledge base adopted across the entire organization.',
    'Led engagement survey delivering actionable insights to senior leadership.',
    'Exceptional performance in talent acquisition and retention initiatives.',
    'Consistently delivers high-quality HR operations with strong empathy.',
  ],
  james: [
    'Meeting expectations in candidate sourcing and pipeline management.',
    'Good recruiter relationship management and candidate communication.',
    'Filled three open positions ahead of target hiring deadlines.',
    'Improved candidate screening with structured behavioral interview guides.',
    'Consistent sourcing quality and talent pipeline maintenance this quarter.',
    'Expanded talent pools for hard-to-fill engineering roles effectively.',
    'Slight dip in offer acceptance rate; addressed through improved engagement.',
    'Delivered high-quality candidate experience at all stages of hiring.',
    'Met quarterly hiring targets despite challenging market conditions.',
    'Strong improvement in offer acceptance rate through proactive engagement.',
    'Diversity sourcing initiative delivered measurable pipeline impact.',
    'All recruiting KPIs delivered on time with consistent quality.',
    'Demonstrated strong full-cycle recruiting ownership and professionalism.',
    'Solid dependable contributor to all HR team hiring goals and targets.',
  ],
  ryan: [
    'Strong technical leadership and effective sprint planning throughout.',
    'Excellent team management resulting in consistently high velocity delivery.',
    'Led architecture review sessions improving overall engineering code quality.',
    'Delivered major platform feature on schedule through strong team coordination.',
    'Outstanding stakeholder communication and roadmap clarity maintained.',
    'Mentored three engineers improving retention outcomes across the team.',
    'All engineering OKRs delivered ahead of schedule with high quality.',
    'Exceptional system design work recognized across the engineering org.',
    'Drove technical excellence culture with measurable quality improvements.',
    'Best engineering quarter in terms of delivery speed and innovation.',
    'Led incident response framework adopted across the entire engineering org.',
    'Outstanding strategic thinking and cross-team collaboration throughout.',
    'Exemplary technical and people leadership across all engineering dimensions.',
    'Consistently exceeds all expectations as engineering team leader.',
  ],
  jessica: [
    'Strong product vision and effective cross-functional alignment achieved.',
    'Outstanding product strategy with clear prioritization and business impact.',
    'Excellent stakeholder management and discovery process demonstrated.',
    'Launched new feature with high adoption and strong positive user feedback.',
    'Slight scope creep in sprint planning but delivery quality remained high.',
    'Led competitive analysis that significantly shaped the product direction.',
    'Outstanding go-to-market strategy for the quarterly product release.',
    'Exceptional user research synthesis driving strong product insights.',
    'Delivered all product goals and OKRs with excellent execution quality.',
    'Outstanding product analytics work driving measurable data-driven decisions.',
    'Led successful beta program with excellent user satisfaction outcomes.',
    'Exceptional product leadership with strong customer empathy throughout.',
    'Consistently delivers high-impact product work with clear business alignment.',
    'Outstanding quarter — one of the most impactful product leaders in the team.',
  ],
  david: [
    'Strong brand strategy and effective team coordination across channels.',
    'Delivered detailed marketing roadmap with clear business prioritization.',
    'Excellent campaign management and demand generation results achieved.',
    'Launched new go-to-market strategy with high early adoption metrics.',
    'Outstanding brand positioning work recognized at executive level.',
    'Led channel strategy that significantly improved qualified lead generation.',
    'Strong quarterly execution on all marketing goals and revenue attribution.',
    'Exceptional leadership during high-volume product launch quarter.',
    'Solid quarter with strong delivery on marketing OKRs and pipeline targets.',
    'Outstanding performance marketing analytics driving ROI improvements.',
    'Led successful co-marketing program with excellent partner satisfaction.',
    'Exceptional marketing leadership with strong data-driven accountability.',
    'Consistently delivers high-impact marketing with clear strategic business value.',
    'Outstanding quarter — one of the most impactful marketing leaders in history.',
  ],
  sarah: [
    'Good HR strategy alignment with business goals and hiring plans.',
    'Strong employer branding initiatives launched with positive market response.',
    'Improved HR policies and compliance framework across all departments.',
    'Led compensation benchmarking ensuring competitive pay structure maintained.',
    'Excellent performance management cycle coordination across the company.',
    'Built strong partnerships with all department heads and senior leadership.',
    'Improved talent retention rate by 8% through targeted engagement programs.',
    'Exceptional leadership during high-volume hiring quarter company-wide.',
    'Outstanding HRBP work supporting multiple organizational restructuring talks.',
    'Led learning and development program with excellent employee satisfaction.',
    'Created comprehensive HR metrics dashboard for executive leadership reporting.',
    'Exceptional strategic HR guidance during rapid company growth phase.',
    'Exemplary leadership building inclusive workplace culture initiatives.',
    'Consistently delivers exceptional HR leadership with strong strategic impact.',
  ],
};

export async function seedData(): Promise<void> {
  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    Department.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Payroll.deleteMany({}),
    PerformanceReview.deleteMany({}),
    PerformanceQuarter.deleteMany({}),
    Milestone.deleteMany({}),
  ]);

  console.log('Cleared existing data.');

  const hash = await bcrypt.hash('Password@123', 10);

  // ─── Departments ──────────────────────────────────────────────────────────
  const [engDept, prodDept, mktDept, hrDept] = await Department.insertMany([
    { name: 'Engineering',    description: 'Builds and maintains all software products' },
    { name: 'Product',        description: 'Product strategy, design, and roadmap' },
    { name: 'Marketing',      description: 'Brand, growth, and customer acquisition' },
    { name: 'HR & People',    description: 'Talent, culture, and employee experience' },
  ]);

  // ─── Employees ────────────────────────────────────────────────────────────
  // Admins
  const michael = await Employee.create({
    employeeId: 'EMP-0001', name: 'Michael Chen',
    email: 'director@company.com', designation: 'Company Director',
    department: hrDept._id, employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2020-06-01'), salary: { base: 18000, currency: 'USD' },
  });
  const sarah = await Employee.create({
    employeeId: 'EMP-0002', name: 'Sarah Mitchell',
    email: 'hr.manager@company.com', designation: 'HR Manager',
    department: hrDept._id, managerId: michael._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2021-01-15'), salary: { base: 12000, currency: 'USD' },
  });

  // Managers
  const ryan = await Employee.create({
    employeeId: 'EMP-0003', name: 'Ryan Park',
    email: 'team.lead@company.com', designation: 'Engineering Lead',
    department: engDept._id, employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2021-03-10'), salary: { base: 14000, currency: 'USD' },
  });
  const jessica = await Employee.create({
    employeeId: 'EMP-0004', name: 'Jessica Torres',
    email: 'product.manager@company.com', designation: 'Product Manager',
    department: prodDept._id, employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2021-05-20'), salary: { base: 13000, currency: 'USD' },
  });
  const david = await Employee.create({
    employeeId: 'EMP-0005', name: 'David Kim',
    email: 'marketing.manager@company.com', designation: 'Marketing Manager',
    department: mktDept._id, employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2021-07-01'), salary: { base: 12000, currency: 'USD' },
  });

  // Set department managers
  await Department.findByIdAndUpdate(engDept._id, { managerId: ryan._id });
  await Department.findByIdAndUpdate(prodDept._id, { managerId: jessica._id });
  await Department.findByIdAndUpdate(mktDept._id, { managerId: david._id });
  await Department.findByIdAndUpdate(hrDept._id, { managerId: sarah._id });

  // Engineering team
  const sophia = await Employee.create({
    employeeId: 'EMP-0006', name: 'Sophia Lewis',
    email: 'alice.dev@company.com', designation: 'Senior Software Engineer',
    department: engDept._id, managerId: ryan._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2022-01-10'), salary: { base: 10500, currency: 'USD' },
  });
  const ethan = await Employee.create({
    employeeId: 'EMP-0007', name: 'Ethan Wright',
    email: 'bob.dev@company.com', designation: 'Software Engineer',
    department: engDept._id, managerId: ryan._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2022-06-15'), salary: { base: 8000, currency: 'USD' },
  });
  const lucas = await Employee.create({
    employeeId: 'EMP-0008', name: 'Lucas Brown',
    email: 'lucas.brown@company.com', designation: 'Frontend Engineer',
    department: engDept._id, managerId: ryan._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2023-02-01'), salary: { base: 8500, currency: 'USD' },
  });

  // Product team
  const olivia = await Employee.create({
    employeeId: 'EMP-0009', name: 'Olivia Martinez',
    email: 'olivia.martinez@company.com', designation: 'UX Designer',
    department: prodDept._id, managerId: jessica._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2022-03-15'), salary: { base: 9000, currency: 'USD' },
  });
  const noah = await Employee.create({
    employeeId: 'EMP-0010', name: 'Noah Thompson',
    email: 'noah.thompson@company.com', designation: 'Business Analyst',
    department: prodDept._id, managerId: jessica._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2022-09-01'), salary: { base: 7500, currency: 'USD' },
  });

  // Marketing team
  const ava = await Employee.create({
    employeeId: 'EMP-0011', name: 'Ava Johnson',
    email: 'carol.mkt@company.com', designation: 'Marketing Analyst',
    department: mktDept._id, managerId: david._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2022-04-01'), salary: { base: 7200, currency: 'USD' },
  });
  const liam = await Employee.create({
    employeeId: 'EMP-0012', name: 'Liam Anderson',
    email: 'dave.mkt@company.com', designation: 'Content Strategist',
    department: mktDept._id, managerId: david._id,
    employmentType: 'part-time', status: 'active',
    dateOfJoining: new Date('2023-09-01'), salary: { base: 5500, currency: 'USD' },
  });

  // HR team
  const emma = await Employee.create({
    employeeId: 'EMP-0013', name: 'Emma Wilson',
    email: 'eve.hr@company.com', designation: 'HR Coordinator',
    department: hrDept._id, managerId: sarah._id,
    employmentType: 'full-time', status: 'active',
    dateOfJoining: new Date('2022-08-10'), salary: { base: 7500, currency: 'USD' },
  });
  const james = await Employee.create({
    employeeId: 'EMP-0014', name: 'James Davis',
    email: 'frank.hr@company.com', designation: 'Recruiter',
    department: hrDept._id, managerId: sarah._id,
    employmentType: 'contract', status: 'active',
    dateOfJoining: new Date('2024-01-08'), salary: { base: 6500, currency: 'USD' },
  });

  // ─── Users ────────────────────────────────────────────────────────────────
  const michaelUser = await User.create({
    name: michael.name, email: michael.email, passwordHash: hash,
    role: 'admin', employeeId: michael._id, isDirector: true,
  });
  const sarahUser = await User.create({
    name: sarah.name, email: sarah.email, passwordHash: hash,
    role: 'admin', employeeId: sarah._id,
  });
  const ryanUser = await User.create({
    name: ryan.name, email: ryan.email, passwordHash: hash,
    role: 'manager', employeeId: ryan._id,
  });
  const jessicaUser = await User.create({
    name: jessica.name, email: jessica.email, passwordHash: hash,
    role: 'manager', employeeId: jessica._id,
  });
  const davidUser = await User.create({
    name: david.name, email: david.email, passwordHash: hash,
    role: 'manager', employeeId: david._id,
  });

  const empUsers: Record<string, mongoose.Document> = {};
  for (const [emp, name] of [
    [sophia, 'sophiaUser'], [ethan, 'ethanUser'], [lucas, 'lucasUser'],
    [olivia, 'oliviaUser'], [noah, 'noahUser'],
    [ava, 'avaUser'], [liam, 'liamUser'],
    [emma, 'emmaUser'], [james, 'jamesUser'],
  ] as const) {
    empUsers[name] = await User.create({
      name: emp.name, email: emp.email, passwordHash: hash,
      role: 'employee', employeeId: emp._id,
    });
  }

  console.log('Users and employees seeded.');

  // ─── Leave Requests ───────────────────────────────────────────────────────
  // Covers past approved, pending, rejected, and upcoming — all employees
  await LeaveRequest.insertMany([
    // Approved historical
    { employeeId: sophia._id, type: 'sick',   startDate: new Date('2025-11-04'), endDate: new Date('2025-11-05'), reason: 'Flu with fever; doctor advised rest for two days.', status: 'approved', reviewedBy: ryan._id, reviewedAt: new Date('2025-11-03') },
    { employeeId: ethan._id,  type: 'casual', startDate: new Date('2025-12-23'), endDate: new Date('2025-12-24'), reason: 'Travel for family year-end gathering.', status: 'approved', reviewedBy: ryan._id, reviewedAt: new Date('2025-12-20') },
    { employeeId: lucas._id,  type: 'earned', startDate: new Date('2026-01-20'), endDate: new Date('2026-01-24'), reason: 'Annual holiday trip to Bali.', status: 'approved', reviewedBy: ryan._id, reviewedAt: new Date('2026-01-15') },
    { employeeId: olivia._id, type: 'sick',   startDate: new Date('2026-02-10'), endDate: new Date('2026-02-11'), reason: 'Migraine; unable to work on screens.', status: 'approved', reviewedBy: jessica._id, reviewedAt: new Date('2026-02-09') },
    { employeeId: ava._id,    type: 'earned', startDate: new Date('2025-12-26'), endDate: new Date('2026-01-02'), reason: 'Year-end break and family time.', status: 'approved', reviewedBy: david._id, reviewedAt: new Date('2025-12-22') },
    { employeeId: emma._id,   type: 'casual', startDate: new Date('2026-03-14'), endDate: new Date('2026-03-14'), reason: 'Personal appointment, half-day requested.', status: 'approved', reviewedBy: sarah._id, reviewedAt: new Date('2026-03-13') },
    { employeeId: james._id,  type: 'sick',   startDate: new Date('2026-04-07'), endDate: new Date('2026-04-08'), reason: 'Food poisoning; confirmed by GP note.', status: 'approved', reviewedBy: sarah._id, reviewedAt: new Date('2026-04-06') },
    // Manager leave approved by admin
    { employeeId: ryan._id,   type: 'earned', startDate: new Date('2026-05-19'), endDate: new Date('2026-05-23'), reason: 'Planned vacation with family in Europe.', status: 'approved', reviewedBy: michael._id, reviewedAt: new Date('2026-05-15') },
    { employeeId: david._id,  type: 'casual', startDate: new Date('2026-03-28'), endDate: new Date('2026-03-28'), reason: 'Child school event attendance.', status: 'approved', reviewedBy: sarah._id, reviewedAt: new Date('2026-03-27') },
    // Rejected
    { employeeId: liam._id,   type: 'earned', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-07'), reason: 'Planned trip; no coverage arranged.', status: 'rejected', reviewedBy: david._id, reviewedAt: new Date('2026-05-28') },
    { employeeId: noah._id,   type: 'casual', startDate: new Date('2026-05-05'), endDate: new Date('2026-05-06'), reason: 'Personal errands.', status: 'rejected', reviewedBy: jessica._id, reviewedAt: new Date('2026-05-04') },
    // Pending
    { employeeId: ethan._id,  type: 'sick',   startDate: new Date('2026-07-10'), endDate: new Date('2026-07-11'), reason: 'Routine medical procedure scheduled.', status: 'pending' },
    { employeeId: olivia._id, type: 'earned', startDate: new Date('2026-08-04'), endDate: new Date('2026-08-08'), reason: 'Summer holiday with partner.', status: 'pending' },
    { employeeId: ava._id,    type: 'casual', startDate: new Date('2026-07-18'), endDate: new Date('2026-07-18'), reason: 'Moving house — packing day.', status: 'pending' },
    { employeeId: emma._id,   type: 'earned', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-05'), reason: 'Annual leave — already informed HR team.', status: 'pending' },
    { employeeId: lucas._id,  type: 'casual', startDate: new Date('2026-07-04'), endDate: new Date('2026-07-04'), reason: 'Independence Day long weekend.', status: 'pending' },
    { employeeId: jessica._id, type: 'earned', startDate: new Date('2026-08-18'), endDate: new Date('2026-08-22'), reason: 'Pre-planned vacation booked months ago.', status: 'pending' },
  ]);

  console.log('Leave requests seeded.');

  // ─── Payroll (12 months: Jul 2025 → Jun 2026) ────────────────────────────
  const PAY_PERIODS = [
    'July 2025','August 2025','September 2025',
    'October 2025','November 2025','December 2025',
    'January 2026','February 2026','March 2026',
    'April 2026','May 2026','June 2026',
  ];

  const allEmps = [michael, sarah, ryan, jessica, david, sophia, ethan, lucas, olivia, noah, ava, liam, emma, james];
  const rng = (seed: number) => ((seed * 1664525 + 1013904223) & 0xffffffff) >>> 0;

  const payrollRecords = allEmps.flatMap((emp, ei) => {
    const base = (emp.toObject().salary as { base?: number })?.base ?? 6000;
    return PAY_PERIODS.map((payPeriod, pi) => {
      const r = rng(ei * 100 + pi);
      const bonuses = Math.round((r % 800) + 100);
      const deductions = Math.round(((r >> 8) % 600) + 200);
      return { employeeId: emp._id, payPeriod, base, bonuses, deductions, netPay: base + bonuses - deductions, currency: 'USD' };
    });
  });
  await Payroll.insertMany(payrollRecords);
  console.log('Payroll records seeded.');

  // ─── Performance Reviews ──────────────────────────────────────────────────
  function reviewerFor(emp: typeof sophia): mongoose.Types.ObjectId {
    const dept = (emp.department as mongoose.Types.ObjectId).toString();
    if (dept === (engDept._id as mongoose.Types.ObjectId).toString()) return ryan._id as mongoose.Types.ObjectId;
    if (dept === (prodDept._id as mongoose.Types.ObjectId).toString()) return jessica._id as mongoose.Types.ObjectId;
    if (dept === (mktDept._id as mongoose.Types.ObjectId).toString()) return david._id as mongoose.Types.ObjectId;
    return sarah._id as mongoose.Types.ObjectId;
  }

  const reviewMap: [typeof sophia, keyof typeof RATINGS][] = [
    [sophia, 'sophia'], [ethan, 'ethan'], [lucas, 'lucas'],
    [olivia, 'olivia'], [noah, 'noah'],
    [ava, 'ava'], [liam, 'liam'],
    [emma, 'emma'], [james, 'james'],
    [ryan, 'ryan'], [jessica, 'jessica'], [david, 'david'], [sarah, 'sarah'],
  ];

  const perfReviews = reviewMap.flatMap(([emp, key]) =>
    PERIODS.map((period, i) => ({
      employeeId: emp._id,
      reviewerId: ['ryan','jessica','david','sarah'].includes(key)
        ? michaelUser._id
        : reviewerFor(emp),
      period,
      rating: RATINGS[key][i],
      notes: NOTES[key][i],
    }))
  );
  await PerformanceReview.insertMany(perfReviews);
  console.log('Performance reviews seeded.');

  // ─── Performance Quarters ─────────────────────────────────────────────────
  await PerformanceQuarter.insertMany([
    { period: 'Q1 2026', year: 2026, quarter: 1, dueDate: new Date('2026-05-31'), status: 'locked', startedBy: michaelUser._id },
    { period: 'Q2 2026', year: 2026, quarter: 2, dueDate: new Date('2026-09-30'), status: 'open',   startedBy: michaelUser._id },
  ]);
  console.log('Performance quarters seeded.');

  // ─── Milestones (spread across users) ────────────────────────────────────
  const michaelId = michaelUser._id.toString();
  const sarahId   = sarahUser._id.toString();
  const ryanId    = ryanUser._id.toString();
  const jessicaId = jessicaUser._id.toString();
  const davidId   = davidUser._id.toString();
  const sophiaId  = empUsers.sophiaUser._id.toString();
  const oliviaId  = empUsers.oliviaUser._id.toString();

  await Milestone.insertMany([
    // Company-wide (admin)
    { title: 'Achieve 99.9% Uptime SLA', description: 'Maintain system uptime above 99.9% across all production environments for the full quarter.', targetDate: new Date('2026-09-30'), status: 'in-progress', createdBy: michaelId },
    { title: 'Complete ISO 27001 Audit',  description: 'Pass the annual information security audit with zero critical findings.', targetDate: new Date('2026-08-15'), status: 'not-started', createdBy: michaelId },
    { title: 'Expand Headcount to 20',    description: 'Hire across Engineering, Product, and Marketing to reach 20 total employees by year-end.', targetDate: new Date('2026-12-31'), status: 'in-progress', createdBy: michaelId },
    { title: 'Annual Offsite Planning',   description: 'Organize the company-wide offsite for team building and 2027 strategic planning.', targetDate: new Date('2026-11-30'), status: 'not-started', createdBy: michaelId },
    // HR
    { title: 'HR Compliance Audit Q2',    description: 'Conduct internal HR compliance review for all employee records and processes.', targetDate: new Date('2026-07-31'), status: 'not-started', createdBy: sarahId },
    { title: 'Refresh Employee Handbook', description: 'Update the employee handbook to reflect new policies on remote work and leave.', targetDate: new Date('2026-06-30'), status: 'achieved',    createdBy: sarahId },
    // Engineering
    { title: 'Migrate to Node 22 LTS',    description: 'Upgrade all backend services to Node 22 LTS and resolve deprecated API usage.', targetDate: new Date('2026-08-31'), status: 'in-progress', createdBy: ryanId },
    { title: 'API Response Time < 200ms', description: 'Optimize critical API endpoints to consistently respond in under 200ms at P95.', targetDate: new Date('2026-09-15'), status: 'not-started', createdBy: ryanId },
    { title: 'CI/CD Pipeline Overhaul',   description: 'Reduce build times from 12 minutes to under 4 minutes with parallelization.', targetDate: new Date('2026-07-15'), status: 'achieved',    createdBy: ryanId },
    // Product
    { title: 'Ship Mobile App v1.0',       description: 'Launch the first version of the iOS and Android mobile application.', targetDate: new Date('2026-10-31'), status: 'not-started', createdBy: jessicaId },
    { title: 'User NPS Above 50',          description: 'Improve Net Promoter Score from current 38 to above 50 through UX improvements.', targetDate: new Date('2026-09-30'), status: 'in-progress', createdBy: jessicaId },
    // Marketing
    { title: 'Reach 10k Newsletter Subs',  description: 'Grow the company newsletter to 10,000 active subscribers through content campaigns.', targetDate: new Date('2026-12-31'), status: 'in-progress', createdBy: davidId },
    { title: 'Launch Referral Program',    description: 'Design and ship a customer referral program to drive organic acquisition.', targetDate: new Date('2026-08-01'), status: 'not-started', createdBy: davidId },
    // Individual contributors
    { title: 'Complete AWS Solutions Architect Cert', description: 'Pass the AWS SAA-C03 exam to strengthen cloud architecture skills.', targetDate: new Date('2026-10-01'), status: 'in-progress', createdBy: sophiaId },
    { title: 'Publish UX Case Study',      description: 'Write and publish a detailed case study of the onboarding redesign project.', targetDate: new Date('2026-08-30'), status: 'not-started', createdBy: oliviaId },
  ]);
  console.log('Milestones seeded.');

  // ─── Credentials summary ──────────────────────────────────────────────────
  console.log('\n=== Seed complete — password for all: Password@123 ===');
  const creds = [
    ['Company Director (admin, isDirector)', michael.email],
    ['HR Manager (admin)',                   sarah.email],
    ['Engineering Lead (manager)',           ryan.email],
    ['Product Manager (manager)',            jessica.email],
    ['Marketing Manager (manager)',          david.email],
    ['Senior Software Engineer',             sophia.email],
    ['Software Engineer',                    ethan.email],
    ['Frontend Engineer',                    lucas.email],
    ['UX Designer',                          olivia.email],
    ['Business Analyst',                     noah.email],
    ['Marketing Analyst',                    ava.email],
    ['Content Strategist',                   liam.email],
    ['HR Coordinator',                       emma.email],
    ['Recruiter',                            james.email],
  ];
  for (const [role, email] of creds) {
    console.log(`  ${role.padEnd(36)} ${email}`);
  }
}

async function seed(): Promise<void> {
  await connectDB();
  await seedData();
  await disconnectDB();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
