import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Trophy, Users, Shuffle,
  ArrowRight, ArrowLeft, AlertCircle, MapPin, Clock
} from 'lucide-react';
import { supabase } from './supabaseClient';

const GROUPS = {
  A: [
    { name: 'Brazil', flag: '🇧🇷' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Japan', flag: '🇯🇵' },
    { name: 'Nigeria', flag: '🇳🇬' },
  ],
  B: [
    { name: 'Argentina', flag: '🇦🇷' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'Mexico', flag: '🇲🇽' },
    { name: 'Ghana', flag: '🇬🇭' },
  ],
  C: [
    { name: 'USA', flag: '🇺🇸' },
    { name: 'Spain', flag: '🇪🇸' },
    { name: 'South Korea', flag: '🇰🇷' },
    { name: 'Senegal', flag: '🇸🇳' },
  ],
  D: [
    { name: 'Netherlands', flag: '🇳🇱' },
    { name: 'Portugal', flag: '🇵🇹' },
    { name: 'Morocco', flag: '🇲🇦' },
    { name: 'Colombia', flag: '🇨🇴' },
  ],
};

const ALL_COUNTRIES = Object.entries(GROUPS).flatMap(([g, list]) => list.map((c) => ({ ...c, group: g })));

const FEE_SOLO = 50;
const FEE_SQUAD = 550;

const SQUAD_STEPS = ['Squad Info', 'Players', 'Pick Country', 'Done'];
const SOLO_STEPS = ['Your Info', 'Done'];
const DISPLAY = { fontFamily: "'Cinzel', serif", letterSpacing: '0.04em' };
const BODY_FONT = { fontFamily: "'Jost', sans-serif" };

// A country only counts as "taken" once a squad registration for it has
// actually been marked paid. Unpaid registrations don't block others --
// the organizer resolves any overlap manually if two people pick the same
// country before either pays.
function getCountryStatus(countryName, regs) {
  const paidSquad = regs.find((r) => r.country === countryName && r.type === 'squad' && r.status === 'paid');
  if (paidSquad) return { status: 'taken', squadName: paidSquad.squad_name };

  const paidSoloCount = regs.filter((r) => r.country === countryName && r.type === 'solo' && r.status === 'paid').length;
  if (paidSoloCount >= 11) return { status: 'taken', squadName: null };
  if (paidSoloCount > 0) return { status: 'filling', count: paidSoloCount };

  const pendingCount = regs.filter((r) => r.country === countryName && r.status === 'awaiting_payment').length;
  if (pendingCount > 0) return { status: 'pending', count: pendingCount };

  return { status: 'open', count: 0 };
}

export default function App() {
  const [mode, setMode] = useState(null); // null | 'squad' | 'solo'
  const [step, setStep] = useState(1);
  const [registrations, setRegistrations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [squadForm, setSquadForm] = useState({ squadName: '', captainName: '', contact: '', email: '' });
  const [players, setPlayers] = useState(Array(11).fill(''));
  const [soloForm, setSoloForm] = useState({ playerName: '', contact: '', email: '' });
  const [chosenCountry, setChosenCountry] = useState(null); // { name, group }
  const [completedInfo, setCompletedInfo] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('id, type, squad_name, country, group_key, status')
        .order('registered_at', { ascending: true });
      if (error) throw error;
      setRegistrations(data || []);
    } catch (e) {
      setRegistrations([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Jost:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const updateSquadForm = (field, value) => setSquadForm((f) => ({ ...f, [field]: value }));
  const updateSoloForm = (field, value) => setSoloForm((f) => ({ ...f, [field]: value }));
  const updatePlayer = (i, value) => setPlayers((p) => p.map((v, idx) => (idx === i ? value : v)));

  const canContinueSquad1 =
    squadForm.squadName.trim() && squadForm.captainName.trim() && squadForm.contact.trim() && squadForm.email.trim();
  const canContinuePlayers = players.every((p) => p.trim().length > 0);
  const canContinueSolo1 = soloForm.playerName.trim() && soloForm.contact.trim() && soloForm.email.trim();

  const submitSquadRegistration = async (countryName, groupKey) => {
    setFormError('');
    setSubmitting(true);
    try {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.from('registrations').insert({
        id,
        type: 'squad',
        squad_name: squadForm.squadName.trim(),
        captain_name: squadForm.captainName.trim(),
        contact: squadForm.contact.trim(),
        email: squadForm.email.trim(),
        roster: 11,
        players: players.map((p) => p.trim()),
        country: countryName,
        group_key: groupKey,
        amount_paid: FEE_SQUAD,
        status: 'awaiting_payment',
      });
      if (error) throw error;
      setChosenCountry({ name: countryName, group: groupKey });
      setCompletedInfo({ ...squadForm });
      setStep(4);
      loadData();
    } catch (e) {
      setFormError('Could not save your registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSoloRegistration = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.from('registrations').insert({
        id,
        type: 'solo',
        player_name: soloForm.playerName.trim(),
        contact: soloForm.contact.trim(),
        email: soloForm.email.trim(),
        amount_paid: FEE_SOLO,
        status: 'awaiting_payment',
      });
      if (error) throw error;
      setCompletedInfo({ ...soloForm });
      setStep(2);
      loadData();
    } catch (e) {
      setFormError('Could not save your registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setMode(null);
    setStep(1);
    setSquadForm({ squadName: '', captainName: '', contact: '', email: '' });
    setPlayers(Array(11).fill(''));
    setSoloForm({ playerName: '', contact: '', email: '' });
    setChosenCountry(null);
    setCompletedInfo(null);
    setFormError('');
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C0C0E]">
        <div className="text-[#D4AF37]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0C0E]" style={BODY_FONT}>
      <header className="bg-gradient-to-b from-[#17171B] to-[#0C0C0E] text-[#F6F1E4] px-4 py-6 sm:px-8 border-b border-[#D4AF37]/30">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-[#F2D879] text-xs font-semibold uppercase tracking-widest mb-2">
            <Trophy size={14} /> Summer World Cup
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F2D879]" style={DISPLAY}>Squad Registration</h1>
          <p className="text-[#F6F1E4]/70 text-sm mt-1">
            $50 per player · 7v7 · 11-player squads · 4 groups of 4 · $3,000 grand prize
          </p>
          <div className="flex items-start gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-lg p-3 mt-4 text-xs text-[#F6F1E4]/70">
            <Clock size={14} className="mt-0.5 shrink-0" />
            <span>This registers your info and country pick. Payment is handled separately — we'll reach out with payment details after you submit.</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
        {mode === null && (
          <ChoiceScreen onChoose={(m) => { setMode(m); setStep(1); setFormError(''); }} />
        )}
        {mode === 'squad' && (
          <SquadFlow
            step={step}
            setStep={setStep}
            form={squadForm}
            updateForm={updateSquadForm}
            canContinue={canContinueSquad1}
            players={players}
            updatePlayer={updatePlayer}
            canContinuePlayers={canContinuePlayers}
            registrations={registrations}
            formError={formError}
            submitting={submitting}
            onSubmit={submitSquadRegistration}
            chosenCountry={chosenCountry}
            completedInfo={completedInfo}
            onBack={resetAll}
          />
        )}
        {mode === 'solo' && (
          <SoloFlow
            step={step}
            form={soloForm}
            updateForm={updateSoloForm}
            canContinue={canContinueSolo1}
            formError={formError}
            submitting={submitting}
            onSubmit={submitSoloRegistration}
            completedInfo={completedInfo}
            onBack={resetAll}
          />
        )}
      </main>
    </div>
  );
}

function Stepper({ step, steps }) {
  return (
    <div className="flex items-center justify-between mb-6 gap-1">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex-1 flex flex-col items-center text-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                done ? 'bg-[#D4AF37] text-[#0C0C0E]' : active ? 'bg-[#F2D879] text-[#0C0C0E]' : 'bg-[#17171B] text-[#F6F1E4]/40 border border-[#D4AF37]/20'
              }`}
            >
              {done ? <CheckCircle2 size={14} /> : n}
            </div>
            <span className={`text-[10px] ${active ? 'text-[#D4AF37] font-semibold' : 'text-[#F6F1E4]/40'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceScreen({ onChoose }) {
  return (
    <div className="bg-[#17171B] rounded-2xl shadow-sm border border-[#D4AF37]/30 p-5 sm:p-8 space-y-4">
      <h2 className="text-lg font-bold text-[#F2D879] text-center" style={DISPLAY}>Have you already built your squad?</h2>
      <button
        onClick={() => onChoose('squad')}
        className="w-full flex items-start gap-3 text-left border border-[#D4AF37]/25 rounded-xl p-4 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition"
      >
        <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
          <Users size={20} />
        </div>
        <div>
          <p className="font-bold text-[#F6F1E4]">Yes — I have a full squad</p>
          <p className="text-sm text-[#F6F1E4]/60 mt-1">
            As captain, list your 11 players and pick your country. Entry is $550 total ($50 × 11 players) — payment details follow after you submit.
          </p>
        </div>
      </button>
      <button
        onClick={() => onChoose('solo')}
        className="w-full flex items-start gap-3 text-left border border-[#D4AF37]/25 rounded-xl p-4 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition"
      >
        <div className="w-10 h-10 rounded-lg bg-[#5C1A1A]/40 text-[#F2D879] flex items-center justify-center shrink-0">
          <Shuffle size={20} />
        </div>
        <div>
          <p className="font-bold text-[#F6F1E4]">No — I'm playing solo</p>
          <p className="text-sm text-[#F6F1E4]/60 mt-1">
            Don't have a squad yet? Submit your info for $50 and we'll place you on a team — payment details follow after you submit.
          </p>
        </div>
      </button>
    </div>
  );
}

function SquadFlow({
  step, setStep, form, updateForm, canContinue, players, updatePlayer, canContinuePlayers,
  registrations, formError, submitting, onSubmit, chosenCountry, completedInfo, onBack,
}) {
  return (
    <div className="bg-[#17171B] rounded-2xl shadow-sm border border-[#D4AF37]/30 p-5 sm:p-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-[#F6F1E4]/40 hover:text-[#F6F1E4]/70 mb-4">
        <ArrowLeft size={12} /> Change registration type
      </button>
      <Stepper step={step} steps={SQUAD_STEPS} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
            <Users size={18} />
            <h2 className="font-bold text-lg" style={DISPLAY}>Squad Information</h2>
          </div>
          {formError && (
            <div className="flex items-start gap-2 bg-[#5C1A1A]/30 border border-[#5C1A1A] text-[#F2D879] text-sm rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Squad name</label>
            <input
              value={form.squadName}
              onChange={(e) => updateForm('squadName', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="e.g. The Backyard Ballers"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Captain name</label>
            <input
              value={form.captainName}
              onChange={(e) => updateForm('captainName', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Captain phone</label>
            <input
              value={form.contact}
              onChange={(e) => updateForm('contact', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Captain email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="you@email.com"
            />
            <p className="text-xs text-[#F6F1E4]/40 mt-1">We'll send payment details and your confirmation here.</p>
          </div>
          <button
            disabled={!canContinue}
            onClick={() => setStep(2)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              canContinue ? 'bg-[#D4AF37] text-[#0C0C0E] hover:bg-[#F2D879]' : 'bg-[#0C0C0E] text-[#F6F1E4]/30 cursor-not-allowed border border-[#D4AF37]/15'
            }`}
          >
            Continue to Players <ArrowRight size={16} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
            <Users size={18} />
            <h2 className="font-bold text-lg" style={DISPLAY}>List Your 11 Players</h2>
          </div>
          <p className="text-sm text-[#F6F1E4]/60">Enter the full name of every player on your squad, including yourself.</p>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-xs text-[#F6F1E4]/40 text-right shrink-0">{i + 1}.</span>
                <input
                  value={p}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  placeholder={`Player ${i + 1} full name`}
                />
              </div>
            ))}
          </div>
          <button
            disabled={!canContinuePlayers}
            onClick={() => setStep(3)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              canContinuePlayers ? 'bg-[#D4AF37] text-[#0C0C0E] hover:bg-[#F2D879]' : 'bg-[#0C0C0E] text-[#F6F1E4]/30 cursor-not-allowed border border-[#D4AF37]/15'
            }`}
          >
            Continue to Country Pick <ArrowRight size={16} />
          </button>
          <button onClick={() => setStep(1)} className="w-full flex items-center justify-center gap-2 text-sm text-[#F6F1E4]/50 hover:text-[#F6F1E4]/80">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
            <MapPin size={18} />
            <h2 className="font-bold text-lg" style={DISPLAY}>Pick Your Country</h2>
          </div>
          <p className="text-sm text-[#F6F1E4]/60">
            Pick any country not already confirmed by a paid squad. If someone else also picks this country before paying, the organizer resolves it manually — paying first secures it.
          </p>
          {formError && (
            <div className="flex items-start gap-2 bg-[#5C1A1A]/30 border border-[#5C1A1A] text-[#F2D879] text-sm rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          <div className="space-y-4">
            {Object.entries(GROUPS).map(([groupKey, countries]) => (
              <div key={groupKey}>
                <div className="text-xs font-bold uppercase tracking-wider text-[#F6F1E4]/40 mb-2">Group {groupKey}</div>
                <div className="grid grid-cols-2 gap-2">
                  {countries.map((c) => {
                    const st = getCountryStatus(c.name, registrations);
                    const open = st.status !== 'taken';
                    let tag = null;
                    if (st.status === 'taken') tag = 'Taken';
                    if (st.status === 'pending') tag = `${st.count} pending`;
                    if (st.status === 'filling') tag = `${st.count}/11 solo`;
                    return (
                      <button
                        key={c.name}
                        disabled={!open || submitting}
                        onClick={() => onSubmit(c.name, groupKey)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition ${
                          open
                            ? 'border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#F6F1E4]'
                            : 'border-[#F6F1E4]/10 bg-[#0C0C0E] text-[#F6F1E4]/30 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="font-medium">{c.name}</span>
                        {tag && <span className="ml-auto text-xs uppercase font-semibold text-[#F6F1E4]/40">{tag}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {submitting && <p className="text-sm text-[#F6F1E4]/50 text-center">Saving your registration…</p>}
        </div>
      )}

      {step === 4 && chosenCountry && completedInfo && (
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
              <CheckCircle2 className="text-[#D4AF37]" size={28} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#F2D879]" style={DISPLAY}>Registration submitted!</h2>
          <p className="text-[#F6F1E4]/60 text-sm">
            <span className="font-semibold text-[#F6F1E4]">{completedInfo.squadName}</span> has requested{' '}
            <span className="font-semibold text-[#F6F1E4]">{chosenCountry.name}</span> in Group {chosenCountry.group}.
          </p>
          <div className="bg-[#0C0C0E] border border-[#D4AF37]/25 rounded-lg p-4 text-sm text-left max-w-xs mx-auto space-y-1">
            <div className="flex justify-between"><span className="text-[#F6F1E4]/50">Captain</span><span className="font-medium text-[#F6F1E4]">{completedInfo.captainName}</span></div>
            <div className="flex justify-between"><span className="text-[#F6F1E4]/50">Email</span><span className="font-medium text-[#F6F1E4]">{completedInfo.email}</span></div>
            <div className="flex justify-between"><span className="text-[#F6F1E4]/50">Total due</span><span className="font-medium text-[#F6F1E4]">${FEE_SQUAD}.00</span></div>
          </div>
          <p className="text-sm text-[#F6F1E4]/60">
            We'll reach out to <span className="font-semibold text-[#F6F1E4]">{completedInfo.email}</span> with payment details. Your country pick is reserved but not final until payment is confirmed.
          </p>
          <button onClick={onBack} className="inline-flex items-center gap-2 mt-2 text-sm font-semibold text-[#D4AF37] hover:text-[#F2D879]">
            Register another squad
          </button>
        </div>
      )}
    </div>
  );
}

function SoloFlow({ step, form, updateForm, canContinue, formError, submitting, onSubmit, completedInfo, onBack }) {
  return (
    <div className="bg-[#17171B] rounded-2xl shadow-sm border border-[#D4AF37]/30 p-5 sm:p-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-[#F6F1E4]/40 hover:text-[#F6F1E4]/70 mb-4">
        <ArrowLeft size={12} /> Change registration type
      </button>
      <Stepper step={step} steps={SOLO_STEPS} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
            <Shuffle size={18} />
            <h2 className="font-bold text-lg" style={DISPLAY}>Your Info</h2>
          </div>
          <p className="text-sm text-[#F6F1E4]/60">
            We'll place you on a squad that still needs players once your registration and payment are confirmed.
          </p>
          {formError && (
            <div className="flex items-start gap-2 bg-[#5C1A1A]/30 border border-[#5C1A1A] text-[#F2D879] text-sm rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Your name</label>
            <input
              value={form.playerName}
              onChange={(e) => updateForm('playerName', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Phone</label>
            <input
              value={form.contact}
              onChange={(e) => updateForm('contact', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F6F1E4]/80 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="you@email.com"
            />
            <p className="text-xs text-[#F6F1E4]/40 mt-1">We'll send payment details and your confirmation here.</p>
          </div>
          <button
            disabled={!canContinue || submitting}
            onClick={onSubmit}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              canContinue && !submitting ? 'bg-[#D4AF37] text-[#0C0C0E] hover:bg-[#F2D879]' : 'bg-[#0C0C0E] text-[#F6F1E4]/30 cursor-not-allowed border border-[#D4AF37]/15'
            }`}
          >
            {submitting ? 'Saving…' : 'Submit Registration'} {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      )}

      {step === 2 && completedInfo && (
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
              <CheckCircle2 className="text-[#D4AF37]" size={28} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#F2D879]" style={DISPLAY}>Registration submitted!</h2>
          <p className="text-[#F6F1E4]/60 text-sm">
            <span className="font-semibold text-[#F6F1E4]">{completedInfo.playerName}</span>, you're on the list.
          </p>
          <div className="bg-[#0C0C0E] border border-[#D4AF37]/25 rounded-lg p-4 text-sm text-left max-w-xs mx-auto space-y-1">
            <div className="flex justify-between"><span className="text-[#F6F1E4]/50">Email</span><span className="font-medium text-[#F6F1E4]">{completedInfo.email}</span></div>
            <div className="flex justify-between"><span className="text-[#F6F1E4]/50">Total due</span><span className="font-medium text-[#F6F1E4]">${FEE_SOLO}.00</span></div>
          </div>
          <p className="text-sm text-[#F6F1E4]/60">
            We'll reach out to <span className="font-semibold text-[#F6F1E4]">{completedInfo.email}</span> with payment details, then confirm your team placement once payment is received.
          </p>
          <button onClick={onBack} className="inline-flex items-center gap-2 mt-2 text-sm font-semibold text-[#D4AF37] hover:text-[#F2D879]">
            Register another
          </button>
        </div>
      )}
    </div>
  );
}
