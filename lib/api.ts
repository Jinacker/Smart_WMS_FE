// lib/api.ts
import axios from 'axios';
import { Company } from '@/components/company/company-list';
import { Item } from '@/components/item/item-list';
import { InOutRecord, InventoryItem } from '@/components/utils';
import { User } from '@/app/(main)/layout';

// ---------- 타입들 (네 코드 그대로 사용) ----------
export interface ItemResponse {
  itemId: number; itemName: string; itemCode: string; itemGroup: string;
  spec: string; unit: string; unitPriceIn: number; unitPriceOut: number; createdAt: string;
}
export interface UserResponse {
  userId: number; username: string; email: string; fullName: string; role: string; status: string;
  lastLogin: string; joinedAt: string;
}
export interface InOutOrderItemResponse {
  itemId: number; itemCode: string; itemName: string; specification: string;
  requestedQuantity: number; actualQuantity: number | null;
}
export interface InOutOrderResponse {
  orderId: number;
  type: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'RESERVED';
  companyId: number; companyCode: string; companyName: string;
  items: InOutOrderItemResponse[]; expectedDate: string; createdAt: string; updatedAt: string;
}
export interface InventoryResponse {
  itemId: number; itemName: string; locationCode: string; quantity: number; lastUpdated: string;
}
export interface ScheduleResponse {
  scheduleId: number; title: string; startTime: string; endTime: string;
  type: "INBOUND" | "OUTBOUND" | "INVENTORY_CHECK" | "MEETING" | "ETC";
}
export interface DashboardSummaryResponse {
  totalItems: number; totalInventory: number; inboundPending: number; outboundPending: number;
}
export interface DashboardData {
  items: ItemResponse[]; users: UserResponse[]; orders: InOutOrderResponse[];
  inventory: InventoryResponse[]; schedules: ScheduleResponse[];
  summary: DashboardSummaryResponse; totalLoadTime: number;
}

// ---------- axios 인스턴스 ----------
/**
 * 배포(Vercel): vercel.json 리라이트로 /api/* → https://smart-wms-be.p-e.kr/api/*
 * 로컬(dev): next.config.js rewrites로 /api/* → http://localhost:8080/api/*
 */
const apiClient = axios.create({
  baseURL: '', // 절대 URL 금지. 항상 '/api/...' 상대경로 사용
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// 공통 프리벤션: 캐시 방지 + Authorization 토큰(있으면)
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  config.params = { ...(config.params || {}), _t: Date.now() };
  return config;
});

// 응답 헬퍼
async function handleResponse<T>(response: { data: T }): Promise<T> {
  return response.data;
}

// ---------- 대시보드 ----------
export async function fetchDashboardSummary(): Promise<any> {
  const res = await apiClient.get('/api/dashboard/summary');
  return handleResponse(res);
}

// ---------- 공통 api 래퍼 ----------
export const api = {
  post: async (url: string, data: any) => (await apiClient.post(url, data)).data,
  get: async (url: string) => (await apiClient.get(url)).data
};

// ---------- Auth (CSRF 호출 제거) ----------
export async function login(username: string, password: string): Promise<{ user: User; message: string }> {
  // 백엔드가 CSRF 엔드포인트 제공 안 하므로, 바로 로그인 호출
  const response = await apiClient.post('/api/auth/login', { username, password });
  const backendData = response.data;

  return {
    message: backendData.message ?? 'ok',
    user: {
      id: backendData.user.user_id,
      username: backendData.user.username,
      email: backendData.user.email,
      fullName: backendData.user.full_name,
      role: backendData.user.role,
      status: 'ACTIVE',
      lastLogin: new Date().toLocaleString('ko-KR'),
      createdAt: backendData.user.joinedAt
        ? new Date(backendData.user.joinedAt).toLocaleDateString('ko-KR')
        : new Date().toLocaleDateString('ko-KR'),
    },
  };
}

export async function checkSession(): Promise<{ user: User }> {
  const res = await apiClient.get('/api/auth/me');
  const d = res.data;
  return {
    user: {
      id: d.user_id, username: d.username, email: d.email, fullName: d.full_name,
      role: d.role, status: 'ACTIVE',
      lastLogin: new Date().toLocaleString('ko-KR'),
      createdAt: d.joinedAt ? new Date(d.joinedAt).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR'),
    }
  };
}
export async function logout() {
  await apiClient.post('/api/auth/logout');
}

