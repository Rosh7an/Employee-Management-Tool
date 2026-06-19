import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Employee Management Tool API',
      version: '1.0.0',
      description: 'REST API for the Employee Management Tool',
    },
    servers: [{ url: 'http://localhost:5001/api', description: 'Local dev' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Employee: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            employeeId: { type: 'string', example: 'EMP-001' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            designation: { type: 'string' },
            department: { type: 'string', description: 'Department _id' },
            managerId: { type: 'string', description: 'Employee _id of manager' },
            status: { type: 'string', enum: ['active', 'on-leave', 'terminated'] },
            employmentType: { type: 'string', enum: ['full-time', 'part-time', 'contract'] },
            dateOfJoining: { type: 'string', format: 'date' },
            salary: {
              type: 'object',
              properties: {
                base: { type: 'number' },
                currency: { type: 'string', default: 'USD' },
              },
            },
          },
        },
        Department: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            managerId: { type: 'string' },
          },
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            employeeId: { type: 'string' },
            type: { type: 'string', enum: ['annual', 'sick', 'unpaid', 'maternity', 'paternity', 'other'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          },
        },
        Payroll: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            employeeId: { type: 'string' },
            payPeriod: { type: 'string', example: 'June 2025' },
            base: { type: 'number' },
            bonuses: { type: 'number' },
            deductions: { type: 'number' },
            netPay: { type: 'number', readOnly: true },
          },
        },
        PerformanceReview: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            employeeId: { type: 'string' },
            reviewerId: { type: 'string' },
            period: { type: 'string', example: 'Q1 2025' },
            rating: { type: 'number', minimum: 1, maximum: 5 },
            notes: { type: 'string' },
          },
        },
        Milestone: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            targetDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['not-started', 'in-progress', 'achieved'] },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            actorId: { type: 'string' },
            actorRole: { type: 'string' },
            action: { type: 'string' },
            targetModel: { type: 'string' },
            targetId: { type: 'string' },
            ip: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Registered successfully' },
            409: { description: 'Email already in use', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive a JWT',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'JWT token returned' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          responses: {
            200: { description: 'User + linked employee record' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password for the authenticated user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword', 'confirmPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                    confirmPassword: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password changed' },
            400: { description: 'Validation error' },
            401: { description: 'Current password incorrect' },
          },
        },
      },

      // ── Employees ─────────────────────────────────────────────────
      '/employees': {
        get: {
          tags: ['Employees'],
          summary: 'List employees (role-scoped)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'on-leave', 'terminated'] } },
            { name: 'department', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Paginated employee list' } },
        },
        post: {
          tags: ['Employees'],
          summary: 'Create a new employee (admin only)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } },
          },
          responses: {
            201: { description: 'Employee created' },
            403: { description: 'Forbidden' },
            409: { description: 'Email conflict' },
          },
        },
      },
      '/employees/{id}': {
        get: {
          tags: ['Employees'],
          summary: 'Get employee by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Employee record' }, 404: { description: 'Not found' } },
        },
        patch: {
          tags: ['Employees'],
          summary: 'Update employee (field-restricted by role)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } },
          },
          responses: { 200: { description: 'Updated' }, 403: { description: 'Forbidden field' } },
        },
        delete: {
          tags: ['Employees'],
          summary: 'Terminate employee (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Terminated' }, 403: { description: 'Forbidden' } },
        },
      },

      // ── Departments ───────────────────────────────────────────────
      '/departments': {
        get: {
          tags: ['Departments'],
          summary: 'List all departments',
          responses: { 200: { description: 'Department list' } },
        },
        post: {
          tags: ['Departments'],
          summary: 'Create department (admin only)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Department' } } },
          },
          responses: { 201: { description: 'Created' }, 403: { description: 'Forbidden' } },
        },
      },
      '/departments/{id}': {
        get: {
          tags: ['Departments'],
          summary: 'Get department by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Department record' }, 404: { description: 'Not found' } },
        },
        patch: {
          tags: ['Departments'],
          summary: 'Update department (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Department' } } },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Departments'],
          summary: 'Delete department (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      // ── Leave ─────────────────────────────────────────────────────
      '/leave': {
        get: {
          tags: ['Leave'],
          summary: 'List leave requests (role-scoped)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
          ],
          responses: { 200: { description: 'Paginated leave list' } },
        },
        post: {
          tags: ['Leave'],
          summary: 'Submit a leave request',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LeaveRequest' } } },
          },
          responses: { 201: { description: 'Submitted' }, 409: { description: 'Overlapping leave' } },
        },
      },
      '/leave/{id}': {
        patch: {
          tags: ['Leave'],
          summary: 'Approve or reject a leave request (admin/manager)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', enum: ['approved', 'rejected'] } },
                },
              },
            },
          },
          responses: { 200: { description: 'Status updated' }, 403: { description: 'Forbidden' } },
        },
      },

      // ── Payroll ───────────────────────────────────────────────────
      '/payroll': {
        get: {
          tags: ['Payroll'],
          summary: 'List payroll records (role-scoped)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'employeeId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Paginated payroll list' } },
        },
        post: {
          tags: ['Payroll'],
          summary: 'Create payroll record (admin only)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Payroll' } } },
          },
          responses: {
            201: { description: 'Created — netPay computed server-side' },
            409: { description: 'Duplicate pay period' },
          },
        },
      },

      // ── Performance ───────────────────────────────────────────────
      '/performance': {
        get: {
          tags: ['Performance'],
          summary: 'List performance reviews (role-scoped)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'employeeId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Paginated review list' } },
        },
        post: {
          tags: ['Performance'],
          summary: 'Create a performance review',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PerformanceReview' } } },
          },
          responses: {
            201: { description: 'Created' },
            409: { description: 'Duplicate review for period' },
          },
        },
      },
      '/performance/employee/{empId}': {
        get: {
          tags: ['Performance'],
          summary: 'Get all reviews for a specific employee',
          parameters: [{ name: 'empId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Review list' } },
        },
      },
      '/performance/{id}': {
        patch: {
          tags: ['Performance'],
          summary: 'Update a performance review',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PerformanceReview' } } },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Performance'],
          summary: 'Delete a performance review',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/performance/quarters': {
        get: {
          tags: ['Performance'],
          summary: 'List all review quarters',
          responses: { 200: { description: 'Quarter list' } },
        },
        post: {
          tags: ['Performance'],
          summary: 'Open a new review quarter (admin only)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['period', 'dueDate'],
                  properties: {
                    period: { type: 'string', example: 'Q2 2025' },
                    dueDate: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Quarter created' }, 409: { description: 'Quarter already exists' } },
        },
      },
      '/performance/quarters/{id}/lock': {
        patch: {
          tags: ['Performance'],
          summary: 'Lock a review quarter (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Locked' } },
        },
      },
      '/performance/quarters/{id}/unlock': {
        patch: {
          tags: ['Performance'],
          summary: 'Unlock a review quarter (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Unlocked' } },
        },
      },

      // ── Milestones ────────────────────────────────────────────────
      '/milestones': {
        get: {
          tags: ['Milestones'],
          summary: 'List milestones (role-scoped)',
          responses: { 200: { description: 'Milestone list' } },
        },
        post: {
          tags: ['Milestones'],
          summary: 'Create a milestone',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Milestone' } } },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
      '/milestones/{id}': {
        patch: {
          tags: ['Milestones'],
          summary: 'Update a milestone',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Milestone' } } },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Milestones'],
          summary: 'Delete a milestone',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      // ── Audit ─────────────────────────────────────────────────────
      '/audit': {
        get: {
          tags: ['Audit'],
          summary: 'List audit logs (admin only)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'actor', in: 'query', description: 'Filter by actor name', schema: { type: 'string' } },
            { name: 'actorRole', in: 'query', schema: { type: 'string', enum: ['admin', 'manager', 'employee'] } },
            { name: 'action', in: 'query', schema: { type: 'string' } },
            { name: 'targetModel', in: 'query', schema: { type: 'string' } },
            { name: 'ip', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Paginated audit log' } },
        },
      },

      // ── Dashboard ─────────────────────────────────────────────────
      '/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard statistics',
          responses: { 200: { description: 'Aggregated stats' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
