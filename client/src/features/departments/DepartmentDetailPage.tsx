import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Crown, Layers } from 'lucide-react';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { departmentsApi, DepartmentDetail } from './departments.api';

/* ── Tree node type ─────────────────────────────── */
interface TreeNode {
  _id: string;
  name: string;
  employeeId: string;
  designation: string;
  employmentType: string;
  status: string;
  isRoot: boolean;
  inDept: boolean;
  reportsTo: string | null;
  children: TreeNode[];
}

function buildTree(detail: DepartmentDetail): TreeNode | null {
  const mgr = detail.managerId;
  if (!mgr) return null;

  const nodeMap = new Map<string, TreeNode>();

  for (const emp of detail.employees) {
    const reportsToName = (emp.managerId as { _id: string; name: string } | null)?.name ?? null;
    nodeMap.set(emp._id, {
      _id: emp._id,
      name: emp.name,
      employeeId: emp.employeeId,
      designation: emp.designation,
      employmentType: emp.employmentType,
      status: emp.status,
      isRoot: emp._id === mgr._id,
      inDept: true,
      reportsTo: reportsToName,
      children: [],
    });
  }

  let root = nodeMap.get(mgr._id);
  if (!root) {
    const rootReportsTo = (mgr as typeof mgr & { managerId?: { name: string } | null }).managerId?.name ?? null;
    root = {
      _id: mgr._id,
      name: mgr.name,
      employeeId: mgr.employeeId ?? '',
      designation: mgr.designation ?? 'Manager',
      employmentType: 'full-time',
      status: 'active',
      isRoot: true,
      inDept: false,
      reportsTo: rootReportsTo,
      children: [],
    };
    nodeMap.set(mgr._id, root);
  } else {
    root.isRoot = true;
    // Deep-populate gives the authoritative manager-of-the-manager (e.g. Director for HR Manager).
    // Override whatever single-level populate returned to ensure "Reports to" is always correct.
    const deepReportsTo = (mgr as typeof mgr & { managerId?: { name: string } | null }).managerId?.name ?? null;
    root.reportsTo = deepReportsTo;
  }

  for (const emp of detail.employees) {
    if (emp._id === mgr._id) continue;
    const node = nodeMap.get(emp._id)!;
    const parentId = (emp.managerId as { _id: string } | null)?._id;
    const parent = parentId ? nodeMap.get(parentId) : null;
    (parent ?? root).children.push(node);
  }

  return root;
}

/* ── Helpers ─────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Org node card ───────────────────────────────── */
function OrgNodeCard({ node, onView }: { node: TreeNode; onView: (id: string) => void }) {
  const cls = `org-node${node.isRoot ? ' org-node--manager' : ''}`;
  return (
    <div className={cls}>
      {node.isRoot && (
        <span className="org-manager-crown" title="Department Manager">
          <Crown size={14} color="#f59e0b" />
        </span>
      )}
      <div className="org-node-avatar">{initials(node.name)}</div>
      <div className="org-node-name" title={node.name}>{node.name}</div>
      <div className="org-node-desig" title={node.designation}>{node.designation}</div>
      {node.employeeId && <div className="org-node-id">{node.employeeId}</div>}
      <span className="org-node-badge" style={{ textTransform: 'capitalize' }}>
        {node.employmentType.replace('-', ' ')}
      </span>
      {node.reportsTo && (
        <div className="org-node-reports-to" title={`Reports to ${node.reportsTo}`}>
          ↑ {node.reportsTo}
        </div>
      )}
      {node.inDept && (
        <button className="org-node-view-btn" onClick={() => onView(node._id)}>
          View Profile →
        </button>
      )}
    </div>
  );
}

/* ── Recursive tree renderer ─────────────────────── */
function OrgBranch({ node, onView }: { node: TreeNode; onView: (id: string) => void }) {
  return (
    <li className="org-li">
      <OrgNodeCard node={node} onView={onView} />
      {node.children.length > 0 && (
        <ul className="org-ul">
          {node.children.map((child) => (
            <OrgBranch key={child._id} node={child} onView={onView} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── Circular progress ring ──────────────────────── */
function ProgressRing({ value }: { value: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={38} height={38} viewBox="0 0 38 38" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={19} cy={19} r={r} fill="none" stroke="var(--s2)" strokeWidth={3} />
      <circle
        cx={19} cy={19} r={r}
        fill="none"
        stroke="#09090b"
        strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Stat pill ───────────────────────────────────── */
function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: 'var(--s0)', border: '1px solid var(--s3)',
      borderRadius: 10, padding: '12px 18px', minWidth: 130,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>{value}</span>
    </div>
  );
}

/* ── Department detail page ──────────────────────── */
export function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['department', id],
    queryFn: () => departmentsApi.getById(id!).then((r) => r.data.data as DepartmentDetail),
    enabled: !!id,
  });

  const tree = data ? buildTree(data) : null;

  return (
    <PageWrapper
      title={data?.name ?? 'Department'}
      action={
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/departments')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={14} /> Departments
        </button>
      }
    >
      {error && <ErrorBanner error={error} />}
      {isLoading && <div className="loading-page"><span className="spinner spinner-dark" /></div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Department info */}
          <div style={{
            background: 'var(--s0)', border: '1px solid var(--s3)',
            borderRadius: 12, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', marginBottom: 6, letterSpacing: '-0.3px' }}>
                  {data.name}
                </h2>
                {data.description && (
                  <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6, maxWidth: 560 }}>{data.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <StatPill label="Headcount" value={
                  <><Users size={17} style={{ color: 'var(--t2)' }} />{data.headcount}</>
                } />
                <StatPill label="Ongoing Projects" value={
                  <><Layers size={17} style={{ color: 'var(--t2)' }} />{data.ongoingProjects}</>
                } />
                <StatPill label="Progression" value={
                  <><ProgressRing value={data.progression} />{data.progression}%</>
                } />
              </div>
            </div>
          </div>

          {/* Hierarchy org chart */}
          <div style={{
            background: 'var(--s0)', border: '1px solid var(--s3)',
            borderRadius: 12, padding: '20px 24px',
          }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Hierarchy
              </span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>· click "View Profile →" on any employee to open their page</span>
            </div>

            {!tree && (
              <p style={{ fontSize: 13.5, color: 'var(--t3)' }}>
                No manager assigned — assign a manager to visualise the hierarchy.
              </p>
            )}
            {tree && data.employees.length === 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--t3)' }}>No active employees in this department yet.</p>
            )}
            {tree && (
              <div className="org-tree">
                <ul className="org-ul org-root">
                  <OrgBranch node={tree} onView={(empId) => navigate(`/employees/${empId}`)} />
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
