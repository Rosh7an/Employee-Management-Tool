import api from '../../lib/axios';

export interface AttendanceRecord {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string } | string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday';
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

export const attendanceApi = {
  list: (params?: { employeeId?: string; month?: number; year?: number; page?: number }) =>
    api.get('/attendance', { params }),
};
