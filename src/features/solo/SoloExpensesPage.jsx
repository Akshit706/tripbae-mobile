import { useState, useRef, useEffect, useMemo } from 'react';
import lumi8Img from '../../assets/lumi8.png';
import lumi14Img from '../../assets/lumi14.png';
import lumiMood1 from '../../assets/lumi_mood1.png';
import lumiMood2 from '../../assets/lumi_mood2.png';
import lumiMood3 from '../../assets/lumi_mood3.png';
import lumiMood4 from '../../assets/lumi_mood4.png';
import lumiMood5 from '../../assets/lumi_mood5.png';
import lumiMood6 from '../../assets/lumi_mood6.png';
import { addExpense, updateExpense, deleteExpense } from '../../api';
import { CATS, tripDuration } from '../shared/constants';
import { S } from '../shared/styles';
import { CatIcon } from '../shared/ui';
import { getFxRate } from '../home/HomePage';

const SOLO_CURRENCIES = [
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

function SoloExpensesPage({ trip, myNickname, onTripUpdate }) {
  const [expenses, setExpenses] = useState(trip.expenses || []);
  const [budget, setBudget] = useState(trip.budget || null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [editBudget, setEditBudget] = useState(String(budget || ''));
  const [localBudgetCurrency, setLocalBudgetCurrency] = useState(trip.budgetCurrency || null);
  const SOLO_SPEND_CURRENCY_KEY = `travelbae_solo_spendcurrency_${trip.id}`;
  const [spendCurrency, setSpendCurrency] = useState(() => {
    try { return localStorage.getItem(`travelbae_solo_spendcurrency_${trip.id}`) || trip.destinationCurrency || trip.budgetCurrency || 'INR'; } catch { return 'INR'; }
  });
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [section, setSection] = useState('expenses');
  const [saving, setSaving] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const SOLO_WELCOME_KEY = `travelbae_solo_welcome_${trip.id}`;
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem(`travelbae_solo_welcome_${trip.id}`); } catch { return false; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem(SOLO_WELCOME_KEY, '1'); } catch {}
    setShowWelcome(false);
  };
  const todayStr = new Date().toISOString().split('T')[0];
  const getNow = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  };
  const [form, setForm] = useState({ desc: '', amount: '', cat: 'food', date: getNow().date, time: getNow().time, note: '' });
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
  const donutRef = useRef(null);
  const barRef = useRef(null);
  const chartInstances = useRef({});

  const expenseCats = useMemo(() => {
    const base = [...CATS];
    const known = new Set(base.map(c => c.id));
    const extra = customCats.filter(c => c?.id && c?.label && !known.has(c.id));
    return [...base, ...extra];
  }, [customCats]);

  useEffect(() => {
    setExpenses(trip.expenses || []);
  }, [trip.expenses]);

  useEffect(() => {
    setBudget(trip.budget || null);
  }, [trip.budget]);

  useEffect(() => {
    try {
      localStorage.setItem(customTagsKey, JSON.stringify(customCats));
    } catch {
      // ignore
    }
  }, [customCats, customTagsKey]);

  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = () => setChartReady(true);
    document.head.appendChild(script);
  }, []);

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
  const budgetLeft = budget ? budget - total : null;
  const budgetPct = budget ? Math.min(100, Math.round(total / budget * 100)) : null;

  const catTotals = {};
  expenseCats.forEach(c => { catTotals[c.id] = 0; });
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const projected = Math.round(tsr * days);
  const activeCats = expenseCats.filter(c => catTotals[c.id] > 0).sort((a, b) => catTotals[b.id] - catTotals[a.id]);
  const topCatMeta = expenseCats.find(c => c.id === topCat?.[0]) || null;
  const overBy = budget ? Math.max(0, projected - budget) : 0;
  const underBy = budget ? Math.max(0, budget - projected) : 0;
  const uniqueSpendDays = new Set(expenses.map(e => e.date)).size;
  const plannedDailyBudget = budget ? budget / Math.max(1, days) : null;
  const pacePct = plannedDailyBudget ? Math.round((tsr / plannedDailyBudget) * 100) : null;

  const spendMeta = SOLO_CURRENCIES.find(c => c.code === spendCurrency) || { code: 'INR', symbol: '₹' };
  const spendSymbol = spendMeta.symbol;
  const budgetCurrMeta = SOLO_CURRENCIES.find(c => c.code === (localBudgetCurrency || spendCurrency)) || spendMeta;
  const fmt = n => `${spendSymbol}${Math.round(n).toLocaleString('en-IN')}`;
  const fmtBudget = n => `${budgetCurrMeta.symbol}${Math.round(n).toLocaleString('en-IN')}`;

  const soloFunLines = [];
  if (expenses.length === 0) {
    soloFunLines.push('No expenses yet. Your wallet currently thinks this is a spiritual retreat.');
  } else {
    if (daysElapsed >= 2) {
      soloFunLines.push(`Current TSR is ${spendSymbol}${Math.round(tsr).toLocaleString('en-IN')}/day across ${daysElapsed} day${daysElapsed > 1 ? 's' : ''}.`);
    }
    if (budget && budgetPct <= 60 && uniqueSpendDays >= Math.max(2, Math.round(days * 0.4))) {
      soloFunLines.push('You are spending like a pro traveler, not a panic buyer at airport shops.');
    }
    if (budget && budgetPct >= 90) {
      soloFunLines.push('Budget alert: your card is brave, but your future self is filing a complaint.');
    }
    if (topCatMeta && total > 0) {
      const catPct = Math.round((catTotals[topCatMeta.id] / total) * 100);
      soloFunLines.push(`${topCatMeta.label} owns ${catPct}% of your spend. Priorities: crystal clear.`);
    }
    if (top3[0]) {
      soloFunLines.push(`Biggest spend was ${top3[0].desc}. Iconic decision, no notes.`);
    }
    if (budget && projected > budget) {
      soloFunLines.push(`If this pace continues, you may overshoot by ${fmtBudget(projected - budget)}.`);
    }
  }
  if (soloFunLines.length === 0) {
    soloFunLines.push('Your solo money flow looks balanced. Calm plan, clean execution.');
  }
  const soloInsightLine = soloFunLines[(expenses.length + uniqueSpendDays + days) % soloFunLines.length];
  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.cat === filterCat);
  const sortedFiltered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

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

  useEffect(() => {
    if (section !== 'insights' || !chartReady) return;
    const t = setTimeout(renderCharts, 80);
    return () => clearTimeout(t);
  }, [section, chartReady, expenses, budget]);

  const handleAdd = async () => {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    try {
      const payload = {
        desc: form.desc,
        amount: parseFloat(form.amount),
        paidBy: myNickname || 'Me',
        cat: form.cat,
        split: [myNickname || 'Me'],
        note: form.note,
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
      setForm({ desc: '', amount: '', cat: 'food', date: getNow().date, time: getNow().time, note: '' });
      setEditingExpenseId(null);
      setShowForm(false);
    } catch (err) {
      alert(`Could not ${editingExpenseId ? 'update' : 'save'} expense: ` + err.message);
    }
    setSaving(false);
  };

  const handleEdit = (exp) => {
    setForm({
      desc: exp.desc || '',
      amount: String(exp.amount || ''),
      cat: exp.cat || 'food',
      date: exp.date ? (() => { const d = new Date(exp.date); const pad = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; })() : getNow().date,
      time: exp.time || (() => { const d = new Date(exp.date); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })() || getNow().time,
      note: exp.note || '',
    });
    setEditingExpenseId(exp.id);
    setShowForm(true);
  };

  const handleDelete = async (expId) => {
    try {
      await deleteExpense(trip.id, expId);
      setExpenses(es => es.filter(x => x.id !== expId));
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  const CAT_COLORS = { food: '#BA7517', transport: '#0F6E56', stay: '#378ADD', activity: '#7F77DD', shopping: '#D4537E', other: '#6b6b68' };
  const SOLO_ACCENT = '#FF6A00';
  const SOLO_ACCENT_2 = '#FF8C3A';
  const SOLO_ACCENT_BG = '#FFF3EB';
  const SOLO_ACCENT_BORDER = '#FFCBA4';
  const SOLO_ACCENT_TEXT = '#7A2800';
  const SOLO_WARN = '#D85B00';
  const SECTION_TABS = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'insights', label: 'Insights' },
  ];

  function renderCharts() {
    Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch (_) {} });
    chartInstances.current = {};
    const textColor = 'rgba(0,0,0,0.4)';
    const gridColor = 'rgba(0,0,0,0.05)';

    if (donutRef.current && budget) {
      chartInstances.current.donut = new window.Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [Math.min(total, budget), Math.max(0, budget - total)],
            backgroundColor: [budgetPct > 85 ? '#D85A30' : SOLO_ACCENT, SOLO_ACCENT_BG],
            borderWidth: 0,
            hoverOffset: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ctx.dataIndex === 0
                  ? ` Spent: ${fmtBudget(Math.min(total, budget))}`
                  : ` Left: ${fmtBudget(Math.max(0, budget - total))}`,
              },
            },
          },
        },
        plugins: [{
          id: 'center',
          afterDraw(chart) {
            const { ctx, chartArea: { width, height, left, top } } = chart;
            const cx = left + width / 2;
            const cy = top + height / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '600 17px system-ui';
            ctx.fillStyle = '#1a1a18';
            ctx.fillText(`${budgetPct}%`, cx, cy - 9);
            ctx.font = '12px system-ui';
            ctx.fillStyle = textColor;
            ctx.fillText('used', cx, cy + 9);
            ctx.restore();
          },
        }],
      });
    }

    if (barRef.current) {
      const cats = activeCats;
      if (cats.length === 0) return;
      const BAR_COLORS = { food:'#BA7517', transport:'#1D9E75', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E' };
      chartInstances.current.bar = new window.Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: cats.map(c => c.label),
          datasets: [{
            data: cats.map(c => catTotals[c.id]),
            backgroundColor: cats.map(c => BAR_COLORS[c.id] || '#888780'),
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } },
          },
          scales: {
            x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
            y: { ticks: { color: textColor, font: { size: 11 }, callback: v => `${spendSymbol}${v >= 1000 ? Math.round(v / 1000) + 'k' : v}` }, grid: { color: gridColor }, border: { display: false } },
          },
        },
      });
    }
  }

  if (showForm) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 400, display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button onClick={() => { setShowForm(false); setEditingExpenseId(null); setForm({ desc: '', amount: '', cat: 'food', date: getNow().date, time: getNow().time, note: '' }); }} style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</div>
        <button onClick={handleAdd} disabled={saving || !form.desc || !form.amount}
          style={{ ...S.btn, ...S.btnSolo, padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !form.desc || !form.amount) ? 0.4 : 1 }}>
          {saving ? (editingExpenseId ? 'Updating…' : 'Saving…') : (editingExpenseId ? 'Update' : 'Save')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
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

        <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '1.5rem 1.25rem 2rem', minHeight: '100%' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>What was it?</label>
            <input style={{ ...S.input, fontSize: 15, padding: '12px 14px', marginTop: 6 }}
              placeholder="e.g. Hotel checkout, dinner, cab…"
              value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {expenseCats.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 18, fontSize: 12, border: `1.5px solid ${form.cat === c.id ? SOLO_ACCENT_2 : 'rgba(0,0,0,0.09)'}`, background: form.cat === c.id ? SOLO_ACCENT_BG : '#fafafa', color: form.cat === c.id ? SOLO_ACCENT : '#6b6b68', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: form.cat === c.id ? 600 : 400, transition: 'all .12s' }}>
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

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Date & Time <span style={{ color: '#a8a8a5', fontWeight: 400, fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(auto-captured)</span></label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input style={{ ...S.input, flex: 1 }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <input style={{ ...S.input, width: 110 }} type="time" value={form.time || ''} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Note (optional)</label>
            <input style={{ ...S.input, marginTop: 6 }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Amazing views!" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`
        @keyframes soloFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heroFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-7px) rotate(4deg)} }
        @keyframes heroPulse { 0%,100%{opacity:0.07;transform:scale(1)} 50%{opacity:0.14;transform:scale(1.1)} }
        @keyframes heroShimmer { 0%{transform:translateX(-120%) skewX(-18deg)} 100%{transform:translateX(220%) skewX(-18deg)} }
        @keyframes heroNumIn { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
        @keyframes lumiSoloPop{from{opacity:0;transform:scale(0.88) translateY(20px)}60%{transform:scale(1.02) translateY(-2px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      {/* ── Currency picker ── */}
      {showCurrencyPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(28,20,16,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCurrencyPicker(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: '0.75rem 1.25rem 2.5rem', maxHeight: '75vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#D3D1C7', margin: '0 auto 1rem' }} />
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#1C1410', marginBottom: 3 }}>Spending currency</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>All amounts in Expenses will show in this currency</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {SOLO_CURRENCIES.map(c => {
                const active = c.code === spendCurrency;
                return (
                  <button key={c.code}
                    onClick={() => { setSpendCurrency(c.code); try { localStorage.setItem(SOLO_SPEND_CURRENCY_KEY, c.code); } catch {} setShowCurrencyPicker(false); }}
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
          <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', width:'100%', maxWidth:400, boxShadow:'0 28px 80px rgba(28,20,16,0.28)', animation:'lumiSoloPop .45s cubic-bezier(0.34,1.3,0.64,1) both', position:'relative' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height:4, background:'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
            <button onClick={dismissWelcome} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ display:'flex', alignItems:'flex-end', padding:'1.5rem 1.25rem 0', gap:14 }}>
              <div style={{ width:110, flexShrink:0, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                <img src={lumi14Img} alt="Lumi" style={{ width:'auto', height:140, objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, minWidth:0, paddingBottom:'1rem' }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                  <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:7 }}>
                  Your solo wallet, tracked.
                </div>
                <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:10 }}>
                  No one to split with — but also no one judging your third coffee. Log every spend, set a budget, and see exactly where the money went. I won't tell.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    'Log every expense with category and note',
                    'Set a trip budget and watch the tracker',
                    'Visual insights: donut chart, daily breakdown',
                  ].map((f, i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 10px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.3)', background:'#FFF8F4' }}>
                      <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink:0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize:11.5, color:'#5C504A', lineHeight:1.4, fontWeight:500 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:'0 1.25rem 1.25rem' }}>
              <button onClick={dismissWelcome} style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}>
                Track my spend 🧾
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,#7A2800,#FF6A00 48%,#FF8C3A)', borderRadius: 20, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 40px rgba(255,106,0,0.36)', borderTop: '0.5px solid rgba(255,255,255,0.28)' }}>
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
        <button onClick={() => setShowWelcome(true)} title="About Expenses" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, padding:0 }}>
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
                {budgetLeft < 0 ? '-' : ''}{fmtBudget(Math.abs(budgetLeft))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>of {fmtBudget(budget)}</div>
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
                <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, budgetPct)}%`, background: budgetPct > 85 ? '#FFD3C4' : '#FFD0B0', transition: 'width .6s' }} />
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
        <div style={{ ...S.card, border: `0.5px solid ${SOLO_ACCENT_BORDER}`, background: '#f9fffe', marginBottom: '1rem' }}>
          <label style={S.label}>Total trip budget ({spendCurrency})</label>
          <input style={S.input} type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)} placeholder="e.g. 15000" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              style={{ ...S.btn, ...S.btnSolo, flex: 1, justifyContent: 'center', padding: '9px' }}
              onClick={async () => {
                const v = parseFloat(editBudget);
                if (!isNaN(v) && v > 0) {
                  setBudget(v);
                  setLocalBudgetCurrency(spendCurrency);
                  try {
                    const { updateTrip } = await import('../../api');
                    await updateTrip(trip.id, { budget: v, budgetCurrency: spendCurrency });
                    onTripUpdate?.({ budget: v, budgetCurrency: spendCurrency });
                  } catch (_) {}
                }
                setShowBudgetEdit(false);
              }}>
              ✓ Save
            </button>
            {budget && (
              <button style={{ ...S.btn, color: '#993C1D', borderColor: '#F5C4B3' }}
                onClick={async () => {
                  setBudget(null);
                  setLocalBudgetCurrency(null);
                  try {
                    const { updateTrip } = await import('../../api');
                    await updateTrip(trip.id, { budget: null, budgetCurrency: null });
                    onTripUpdate?.({ budget: null, budgetCurrency: null });
                  } catch (_) {}
                  setShowBudgetEdit(false);
                }}>Remove</button>
            )}
            <button style={S.btn} onClick={() => setShowBudgetEdit(false)}>✕</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderBottom: '1.5px solid rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
        {SECTION_TABS.map(t => {
          const tabIcons = {
            expenses: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
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
                <span style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2.5, borderRadius: '99px 99px 0 0', background: SOLO_ACCENT }} />
              )}
            </button>
          );
        })}
      </div>

      {section === 'expenses' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={() => setFilterCat('all')} style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, ...(filterCat === 'all' ? S.btnSolo : {}) }}>All</button>
            {expenseCats.filter(c => catTotals[c.id] > 0).map(c => (
              <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: filterCat === c.id ? c.bg : '#fff', color: filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') : '#6b6b68', border: `0.5px solid ${filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') + '44' : 'rgba(0,0,0,0.12)'}` }}>
                <CatIcon id={c.id} size={12} /><span>{c.label}</span>
              </button>
            ))}
          </div>
          {sortedFiltered.length === 0 && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b6b68', fontSize: 14 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg><p>No expenses yet. Add your first one!</p></div>}
          {sortedFiltered.map(exp => {
            const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
            const timeLabel = getExpenseTimeLabel(exp);
            const dateLabel = new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return (
              <div key={exp.id} style={{ background: '#fff', borderRadius: 16, marginBottom: 10, boxShadow: '0 2px 12px rgba(15,23,42,0.06)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, flexShrink: 0 }}><CatIcon id={cat.id} size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {cat.label}
                      {timeLabel ? ` · ${dateLabel}, ${timeLabel}` : ` · ${dateLabel}`}
                      {exp.note && <span style={{ fontStyle: 'italic', color: '#b0a8a0' }}> · {exp.note}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827' }}>{fmt(exp.amount)}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 5 }}>
                      <button onClick={() => handleEdit(exp)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, fontFamily: "'DM Sans',sans-serif" }}>✎</button>
                      <button onClick={() => handleDelete(exp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.75, fontFamily: "'DM Sans',sans-serif" }}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section === 'insights' && (
        <div style={{ paddingBottom: '5rem' }}>

          {/* stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Daily rate', value: fmt(tsr), sub: `${daysElapsed}/${days} days`, color: '#FF6A00', bg: '#FFF3EB' },
              { label: 'Projected', value: fmt(projected), sub: budget && projected > budget ? `+${fmtBudget(overBy)} over` : 'on track', color: budget && projected > budget ? '#D85B00' : '#FF8C3A', bg: budget && projected > budget ? '#FFF8F4' : '#FFF3EB' },
              { label: 'Top cat', value: topCatMeta?.label || '—', sub: fmt(topCat?.[1] || 0), color: '#6366f1', bg: '#EEF2FF' },
            ].map((s, idx) => (
              <div key={idx} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 14, padding: '11px 10px', textAlign: 'center', animation: `soloFadeUp .3s ease-out ${idx * 55}ms both` }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: s.color, marginTop: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Lumi mood card */}
          <div style={{ background: 'linear-gradient(135deg,#FFF3EB,#FFE9D9)', border: '1px solid rgba(255,106,0,0.18)', borderRadius: 20, marginBottom: 12, overflow: 'hidden', animation: 'soloFadeUp .38s ease-out 80ms both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <img src={lumi8Img} alt="Lumi" style={{ width: 78, height: 78, objectFit: 'contain', flexShrink: 0, marginLeft: 4 }} />
              <div style={{ flex: 1, padding: '14px 16px 14px 8px' }}>
                <div style={{ fontSize: 9, color: '#FF6A00', fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 5 }}>Solo money mood</div>
                <div style={{ fontSize: 13, color: '#7A2800', lineHeight: 1.6, fontWeight: 500 }}>{soloInsightLine}</div>
              </div>
            </div>
          </div>

          {/* Pace meter */}
          {budget && pacePct !== null && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .4s ease-out 120ms both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Pace meter</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: pacePct > 115 ? '#D85B00' : '#FF6A00', fontFamily: "'Sora',sans-serif" }}>{pacePct}% of plan</div>
              </div>
              <div style={{ height: 7, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${Math.min(pacePct, 100)}%`, borderRadius: 99, transition: 'width .6s cubic-bezier(.2,.8,.2,1)', background: pacePct > 115 ? 'linear-gradient(90deg,#D85B00,#FF6A00)' : 'linear-gradient(90deg,#FF6A00,#FF8C3A)' }} />
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(tsr)}/day actual · {fmtBudget(plannedDailyBudget)}/day planned</div>
            </div>
          )}

          {/* Budget health */}
          {budget && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .42s ease-out 150ms both' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Budget health</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Trip budget', value: fmtBudget(budget), color: '#374151' },
                  { label: 'Projected end', value: fmt(projected), color: projected > budget ? '#D85B00' : '#FF8C3A' },
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
                    <canvas ref={donutRef} role="img" aria-label={`${budgetPct}% of budget spent`}>{budgetPct}% used.</canvas>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <div style={{ padding: '9px 11px', background: projected > budget ? '#FFF8F4' : '#FFF3EB', border: `1px solid ${projected > budget ? '#FFCBA4' : '#FFD5A8'}`, borderRadius: 12, fontSize: 12, color: projected > budget ? '#D85B00' : '#FF6A00', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{projected > budget ? <><path d="M10.3 3.3L2 19h20L13.7 3.3a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> : <polyline points="20,6 9,17 4,12"/>}</svg>
                    {projected > budget ? `Over by ${fmtBudget(overBy)}` : `${fmtBudget(underBy)} under pace`}
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
                      <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: CAT_COLORS[c.id] || SOLO_ACCENT }}>{fmt(catTotals[c.id])}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', width: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: CAT_COLORS[c.id] || SOLO_ACCENT, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top expenses */}
          {top3.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '13px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', animation: 'soloFadeUp .46s ease-out 210ms both' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Top expenses</div>
              {top3.map((exp, idx) => {
                const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
                const pct = total > 0 ? Math.round((exp.amount / total) * 100) : 0;
                const rankColors = ['#FF6A00', '#D85B00', '#9ca3af'];
                return (
                  <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: idx < top3.length - 1 ? 10 : 0, borderBottom: idx < top3.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', marginBottom: idx < top3.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: rankColors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CatIcon id={cat.id} size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ height: 3, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[exp.cat] || SOLO_ACCENT, borderRadius: 99, transition: 'width .5s' }} />
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

        </div>
      )}

      {section === 'expenses' && (
        <button
          onClick={() => { setEditingExpenseId(null); setForm({ desc: '', amount: '', cat: 'food', date: todayStr, time: getNow().time, note: '' }); setShowForm(true); }}
          style={{ position: 'fixed', bottom: 88, right: 20, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', border: 'none', boxShadow: '0 4px 20px rgba(255,106,0,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 300, transition: 'transform .15s', fontWeight: 300 }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          +
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONTACTS PAGE
═══════════════════════════════════════════════════════ */
export default SoloExpensesPage;
