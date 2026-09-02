import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest, sendClubChatMessage, createClubChatSplitExpense, deleteClubChatSplitExpense, deleteClubChat, addPhoto, deletePhoto, imagekitAuth } from '../../api';
import { supabase } from '../../supabase';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';
import { usePullToRefresh, PullToRefreshSpinner } from '../shared/pullToRefresh';
import clubBannerNarrow from '../../assets/club-banner-narrow.png';
import clubHeaderImg from '../../assets/club-header.png';
import clubHeader2Img from '../../assets/club-header-2.png';
import bglessClubLogo from '../../assets/bgless_club.png';
import partyLumiImg from '../../assets/party_lumi.png';
import partyLumi5Img from '../../assets/party_lumi5.png';
import { ClubProfileWizard, ClubPersonalCard, CLUB_WIZARD_DONE_KEY, CLUB_WIZARD_DATA_KEY } from './ClubProfileWizard';

const VIBE_OPTIONS = [
  { value: 'any', label: 'Any vibe' },
  { value: 'chill', label: 'Chill' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'party', label: 'Party' },
  { value: 'culture', label: 'Culture' },
  { value: 'mixed', label: 'Mixed' },
];

const GENDER_MIX_OPTIONS = [
  { value: 'any', label: 'Any mix' },
  { value: 'mixed', label: 'Mixed group' },
  { value: 'all-boys', label: 'All boys' },
  { value: 'all-girls', label: 'All girls' },
];

const MEMBER_BAND_OPTIONS = [
  { value: 'any', label: 'Any size' },
  { value: '2plus', label: '2+ members' },
  { value: '4plus', label: '4+ members' },
  { value: '6plus', label: '6+ members' },
];

const TRAVEL_WINDOW_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: 'now', label: 'Currently travelling' },
  { value: '7', label: 'Next 7 days' },
  { value: '15', label: 'Next 15 days' },
  { value: '30', label: 'Next 30 days' },
];

const AGE_RANGE_OPTIONS = [
  { value: 'any', label: 'Any age' },
  { value: '18-25', label: '18–25' },
  { value: '25-35', label: '25–35' },
  { value: '35-50', label: '35–50' },
  { value: '50+', label: '50+' },
];

const POPULAR_DESTINATIONS = [
  { name: 'Bali', emoji: '🌴', color: '#2D6A4F' },
  { name: 'Goa', emoji: '🏖️', color: '#E07B54' },
  { name: 'Thailand', emoji: '🛺', color: '#1B6CA8' },
  { name: 'Kasol', emoji: '⛰️', color: '#4A7C59' },
  { name: 'Pondicherry', emoji: '🌊', color: '#7B2FF7' },
  { name: 'Manali', emoji: '❄️', color: '#1A6B9E' },
];

const initialFilters = {
  search: '',
  memberBand: 'any',
  travelWindow: 'any',
  ageRange: 'any',
};

function moodGradient(vibe) {
  switch (vibe) {
    case 'party': return 'linear-gradient(135deg,#FF6A3D,#FF2F6E 55%,#7D2AE8)';
    case 'adventure': return 'linear-gradient(135deg,#0DAA8B,#0C7D6A 55%,#0F4B86)';
    case 'foodie': return 'linear-gradient(135deg,#FF7B33,#F04D2F 55%,#A42D3C)';
    case 'culture': return 'linear-gradient(135deg,#7A5AF8,#5E3CE6 55%,#2D2A78)';
    case 'chill': return 'linear-gradient(135deg,#4FB5FF,#2E8DE0 55%,#3762E2)';
    default: return 'linear-gradient(135deg,#2D7C6D,#1E5F53 55%,#234B9B)';
  }
}

function distanceLabel(km) {
  if (km == null) return 'Location unavailable';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km > 150) return '150+ km away';
  return `${Math.round(km)} km away`;
}

function genderMixLabel(value) {
  if (value === 'all-boys') return 'All boys';
  if (value === 'all-girls') return 'All girls';
  if (value === 'mixed') return 'Mixed group';
  return 'Not specified';
}

function isRecentlyActive(updatedAt) {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() <= 3 * 24 * 60 * 60 * 1000;
}

function MatchRing({ score }) {
  const value = Math.max(0, Math.min(100, score || 0));
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: `conic-gradient(#FF6A00 0 ${value}%, #E7ECF4 ${value}% 100%)`,
        display: 'grid',
        placeItems: 'center',
        animation: 'clubRingIn .7s cubic-bezier(.2,.7,.2,1) both',
        boxShadow: '0 10px 24px rgba(255,106,0,0.18)',
      }}>
      <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#111827' }}>
        {value}%
      </div>
    </div>
  );
}

function buildCardGallery(item) {
  const ownPhotos = Array.isArray(item?.photoUrls) && item.photoUrls.length > 0
    ? item.photoUrls
    : [item?.photoUrl].filter(Boolean);
  return [...ownPhotos, item?.trip?.coverUrl].filter(Boolean);
}

function formatChatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fmtDateShort(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatChatMetaTime(value) {
  if (!value) return 'No activity yet';
  const dt = new Date(value);
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  if (isToday) return `Today • ${formatChatTime(value)}`;
  return dt.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function buildCombinedMembers(chat) {
  if (!chat) return [];
  const groupA = (chat.tripA?.members || []).map(member => ({
    id: `${chat.tripA?.id || 'x'}:${member.id}`,
    nickname: member.nickname,
    groupName: chat.tripA?.groupName || 'Group A',
  }));
  const groupB = (chat.tripB?.members || []).map(member => ({
    id: `${chat.tripB?.id || 'y'}:${member.id}`,
    nickname: member.nickname,
    groupName: chat.tripB?.groupName || 'Group B',
  }));
  return [...groupA, ...groupB];
}

function buildCombinedPhotos(chat) {
  const photosA = (chat?.tripA?.photos || []).map(photo => ({ ...photo, source: chat?.tripA?.groupName || 'Group A' }));
  const photosB = (chat?.tripB?.photos || []).map(photo => ({ ...photo, source: chat?.tripB?.groupName || 'Group B' }));
  return [...photosA, ...photosB].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function extractStoragePathFromPublicUrl(url) {
  if (!url) return null;
  const marker = '/trip-photos/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

function getErrorMessage(err, fallback) {
  if (err && typeof err === 'object' && 'message' in err && err.message) {
    return String(err.message);
  }
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

function computeSplitBalances(members, entries) {
  const balances = {};
  members.forEach(member => {
    balances[member.id] = 0;
  });

  entries.forEach(entry => {
    const amount = Number(entry.amount) || 0;
    const participants = Array.isArray(entry.splitWithKeys)
      ? entry.splitWithKeys
      : Array.isArray(entry.splitWith)
        ? entry.splitWith
        : [];
    const paidBy = entry.paidByKey || entry.paidBy;
    if (!amount || participants.length === 0) return;
    const perHead = amount / participants.length;
    participants.forEach(memberId => {
      if (balances[memberId] == null) balances[memberId] = 0;
      balances[memberId] -= perHead;
    });
    if (balances[paidBy] == null) balances[paidBy] = 0;
    balances[paidBy] += amount;
  });

  return balances;
}

function buildSettlementsFromBalances(balances) {
  const memberIds = Object.keys(balances || {});
  const debtors = memberIds.filter(id => balances[id] < -0.01).sort((a, b) => balances[a] - balances[b]);
  const creditors = memberIds.filter(id => balances[id] > 0.01).sort((a, b) => balances[b] - balances[a]);
  const working = { ...balances };
  const settlements = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const from = debtors[di];
    const to = creditors[ci];
    const amount = Math.min(-working[from], working[to]);
    settlements.push({ from, to, amount });
    working[from] += amount;
    working[to] -= amount;
    if (Math.abs(working[from]) < 0.01) di += 1;
    if (Math.abs(working[to]) < 0.01) ci += 1;
  }
  return settlements;
}

function formatSplitDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGroupMoodLine(item) {
  const vibe = item?.vibe || 'mixed';
  if (vibe === 'party') return 'Late plans, loud laughs, zero boring energy.';
  if (vibe === 'foodie') return 'Built around plates, cafes, and the next great bite.';
  if (vibe === 'adventure') return 'Fast-moving crew chasing views and stories.';
  if (vibe === 'culture') return 'Museums, old streets, and meaningful detours.';
  if (vibe === 'chill') return 'Easy pace, soft plans, good conversations.';
  return 'Balanced crew open to a fun, easy connection.';
}

function toTokenSet(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function intersectionSize(a, b) {
  let count = 0;
  a.forEach(v => {
    if (b.has(v)) count += 1;
  });
  return count;
}

// Lumi-voiced compatibility tiers — ordered highest first
const LUMI_TIERS = [
  { min: 88, label: 'Soulmates in transit',    color: '#7C3AED', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)' },
  { min: 76, label: 'Definitely share a cab',  color: '#0891B2', bg: 'linear-gradient(135deg,#0891B2,#22D3EE)' },
  { min: 64, label: 'Worth the hello',         color: '#FF6A00', bg: 'linear-gradient(135deg,#FF6A00,#FF8C3A)' },
  { min: 52, label: 'Could click, could not',  color: '#D97706', bg: 'linear-gradient(135deg,#D97706,#FCD34D)' },
  { min: 0,  label: 'Ships in the night',      color: '#6B7280', bg: 'linear-gradient(135deg,#6B7280,#9CA3AF)' },
];

function buildCompatibility(myProfile, myTrip, item) {
  let score = 30;
  const reasons = [];

  const hasStrongPref = (value) => value && value !== 'mixed' && value !== 'any';

  const myVibe = myProfile?.vibe || 'mixed';
  const otherVibe = item?.vibe || 'mixed';
  const vibeWeight = hasStrongPref(myVibe) ? 1.45 : 1;
  if (myVibe === otherVibe && myVibe !== 'mixed') {
    score += 18 * vibeWeight;
    reasons.push('same vibe');
  } else if (myVibe === 'mixed' || otherVibe === 'mixed') {
    score += 8 * vibeWeight;
    reasons.push('flexible vibe');
  }

  const myGenderMix = myProfile?.genderMix || 'mixed';
  const otherGenderMix = item?.genderMix || 'mixed';
  const genderWeight = hasStrongPref(myGenderMix) ? 1.35 : 1;
  if (myGenderMix === otherGenderMix) {
    score += 12 * genderWeight;
    reasons.push('group mix alignment');
  } else if (myGenderMix === 'mixed' || otherGenderMix === 'mixed') {
    score += 6 * genderWeight;
  }

  const myMembers = myTrip?.members?.length || 0;
  const otherMembers = item?.trip?.members?.length || 0;
  const sizeGap = Math.abs(myMembers - otherMembers);
  if (sizeGap <= 1) {
    score += 10;
    reasons.push('similar group size');
  } else if (sizeGap <= 3) {
    score += 6;
  } else {
    score += 2;
  }

  const myTags = new Set((myProfile?.coverTags || []).map(t => String(t).toLowerCase()));
  const otherTags = new Set((item?.coverTags || []).map(t => String(t).toLowerCase()));
  const sharedTags = intersectionSize(myTags, otherTags);
  const tagsWeight = myTags.size >= 3 ? 1.25 : 1;
  if (sharedTags >= 2) {
    score += 14 * tagsWeight;
    reasons.push(`${sharedTags} shared interests`);
  } else if (sharedTags === 1) {
    score += 8 * tagsWeight;
    reasons.push('1 shared interest');
  }

  const myIntentTokens = toTokenSet(myProfile?.lookingFor);
  const otherIntentTokens = toTokenSet(item?.lookingFor);
  const sharedIntent = intersectionSize(myIntentTokens, otherIntentTokens);
  const intentWeight = myIntentTokens.size >= 3 ? 1.2 : 1;
  if (sharedIntent >= 2) {
    score += 10 * intentWeight;
    reasons.push('matching plans');
  } else if (sharedIntent === 1) {
    score += 5 * intentWeight;
  }

  if (item?.distance != null) {
    if (item.distance <= 10) {
      score += 12;
      reasons.push('nearby');
    } else if (item.distance <= 30) {
      score += 8;
    } else if (item.distance <= 80) {
      score += 4;
    } else {
      score += 1;
    }
  }

  if (isRecentlyActive(item?.updatedAt)) {
    score += 8;
    reasons.push('active now');
  }

  if (item?.photoUrl) score += 3;

  const finalScore = Math.max(40, Math.min(99, Math.round(score)));
  const tier = LUMI_TIERS.find(t => finalScore >= t.min) || LUMI_TIERS[LUMI_TIERS.length - 1];
  return { score: finalScore, reasons: reasons.slice(0, 3), tier };
}

function ClubGridCard({ item, alreadySent, onOpen, onConnect }) {
  const activeNow = isRecentlyActive(item.updatedAt);
  const photos = Array.isArray(item?.photoUrls) && item.photoUrls.length > 0 ? item.photoUrls : [item?.photoUrl].filter(Boolean);
  const coverPhoto = photos[0] || item?.trip?.coverUrl || null;
  const tags = Array.isArray(item?.coverTags) ? item.coverTags.slice(0, 2) : [];
  const extra = Math.max(0, (item?.coverTags?.length || 0) - 2);
  const vibeEmoji = { party: '🥂', adventure: '⛰️', foodie: '🍔', culture: '🎭', chill: '🏖️', mixed: '🎒' }[item?.vibe] || '🎒';

  return (
    <div
      onClick={onOpen}
      style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden',
        height: 220, background: '#111',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
        cursor: 'pointer',
        animation: 'clubCardIn .35s cubic-bezier(.2,.7,.2,1) both',
        flexShrink: 0,
      }}
    >
      {coverPhoto
        ? <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', background: moodGradient(item.vibe || 'mixed') }} />
      }
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 32%, rgba(0,0,0,0.72) 100%)' }} />
      {activeNow && (
        <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(22,163,74,0.95)', borderRadius: 99, padding: '3px 8px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 4px #fff' }} />
          <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: 0.5 }}>LIVE</span>
        </div>
      )}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onOpen(); }}
        style={{ position: 'absolute', top: 9, right: 9, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      </button>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 10px 10px' }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 1 }}>
          {item.trip?.groupName || 'Trip Group'}
        </div>
        {item.trip?.members?.length > 0 && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)', marginBottom: 1 }}>
            {item.trip.members.length} members · {item.trip?.destination || ''}
          </div>
        )}
        {(item.trip?.arrival || item.trip?.startDate) && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
            📍 {item.trip?.destination || ''}, {fmtDateShort(item.trip.arrival || item.trip.startDate)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', alignItems: 'center' }}>
          {tags.map(tag => (
            <span key={tag} style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
              {vibeEmoji} {tag}
            </span>
          ))}
          {extra > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>+{extra}</span>
          )}
      </div>
      </div>
    </div>
  );
}

