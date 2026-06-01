import { useState, useRef, useEffect, useMemo } from 'react';
import { addExpense, updateExpense, deleteExpense } from '../../api';
import { CATS, tripDuration } from '../shared/constants';
import { S } from '../shared/styles';
function SoloExpensesPage({ trip, myNickname, onTripUpdate }) {
  const [expenses, setExpenses] = useState(trip.expenses || []);
  const [budget, setBudget] = useState(trip.budget || null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [editBudget, setEditBudget] = useState(String(budget || ''));
  const [filterCat, setFilterCat] = useState('all');
  const [section, setSection] = useState('expenses');
  const [saving, setSaving] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const getNow = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
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

  const soloFunLines = [];
  if (expenses.length === 0) {
    soloFunLines.push('No expenses yet. Your wallet currently thinks this is a spiritual retreat.');
  } else {
    if (daysElapsed >= 2) {
      soloFunLines.push(`Current TSR is ₹${Math.round(tsr).toLocaleString('en-IN')}/day across ${daysElapsed} day${daysElapsed > 1 ? 's' : ''}.`);
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
      soloFunLines.push(`If this pace continues, you may overshoot by ₹${Math.round(projected - budget).toLocaleString('en-IN')}.`);
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
    if (typeof exp.date === 'string' && !exp.date.includes('T00:00:00.000Z')) {
      const d = new Date(exp.date);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
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
        date: form.time ? `${form.date}T${form.time}:00` : form.date,
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
      date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : getNow().date,
      time: exp.time || getExpenseTimeLabel(exp) || getNow().time,
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
  const SOLO_ACCENT = '#534AB7';
  const SOLO_ACCENT_2 = '#7F77DD';
  const SOLO_ACCENT_BG = '#EEEDFE';
  const SOLO_ACCENT_BORDER = '#AFA9EC';
  const SOLO_ACCENT_TEXT = '#26215C';
  const SOLO_WARN = '#D85A30';
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
                  ? ` Spent: ₹${Math.round(Math.min(total, budget)).toLocaleString('en-IN')}`
                  : ` Left: ₹${Math.round(Math.max(0, budget - total)).toLocaleString('en-IN')}`,
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
            tooltip: { callbacks: { label: ctx => ` ₹${Math.round(ctx.raw).toLocaleString('en-IN')}` } },
          },
          scales: {
            x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
            y: { ticks: { color: textColor, font: { size: 11 }, callback: v => `₹${v >= 1000 ? Math.round(v / 1000) + 'k' : v}` }, grid: { color: gridColor }, border: { display: false } },
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
        <div style={{ background: 'linear-gradient(135deg,#534AB7,#7F77DD)', padding: '2rem 1.5rem 2.5rem', textAlign: 'center' }}>
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
        @keyframes soloFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ background: 'linear-gradient(135deg,#26215C,#534AB7 48%,#7F77DD)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -18, right: -18, fontSize: 84, opacity: 0.08 }}>💸</div>
        <div style={{ position: 'absolute', left: -40, bottom: -48, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 4 }}>Total Spent</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 700, color: '#fff' }}>₹{Math.round(total).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>₹{Math.round(tsr).toLocaleString('en-IN')}/day TSR · {expenses.length} entries</div>
          </div>
          {budget && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', marginBottom: 4 }}>Budget Left</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: budgetLeft < 0 ? '#FFD3C4' : '#DAD7FF' }}>
                {budgetLeft < 0 ? '-' : ''}₹{Math.abs(Math.round(budgetLeft)).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>of ₹{budget.toLocaleString('en-IN')}</div>
            </div>
          )}
        </div>
        {budget && (() => {
          const budgetEmoji = budgetPct <= 25 ? '😎' : budgetPct <= 50 ? '🙂' : budgetPct <= 70 ? '😐' : budgetPct <= 85 ? '😬' : budgetPct <= 95 ? '😰' : '🤯';
          const budgetMsg = budgetPct <= 25 ? 'Crushing it!' : budgetPct <= 50 ? 'Looking good' : budgetPct <= 70 ? 'Keep an eye' : budgetPct <= 85 ? 'Getting close' : budgetPct <= 95 ? 'Almost gone!' : 'Budget blown!';
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22, lineHeight: 1, transition: 'all .4s', filter: budgetPct > 85 ? 'drop-shadow(0 0 4px rgba(255,150,80,0.6))' : 'none' }}>{budgetEmoji}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{budgetMsg}</span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${budgetPct}%`, background: budgetPct > 85 ? '#FFD3C4' : '#DAD7FF', transition: 'width .6s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                <span>{budgetPct}% used</span><span>{100 - budgetPct}% remaining</span>
              </div>
            </div>
          );
        })()}
        {!budget && (
          <button onClick={() => setShowBudgetEdit(true)} style={{ ...S.btn, background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(255,255,255,0.26)', fontSize: 12, marginTop: 8 }}>
            + Set a budget
          </button>
        )}
        {budget && (
          <button onClick={() => { setEditBudget(String(budget)); setShowBudgetEdit(true); }} style={{ ...S.btn, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.2)', fontSize: 11, marginTop: 8 }}>
            ✏️ Edit budget
          </button>
        )}
      </div>

      {showBudgetEdit && (
        <div style={{ ...S.card, border: `0.5px solid ${SOLO_ACCENT_BORDER}`, background: '#f9fffe', marginBottom: '1rem' }}>
          <label style={S.label}>Total trip budget ₹</label>
          <input style={S.input} type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)} placeholder="e.g. 15000" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              style={{ ...S.btn, ...S.btnSolo, flex: 1, justifyContent: 'center', padding: '9px' }}
              onClick={async () => {
                const v = parseFloat(editBudget);
                if (!isNaN(v) && v > 0) {
                  setBudget(v);
                  try {
                    const { updateTrip } = await import('../../api');
                    await updateTrip(trip.id, { budget: v });
                    onTripUpdate?.({ budget: v });
                  } catch (_) {}
                }
                setShowBudgetEdit(false);
              }}>
              ✓ Save
            </button>
            <button style={S.btn} onClick={() => setShowBudgetEdit(false)}>✕</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 13, padding: 3, flex: 1 }}>
          {SECTION_TABS.map(t => (
            <button key={t.id} onClick={() => setSection(t.id)}
              style={{ flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: section === t.id ? 600 : 400, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: section === t.id ? `linear-gradient(135deg,${SOLO_ACCENT_2},${SOLO_ACCENT})` : 'transparent', color: section === t.id ? '#fff' : '#6b6b68', transition: 'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'expenses' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={() => setFilterCat('all')} style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, ...(filterCat === 'all' ? S.btnSolo : {}) }}>All</button>
            {expenseCats.filter(c => catTotals[c.id] > 0).map(c => (
              <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: filterCat === c.id ? c.bg : '#fff', color: filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') : '#6b6b68', border: `0.5px solid ${filterCat === c.id ? (CAT_COLORS[c.id] || '#6b6b68') + '44' : 'rgba(0,0,0,0.12)'}` }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          {sortedFiltered.length === 0 && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b6b68', fontSize: 14 }}><div style={{ fontSize: 40, marginBottom: 10 }}>📝</div><p>No expenses yet. Add your first one!</p></div>}
          {sortedFiltered.map(exp => {
            const cat = expenseCats.find(c => c.id === exp.cat) || { id: 'other', icon: '🏷️', label: 'Other', bg: '#F1EFE8' };
            const timeLabel = getExpenseTimeLabel(exp);
            return (
              <div key={exp.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, flexShrink: 0, fontSize: 18 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{exp.desc}</div>
                  <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 2 }}>
                    {cat.label} · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {timeLabel && <span> · {timeLabel}</span>}
                    {exp.note && <span style={{ fontStyle: 'italic' }}> · {exp.note}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700 }}>₹{exp.amount.toLocaleString('en-IN')}</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => handleEdit(exp)} style={{ ...S.btn, padding: '2px 7px', fontSize: 11, color: '#6b6b68', borderColor: 'transparent', background: 'transparent' }}>✎</button>
                    <button onClick={() => handleDelete(exp.id)} style={{ ...S.btn, padding: '2px 7px', fontSize: 11, color: '#a8a8a5', borderColor: 'transparent', background: 'transparent' }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section === 'insights' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'TSR/day', value: `₹${Math.round(tsr).toLocaleString('en-IN')}`, sub: `${daysElapsed}/${days} days elapsed` },
              { label: 'Projected', value: `₹${projected.toLocaleString('en-IN')}`, sub: budget && projected > budget ? 'above budget pace' : 'on current pace', warn: budget && projected > budget },
              { label: 'Top cat', value: topCatMeta?.label || '—', sub: `₹${Math.round(topCat?.[1] || 0).toLocaleString('en-IN')}` },
            ].map((s, idx) => (
              <div key={s.label} style={{ background: s.warn ? '#FAECE7' : '#f7f6f2', borderRadius: 12, padding: '10px 12px', border: s.warn ? '0.5px solid #F5C4B3' : 'none', animation: 'soloFadeUp .35s ease-out both', animationDelay: `${idx * 55}ms` }}>
                <div style={{ fontSize: 11, color: s.warn ? '#993C1D' : '#6b6b68', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: s.warn ? '#993C1D' : '#1a1a18' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.warn ? '#D85A30' : '#a8a8a5', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, marginBottom: 10, background: 'linear-gradient(135deg,#EEEDFE,#F3F2FF)', border: `0.5px solid ${SOLO_ACCENT_BORDER}`, position: 'relative', overflow: 'hidden', animation: 'soloFadeUp .4s ease-out both', animationDelay: '120ms' }}>
            <div style={{ position: 'absolute', right: 10, top: 6, fontSize: 26, opacity: 0.3 }}>🎒</div>
            <div style={{ fontSize: 11, color: SOLO_ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, fontWeight: 700 }}>Solo money mood</div>
            <div style={{ fontSize: 14, color: SOLO_ACCENT_TEXT, lineHeight: 1.55, paddingRight: 20 }}>{soloInsightLine}</div>
          </div>

          {budget && pacePct !== null && (
            <div style={{ ...S.card, marginBottom: 10, background: 'linear-gradient(135deg,#F8FFF9,#F1FFFA)' }}>
              <div style={{ fontSize: 11, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, fontWeight: 700 }}>Pace Meter</div>
              <div style={{ fontSize: 14, color: '#1a1a18', lineHeight: 1.5 }}>
                {pacePct <= 95 && `🧘 Nice control. You're at ${pacePct}% of planned daily budget pace.`}
                {pacePct > 95 && pacePct <= 115 && `⚖️ Balanced pace. You're running at ${pacePct}% of planned daily budget pace.`}
                {pacePct > 115 && `🔥 High-burn mode. You're at ${pacePct}% of planned daily budget pace.`}
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
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: projected > budget ? '#993C1D' : SOLO_ACCENT }}>₹{Math.round(projected).toLocaleString('en-IN')}</div>
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
                  <div style={{ padding: '10px 11px', background: projected > budget ? '#FAECE7' : SOLO_ACCENT_BG, border: `0.5px solid ${projected > budget ? '#F5C4B3' : SOLO_ACCENT_BORDER}`, borderRadius: 10, fontSize: 12, color: projected > budget ? '#993C1D' : SOLO_ACCENT_TEXT, lineHeight: 1.45 }}>
                    {projected > budget ? `⚠️ Over by ₹${Math.round(overBy).toLocaleString('en-IN')}` : `✅ ₹${Math.round(underBy).toLocaleString('en-IN')} under pace`}
                  </div>
                  <div style={{ height: 7, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${budgetPct}%`, background: budgetPct > 85 ? SOLO_WARN : SOLO_ACCENT_2, transition: 'width .6s' }} />
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
                          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: CAT_COLORS[c.id] || '#534AB7' }}>₹{Math.round(catTotals[c.id]).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: CAT_COLORS[c.id] || '#7F77DD', transition: 'width .5s' }} />
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
                const pct = total > 0 ? Math.round((exp.amount / total) * 100) : 0;
                return (
                  <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: idx < top3.length - 1 ? '0 0 10px' : 0, borderBottom: idx < top3.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', marginBottom: idx < top3.length - 1 ? 10 : 0, animation: 'soloFadeUp .32s ease-out both', animationDelay: `${320 + idx * 45}ms` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{['🥇','🥈','🥉'][idx]}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cat.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                      <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2 }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[exp.cat] || '#7F77DD', borderRadius: 4 }} />
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
        </div>
      )}

      {section === 'expenses' && (
        <button
          onClick={() => { setEditingExpenseId(null); setForm({ desc: '', amount: '', cat: 'food', date: todayStr, time: getNow().time, note: '' }); setShowForm(true); }}
          style={{ position: 'fixed', bottom: 24, right: 20, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#7F77DD,#534AB7)', border: 'none', boxShadow: '0 4px 20px rgba(127,119,221,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 300, transition: 'transform .15s', fontWeight: 300 }}
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
