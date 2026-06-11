import { useState, useRef, useEffect, useMemo } from 'react';
import { addExpense, updateExpense, deleteExpense } from '../../api';
import { CATS, normalizeMembers, tripDuration, tripStatusInfo } from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar } from '../shared/ui';
function SplitPage({ trip, myNickname }) {
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
  const [budgetInput, setBudgetInput] = useState('');
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

  const MCOLORS_LIST = ['#1D9E75','#D85A30','#7F77DD','#BA7517','#378ADD','#D4537E','#0F6E56','#993C1D'];
  const mcolor = (name) => {
    const code = Math.abs(Array.from(name || '').reduce((a, c) => a + c.charCodeAt(0), 0));
    return MCOLORS_LIST[code % MCOLORS_LIST.length];
  };
  const CAT_COLORS = { food:'#BA7517', transport:'#0F6E56', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E', other:'#6b6b68' };

  const budget = localBudget;

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
  }, [section, chartReady, expenses, budget]);

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
  const budgetLeft = budget ? budget - total : null;
  const budgetPct = budget ? Math.min(100, Math.round(total / budget * 100)) : null;
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
  const overBy = budget ? Math.max(0, projected - budget) : 0;
  const underBy = budget ? Math.max(0, budget - projected) : 0;
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
  const plannedDailyBudget = budget ? budget / Math.max(1, days) : null;
  const pacePct = plannedDailyBudget ? Math.round((tsr / plannedDailyBudget) * 100) : null;

  const funInsightLines = [];
  if (expenses.length === 0) {
    funInsightLines.push('No spends yet. Wallets are meditating and UPI is on standby.');
  } else {
    if (daysElapsed >= 2) {
      funInsightLines.push(`Group TSR is ₹${Math.round(tsr).toLocaleString('en-IN')}/day over ${daysElapsed} day${daysElapsed > 1 ? 's' : ''}.`);
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
      funInsightLines.push(`${topGetsBack.name} is waiting for ₹${Math.round(topGetsBack.balance).toLocaleString('en-IN')} back. Finance villain origin story loading.`);
    }
    if (topOwes) {
      funInsightLines.push(`${topOwes.name} currently owes ₹${Math.round(Math.abs(topOwes.balance)).toLocaleString('en-IN')}. Traveling on vibes and pending UPI requests.`);
    }
    if (settlements.length === 0) {
      funInsightLines.push('Plot twist: everyone is settled. This is rarer than finding a clean public washroom on a road trip.');
    }
    if (budget && projected > budget) {
      funInsightLines.push(`At this pace, the trip may end around ₹${Math.round(projected).toLocaleString('en-IN')} (about ₹${Math.round(projected - budget).toLocaleString('en-IN')} over budget).`);
    }
  }
  if (funInsightLines.length === 0) {
    funInsightLines.push('Money flow looks balanced right now. Calm spreadsheets, happy friendships.');
  }
  const funInsightLine = funInsightLines[(expenses.length + settlements.length + memberNames.length) % funInsightLines.length];

  function renderCharts() {
    Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch (_) {} });
    chartInstances.current = {};
    const textColor = 'rgba(0,0,0,0.4)';
    const gridColor = 'rgba(0,0,0,0.05)';

    if (donutRef.current && budget) {
      chartInstances.current.donut = new window.Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          datasets: [{ data: [Math.min(total, budget), Math.max(0, budget - total)], backgroundColor: [budgetPct > 85 ? '#D85A30' : '#1D9E75', '#E1F5EE'], borderWidth: 0, hoverOffset: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '74%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataIndex === 0 ? ` Spent: ₹${Math.round(Math.min(total, budget)).toLocaleString('en-IN')}` : ` Left: ₹${Math.round(Math.max(0, budget - total)).toLocaleString('en-IN')}` } } } },
        plugins: [{ id: 'center', afterDraw(chart) { const { ctx, chartArea: { width, height, left, top } } = chart; const cx = left + width / 2, cy = top + height / 2; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 17px system-ui'; ctx.fillStyle = '#1a1a18'; ctx.fillText(`${budgetPct}%`, cx, cy - 9); ctx.font = '12px system-ui'; ctx.fillStyle = textColor; ctx.fillText('used', cx, cy + 9); ctx.restore(); } }]
      });
    }

    if (barRef.current) {
      if (activeCats.length === 0) return;
      const BAR_COLORS = { food:'#BA7517', transport:'#1D9E75', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E'};
      chartInstances.current.bar = new window.Chart(barRef.current, {
        type: 'bar',
        data: { labels: activeCats.map(c => c.label), datasets: [{ data: activeCats.map(c => catTotals[c.id]), backgroundColor: activeCats.map(c => BAR_COLORS[c.id] || '#888780'), borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${Math.round(ctx.raw).toLocaleString('en-IN')}` } } }, scales: { x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: textColor, font: { size: 11 }, callback: v => `₹${v >= 1000 ? Math.round(v / 1000) + 'k' : v}` }, grid: { color: gridColor }, border: { display: false } } } }
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
        setExpenses(es => es.map(x => x.id === editingExpenseId ? data.expense : x));
      } else {
        const data = await addExpense(trip.id, payload);
        setExpenses(es => [data.expense, ...es]);
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
    try { await deleteExpense(trip.id, expId); setExpenses(es => es.filter(x => x.id !== expId)); }
    catch (err) { alert('Could not delete: ' + err.message); }
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

  const SPLIT_ACCENT = '#1D9E75';
  const SPLIT_ACCENT_2 = '#0F6E56';
  const SPLIT_ACCENT_BG = '#E1F5EE';
  const SPLIT_ACCENT_BORDER = '#9FE1CB';
  const SPLIT_ACCENT_TEXT = '#085041';
  const SPLIT_WARN = '#D85A30';
  const SECTION_TABS = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'shares',   label: 'Shares' },
    { id: 'balances', label: 'Balances' },
    { id: 'insights', label: 'Insights' },
  ];

  /* ── Fullscreen expense form ── */
  if (showForm) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 400, display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button onClick={() => { setShowForm(false); setEditingExpenseId(null); setForm({ desc: '', amount: '', paidBy: myNickname || memberNames[0] || '', cat: 'food', date: getNow().date, time: getNow().time, splitMode: 'all', splitWith: [...memberNames], _splitOpen: false, _paidByOpen: false }); }} style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</div>
        <button onClick={handleAdd} disabled={saving || !form.desc || !form.amount}
          style={{ ...S.btn, ...S.btnP, padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !form.desc || !form.amount) ? 0.4 : 1 }}>
          {saving ? (editingExpenseId ? 'Updating…' : 'Saving…') : (editingExpenseId ? 'Update' : 'Save')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Amount block */}
        <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1D9E75)', padding: '2rem 1.5rem 2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 12 }}>How much?</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>₹</span>
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
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 18, fontSize: 12, border: `1.5px solid ${form.cat === c.id ? '#1D9E75' : 'rgba(0,0,0,0.09)'}`, background: form.cat === c.id ? '#E1F5EE' : '#fafafa', color: form.cat === c.id ? '#0F6E56' : '#6b6b68', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: form.cat === c.id ? 600 : 400, transition: 'all .12s' }}>
                  <span style={{ fontSize: 13 }}>{c.icon}</span>
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
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: mcolor(form.paidBy), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>{form.paidBy.slice(0,2).toUpperCase()}</div>
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
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: form.paidBy === m ? '#E1F5EE' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: form.paidBy === m ? '#0F6E56' : '#1a1a18', marginBottom: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.slice(0,2).toUpperCase()}</div>
                      <span style={{ flex: 1, fontWeight: form.paidBy === m ? 600 : 400 }}>{m}</span>
                      {form.paidBy === m && <span style={{ fontSize: 16, color: '#1D9E75' }}>✓</span>}
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
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: form.splitMode === 'all' ? '#E1F5EE' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: form.splitMode === 'all' ? '#0F6E56' : '#1a1a18', marginBottom: 2 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: form.splitMode === 'all' ? '#1D9E75' : '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</div>
                    <span style={{ flex: 1, fontWeight: form.splitMode === 'all' ? 600 : 400 }}>Everyone equally</span>
                    <span style={{ fontSize: 12, color: '#a8a8a5', marginRight: 8 }}>÷{memberNames.length}</span>
                    <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${form.splitMode === 'all' ? '#1D9E75' : '#D3D1C7'}`, background: form.splitMode === 'all' ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
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
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: sel ? '#E1F5EE' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: sel ? '#0F6E56' : '#1a1a18', marginBottom: 2 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.slice(0,2).toUpperCase()}</div>
                        <span style={{ flex: 1, fontWeight: sel ? 600 : 400 }}>{m}</span>
                        {form.amount && parseFloat(form.amount) > 0 && sel && (
                          <span style={{ fontSize: 12, color: '#6b6b68', marginRight: 8 }}>
                            ₹{(parseFloat(form.amount) / form.splitWith.length).toFixed(0)}
                          </span>
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${sel ? '#1D9E75' : '#D3D1C7'}`, background: sel ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
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
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '0.5px solid #9FE1CB', borderRadius: 20, padding: '4px 10px 4px 5px', fontSize: 12 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>{m.slice(0,2).toUpperCase()}</div>
                      <span style={{ color: '#444' }}>{m}</span>
                      <span style={{ color: '#0F6E56', fontWeight: 700 }}>₹{(parseFloat(form.amount) / (form.splitMode === 'all' ? memberNames.length : form.splitWith.length)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`
        @keyframes soloFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* ── Hero ── */}}
      <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1D9E75 48%,#4ABA96)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -18, right: -18, fontSize: 84, opacity: 0.08 }}>💸</div>
        <div style={{ position: 'absolute', left: -40, bottom: -48, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

        {/* Row: Total left, budget right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: budget ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 4 }}>Total Spent</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 700, color: '#fff' }}>₹{Math.round(total).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>₹{Math.round(perPerson).toLocaleString('en-IN')}/person · {expenses.length} expense{expenses.length !== 1 ? 's' : ''}</div>
          </div>
          {budget && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', marginBottom: 4 }}>Budget Left</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: budgetLeft < 0 ? '#FFD3C4' : 'rgba(255,255,255,0.95)' }}>
                {budgetLeft < 0 ? '-' : ''}₹{Math.abs(Math.round(budgetLeft)).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>of ₹{budget.toLocaleString('en-IN')}</div>
            </div>
          )}
        </div>

        {budget && (() => {
          const budgetEmoji = budgetPct <= 25 ? '�' : budgetPct <= 50 ? '🙂' : budgetPct <= 70 ? '😐' : budgetPct <= 85 ? '😬' : budgetPct <= 95 ? '😰' : '🤯';
          const budgetMsg = budgetPct <= 25 ? 'Crushing it!' : budgetPct <= 50 ? 'Looking good' : budgetPct <= 70 ? 'Keep an eye' : budgetPct <= 85 ? 'Getting close' : budgetPct <= 95 ? 'Almost gone!' : 'Budget blown!';
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{budgetEmoji}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{budgetMsg}</span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, budgetPct)}%`, background: budgetPct > 85 ? '#FFD3C4' : 'rgba(255,255,255,0.85)', transition: 'width .6s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                <span>{budgetPct}% used</span><span>{100 - budgetPct}% remaining</span>
              </div>
            </div>
          );
        })()}
        {!budget && (
          <button onClick={() => setShowBudgetEdit(true)}
            style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(255,255,255,0.26)', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginTop: 10 }}>
            + Set a budget
          </button>
        )}
        {budget && (
          <button onClick={() => { setBudgetInput(String(budget)); setShowBudgetEdit(true); }}
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginTop: 8 }}>
            ✏️ Edit budget
          </button>
        )}
      </div>
      {showBudgetEdit && (
        <div style={{ ...S.card, border: '0.5px solid #9FE1CB', background: '#f9fffe', marginBottom: '0.75rem' }}>
          <label style={S.label}>Total trip budget ₹</label>
          <input style={S.input} type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="e.g. 50000" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btn, ...S.btnP, flex: 1, justifyContent: 'center', padding: '9px' }}
              onClick={async () => {
                const v = parseFloat(budgetInput);
                if (!isNaN(v) && v > 0) {
                  setLocalBudget(v);
                  try { const { updateTrip } = await import('../../api'); await updateTrip(trip.id, { budget: v }); } catch (_) {}
                }
                setShowBudgetEdit(false);
              }}>✓ Save</button>
            {budget && (
              <button style={{ ...S.btn, color: '#993C1D', borderColor: '#F5C4B3' }}
                onClick={async () => {
                  setLocalBudget(null);
                  try { const { updateTrip } = await import('../../api'); await updateTrip(trip.id, { budget: null }); } catch (_) {}
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
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{m.slice(0, 2).toUpperCase()}</div>
            {m}
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 13, padding: 3, flex: 1 }}>
          {SECTION_TABS.map(t => (
            <button key={t.id} onClick={() => setSection(t.id)}
              style={{ flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: section === t.id ? 600 : 400, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: section === t.id ? 'linear-gradient(135deg,#1D9E75,#0F6E56)' : 'transparent', color: section === t.id ? '#fff' : '#6b6b68', transition: 'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ EXPENSES TAB ══ */}
      {section === 'expenses' && (
        <div style={{ paddingBottom: '5rem' }}>
          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={() => setFilterCat('all')} style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, ...(filterCat === 'all' ? S.btnP : {}) }}>All</button>
            {expenseCats.filter(c => catTotals[c.id] > 0).map(c => (
              <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: filterCat === c.id ? c.bg : '#fff', color: filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') : '#6b6b68', border: `0.5px solid ${filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') + '44' : 'rgba(0,0,0,0.12)'}` }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {sortedExpenses.length === 0 && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b6b68', fontSize: 14 }}><div style={{ fontSize: 40, marginBottom: 10 }}>📝</div><p>No expenses yet. Add your first one!</p></div>}

          {sortedExpenses.map(exp => {
            const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
            const splitArr = Array.isArray(exp.split) && exp.split.length > 0 ? exp.split : memberNames;
            const timeLabel = getExpenseTimeLabel(exp);
            const accentColor = CAT_COLORS[exp.cat] || '#b0a8a0';
            return (
              <div key={exp.id} style={{ background: '#fff', borderRadius: 18, marginBottom: 10, boxShadow: '0 4px 18px rgba(15,23,42,0.07)', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                {/* color top strip */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, flexShrink: 0, fontSize: 21, boxShadow: `0 2px 8px ${accentColor}44` }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: mcolor(exp.paidBy), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 800 }}>{exp.paidBy.slice(0,2).toUpperCase()}</div>
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{exp.paidBy}</span>
                      </div>
                      <span style={{ color: '#D3D1C7', fontSize: 10 }}>•</span>
                      <div style={{ display: 'flex' }}>
                        {splitArr.slice(0, 4).map((m, i) => (
                          <div key={m} style={{ width: 15, height: 15, borderRadius: '50%', background: mcolor(m), border: '1.5px solid #fff', marginLeft: i > 0 ? -5 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 6, fontWeight: 700 }}>{m.slice(0,1).toUpperCase()}</div>
                        ))}
                        {splitArr.length > 4 && <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#D3D1C7', border: '1.5px solid #fff', marginLeft: -5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, color: '#6b6b68', fontWeight: 700 }}>+{splitArr.length-4}</div>}
                      </div>
                      <span style={{ color: '#D3D1C7', fontSize: 10 }}>•</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{timeLabel ? ` · ${timeLabel}` : ''}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#111827' }}>₹{Math.round(exp.amount).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>₹{Math.round(exp.amount / splitArr.length).toLocaleString('en-IN')} each</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2, marginTop: 4 }}>
                      <button onClick={() => handleEditExpense(exp)} style={{ ...S.btn, padding: '2px 7px', fontSize: 11, color: '#6b7280', border: 'none', background: 'rgba(0,0,0,0.04)', borderRadius: 6 }}>✎</button>
                      <button onClick={() => handleDelete(exp.id)} style={{ ...S.btn, padding: '2px 7px', fontSize: 11, color: '#ef4444', border: 'none', background: 'rgba(239,68,68,0.06)', borderRadius: 6 }}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ SHARES TAB ══ */}
      {section === 'shares' && (
        <div>
          <div style={{ ...S.card, background: 'linear-gradient(135deg,#E1F5EE,#E6F1FB)', border: '0.5px solid #9FE1CB', marginBottom: '1rem' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: '#085041' }}>₹{Math.round(total).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 3 }}>{memberNames.length} members · {expenses.length} expenses · {days} days</div>
          </div>
          <div style={{ ...S.card, marginBottom: '0.75rem' }}>
            {memberNames.map((m, i) => {
              const paid = expenses.filter(e => e.paidBy === m).reduce((s, e) => s + e.amount, 0);
              const owes = expenses.reduce((s, e) => {
                const sp = Array.isArray(e.split) && e.split.length > 0 ? e.split : memberNames;
                return sp.includes(m) ? s + e.amount / sp.length : s;
              }, 0);
              const net = paid - owes;
              return (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < memberNames.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{m.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m}</div>
                    <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 1 }}>paid ₹{Math.round(paid).toLocaleString('en-IN')} · share ₹{Math.round(owes).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: net >= 0 ? '#0F6E56' : '#993C1D' }}>{net >= 0 ? '+' : '−'}₹{Math.abs(Math.round(net)).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 1 }}>{net > 0.5 ? 'gets back' : net < -0.5 ? 'owes' : 'settled'}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Who pays whom</div>
          {settlements.length === 0
            ? <div style={{ background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 12, padding: '1rem 1.25rem', fontSize: 14, color: '#085041', fontWeight: 500 }}>✅ Everyone is squared up!</div>
            : settlements.map((s, i) => (
              <div key={i} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(s.from), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.from.slice(0, 2).toUpperCase()}</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.from}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ height: 1, flex: 1, background: 'rgba(0,0,0,0.09)' }} />
                  <span style={{ fontSize: 11, color: '#D85A30', padding: '2px 6px', background: '#FAECE7', borderRadius: 8, fontWeight: 600 }}>→</span>
                  <div style={{ height: 1, flex: 1, background: 'rgba(0,0,0,0.09)' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.to}</span>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(s.to), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.to.slice(0, 2).toUpperCase()}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0F6E56', marginLeft: 6 }}>₹{Math.round(s.amt).toLocaleString('en-IN')}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ BALANCES TAB ══ */}
      {section === 'balances' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {memberNames.map(m => {
            const b = balances[m];
            const isPos = b >= 0.5, isNeg = b < -0.5;
            return (
              <div key={m} style={{ ...S.card, borderTop: `3px solid ${isPos ? '#1D9E75' : isNeg ? '#D85A30' : '#D3D1C7'}`, borderRadius: '0 0 14px 14px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{m.slice(0, 2).toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</div>
                </div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: isPos ? '#0F6E56' : isNeg ? '#993C1D' : '#6b6b68' }}>
                  {isPos ? '+' : ''}₹{Math.abs(Math.round(b)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPos ? '#1D9E75' : isNeg ? '#D85A30' : '#D3D1C7', display: 'inline-block', marginRight: 4 }} />
                  {isPos ? 'gets back' : isNeg ? 'owes' : 'all settled'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ INSIGHTS TAB ══ */}
      {section === 'insights' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'TSR/day', value: `₹${Math.round(tsr).toLocaleString('en-IN')}`, sub: `${daysElapsed}/${days} days elapsed` },
              { label: 'Projected', value: `₹${projected.toLocaleString('en-IN')}`, sub: 'at current rate', warn: budget && projected > budget },
              { label: 'Days left', value: daysLeft, sub: `${daysElapsed}d elapsed` },
            ].map((s, idx) => (
              <div key={s.label} style={{ background: s.warn ? '#FAECE7' : '#f7f6f2', borderRadius: 12, padding: '10px 12px', border: s.warn ? '0.5px solid #F5C4B3' : 'none', animation: 'soloFadeUp .35s ease-out both', animationDelay: `${idx * 55}ms` }}>
                <div style={{ fontSize: 11, color: s.warn ? '#993C1D' : '#6b6b68', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: s.warn ? '#993C1D' : '#1a1a18' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.warn ? '#D85A30' : '#a8a8a5', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, marginBottom: 10, background: 'linear-gradient(135deg,#E1F5EE,#F0FDF9)', border: `0.5px solid ${SPLIT_ACCENT_BORDER}`, position: 'relative', overflow: 'hidden', animation: 'soloFadeUp .4s ease-out both', animationDelay: '120ms' }}>
            <div style={{ position: 'absolute', right: 10, top: 6, fontSize: 26, opacity: 0.3 }}>🎒</div>
            <div style={{ fontSize: 11, color: SPLIT_ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, fontWeight: 700 }}>Group money mood</div>
            <div style={{ fontSize: 14, color: SPLIT_ACCENT_TEXT, lineHeight: 1.55, paddingRight: 20 }}>{funInsightLine}</div>
          </div>

          {budget && pacePct !== null && (
            <div style={{ ...S.card, marginBottom: 10, background: 'linear-gradient(135deg,#F8FFF9,#F1FFFA)' }}>
              <div style={{ fontSize: 11, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, fontWeight: 700 }}>Crew Pace Meter</div>
              <div style={{ fontSize: 14, color: '#1a1a18', lineHeight: 1.5 }}>
                {pacePct <= 95 && `🧘 Smooth pace. Team is at ${pacePct}% of planned daily budget.`}
                {pacePct > 95 && pacePct <= 115 && `⚖️ Balanced burn. Team is at ${pacePct}% of planned daily budget.`}
                {pacePct > 115 && `🔥 Sprint mode. Team is at ${pacePct}% of planned daily budget.`}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b6b68' }}>₹{Math.round(tsr).toLocaleString('en-IN')}/day now vs ₹{Math.round(plannedDailyBudget).toLocaleString('en-IN')}/day planned</div>
            </div>
          )}

          {budget && (
            <div style={{ ...S.card, marginBottom: 10, background: 'linear-gradient(135deg,#FEFEFF,#F7F6FF)', animation: 'soloFadeUp .42s ease-out both', animationDelay: '170ms' }}>
              <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Budget health</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: '#a8a8a5', marginBottom: 2 }}>Trip budget</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>₹{Math.round(budget).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: '#a8a8a5', marginBottom: 2 }}>Projected end</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: projected > budget ? '#993C1D' : SPLIT_ACCENT }}>₹{Math.round(projected).toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem .75rem', marginBottom: 0 }}>
                  <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Usage</div>
                  <div style={{ position: 'relative', width: 120, height: 120 }}>
                    <canvas ref={donutRef} role="img" aria-label={`${budgetPct}% of budget spent`}>{budgetPct}% used.</canvas>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <div style={{ padding: '10px 11px', background: projected > budget ? '#FAECE7' : SPLIT_ACCENT_BG, border: `0.5px solid ${projected > budget ? '#F5C4B3' : SPLIT_ACCENT_BORDER}`, borderRadius: 10, fontSize: 12, color: projected > budget ? '#993C1D' : SPLIT_ACCENT_TEXT, lineHeight: 1.45 }}>
                    {projected > budget ? `⚠️ Over by ₹${Math.round(overBy).toLocaleString('en-IN')}` : `✅ ₹${Math.round(underBy).toLocaleString('en-IN')} under pace`}
                  </div>
                  <div style={{ height: 7, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${budgetPct}%`, background: budgetPct > 85 ? SPLIT_WARN : SPLIT_ACCENT, transition: 'width .6s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#a8a8a5' }}>{budgetPct}% used</div>
                </div>
              </div>
            </div>
          )}

          {activeCats.length > 0 && (
            <div style={{ ...S.card, marginBottom: 10, animation: 'soloFadeUp .44s ease-out both', animationDelay: '220ms' }}>
              <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Category breakdown</div>
              <div style={{ position: 'relative', height: 170, marginBottom: 12 }}>
                <canvas ref={barRef} role="img" aria-label="Spending by category">Category breakdown chart.</canvas>
              </div>
              {activeCats.map(c => {
                const pct = Math.round(catTotals[c.id] / total * 100);
                return (
                  <div key={c.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{c.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: CAT_COLORS[c.id] || SPLIT_ACCENT }}>₹{Math.round(catTotals[c.id]).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: CAT_COLORS[c.id] || SPLIT_ACCENT, transition: 'width .5s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b6b68', width: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {top3.length > 0 && (
            <div style={{ ...S.card, animation: 'soloFadeUp .46s ease-out both', animationDelay: '270ms' }}>
              <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Top expenses</div>
              {top3.map((exp, idx) => {
                const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
                const pct = total > 0 ? Math.round(exp.amount / total * 100) : 0;
                return (
                  <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: idx < top3.length - 1 ? '0 0 10px' : '0', borderBottom: idx < top3.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', marginBottom: idx < top3.length - 1 ? 10 : 0, animation: 'soloFadeUp .32s ease-out both', animationDelay: `${320 + idx * 45}ms` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{['🥇','🥈','🥉'][idx]}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cat.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                      <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2 }}>{exp.paidBy} · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 5 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[exp.cat] || SPLIT_ACCENT, borderRadius: 4, transition: 'width .5s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700 }}>₹{Math.round(exp.amount).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: 11, color: '#a8a8a5' }}>{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ ...S.card, marginBottom: 10, animation: 'soloFadeUp .48s ease-out both', animationDelay: '300ms' }}>
            <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Who's carrying the trip</div>
            {[...memberNames].sort((a, b) => (payTotal[b] || 0) - (payTotal[a] || 0)).map((m, i) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < memberNames.length - 1 ? 10 : 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{m.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{m}</span>
                    <span style={{ color: '#6b6b68' }}>₹{Math.round(payTotal[m] || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((payTotal[m] || 0) / maxPay * 100)}%`, background: mcolor(m), borderRadius: 4, transition: 'width .5s' }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, flexShrink: 0, background: balances[m] >= 0.5 ? '#E1F5EE' : balances[m] <= -0.5 ? '#FAECE7' : '#F1EFE8', color: balances[m] >= 0.5 ? '#0F6E56' : balances[m] <= -0.5 ? '#993C1D' : '#6b6b68' }}>
                  {balances[m] >= 0.5 ? '+' : ''}₹{Math.abs(Math.round(balances[m])).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, animation: 'soloFadeUp .5s ease-out both', animationDelay: '340ms' }}>
            <div style={{ ...S.card }}>
              <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 8 }}>Most generous</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(topPayer), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{topPayer.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{topPayer}</div>
                  <div style={{ fontSize: 11, color: '#a8a8a5' }}>₹{Math.round(payTotal[topPayer] || 0).toLocaleString('en-IN')} paid</div>
                </div>
              </div>
            </div>
            <div style={{ ...S.card }}>
              <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 8 }}>Top category</div>
              {topCatMeta ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: topCatMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{topCatMeta.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{topCatMeta.label}</div>
                    <div style={{ fontSize: 11, color: '#a8a8a5' }}>₹{Math.round(catTotals[topCatMeta.id]).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ) : <div style={{ fontSize: 14, color: '#a8a8a5' }}>—</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Add button — only on expenses tab ── */}
      {section === 'expenses' && (
        <button
          onClick={() => { setEditingExpenseId(null); setForm({ desc: '', amount: '', paidBy: myNickname || memberNames[0] || '', cat: 'food', date: getNow().date, time: getNow().time, splitMode: 'all', splitWith: [...memberNames], _splitOpen: false, _paidByOpen: false }); setShowForm(true); }}
          style={{ position: 'fixed', bottom: 24, right: 20, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', border: 'none', boxShadow: '0 4px 20px rgba(29,158,117,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 300, transition: 'transform .15s', fontWeight: 300 }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          +
        </button>
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
