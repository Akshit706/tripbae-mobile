import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getFxRate } from '../home/HomePage';
import { addExpense, updateExpense, deleteExpense, updateTrip } from '../../api';
import { CATS, normalizeMembers, tripDuration, tripStatusInfo } from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar, CatIcon } from '../shared/ui';
import lumi8Img from '../../assets/lumi8.png';
import lumi14Img from '../../assets/lumi14.png';
import lumiMood1 from '../../assets/lumi_mood1.png';
import lumiMood2 from '../../assets/lumi_mood2.png';
import lumiMood3 from '../../assets/lumi_mood3.png';
import lumiMood4 from '../../assets/lumi_mood4.png';
import lumiMood5 from '../../assets/lumi_mood5.png';
import lumiMood6 from '../../assets/lumi_mood6.png';

/* ── iOS-style swipe-left to reveal actions (pointer events for Capacitor WebView) ──────────── */
function SwipeableExpenseRow({ onEdit, onDelete, onDuplicate, children }) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, startX: 0, startY: 0, startOffset: 0, isHoriz: null, pid: null, el: null });
  const W = 168;
  const THRESH = 8;
  const clamp = (x) => Math.min(0, Math.max(-W, x));

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, startOffset: offsetX, isHoriz: null, pid: e.pointerId, el: e.currentTarget };
  };

  const onPointerMove = (e) => {
    if (!drag.current.active || e.pointerId !== drag.current.pid) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (drag.current.isHoriz === null) {
      if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
      drag.current.isHoriz = Math.abs(dx) > Math.abs(dy);
      if (!drag.current.isHoriz) {
        drag.current.active = false;
        return;
      }
      try { drag.current.el?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      setDragging(true);
    }
    if (!drag.current.isHoriz) return;
    setOffsetX(clamp(drag.current.startOffset + dx));
  };

  const endDrag = (e) => {
    if (e && drag.current.pid != null && e.pointerId !== drag.current.pid) return;
    const wasHoriz = drag.current.isHoriz;
    drag.current.active = false;
    drag.current.isHoriz = null;
    drag.current.pid = null;
    setDragging(false);
    if (wasHoriz) setOffsetX((p) => (p < -W / 2 ? -W : 0));
  };

  const actions = [
    { label: 'Duplicate', bg: '#6366f1', fn: () => { setOffsetX(0); onDuplicate(); }, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> },
    { label: 'Edit',      bg: '#f59e0b', fn: () => { setOffsetX(0); onEdit(); },      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
    { label: 'Delete',    bg: '#ef4444', fn: () => { setOffsetX(0); onDelete(); },    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> },
  ];

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 10, boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: W, display: 'flex' }}>
        {actions.map(({ label, bg, fn, icon }) => (
          <button key={label} onClick={fn}
            style={{ flex: 1, border: 'none', background: bg, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            {icon}
          </button>
        ))}
      </div>
      <div
        onClick={() => offsetX < 0 && setOffsetX(0)}
        style={{ transform: `translateX(${offsetX}px)`, transition: dragging ? 'none' : 'transform .25s cubic-bezier(.25,.46,.45,.94)', position: 'relative', zIndex: 1, background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  );
}

function SplitPage({ trip, myNickname, myAvatar, onTripUpdate }) {
  const memberNames = normalizeMembers(trip.members);
  const [expenses, setExpenses] = useState(trip.expenses || []);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [section, setSection] = useState('expenses');
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [chartReady, setChartReady] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [localBudget, setLocalBudget] = useState(trip.budget || null);
  const [localBudgetCurrency, setLocalBudgetCurrency] = useState(trip.budgetCurrency || null);
  const [budgetInput, setBudgetInput] = useState('');
  const [sharing, setSharing] = useState(false);
  const SPLIT_WELCOME_KEY = `travelbae_split_welcome_${trip.id}`;
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem(`travelbae_split_welcome_${trip.id}`); } catch { return false; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem(SPLIT_WELCOME_KEY, '1'); } catch {}
    setShowWelcome(false);
  };

  // ── Multi-currency support ──
  const SPLIT_CURRENCIES = [
    { code: 'INR', symbol: '₹' }, { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' }, { code: 'JPY', symbol: '¥' }, { code: 'AED', symbol: 'د.إ' },
    { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' }, { code: 'CHF', symbol: 'Fr' },
    { code: 'CNY', symbol: '¥' }, { code: 'HKD', symbol: 'HK$' }, { code: 'IDR', symbol: 'Rp' },
    { code: 'KRW', symbol: '₩' }, { code: 'LKR', symbol: 'Rs' }, { code: 'MYR', symbol: 'RM' },
    { code: 'NPR', symbol: 'रू' }, { code: 'NZD', symbol: 'NZ$' }, { code: 'PKR', symbol: '₨' },
    { code: 'PHP', symbol: '₱' }, { code: 'SAR', symbol: '﷼' }, { code: 'SGD', symbol: 'S$' },
    { code: 'THB', symbol: '฿' }, { code: 'TRY', symbol: '₺' }, { code: 'VND', symbol: '₫' },
    { code: 'ZAR', symbol: 'R' },
  ];
  const SPEND_CURRENCY_KEY = `travelbae_split_spendcurrency_${trip.id}`;
  const [spendCurrency, setSpendCurrency] = useState(() => {
    try { return localStorage.getItem(SPEND_CURRENCY_KEY) || trip.destinationCurrency || trip.budgetCurrency || 'INR'; } catch { return 'INR'; }
  });
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const spendMeta = SPLIT_CURRENCIES.find(c => c.code === spendCurrency) || { code: 'INR', symbol: '₹' };
  const spendSymbol = spendMeta.symbol;
  const homeCurrencyCode = (() => { try { const r = localStorage.getItem('travelbae_prefs'); return r ? (JSON.parse(r).currency || 'INR') : 'INR'; } catch { return 'INR'; } })();
  const homeMeta = SPLIT_CURRENCIES.find(c => c.code === homeCurrencyCode) || { code: 'INR', symbol: '₹' };
  const [fxRate, setFxRate] = useState(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [budgetFxRate, setBudgetFxRate] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const getNow = () => {
    const now = new Date();
    return { date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5) };
  };
  const [form, setForm] = useState({
    desc: '', amount: '', paidBy: myNickname || memberNames[0] || '',
    cat: 'food', date: getNow().date, time: getNow().time,
    splitMode: 'all',
    splitWith: [...memberNames],
    _splitOpen: false,
  });

  const donutRef = useRef(null);
  const barRef = useRef(null);
  const chartInstances = useRef({});
  const customTagsKey = `travelbae_custom_expense_tags_${trip.id}`;
  const [customCats, setCustomCats] = useState(() => {
    try {
      const raw = localStorage.getItem(customTagsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const expenseCats = useMemo(() => {
    const base = [...CATS];
    const known = new Set(base.map(c => c.id));
    const extra = customCats.filter(c => c?.id && c?.label && !known.has(c.id));
    return [...base, ...extra];
  }, [customCats]);

  const MCOLORS_LIST = ['#FF6A00','#D85A30','#7F77DD','#BA7517','#378ADD','#D4537E','#FF8C3A','#993C1D'];
  const mcolor = (name) => {
    const code = Math.abs(Array.from(name || '').reduce((a, c) => a + c.charCodeAt(0), 0));
    return MCOLORS_LIST[code % MCOLORS_LIST.length];
  };
  // Renders an avatar circle: photo for current user, initials for others
  const memberCircle = (name, size = 32, fontSize = 11, extra = {}) => {
    const isMe = name === myNickname && !!myAvatar;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...(!isMe ? { background: mcolor(name), color: '#fff', fontSize, fontWeight: 700 } : {}), ...extra }}>
        {isMe ? <img src={myAvatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : (name || '?').slice(0,2).toUpperCase()}
      </div>
    );
  };
  const CAT_COLORS = { food:'#BA7517', transport:'#FF6A00', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E', other:'#6b6b68' };

  const budget = localBudget;
  // displayBudget: budget expressed in current spendCurrency (converted via FX if currencies differ)
  const displayBudget = !budget ? null
    : (!localBudgetCurrency || localBudgetCurrency === spendCurrency) ? budget
    : budgetFxRate !== null ? budget * budgetFxRate
    : budget; // show raw while FX is loading

  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = () => setChartReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(customTagsKey, JSON.stringify(customCats));
    } catch {
      // ignore
    }
  }, [customCats, customTagsKey]);

  useEffect(() => {
    if (section !== 'insights' || !chartReady) return;
    const t = setTimeout(renderCharts, 80);
    return () => clearTimeout(t);
  }, [section, chartReady, expenses, displayBudget]);

  useEffect(() => {
    if (section !== 'insights' || spendCurrency === homeCurrencyCode) { setFxRate(null); setFxLoading(false); return; }
    let cancelled = false;
    setFxLoading(true);
    getFxRate(spendCurrency, homeCurrencyCode).then(r => {
      if (!cancelled) { setFxRate(r); setFxLoading(false); }
    }).catch(() => { if (!cancelled) setFxLoading(false); });
    return () => { cancelled = true; };
  }, [section, spendCurrency, homeCurrencyCode]);

  useEffect(() => {
    const buCurr = localBudgetCurrency;
    if (!localBudget || !buCurr || buCurr === spendCurrency) { setBudgetFxRate(null); return; }
    let cancelled = false;
    getFxRate(buCurr, spendCurrency).then(r => {
      if (!cancelled) setBudgetFxRate(r);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [localBudget, localBudgetCurrency, spendCurrency]);

  useLayoutEffect(() => {
    if (!showForm) return undefined;
    window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: true } }));
    return () => window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: false } }));
  }, [showForm]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const days = tripDuration(trip.arrival, trip.departure);
  const tripStart = new Date(trip.arrival);
  const tripEnd = new Date(trip.departure);
  const now = new Date();
  const clampedNow = now > tripEnd ? tripEnd : now;
  const rawElapsed = clampedNow < tripStart ? 0 : Math.floor((clampedNow - tripStart) / 86400000) + 1;
  const daysElapsed = Math.min(days, Math.max(1, rawElapsed));
  const daysLeft = Math.max(0, days - daysElapsed);
  const tsr = total / daysElapsed;
  const projected = Math.round(tsr * days);
  const budgetLeft = displayBudget ? displayBudget - total : null;
  const budgetPct = displayBudget ? Math.min(100, Math.round(total / displayBudget * 100)) : null;
  const perPerson = memberNames.length > 0 ? total / memberNames.length : 0;

  const catTotals = {};
  expenseCats.forEach(c => { catTotals[c.id] = 0; });
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });

  const payTotal = {};
  memberNames.forEach(m => { payTotal[m] = 0; });
  expenses.forEach(e => { payTotal[e.paidBy] = (payTotal[e.paidBy] || 0) + e.amount; });
  const maxPay = Math.max(...memberNames.map(m => payTotal[m] || 0), 1);

  const balances = {};
  memberNames.forEach(m => { balances[m] = 0; });
  expenses.forEach(e => {
    const splitNames = Array.isArray(e.split) && e.split.length > 0 ? e.split : memberNames;
    const sh = e.amount / splitNames.length;
    splitNames.forEach(m => { if (balances[m] !== undefined) balances[m] -= sh; });
    if (balances[e.paidBy] !== undefined) balances[e.paidBy] += e.amount;
  });

  const settlements = [];
  const bal = { ...balances };
  const ds = memberNames.filter(m => bal[m] < -0.01).sort((a, b) => bal[a] - bal[b]);
  const cs = memberNames.filter(m => bal[m] > 0.01).sort((a, b) => bal[b] - bal[a]);
  let di = 0, ci = 0;
  while (di < ds.length && ci < cs.length) {
    const d = ds[di], c = cs[ci], amt = Math.min(-bal[d], bal[c]);
    settlements.push({ from: d, to: c, amt });
    bal[d] += amt; bal[c] -= amt;
    if (Math.abs(bal[d]) < 0.01) di++;
    if (Math.abs(bal[c]) < 0.01) ci++;
  }

  const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const overBy = displayBudget ? Math.max(0, projected - displayBudget) : 0;
  const underBy = displayBudget ? Math.max(0, displayBudget - projected) : 0;
  const activeCats = expenseCats.filter(c => catTotals[c.id] > 0).sort((a, b) => catTotals[b.id] - catTotals[a.id]);
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topCatMeta = expenseCats.find(c => c.id === topCat?.[0]) || null;

  const topPayer = memberNames.reduce((a, b) => (payTotal[a] || 0) > (payTotal[b] || 0) ? a : b, memberNames[0] || '');
  const topPayerAmount = topPayer ? (payTotal[topPayer] || 0) : 0;
  const topPayerSharePct = total > 0 ? Math.round((topPayerAmount / total) * 100) : 0;

  const positiveBalances = memberNames
    .map(m => ({ name: m, balance: balances[m] || 0 }))
    .filter(x => x.balance > 0.5)
    .sort((a, b) => b.balance - a.balance);
  const negativeBalances = memberNames
    .map(m => ({ name: m, balance: balances[m] || 0 }))
    .filter(x => x.balance < -0.5)
    .sort((a, b) => a.balance - b.balance);

  const topGetsBack = positiveBalances[0] || null;
  const topOwes = negativeBalances[0] || null;
  const plannedDailyBudget = displayBudget ? displayBudget / Math.max(1, days) : null;
  const pacePct = plannedDailyBudget ? Math.round((tsr / plannedDailyBudget) * 100) : null;

  const funInsightLines = [];
  const fmt = n => `${spendSymbol}${Math.round(n).toLocaleString('en-IN')}`;
  const fmtHome = n => `${homeMeta.symbol}${Math.round(n).toLocaleString('en-IN')}`;
  const budgetCurrMeta = spendMeta; // budget is now always converted to spendCurrency
  const fmtBudget = fmt;
  if (expenses.length === 0) {
    funInsightLines.push('No spends yet. Wallets are meditating and UPI is on standby.');
  } else {
    if (daysElapsed >= 2) {
      funInsightLines.push(`Group TSR is ${fmt(tsr)}/day over ${daysElapsed} day${daysElapsed > 1 ? 's' : ''}.`);
    }
    if (budget && budgetPct <= 60 && daysElapsed >= Math.max(2, Math.round(days * 0.4))) {
      funInsightLines.push('The crew is low-key saving money. This trip has strong middle-class superhero energy.');
    }
    if (budget && budgetPct >= 90) {
      funInsightLines.push('Budget is in thriller mode now. Every chai deserves committee approval.');
    }
    if (topPayer && topPayerSharePct >= 55) {
      funInsightLines.push(`${topPayer} has paid ${topPayerSharePct}% of the bill so far. Main character wallet behavior.`);
    }
    if (topGetsBack) {
      funInsightLines.push(`${topGetsBack.name} is waiting for ${fmt(topGetsBack.balance)} back. Finance villain origin story loading.`);
    }
    if (topOwes) {
      funInsightLines.push(`${topOwes.name} currently owes ${fmt(Math.abs(topOwes.balance))}. Traveling on vibes and pending UPI requests.`);
    }
    if (settlements.length === 0) {
      funInsightLines.push('Plot twist: everyone is settled. This is rarer than finding a clean public washroom on a road trip.');
    }
    if (budget && projected > displayBudget) {
      funInsightLines.push(`At this pace, the trip may end around ${fmt(projected)} (about ${fmt(projected - displayBudget)} over budget).`);
    }
  }
  if (funInsightLines.length === 0) {
    funInsightLines.push('Money flow looks balanced right now. Calm spreadsheets, happy friendships.');
  }
  const funInsightLine = funInsightLines[(expenses.length + settlements.length + memberNames.length) % funInsightLines.length];

  const handleShareReport = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { generateAndShareExpensePDF } = await import('../../utils/generateExpensePDF');
      await generateAndShareExpensePDF(
        { name: trip.groupName || trip.destination || 'Trip', destination: trip.destination || '', startDate: trip.arrival, endDate: trip.departure, totalBudget: displayBudget || null, totalSpent: total, travelers: memberNames, totalDays: days },
        expenses.map(e => ({ description: e.desc, category: e.cat, paidBy: e.paidBy, date: e.date, amount: e.amount })),
        { dailyRate: tsr, dailyBudget: plannedDailyBudget, projectedEnd: projected, daysElapsed, totalDays: days, daysLeft, budgetSaved: budgetLeft ?? 0, crewPacePercent: pacePct, allSettled: settlements.length === 0, moodMessage: funInsightLine || '' },
        spendSymbol
      );
    } catch (err) {
      console.error('Expense PDF error:', err);
      if (err?.message && !/abort|cancel|dismiss/i.test(err.message)) {
        alert('Could not share the report. Please try again.');
      }
    }
    setSharing(false);
  };

  function renderCharts() {
    Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch (_) {} });
    chartInstances.current = {};
    const textColor = 'rgba(0,0,0,0.4)';
    const gridColor = 'rgba(0,0,0,0.05)';

    if (donutRef.current && budget) {
      chartInstances.current.donut = new window.Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          datasets: [{ data: [Math.min(total, budget), Math.max(0, budget - total)], backgroundColor: [budgetPct > 85 ? '#D85B00' : '#FF6A00', '#FFF3EB'], borderWidth: 0, hoverOffset: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '74%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataIndex === 0 ? ` Spent: ${fmt(Math.min(total, displayBudget))}` : ` Left: ${fmt(Math.max(0, displayBudget - total))}` } } } },
        plugins: [{ id: 'center', afterDraw(chart) { const { ctx, chartArea: { width, height, left, top } } = chart; const cx = left + width / 2, cy = top + height / 2; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 17px system-ui'; ctx.fillStyle = '#1a1a18'; ctx.fillText(`${budgetPct}%`, cx, cy - 9); ctx.font = '12px system-ui'; ctx.fillStyle = textColor; ctx.fillText('used', cx, cy + 9); ctx.restore(); } }]
      });
    }

    if (barRef.current) {
      if (activeCats.length === 0) return;
      const BAR_COLORS = { food:'#BA7517', transport:'#FF6A00', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E'};
      chartInstances.current.bar = new window.Chart(barRef.current, {
        type: 'bar',
        data: { labels: activeCats.map(c => c.label), datasets: [{ data: activeCats.map(c => catTotals[c.id]), backgroundColor: activeCats.map(c => BAR_COLORS[c.id] || '#888780'), borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } }, scales: { x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: textColor, font: { size: 11 }, callback: v => `${spendSymbol}${v >= 1000 ? Math.round(v / 1000) + 'k' : v}` }, grid: { color: gridColor }, border: { display: false } } } }
      });
    }
  }

  const handleAdd = async () => {
    if (!form.desc || !form.amount) return;
    const splitWith = form.splitMode === 'all' ? memberNames : form.splitWith;
    if (splitWith.length === 0) { alert('Select at least one person to split with.'); return; }
    setSaving(true);
    try {
      const payload = {
        desc: form.desc, amount: parseFloat(form.amount),
        paidBy: form.paidBy, cat: form.cat,
        split: splitWith,
        date: form.time ? new Date(`${form.date}T${form.time}:00`).toISOString() : new Date(form.date).toISOString(),
        time: form.time,
      };
      if (editingExpenseId) {
        const data = await updateExpense(trip.id, editingExpenseId, payload);
        const updated = expenses.map(x => x.id === editingExpenseId ? data.expense : x);
        setExpenses(updated);
        onTripUpdate?.({ expenses: updated });
      } else {
        const data = await addExpense(trip.id, payload);
        const updated = [data.expense, ...expenses];
        setExpenses(updated);
        onTripUpdate?.({ expenses: updated });
      }
      setForm({ desc: '', amount: '', paidBy: myNickname || memberNames[0] || '', cat: 'food', date: getNow().date, time: getNow().time, splitMode: 'all', splitWith: [...memberNames], _splitOpen: false, _paidByOpen: false });
      setEditingExpenseId(null);
      setShowForm(false);
    } catch (err) { alert(`Could not ${editingExpenseId ? 'update' : 'save'}: ` + err.message); }
    setSaving(false);
  };

  const handleEditExpense = (exp) => {
    const splitArr = Array.isArray(exp.split) && exp.split.length > 0 ? exp.split : memberNames;
    const pad = n => String(n).padStart(2, '0');
    const d = exp.date ? new Date(exp.date) : new Date();
    const normalizedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const isAll = splitArr.length === memberNames.length && memberNames.every(m => splitArr.includes(m));
    setForm({
      desc: exp.desc || '',
      amount: String(exp.amount || ''),
      paidBy: exp.paidBy || myNickname || memberNames[0] || '',
      cat: exp.cat || 'food',
      date: normalizedDate,
      time: exp.time || (exp.date
        ? (() => { const d = new Date(exp.date); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()
        : getNow().time),
      splitMode: isAll ? 'all' : 'select',
      splitWith: [...splitArr],
      _splitOpen: false,
      _paidByOpen: false,
    });
    setEditingExpenseId(exp.id);
    setShowForm(true);
  };

  const handleDelete = async (expId) => {
    try {
      await deleteExpense(trip.id, expId);
      const updated = expenses.filter(x => x.id !== expId);
      setExpenses(updated);
      onTripUpdate?.({ expenses: updated });
    } catch (err) { alert('Could not delete: ' + err.message); }
  };

  const handleDuplicateExpense = async (exp) => {
    try {
      const splitArr = Array.isArray(exp.split) && exp.split.length > 0 ? exp.split : memberNames;
      const now = getNow();
      const nowDate = new Date(`${now.date}T${now.time}:00`).toISOString();
      const data = await addExpense(trip.id, { desc: exp.desc, amount: exp.amount, paidBy: exp.paidBy, cat: exp.cat, split: splitArr, date: nowDate, time: now.time });
      const updated = [data.expense, ...expenses];
      setExpenses(updated);
      onTripUpdate?.({ expenses: updated });
    } catch (err) { alert('Could not duplicate: ' + err.message); }
  };

  const filteredExpenses = filterCat === 'all' ? expenses : expenses.filter(e => e.cat === filterCat);
  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  const getExpenseTimeLabel = (exp) => {
    if (exp.time) return exp.time;
    if (exp.date) {
      const d = new Date(exp.date);
      if (!Number.isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    }
    return null;
  };

  const createCustomTag = () => {
    const label = window.prompt('Create a new expense tag');
    if (!label || !label.trim()) return;
    const cleaned = label.trim();
    const id = `custom_${cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
    if (!id || id === 'custom_') return;
    if (expenseCats.some(c => c.id === id)) {
      setForm(f => ({ ...f, cat: id }));
      return;
    }
    const next = { id, icon: '🏷️', label: cleaned, bg: '#F1EFE8' };
    setCustomCats(prev => [...prev, next]);
    setForm(f => ({ ...f, cat: id }));
  };

  const SPLIT_ACCENT = '#FF6A00';
  const SPLIT_ACCENT_2 = '#D85B00';
  const SPLIT_ACCENT_BG = '#FFF3EB';
  const SPLIT_ACCENT_BORDER = '#FFCBA4';
  const SPLIT_ACCENT_TEXT = '#7A2800';
  const SPLIT_WARN = '#D85B00';
  const SECTION_TABS = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'shares',   label: 'Shares' },
    { id: 'balances', label: 'Balances' },
    { id: 'insights', label: 'Insights' },
  ];

  /* ── Fullscreen expense form (portal so app header/nav cannot cover Save) ── */
  if (showForm) return createPortal((
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 800, display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button onClick={() => { setShowForm(false); setEditingExpenseId(null); setForm({ desc: '', amount: '', paidBy: myNickname || memberNames[0] || '', cat: 'food', date: getNow().date, time: getNow().time, splitMode: 'all', splitWith: [...memberNames], _splitOpen: false, _paidByOpen: false }); }} style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</div>
        <button onClick={handleAdd} disabled={saving || !form.desc || !form.amount}
          style={{ ...S.btn, ...S.btnSolo, padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !form.desc || !form.amount) ? 0.4 : 1 }}>
          {saving ? (editingExpenseId ? 'Updating…' : 'Saving…') : (editingExpenseId ? 'Update' : 'Save')}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}>

        {/* Amount block */}
        <div style={{ background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', padding: '2rem 1.5rem 2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 12 }}>How much?</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{spendSymbol}</span>
            <input
              type="number" placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              autoFocus
              style={{ fontFamily: "'Sora',sans-serif", fontSize: 56, fontWeight: 700, color: '#fff', border: 'none', background: 'transparent', outline: 'none', width: '65%', textAlign: 'center', padding: 0, caretColor: 'rgba(255,255,255,0.8)' }}
            />
          </div>
        </div>

        {/* White card body */}
        <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '1.5rem 1.25rem 2rem', minHeight: '100%' }}>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>What was it?</label>
            <input style={{ ...S.input, fontSize: 15, padding: '12px 14px', marginTop: 6 }}
              placeholder="e.g. Hotel checkout, dinner, cab…"
              value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          </div>

          {/* Category */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {expenseCats.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 18, fontSize: 12, border: `1.5px solid ${form.cat === c.id ? '#FF6A00' : 'rgba(0,0,0,0.09)'}`, background: form.cat === c.id ? '#FFF3EB' : '#fafafa', color: form.cat === c.id ? '#7A2800' : '#6b6b68', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: form.cat === c.id ? 600 : 400, transition: 'all .12s' }}>
                  <CatIcon id={c.id} size={14} />
                  <span>{c.label}</span>
                </button>
              ))}
              <button
                onClick={createCustomTag}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 18, fontSize: 12, border: '1.5px dashed rgba(0,0,0,0.15)', background: '#fafafa', color: '#a8a8a5', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                + Create tag
              </button>
            </div>
          </div>

          {/* Date */}
          {/* Date */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={S.label}>Date & Time <span style={{ color: '#a8a8a5', fontWeight: 400, fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(auto-captured)</span></label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input style={{ ...S.input, flex: 1 }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <input style={{ ...S.input, width: 110 }} type="time" value={form.time || ''} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          {/* Paid by + Split — Splitwise style */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={S.label}>Paid by & Split</label>
            <div style={{ marginTop: 8, background: '#f7f6f2', borderRadius: 14, padding: '4px' }}>

              {/* Single-line Splitwise row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: '#6b6b68' }}>Paid by</span>

                {/* Paid by pill */}
                <button
                  onClick={() => setForm(f => ({ ...f, _paidByOpen: !f._paidByOpen, _splitOpen: false }))}
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', background: '#fff', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {memberCircle(form.paidBy, 22, 9)}
                  {form.paidBy}
                  <span style={{ fontSize: 10, color: '#a8a8a5' }}>▾</span>
                </button>

                <span style={{ fontSize: 14, color: '#6b6b68' }}>and split</span>

                {/* Split pill */}
                <button
                  onClick={() => setForm(f => ({ ...f, _splitOpen: !f._splitOpen, _paidByOpen: false }))}
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', background: '#fff', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {form.splitMode === 'all' ? 'equally' : `${form.splitWith.length} people`}
                  <span style={{ fontSize: 10, color: '#a8a8a5' }}>▾</span>
                </button>
              </div>

              {/* Paid by sheet */}
              {form._paidByOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '8px 6px' }}>
                  <div style={{ fontSize: 11, color: '#a8a8a5', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', padding: '4px 8px 8px' }}>Who paid?</div>
                  {memberNames.map(m => (
                    <button key={m}
                      onClick={() => setForm(f => ({ ...f, paidBy: m, _paidByOpen: false }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: form.paidBy === m ? '#FFF3EB' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: form.paidBy === m ? '#7A2800' : '#1a1a18', marginBottom: 2 }}>
                      {memberCircle(m, 32, 11)}
                      <span style={{ flex: 1, fontWeight: form.paidBy === m ? 600 : 400 }}>{m}</span>
                      {form.paidBy === m && <span style={{ fontSize: 16, color: '#FF6A00' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Split sheet */}
              {form._splitOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '8px 6px' }}>
                  <div style={{ fontSize: 11, color: '#a8a8a5', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', padding: '4px 8px 8px' }}>Split between</div>

                  {/* Everyone row */}
                  <button
                    onClick={() => setForm(f => ({
                      ...f,
                      splitMode: 'all',
                      splitWith: [...memberNames],
                    }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: form.splitMode === 'all' ? '#FFF3EB' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: form.splitMode === 'all' ? '#7A2800' : '#1a1a18', marginBottom: 2 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: form.splitMode === 'all' ? '#FF6A00' : '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={form.splitMode === 'all' ? '#fff' : '#6b6b68'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <span style={{ flex: 1, fontWeight: form.splitMode === 'all' ? 600 : 400 }}>Everyone equally</span>
                    <span style={{ fontSize: 12, color: '#a8a8a5', marginRight: 8 }}>÷{memberNames.length}</span>
                    <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${form.splitMode === 'all' ? '#FF6A00' : '#D3D1C7'}`, background: form.splitMode === 'all' ? '#FF6A00' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
                      {form.splitMode === 'all' ? '✓' : ''}
                    </div>
                  </button>

                  <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '4px 0' }} />

                  {/* Individual members */}
                  {memberNames.map(m => {
                    const sel = form.splitWith.includes(m);
                    return (
                      <button key={m}
                        onClick={() => setForm(f => {
                          const already = f.splitWith.includes(m);
                          const newWith = already
                            ? f.splitWith.filter(n => n !== m)
                            : [...f.splitWith, m];
                          if (newWith.length === 0) return f;
                          // if all members selected, switch back to 'all' mode
                          const isAll = newWith.length === memberNames.length;
                          return { ...f, splitMode: isAll ? 'all' : 'select', splitWith: newWith };
                        })}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: sel ? '#FFF3EB' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: sel ? '#7A2800' : '#1a1a18', marginBottom: 2 }}>
                        {memberCircle(m, 32, 11)}
                        <span style={{ flex: 1, fontWeight: sel ? 600 : 400 }}>{m}</span>
                        {form.amount && parseFloat(form.amount) > 0 && sel && (
                          <span style={{ fontSize: 12, color: '#6b6b68', marginRight: 8 }}>
                            {spendSymbol}{(parseFloat(form.amount) / form.splitWith.length).toFixed(0)}
                          </span>
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${sel ? '#FF6A00' : '#D3D1C7'}`, background: sel ? '#FF6A00' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
                          {sel ? '✓' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Per person preview — shown when amount entered */}
              {form.amount && parseFloat(form.amount) > 0 && !form._paidByOpen && !form._splitOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(form.splitMode === 'all' ? memberNames : form.splitWith).map(m => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '0.5px solid #FFCBA4', borderRadius: 20, padding: '4px 10px 4px 5px', fontSize: 12 }}>
                      {memberCircle(m, 18, 7)}
                      <span style={{ color: '#444' }}>{m}</span>
                      <span style={{ color: '#7A2800', fontWeight: 700 }}>{spendSymbol}{(parseFloat(form.amount) / (form.splitMode === 'all' ? memberNames.length : form.splitWith.length)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  ), document.body);

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <style>{`
        @keyframes soloFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heroFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-7px) rotate(4deg)} }
        @keyframes heroPulse { 0%,100%{opacity:0.07;transform:scale(1)} 50%{opacity:0.14;transform:scale(1.1)} }
        @keyframes heroShimmer { 0%{transform:translateX(-120%) skewX(-18deg)} 100%{transform:translateX(220%) skewX(-18deg)} }
        @keyframes heroNumIn { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes lumiSplitPop{from{opacity:0;transform:scale(0.88) translateY(20px)}60%{transform:scale(1.02) translateY(-2px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      {/* ── Currency picker ── */}
      {showCurrencyPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(28,20,16,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCurrencyPicker(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: '0.75rem 1.25rem 2.5rem', maxHeight: '75vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#D3D1C7', margin: '0 auto 1rem' }} />
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#1C1410', marginBottom: 3 }}>Spending currency</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>All amounts in Split will show in this currency</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {SPLIT_CURRENCIES.map(c => {
                const active = c.code === spendCurrency;
                return (
                  <button key={c.code}
                    onClick={() => { setSpendCurrency(c.code); try { localStorage.setItem(SPEND_CURRENCY_KEY, c.code); } catch {} setShowCurrencyPicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${active ? '#FF6A00' : 'rgba(0,0,0,0.1)'}`, background: active ? '#FFF3EB' : '#fafafa', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", textAlign: 'left' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: active ? '#FF6A00' : '#374151', minWidth: 24 }}>{c.symbol}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#7A2800' : '#374151', flex: 1 }}>{c.code}</span>
                    {active && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Lumi intro popup (first-time) ── */}
      {showWelcome && (
        <div style={{ position:'fixed', inset:0, background:'rgba(28,20,16,0.55)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.25rem' }}
          onClick={dismissWelcome}>
          <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', width:'100%', maxWidth:400, boxShadow:'0 28px 80px rgba(28,20,16,0.28)', animation:'lumiSplitPop .45s cubic-bezier(0.34,1.3,0.64,1) both', position:'relative' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height:4, background:'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
            <div style={{ textAlign:'center', padding:'0.9rem 1.25rem 0.2rem' }}>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:900, color:'#1C1410', lineHeight:1.2 }}>
                Welcome to your trip
              </div>
              <div style={{ fontSize:12, color:'#9a9a96', marginTop:4 }}>
                Split smarter, travel lighter
              </div>
            </div>
            <button onClick={dismissWelcome} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {/* Top: heading + description full width */}
            <div style={{ padding:'1.2rem 1.25rem 0.75rem' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:7 }}>
                Money talk, sorted.
              </div>
              <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62 }}>
                The most avoided conversation in group travel — "who owes what". Not anymore. Add expenses, I'll split it, and show you the cleanest settlement possible.
              </div>
            </div>
            {/* Bottom: Lumi on left + feature boxes on right */}
            <div style={{ display:'flex', alignItems:'flex-end', padding:'0 1.25rem 0', gap:12 }}>
              <div style={{ width:96, flexShrink:0, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                <img src={lumi14Img} alt="Lumi" style={{ width:'auto', height:120, objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, paddingBottom:'0.75rem', paddingTop:'0.25rem' }}>
                {[
                  'Track every expense',
                  'Smart settlement',
                  'Spend charts',
                ].map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 10px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.3)', background:'#FFF8F4' }}>
                    <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink:0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize:11.5, color:'#1C1410', lineHeight:1.4, fontWeight:700 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:'0 1.25rem 1.25rem' }}>
              <button onClick={dismissWelcome} style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}>
                Let's split it 💸
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg,#7A2800,#FF6A00 50%,#FF8C3A)', borderRadius: 20, padding: '1.4rem 1.6rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 40px rgba(255,106,0,0.38)', borderTop: '0.5px solid rgba(255,255,255,0.28)' }}>
        {/* shimmer sweep */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '35%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)', animation: 'heroShimmer 4s ease-in-out infinite', animationDelay: '1.5s' }} />
        </div>
        {/* decorative circles */}
        <div style={{ position: 'absolute', right: -28, top: -28, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', animation: 'heroPulse 4s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -40, bottom: -48, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', animation: 'heroPulse 4.5s ease-in-out infinite', animationDelay: '1.2s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 55, bottom: -18, width: 65, height: 65, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'heroPulse 3.6s ease-in-out infinite', animationDelay: '0.6s', pointerEvents: 'none' }} />
        {/* card icon */}
        <svg width="86" height="86" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,1)" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: -16, right: -16, opacity: 0.13, pointerEvents: 'none', animation: 'heroFloat 6s ease-in-out infinite' }}>
          <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14.5" r="1.5" fill="rgba(255,255,255,1)" stroke="none"/>
        </svg>
        {/* ⓘ Lumi info button */}
        <button onClick={() => setShowWelcome(true)} title="About Split" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, padding:0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>
        <div style={{ display: 'flex', justifyContent: budget ? 'space-between' : 'center', alignItems: 'flex-start', marginBottom: 12, position: 'relative' }}>
          <div style={{ paddingLeft: budget ? 2 : 0, textAlign: budget ? 'left' : 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>Total Spent
            <button onClick={() => setShowCurrencyPicker(true)} style={{ background: 'rgba(255,255,255,0.2)', border: '0.5px solid rgba(255,255,255,0.35)', borderRadius: 6, color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, padding: '2px 6px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", letterSpacing: .5, lineHeight: 1.4 }}>{spendCurrency}</button>
          </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', animation: 'heroNumIn .5s cubic-bezier(.2,.8,.2,1) both', textShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>{fmt(total)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: 500 }}>{fmt(tsr)}/day · {expenses.length} entries</div>
          </div>
          {budget && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 }}>Budget Left</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: budgetLeft < 0 ? '#FFD3C4' : '#FFD0B0', textShadow: '0 1px 8px rgba(0,0,0,0.15)', animation: 'heroNumIn .5s cubic-bezier(.2,.8,.2,1) .1s both' }}>
                {budgetLeft < 0 ? '-' : ''}{fmt(Math.abs(budgetLeft))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>of {fmt(displayBudget)}</div>
            </div>
          )}
        </div>
        {budget && (() => {
          const budgetMsg = budgetPct <= 25 ? 'Crushing it!' : budgetPct <= 50 ? 'Looking good' : budgetPct <= 70 ? 'Keep an eye' : budgetPct <= 85 ? 'Getting close' : budgetPct <= 95 ? 'Almost gone!' : 'Budget blown!';
          const moodImg = budgetPct <= 25 ? lumiMood1 : budgetPct <= 50 ? lumiMood6 : budgetPct <= 70 ? lumiMood3 : budgetPct <= 85 ? lumiMood2 : budgetPct <= 95 ? lumiMood4 : lumiMood5;
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <img src={moodImg} alt="" style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{budgetMsg}</span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, budgetPct)}%`, background: budgetPct > 85 ? 'linear-gradient(90deg,#FF9970,#FFD3C4)' : 'linear-gradient(90deg,#FF8050,#FFD0B0)', transition: 'width .6s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                <span>{budgetPct}% used</span><span>{100 - budgetPct}% remaining</span>
              </div>
            </div>
          );
        })()}
        {!budget && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <button onClick={() => setShowBudgetEdit(true)} style={{ ...S.btn, background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(255,255,255,0.26)', fontSize: 12 }}>
              + Set a budget
            </button>
          </div>
        )}
      </div>
      {showBudgetEdit && (
        <div style={{ ...S.card, border: '0.5px solid #FFCBA4', background: '#f9fffe', marginBottom: '0.75rem' }}>
          <label style={S.label}>Total trip budget ({spendCurrency})</label>
          <input style={S.input} type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="e.g. 50000" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btn, background: 'linear-gradient(135deg,#FF6A00,#D85B00)', color: '#fff', border: '0.5px solid rgba(163,78,0,0.68)', boxShadow: '0 10px 22px rgba(163,78,0,0.24)', flex: 1, justifyContent: 'center', padding: '9px' }}
              onClick={async () => {
                const v = parseFloat(budgetInput);
                if (!isNaN(v) && v > 0) {
                  setLocalBudget(v);
                  setLocalBudgetCurrency(spendCurrency);
                  try { await updateTrip(trip.id, { budget: v, budgetCurrency: spendCurrency }); } catch (_) {}
                }
                setShowBudgetEdit(false);
              }}>✓ Save</button>
            {budget && (
              <button style={{ ...S.btn, color: '#993C1D', borderColor: '#F5C4B3' }}
                onClick={async () => {
                  setLocalBudget(null);
                  setLocalBudgetCurrency(null);
                  try { await updateTrip(trip.id, { budget: null, budgetCurrency: null }); } catch (_) {}
                  setShowBudgetEdit(false);
                }}>Remove</button>
            )}
            <button style={S.btn} onClick={() => setShowBudgetEdit(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Member pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {memberNames.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 20, padding: '4px 12px 4px 5px', fontSize: 13 }}>
            {memberCircle(m, 22, 10)}
            {m}
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1.5px solid rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
        {SECTION_TABS.map(t => {
          const tabIcons = {
            expenses: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
            shares:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            balances: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
            insights: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
          };
          return (
            <button key={t.id} onClick={() => setSection(t.id)}
              style={{ ...S.navTab, ...(section === t.id ? S.navTabActive : {}), position: 'relative', padding: '9px 2px 10px', fontSize: 12, borderRadius: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: section === t.id ? 700 : 500, fontSize: 12 }}>
                {tabIcons[t.id]}
                {t.label}
              </span>
              {section === t.id && (
                <span style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2.5, borderRadius: '99px 99px 0 0', background: SPLIT_ACCENT }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ══ EXPENSES TAB ══ */}
      {section === 'expenses' && (
        <div style={{ paddingBottom: '5rem' }}>
          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={() => setFilterCat('all')} style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, ...(filterCat === 'all' ? { background: 'linear-gradient(135deg,#FF6A00,#D85B00)', color: '#fff', border: '0.5px solid rgba(163,78,0,0.68)' } : {}) }}>All</button>
            {expenseCats.filter(c => catTotals[c.id] > 0).map(c => (
              <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: filterCat === c.id ? c.bg : '#fff', color: filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') : '#6b6b68', border: `0.5px solid ${filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') + '44' : 'rgba(0,0,0,0.12)'}` }}>
                <CatIcon id={c.id} size={12} /><span>{c.label}</span>
              </button>
            ))}
          </div>

          {sortedExpenses.length === 0 && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b6b68', fontSize: 14 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg><p>No expenses yet. Add your first one!</p></div>}

          {sortedExpenses.map(exp => {
            const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
            const splitArr = Array.isArray(exp.split) && exp.split.length > 0 ? exp.split : memberNames;
            const timeLabel = getExpenseTimeLabel(exp);
            const dateLabel = new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return (
              <SwipeableExpenseRow key={exp.id}
                onEdit={() => handleEditExpense(exp)}
                onDelete={() => handleDelete(exp.id)}
                onDuplicate={() => handleDuplicateExpense(exp)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, flexShrink: 0 }}><CatIcon id={cat.id} size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap', fontSize: 11, color: '#6b7280' }}>
                      <span>{cat.label}</span>
                      <span style={{ color: '#D3D1C7' }}>·</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {memberCircle(exp.paidBy, 14, 6)}
                        <span>{exp.paidBy}</span>
                      </div>
                      <span style={{ color: '#D3D1C7' }}>·</span>
                      <span>{timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827' }}>{fmt(exp.amount)}</div>
                  </div>
                </div>
              </SwipeableExpenseRow>
            );
          })}
        </div>
      )}

      {/* ══ SHARES TAB ══ */}
      {section === 'shares' && (
        <div style={{ paddingBottom: '5rem' }}>
          {/* stat strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Total spent', value: fmt(total), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
              { label: 'Members', value: memberNames.length, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: 'Trip days', value: days, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '11px 10px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: `soloFadeUp .3s ease-out ${i * 60}ms both` }}>
                <div style={{ color: '#FF6A00', display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* member breakdown */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Payment breakdown</div>
          {memberNames.map((m, i) => {
            const paid = expenses.filter(e => e.paidBy === m).reduce((s, e) => s + e.amount, 0);
            const owes = expenses.reduce((s, e) => {
              const sp = Array.isArray(e.split) && e.split.length > 0 ? e.split : memberNames;
              return sp.includes(m) ? s + e.amount / sp.length : s;
            }, 0);
            const net = paid - owes;
            const isPos = net > 0.5, isNeg = net < -0.5;
            const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
            return (
              <div key={m} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: `soloFadeUp .35s ease-out ${i * 55}ms both` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  {memberCircle(m, 36, 12, { boxShadow: `0 2px 8px ${mcolor(m)}55` })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{m}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>paid <span style={{ color: '#374151', fontWeight: 600 }}>{fmt(paid)}</span> · share <span style={{ color: '#374151', fontWeight: 600 }}>{fmt(owes)}</span></div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: isPos ? '#FF6A00' : isNeg ? '#D85B00' : '#6b7280' }}>{isPos ? '+' : isNeg ? '−' : ''}{fmt(Math.abs(net))}</div>
                    <div style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: isPos ? '#FFF3EB' : isNeg ? '#FFF8F4' : '#F3F4F6', color: isPos ? '#FF6A00' : isNeg ? '#D85B00' : '#6b7280' }}>
                      {isPos ? 'gets back' : isNeg ? 'owes' : 'settled ✓'}
                    </div>
                  </div>
                </div>
                {/* contribution bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${paidPct}%`, background: `linear-gradient(90deg,${mcolor(m)},${mcolor(m)}cc)`, borderRadius: 99, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{paidPct}%</span>
                </div>
              </div>
            );
          })}

          {/* settlements */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>Who pays whom</div>
          {settlements.length === 0
            ? (
              <div style={{ background: 'linear-gradient(135deg,#FFF3EB,#FFF0E4)', border: '1px solid rgba(255,106,0,0.2)', borderRadius: 16, padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#7A2800' }}>All settled up!</div>
                  <div style={{ fontSize: 12, color: '#FF8C3A', marginTop: 2 }}>Everyone's square. No payments needed.</div>
                </div>
              </div>
            )
            : settlements.map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: `soloFadeUp .38s ease-out ${i * 60}ms both` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {memberCircle(s.from, 34, 11)}
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{s.from}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ background: 'linear-gradient(135deg,#FFF3EB,#FFE9D9)', border: '1px solid rgba(255,106,0,0.18)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#FF6A00' }}>{fmt(s.amt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                      <div style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg,rgba(255,106,0,0.15),rgba(255,106,0,0.5))' }} />
                      <span style={{ fontSize: 12, color: '#FF6A00' }}>→</span>
                      <div style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg,rgba(255,106,0,0.5),rgba(255,106,0,0.15))' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {memberCircle(s.to, 34, 11)}
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{s.to}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ BALANCES TAB ══ */}
      {section === 'balances' && (
        <div style={{ paddingBottom: '5rem' }}>
          {/* summary pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Gets back', count: memberNames.filter(m => balances[m] >= 0.5).length, color: '#FF6A00', bg: '#FFF3EB' },
              { label: 'Owes', count: memberNames.filter(m => balances[m] < -0.5).length, color: '#D85B00', bg: '#FFF8F4' },
              { label: 'Settled', count: memberNames.filter(m => Math.abs(balances[m]) < 0.5).length, color: '#9ca3af', bg: '#F9F9F8' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 14, padding: '10px 8px', textAlign: 'center', animation: `soloFadeUp .3s ease-out ${i * 55}ms both` }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 10, color: s.color, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* member balance cards */}
          {[
            ...memberNames.filter(m => balances[m] >= 0.5).sort((a, b) => balances[b] - balances[a]),
            ...memberNames.filter(m => Math.abs(balances[m]) < 0.5),
            ...memberNames.filter(m => balances[m] < -0.5).sort((a, b) => balances[a] - balances[b]),
          ].map((m, i) => {
            const b = balances[m];
            const isPos = b >= 0.5, isNeg = b < -0.5;
            const accentColor = isPos ? '#FF6A00' : isNeg ? '#D85B00' : '#9ca3af';
            const accentBg = isPos ? '#FFF3EB' : isNeg ? '#FFF8F4' : '#F9F9F8';
            const maxAbs = Math.max(...memberNames.map(n => Math.abs(balances[n] || 0)), 1);
            const barPct = Math.round((Math.abs(b) / maxAbs) * 100);
            return (
              <div key={m} style={{ background: '#fff', borderRadius: 16, marginBottom: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden', animation: `soloFadeUp .35s ease-out ${i * 55}ms both` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {memberCircle(m, 42, 14, { boxShadow: `0 3px 10px ${mcolor(m)}44` })}
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: accentColor, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPos ? <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18,15 12,9 6,15"/></svg>
                       : isNeg ? <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,9 12,15 18,9"/></svg>
                       : <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{m}</div>
                    <div style={{ marginTop: 6, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', maxWidth: 140 }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg,${accentColor},${accentColor}88)`, borderRadius: 99, transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: accentColor }}>{isPos ? '+' : isNeg ? '−' : ''}{fmt(Math.abs(b))}</div>
                    <div style={{ marginTop: 4, display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: accentBg, color: accentColor, border: `1px solid ${accentColor}33` }}>
                      {isPos ? 'gets back' : isNeg ? 'owes' : 'settled ✓'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ INSIGHTS TAB ══ */}
      {section === 'insights' && (
        <div style={{ paddingBottom: '5rem' }}>

          {/* stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Daily rate', value: fmt(tsr), sub: `${daysElapsed}/${days} days`, color: '#FF6A00', bg: '#FFF3EB' },
              { label: 'Projected', value: fmt(projected), sub: budget && projected > displayBudget ? `+${fmt(overBy)} over` : 'on track', color: budget && projected > displayBudget ? '#D85B00' : '#FF8C3A', bg: budget && projected > displayBudget ? '#FFF8F4' : '#FFF3EB' },
              { label: 'Days left', value: daysLeft, sub: `${daysElapsed}d elapsed`, color: '#6366f1', bg: '#EEF2FF' },
            ].map((s, idx) => (
              <div key={idx} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 14, padding: '11px 10px', textAlign: 'center', animation: `soloFadeUp .3s ease-out ${idx * 55}ms both` }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: s.color, marginTop: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Home currency equivalent */}
          {spendCurrency !== homeCurrencyCode && (
            <div style={{ background: '#fff', border: '1px solid rgba(29,158,117,0.22)', borderRadius: 16, padding: '12px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .35s ease-out 70ms both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Amount spent In {homeCurrencyCode} (home)</div>
                  {fxLoading ? (
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>Fetching rate…</div>
                  ) : fxRate !== null ? (
                    <>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#FF6A00' }}>{fmtHome(total * fxRate)}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>1 {spendCurrency} ≈ {homeMeta.symbol}{fxRate.toFixed(2)} {homeCurrencyCode}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Rate unavailable</div>
                  )}
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#FF8C3A', flexShrink: 0, fontFamily: "'Sora',sans-serif" }}>
                  {homeMeta.symbol}
                </div>
              </div>
            </div>
          )}

          {/* Lumi mood card */}
          <div style={{ background: 'linear-gradient(135deg,#FFF3EB,#FFE9D9)', border: '1px solid rgba(255,106,0,0.18)', borderRadius: 20, marginBottom: 12, overflow: 'hidden', animation: 'soloFadeUp .38s ease-out 80ms both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <img src={lumi8Img} alt="Lumi" style={{ width: 78, height: 78, objectFit: 'contain', flexShrink: 0, marginLeft: 4 }} />
              <div style={{ flex: 1, padding: '14px 16px 14px 8px' }}>
                <div style={{ fontSize: 9, color: '#FF6A00', fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 5 }}>Group money mood</div>
                <div style={{ fontSize: 13, color: '#7A2800', lineHeight: 1.6, fontWeight: 500 }}>{funInsightLine}</div>
              </div>
            </div>
          </div>

          {/* Pace meter */}
          {budget && pacePct !== null && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .4s ease-out 120ms both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Crew pace</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: pacePct > 115 ? '#D85B00' : '#FF6A00', fontFamily: "'Sora',sans-serif" }}>{pacePct}% of plan</div>
              </div>
              <div style={{ height: 7, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${Math.min(pacePct, 100)}%`, borderRadius: 99, transition: 'width .6s cubic-bezier(.2,.8,.2,1)', background: pacePct > 115 ? 'linear-gradient(90deg,#D85B00,#FF6A00)' : 'linear-gradient(90deg,#FF6A00,#FF8C3A)' }} />
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(tsr)}/day actual · {fmt(plannedDailyBudget)}/day planned</div>
            </div>
          )}

          {/* Budget health */}
          {budget && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .42s ease-out 150ms both' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Budget health</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Trip budget', value: fmt(displayBudget), color: '#374151' },
                  { label: 'Projected end', value: fmt(projected), color: projected > displayBudget ? '#D85B00' : '#FF8C3A' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#F9F9F8', borderRadius: 12, padding: '9px 11px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#F9F9F8', borderRadius: 12, padding: '10px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8 }}>Usage</div>
                  <div style={{ position: 'relative', width: 110, height: 110 }}>
                    <canvas ref={donutRef} role="img" aria-label={`${budgetPct}% used`}>{budgetPct}% used.</canvas>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <div style={{ padding: '9px 11px', background: projected > budget ? '#FFF8F4' : '#FFF3EB', border: `1px solid ${projected > budget ? '#FFCBA4' : '#FFD5A8'}`, borderRadius: 12, fontSize: 12, color: projected > budget ? '#D85B00' : '#FF6A00', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{projected > budget ? <><path d="M10.3 3.3L2 19h20L13.7 3.3a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> : <polyline points="20,6 9,17 4,12"/>}</svg>
                    {projected > budget ? `Over by ${fmt(overBy)}` : `${fmt(underBy)} under pace`}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                      <span>Spent</span><span>{budgetPct}%</span>
                    </div>
                    <div style={{ height: 7, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, budgetPct)}%`, background: budgetPct > 85 ? 'linear-gradient(90deg,#D85B00,#FF6A00)' : 'linear-gradient(90deg,#FF6A00,#FF8C3A)', transition: 'width .6s' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {activeCats.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .44s ease-out 180ms both' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Category breakdown</div>
              <div style={{ position: 'relative', height: 155, marginBottom: 14 }}>
                <canvas ref={barRef} role="img" aria-label="Spending by category">Category breakdown chart.</canvas>
              </div>
              {activeCats.map((c, ci) => {
                const pct = Math.round(catTotals[c.id] / total * 100);
                return (
                  <div key={c.id} style={{ marginBottom: ci < activeCats.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CatIcon id={c.id} size={16} /></div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151' }}>{c.label}</span>
                      <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: CAT_COLORS[c.id] || SPLIT_ACCENT }}>{fmt(catTotals[c.id])}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', width: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: CAT_COLORS[c.id] || SPLIT_ACCENT, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top expenses */}
          {top3.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .46s ease-out 210ms both' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Top expenses</div>
              {top3.map((exp, idx) => {
                const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
                const pct = total > 0 ? Math.round(exp.amount / total * 100) : 0;
                const rankColors = ['#FF6A00', '#D85B00', '#9ca3af'];
                return (
                  <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: idx < top3.length - 1 ? 10 : 0, borderBottom: idx < top3.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', marginBottom: idx < top3.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: rankColors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CatIcon id={cat.id} size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{exp.paidBy} · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ height: 3, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[exp.cat] || SPLIT_ACCENT, borderRadius: 99, transition: 'width .5s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#111827' }}>{fmt(exp.amount)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{pct}% of total</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Who's carrying */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .48s ease-out 240ms both' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Who's carrying the trip</div>
            {[...memberNames].sort((a, b) => (payTotal[b] || 0) - (payTotal[a] || 0)).map((m, i) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < memberNames.length - 1 ? 10 : 0 }}>
                {memberCircle(m, 32, 11, { boxShadow: `0 2px 8px ${mcolor(m)}44` })}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{m}</span>
                    <span style={{ color: '#6b7280', fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 12 }}>{fmt(payTotal[m] || 0)}</span>
                  </div>
                  <div style={{ height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((payTotal[m] || 0) / maxPay * 100)}%`, background: `linear-gradient(90deg,${mcolor(m)},${mcolor(m)}cc)`, borderRadius: 99, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, background: balances[m] >= 0.5 ? '#FFF3EB' : balances[m] <= -0.5 ? '#FFF8F4' : '#F3F4F6', color: balances[m] >= 0.5 ? '#FF6A00' : balances[m] <= -0.5 ? '#D85B00' : '#9ca3af', border: `1px solid ${balances[m] >= 0.5 ? '#FF6A0033' : balances[m] <= -0.5 ? '#D85B0033' : 'transparent'}` }}>
                  {balances[m] >= 0.5 ? '+' : ''}{fmt(Math.abs(balances[m]))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {section === 'expenses' && createPortal(
        <button
          onClick={() => { setEditingExpenseId(null); setForm({ desc: '', amount: '', paidBy: myNickname || memberNames[0] || '', cat: 'food', date: getNow().date, time: getNow().time, splitMode: 'all', splitWith: [...memberNames], _splitOpen: false, _paidByOpen: false }); setShowForm(true); }}
          style={{ position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', right: 20, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6A00,#D85B00)', border: 'none', boxShadow: '0 4px 20px rgba(255,106,0,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 400 }}
        >+</button>,
        document.body
      )}
      {section === 'insights' && createPortal(
        <button
          onClick={handleShareReport}
          title="Share Expense Report"
          style={{ position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', right: 20, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6A00,#D85B00)', border: 'none', boxShadow: '0 4px 20px rgba(255,106,0,0.45)', cursor: sharing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 400, opacity: sharing ? 0.7 : 1 }}
        >
          {sharing
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          }
        </button>,
        document.body
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PHOTOS PAGE
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   PHOTOS PAGE — Redesigned
   - Each member has their own folder
   - You can only upload as yourself (myNickname)
   - Others see your folder; you see theirs
   - Glassmorphic dark-film aesthetic
═══════════════════════════════════════════════════════ */

export default SplitPage;