function ClubDiscoveryCard({ item, compatibility, alreadySent, distKm, dragX, dragY, isDragging, swipeOut, isTop, stackIndex, onPointerDown, onOpen, onConnect }) {
  const likeOpacity = isTop ? Math.max(0, Math.min(1, dragX / 60)) : 0;
  const passOpacity = isTop ? Math.max(0, Math.min(1, -dragX / 60)) : 0;
  const rotation = isTop ? Math.max(-28, Math.min(28, dragX * 0.05)) : 0;
  const activeNow = isRecentlyActive(item.updatedAt);
  const photos = Array.isArray(item?.photoUrls) && item.photoUrls.length > 0 ? item.photoUrls : [item?.photoUrl].filter(Boolean);
  const coverPhoto = photos[0] || item?.trip?.coverUrl || null;
  const tags = Array.isArray(item?.coverTags) ? item.coverTags.slice(0, 3) : [];
  const stackScale = 1 - stackIndex * 0.035;
  const stackTranslateY = stackIndex * 10;
  const swipeTransform = isTop
    ? `translateX(${dragX}px) translateY(${swipeOut ? 0 : dragY * 0.1}px) rotate(${rotation}deg) translateZ(0)`
    : `scale(${stackScale}) translateY(${stackTranslateY}px) translateZ(0)`;

  return (
    <div
      data-club-swipe-card="true"
      onPointerDown={isTop && !swipeOut ? onPointerDown : undefined}
      style={{
        position: 'absolute', inset: 0,
        borderRadius: 24, overflow: 'hidden', background: '#111',
        boxShadow: isTop
          ? `0 ${8 + Math.abs(dragX) * 0.06}px ${28 + Math.abs(dragX) * 0.14}px rgba(0,0,0,0.24)`
          : '0 4px 20px rgba(0,0,0,0.12)',
        transform: swipeTransform,
        transition: isDragging ? 'none' : (swipeOut ? 'transform .4s cubic-bezier(.2,.7,.2,1), box-shadow .4s' : 'transform .3s cubic-bezier(.2,.7,.2,1)'),
        zIndex: isTop ? 2 : 1,
        cursor: isTop ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'pan-y', userSelect: 'none', willChange: 'transform',
      }}
    >
      {/* Photo */}
      {coverPhoto
        ? <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
        : <div style={{ width: '100%', height: '100%', background: moodGradient(item.vibe || 'mixed') }} />
      }
      {/* Scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 28%, rgba(0,0,0,0.6) 68%, rgba(0,0,0,0.88) 100%)', pointerEvents: 'none' }} />

      {/* LIKE overlay */}
      <div style={{ position: 'absolute', top: 40, left: 18, opacity: likeOpacity, transform: 'rotate(-12deg)', pointerEvents: 'none', transition: 'opacity .1s' }}>
        <div style={{ border: '3.5px solid #4ADE80', borderRadius: 10, padding: '5px 16px', color: '#4ADE80', fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, letterSpacing: 3, textShadow: '0 2px 16px rgba(74,222,128,0.5)' }}>LIKE</div>
      </div>
      {/* NOPE overlay */}
      <div style={{ position: 'absolute', top: 40, right: 18, opacity: passOpacity, transform: 'rotate(12deg)', pointerEvents: 'none', transition: 'opacity .1s' }}>
        <div style={{ border: '3.5px solid #F87171', borderRadius: 10, padding: '5px 16px', color: '#F87171', fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, letterSpacing: 3, textShadow: '0 2px 16px rgba(248,113,113,0.5)' }}>NOPE</div>
      </div>

      {/* LIVE badge */}
      {activeNow && (
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '5px 10px', border: '1px solid rgba(74,222,128,0.35)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4ADE80', letterSpacing: 0.5 }}>LIVE</span>
        </div>
      )}
      {/* Heart / info button */}
      <button type="button" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); if (isTop) onOpen(); }}
        style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: isTop ? 'auto' : 'none' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      </button>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 16px' }}>
        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {tags.map(tag => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>{tag}</span>
            ))}
          </div>
        )}
        {/* Group name */}
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.2px', textShadow: '0 2px 16px rgba(0,0,0,0.5)', marginBottom: 3 }}>
          {item.trip?.groupName}
        </div>
        {item.trip?.destination && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>📍 {item.trip.destination}</div>
        )}
        {(item.trip?.arrival || item.trip?.startDate) && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 9 }}>
            📅 {fmtDateShort(item.trip.arrival || item.trip.startDate)}{(item.trip.departure || item.trip.endDate) ? ` – ${fmtDateShort(item.trip.departure || item.trip.endDate)}` : ''}
          </div>
        )}
        {/* Match + avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {compatibility && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: '5px 13px', background: compatibility.tier?.bg || 'rgba(16,185,129,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', letterSpacing: '0.1px', whiteSpace: 'nowrap' }}>{compatibility.tier?.label || `${compatibility.score}%`}</span>
            </div>
          )}
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {(item.trip?.members || []).slice(0, 3).map((m, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${i * 60 + 180},60%,50%)`, border: '2px solid rgba(255,255,255,0.75)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#fff', marginLeft: i > 0 ? -9 : 0, zIndex: 4 - i, position: 'relative', flexShrink: 0 }}>
                {(m.nickname || '?')[0].toUpperCase()}
              </div>
            ))}
            {(item.trip?.members || []).length > 3 && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.5)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800, color: '#fff', marginLeft: -9, position: 'relative' }}>
                +{(item.trip?.members || []).length - 3}
              </div>
            )}
          </div>
        </div>
        {/* About snippet */}
        {item.about && (
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.about}
          </div>
        )}
        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{item.trip?.members?.length || 0} Members</span>
          </div>
          {item.genderMix && item.genderMix !== 'mixed' && item.genderMix !== 'any' && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{genderMixLabel(item.genderMix)}</span>
          )}
          {distKm != null && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📍 {distanceLabel(distKm)}</span>
          )}
      </div>
        {/* Connect button */}
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); if (isTop && !alreadySent) onConnect(); }}
          disabled={alreadySent}
          style={{ width: '100%', padding: '13px', borderRadius: 16, border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 800, color: alreadySent ? 'rgba(255,255,255,0.6)' : '#fff', background: alreadySent ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#FF8C3A,#FF6A00)', cursor: alreadySent ? 'not-allowed' : 'pointer', boxShadow: alreadySent ? 'none' : '0 4px 16px rgba(255,106,0,0.35)', pointerEvents: isTop ? 'auto' : 'none', backdropFilter: alreadySent ? 'blur(4px)' : 'none' }}
        >
          {alreadySent ? 'Request Sent ✓' : 'Connect →'}
        </button>
      </div>
    </div>
  );
}