// ---------- Companies ----------
export async function fetchCompanies(): Promise<Company[]> {
  const res = await apiClient.get('/api/companies'); return handleResponse(res);
}
export async function createCompany(data: Omit<Company, 'companyId'>): Promise<Company> {
  return handleResponse(await apiClient.post('/api/companies', data));
}
export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  const numericId = Number(id); if (isNaN(numericId)) throw new Error('Invalid company ID');
  return handleResponse(await apiClient.put(`/api/companies/${numericId}`, data));
}
export async function deleteCompany(id: string): Promise<void> {
  const numericId = Number(id); if (isNaN(numericId)) throw new Error('Invalid company ID');
  await apiClient.delete(`/api/companies/${numericId}`);
}

// ---------- Racks ----------
export interface Rack { id: number; rackCode: string; section: string; position: number; description?: string; isActive: boolean; createdAt: string; updatedAt: string; inventories?: RackInventoryItem[]; }
export interface RackMapResponse { id: number; rackCode: string; section: string; position: number; isActive: boolean; hasInventory: boolean; }
export async function fetchRacks(): Promise<Rack[]> {
  return handleResponse(await apiClient.get('/api/racks'));
}
export async function fetchRacksForMap(): Promise<RackMapResponse[]> {
  return handleResponse(await apiClient.get('/api/racks'));
}
export interface RackInventoryItem { id: number; rackCode: string; itemId: number; itemCode: string; itemName: string; quantity: number; lastUpdated: string; }
export async function fetchRackInventory(rackCode: string): Promise<RackInventoryItem[]> {
  return handleResponse(await apiClient.get(`/api/racks/${rackCode}/inventory`));
}

// ---------- Items ----------
export async function fetchItems(): Promise<Item[]> {
  return handleResponse(await apiClient.get('/api/items'));
}
export async function createItem(data: Omit<Item, 'itemId'>): Promise<Item> {
  return handleResponse(await apiClient.post('/api/items', data));
}
export async function updateItem(id: string, data: Partial<Item>): Promise<Item> {
  const numericId = Number(id); if (isNaN(numericId)) throw new Error('Invalid item ID');
  return handleResponse(await apiClient.put(`/api/items/${numericId}`, data));
}
export async function deleteItem(id: string | number): Promise<void> {
  const numericId = Number(id); if (isNaN(numericId) || numericId <= 0) throw new Error(`Invalid item ID: ${id}`);
  await apiClient.delete(`/api/items/${numericId}`);
}

