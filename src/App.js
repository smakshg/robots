import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

/* ═══════════════════════════════════════════════════════════ */
/*  Helpers                                                    */
/* ═══════════════════════════════════════════════════════════ */
const normalizeApplication = (application, notes, model) => {
  const combined = `${application || ''} ${notes || ''} ${model || ''}`.toLowerCase();

  if (combined.includes('weld') || combined.includes('arc') || combined.includes('spot'))
    return 'Welding';
  if (combined.includes('paint') || combined.includes('spray') || combined.includes('coat'))
    return 'Painting & Coating';
  if (combined.includes('palletiz') || combined.includes('stack') || combined.includes('pallet'))
    return 'Palletizing';
  if (
    combined.includes('deburr') || combined.includes('grind') ||
    combined.includes('polish') || combined.includes('sanding') ||
    combined.includes('machining') || combined.includes('finishing') ||
    combined.includes('finish') || combined.includes('removal')
  )
    return 'Finishing & Grinding';

  return application ? application.trim() : 'Other';
};

const parsePayload = (payload) => {
  if (typeof payload === 'number') return payload;
  if (!payload) return 0;
  const match = payload.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

const parseCost = (cost) => {
  if (!cost) return 0;
  const str = cost.toString().replace(/[₹,\s]/g, '').toLowerCase();
  const match = str.match(/[\d.]+/);
  if (!match) return 0;
  let val = parseFloat(match[0]);
  if (str.includes('cr')) val *= 100;
  return val;
};

const parseCSV = (text) => {
  const result = [];
  let row = [];
  let inQuotes = false;
  let val = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      val += '"'; i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(val); val = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(val); result.push(row); row = []; val = '';
    } else if (char === '\r' && !inQuotes) {
      /* skip */
    } else {
      val += char;
    }
  }
  if (val || row.length > 0) { row.push(val); result.push(row); }
  if (result.length === 0) return [];

  const headers = result[0].map(h => h.trim());
  const data = [];
  for (let i = 1; i < result.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = result[i] ? (result[i][j] || '').trim() : '';
    }
    if (obj.model) data.push(obj);
  }
  return data;
};

