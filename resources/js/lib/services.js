import { api } from '@/lib/api';

function clean(params) {
    return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
}

export const concernsApi = {
    /** @returns {Promise<{data: object[], meta: object}>} one page, filtered and sorted by the server */
    list: (params = {}) => api.get('/concerns', { params: clean(params) }).then((response) => response.data),
    get: (id) => api.get(`/concerns/${id}`).then((response) => response.data.data),
    create: (payload) => api.post('/concerns', payload).then((response) => response.data.data),
    update: (id, payload) => api.patch(`/concerns/${id}`, payload).then((response) => response.data.data),
    remove: (id) => api.delete(`/concerns/${id}`),
    assign: (id, assignedTo) => api.post(`/concerns/${id}/assign`, { assigned_to: assignedTo }).then((response) => response.data.data),
    changeStatus: (id, status, note) =>
        api.post(`/concerns/${id}/status`, { status, note: note || null }).then((response) => response.data.data),
    addComment: (id, body, visibility = 'public') =>
        api.post(`/concerns/${id}/comments`, { body, visibility }).then((response) => response.data.data),
};

export const categoriesApi = {
    list: (params = {}) => api.get('/categories', { params: clean(params) }).then((response) => response.data.data),
    create: (payload) => api.post('/categories', payload).then((response) => response.data.data),
    update: (id, payload) => api.patch(`/categories/${id}`, payload).then((response) => response.data.data),
    remove: (id) => api.delete(`/categories/${id}`),
};

export const membersApi = {
    list: (params = {}) => api.get('/members', { params: clean(params) }).then((response) => response.data),
    assignable: () => api.get('/members/assignable').then((response) => response.data.data),
    add: (payload) => api.post('/members', payload).then((response) => response.data.data),
    update: (id, payload) => api.patch(`/members/${id}`, payload).then((response) => response.data.data),
    remove: (id) => api.delete(`/members/${id}`),
};

export const organizationsApi = {
    get: (id) => api.get(`/organizations/${id}`).then((response) => response.data.data),
    update: (id, payload) => api.patch(`/organizations/${id}`, payload).then((response) => response.data.data),
    regenerateJoinCode: (id) => api.post(`/organizations/${id}/join-code`).then((response) => response.data.data),
    create: (payload) => api.post('/organizations', payload).then((response) => response.data.data),
    join: (code) => api.post('/organizations/join', { code }).then((response) => response.data.data),
    switchTo: (id) => api.post(`/organizations/${id}/switch`).then((response) => response.data.data),
};

export const dashboardApi = {
    get: (period) => api.get('/dashboard', { params: clean({ period }) }).then((response) => response.data.data),
    report: (period) => api.get('/reports/summary', { params: clean({ period }) }).then((response) => response.data.data),
};

export const notificationsApi = {
    list: () => api.get('/notifications').then((response) => response.data),
    read: (id) => api.post(`/notifications/${id}/read`),
    readAll: () => api.post('/notifications/read-all'),
};

export const profileApi = {
    update: (payload) => api.patch('/profile', payload).then((response) => response.data.data),
    updatePassword: (payload) => api.put('/profile/password', payload),
};
