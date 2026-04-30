import request from '@/utils/request';

export interface AdminLoginParams {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
}

export interface LoginResult {
  token: string;
  expiresIn: number;
  admin: AdminProfile;
}

export interface AdminProfile {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  isSuper: boolean;
  email?: string;
  phone?: string;
  roles?: Array<{ id: number; name: string }>;
}

export interface MenuNode {
  id: number;
  parentId: number;
  name: string;
  type: 1 | 2 | 3; // 1目录 2菜单 3按钮
  path?: string;
  component?: string;
  permission?: string;
  icon?: string;
  sort: number;
  visible: number;
  status: number;
  children?: MenuNode[];
}

export const authApi = {
  login: (data: AdminLoginParams) =>
    request.post<LoginResult>('/admin/auth/login', data, { skipAuth: true }),
  logout: () => request.post<void>('/admin/auth/logout'),
  profile: () => request.get<AdminProfile>('/admin/auth/profile'),
  updateProfile: (data: Partial<Pick<AdminProfile, 'nickname' | 'avatar' | 'email' | 'phone'>>) =>
    request.post<void>('/admin/auth/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request.post<void>('/admin/auth/change-password', data),
  menu: () => request.get<MenuNode[]>('/admin/auth/menu'),
  ability: () => request.get<string[]>('/admin/auth/ability'),
};
