// src/api.js
const BASE = 'https://travelbae-backend.onrender.com';
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

export const imagekitAuth = () => apiFetch('/ai/imagekit-auth');


// Auth
export const signup = (name, email, password) =>
  apiFetch('/auth/signup', { method: 'POST', body: { name, email, password } });

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: { email, password } });

export const getMe = () => apiFetch('/auth/me');

export const deleteAccount = () => apiFetch('/auth/me', { method: 'DELETE' });

// Trips
export const getTrips  = ()     => apiFetch('/trips');
export const getTrip   = (id)   => apiFetch(`/trips/${id}`);
export const createTrip = (data) => apiFetch('/trips', { method: 'POST', body: data });
export const joinTrip  = (shareCode, nickname) =>
  apiFetch('/trips/join', { method: 'POST', body: { shareCode, nickname } });
export const deleteTrip = (id)       => apiFetch(`/trips/${id}`, { method: 'DELETE' });
export const updateTrip = (id, data) => apiFetch(`/trips/${id}`, { method: 'PATCH', body: data });
// Persist generated itinerary/taste to DB so all group members see it
export const saveAiCache = (id, data) => apiFetch(`/trips/${id}/ai-cache`, { method: 'PATCH', body: data });

// Expenses
export const addExpense    = (tripId, data)   => apiFetch(`/trips/${tripId}/expenses`, { method: 'POST', body: data });
export const updateExpense = (tripId, expId, data) => apiFetch(`/trips/${tripId}/expenses/${expId}`, { method: 'PATCH', body: data });
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

// In-flight deduplication: if the exact same request is already in-flight,
// return the same promise instead of firing a second HTTP call.
const _inFlight = new Map();

function dedupedFetch(key, fetcher) {
  if (_inFlight.has(key)) return _inFlight.get(key);
  const promise = fetcher().finally(() => _inFlight.delete(key));
  _inFlight.set(key, promise);
  return promise;
}

export const generateItinerary = (data) => {
  const key = `itin:${data.destination}:${data.days}:${data.budget}:${data.people}:${(data.interests || []).join(',')}:${data.arrivalSlot}:${data.departureSlot}`;
  return dedupedFetch(key, () => apiFetch('/ai/itinerary', { method: 'POST', body: data }));
};

export const generateLocalTaste = (data) => {
  const key = `taste:${data.destination}`;
  return dedupedFetch(key, () => apiFetch('/ai/local-taste', { method: 'POST', body: data }));
};

// Club
export const getClubHub = (tripId, { latitude, longitude, radius, vibe, activeOnly } = {}) => {
  let path = `/trips/${tripId}/club`;
  const params = new URLSearchParams();
  if (latitude !== undefined && longitude !== undefined) {
    params.set('lat', String(latitude));
    params.set('lng', String(longitude));
  }
  if (radius !== undefined) {
    params.set('radius', String(radius));
  }
  if (vibe) params.set('vibe', String(vibe));
  if (activeOnly) params.set('activeOnly', '1');
  const qs = params.toString();
  if (qs) path += `?${qs}`;
  return apiFetch(path);
};

export const upsertClubProfile = (tripId, data) =>
  apiFetch(`/trips/${tripId}/club/profile`, { method: 'PUT', body: data });

export const updateClubStatus = (tripId, status) =>
  apiFetch(`/trips/${tripId}/club/status`, { method: 'PATCH', body: { status } });

export const sendClubRequest = (tripId, targetTripId, message) =>
  apiFetch(`/trips/${tripId}/club/requests`, { method: 'POST', body: { targetTripId, message } });

export const respondClubRequest = (tripId, requestId, action) =>
  apiFetch(`/trips/${tripId}/club/requests/${requestId}`, { method: 'PATCH', body: { action } });

export const sendClubChatMessage = (tripId, chatId, text) =>
  apiFetch(`/trips/${tripId}/club/chats/${chatId}/messages`, { method: 'POST', body: { text } });

export const createClubChatSplitExpense = (tripId, chatId, data) =>
  apiFetch(`/trips/${tripId}/club/chats/${chatId}/splits`, { method: 'POST', body: data });

export const deleteClubChatSplitExpense = (tripId, chatId, splitId) =>
  apiFetch(`/trips/${tripId}/club/chats/${chatId}/splits/${splitId}`, { method: 'DELETE' });

export const deleteClubChat = (tripId, chatId) =>
  apiFetch(`/trips/${tripId}/club/chats/${chatId}`, { method: 'DELETE' });