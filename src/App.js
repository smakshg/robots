import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Normalize messy application values from CSV into clean filter buckets
const normalizeApplication = (raw) => {
  if (!raw) return 'Other';
  const lower = raw.toLowerCase();
  if (lower.includes('spot') && lower.includes('arc')) return 'Arc & Spot Welding';
  if (lower.includes('spot') && lower.includes('heavy')) return 'Spot & Heavy Welding';
  if (lower.includes('spot')) return 'Spot Welding';
  if (lower.includes('heavy')) return 'Heavy Welding';
  if (lower.includes('arc')) return 'Arc Welding';
  return raw.trim();
};

const CustomDropdown = ({ label, options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div className="dropdown-label">{label}</div>
      <button
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="trigger-content">
          {icon && <span className="trigger-icon">{icon}</span>}
          <span>{selectedOption.label}</span>
        </div>
        <svg className="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`dropdown-item ${value === opt.value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RobotModal = ({ robot, onClose }) => {
  if (!robot) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <div className="modal-header">
          <div className="modal-operation">{robot.operation}</div>
          <h2 className="modal-title">{robot.model}</h2>
          <div className="modal-company">{robot.company}</div>
        </div>

        {robot.image_file && (
          <div className="modal-image-container">
            <img src={`/robot_images/${robot.image_file}`} alt={robot.model} className="modal-image" />
          </div>
        )}

        <div className="modal-body">
          <div className="modal-main-spec">
            <div className="spec-box primary">
              <span className="spec-label">Payload Capacity</span>
              <span className="spec-value">{robot.payload} <small>kg</small></span>
            </div>
            <div className="spec-box primary">
              <span className="spec-label">Maximum Reach</span>
              <span className="spec-value">{robot.reach} <small>mm</small></span>
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
              <h4 className="notes-heading">Technical Notes & Features</h4>
              <p className="modal-notes">{robot.notes}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={() => window.print()}>Print Specs</button>
          <button className="secondary-btn" onClick={onClose}>Close Terminal</button>
        </div>
      </div>
    </div>
  );
};

const RobotCard = ({ robot, onClick }) => {
  return (
    <div className="robot-card" onClick={onClick}>
      {robot.image_file && (
        <div className="card-image-container">
          <img src={`/robot_images/${robot.image_file}`} alt={robot.model} className="card-image" />
        </div>
      )}
      <div className="card-top">
        <div className="card-operation" data-operation={robot.operation}>{robot.operation}</div>
        <div className="company-badge">{robot.company}</div>
      </div>
      <h3 className="card-title">{robot.model}</h3>

      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-label">Payload</span>
          <span className="stat-value">{robot.payload} kg</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Reach</span>
          <span className="stat-value">{robot.reach} mm</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Axes</span>
          <span className="stat-value">{robot.axes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Repeatability</span>
          <span className="stat-value">{robot.accuracy}</span>
        </div>
      </div>

      <div className="card-footer">
        <div className="card-price">{robot.cost}</div>
        <div className="view-detail-hint">View System Specs &rarr;</div>
      </div>
    </div>
  );
};

function App() {
  const [robots, setRobots] = useState([]);
  const [filteredRobots, setFilteredRobots] = useState([]);
  const [activeOperation, setActiveOperation] = useState('All');
  const [activeCompany, setActiveCompany] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('None');
  const [selectedRobot, setSelectedRobot] = useState(null);

  // Build filter lists from actual data
  const operations = ['All', ...Array.from(new Set(robots.map(r => r.operation).filter(Boolean))).sort()];
  const companies = ['All', ...Array.from(new Set(robots.map(r => r.company).filter(Boolean))).sort()];

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

  useEffect(() => {
    const parseCSV = (text) => {
      const result = [];
      let row = [];
      let inQuotes = false;
      let val = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"' && inQuotes && nextChar === '"') {
          val += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(val);
          val = '';
        } else if (char === '\n' && !inQuotes) {
          row.push(val);
          result.push(row);
          row = [];
          val = '';
        } else if (char === '\r' && !inQuotes) {
          // ignore CR
        } else {
          val += char;
        }
      }
      if (val || row.length > 0) {
        row.push(val);
        result.push(row);
      }

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

    fetch('/robots_complete.csv')
      .then(response => response.text())
      .then(csvText => {
        const parsedData = parseCSV(csvText);
        const mappedData = parsedData.map(r => ({
          company: r.company || '',
          model: r.model || '',
          // Store the raw application string for display in modal
          rawApplication: r.application || '',
          // Normalized operation for filtering
          operation: normalizeApplication(r.application),
          payload: r.payload_kg || '—',
          reach: r.reach_mm || '—',
          axes: r.axes || '—',
          accuracy: r.repeatability || '—',
          cost: r.price_inr || 'Contact for price',
          notes: r.notes || '',
          image_file: r.image_file || '',
          useCase: r.application || ''
        }));
        setRobots(mappedData);
        setFilteredRobots(mappedData);
      })
      .catch(err => console.error('Error loading CSV:', err));
  }, []);

  useEffect(() => {
    let result = [...robots];

    if (activeOperation !== 'All') {
      result = result.filter(r => r.operation === activeOperation);
    }
    if (activeCompany !== 'All') {
      result = result.filter(r => r.company === activeCompany);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.model.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.rawApplication.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    }

    if (sortOption === 'Price Low-High') {
      result.sort((a, b) => parseCost(a.cost) - parseCost(b.cost));
    } else if (sortOption === 'Price High-Low') {
      result.sort((a, b) => parseCost(b.cost) - parseCost(a.cost));
    } else if (sortOption === 'Payload Low-High') {
      result.sort((a, b) => parsePayload(a.payload) - parsePayload(b.payload));
    } else if (sortOption === 'Payload High-Low') {
      result.sort((a, b) => parsePayload(b.payload) - parsePayload(a.payload));
    }

    setFilteredRobots(result);
  }, [activeOperation, activeCompany, searchQuery, sortOption, robots]);

  const sortOptions = [
    { label: 'Default', value: 'None' },
    { label: 'Price: Low to High', value: 'Price Low-High' },
    { label: 'Price: High to Low', value: 'Price High-Low' },
    { label: 'Payload: Light to Heavy', value: 'Payload Low-High' },
    { label: 'Payload: Heavy to Light', value: 'Payload High-Low' }
  ];

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-badge">Welding Robots Catalog — {robots.length} Models</div>
        <h1 className="gradient-text">Industrial Welding Robots</h1>
        <p className="scan-counter">
          ABB · Fanuc · KUKA · Yaskawa · Panasonic · OTC · Kawasaki · Durr
        </p>
      </header>

      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search by model, company, application..."
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
            icon="🔥"
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
            icon="⚖️"
          />
        </div>

        <div className="results-count">
          Showing <strong>{filteredRobots.length}</strong> of {robots.length} robots
        </div>
      </div>

      <div className="robot-grid">
        {filteredRobots.length > 0 ? (
          filteredRobots.map((robot, idx) => (
            <RobotCard
              key={`${robot.model}-${idx}`}
              robot={robot}
              onClick={() => setSelectedRobot(robot)}
            />
          ))
        ) : (
          <div className="no-results">
            No robots found matching your filters.
          </div>
        )}
      </div>

      <RobotModal
        robot={selectedRobot}
        onClose={() => setSelectedRobot(null)}
      />
    </div>
  );
}

export default App;
