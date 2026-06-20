import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './layouts/Shell';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EmployeeList } from './features/employees/EmployeeList';
import { EmployeeDetail } from './features/employees/EmployeeDetail';
import { DepartmentList } from './features/departments/DepartmentList';
import { DepartmentDetailPage } from './features/departments/DepartmentDetailPage';
import { LeaveManagement } from './features/leave/LeaveManagement';
import { LeaveDetailPage } from './features/leave/LeaveDetailPage';
import { PayrollPage } from './features/payroll/PayrollPage';
import { AuditLogPage } from './features/audit/AuditLogPage';
import { PerformancePage } from './features/performance/PerformancePage';
import { ProfilePage } from './features/auth/ProfilePage';
import { MilestonePage } from './features/milestones/MilestonePage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'employees', element: <EmployeeList /> },
      { path: 'employees/:id', element: <EmployeeDetail /> },
      { path: 'departments', element: <DepartmentList /> },
      { path: 'departments/:id', element: <DepartmentDetailPage /> },
      { path: 'leave', element: <LeaveManagement /> },
      { path: 'leave/:id', element: <LeaveDetailPage /> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'audit', element: <AuditLogPage /> },
      { path: 'performance', element: <PerformancePage /> },
      { path: 'milestones', element: <MilestonePage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