// ---------- InOut ----------
export async function fetchRawInOutData(): Promise<any[]> {
  return handleResponse(await apiClient.get('/api/inout/orders'));
}
export async function fetchInOutData(): Promise<InOutRecord[]> {
  const all = await fetchRawInOutData();
  const completed = all.filter((r) => r.status === 'COMPLETED');
  return completed.flatMap((record: any, idx: number) => record.items.map((item: any, i: number) => {
    const dt = record.createdAt || record.updatedAt || new Date().toISOString();
    const [date, timeFull] = dt.split('T'); const time = (timeFull || '').substring(0, 8) || '00:00:00';
    return {
      id: `${record.orderId}-${i}`,
      type: (record.type || 'INBOUND').toLowerCase(),
      productName: item.itemName || 'N/A',
      sku: item.itemCode || 'N/A',
      individualCode: `ORDER-${record.orderId}-${item.itemId}`,
      specification: item.specification || 'N/A',
      quantity: item.requestedQuantity || 0,
      location: 'A-01',
      company: record.companyName || 'N/A',
      companyCode: record.companyCode || 'N/A',
      status: record.status === 'COMPLETED' ? '완료' : '진행 중',
      destination: '-',
      date, time, notes: '-'
    };
  }));
}
export interface InOutOrderItem { itemId: number; quantity: number; }
export interface InOutOrderRequest {
  type: 'INBOUND' | 'OUTBOUND'; companyId: number; expectedDate: string; notes?: string;
  items: InOutOrderItem[]; locationCode?: string;
}
export async function createInboundOrder(data: { itemId: number; quantity: number; companyId?: number; expectedDate?: string; notes?: string; locationCode?: string }): Promise<any> {
  const body: InOutOrderRequest = {
    type: 'INBOUND',
    companyId: data.companyId || 1,
    expectedDate: data.expectedDate || new Date().toISOString().split('T')[0],
    locationCode: data.locationCode || 'A-01',
    notes: data.notes,
    items: [{ itemId: data.itemId, quantity: data.quantity }]
  };
  return handleResponse(await apiClient.post('/api/inout/orders', body));
}
export async function createOutboundOrder(orderData: {
  companyId: number; expectedDate: string; notes?: string; type: string; status: string;
  items: Array<{ itemId: number; requestedQuantity: number; locationCode: string; }>;
}): Promise<any> {
  const body: InOutOrderRequest = {
    type: 'OUTBOUND',
    companyId: orderData.companyId,
    expectedDate: orderData.expectedDate,
    locationCode: orderData.items[0]?.locationCode || 'A-01',
    notes: orderData.notes,
    items: orderData.items.map(it => ({ itemId: it.itemId, quantity: it.requestedQuantity }))
  };
  return handleResponse(await apiClient.post('/api/inout/orders', body));
}
export async function updateOrderStatus(orderId: string, status: string): Promise<any> {
  const numericOrderId = Number(orderId.split('-')[0]);
  if (isNaN(numericOrderId)) throw new Error('Invalid order ID');
  return handleResponse(await apiClient.put(`/api/inout/orders/${numericOrderId}/status`, { status: status.toUpperCase() }));
}
export async function fetchPendingOrders(): Promise<InOutOrderResponse[]> {
  const res = await apiClient.get('/api/inout/orders', { params: { status: 'PENDING' } });
  const result = await handleResponse(res); return Array.isArray(result) ? result : [];
}
export async function fetchReservedOrders(): Promise<InOutOrderResponse[]> {
  const res = await apiClient.get('/api/inout/orders', { params: { status: 'RESERVED' } });
  const result = await handleResponse(res); return Array.isArray(result) ? result : [];
}
export async function cancelInOutOrder(orderId: string | number): Promise<any> {
  const numericOrderId = typeof orderId === 'string' ? Number(orderId.split('-')[0]) : Number(orderId);
  if (isNaN(numericOrderId)) throw new Error('Invalid order ID');
  return handleResponse(await apiClient.put(`/api/inout/orders/${numericOrderId}/cancel`));
}
export async function updateInOutRecord(id: string, data: Partial<InOutRecord>): Promise<InOutRecord> {
  const numericOrderId = Number((id.includes('-') ? id.split('-')[0] : id));
  if (isNaN(numericOrderId)) throw new Error('Invalid InOut record ID');
  try {
    return handleResponse(await apiClient.put(`/api/inout/orders/${numericOrderId}/status`, data));
  } catch (e: any) {
    if (e?.response?.status === 405) {
      try { return handleResponse(await apiClient.patch(`/api/inout/orders/${numericOrderId}`, data)); }
      catch (e2: any) {
        if (e2?.response?.status === 405) {
          return handleResponse(await apiClient.put(`/api/inout/orders/${numericOrderId}`, data));
        }
        throw e2;
      }
    }
    throw e;
  }
}

// ---------- Inventory ----------
export interface BackendInventoryResponse {
  itemId: number; itemName: string; locationCode: string; quantity: number; lastUpdated: string;
}
export async function fetchRawInventoryData(): Promise<BackendInventoryResponse[]> {
  return handleResponse(await apiClient.get('/api/inventory'));
}
export async function fetchInventoryData(): Promise<InventoryItem[]> {
  const backend = await fetchRawInventoryData();
  if (!backend || backend.length === 0) return [];
  return backend.map((b, i) => {
    const status = b.quantity <= 0 ? '위험' : (b.quantity <= 10 ? '부족' : '정상');
    return {
      id: i + 1, name: b.itemName, sku: `SKU-${b.itemId}`, specification: 'N/A',
      quantity: b.quantity, inboundScheduled: 0, outboundScheduled: 0,
      location: b.locationCode, status, lastUpdate: new Date(b.lastUpdated).toLocaleString('ko-KR')
    };
  });
}

