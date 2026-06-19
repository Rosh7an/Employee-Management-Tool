import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/errorHandler';
import { swaggerSpec } from './swagger';

import authRoutes from './modules/auth/auth.routes';
import employeeRoutes from './modules/employees/employees.routes';
import departmentRoutes from './modules/departments/departments.routes';
import leaveRoutes from './modules/leave/leave.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import auditRoutes from './modules/audit/audit.routes';
import performanceRoutes from './modules/performance/performance.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import milestoneRoutes from './modules/milestone/milestone.routes';

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const app = express();

app.use(cors({
  origin: env.NODE_ENV === 'production' ? false : DEV_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/milestones', milestoneRoutes);

app.use(errorHandler);

export default app;