/* ═══════════════════════════════════════════════════════════ */
/*  SVG Icons                                                  */
/* ═══════════════════════════════════════════════════════════ */
const SearchIcon = () => (
  <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════ */
/*  CustomDropdown                                             */
/* ═══════════════════════════════════════════════════════════ */
const CustomDropdown = ({ label, options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="custom-dropdown" ref={ref}>
      <div className="dropdown-label">{label}</div>
      <button className={`dropdown-trigger ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <div className="trigger-content">
          {icon && <span className="trigger-icon">{icon}</span>}
          <span>{selected.label}</span>
        </div>
        <ChevronIcon />
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {options.map(opt => (
            <div key={opt.value}
              className={`dropdown-item ${value === opt.value ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  RobotModal                                                 */
/* ═══════════════════════════════════════════════════════════ */
const RobotModal = ({ robot, onClose }) => {
  useEffect(() => {
    if (robot) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [robot]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (robot) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [robot, onClose]);

  if (!robot) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        {robot.image_file ? (
          <div className="modal-image-section">
            <img src={`/robot_images/${robot.image_file}`} alt={robot.model} className="modal-image" />
          </div>
        ) : (
          <div className="modal-image-section">
            <div style={{ fontSize: '4rem', opacity: 0.1 }}>🤖</div>
          </div>
        )}

        <div className="modal-body-inner">
          <div className="modal-header">
            <div className="modal-operation">{robot.operation}</div>
            <h2 className="modal-title">{robot.model}</h2>
            <div className="modal-company">{robot.company}</div>
          </div>

          <div className="modal-specs-row">
            <div className="spec-box">
              <span className="spec-label">Payload Capacity</span>
              <span className="spec-value">{robot.payload}<small>kg</small></span>
            </div>
            <div className="spec-box">
              <span className="spec-label">Maximum Reach</span>
              <span className="spec-value">{robot.reach}<small>mm</small></span>
            </div>
          </div>

          <div className="modal-details-grid">
            <div className="detail-item">
              <span className="detail-label">Mechanical Axes</span>
              <span className="detail-value">{robot.axes}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Repeatability</span>
              <span className="detail-value">{robot.accuracy}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Application</span>
              <span className="detail-value">{robot.rawApplication}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Price (INR)</span>
              <span className="detail-value highlight">{robot.cost}</span>
            </div>
          </div>

          {robot.notes && (
            <div className="modal-notes-section">
              <h4 className="notes-heading">Technical Notes &amp; Features</h4>
              <p className="modal-notes">{robot.notes}</p>
            </div>
          )}

          <div className="modal-footer">
            <button className="primary-btn" onClick={() => window.print()}>Print Specs</button>
            <button className="secondary-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  RobotCard                                                  */
/* ═══════════════════════════════════════════════════════════ */
const RobotCard = ({ robot, onClick, style }) => {
  return (
    <div className="robot-card" data-brand={robot.company} onClick={onClick} style={style}>
      {robot.image_file ? (
        <div className="card-image-wrap">
          <img
            src={`/robot_images/${robot.image_file}`}
            alt={robot.model}
            className="card-image"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="card-no-image">
          <span className="card-no-image-icon">🤖</span>
        </div>
      )}

      <div className="card-body">
        <div className="card-top">
          <div className="card-operation">{robot.rawApplication || robot.operation}</div>
          <div className="company-badge">{robot.company}</div>
        </div>

        <h3 className="card-title">{robot.model}</h3>

        {robot.notes && (
          <div className="card-description">{robot.notes}</div>
        )}

        <div className="card-stats">
          <div className="card-stat">
            <span className="stat-label">Payload</span>
            <span className="stat-value">{robot.payload} kg</span>
          </div>
          <div className="card-stat">
            <span className="stat-label">Reach</span>
            <span className="stat-value">{robot.reach} mm</span>
          </div>
          <div className="card-stat">
            <span className="stat-label">Axes</span>
            <span className="stat-value">{robot.axes}</span>
          </div>
          <div className="card-stat">
            <span className="stat-label">Repeatability</span>
            <span className="stat-value">{robot.accuracy}</span>
          </div>
        </div>

        <div className="card-footer">
          <div className="card-price">{robot.cost}</div>
          <div className="view-detail-btn">
            <span>Details</span>
            <ArrowIcon />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  App                                                        */
/* ═══════════════════════════════════════════════════════════ */
function App() {
  const [robots, setRobots] = useState([]);
  const [filteredRobots, setFilteredRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOperation, setActiveOperation] = useState('All');
  const [activeCompany, setActiveCompany] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('None');
  const [selectedRobot, setSelectedRobot] = useState(null);

  const handleCloseModal = useCallback(() => setSelectedRobot(null), []);

  const operations = ['All', ...Array.from(new Set(robots.map(r => r.operation).filter(Boolean))).sort()];
  const companies = ['All', ...Array.from(new Set(robots.map(r => r.company).filter(Boolean))).sort()];

  // Stats
  const totalManufacturers = new Set(robots.map(r => r.company).filter(Boolean)).size;
  const totalApplications = new Set(robots.map(r => r.operation).filter(Boolean)).size;
  const weldingCount = robots.filter(r => r.operation === 'Welding').length;
  const paintingCount = robots.filter(r => r.operation === 'Painting & Coating').length;

  useEffect(() => {
    fetch('/robots_complete.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = parseCSV(csvText);
        const mapped = parsed.map(r => {
          const operation = normalizeApplication(r.application, r.notes, r.model);
          return {
            company: r.company || '',
            model: r.model || '',
            rawApplication: r.application || operation || 'Other',
            operation,
            payload: r.payload_kg || '—',
            reach: r.reach_mm || '—',
            axes: r.axes || '—',
            accuracy: r.repeatability || '—',
            cost: r.price_inr || 'Contact for price',
            notes: r.notes || '',
            image_file: r.image_file || '',
          };
        });
        setRobots(mapped);
        setFilteredRobots(mapped);
        setLoading(false);
      })
      .catch(err => { console.error('Error loading CSV:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    let result = [...robots];
    if (activeOperation !== 'All') result = result.filter(r => r.operation === activeOperation);
    if (activeCompany !== 'All') result = result.filter(r => r.company === activeCompany);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.model.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.rawApplication.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    }
    if (sortOption === 'Price Low-High') result.sort((a, b) => parseCost(a.cost) - parseCost(b.cost));
    else if (sortOption === 'Price High-Low') result.sort((a, b) => parseCost(b.cost) - parseCost(a.cost));
    else if (sortOption === 'Payload Low-High') result.sort((a, b) => parsePayload(a.payload) - parsePayload(b.payload));
    else if (sortOption === 'Payload High-Low') result.sort((a, b) => parsePayload(b.payload) - parsePayload(a.payload));
    setFilteredRobots(result);
  }, [activeOperation, activeCompany, searchQuery, sortOption, robots]);

  const sortOptions = [
    { label: 'Default', value: 'None' },
    { label: 'Price: Low → High', value: 'Price Low-High' },
    { label: 'Price: High → Low', value: 'Price High-Low' },
    { label: 'Payload: Light → Heavy', value: 'Payload Low-High' },
    { label: 'Payload: Heavy → Light', value: 'Payload High-Low' },
  ];

  return (
    <div className="App">
      <div className="app-content">

        {/* ══════ HERO ══════ */}
        <section className="hero-section">
          <div className="hero-orb hero-orb--1" />
          <div className="hero-orb hero-orb--2" />
          <div className="hero-orb hero-orb--3" />

          <div className="header-tag">
            <span className="tag-dot" />
            NEXUS-9 SYSTEMS MATRIX — {robots.length} ACTIVE NODES
          </div>

          <h1 className="hero-title">
            <span className="gradient-text">ROBOSPECTRA</span>
            <br />
            Cybernetic Systems Directory
          </h1>

          <p className="hero-subtitle">
            ABB <span>·</span> Fanuc <span>·</span> KUKA <span>·</span> Yaskawa <span>·</span> Panasonic <span>·</span> OTC <span>·</span> Kawasaki <span>·</span> Dürr
          </p>
        </section>

        {/* ══════ STATS ══════ */}
        <div className="stats-bar">
          <div className="stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(0,242,255,0.1)' }}>🤖</div>
            <div className="stat-pill-data">
              <div className="stat-pill-value">{robots.length}</div>
              <div className="stat-pill-label">Total Models</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(124,93,250,0.1)' }}>🏭</div>
            <div className="stat-pill-data">
              <div className="stat-pill-value">{totalManufacturers}</div>
              <div className="stat-pill-label">Manufacturers</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(255,107,107,0.1)' }}>🔥</div>
            <div className="stat-pill-data">
              <div className="stat-pill-value">{weldingCount}</div>
              <div className="stat-pill-label">Welding Robots</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>🎨</div>
            <div className="stat-pill-data">
              <div className="stat-pill-value">{paintingCount}</div>
              <div className="stat-pill-label">Paint Robots</div>
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>⚙️</div>
            <div className="stat-pill-data">
              <div className="stat-pill-value">{totalApplications}</div>
              <div className="stat-pill-label">Applications</div>
            </div>
          </div>
        </div>

        {/* ══════ COMMAND CENTER ══════ */}
        <div className="command-center">
          <div className="search-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="search-input"
              placeholder="Search by model, company, application, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dropdown-row">
            <CustomDropdown
              label="Application Type"
              options={operations.map(o => ({ label: o, value: o }))}
              value={activeOperation}
              onChange={setActiveOperation}
              icon="⚡"
            />
            <CustomDropdown
              label="Manufacturer"
              options={companies.map(c => ({ label: c, value: c }))}
              value={activeCompany}
              onChange={setActiveCompany}
              icon="🏭"
            />
            <CustomDropdown
              label="Sort By"
              options={sortOptions}
              value={sortOption}
              onChange={setSortOption}
              icon="↕️"
            />
          </div>

          <div className="results-count">
            Showing <strong>{filteredRobots.length}</strong> of {robots.length} robot systems
          </div>
        </div>

        {/* ══════ ROBOT GRID ══════ */}
        <div className="robot-grid">
          {loading ? (
            <div className="no-results">
              <div className="loading-spinner" />
              <p>Loading robot catalog...</p>
            </div>
          ) : filteredRobots.length > 0 ? (
            filteredRobots.map((robot, idx) => (
              <RobotCard
                key={`${robot.company}-${robot.model}-${idx}`}
                robot={robot}
                onClick={() => setSelectedRobot(robot)}
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.8)}s` }}
              />
            ))
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No robots found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════ FOOTER ══════ */}
      <footer className="app-footer">
        ROBOSPECTRA Cybernetic Systems Directory · {robots.length} NODES · {totalManufacturers} BRANDS
      </footer>

      {/* ══════ MODAL ══════ */}
      <RobotModal robot={selectedRobot} onClose={handleCloseModal} />
    </div>
  );
}

export default App;