// ---------- Schedules ----------
export interface Schedule {
  scheduleId: number; title: string; startTime: string; endTime: string;
  type: "INBOUND" | "OUTBOUND" | "INVENTORY_CHECK" | "MEETING" | "ETC";
}
export interface CreateScheduleRequest {
  title: string; startTime: string; endTime: string;
  type: "INBOUND" | "OUTBOUND" | "INVENTORY_CHECK" | "MEETING" | "ETC";
}
export async function fetchSchedules(startDate?: string, endDate?: string): Promise<Schedule[]> {
  const params: { start_date?: string; end_date?: string } = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return handleResponse(await apiClient.get('/api/schedules', { params }));
}
export async function createSchedule(data: CreateScheduleRequest): Promise<Schedule> {
  return handleResponse(await apiClient.post('/api/schedules', data));
}
export async function deleteSchedule(id: string | number): Promise<void> {
  const n = Number(id); if (isNaN(n) || n <= 0) throw new Error(`Invalid schedule ID: ${id}`);
  await apiClient.delete(`/api/schedules/${n}`);
}

// ---------- Users ----------
export async function fetchUsers(): Promise<User[]> {
  const res = await apiClient.get('/api/users'); const backendUsers = await handleResponse(res);
  return backendUsers.map((u: any) => ({
    id: u.userId, username: u.username, email: u.email, fullName: u.fullName, role: u.role, status: u.status,
    lastLogin: u.lastLogin
      ? new Date(u.lastLogin).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '접속 기록 없음',
    createdAt: u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR'),
  }));
}
export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  const res = await apiClient.post('/api/users', {
    username: data.username, email: data.email, fullName: data.fullName, password: 'defaultPassword123', role: data.role
  });
  const u = await handleResponse(res);
  return {
    id: u.userId, username: u.username, email: u.email, fullName: u.fullName, role: u.role, status: u.status,
    lastLogin: u.lastLogin
      ? new Date(u.lastLogin).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '접속 기록 없음',
    createdAt: u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR'),
  };
}
export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const n = Number(id); if (isNaN(n)) throw new Error('Invalid user ID');
  const payload: any = {};
  if (data.username) payload.username = data.username;
  if (data.email) payload.email = data.email;
  if (data.fullName) payload.fullName = data.fullName;
  if (data.role) payload.role = data.role;
  if (data.status) payload.status = data.status;
  const res = await apiClient.put(`/api/users/${n}`, payload);
  const u = await handleResponse(res);
  return {
    id: u.userId, username: u.username, email: u.email, fullName: u.fullName, role: u.role, status: u.status,
    lastLogin: u.lastLogin
      ? new Date(u.lastLogin).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '접속 기록 없음',
    createdAt: u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR'),
  };
}
export async function deleteUser(id: string): Promise<void> {
  const n = Number(id); if (isNaN(n)) throw new Error('Invalid user ID');
  await apiClient.delete(`/api/users/${n}`);
}

// ---------- 통합 대시보드 ----------
export interface BackendInOutOrderResponse {
  orderId: number; type: string; status: string; createdAt: string; updatedAt: string;
  companyName: string; companyCode: string; expectedDate: string;
  items: { itemId: number; itemName: string; itemCode: string; specification: string; requestedQuantity: number; processedQuantity: number; }[];
}
export interface DashboardData {
  items: ItemResponse[]; users: UserResponse[]; orders: BackendInOutOrderResponse[];
  inventory: BackendInventoryResponse[]; schedules: Schedule[]; summary: DashboardSummaryResponse;
  totalLoadTime: number;
}
export async function fetchDashboardAll(): Promise<DashboardData> {
  const start = Date.now();
  try {
    const res = await apiClient.get('/api/dashboard/all');
    const data = await handleResponse(res);
    return { ...data, totalLoadTime: Date.now() - start };
  } catch (e) {
    const [items, users, orders, inventory, schedules, summary] = await Promise.all([
      fetchItems(), fetchUsers(), fetchRawInOutData(), fetchRawInventoryData(), fetchSchedules(), fetchDashboardSummary()
    ]);
    return {
      items,
      users: users.map(u => ({ userId: u.id, username: u.username, email: u.email, fullName: u.fullName, role: u.role, status: u.status })),
      orders, inventory, schedules, summary, totalLoadTime: Date.now() - start
    };
  }
}
