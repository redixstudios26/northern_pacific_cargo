'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  Activity, Airplay, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen,
  Box, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign,
  ClipboardList, Clock3, CloudSun, Compass, FileBarChart, Fuel, Gauge, HelpCircle,
  LayoutDashboard, LifeBuoy, Map, Menu, MoreHorizontal, Package, Plane, Plus,
  Search, Settings2, ShieldCheck, Snowflake, Truck, Users, Wrench, X,
} from 'lucide-react';

const nav = [
  { group: 'OPERATIONS', items: [
    { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Flight Operations', icon: Plane },
    { label: 'Dispatch', icon: ClipboardList }, { label: 'Pilots', icon: Users },
  ] },
  { group: 'RESOURCES', items: [
    { label: 'Fleet', icon: Airplay }, { label: 'Routes', icon: Map }, { label: 'Cargo Contracts', icon: Package },
  ] },
  { group: 'ADMINISTRATION', items: [
    { label: 'Accounting', icon: CircleDollarSign }, { label: 'Maintenance', icon: Wrench }, { label: 'Reports', icon: FileBarChart },
  ] },
];

const initialFlights = [
  { callsign: 'NPC 101', route: 'CZST → CYXT', city: 'Terrace', aircraft: 'C-FNPC', time: '08:30', cargo: 'Mail · 142 kg', status: 'Planned', color: 'blue' },
  { callsign: 'NPC 204', route: 'CZST → CYPR', city: 'Prince Rupert', aircraft: 'C-FNPC', time: '11:15', cargo: 'Freight · 286 kg', status: 'Awaiting dispatch', color: 'amber' },
  { callsign: 'NPC 318', route: 'CZST → CYXJ', city: 'Fort St. John', aircraft: 'C-FNPC', time: '14:00', cargo: 'Express · 94 kg', status: 'Draft', color: 'slate' },
];

type FlightPlanRow = {
  id: string;
  callsign: string;
  origin: string;
  destination: string | null;
  departure_at: string | null;
  cargo_description: string | null;
  status: 'draft' | 'planned' | 'awaiting_dispatch';
};

function toFlight(row: FlightPlanRow) {
  const statusLabel = row.status === 'awaiting_dispatch' ? 'Awaiting dispatch' : row.status === 'planned' ? 'Planned' : 'Draft';
  const departure = row.departure_at ? new Date(row.departure_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Vancouver' }) : 'Unscheduled';
  return {
    callsign: row.callsign,
    route: `${row.origin} → ${row.destination ?? 'TBD'}`,
    city: row.destination ?? 'Route not assigned',
    aircraft: 'Unassigned',
    time: departure,
    cargo: row.cargo_description ?? 'Cargo not assigned',
    status: statusLabel,
    color: row.status === 'planned' ? 'blue' : row.status === 'awaiting_dispatch' ? 'amber' : 'slate',
  };
}

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

const modules: Record<string, { eyebrow: string; title: string; description: string; icon: typeof Plane; cards: string[] }> = {
  'Flight Operations': { eyebrow: 'OPERATIONS', title: 'Flight operations', description: 'Track planned departures, flight readiness and operational activity.', icon: Plane, cards: ['Operational flights', 'Departure board', 'Recent activity'] },
  Dispatch: { eyebrow: 'OPERATIONS', title: 'Dispatch center', description: 'Prepare flight releases, assign cargo and coordinate aircraft readiness.', icon: ClipboardList, cards: ['Dispatch queue', 'Weather & notices', 'Release checklist'] },
  Pilots: { eyebrow: 'PEOPLE', title: 'Pilot roster', description: 'Manage crew profiles, qualifications and upcoming availability.', icon: Users, cards: ['Active pilots', 'Qualifications', 'Availability'] },
  Fleet: { eyebrow: 'RESOURCES', title: 'Aircraft fleet', description: 'Review aircraft configuration, readiness and maintenance records.', icon: Airplay, cards: ['Aircraft', 'Readiness', 'Maintenance status'] },
  Routes: { eyebrow: 'NETWORK', title: 'Route network', description: 'Plan regional cargo connections from the Stewart, BC home base.', icon: Map, cards: ['Active routes', 'Route planning', 'Station directory'] },
  'Cargo Contracts': { eyebrow: 'COMMERCIAL', title: 'Cargo contracts', description: 'Organize customer agreements, service levels and shipment details.', icon: Package, cards: ['Contracts', 'Shipment planning', 'Customer directory'] },
  Accounting: { eyebrow: 'ADMINISTRATION', title: 'Accounting', description: 'A prepared workspace for reconciled operational finances.', icon: CircleDollarSign, cards: ['Ledger', 'Invoices', 'Reconciliation'] },
  Maintenance: { eyebrow: 'AIRWORTHINESS', title: 'Maintenance control', description: 'Track inspections, defects and scheduled aircraft maintenance.', icon: Wrench, cards: ['Aircraft status', 'Scheduled items', 'Open defects'] },
  Reports: { eyebrow: 'INSIGHTS', title: 'Reports & analytics', description: 'Review operational summaries once connected data is available.', icon: FileBarChart, cards: ['Operations', 'Fleet utilization', 'Cargo volumes'] },
};

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState('Dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All flights');
  const [flights, setFlights] = useState(initialFlights);
  const [notice, setNotice] = useState('');
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [newCallsign, setNewCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setAuthReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      setFlights(initialFlights);
      return;
    }
    let active = true;
    setFlights([]);
    supabase.from('npc_flight_plans').select('id,callsign,origin,destination,departure_at,cargo_description,status').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setNotice('Could not load saved flight plans. Confirm the database migration has been applied.');
          return;
        }
        setFlights((data ?? []).map((row) => toFlight(row as FlightPlanRow)));
      });
    return () => { active = false; };
  }, [supabase, session]);

  const filtered = useMemo(() => flights.filter((f) => {
    const text = `${f.callsign} ${f.route} ${f.city} ${f.cargo}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === 'All flights' || f.status === statusFilter);
  }), [flights, query, statusFilter]);

  async function addDraft() {
    const callsign = newCallsign.trim().toUpperCase();
    if (!callsign) return;
    if (supabase && !session) {
      setShowFlightForm(false);
      setShowSignIn(true);
      setNotice('Sign in with email to save flight plans to your workspace.');
      return;
    }
    if (supabase && session) {
      setSaving(true);
      const { data, error } = await supabase.from('npc_flight_plans').insert({ callsign }).select('id,callsign,origin,destination,departure_at,cargo_description,status').single();
      setSaving(false);
      if (error) {
        setNotice('Flight plan was not saved. Confirm the database migration is applied and try again.');
        return;
      }
      setFlights((current) => [toFlight(data as FlightPlanRow), ...current]);
      setNewCallsign(''); setShowFlightForm(false); setNotice(`${callsign} saved to Supabase.`);
      return;
    }
    setFlights((current) => [...current, { callsign, route: 'CZST → TBD', city: 'Route not assigned', aircraft: 'Unassigned', time: 'Unscheduled', cargo: 'Cargo not assigned', status: 'Draft', color: 'slate' }]);
    setNewCallsign(''); setShowFlightForm(false); setNotice(`${callsign} added as a local draft.`);
  }

  async function sendSignInLink() {
    if (!supabase || !email.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setSaving(false);
    if (error) { setNotice('Could not send the sign-in link. Check the address and Supabase Auth email settings.'); return; }
    setShowSignIn(false);
    setNotice('Check your email for a secure sign-in link.');
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setNotice(error ? 'Could not sign out. Please try again.' : 'Signed out. The dashboard is showing starter data.');
  }

  const module = modules[active];
  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Plane size={21} fill="currentColor" /></div><div><strong>NORTHERN PACIFIC</strong><span>CARGO OPERATIONS</span></div><button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="base-card"><div className="base-icon"><Map size={17} /></div><div><span>HOME BASE</span><strong>Stewart, BC <i className="online-dot" /></strong><small>CZST · Pacific Time</small></div><ChevronDown size={15} className="base-chevron" /></div>
      <nav className="navigation" aria-label="Main navigation">
        {nav.map((section) => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActive(label); setMobileNav(false); }} className={`nav-link ${active === label ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Dispatch' && <span className="nav-count">{session ? flights.length : '3'}</span>}</button>)}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-status"><div className="status-head"><Activity size={15}/><span>OPERATIONS STATUS</span><span className="live-pulse" /></div><strong>{session ? 'Supabase session active' : 'Ready for planning'}</strong><small>{session ? 'Flight plans sync to your account' : supabaseConfigured ? 'Sign in to save flight plans' : 'Connect your data to go live'}</small><div className="status-progress"><i /></div></div><button className="nav-link" onClick={() => setNotice('Help resources will be available when your workspace is connected.')}><HelpCircle size={17}/><span>Help center</span></button><button className="user-profile" onClick={() => session ? signOut() : setShowSignIn(true)}><div className="avatar">NP</div><span><strong>{session?.user.email ?? 'Operations team'}</strong><small>{session ? 'Signed in · flight plans sync' : supabaseConfigured ? 'Sign in to save flight plans' : 'Workspace administrator'}</small></span><MoreHorizontal size={19}/></button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><button className="menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button><span>NPC Operations</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="top-actions">{supabase && <button className="auth-button" onClick={() => session ? signOut() : setShowSignIn(true)} disabled={!authReady}>{session ? 'Sign out' : authReady ? 'Sign in to sync' : 'Checking…'}</button>}<span className="demo-chip"><span /> {session ? 'CONNECTED WORKSPACE' : 'DEMO WORKSPACE'}</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up. Notifications will appear here when connected.')}><Bell size={18}/><i /></button><div className="top-divider"/><div className="date-label"><CalendarDays size={15}/><span>Tuesday, Nov 17</span></div><button className="top-avatar" aria-label="Profile" onClick={() => session ? signOut() : setShowSignIn(true)}>NP</button></div></header>
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}

      <div className="page-wrap">
        {!module ? <>
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> TUESDAY, NOVEMBER 17, 2026 <span className="weather-label"><CloudSun size={14}/> Weather · not connected</span></div><h1>Good morning, team <span className="wave">✳</span></h1><p className="welcome-copy">Here’s your operational overview for Northern Pacific Cargo.</p></div><button className="primary-button" onClick={() => { setActive('Dispatch'); setShowFlightForm(true); }}><Plus size={17}/> Plan a flight</button></div>
          <div className="notice-banner"><div className="notice-symbol"><ShieldCheck size={18}/></div><div><strong>{supabaseConfigured ? 'Supabase project connected' : 'Planning workspace'}</strong><span>{supabaseConfigured ? 'Client credentials are configured. Operational tables and authentication are not set up yet; figures below remain illustrative starter data.' : 'Starter records are for setup and interface preview. No live flight, cargo, weather or financial data is connected.'}</span></div><button onClick={() => setNotice(supabaseConfigured ? 'Supabase is connected. Set up operational tables and row-level security before storing flight or cargo records.' : 'Connect a Supabase project using the included environment template to begin workspace setup.')}>Workspace setup <ArrowRight size={14}/></button></div>
          <section className="metric-grid" aria-label="Operations summary">
            <Metric icon={Plane} label="Flights planned" value={session ? String(flights.length).padStart(2, '0') : '03'} foot={session ? 'Saved flight plans' : 'Starter planning records'} tone="blue" trend={session ? 'Supabase' : '+2'} up={!session} />
            <Metric icon={Airplay} label="Aircraft in fleet" value="01" foot="Cessna 208B · starter profile" tone="mint" trend="Home base" />
            <Metric icon={Package} label="Cargo scheduled" value={session ? '0 kg' : '522 kg'} foot={session ? 'No cargo assigned' : 'Illustrative starter data'} tone="violet" trend={session ? 'Supabase' : 'Demo'} />
            <Metric icon={Gauge} label="Dispatch readiness" value="—" foot="No release checks completed" tone="amber" trend="Review" />
          </section>
          <section className="main-grid">
            <div className="panel flight-panel"><div className="panel-header"><div><div className="section-kicker">TODAY’S PLAN <span className="starter-label">{session ? 'SUPABASE' : 'STARTER DATA'}</span></div><h2>Flight board</h2><p>Planning records · Local time (Pacific)</p></div><button className="text-button" onClick={() => setActive('Flight Operations')}>View operations <ArrowRight size={15}/></button></div>
              <div className="flight-tools"><label className="searchbox"><Search size={15}/><input aria-label="Search flights" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search callsign or destination"/></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by flight status"><option>All flights</option><option>Planned</option><option>Awaiting dispatch</option><option>Draft</option></select><button className="filter-button" aria-label="Flight list settings" onClick={() => setNotice('Showing the current planning board. Filters are applied above.')}><Settings2 size={16}/></button></div>
              <div className="flight-list">{filtered.map((flight, index) => <div className="flight-row" key={`${flight.callsign}-${index}`}><div className="flight-time"><strong>{flight.time}</strong><span>LOCAL</span></div><div className="route-line"><i className="route-dot start"/><i className="route-track"/><i className="route-dot end"/></div><div className="flight-details"><div><strong>{flight.callsign}</strong><span className={`flight-status ${flight.color}`}>{flight.status}</span></div><span className="flight-route">{flight.route} <span>·</span> {flight.city}</span><small>{flight.cargo}</small></div><div className="flight-tail"><Plane size={14}/>{flight.aircraft}</div><button className="row-more" aria-label={`More options for ${flight.callsign}`} onClick={() => setNotice(session ? `${flight.callsign} is stored in your Supabase flight plans.` : `${flight.callsign}: ${flight.status}. Flight records are local starter data.`)}><MoreHorizontal size={18}/></button></div>)}{filtered.length === 0 && <div className="empty-state"><Search size={20}/><strong>No matching flights</strong><span>Try another search or status filter.</span></div>}</div>
              <button className="panel-footer-link" onClick={() => setActive('Dispatch')}>Open dispatch planning <ArrowRight size={15}/></button>
            </div>

            <div className="right-column"><div className="panel aircraft-panel"><div className="panel-header compact"><div><div className="section-kicker">FLEET OVERVIEW</div><h2>Aircraft status</h2></div><button className="dots-button" aria-label="Aircraft options" onClick={() => setActive('Fleet')}><MoreHorizontal size={19}/></button></div><div className="aircraft-card"><div className="aircraft-visual"><div className="plane-halo"/><Plane className="plane-silhouette" size={106} strokeWidth={1} fill="currentColor"/></div><div className="aircraft-id"><div><div className="tail-number">C-FNPC <span className="ready-dot"/> READY</div><strong>Cessna 208B</strong><small>Grand Caravan · Utility</small></div><button className="circle-arrow" aria-label="View aircraft details" onClick={() => setActive('Fleet')}><ArrowUpRight size={16}/></button></div><div className="aircraft-stats"><div><span><Fuel size={13}/> FUEL</span><strong>— <small>not reported</small></strong></div><div><span><Clock3 size={13}/> AIRFRAME</span><strong>— <small>hours unreported</small></strong></div></div><div className="aircraft-note"><ShieldCheck size={14}/> Aircraft profile · Operational data not connected</div></div></div>
              <div className="panel base-panel"><div className="base-panel-head"><div><div className="section-kicker">NETWORK BASE</div><h2>Stewart, BC <span className="airport-code">CZST</span></h2></div><div className="base-illustration"><Snowflake size={18}/></div></div><div className="base-map"><div className="map-grid"/><div className="mountain mountain-a"/><div className="mountain mountain-b"/><div className="runway"/><div className="map-pin"><span/></div><div className="map-label">CZST <small>STEWART</small></div><div className="map-coords">55°56′N&nbsp; 129°59′W</div></div><div className="base-panel-foot"><span><Compass size={14}/> Northwest British Columbia</span><button onClick={() => setActive('Routes')}>Route network <ArrowRight size={14}/></button></div></div></div>
          </section>
          <div className="bottom-grid"><div className="panel activity-panel"><div className="panel-header compact"><div><div className="section-kicker">WORKSPACE ACTIVITY</div><h2>Recent updates</h2></div><button className="dots-button" aria-label="Activity options" onClick={() => setNotice('No user activity has been recorded in this starter workspace.')}><MoreHorizontal size={18}/></button></div><div className="activity-empty"><div className="activity-icon"><Activity size={18}/></div><div><strong>No activity recorded yet</strong><span>Workspace events will show here as your team gets started.</span></div><span className="empty-time">—</span></div></div><div className="getting-started"><div className="getting-icon"><BookOpen size={17}/></div><div><span>GETTING STARTED</span><strong>{session ? 'Flight plans sync is active' : supabaseConfigured ? 'Test saved flight plans' : 'Make this workspace yours'}</strong><small>{session ? 'New drafts are private to your signed-in account.' : supabaseConfigured ? 'Sign in, add a draft, then reload to confirm it persists.' : 'Connect your data and configure your operation.'}</small></div><button onClick={() => session ? setActive('Dispatch') : setShowSignIn(true)} aria-label={session ? 'Open dispatch' : 'Sign in to sync'}><ArrowRight size={17}/></button></div></div>
          <footer className="page-footer"><span>© 2026 Northern Pacific Cargo</span><span><i/> Systems nominal <b/> Version 0.1.0 · Starter workspace</span><span>All times Pacific · Operational records are illustrative</span></footer>
        </> : <ModulePage title={module.title} eyebrow={module.eyebrow} description={module.description} Icon={module.icon} cards={module.cards} connected={Boolean(session)} supabaseReady={Boolean(supabase)} onAction={() => active === 'Dispatch' ? setShowFlightForm(true) : setNotice(`${active} is a setup-only module in this test build.`)} onOpen={(card) => setNotice(`${card} is ready for configuration.`)} flights={active === 'Dispatch' || active === 'Flight Operations' ? flights : undefined} />}
      </div>
    </main>
    {showFlightForm && <div className="modal-backdrop" role="presentation" onClick={() => setShowFlightForm(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="flight-modal-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowFlightForm(false)} aria-label="Close dialog"><X size={18}/></button><div className="modal-icon"><Plane size={21}/></div><div className="section-kicker">DISPATCH PLANNING</div><h2 id="flight-modal-title">Add a flight record</h2><p>{session ? 'This draft will be saved to your Supabase account.' : supabase ? 'Sign in with email to save this draft to your workspace.' : 'Create a local draft to organize planning. It won’t be transmitted or saved to a server.'}</p><label className="form-label">Flight callsign<input autoFocus value={newCallsign} onChange={(e) => setNewCallsign(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDraft()} placeholder="e.g. NPC 402"/></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowFlightForm(false)}>Cancel</button><button className="primary-button" onClick={addDraft} disabled={!newCallsign.trim() || saving}><Plus size={16}/>{saving ? 'Saving…' : 'Add draft'}</button></div></div></div>}
    {showSignIn && <div className="modal-backdrop" role="presentation" onClick={() => setShowSignIn(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="signin-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowSignIn(false)} aria-label="Close sign-in"><X size={18}/></button><div className="modal-icon"><ShieldCheck size={21}/></div><div className="section-kicker">SUPABASE AUTH</div><h2 id="signin-title">Sign in to sync flights</h2><p>We’ll send a secure sign-in link to your email. First-time sign-ins create your test account automatically.</p><label className="form-label">Email address<input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendSignInLink()} placeholder="you@example.com"/></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowSignIn(false)}>Cancel</button><button className="primary-button" onClick={sendSignInLink} disabled={!email.trim() || saving}>{saving ? 'Sending…' : 'Email a sign-in link'}</button></div></div></div>}
  </div>;
}

function Metric({ icon: Icon, label, value, foot, tone, trend, up }: { icon: typeof Plane; label: string; value: string; foot: string; tone: string; trend: string; up?: boolean }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.8}/></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><div className="metric-foot"><span>{foot}</span><small className={up ? 'trend-up' : ''}>{up && <ArrowUpRight size={12}/>} {trend}</small></div></div>;
}

function ModulePage({ title, eyebrow, description, Icon, cards, onAction, onOpen, flights, connected, supabaseReady }: { title: string; eyebrow: string; description: string; Icon: typeof Plane; cards: string[]; onAction: () => void; onOpen: (card: string) => void; flights?: typeof initialFlights; connected: boolean; supabaseReady: boolean }) {
  const flightModule = title === 'Dispatch center' || title === 'Flight operations';
  return <div className="module-page"><div className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow} <span className="starter-label">{connected && flightModule ? 'SUPABASE DATA' : 'STARTER WORKSPACE'}</span></div><h1>{title}</h1><p>{description}</p></div><button className="primary-button" onClick={onAction}><Plus size={17}/>{title === 'Dispatch center' ? 'Add flight' : `Add ${title === 'Pilot roster' ? 'pilot' : title === 'Aircraft fleet' ? 'aircraft' : 'record'}`}</button></div><div className="module-banner"><div className="notice-symbol"><ShieldCheck size={18}/></div><div><strong>{connected && flightModule ? 'Supabase connected' : supabaseReady ? 'Supabase credentials ready' : 'Workspace setup mode'}</strong><span>{connected && flightModule ? 'Flight plans below are loaded from your private Supabase records. Other operations modules remain in setup mode.' : supabaseReady ? 'Sign in to save flight plans. Other module records are not configured in this test build.' : 'This page shows setup information and illustrative records only.'}</span></div></div><div className="module-cards">{cards.map((card, i) => <button className="module-card" key={card} onClick={() => onOpen(card)}><div className={`module-card-icon tone-${i}`}><Icon size={18}/></div><div><span>{i === 0 ? 'WORKSPACE OVERVIEW' : i === 1 ? 'PLANNING' : 'MANAGEMENT'}</span><strong>{card}</strong><small>{i === 0 ? connected && flightModule ? 'Connected flight records' : 'No connected records yet' : 'Ready to configure'}</small></div><ArrowUpRight size={17} className="module-arrow"/></button>)}</div>{flights && <div className="panel module-board"><div className="panel-header compact"><div><div className="section-kicker">PLANNING RECORDS</div><h2>Flight planning board</h2><p>{connected ? 'Saved Supabase records · Private to your account' : supabaseReady ? 'Sign in to sync · Starter records are illustrative' : 'Local starter records · No live dispatch data'}</p></div><span className={connected ? 'flight-status blue' : 'starter-label'}>{connected ? `${flights.length} SAVED` : `${flights.length} DEMO RECORDS`}</span></div><div className="module-table"><div className="table-header"><span>CALLSIGN</span><span>ROUTE</span><span>DEPARTURE</span><span>CARGO</span><span>STATUS</span></div>{flights.map((f, i) => <div className="table-row" key={`${f.callsign}-${i}`}><strong>{f.callsign}</strong><span>{f.route}</span><span>{f.time}</span><span>{f.cargo}</span><span className={`flight-status ${f.color}`}>{f.status}</span></div>)}</div></div>}<div className="module-placeholder"><div className="placeholder-mark"><Icon size={24}/></div><div><strong>{connected && flightModule ? 'Test the flight plan workflow' : 'This module is not configured yet'}</strong><span>{connected && flightModule ? 'Add a draft flight, reload the page, and confirm it appears here from Supabase. Row-level security keeps it private to your account.' : 'The Supabase project is connected. This module still needs its own data table and access policies.'}</span></div></div></div>;
}
