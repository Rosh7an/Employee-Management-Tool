import api from '../../lib/axios';

export interface LoginInput { email: string; password: string; }
export interface RegisterInput { name: string; email: string; password: string; confirmPassword: string; }
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = {
  login: (data: LoginInput) => api.post('/auth/login', data),
  register: (data: RegisterInput) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
};