function ClubPage({ trip, onTripRefresh, onLeaveClub }) {
  const [clubLoading, setClubLoading] = useState(false);
  const [hubFetched, setHubFetched] = useState(false);
  const [clubBusy, setClubBusy] = useState(false);
  const [hub, setHub] = useState({ myProfile: null, discover: [], incomingRequests: [], outgoingRequests: [], chats: [] });
  const [clubView, setClubView] = useState('discover');
  const [filters, setFilters] = useState(initialFilters);
  const [filterDraft, setFilterDraft] = useState(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatTool, setChatTool] = useState(null);
  const [toolsChooserOpen, setToolsChooserOpen] = useState(false);
  const [toolScreenOpen, setToolScreenOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatPhotoFolder, setChatPhotoFolder] = useState('all');
  const [chatPhotoLightbox, setChatPhotoLightbox] = useState(null);
  const [chatPhotoUploading, setChatPhotoUploading] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [chatPhotoProgress, setChatPhotoProgress] = useState(0);
  const [chatPhotoDragging, setChatPhotoDragging] = useState(false);
  const [chatPhotoSelected, setChatPhotoSelected] = useState(new Set());
  const [splitSection, setSplitSection] = useState('expenses');
  const [splitFormOpen, setSplitFormOpen] = useState(false);
  const [splitDraft, setSplitDraft] = useState({ desc: '', amount: '', paidBy: '', splitWith: [] });
  const [splitTouch, setSplitTouch] = useState({ entryId: null, startX: 0, deltaX: 0, startAt: 0 });
  const [splitSwipeOpenId, setSplitSwipeOpenId] = useState(null);

  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  /* Swipe deck state */
  const [swipeIdx, setSwipeIdx] = useState(0);
  const [swipeDragX, setSwipeDragX] = useState(0);
  const [swipeDragY, setSwipeDragY] = useState(0);
  const [swipeIsDragging, setSwipeIsDragging] = useState(false);
  const [swipeOut, setSwipeOut] = useState(null);
  const [swipeRequestPending, setSwipeRequestPending] = useState(null);
  const swipePointerStartRef = useRef(null);
  const swipeLastDragXRef = useRef(0);
  const swipeRafRef = useRef(null);

  /* Profile card swipe: right=connect, left=dismiss */
  const [profileDragX, setProfileDragX] = useState(0);
  const [profileDragging, setProfileDragging] = useState(false);
  const profileDragRef = useRef(null);
  const profileLastDragX = useRef(0);

  const clubLocKey = (suffix) => `travelbae_club_${trip.id}_${suffix}`;

  // ── Club gate: combined intro (slide 0) + T&C (slide 1) ──
  const CLUB_TERMS_KEY = `travelbae_club_terms_accepted`;
  const CLUB_INTRO_KEY = `travelbae_club_intro_${trip.id}`;
  const [showClubGate, setShowClubGate] = useState(() => {
    try {
      return !localStorage.getItem(CLUB_INTRO_KEY) || !localStorage.getItem(CLUB_TERMS_KEY);
    } catch { return true; }
  });
  const [clubGateStep, setClubGateStep] = useState(() => {
    try {
      const iSeen = !!localStorage.getItem(CLUB_INTRO_KEY);
      const tAccepted = !!localStorage.getItem(CLUB_TERMS_KEY);
      return (iSeen && !tAccepted) ? 1 : 0;
    } catch { return 0; }
  });
  const [termsChecked, setTermsChecked] = useState(() => {
    try { return localStorage.getItem(CLUB_TERMS_KEY) === '1'; } catch { return false; }
  });
  // -- Personal profile wizard --
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const wizardDataKey = `${CLUB_WIZARD_DATA_KEY}_${trip.id}`;
  const wizardDoneKey = `${CLUB_WIZARD_DONE_KEY}_${trip.id}`;
  const [wizardData, setWizardData] = useState(() => {
    try {
      const s = localStorage.getItem(wizardDataKey);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  // clubInfoOnly: opened from ⓘ button — show intro only, never advance to T&C
  const [clubInfoOnly, setClubInfoOnly] = useState(false);
  const advanceClubGate = () => {
    if (clubInfoOnly) { setShowClubGate(false); setClubInfoOnly(false); return; }
    setClubGateStep(1);
  };
  const dismissClubGate = () => {
    const leaving = !clubInfoOnly;
    try { localStorage.setItem(CLUB_INTRO_KEY, '1'); } catch { }
    setShowClubGate(false); setClubInfoOnly(false);
    if (leaving) onLeaveClub?.();
  };
  const acceptClubTerms = () => {
    if (!termsChecked) return;
    try { localStorage.setItem(CLUB_TERMS_KEY, '1'); localStorage.setItem(CLUB_INTRO_KEY, '1'); } catch { }
    setShowClubGate(false); setClubInfoOnly(false);
    try {
      if (!localStorage.getItem(wizardDoneKey)) setShowProfileWizard(true);
    } catch {}
  };
  const openClubInfo = () => { setClubGateStep(0); setClubInfoOnly(true); setShowClubGate(true); };

  // ── Location (Nominatim search + optional GPS reverse-geocode) ──
  const CLUB_LOC_PROMPTED_KEY = `travelbae_club_loc_prompted_${trip.id}`;
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const [locQuery, setLocQuery] = useState(() => {
    try {
      return localStorage.getItem(clubLocKey('loc_label')) || '';
    } catch {
      return '';
    }
  });
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [locSearching, setLocSearching] = useState(false);
  const [locLabel, setLocLabel] = useState(() => {
    try {
      return localStorage.getItem(clubLocKey('loc_label')) || '';
    } catch {
      return '';
    }
  });
  const [myLat, setMyLat] = useState(() => {
    try {
      const v = localStorage.getItem(clubLocKey('loc_lat'));
      return v ? parseFloat(v) : null;
    } catch {
      return null;
    }
  });
  const [myLng, setMyLng] = useState(() => {
    try {
      const v = localStorage.getItem(clubLocKey('loc_lng'));
      return v ? parseFloat(v) : null;
    } catch {
      return null;
    }
  });
  const [locError, setLocError] = useState('');
  const [locDetecting, setLocDetecting] = useState(false);
  const [radius, setRadius] = useState(() => {
    try {
      const stored = localStorage.getItem(clubLocKey('radius')) || '25';
      return parseInt(stored, 10);
    } catch {
      return 25;
    }
  });
  const [debouncedRadius, setDebouncedRadius] = useState(radius);
  const locDebounce = useRef(null);

  const locationEnabled = myLat !== null && myLng !== null;

  const [profileForm, setProfileForm] = useState({
    title: '',
    about: '',
    lookingFor: '',
    photoUrls: [],
    vibe: 'mixed',
    genderMix: 'mixed',
    ageRange: 'any',
    boysCount: '',
    girlsCount: '',
    coverTagsInput: '',
  });

  const fileRef = useRef(null);
  const chatThreadRef = useRef(null);
  const chatPhotoInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRadius(radius), 260);
    return () => clearTimeout(t);
  }, [radius]);

  // ── Nominatim locality search ──
  const searchLocality = useCallback(async (text) => {
    if (text.length < 2) { setLocSuggestions([]); return; }
    setLocSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=6&accept-language=en`,
        { headers: { 'User-Agent': 'TravelBae/1.0' } }
      );
      const data = await res.json();
      setLocSuggestions(data.slice(0, 6));
    } catch { setLocSuggestions([]); }
    setLocSearching(false);
  }, []);

  const pickLocSuggestion = useCallback((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const a = item.address || {};
    const label = a.city || a.town || a.village || a.county || a.state_district || a.state || item.display_name.split(',')[0];
    setMyLat(lat); setMyLng(lng); setLocLabel(label); setLocQuery(label); setLocSuggestions([]);
    try {
      localStorage.setItem(clubLocKey('loc_lat'), String(lat));
      localStorage.setItem(clubLocKey('loc_lng'), String(lng));
      localStorage.setItem(clubLocKey('loc_label'), label);
    } catch { }
    setLocError('');
  }, [trip.id]);

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported.'); return; }
    setLocDetecting(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'TravelBae/1.0' } }
          );
          const data = await res.json();
          const a = data.address || {};
          const label = a.city || a.town || a.village || a.county || a.state_district || a.state || 'Your location';
          setMyLat(latitude); setMyLng(longitude); setLocLabel(label); setLocQuery(label); setLocSuggestions([]);
          try {
            localStorage.setItem(clubLocKey('loc_lat'), String(latitude));
            localStorage.setItem(clubLocKey('loc_lng'), String(longitude));
            localStorage.setItem(clubLocKey('loc_label'), label);
          } catch { }
          setLocError('');
        } catch { setLocError('Could not reverse-geocode your location.'); }
        setLocDetecting(false);
      },
      () => { setLocError('Permission denied. Search a locality manually.'); setLocDetecting(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [trip.id]);

  // Haversine distance in km
  const haversine = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Location prompt disabled — live location feature commented out
  // useEffect(() => {
  //   if (!showClubGate) {
  //     try {
  //       const alreadyHasLoc = !!localStorage.getItem(clubLocKey('loc_lat'));
  //       const alreadyPrompted = !!localStorage.getItem(CLUB_LOC_PROMPTED_KEY);
  //       if (!alreadyHasLoc && !alreadyPrompted) setShowLocationPrompt(true);
  //     } catch {}
  //   }
  // }, [showClubGate]);
  // useEffect(() => {
  //   if (myLat !== null && showLocationPrompt) {
  //     try { localStorage.setItem(CLUB_LOC_PROMPTED_KEY, '1'); } catch {}
  //     const t = setTimeout(() => setShowLocationPrompt(false), 1400);
  //     return () => clearTimeout(t);
  //   }
  // }, [myLat, showLocationPrompt]);

  const loadHub = useCallback(async () => {
    setClubLoading(true);
    try {
      const params = {};
      const raw = await getClubHub(trip.id, params);
      // Unwrap { success, result } wrapper and convert snake_case keys to camelCase
      const toCam = k => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const deepCam = v => {
        if (Array.isArray(v)) return v.map(deepCam);
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, val]) => [toCam(k), deepCam(val)]));
        return v;
      };
      const d = deepCam(raw.result ?? raw);
      const myP = d.myProfile || null;
      setHub({
        myProfile: myP,
        discover: d.discover || [],
        incomingRequests: d.incomingRequests || [],
        outgoingRequests: d.outgoingRequests || [],
        chats: d.chats || [],
      });
      setProfileForm({
        title: myP?.title || trip.groupName,
        about: myP?.about || '',
        lookingFor: myP?.lookingFor || '',
        photoUrls: Array.isArray(myP?.photoUrls) && myP.photoUrls.length > 0
          ? myP.photoUrls
          : (myP?.photoUrl ? [myP.photoUrl] : []),
        vibe: myP?.vibe || 'mixed',
        genderMix: myP?.genderMix || 'mixed',
        ageRange: myP?.ageRange || 'any',
        boysCount: myP?.boysCount != null ? String(myP.boysCount) : '',
        girlsCount: myP?.girlsCount != null ? String(myP.girlsCount) : '',
        coverTagsInput: Array.isArray(myP?.coverTags) ? myP.coverTags.join(', ') : '',
      });
    } catch (err) {
      alert('Could not load club: ' + err.message);
    }
    setHubFetched(true);
    setClubLoading(false);
  }, [trip.id, trip.groupName]);

  useEffect(() => { loadHub(); }, [loadHub]);

  const isRefreshing = usePullToRefresh(loadHub, [loadHub]);

  const listed = (hub.myProfile?.status || 'snooze') === 'listed';

  const filteredDiscover = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (hub.discover || []).filter(item => {
      if (item.status !== 'listed') return false;

      const members = item.trip?.members?.length || 0;
      if (filters.memberBand === '2plus' && members < 2) return false;
      if (filters.memberBand === '4plus' && members < 4) return false;
      if (filters.memberBand === '6plus' && members < 6) return false;

      // Travel window filter
      if (filters.travelWindow !== 'any') {
        const arrival = item.trip?.arrival ? new Date(item.trip.arrival).getTime() : null;
        const departure = item.trip?.departure ? new Date(item.trip.departure).getTime() : null;
        const now = Date.now();
        if (filters.travelWindow === 'now') {
          if (!arrival || !departure || now < arrival || now > departure) return false;
        } else {
          const days = parseInt(filters.travelWindow, 10);
          const windowEnd = now + days * 24 * 60 * 60 * 1000;
          if (!arrival || arrival < now || arrival > windowEnd) return false;
        }
      }

      // Age range filter
      if (filters.ageRange !== 'any') {
        if (item.ageRange && item.ageRange !== filters.ageRange) return false;
      }

      // Client-side distance filter disabled — re-enable when location feature is active
      // if (locationEnabled && myLat !== null && myLng !== null) {
      //   const itemLat = item.latitude ?? item.trip?.latitude;
      //   const itemLng = item.longitude ?? item.trip?.longitude;
      //   if (itemLat == null || itemLng == null) return false;
      //   if (haversine(myLat, myLng, itemLat, itemLng) > debouncedRadius) return false;
      // }

      if (q) {
        const hay = [
          item.trip?.groupName || '',
          item.trip?.destination || '',
          item.about || '',
          item.lookingFor || '',
          item.vibe || '',
          ...(Array.isArray(item.coverTags) ? item.coverTags : []),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [hub.discover, filters, locationEnabled, myLat, myLng, debouncedRadius, haversine]);

  const handleToggle = async () => {
    setClubBusy(true);
    try {
      await updateClubStatus(trip.id, listed ? 'snooze' : 'listed');
      await loadHub();
    } catch (err) {
      alert('Could not change status: ' + err.message);
    }
    setClubBusy(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if ((profileForm.photoUrls || []).length >= 3) return;
    if (e.target) e.target.value = '';
    setProfilePhotoUploading(true);
    try {
      // bust browser GET cache so each upload gets a fresh token
      const auth = await fetch(`https://travelbae-backend-sg.onrender.com/ai/imagekit-auth?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('travelbae_token') || ''}` },
      }).then(r => r.json());
      if (!auth.publicKey || !auth.signature || !auth.token) throw new Error('Auth failed');
      const fileName = `club_${trip.id}_${Date.now()}_${(Math.random() * 1e6 | 0)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const form = new FormData();
      form.append('file', file);
      form.append('fileName', fileName);
      form.append('folder', `/tb-club/${trip.id}`);
      form.append('useUniqueFileName', 'true');
      form.append('publicKey', auth.publicKey);
      form.append('signature', auth.signature);
      form.append('expire', String(auth.expire));
      form.append('token', auth.token);
      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || data.error || 'Upload failed');
      setProfileForm((f) => ({ ...f, photoUrls: [...(f.photoUrls || []).slice(0, 2), data.url] }));
    } catch (err) {
      alert('Photo upload failed: ' + err.message);
    }
    setProfilePhotoUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.title.trim() || !profileForm.about.trim()) {
      alert('Please fill title and about.');
      return;
    }

    const safeTags = profileForm.coverTagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);

    setClubBusy(true);
    try {
      await upsertClubProfile(trip.id, {
        title: profileForm.title,
        about: profileForm.about,
        looking_for: profileForm.lookingFor,
        photo_url: (profileForm.photoUrls || [])[0] || null,
        vibe: profileForm.vibe,
        gender_mix: profileForm.genderMix,
        age_range: profileForm.ageRange,
        boys_count: profileForm.boysCount === '' ? null : Number(profileForm.boysCount),
        girls_count: profileForm.girlsCount === '' ? null : Number(profileForm.girlsCount),
        cover_tags: safeTags,
        latitude: myLat,
        longitude: myLng,
      });
      await loadHub();
      setClubView('discover');
    } catch (err) {
      alert('Could not save profile: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleSendRequest = async () => {
    if (!requestFor || !requestMessage.trim()) return;
    setClubBusy(true);
    try {
      await sendClubRequest(trip.id, requestFor, requestMessage.trim());
      setRequestFor(null);
      setRequestMessage('');
      await loadHub();
    } catch (err) {
      alert('Could not send request: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleRequestAction = async (requestId, action) => {
    setClubBusy(true);
    try {
      const result = await respondClubRequest(trip.id, requestId, action);
      await loadHub();
      if (action === 'accepted' && result.chat) {
        setSelectedChatId(result.chat.id);
        setClubView('chats');
      }
    } catch (err) {
      alert('Could not update request: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleSendChat = async () => {
    if (!activeChat || !chatDraft.trim()) return;
    setClubBusy(true);
    try {
      await sendClubChatMessage(trip.id, activeChat.id, chatDraft.trim());
      setChatDraft('');
      await loadHub();
      setSelectedChatId(activeChat.id);
      setClubView('chats');
    } catch (err) {
      alert('Could not send chat message: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleChatKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!clubBusy && chatDraft.trim()) handleSendChat();
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;
    if (!confirm('Delete this chat and all associated messages?')) return;
    setClubBusy(true);
    try {
      await deleteClubChat(trip.id, activeChat.id);
      setSelectedChatId(null);
      await loadHub();
    } catch (err) {
      alert('Could not delete chat: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleToggleSplitMember = (memberId) => {
    setSplitDraft((draft) => {
      const exists = draft.splitWith.includes(memberId);
      return {
        ...draft,
        splitWith: exists ? draft.splitWith.filter(id => id !== memberId) : [...draft.splitWith, memberId],
      };
    });
  };

  const handleAddSplitEntry = async () => {
    if (!activeChat) return;
    const amount = Number(splitDraft.amount);
    if (!splitDraft.desc.trim() || !Number.isFinite(amount) || amount <= 0 || splitDraft.splitWith.length === 0 || !splitDraft.paidBy) {
      alert('Add a valid split with description, amount, payer, and at least one participant.');
      return;
    }
    setClubBusy(true);
    try {
      await createClubChatSplitExpense(trip.id, activeChat.id, {
        desc: splitDraft.desc.trim(),
        amount,
        paidByKey: splitDraft.paidBy,
        splitWithKeys: splitDraft.splitWith,
      });
      await loadHub();
      if (onTripRefresh) {
        await onTripRefresh();
      }
      setSplitDraft((draft) => ({
        ...draft,
        desc: '',
        amount: '',
        splitWith: combinedMembers.map(member => member.id),
      }));
      setSplitFormOpen(false);
      setSplitSection('expenses');
    } catch (err) {
      alert('Could not add split expense: ' + err.message);
    } finally {
      setClubBusy(false);
    }
  };

  const handleDeleteSplitEntry = async (entryId) => {
    if (!activeChat) return;
    if (!confirm('Delete this split expense?')) return;
    setClubBusy(true);
    try {
      await deleteClubChatSplitExpense(trip.id, activeChat.id, entryId);
      await loadHub();
      if (onTripRefresh) {
        await onTripRefresh();
      }
    } catch (err) {
      alert('Could not delete split expense: ' + err.message);
    } finally {
      setClubBusy(false);
    }
  };

  const handleSplitTouchStart = (entryId, event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    setSplitTouch({ entryId, startX: touch.clientX, deltaX: 0, startAt: Date.now() });
  };

  const handleSplitTouchMove = (entryId, event) => {
    if (splitTouch.entryId !== entryId) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const delta = Math.max(-86, Math.min(0, touch.clientX - splitTouch.startX));
    setSplitTouch((prev) => ({ ...prev, deltaX: delta }));
  };

  const handleSplitTouchEnd = (entryId) => {
    if (splitTouch.entryId !== entryId) return;
    const elapsed = Math.max(1, Date.now() - (splitTouch.startAt || Date.now()));
    const velocity = splitTouch.deltaX / elapsed; // px/ms, negative when swiping left
    const fastLeftFlick = velocity <= -0.7;
    const hardDeleteFlick = velocity <= -1.1;

    if ((splitSwipeOpenId === entryId && splitTouch.deltaX <= -70) || (splitSwipeOpenId === entryId && hardDeleteFlick)) {
      if (navigator.vibrate) navigator.vibrate(12);
      void handleDeleteSplitEntry(entryId);
      setSplitSwipeOpenId(null);
    } else if (splitTouch.deltaX <= -52 || fastLeftFlick) {
      setSplitSwipeOpenId(entryId);
      if (navigator.vibrate) navigator.vibrate(8);
    } else {
      setSplitSwipeOpenId(null);
    }
    setSplitTouch({ entryId: null, startX: 0, deltaX: 0, startAt: 0 });
  };

  const openToolsChooser = () => {
    if (!activeChat) return;
    setToolsChooserOpen(true);
  };

  const openToolScreen = (tool) => {
    setChatTool(tool);
    setToolsChooserOpen(false);
    setToolScreenOpen(true);
    if (tool === 'split' && combinedMembers.length > 0) {
      setSplitDraft((draft) => ({
        ...draft,
        paidBy: draft.paidBy || combinedMembers[0].id,
        splitWith: draft.splitWith.length ? draft.splitWith : combinedMembers.map(member => member.id),
      }));
    }
  };

  const processChatToolPhotoFiles = async (files) => {
    const imageFiles = (files || []).filter((file) => file.type?.startsWith('image/'));
    if (!imageFiles.length) return;
    setChatPhotoUploading(true);
    setChatPhotoProgress(0);
    try {
      let auth = null;
      try { auth = await imagekitAuth(); } catch (e) {
        console.error('IK auth failed', e);
        setChatPhotoUploading(false);
        return;
      }
      for (let i = 0; i < imageFiles.length; i += 1) {
        try {
          const file = imageFiles[i];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `club_chat_${trip.id}_${Date.now()}_${i}_${safeName}`;

          const form = new FormData();
          form.append('file', file);
          form.append('fileName', fileName);
          form.append('folder', `/tb-club-chat/${trip.id}`);
          form.append('useUniqueFileName', 'false');
          form.append('publicKey', auth.publicKey);
          form.append('signature', auth.signature);
          form.append('expire', String(auth.expire));
          form.append('token', auth.token);

          const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
          const uploadData = await uploadRes.json();

          if (!uploadData.url) {
            console.error('Club chat IK upload error', uploadData);
            continue;
          }

          await addPhoto(trip.id, uploadData.url);
          setChatPhotoProgress(Math.round(((i + 1) / imageFiles.length) * 100));
        } catch (fileErr) {
          console.error('Club chat per-file upload error:', fileErr);
        }
      }

      try {
        await loadHub();
      } catch (refreshErr) {
        console.warn('Could not refresh club hub after upload:', refreshErr);
      }
      // Keep the user in the photo tool screen by avoiding parent-level remount/reset.
      // Club hub refresh is sufficient to show the newly uploaded images here.
    } catch (err) {
      alert('Could not upload photo(s): ' + getErrorMessage(err, 'Unknown upload error'));
    } finally {
      setChatPhotoUploading(false);
      setChatPhotoProgress(0);
      if (chatPhotoInputRef.current) chatPhotoInputRef.current.value = '';
      setChatPhotoDragging(false);
    }
  };

  const handleChatToolPhotoUpload = (event) => {
    const files = Array.from(event.target.files || []);
    void processChatToolPhotoFiles(files);
  };

  const handleChatToolPhotoDrop = (event) => {
    event.preventDefault();
    setChatPhotoDragging(false);
    const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type?.startsWith('image/'));
    if (!files.length) return;
    void processChatToolPhotoFiles(files);
  };

  const toggleChatPhotoSelection = (photoId) => {
    setChatPhotoSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const clearChatPhotoSelection = () => setChatPhotoSelected(new Set());

  const downloadSelectedChatPhotos = async () => {
    for (const photo of selectedChatPhotos) {
      try {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = photo.url.split('/').pop() || `photo-${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch {
        window.open(photo.url, '_blank');
      }
    }
  };

  const deleteSelectedChatPhotos = async () => {
    if (!canDeleteSelectedChatPhotos) return;
    if (!confirm('Delete selected photos from your trip album?')) return;
    setClubBusy(true);
    try {
      for (const photo of selectedChatPhotos) {
        const storagePath = extractStoragePathFromPublicUrl(photo.url);
        if (storagePath) await supabase.storage.from('trip-photos').remove([storagePath]);
        await deletePhoto(trip.id, photo.id);
      }
      try {
        await loadHub();
      } catch (refreshErr) {
        console.warn('Could not refresh club hub after delete:', refreshErr);
      }
      clearChatPhotoSelection();
    } catch (err) {
      alert('Could not delete selected photos: ' + getErrorMessage(err, 'Unknown delete error'));
    } finally {
      setClubBusy(false);
    }
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setFiltersOpen(false);
  };

  /* Sorted discover cards memo */
  const sortedDiscoverCards = useMemo(() => {
    return [...filteredDiscover]
      .map(item => ({
        item,
        alreadySent: hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending'),
        compatibility: buildCompatibility(hub.myProfile, trip, item),
      }))
      .sort((a, b) => b.compatibility.score - a.compatibility.score);
  }, [filteredDiscover, hub.outgoingRequests, hub.myProfile, trip]);

  /* Swipe deck actions */
  const doClubSwipe = (dir, startX = 0) => {
    if (swipeOut || swipeIdx >= sortedDiscoverCards.length) return;
    const currentItem = sortedDiscoverCards[swipeIdx]?.item;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 420;
    const flyX = dir === 'right' ? Math.max(startX, screenW * 1.3) : Math.min(startX, -screenW * 1.3);
    setSwipeOut(dir);
    setSwipeDragX(flyX);
    setSwipeDragY(0);
    swipeLastDragXRef.current = flyX;
    setTimeout(() => {
      if (dir === 'right' && currentItem) {
        setSwipeRequestPending(currentItem);
      }
      setSwipeIdx(prev => prev + 1);
      setSwipeOut(null);
      setSwipeDragX(0);
      setSwipeDragY(0);
      swipeLastDragXRef.current = 0;
    }, 370);
  };

  const handleSwipePointerDown = (e) => {
    if (swipeOut) return;
    swipePointerStartRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: false, lastX: e.clientX, lastT: Date.now(), vx: 0 };
  };

  const handleSwipePointerMove = (e) => {
    if (!swipePointerStartRef.current || e.pointerId !== swipePointerStartRef.current.id) return;
    const dx = e.clientX - swipePointerStartRef.current.x;
    const dy = e.clientY - swipePointerStartRef.current.y;
    if (!swipePointerStartRef.current.locked) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (Math.abs(dy) > Math.abs(dx)) { swipePointerStartRef.current = null; setSwipeIsDragging(false); return; }
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
      swipePointerStartRef.current = { ...swipePointerStartRef.current, locked: true };
      setSwipeIsDragging(true);
    }
    const now = Date.now();
    const dt = Math.max(1, now - swipePointerStartRef.current.lastT);
    const vx = (e.clientX - swipePointerStartRef.current.lastX) / dt;
    swipePointerStartRef.current = { ...swipePointerStartRef.current, lastX: e.clientX, lastT: now, vx };
    swipeLastDragXRef.current = dx;
    if (swipeRafRef.current) cancelAnimationFrame(swipeRafRef.current);
    const snapDx = dx, snapDy = dy;
    swipeRafRef.current = requestAnimationFrame(() => {
      setSwipeDragX(snapDx);
      setSwipeDragY(snapDy);
      swipeRafRef.current = null;
    });
  };

  const handleSwipePointerUp = () => {
    if (swipeRafRef.current) { cancelAnimationFrame(swipeRafRef.current); swipeRafRef.current = null; }
    if (!swipeIsDragging) { swipePointerStartRef.current = null; return; }
    const dx = swipeLastDragXRef.current;
    const vx = swipePointerStartRef.current?.vx || 0;
    setSwipeIsDragging(false);
    swipePointerStartRef.current = null;
    if (dx > 55 || (vx > 0.35 && dx > 25)) { swipeLastDragXRef.current = 0; doClubSwipe('right', dx); }
    else if (dx < -55 || (vx < -0.35 && dx < -25)) { swipeLastDragXRef.current = 0; doClubSwipe('left', dx); }
    else { swipeLastDragXRef.current = 0; setSwipeDragX(0); setSwipeDragY(0); }
  };

  const handleSwipePointerCancel = () => {
    if (swipeRafRef.current) { cancelAnimationFrame(swipeRafRef.current); swipeRafRef.current = null; }
    setSwipeIsDragging(false);
    swipePointerStartRef.current = null;
    swipeLastDragXRef.current = 0;
    setSwipeDragX(0);
    setSwipeDragY(0);
  };

  const handleProfilePointerDown = (e) => {
    profileDragRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: false, lastX: e.clientX };
  };
  const handleProfilePointerMove = (e) => {
    if (!profileDragRef.current || e.pointerId !== profileDragRef.current.id) return;
    const dx = e.clientX - profileDragRef.current.x;
    const dy = e.clientY - profileDragRef.current.y;
    if (!profileDragRef.current.locked) {
      if (Math.abs(dy) > Math.abs(dx) + 4) { profileDragRef.current = null; return; }
      if (Math.abs(dx) < 5) return;
      profileDragRef.current = { ...profileDragRef.current, locked: true };
      setProfileDragging(true);
    }
    profileLastDragX.current = dx;
    setProfileDragX(dx);
  };
  const handleProfilePointerUp = (card) => () => {
    if (!profileDragging) { profileDragRef.current = null; return; }
    const dx = profileLastDragX.current;
    setProfileDragging(false);
    profileDragRef.current = null;
    if (dx > 60) {
      setProfileDragX(window.innerWidth);
      setTimeout(() => { setProfileDragX(0); profileLastDragX.current = 0; setRequestFor(card?.tripId); }, 320);
    } else if (dx < -60) {
      setProfileDragX(-window.innerWidth);
      setTimeout(() => { setSelectedCard(null); setRequestFor(null); setRequestMessage(''); setProfileDragX(0); profileLastDragX.current = 0; }, 320);
    } else {
      setProfileDragX(0); profileLastDragX.current = 0;
    }
  };

  const handleSwipeSendRequest = async () => {
    if (!swipeRequestPending || !requestMessage.trim()) return;
    setClubBusy(true);
    try {
      await sendClubRequest(trip.id, swipeRequestPending.tripId, requestMessage.trim());
      setSwipeRequestPending(null);
      setRequestMessage('');
      await loadHub();
    } catch (err) {
      alert('Could not send request: ' + err.message);
    }
    setClubBusy(false);
  };

  const selectedAlreadySent = selectedCard
    ? hub.outgoingRequests.some(r => r.targetTripId === selectedCard.tripId && r.status === 'pending')
    : false;

  const selectedCardCompat = useMemo(
    () => selectedCard ? buildCompatibility(hub.myProfile, trip, selectedCard) : null,
    [selectedCard, hub.myProfile, trip]
  );

  const activeChat = useMemo(
    () => (hub.chats || []).find(chat => chat.id === selectedChatId) || null,
    [hub.chats, selectedChatId]
  );

  useEffect(() => {
    const open = !!(
      showClubGate
      || showProfileWizard
      || clubView === 'my-card'
      || clubView === 'profile'
      || clubView === 'requests'
      || (clubView === 'chats' && activeChat)
      || filtersOpen
      || selectedCard
      || swipeRequestPending
      || chatPhotoLightbox
      || splitFormOpen
      || (toolsChooserOpen && activeChat)
      || (toolScreenOpen && activeChat)
    );
    window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open } }));
    return () => window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: false } }));
  }, [showClubGate, showProfileWizard, clubView, activeChat, filtersOpen, selectedCard, swipeRequestPending, chatPhotoLightbox, splitFormOpen, toolsChooserOpen, toolScreenOpen]);

  const combinedMembers = useMemo(() => buildCombinedMembers(activeChat), [activeChat]);
  const combinedPhotos = useMemo(() => buildCombinedPhotos(activeChat), [activeChat]);
  const chatPhotoFolders = useMemo(() => {
    const folderMap = { all: combinedPhotos };
    combinedPhotos.forEach((photo) => {
      const source = photo.source || 'Shared';
      if (!folderMap[source]) folderMap[source] = [];
      folderMap[source].push(photo);
    });
    return folderMap;
  }, [combinedPhotos]);
  const chatFolderPhotos = useMemo(() => {
    if (chatPhotoFolder === 'all') return combinedPhotos;
    return chatPhotoFolders[chatPhotoFolder] || [];
  }, [chatPhotoFolder, chatPhotoFolders, combinedPhotos]);
  const selectedChatPhotos = useMemo(
    () => chatFolderPhotos.filter(photo => chatPhotoSelected.has(photo.id)),
    [chatFolderPhotos, chatPhotoSelected]
  );
  const canDeleteSelectedChatPhotos = useMemo(
    () => selectedChatPhotos.length > 0,
    [selectedChatPhotos]
  );
  const splitEntries = useMemo(() => activeChat?.splitExpenses || [], [activeChat]);
  const splitBalances = useMemo(
    () => computeSplitBalances(combinedMembers, splitEntries),
    [combinedMembers, splitEntries]
  );
  const splitMemberById = useMemo(
    () => Object.fromEntries(combinedMembers.map(member => [member.id, member])),
    [combinedMembers]
  );
  const splitSettlements = useMemo(() => buildSettlementsFromBalances(splitBalances), [splitBalances]);
  const splitPayTotals = useMemo(() => {
    const totals = {};
    combinedMembers.forEach((member) => {
      totals[member.id] = 0;
    });
    splitEntries.forEach((entry) => {
      const payerKey = entry.paidByKey || entry.paidBy;
      if (!payerKey) return;
      totals[payerKey] = (totals[payerKey] || 0) + (Number(entry.amount) || 0);
    });
    return totals;
  }, [combinedMembers, splitEntries]);

  const selectedGallery = useMemo(() => buildCardGallery(selectedCard), [selectedCard]);

  const unreadCountByChat = useMemo(() => {
    const map = {};
    (hub.chats || []).forEach((chat) => {
      const latest = chat.latestMessage;
      map[chat.id] = latest && latest.senderTripId !== trip.id ? 1 : 0;
    });
    return map;
  }, [hub.chats, trip.id]);

  const hasUnreadChats = useMemo(
    () => Object.values(unreadCountByChat).some(Boolean),
    [unreadCountByChat]
  );

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [selectedCard?.id]);

  useEffect(() => {
    setProfileDragX(0); setProfileDragging(false);
    profileDragRef.current = null; profileLastDragX.current = 0;
  }, [selectedCard?.id]);

  useEffect(() => {
    setSwipeIdx(0);
    setSwipeDragX(0);
    setSwipeDragY(0);
    setSwipeOut(null);
    swipePointerStartRef.current = null;
    swipeLastDragXRef.current = 0;
  }, [filteredDiscover]);

  useEffect(() => {
    if (!hub.chats?.length) {
      setSelectedChatId(null);
      return;
    }
    if (selectedChatId && !hub.chats.some(chat => chat.id === selectedChatId)) {
      setSelectedChatId(null);
    }
  }, [hub.chats, selectedChatId]);

  useEffect(() => {
    setChatPhotoFolder('all');
    setChatPhotoLightbox(null);
    setChatPhotoSelected(new Set());
  }, [activeChat?.id]);

  useEffect(() => {
    if (!combinedMembers.length) {
      setSplitDraft({ desc: '', amount: '', paidBy: '', splitWith: [] });
      return;
    }
    setSplitDraft((draft) => ({
      desc: draft.desc,
      amount: draft.amount,
      paidBy: draft.paidBy || combinedMembers[0].id,
      splitWith: draft.splitWith.length ? draft.splitWith : combinedMembers.map(member => member.id),
    }));
  }, [combinedMembers]);

  useEffect(() => {
    if (!selectedCard || selectedGallery.length <= 1) return undefined;
    const timer = setInterval(() => {
      setSelectedMediaIndex((current) => (current + 1) % selectedGallery.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [selectedCard, selectedGallery]);

  useEffect(() => {
    if (!activeChat || !chatThreadRef.current) return;
    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
  }, [activeChat?.id, activeChat?.messages?.length]);

  const premiumPanel = {
    background: 'linear-gradient(160deg,rgba(255,255,255,0.72),rgba(243,250,255,0.46))',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 34,
    padding: '1rem .95rem',
    marginBottom: '0.9rem',
    boxShadow: '0 24px 46px rgba(17,24,39,0.10)',
    backdropFilter: 'blur(14px)',
  };


  return (
    <div>
      <PullToRefreshSpinner active={isRefreshing} />
      <style>{`
        @keyframes clubPop {
          from { opacity: 0; transform: translateY(6px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clubCardIn {
          from { opacity: 0; transform: translateY(14px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clubSheetIn {
          from { opacity: 0; transform: translateY(28px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clubFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes clubFloat {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(-6px,8px,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes clubPulse {
          0% { box-shadow: 0 0 0 0 rgba(103,255,186,0.25); }
          70% { box-shadow: 0 0 0 10px rgba(103,255,186,0); }
          100% { box-shadow: 0 0 0 0 rgba(103,255,186,0); }
        }
        @keyframes clubRingIn {
          from { opacity: 0; transform: scale(.82) rotate(-90deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes clubSectionIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes clubShine {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          20% { opacity: .35; }
          60% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        @keyframes clubNeonGlow {
          0%,100% { box-shadow: 0 0 28px rgba(247,37,133,0.28), 0 0 56px rgba(76,201,240,0.12), 0 8px 40px rgba(11,6,25,0.7); }
          35% { box-shadow: 0 0 48px rgba(247,37,133,0.48), 0 0 80px rgba(76,201,240,0.22), 0 16px 60px rgba(11,6,25,0.8); }
          70% { box-shadow: 0 0 36px rgba(114,9,183,0.4), 0 0 64px rgba(247,37,133,0.2), 0 12px 50px rgba(11,6,25,0.75); }
        }
        @keyframes clubBannerIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes clubBannerShimmer {
          0%   { transform: translateX(-120%) skewX(-10deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(220%) skewX(-10deg); opacity: 0; }
        }
        @keyframes clubHeroShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes clubOrb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.8; }
          33% { transform: translate(-18px,14px) scale(1.12); opacity:1; }
          66% { transform: translate(12px,-10px) scale(0.92); opacity:.7; }
        }
        @keyframes clubOrb2 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.7; }
          40% { transform: translate(16px,-18px) scale(1.08); opacity:1; }
          75% { transform: translate(-10px,14px) scale(1.04); opacity:.8; }
        }
        @keyframes clubNeonScan {
          0% { transform: translateX(-140%) skewX(-12deg); opacity:0; }
          12% { opacity:1; }
          88% { opacity:1; }
          100% { transform: translateX(280%) skewX(-12deg); opacity:0; }
        }
        @keyframes clubTagPop {
          from { opacity:0; transform:scale(0.8) translateY(6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes clubPageSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (hover: hover) {
          button[data-club-card='true']:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 54px rgba(16,24,40,0.14);
          }
        }
        .club-chat-thread {
          background-image: radial-gradient(rgba(255,140,58,0.05) 1.5px, transparent 1.5px);
          background-size: 20px 20px;
        }
      `}</style>

      {/* Combined club gate: slide 0 = intro, slide 1 = T&C */}
      {showClubGate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,20,16,0.58)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', animation: 'clubFadeIn .22s ease both' }}
          onClick={dismissClubGate}>
          <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 420, boxShadow: '0 28px 80px rgba(28,20,16,0.28)', animation: 'clubSheetIn .45s cubic-bezier(0.34,1.3,0.64,1) both', position: 'relative' }}
            onClick={e => e.stopPropagation()}>

            {clubGateStep === 0 ? (
              // ── Slide 1: Intro ──
              <>
                <div style={{ height: 4, background: 'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
                <button onClick={dismissClubGate} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 10 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                {/* Lumi at top, centered, big */}
                <div style={{ background: 'linear-gradient(180deg,#FFF3EB 0%,#fff 100%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1.5rem 0 0', minHeight: 170, position: 'relative', overflow: 'hidden' }}>
                  <img src={clubHeaderImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22, pointerEvents: 'none' }} />
                  <img src={partyLumiImg} alt="Lumi" style={{ height: 160, width: 'auto', objectFit: 'contain', display: 'block', position: 'relative', zIndex: 1 }} />
                </div>
                {/* Text below */}
                <div style={{ padding: '0.9rem 1.25rem 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FFF3EB', borderRadius: 999, padding: '3px 9px', marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF6A00' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#FF6A00', letterSpacing: .8, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif" }}>Lumi says</span>
                  </div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#1C1410', lineHeight: 1.25, marginBottom: 7 }}>Find your travel tribe</div>
                  <div style={{ fontSize: 12, color: '#5C504A', lineHeight: 1.62, marginBottom: 12 }}>
                    Looking to travel with people you actually like? Club lets you discover groups heading to your destination, check out their vibe, and send a join request. Travel tribe, acquired.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.9rem' }}>
                    {[
                      'Discover trip groups matching your travel vibe',
                      'See member count, destination & travel style',
                      'Send a join request and chat before you go',
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 10, border: '1.5px solid rgba(255,106,0,0.3)', background: '#FFF8F4' }}>
                        <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink: 0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span style={{ fontSize: 11.5, color: '#5C504A', lineHeight: 1.4, fontWeight: 500 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Slide dots only shown on the first-time flow */}
                {!clubInfoOnly && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingBottom: 10 }}>
                    <div style={{ width: 18, height: 5, borderRadius: 3, background: '#FF6A00' }} />
                    <div style={{ width: 5, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.15)' }} />
                  </div>
                )}
                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                  <button onClick={advanceClubGate} style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: 'linear-gradient(135deg,#FF6A00,#FF8C3B)', color: '#fff', boxShadow: '0 4px 16px rgba(255,106,0,0.3)' }}>
                    {clubInfoOnly ? 'Got it 👍' : 'Next →'}
                  </button>
                </div>
              </>
            ) : (
              // ── Slide 2: T&C ──
              <>
                <div style={{ height: 4, background: 'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
                <button onClick={dismissClubGate} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 10 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
                  {/* icon + slide dots row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 17, background: 'linear-gradient(135deg,#FF6A00,#FF8C3B)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(255,106,0,0.28)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <div style={{ width: 5, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.15)' }} />
                      <div style={{ width: 18, height: 5, borderRadius: 3, background: '#FF6A00' }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: '#1C1410', marginBottom: 8, lineHeight: 1.2 }}>Welcome to Club</div>
                  <div style={{ fontSize: 12.5, color: '#5C504A', lineHeight: 1.75, marginBottom: 16 }}>
                    By joining Club, you acknowledge that all interactions with other members are <strong style={{ color: '#1C1410' }}>voluntary and at your own discretion</strong>. While we strive to maintain a safe and respectful community, we do not verify the identity, background, intentions, or conduct of users.
                    <br /><br />
                    Any communication, meetup, or relationship that occurs through or outside the platform is solely between the participating individuals. <strong style={{ color: '#1C1410' }}>You are responsible for exercising appropriate caution and judgment</strong> when interacting with others. To the maximum extent permitted by law, we are not liable for any disputes, damages, or incidents arising from user interactions, whether online or offline.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 14, background: termsChecked ? '#FFF3EB' : '#F4F2EE', border: `1.5px solid ${termsChecked ? '#FF6A00' : 'rgba(28,20,16,0.1)'}`, marginBottom: 16, transition: 'all .18s' }}>
                    <div onClick={() => setTermsChecked(v => !v)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${termsChecked ? '#FF6A00' : 'rgba(28,20,16,0.25)'}`, background: termsChecked ? '#FF6A00' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all .15s', cursor: 'pointer' }}>
                      {termsChecked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1410', lineHeight: 1.6 }}>
                      I understand that interactions with other Club members are at my own discretion and risk, and I agree to the <span style={{ color: '#FF6A00', textDecoration: 'underline' }}>Club Terms &amp; Safety Guidelines</span>.
                    </span>
                  </label>
                  <button
                    onClick={acceptClubTerms}
                    disabled={!termsChecked}
                    style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 14, border: 'none', cursor: termsChecked ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", background: termsChecked ? 'linear-gradient(135deg,#FF6A00,#FF8C3B)' : '#E0E0E0', color: termsChecked ? '#fff' : '#9E9E9E', boxShadow: termsChecked ? '0 4px 16px rgba(255,106,0,0.3)' : 'none', transition: 'all .2s' }}
                  >
                    Find my people 🌍
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Location permission prompt — disabled until live location feature is re-enabled */}
      {/* {showLocationPrompt && !showClubGate && ( ... )} */}

      {/* Profile wizard — shown after T&C on first visit */}
      {showProfileWizard && (
        <ClubProfileWizard
          tripId={trip.id}
          tripDest={trip.destination}
          tripArrival={trip.arrival || trip.startDate}
          tripDeparture={trip.departure || trip.endDate}
          isEditing={Object.keys(wizardData).length > 0}
          onComplete={data => {
            setWizardData(data);
            setShowProfileWizard(false);
          }}
          onSkip={() => setShowProfileWizard(false)}
        />
      )}

      {/* Hero card */}
      <div style={{ margin: '4px 8px 0', borderRadius: 22, background: 'linear-gradient(to right,#EE0FA0 0%,#8820D0 50%,#1C0A8A 100%)', backgroundSize: '200% 100%', padding: '12px 14px 30px', position: 'relative', overflow: 'hidden', flexShrink: 0, animation: 'clubBannerIn 0.45s cubic-bezier(0.2,0.8,0.2,1) both, clubHeroShift 10s ease infinite 0.6s', boxShadow: '0 12px 40px rgba(200,10,140,0.38), 0 4px 14px rgba(0,0,0,0.18)' }}>
        {/* Shimmer sweep */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.09) 50%,transparent 80%)', animation: 'clubBannerShimmer 6s ease-in-out infinite 3s', pointerEvents: 'none', zIndex: 0 }} />
        {/* Pink orb — left */}
        <div style={{ position: 'absolute', top: '-25%', left: '-12%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,60,180,0.38) 0%,transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'clubOrb1 7s ease-in-out infinite' }} />
        {/* Indigo orb — right */}
        <div style={{ position: 'absolute', top: '-35%', right: '-8%', width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle,rgba(80,20,210,0.32) 0%,transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'clubOrb2 9s ease-in-out infinite 2s' }} />
        {/* 3-col grid: logo | BETA (true center) | buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <img src={bglessClubLogo} alt="TripBae Club" style={{ height: 58, width: 'auto', objectFit: 'contain', display: 'block', justifySelf: 'start', mixBlendMode: 'screen', filter: 'grayscale(1) brightness(8) contrast(200%)' }} />
          {/* BETA — guaranteed center column */}
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.78)', fontFamily: "'DM Sans',sans-serif", letterSpacing: '1.4px', textAlign: 'center', animation: 'clubTagPop 0.4s cubic-bezier(0.2,0.8,0.2,1) both 0.35s' }}>BETA</span>
          {/* Icon buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifySelf: 'end' }}>
            <button onClick={() => setClubView('my-card')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.16)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              </div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.82)', fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Profile</span>
            </button>
            <button onClick={() => setClubView('requests')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, position: 'relative' }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.16)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,13 22,4" /></svg>
              </div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.82)', fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Requests</span>
              {hub.incomingRequests.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#FCD34D', border: '1.5px solid rgba(28,10,138,0.7)', boxShadow: '0 0 6px rgba(252,211,77,0.8)' }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Tab switcher — overlaps hero bottom, sticky */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, marginTop: -18, padding: '0 40px' }}>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 18px rgba(0,0,0,0.11)', display: 'flex', alignItems: 'stretch' }}>
          <button
            onClick={() => setClubView('discover')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0 8px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', borderRadius: '14px 0 0 14px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={clubView === 'discover' ? '#6B21A8' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: clubView === 'discover' ? 700 : 500, fontSize: 12, color: clubView === 'discover' ? '#6B21A8' : '#6B7280' }}>Discover</span>
            {clubView === 'discover' && <span style={{ position: 'absolute', bottom: 0, left: '18%', right: '18%', height: 2, borderRadius: '2px 2px 0 0', background: '#7C3AED' }} />}
          </button>
          <div style={{ width: 1, background: '#E5E7EB', margin: '7px 0', flexShrink: 0 }} />
          <button
            onClick={() => { setClubView('chats'); setSelectedChatId(null); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0 8px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', borderRadius: '0 14px 14px 0' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={clubView === 'chats' ? '#6B21A8' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: clubView === 'chats' ? 700 : 500, fontSize: 12, color: clubView === 'chats' ? '#6B21A8' : '#6B7280' }}>Chat</span>
            {hasUnreadChats && <span style={{ position: 'absolute', top: 7, right: '20%', width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />}
            {clubView === 'chats' && <span style={{ position: 'absolute', bottom: 0, left: '18%', right: '18%', height: 2, borderRadius: '2px 2px 0 0', background: '#7C3AED' }} />}
          </button>
        </div>
      </div>
      <div style={{ padding: '0.75rem 1rem 6rem' }}>

          {/* ── Personal Travel Card (wizard result) ── */}
          {clubView === 'my-card' && (
            <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 800, overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'clubPageSlideIn .3s cubic-bezier(0.4,0,0.2,1) both' }}>
              <img src={clubHeader2Img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: 220, objectFit: 'cover', opacity: 0.2, pointerEvents: 'none' }} />
              <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #F3F4F6', zIndex: 10, display: 'flex', alignItems: 'center', padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))', gap: 12, flexShrink: 0, isolation: 'isolate' }}>
                <button onClick={() => setClubView('discover')} style={{ width: 36, height: 36, borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17, background: 'linear-gradient(135deg,#EE0FA0 0%,#8820D0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block' }}>Profile</div>
                </div>
              </div>
              <div style={{ padding: '8px 5px 80px', background: '#fff' }}>
                {Object.keys(wizardData).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <img src={partyLumi5Img} alt="Lumi" style={{ height: 120, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 12px' }} />
                    <img src={clubBannerNarrow} alt="" style={{ width: '100%', height: 36, objectFit: 'cover', borderRadius: 10, opacity: 0.85, marginBottom: 12 }} />
                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 8 }}>Your profile isn't set up yet</div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Create your travel card so others can discover and match with you.</div>
                    <button
                      onClick={() => setShowProfileWizard(true)}
                      style={{ padding: '14px 28px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#EE0FA0,#8820D0)', color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(136,32,208,0.35)' }}
                    >
                      Create My Profile ✨
                    </button>
                  </div>
                ) : (
                  <ClubPersonalCard
                    data={wizardData}
                    onEdit={() => setShowProfileWizard(true)}
                  />
                )}
              </div>
            </div>
          )}

          {clubView === 'profile' && (
            <div style={{ position: 'fixed', inset: 0, background: '#F7F4FF', zIndex: 800, overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'clubPageSlideIn .3s cubic-bezier(0.4,0,0.2,1) both' }}>
              <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #F3F4F6', zIndex: 10, display: 'flex', alignItems: 'center', padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))', gap: 12, flexShrink: 0 }}>
                <button onClick={() => setClubView('discover')} style={{ width: 36, height: 36, borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17, color: '#111827' }}>My Profile</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>How others discover you</div>
                </div>
              </div>
              <div style={{ padding: '0 0 60px', background: '#F7F4FF' }}>
            <div style={{ textAlign: 'center', padding: '20px 16px 14px' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 19, color: '#1E1B4B' }}>Your Profile</div>
              <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 3 }}>This is how others discover you. Make it real.</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '5px 12px', borderRadius: 99, background: trip?.isSolo ? '#FFF7ED' : '#EDE9FE', border: `1.5px solid ${trip?.isSolo ? '#FED7AA' : '#DDD6FE'}` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={trip?.isSolo ? '#C2410C' : '#7C3AED'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {trip?.isSolo ? <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></> : <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: trip?.isSolo ? '#C2410C' : '#7C3AED' }}>{trip?.isSolo ? 'Solo Traveller' : 'Group'}</span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>not changeable</span>
              </div>
            </div>
            <div style={{ padding: '0 16px', marginBottom: 16 }}>
              <div style={{ background: '#fff', borderRadius: 20, border: '1.5px dashed #DDD6FE', padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gridTemplateRows: '98px 98px', gap: 8 }}>
                  <div style={{ gridRow: '1 / 3', position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#F5F3FF', cursor: 'pointer' }} onClick={() => !profilePhotoUploading && fileRef.current?.click()}>
                    {(profileForm.photoUrls || [])[0] ? (
                      <>
                        <img src={profileForm.photoUrls[0]} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button type="button" onClick={e => { e.stopPropagation(); setProfileForm(f => ({ ...f, photoUrls: f.photoUrls.filter((_, j) => j !== 0) })); }} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', border: '2px solid #fff', background: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                        <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(124,58,237,0.82)', padding: '2px 7px', borderRadius: 99 }}>COVER</div>
                      </>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 10px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>Add cover photo</div>
                          <div style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2, lineHeight: 1.4 }}>First photo is your cover. Swipeable in your card.</div>
                        </div>
                        {profilePhotoUploading && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.2)', borderTopColor: '#7C3AED', animation: 'clubSpin .75s linear infinite' }} />}
                      </div>
                    )}
                  </div>
                  {[1, 2].map(i => (
                    <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F5F3FF', cursor: 'pointer' }} onClick={() => !profilePhotoUploading && fileRef.current?.click()}>
                      {(profileForm.photoUrls || [])[i] ? (
                        <>
                          <img src={profileForm.photoUrls[i]} alt={`photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <button type="button" onClick={e => { e.stopPropagation(); setProfileForm(f => ({ ...f, photoUrls: f.photoUrls.filter((_, j) => j !== i) })); }} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #fff', background: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </>
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: i === 0 ? 16 : 6, height: 6, borderRadius: 3, background: i < (profileForm.photoUrls || []).length ? '#7C3AED' : '#E5E7EB', transition: 'all .2s' }} />)}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </div>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 1, paddingTop: 10 }}>{trip?.isSolo ? 'Your Name' : 'Group Name'}</div>
                  <input style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0 10px', fontSize: 14, fontWeight: 500, color: '#111827', background: 'transparent', fontFamily: "'DM Sans',sans-serif" }} value={profileForm.title} onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))} placeholder={trip?.isSolo ? 'e.g. Priya from Mumbai' : 'Enter a catchy name for your group'} />
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE9FE', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0 14px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 14 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 1, paddingTop: 10 }}>{trip?.isSolo ? 'About Myself' : 'About Your Group'}</div>
                  <textarea style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0 10px', fontSize: 14, color: '#374151', background: 'transparent', resize: 'none', minHeight: 70, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55 }} value={profileForm.about} onChange={e => setProfileForm(f => ({ ...f, about: e.target.value }))} placeholder={trip?.isSolo ? 'Tell people who you are. Vibe, interests, energy...' : 'Tell people who you are. Energy, vibe, what makes your group unique?'} />
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 1, paddingTop: 10 }}>What You Want to Do Together</div>
                  <input style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0 10px', fontSize: 14, color: '#374151', background: 'transparent', fontFamily: "'DM Sans',sans-serif" }} value={profileForm.lookingFor} onChange={e => setProfileForm(f => ({ ...f, lookingFor: e.target.value }))} placeholder="e.g. Rooftop bar, street food crawl, night market" />
                </div>
              </div>
            </div>
            <div style={{ padding: '10px 16px 0', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '8px 10px', minWidth: 90 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Vibe</div>
                  <select style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#374151', background: 'transparent', cursor: 'pointer', width: '100%', fontFamily: "'DM Sans',sans-serif" }} value={profileForm.vibe} onChange={e => setProfileForm(f => ({ ...f, vibe: e.target.value }))}>
                    {VIBE_OPTIONS.filter(v => v.value !== 'any').map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                {!trip?.isSolo && (
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '8px 10px', minWidth: 110 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Group Mix</div>
                    <select style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#374151', background: 'transparent', cursor: 'pointer', width: '100%', fontFamily: "'DM Sans',sans-serif" }} value={profileForm.genderMix} onChange={e => setProfileForm(f => ({ ...f, genderMix: e.target.value }))}>
                      {GENDER_MIX_OPTIONS.filter(g => g.value !== 'any').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '8px 10px', minWidth: 100 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Age Group</div>
                  <select style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#374151', background: 'transparent', cursor: 'pointer', width: '100%', fontFamily: "'DM Sans',sans-serif" }} value={profileForm.ageRange} onChange={e => setProfileForm(f => ({ ...f, ageRange: e.target.value }))}>
                    {AGE_RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '8px 10px', minWidth: 130 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Interests</div>
                  <input style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: '#374151', background: 'transparent', width: '100%', fontFamily: "'DM Sans',sans-serif" }} value={profileForm.coverTagsInput} onChange={e => setProfileForm(f => ({ ...f, coverTagsInput: e.target.value }))} placeholder="e.g. hiking, food" />
                </div>
              </div>
            </div>
            {/* Your Location block — disabled until live location feature is re-enabled */}
            <div style={{ padding: '18px 16px 0' }}>
              <button style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 800, borderRadius: 16, border: 'none', cursor: (clubBusy || profilePhotoUploading) ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", background: 'linear-gradient(135deg,#7B2FF7,#C01FAB,#FF416C)', color: '#fff', boxShadow: '0 4px 20px rgba(123,47,247,0.35)', opacity: (clubBusy || profilePhotoUploading) ? 0.7 : 1 }} disabled={clubBusy || profilePhotoUploading} onClick={handleSaveProfile}>
                {clubBusy ? 'Saving...' : 'Save My Card'}
              </button>
            </div>
          </div>
            </div>
          )}

          {clubView === 'requests' && (
            <div style={{ position: 'fixed', inset: 0, background: '#F8F9FA', zIndex: 800, overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'clubPageSlideIn .3s cubic-bezier(0.4,0,0.2,1) both' }}>
              <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #F3F4F6', zIndex: 10, display: 'flex', alignItems: 'center', padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))', gap: 12, flexShrink: 0 }}>
                <button onClick={() => setClubView('discover')} style={{ width: 36, height: 36, borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17, color: '#111827' }}>Join Requests</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{hub.incomingRequests.length} pending</div>
                </div>
              </div>
              <div style={{ padding: '16px 16px 60px' }}>
              {hub.incomingRequests.length === 0 && (
                <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '2.5rem 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                  No pending requests right now.
                </div>
              )}
              {hub.incomingRequests.map((req, idx) => (
                <div key={req.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: idx < hub.incomingRequests.length - 1 ? '1px solid rgba(15,23,42,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{req.requesterTrip.groupName}</div>
                      <div style={{ fontSize: 12, color: '#60636D', marginTop: 3, lineHeight: 1.5 }}>{req.message}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{formatChatMetaTime(req.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ ...S.btn, ...S.btnP, marginTop: 0, flex: 1, justifyContent: 'center' }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>Accept</button>
                    <button style={{ ...S.btn, marginTop: 0, flex: 1, justifyContent: 'center' }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>Decline</button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

          {clubView === 'chats' && (
            <div style={{ animation: 'clubPop .25s ease-out both' }}>
              {(!hub.chats || hub.chats.length === 0) && (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#F3F4F6,#E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No conversations yet</div>
                  <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>Accept a connection request to start chatting with another group.</div>
                </div>
              )}

              {hub.chats?.length > 0 && !activeChat && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {hub.chats.map((chat) => {
                    const preview = chat.latestMessage?.text || 'No messages yet.';
                    const unread = unreadCountByChat[chat.id] || 0;
                    const otherName = chat.otherTrip?.groupName || '';
                    const myName = trip.groupName || '';
                    const myInitial = (myName.trim()[0] || 'A').toUpperCase();
                    const otherInitial = (otherName.trim()[0] || 'J').toUpperCase();
                    const displayTitle = [myName.split(' ')[0], otherName.split(' ')[0]].filter(Boolean).join(' × ');
                    const timeLabel = chat.latestMessage?.createdAt ? formatChatMetaTime(chat.latestMessage.createdAt) : '';
                    return (
                      <button key={chat.id} onClick={() => setSelectedChatId(chat.id)}
                        style={{
                          width: '100%', textAlign: 'left', border: 'none', background: unread ? '#FAFFF9' : '#fff',
                          borderRadius: 16, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 6
                        }}>
                        {/* Avatar stack */}
                        <div style={{ position: 'relative', width: 52, height: 38, flexShrink: 0 }}>
                          <div style={{ position: 'absolute', left: 0, top: 3, width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff', border: '2.5px solid #fff', zIndex: 2, boxShadow: '0 2px 8px rgba(255,106,0,0.28)' }}>{myInitial}</div>
                          <div style={{ position: 'absolute', left: 20, top: 3, width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B35,#E04A1F)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff', border: '2.5px solid #fff', zIndex: 1, boxShadow: '0 2px 8px rgba(255,107,53,0.28)' }}>{otherInitial}</div>
                        </div>
                        {/* Text */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                            <div style={{ fontSize: 14, fontWeight: unread ? 800 : 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</div>
                            <div style={{ fontSize: 11, color: '#D1D5DB', flexShrink: 0, fontWeight: 400 }}>{timeLabel}</div>
                          </div>
                          <div style={{ fontSize: 13, color: unread ? '#374151' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: preview === 'No messages yet.' ? 'italic' : 'normal', fontWeight: unread ? 500 : 400 }}>{preview}</div>
                        </div>
                        {unread ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6A00', flexShrink: 0, display: 'block', boxShadow: '0 0 0 3px rgba(255,106,0,0.2)' }} /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {clubView === 'chats' && activeChat && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 545, background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '10px 14px', paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))', background: '#fff', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <button style={{ width: 36, height: 36, borderRadius: 11, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSelectedChatId(null)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <div style={{ position: 'relative', width: 42, height: 32, flexShrink: 0 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#fff', border: '2.5px solid #fff', zIndex: 2 }}>{(trip.groupName?.trim()[0] || 'M').toUpperCase()}</div>
                    <div style={{ position: 'absolute', left: 14, top: 0, width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B35,#E04A1F)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#fff', border: '2.5px solid #fff', zIndex: 1 }}>{(activeChat.otherTrip?.groupName?.trim()[0] || 'J').toUpperCase()}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                      {trip.groupName?.split(' ')[0]} × {activeChat.otherTrip?.groupName?.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Club connection</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <button style={{ width: 36, height: 36, borderRadius: 11, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#6B7280' }} onClick={() => setChatMenuOpen(o => !o)}>⋯</button>
                    {chatMenuOpen && (
                      <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', border: '1px solid rgba(0,0,0,0.07)', zIndex: 10, overflow: 'hidden', minWidth: 162 }}>
                        <button onClick={() => { setChatMenuOpen(false); handleDeleteChat(); }} disabled={clubBusy} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>🗑 Delete Chat</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages thread */}
              <div ref={chatThreadRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8, background: '#F8F9FA' }}>
                {/* Subtle dot bg */}
                <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px,transparent 1px)', backgroundSize: '20px 20px', zIndex: 0, pointerEvents: 'none' }} />
                {activeChat.messages?.length ? activeChat.messages.map(message => {
                  const mine = message.senderTripId === trip.id;
                  return (
                    <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', position: 'relative', zIndex: 1 }}>
                      <div style={{ maxWidth: '78%' }}>
                        {!mine && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 3, marginLeft: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {message.senderUser?.name || activeChat.otherTrip?.groupName}
                          </div>
                        )}
                        <div style={{ background: mine ? 'linear-gradient(135deg,#FF6A00,#FF8C3A)' : '#fff', color: mine ? '#fff' : '#111827', borderRadius: mine ? '20px 20px 4px 20px' : '20px 20px 20px 4px', padding: '10px 14px', boxShadow: mine ? '0 4px 14px rgba(255,106,0,0.28)' : '0 2px 8px rgba(0,0,0,0.08)', border: mine ? 'none' : '1px solid #F3F4F6' }}>
                          <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{message.text}</div>
                          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 5, textAlign: mine ? 'right' : 'left' }}>{formatChatTime(message.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>You're connected!</div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', lineHeight: 1.65 }}>Say hi. First message is always the hardest.</div>
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div style={{ padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #F3F4F6', background: '#fff', boxShadow: '0 -4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    style={{ flex: 1, resize: 'none', height: 44, minHeight: 44, maxHeight: 120, border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '10px 14px', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', lineHeight: 1.4, color: '#111827', background: '#F9FAFB', overflowY: 'auto' }}
                    value={chatDraft} onChange={e => setChatDraft(e.target.value)} onKeyDown={handleChatKeyDown}
                    placeholder={`Message ${activeChat.otherTrip?.groupName || 'this group'}…`}
                  />
                  {/* tools button — hidden until features are ready */}
                  <button style={{ height: 44, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '0 18px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,106,0,0.3)', opacity: (!chatDraft.trim() || clubBusy) ? 0.5 : 1 }} disabled={clubBusy || !chatDraft.trim()} onClick={handleSendChat}>Send</button>
                </div>
              </div>
            </div>
          )}

          {false && toolsChooserOpen && activeChat && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 560, background: 'rgba(9,12,18,0.52)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
              <div style={{ width: '100%', maxWidth: 400, borderRadius: 26, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.32)', animation: 'clubSheetIn .28s cubic-bezier(.2,.7,.2,1) both' }}>
                {/* Gradient header */}
                <div style={{ background: 'linear-gradient(135deg,#0F4B3E,#FF6A00)', padding: '18px 18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>Tools</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>Choose what you want to do for this group</div>
                  </div>
                  <button
                    style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                    onClick={() => setToolsChooserOpen(false)}
                  >✕</button>
                </div>
                {/* Tool cards */}
                <div style={{ background: '#fff', padding: '14px 14px 18px', display: 'grid', gap: 12 }}>
                  <button
                    onClick={() => openToolScreen('split')}
                    style={{ textAlign: 'left', border: 'none', borderRadius: 18, padding: 0, background: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ background: 'linear-gradient(135deg,#E8FFF8,#C9F5E7)', borderRadius: 18, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(255,140,58,0.1)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(255,140,58,0.32)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="3" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></svg>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#0A2A1F' }}>Split Expenses</div>
                        <div style={{ fontSize: 12, color: '#3D8A6E', marginTop: 3, lineHeight: 1.45 }}>Track & split costs across both groups</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => openToolScreen('photos')}
                    style={{ textAlign: 'left', border: 'none', borderRadius: 18, padding: 0, background: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ background: 'linear-gradient(135deg,#FFF5EC,#FFDFBE)', borderRadius: 18, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(255,107,53,0.1)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#FF6B35,#E04A1F)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(255,107,53,0.32)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#2A1200' }}>Shared Album</div>
                        <div style={{ fontSize: 12, color: '#A04A1F', marginTop: 3, lineHeight: 1.45 }}>Browse & upload photos from both trips</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {false && toolScreenOpen && activeChat && chatTool === 'split' && (
            <div className="tb-animated-screen" style={{ position: 'fixed', inset: 0, zIndex: 570, background: '#fff', overflowY: 'auto' }}>
              <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: 18, paddingTop: 'calc(18px + env(safe-area-inset-top, 0px))', background: 'linear-gradient(135deg,#0F172A,#134E4A)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800 }}>Split</div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{combinedMembers.length} combined members, one shared wallet view</div>
                </div>
                <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setToolScreenOpen(false)}>✕</button>
              </div>

              <div style={{ padding: 16, maxWidth: 1020, margin: '0 auto' }}>
                <div style={{ background: '#FFF8E6', border: '1px solid #F4D79B', color: '#7A4B00', borderRadius: 12, padding: '10px 12px', fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>
                  Note: expenses of your original group members added here will be reflected and adjusted automatically in the main Split tab.
                  Keep adding expenses normally, and do not worry about settling twice.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="tb-float-card tb-pop-in" style={{ background: '#F4FBF8', border: '1px solid #DAF2E8', borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#FF8C3A' }}>Total spent</div>
                    <div className="tb-amount-pop" style={{ marginTop: 4, fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#0C3B31' }}>
                      ₹{Math.round(splitEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="tb-float-card tb-pop-in" style={{ background: '#F8FAFC', border: '1px solid #E3E8EF', borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#475467' }}>Per member</div>
                    <div className="tb-amount-pop" style={{ marginTop: 4, fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
                      ₹{combinedMembers.length ? Math.round(splitEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) / combinedMembers.length).toLocaleString('en-IN') : '0'}
                    </div>
                  </div>
                  <div className="tb-float-card tb-pop-in" style={{ background: '#F8F8FF', border: '1px solid #E7E5FF', borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#4C3D9A' }}>Entries</div>
                    <div style={{ marginTop: 4, fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#281D72' }}>{splitEntries.length}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {combinedMembers.map(member => (
                    <div key={`pill-${member.id}`} className="tb-soft-fade" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 999, padding: '4px 9px 4px 5px', fontSize: 12 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FF8C3A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>
                        {member.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{member.nickname}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 0, background: '#fff', border: '1px solid rgba(10,18,35,0.1)', borderRadius: 12, padding: 3, marginBottom: 12 }}>
                  {[
                    { id: 'expenses', label: 'Expenses' },
                    { id: 'shares', label: 'Shares' },
                    { id: 'balances', label: 'Balances' },
                  ].map(section => (
                    <button
                      key={`split-section-${section.id}`}
                      onClick={() => setSplitSection(section.id)}
                      style={{ flex: 1, border: 'none', background: splitSection === section.id ? '#FF6A00' : 'transparent', color: splitSection === section.id ? '#fff' : '#475467', borderRadius: 9, padding: '8px 6px', fontSize: 12, fontWeight: splitSection === section.id ? 700 : 600, cursor: 'pointer' }}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>

                {splitSection === 'expenses' && (
                  <div style={{ display: 'grid', gap: 8, paddingBottom: 86 }}>
                    {!!splitEntries.length && <div style={{ fontSize: 11, color: '#667085', margin: '0 2px 2px' }}>Tip: swipe any expense card left to reveal quick delete.</div>}
                    {splitEntries.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#667085' }}>
                        <div style={{ fontSize: 42 }}>🧾</div>
                        <div style={{ marginTop: 8, fontSize: 14 }}>No split entries yet</div>
                      </div>
                    ) : splitEntries.slice().reverse().map(entry => {
                      const payer = splitMemberById[entry.paidByKey || entry.paidBy];
                      const splitWith = Array.isArray(entry.splitWithKeys) ? entry.splitWithKeys : [];
                      const perHead = splitWith.length ? (Number(entry.amount) || 0) / splitWith.length : 0;
                      const dragging = splitTouch.entryId === entry.id;
                      const translateX = dragging ? splitTouch.deltaX : (splitSwipeOpenId === entry.id ? -82 : 0);
                      return (
                        <div key={entry.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#F97316,#EA580C)' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteSplitEntry(entry.id)}
                              disabled={clubBusy}
                              style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, padding: '7px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                          <div
                            className="tb-float-card tb-fade-up"
                            onTouchStart={(event) => handleSplitTouchStart(entry.id, event)}
                            onTouchMove={(event) => handleSplitTouchMove(entry.id, event)}
                            onTouchEnd={() => handleSplitTouchEnd(entry.id)}
                            onClick={() => {
                              if (splitSwipeOpenId === entry.id) {
                                setSplitSwipeOpenId(null);
                              }
                            }}
                            style={{
                              background: '#fff',
                              borderRadius: 14,
                              border: '1px solid rgba(10,18,35,0.08)',
                              padding: 12,
                              transform: `translateX(${translateX}px)`,
                              transition: dragging ? 'none' : 'transform .22s ease',
                              touchAction: 'pan-y',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <div>
                                <div style={{ fontWeight: 800, color: '#101828' }}>{entry.desc}</div>
                                <div style={{ marginTop: 4, fontSize: 11, color: '#667085' }}>
                                  Paid by {payer ? `${payer.nickname} (${payer.groupName})` : (entry.paidByKey || entry.paidBy)}
                                </div>
                                <div style={{ marginTop: 2, fontSize: 11, color: '#98A2B3' }}>{formatSplitDate(entry.createdAt)}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800 }}>₹{Math.round(Number(entry.amount) || 0).toLocaleString('en-IN')}</div>
                                <div style={{ marginTop: 3, fontSize: 11, color: '#667085' }}>₹{Math.round(perHead).toLocaleString('en-IN')} each</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {splitSection === 'shares' && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {combinedMembers.map(member => {
                      const paid = splitPayTotals[member.id] || 0;
                      const owed = splitEntries.reduce((sum, entry) => {
                        const splitWith = Array.isArray(entry.splitWithKeys) ? entry.splitWithKeys : [];
                        if (!splitWith.includes(member.id) || !splitWith.length) return sum;
                        return sum + (Number(entry.amount) || 0) / splitWith.length;
                      }, 0);
                      const net = paid - owed;
                      return (
                        <div key={`share-${member.id}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 14, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#101828' }}>{member.nickname}</div>
                            <div style={{ fontSize: 11, color: '#667085', marginTop: 3 }}>Paid ₹{Math.round(paid).toLocaleString('en-IN')} • Share ₹{Math.round(owed).toLocaleString('en-IN')}</div>
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#FF8C3A' : '#B42318' }}>
                            {net >= 0 ? '+' : '-'}₹{Math.round(Math.abs(net)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Who pays whom</div>
                      {splitSettlements.length === 0 ? (
                        <div style={{ background: '#FFF3EB', border: '1px solid #FFD4B8', borderRadius: 12, padding: 12, color: '#9A4100', fontSize: 13, fontWeight: 600 }}>Everyone is settled.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {splitSettlements.map((settlement, index) => {
                            const fromMember = splitMemberById[settlement.from];
                            const toMember = splitMemberById[settlement.to];
                            return (
                              <div key={`settlement-${settlement.from}-${settlement.to}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 12, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ fontSize: 12, color: '#344054' }}>{fromMember?.nickname || settlement.from} → {toMember?.nickname || settlement.to}</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#FF8C3A' }}>₹{Math.round(settlement.amount).toLocaleString('en-IN')}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {splitSection === 'balances' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
                    {combinedMembers.map(member => {
                      const balance = splitBalances[member.id] || 0;
                      const positive = balance > 0.5;
                      const negative = balance < -0.5;
                      return (
                        <div key={`balance-card-${member.id}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderTop: `3px solid ${positive ? '#FF6A00' : negative ? '#D85A30' : '#D0D5DD'}`, borderRadius: '0 0 14px 14px', padding: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{member.nickname}</div>
                          <div style={{ marginTop: 8, fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: positive ? '#FF8C3A' : negative ? '#B42318' : '#475467' }}>
                            {positive ? '+' : ''}₹{Math.round(Math.abs(balance)).toLocaleString('en-IN')}
                          </div>
                          <div style={{ marginTop: 3, fontSize: 11, color: '#667085' }}>{positive ? 'gets back' : negative ? 'owes' : 'settled'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {splitSection === 'expenses' && (
                <button
                  className="tb-fab-pop"
                  onClick={() => setSplitFormOpen(true)}
                  style={{ position: 'fixed', right: 18, bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', width: 58, height: 58, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', color: '#fff', fontSize: 29, cursor: 'pointer', boxShadow: '0 10px 28px rgba(255,140,58,0.45)', zIndex: 575 }}
                >
                  +
                </button>
              )}

              {splitFormOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 580, background: '#F7F6F2', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 1.15rem', paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
                    <button onClick={() => setSplitFormOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.12)', background: '#F7F6F2', cursor: 'pointer' }}>←</button>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Add Expense</div>
                    <button style={{ ...S.btn, ...S.btnP, marginTop: 0, borderRadius: 12, padding: '8px 18px', opacity: clubBusy ? 0.65 : 1 }} disabled={clubBusy} onClick={handleAddSplitEntry}>Save</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ background: 'linear-gradient(135deg,#FF8C3A,#FF6A00)', padding: '2rem 1.2rem 2.4rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>How much?</div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, color: 'rgba(255,255,255,0.62)' }}>₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={splitDraft.amount}
                          onChange={(e) => setSplitDraft((draft) => ({ ...draft, amount: e.target.value }))}
                          autoFocus
                          style={{ fontFamily: "'Sora',sans-serif", fontSize: 52, fontWeight: 700, color: '#fff', border: 'none', background: 'transparent', outline: 'none', width: '64%', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', marginTop: -16, padding: '1.4rem 1.1rem 2rem' }}>
                      <label style={S.label}>What was it?</label>
                      <input
                        style={{ ...S.input, marginTop: 6 }}
                        placeholder="e.g. Dinner, cab, activity tickets"
                        value={splitDraft.desc}
                        onChange={(e) => setSplitDraft((draft) => ({ ...draft, desc: e.target.value }))}
                      />

                      <label style={S.label}>Paid by</label>
                      <select style={S.input} value={splitDraft.paidBy} onChange={(e) => setSplitDraft((draft) => ({ ...draft, paidBy: e.target.value }))}>
                        {combinedMembers.map(member => (
                          <option key={`payer-${member.id}`} value={member.id}>{member.nickname} ({member.groupName})</option>
                        ))}
                      </select>

                      <label style={S.label}>Split with</label>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {combinedMembers.map(member => {
                          const selected = splitDraft.splitWith.includes(member.id);
                          return (
                            <button key={`split-with-${member.id}`} onClick={() => handleToggleSplitMember(member.id)} style={{ ...S.btn, marginTop: 0, padding: '6px 11px', background: selected ? '#FFF3EB' : '#fff', color: selected ? '#FF8C3A' : '#475467', border: selected ? '1px solid #FFD4B8' : '1px solid rgba(0,0,0,0.11)' }}>
                              {member.nickname}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 10, fontSize: 12, color: '#667085' }}>
                        Per head: {splitDraft.splitWith.length ? `₹${((Number(splitDraft.amount) || 0) / splitDraft.splitWith.length).toFixed(2)}` : '₹0.00'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {false && toolScreenOpen && activeChat && chatTool === 'photos' && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 570, background: '#fff', overflowY: 'auto' }}>
              <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: 18, paddingTop: 'calc(18px + env(safe-area-inset-top, 0px))', background: 'linear-gradient(135deg,#1D4ED8,#0F766E)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800 }}>Photos</div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{combinedPhotos.length} combined group photos</div>
                </div>
                <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setToolScreenOpen(false)}>✕</button>
              </div>

              <div style={{ padding: 18, maxWidth: 1240, margin: '0 auto' }}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setChatPhotoDragging(true);
                  }}
                  onDragLeave={() => setChatPhotoDragging(false)}
                  onDrop={handleChatToolPhotoDrop}
                  onClick={() => chatPhotoInputRef.current?.click()}
                  style={{
                    border: chatPhotoDragging ? '2px dashed #0F766E' : '2px dashed rgba(15,118,110,0.35)',
                    background: chatPhotoDragging ? 'rgba(15,118,110,0.08)' : 'linear-gradient(160deg,rgba(255,255,255,0.92),rgba(245,251,255,0.72))',
                    borderRadius: 18,
                    padding: '18px 14px',
                    marginBottom: 12,
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 700 }}>Drop photos here or tap to upload</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Your uploads go to Supabase bucket trip-photos and appear for both clubs.</div>
                  {chatPhotoUploading && <div style={{ marginTop: 6, fontSize: 11, color: '#FF8C3A', fontWeight: 700 }}>Uploading {chatPhotoProgress}%</div>}
                  <input
                    ref={chatPhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleChatToolPhotoUpload}
                  />
                </div>

                {chatPhotoSelected.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, padding: '8px 10px', borderRadius: 12, background: '#EEF6FF', border: '1px solid #D7E8FF', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, color: '#1E3A5F', fontWeight: 700 }}>{chatPhotoSelected.size} selected</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...S.btn, marginTop: 0, padding: '7px 10px' }} onClick={() => void downloadSelectedChatPhotos()}>Download</button>
                      <button
                        style={{ ...S.btn, marginTop: 0, padding: '7px 10px', background: canDeleteSelectedChatPhotos ? '#F04438' : '#F1F3F5', color: canDeleteSelectedChatPhotos ? '#fff' : '#98A2B3', border: 'none' }}
                        disabled={!canDeleteSelectedChatPhotos}
                        onClick={() => void deleteSelectedChatPhotos()}
                      >
                        Delete
                      </button>
                      <button style={{ ...S.btn, marginTop: 0, padding: '7px 10px' }} onClick={clearChatPhotoSelection}>Clear</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
                  {Object.keys(chatPhotoFolders).map((folderKey) => {
                    const count = (chatPhotoFolders[folderKey] || []).length;
                    const isActive = chatPhotoFolder === folderKey;
                    return (
                      <button
                        key={`folder-${folderKey}`}
                        onClick={() => setChatPhotoFolder(folderKey)}
                        style={{
                          ...S.btn,
                          marginTop: 0,
                          borderRadius: 999,
                          padding: '7px 12px',
                          whiteSpace: 'nowrap',
                          background: isActive ? 'linear-gradient(135deg,#FF6A00,#FF8C3A)' : '#fff',
                          color: isActive ? '#fff' : '#475467',
                          border: isActive ? '1px solid rgba(255,140,58,0.68)' : '1px solid rgba(10,18,35,0.12)',
                        }}
                      >
                        {folderKey === 'all' ? 'All photos' : folderKey} ({count})
                      </button>
                    );
                  })}
                </div>

                {chatFolderPhotos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#667085' }}>No photos shared yet in the two trips. Use the upload area above to start the album.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
                    {chatFolderPhotos.map((photo, index) => (
                      <div
                        key={`cp-${photo.id}`}
                        onClick={() => setChatPhotoLightbox({ photos: chatFolderPhotos, index })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setChatPhotoLightbox({ photos: chatFolderPhotos, index });
                        }}
                        style={{ position: 'relative', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                      >
                        <img src={photo.url} alt="combined trip" style={{ width: '100%', height: 170, borderRadius: 14, objectFit: 'cover', display: 'block' }} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleChatPhotoSelection(photo.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 24,
                            height: 24,
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.95)',
                            background: chatPhotoSelected.has(photo.id) ? '#0F766E' : 'rgba(3,10,24,0.52)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 800,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          aria-label={chatPhotoSelected.has(photo.id) ? 'Deselect photo' : 'Select photo'}
                        >
                          {chatPhotoSelected.has(photo.id) ? '✓' : ''}
                        </button>
                        <div style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(3,10,24,0.58)', padding: '3px 7px', borderRadius: 999 }}>{photo.source}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {chatPhotoLightbox && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 590, background: 'rgba(6,10,18,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                  <button onClick={() => setChatPhotoLightbox(null)} style={{ position: 'absolute', top: 14, right: 14, ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>✕</button>
                  <button
                    onClick={() => setChatPhotoLightbox((curr) => ({ ...curr, index: Math.max(0, curr.index - 1) }))}
                    disabled={chatPhotoLightbox.index === 0}
                    style={{ position: 'absolute', left: 14, ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', opacity: chatPhotoLightbox.index === 0 ? 0.4 : 1 }}
                  >Prev</button>
                  <img
                    src={chatPhotoLightbox.photos[chatPhotoLightbox.index]?.url}
                    alt="lightbox"
                    style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}
                  />
                  <button
                    onClick={() => setChatPhotoLightbox((curr) => ({ ...curr, index: Math.min(curr.photos.length - 1, curr.index + 1) }))}
                    disabled={chatPhotoLightbox.index >= chatPhotoLightbox.photos.length - 1}
                    style={{ position: 'absolute', right: 14, ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', opacity: chatPhotoLightbox.index >= chatPhotoLightbox.photos.length - 1 ? 0.4 : 1 }}
                  >Next</button>
                </div>
              )}
            </div>
          )}

          {clubView === 'discover' && (
            <>
              <div style={{ paddingBottom: 4, animation: 'clubPop .25s ease-out both' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => { setFilterDraft(filters); setFiltersOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 99, border: '1.5px solid rgba(0,0,0,0.09)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                    Filter
                  </button>                </div>

              </div>

              {listed && (
                <div style={{ paddingBottom: 20, animation: 'clubPop .3s ease-out both' }}>
                  {!hubFetched ? (
                    <div style={{ position: 'relative', height: 480 }}>
                      <div className="tb-shimmer" style={{ position: 'absolute', inset: 0, borderRadius: 24 }} />
                      <div className="tb-shimmer" style={{ position: 'absolute', inset: 0, borderRadius: 24, transform: 'scale(0.965) translateY(10px)', transformOrigin: 'bottom', opacity: 0.5 }} />
                    </div>
                  ) : sortedDiscoverCards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>No groups found</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Try wider radius, a different travel window, or remove a filter.</div>
                    </div>
                  ) : swipeIdx >= sortedDiscoverCards.length ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div style={{ fontSize: 44, marginBottom: 14 }}>🎉</div>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 8 }}>You've seen everyone!</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20, lineHeight: 1.6 }}>Check back later for new groups, or start over.</div>
                      <button onClick={() => setSwipeIdx(0)}
                        style={{ padding: '13px 28px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C3A,#FF6A00)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,106,0,0.3)' }}>
                        Start Over
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{swipeIdx + 1} of {sortedDiscoverCards.length} groups</div>
                        <div style={{ fontSize: 11, color: '#D1D5DB', fontStyle: 'italic' }}>← pass · connect →</div>
                      </div>

                      {/* Swipe deck */}
                      <div
                        style={{ position: 'relative', height: 520, marginBottom: 22 }}
                        onPointerMove={handleSwipePointerMove}
                        onPointerUp={handleSwipePointerUp}
                        onPointerCancel={handleSwipePointerCancel}
                      >
                        {[1, 0].map(stackIdx => {
                          const cardIdx = swipeIdx + stackIdx;
                          if (cardIdx >= sortedDiscoverCards.length) return null;
                          const { item, alreadySent, compatibility } = sortedDiscoverCards[cardIdx];
                          const isTop = stackIdx === 0;
                          return (
                            <ClubDiscoveryCard
                              key={item.id}
                              item={item}
                              compatibility={compatibility}
                              alreadySent={alreadySent}
                              distKm={locationEnabled && item.latitude != null && item.longitude != null ? haversine(myLat, myLng, item.latitude, item.longitude) : null}
                              dragX={isTop ? swipeDragX : 0}
                              dragY={isTop ? swipeDragY : 0}
                              isDragging={isTop && swipeIsDragging}
                              swipeOut={isTop ? swipeOut : null}
                              isTop={isTop}
                              stackIndex={stackIdx}
                              onPointerDown={handleSwipePointerDown}
                              onOpen={() => setSelectedCard(item)}
                              onConnect={() => { if (!alreadySent) { setSwipeRequestPending(item); doClubSwipe('right'); } }}
                            />
                          );
                        })}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, marginBottom: 6 }}>
                        <button type="button" onClick={() => doClubSwipe('left')} disabled={!!swipeOut}
                          style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid #FCA5A5', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: swipeOut ? 'not-allowed' : 'pointer', boxShadow: '0 4px 18px rgba(248,113,113,0.2)', transition: 'all .2s', opacity: swipeOut ? 0.6 : 1 }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <button type="button" onClick={() => setSelectedCard(sortedDiscoverCards[swipeIdx]?.item)}
                          style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12.01" y2="8" /><line x1="12" y1="12" x2="12" y2="16" /></svg>
                        </button>
                        <button type="button"
                          onClick={() => { const c = sortedDiscoverCards[swipeIdx]; if (c && !c.alreadySent) { setSwipeRequestPending(c.item); doClubSwipe('right'); } }}
                          disabled={!!swipeOut || sortedDiscoverCards[swipeIdx]?.alreadySent}
                          style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#FF8C3A,#FF6A00)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (swipeOut || sortedDiscoverCards[swipeIdx]?.alreadySent) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 22px rgba(255,106,0,0.42)', transition: 'all .2s', opacity: (swipeOut || sortedDiscoverCards[swipeIdx]?.alreadySent) ? 0.6 : 1 }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        </button>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 11, color: '#D1D5DB' }}>Swipe or tap buttons · tap ♥ for full details</div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {filtersOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,16,24,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', animation: 'clubFadeIn .2s ease-out both' }}>
              <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 24, padding: '1rem 1rem calc(1.1rem + env(safe-area-inset-bottom, 0px))', boxShadow: '0 30px 80px rgba(0,0,0,0.22)', animation: 'clubSheetIn .28s cubic-bezier(.2,.7,.2,1) both' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800 }}>Filter Groups</div>
                    <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 2 }}>Find travellers that match your window and vibe.</div>
                  </div>
                  <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFiltersOpen(false)}>✕</button>
                </div>

                <label style={S.label}>When are they travelling?</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {TRAVEL_WINDOW_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setFilterDraft(f => ({ ...f, travelWindow: opt.value }))}
                      style={{ padding: '6px 13px', borderRadius: 99, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                        borderColor: filterDraft.travelWindow === opt.value ? '#7C3AED' : '#E5E7EB',
                        background: filterDraft.travelWindow === opt.value ? '#EDE9FE' : '#fff',
                        color: filterDraft.travelWindow === opt.value ? '#6D28D9' : '#6B7280',
                      }}>{opt.label}</button>
                  ))}
                </div>

                <label style={S.label}>Age group</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {AGE_RANGE_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setFilterDraft(f => ({ ...f, ageRange: opt.value }))}
                      style={{ padding: '6px 13px', borderRadius: 99, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                        borderColor: filterDraft.ageRange === opt.value ? '#7C3AED' : '#E5E7EB',
                        background: filterDraft.ageRange === opt.value ? '#EDE9FE' : '#fff',
                        color: filterDraft.ageRange === opt.value ? '#6D28D9' : '#6B7280',
                      }}>{opt.label}</button>
                  ))}
                </div>

                <label style={S.label}>Group Size</label>
                <select style={S.input} value={filterDraft.memberBand} onChange={e => setFilterDraft(f => ({ ...f, memberBand: e.target.value }))}>
                  {MEMBER_BAND_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>

                {/* Radius filter — placeholder, location filtering coming soon */}
                <div style={{ marginTop: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 16, padding: 12, opacity: 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>Radius</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>coming soon</div>
                  </div>
                  <input type="range" min="2" max="150" value={radius} disabled
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    <span>2 km</span><span>{radius} km</span><span>150 km</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button style={{ ...S.btn, flex: 1, marginTop: 0 }} onClick={() => { setFilterDraft(initialFilters); setRadius(25); try { localStorage.setItem(clubLocKey('radius'), '25'); } catch { } }}>Reset</button>
                  <button style={{ ...S.btn, ...S.btnOrange, flex: 1, marginTop: 0 }} onClick={applyFilters}>Save and Go</button>
                </div>
              </div>
            </div>
          )}

          {selectedCard && selectedCardCompat && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'clubFadeIn .22s ease-out both' }}
              onClick={() => { setSelectedCard(null); setRequestFor(null); setRequestMessage(''); }}>
              <div style={{ width: '100%', maxWidth: 560, maxHeight: '94svh', overflowY: 'auto', background: '#fff', borderRadius: '28px 28px 0 0', boxShadow: '0 -24px 80px rgba(0,0,0,0.3)', animation: 'clubSheetIn .3s cubic-bezier(.2,.7,.2,1) both' }}
                onClick={e => e.stopPropagation()}>

                {/* Photo section – swipe right=connect, left=skip */}
                <div style={{ position: 'relative', height: 260, background: moodGradient(selectedCard.vibe || 'mixed'), flexShrink: 0, overflow: 'hidden',
                  transform: `translateX(${profileDragX}px)`,
                  transition: profileDragging ? 'none' : 'transform .32s cubic-bezier(.2,.7,.2,1)',
                  touchAction: 'pan-y', cursor: profileDragging ? 'grabbing' : 'grab', userSelect: 'none',
                }}
                  onPointerDown={handleProfilePointerDown}
                  onPointerMove={handleProfilePointerMove}
                  onPointerUp={handleProfilePointerUp(selectedCard)}
                  onPointerCancel={handleProfilePointerUp(selectedCard)}
                >
                  {selectedGallery[selectedMediaIndex] && (
                    <img src={selectedGallery[selectedMediaIndex]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.65) 100%)', pointerEvents: 'none' }} />
                  {/* LIKE / NOPE overlays */}
                  <div style={{ position:'absolute', top:36, left:16, opacity: Math.max(0, Math.min(1, profileDragX / 55)), transform:'rotate(-12deg)', pointerEvents:'none', transition:'opacity .08s' }}>
                    <div style={{ border:'3.5px solid #4ADE80', borderRadius:10, padding:'5px 16px', color:'#4ADE80', fontFamily:"'Sora',sans-serif", fontSize:28, fontWeight:900, letterSpacing:3, textShadow:'0 2px 12px rgba(74,222,128,0.5)' }}>LIKE</div>
                  </div>
                  <div style={{ position:'absolute', top:36, right:16, opacity: Math.max(0, Math.min(1, -profileDragX / 55)), transform:'rotate(12deg)', pointerEvents:'none', transition:'opacity .08s' }}>
                    <div style={{ border:'3.5px solid #F87171', borderRadius:10, padding:'5px 16px', color:'#F87171', fontFamily:"'Sora',sans-serif", fontSize:28, fontWeight:900, letterSpacing:3, textShadow:'0 2px 12px rgba(248,113,113,0.5)' }}>NOPE</div>
                  </div>
                  {/* Back button */}
                  <button style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onPointerDown={e => e.stopPropagation()} onClick={() => { setSelectedCard(null); setRequestFor(null); setRequestMessage(''); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  {/* Gallery dots */}
                  {selectedGallery.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                      {selectedGallery.map((_, i) => (
                        <button key={i} onClick={() => setSelectedMediaIndex(i)}
                          style={{ width: i === selectedMediaIndex ? 24 : 7, height: 6, borderRadius: 99, border: 'none', background: i === selectedMediaIndex ? '#fff' : 'rgba(255,255,255,0.4)', padding: 0, cursor: 'pointer', transition: 'all .2s' }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Drag pill */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 99, background: '#E5E7EB' }} />
                </div>

                {/* Body */}
                <div style={{ padding: '14px 18px 130px' }}>
                  {/* Name + match ring */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 23, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{selectedCard.trip?.groupName}</div>
                      {selectedCard.trip?.destination && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 5 }}>📍 {selectedCard.trip.destination}</div>}
                      {(selectedCard.trip?.arrival || selectedCard.trip?.startDate) && (
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                          📅 {fmtDateShort(selectedCard.trip.arrival || selectedCard.trip.startDate)}
                          {(selectedCard.trip.departure || selectedCard.trip.endDate) ? ` – ${fmtDateShort(selectedCard.trip.departure || selectedCard.trip.endDate)}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ padding: '7px 14px', borderRadius: 99, background: selectedCardCompat.tier?.bg || 'linear-gradient(135deg,#FF6A00,#FF8C3A)', boxShadow: '0 3px 14px rgba(0,0,0,0.18)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>{selectedCardCompat.tier?.label || 'Good match'}</div>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>Lumi · {selectedCardCompat.score}%</div>
                    </div>
                  </div>

                  {/* Why you'll get along well */}
                  {selectedCardCompat.reasons.length > 0 && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '11px 14px', marginBottom: 14, marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Why you&apos;ll get along well</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                        {selectedCardCompat.reasons.map((r, i) => (
                          <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: '#D1FAE5', color: '#065F46' }}>✓ {r}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: '#16A34A', fontStyle: 'italic' }}>You&apos;ll probably enjoy traveling together!</div>
                    </div>
                  )}

                  {/* About us */}
                  {selectedCard.about && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 6 }}>About us</div>
                      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{selectedCard.about}</div>
                    </div>
                  )}
                  {selectedCard.lookingFor && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 5 }}>What we want to do</div>
                      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{selectedCard.lookingFor}</div>
                    </div>
                  )}

                  {/* Group Vibe + Interests + Gallery + Members */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Group Vibe</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 99, background: '#FFF3EB', color: '#FF6A00', border: '1px solid #FFCBA4', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        {selectedCard.trip?.members?.length || 0} Members
                      </span>
                      {selectedCard.genderMix && selectedCard.genderMix !== 'any' && selectedCard.genderMix !== 'mixed' && (
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 99, background: '#F0F4FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>{genderMixLabel(selectedCard.genderMix)}</span>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 99, background: '#FFF7ED', color: '#92400E', border: '1px solid #FDE68A' }}>
                        {(selectedCard.vibe || 'Mixed').charAt(0).toUpperCase() + (selectedCard.vibe || 'Mixed').slice(1)} vibe
                      </span>
                      {isRecentlyActive(selectedCard.updatedAt) && (
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', color: '#166534', border: '1px solid rgba(74,222,128,0.3)' }}>● Active now</span>
                      )}
                    </div>
                  </div>
                  {Array.isArray(selectedCard.coverTags) && selectedCard.coverTags.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Interests</div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {selectedCard.coverTags.map(tag => <span key={tag} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 99, background: '#F3F4F6', color: '#374151' }}>#{tag}</span>)}
                      </div>
                    </div>
                  )}
                  {selectedGallery.length > 1 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Group Gallery</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                        {selectedGallery.slice(0, 6).map((url, i) => <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 12, objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />)}
                      </div>
                    </div>
                  )}
                  {(selectedCard.trip?.members || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Members</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedCard.trip.members.map((m, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${i * 60 + 180},60%,50%)`, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{(m.nickname || '?')[0].toUpperCase()}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{m.nickname}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {requestFor === selectedCard.tripId && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Introduce your group:</div>
                      <textarea style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '12px 14px', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', resize: 'vertical', minHeight: 88, color: '#111827', lineHeight: 1.6, background: '#F9FAFB', boxSizing: 'border-box' }}
                        value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="Hey! We're heading to the same destination — want to explore together?" />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button style={{ flex: 1, padding: '13px', fontSize: 14, fontWeight: 800, borderRadius: 14, border: 'none', cursor: (!requestMessage.trim() || clubBusy) ? 'not-allowed' : 'pointer', background: (!requestMessage.trim() || clubBusy) ? '#E5E7EB' : 'linear-gradient(135deg,#FF8C3A,#FF6A00)', color: (!requestMessage.trim() || clubBusy) ? '#9CA3AF' : '#fff', transition: 'all .2s' }}
                          disabled={clubBusy || !requestMessage.trim()} onClick={async () => { await handleSendRequest(); setSelectedCard(null); }}>Send Request</button>
                        <button style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, borderRadius: 14, border: '1.5px solid #E5E7EB', cursor: 'pointer', background: '#fff', color: '#374151' }}
                          onClick={() => { setRequestFor(null); setRequestMessage(''); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky bottom bar */}
                {requestFor !== selectedCard.tripId && (
                  <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ padding: '7px 14px', borderRadius: 99, background: selectedCardCompat.tier?.bg || 'linear-gradient(135deg,#FF6A00,#FF8C3A)', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>{selectedCardCompat.tier?.label || `${selectedCardCompat.score}%`}</span>
                    </div>
                    <button style={{ flex: 1, padding: '13px', fontSize: 14, fontWeight: 800, borderRadius: 14, border: 'none', cursor: selectedAlreadySent || clubBusy ? 'not-allowed' : 'pointer', background: selectedAlreadySent ? '#F3F4F6' : 'linear-gradient(135deg,#FF8C3A,#FF6A00)', color: selectedAlreadySent ? '#9CA3AF' : '#fff', boxShadow: selectedAlreadySent ? 'none' : '0 4px 14px rgba(255,106,0,0.3)', opacity: clubBusy ? 0.7 : 1, transition: 'all .2s' }}
                      disabled={selectedAlreadySent || clubBusy} onClick={() => setRequestFor(selectedCard.tripId)}>
                      {selectedAlreadySent ? 'Requested ✓' : 'Connect'}
                    </button>
                    {!selectedAlreadySent && hub.chats?.find(c => c.otherTrip?.id === selectedCard.tripId || c.tripA?.id === selectedCard.tripId || c.tripB?.id === selectedCard.tripId) && (
                      <button style={{ flex: 1, padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}
                        onClick={() => {
                          const ch = hub.chats.find(c => c.otherTrip?.id === selectedCard.tripId || c.tripA?.id === selectedCard.tripId || c.tripB?.id === selectedCard.tripId);
                          if (ch) { setSelectedChatId(ch.id); setClubView('chats'); setSelectedCard(null); }
                        }}>Message</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Swipe request dialog */}
          {swipeRequestPending && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 630, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'clubFadeIn .2s ease-out both' }}>
              <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '24px 24px 0 0', padding: '1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))', animation: 'clubSheetIn .3s cubic-bezier(.2,.7,.2,1) both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#FF8C3A,#FF6A00)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(255,106,0,0.3)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827' }}>Connect with {swipeRequestPending.trip?.groupName}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Write a quick intro message</div>
                  </div>
                  <button onClick={() => { setSwipeRequestPending(null); setRequestMessage(''); }}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                <textarea
                  style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '12px 14px', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', resize: 'vertical', minHeight: 100, color: '#111827', lineHeight: 1.6, background: '#F9FAFB', boxSizing: 'border-box', marginBottom: 14 }}
                  value={requestMessage}
                  onChange={e => setRequestMessage(e.target.value)}
                  placeholder={`Hey! We're heading to ${swipeRequestPending.trip?.destination || 'the same destination'} too — want to explore together? 🤙`}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    style={{ flex: 1, padding: '13px', fontSize: 14, fontWeight: 800, borderRadius: 14, border: 'none', cursor: (!requestMessage.trim() || clubBusy) ? 'not-allowed' : 'pointer', background: (!requestMessage.trim() || clubBusy) ? '#E5E7EB' : 'linear-gradient(135deg,#FF8C3A,#FF6A00)', color: (!requestMessage.trim() || clubBusy) ? '#9CA3AF' : '#fff', boxShadow: (!requestMessage.trim() || clubBusy) ? 'none' : '0 4px 16px rgba(255,106,0,0.3)', transition: 'all .2s' }}
                    disabled={clubBusy || !requestMessage.trim()}
                    onClick={handleSwipeSendRequest}
                  >
                    {clubBusy ? 'Sending…' : 'Send Request 🌍'}
                  </button>
                  <button style={{ padding: '13px 18px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setSwipeRequestPending(null); setRequestMessage(''); }}>
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
export default ClubPage;
        
