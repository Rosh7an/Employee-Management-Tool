type Status = 'active' | 'on-leave' | 'terminated' | 'pending' | 'approved' | 'rejected';

const LABEL: Record<Status, string> = {
  active: 'Active',
  'on-leave': 'On Leave',
  terminated: 'Terminated',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

interface Props { status: Status; }

export function StatusLabel({ status }: Props) {
  return <span className={`badge badge-${status}`}>{LABEL[status] ?? status}</span>;
}
