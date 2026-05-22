// src/api.js
const BASE = 'https://travelbae-backend.onrender.com'; // ← replace with your server's IP
// e.g. 'http://192.168.1.10:4000' for local network
// e.g. 'http://65.21.44.120:4000' for a VPS

function getToken() {
  return localStorage.getItem('travelbae_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const fetchPlacePhotos = (q) =>
  apiFetch(`/ai/photos?q=${encodeURIComponent(q)}`);


// Auth
export const signup = (name, email, password) =>
  apiFetch('/auth/signup', { method: 'POST', body: { name, email, password } });

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: { email, password } });

export const getMe = () => apiFetch('/auth/me');

// Trips
export const getTrips  = ()     => apiFetch('/trips');
export const getTrip   = (id)   => apiFetch(`/trips/${id}`);
export const createTrip = (data) => apiFetch('/trips', { method: 'POST', body: data });
export const joinTrip  = (shareCode, nickname) =>
  apiFetch('/trips/join', { method: 'POST', body: { shareCode, nickname } });
export const deleteTrip = (id)       => apiFetch(`/trips/${id}`, { method: 'DELETE' });
export const updateTrip = (id, data) => apiFetch(`/trips/${id}`, { method: 'PATCH', body: data });

// Expenses
export const addExpense    = (tripId, data)   => apiFetch(`/trips/${tripId}/expenses`, { method: 'POST', body: data });
export const deleteExpense = (tripId, expId)  => apiFetch(`/trips/${tripId}/expenses/${expId}`, { method: 'DELETE' });

// Contacts
export const addContact    = (tripId, data)  => apiFetch(`/trips/${tripId}/contacts`, { method: 'POST', body: data });
export const deleteContact = (tripId, cid)   => apiFetch(`/trips/${tripId}/contacts/${cid}`, { method: 'DELETE' });

// Photos
export const addPhoto = (tripId, url) =>
  apiFetch(`/trips/${tripId}/photos`, { method: 'POST', body: { url } });

export const deletePhoto = (tripId, photoId) =>
  apiFetch(`/trips/${tripId}/photos/${photoId}`, { method: 'DELETE' });

// Itinerary
export const addItineraryItem = (tripId, data) =>
  apiFetch(`/trips/${tripId}/itinerary`, { method: 'POST', body: data });

// AI — replaces your direct Gemini/Anthropic calls
export const aiChat = (system, messages) =>
  apiFetch('/ai/chat', { method: 'POST', body: { system, messages } });

export const aiItinerary = (destination, days, interests) =>
  apiFetch('/ai/itinerary', { method: 'POST', body: { destination, days, interests } });

export const generateItinerary = (data) =>
  apiFetch('/ai/itinerary', { method: 'POST', body: data });

export const generateLocalTaste = (data) =>
  apiFetch('/ai/local-taste', { method: 'POST', body: data });