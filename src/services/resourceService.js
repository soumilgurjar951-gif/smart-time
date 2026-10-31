// src/services/resourceService.js
import apiClient, { mockDelay } from './api';
import { STORAGE_KEYS, INITIAL_RESOURCES, INITIAL_BOOKINGS } from '../utils/storage';

export const resourceService = {
  async getAllResources(filters = {}) {
    try {
      const response = await apiClient.get('/resources/', { params: filters });
      return response.data;
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || JSON.stringify(INITIAL_RESOURCES));

      if (filters.type && filters.type !== 'All') {
        list = list.filter((r) => r.type === filters.type);
      }
      if (filters.status && filters.status !== 'All') {
        list = list.filter((r) => r.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q) ||
            (r.dedicatedFor && r.dedicatedFor.toLowerCase().includes(q))
        );
      }

      return list;
    }
  },

  async createResource(resourceData) {
    try {
      const response = await apiClient.post('/resources/', resourceData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || JSON.stringify(INITIAL_RESOURCES));

      const newResource = {
        id: `res-${Date.now()}`,
        name: resourceData.name,
        type: resourceData.type || 'Equipment',
        location: resourceData.location || 'CSIT Wing',
        capacity: Number(resourceData.capacity) || 1,
        features: Array.isArray(resourceData.features) ? resourceData.features : (resourceData.features || '').split(',').map((f) => f.trim()).filter(Boolean),
        status: resourceData.status || 'Available',
        dedicatedFor: resourceData.dedicatedFor || 'CSIT 3rd Year / 5th Sem',
        manager: resourceData.manager || 'CSIT Office',
      };

      const updated = [newResource, ...list];
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(updated));
      return newResource;
    }
  },

  async updateResource(id, updateData) {
    try {
      const response = await apiClient.put(`/resources/${id}/`, updateData);
      return response.data;
    } catch {
      await mockDelay(180);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || JSON.stringify(INITIAL_RESOURCES));
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Resource not found.');

      const updated = {
        ...list[idx],
        ...updateData,
        features: Array.isArray(updateData.features)
          ? updateData.features
          : typeof updateData.features === 'string'
          ? updateData.features.split(',').map((f) => f.trim()).filter(Boolean)
          : list[idx].features,
      };

      list[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(list));
      return updated;
    }
  },

  async getAllBookings(filters = {}) {
    try {
      const response = await apiClient.get('/resources/bookings/', { params: filters });
      return response.data;
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || JSON.stringify(INITIAL_BOOKINGS));

      if (filters.status && filters.status !== 'All') {
        list = list.filter((b) => b.status === filters.status);
      }
      if (filters.requestedById && filters.requestedById !== 'All') {
        list = list.filter((b) => b.requestedById === filters.requestedById);
      }
      if (filters.section && filters.section !== 'All') {
        list = list.filter((b) => b.section.includes(filters.section));
      }

      return list;
    }
  },

  async createBookingRequest(bookingData) {
    try {
      const response = await apiClient.post('/resources/bookings/', bookingData);
      return response.data;
    } catch {
      await mockDelay(200);
      const bookings = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || JSON.stringify(INITIAL_BOOKINGS));

      const newBooking = {
        id: `book-${Date.now()}`,
        resourceId: bookingData.resourceId,
        resourceName: bookingData.resourceName,
        requestedById: bookingData.requestedById,
        requestedByName: bookingData.requestedByName,
        section: bookingData.section || 'Section A',
        date: bookingData.date,
        timeSlot: bookingData.timeSlot,
        purpose: bookingData.purpose,
        attendeesCount: Number(bookingData.attendeesCount) || 60,
        status: 'Pending',
        approvedBy: null,
        requestedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        decisionNotes: '',
      };

      const updated = [newBooking, ...bookings];
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
      return newBooking;
    }
  },

  async reviewBooking(id, { status, approvedBy, decisionNotes }) {
    try {
      const response = await apiClient.post(`/resources/bookings/${id}/review/`, {
        status,
        approvedBy,
        decisionNotes,
      });
      return response.data;
    } catch {
      await mockDelay(180);
      const bookings = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || JSON.stringify(INITIAL_BOOKINGS));
      const resources = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || JSON.stringify(INITIAL_RESOURCES));

      const idx = bookings.findIndex((b) => b.id === id);
      if (idx === -1) throw new Error('Booking request not found.');

      const targetBooking = bookings[idx];
      const updatedBooking = {
        ...targetBooking,
        status,
        approvedBy: status === 'Approved' ? approvedBy || 'Dr. Rajiv Sharma (HOD)' : null,
        decisionNotes: decisionNotes || (status === 'Approved' ? 'Approved by HOD' : 'Request rejected'),
      };
      bookings[idx] = updatedBooking;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

      // If approved, update resource status to Booked
      if (status === 'Approved') {
        const resIdx = resources.findIndex((r) => r.id === targetBooking.resourceId);
        if (resIdx !== -1) {
          resources[resIdx].status = 'Booked';
          localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(resources));
        }
      }

      return updatedBooking;
    }
  },
};

export default resourceService;

