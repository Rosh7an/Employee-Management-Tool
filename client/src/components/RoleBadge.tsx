type Role = 'admin' | 'manager' | 'employee';

interface Props { role: Role; }

export function RoleBadge({ role }: Props) {
  return <span className={`role-${role}`}>{role}</span>;
}
