/**
 * app.js
 * ------
 * Main application logic for the OLAP Data Cube viewer.
 * Handles: data tables, sparklines, summary stats, trend chart, heatmap.
 */

(function () {
  'use strict';

  const { dimensions, facts, get: cubeGet } = CUBE_DATA;
  const years  = dimensions.time.members;
  const geos   = dimensions.geography.members;
  const specs  = dimensions.specialty.members;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DATA TABLE (annual layers)
  // ─────────────────────────────────────────────────────────────────────────
  let currentYear = '2022';

  function renderTable(year) {
    currentYear = year;
    const body = document.getElementById('tableBody');
    const foot = document.getElementById('tableFoot');
    const data = CUBE_DATA.getLayer(year);

    // Column totals
    const colTotals = {};
    geos.forEach(g => { colTotals[g] = 0; });
    let grandTotal = 0;

    body.innerHTML = '';
    specs.forEach((spec, i) => {
      const row = document.createElement('tr');
      row.classList.add(`row-spec-${i}`);

      // Row total
      let rowTotal = 0;
      geos.forEach(g => { rowTotal += data[spec][g]; });
      grandTotal += rowTotal;
      geos.forEach(g => { colTotals[g] += data[spec][g]; });

      const maxInRow = Math.max(...geos.map(g => data[spec][g]));

      row.innerHTML = `
        <td class="td-specialty">
          <span class="spec-dot" style="background:${SPECIALTY_COLORS[spec].primary}"></span>
          ${spec}
        </td>
        ${geos.map(g => {
          const v = data[spec][g];
          const pct = ((v / maxInRow) * 100).toFixed(0);
          return `<td class="td-value">
            <div class="cell-inner">
              <span class="cell-number">${v}</span>
              <div class="cell-bar-wrap">
                <div class="cell-bar" style="width:${pct}%;background:${SPECIALTY_COLORS[spec].primary}"></div>
              </div>
            </div>
          </td>`;
        }).join('')}
        <td class="td-total">${rowTotal}</td>
      `;
      body.appendChild(row);
    });

    // Footer totals row
    foot.innerHTML = `
      <tr class="total-row">
        <td class="td-specialty total-label">Total</td>
        ${geos.map(g => `<td class="td-value td-total">${colTotals[g]}</td>`).join('')}
        <td class="td-total grand-total">${grandTotal}</td>
      </tr>
    `;

    // Update layer title
    document.getElementById('layerTitle').textContent = YEAR_LABELS[year];

    // Re-render sparklines
    renderSparklines(year);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SPARKLINES
  // ─────────────────────────────────────────────────────────────────────────
  function renderSparklines(year) {
    document.getElementById('sparkYear').textContent = year;
    const container = document.getElementById('sparklines');
    container.innerHTML = '';
    const data = CUBE_DATA.getLayer(year);
    const maxVal = Math.max(...specs.flatMap(s => geos.map(g => data[s][g])));

    specs.forEach(spec => {
      const rowTotal = geos.reduce((sum, g) => sum + data[spec][g], 0);
      const pct = ((rowTotal / (maxVal * geos.length)) * 100).toFixed(1);
      const color = SPECIALTY_COLORS[spec].primary;

      const div = document.createElement('div');
      div.className = 'spark-item';
      div.innerHTML = `
        <div class="spark-label">${spec}</div>
        <div class="spark-bar-outer">
          <div class="spark-bar-inner" style="width:${pct}%;background:${color}">
            <span class="spark-val">${rowTotal}</span>
          </div>
        </div>
        <div class="spark-geo">
          ${geos.map(g => `
            <span class="spark-geo-chip" style="border-color:${color}">
              <b>${g.substring(0,3)}</b> ${data[spec][g]}
            </span>
          `).join('')}
        </div>
      `;
      container.appendChild(div);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. YEAR TABS
  // ─────────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.year-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTable(btn.dataset.year);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SUMMARY STATS
  // ─────────────────────────────────────────────────────────────────────────
  function renderStats() {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;

    // Grand total
    const grand = CUBE_DATA.grandTotal();

    // Totals by year
    const byYear = CUBE_DATA.getAggregated('time');

    // Max cell
    let maxCell = { val: 0 };
    years.forEach(y => specs.forEach(s => geos.forEach(g => {
      const v = CUBE_DATA.get(y, s, g);
      if (v > maxCell.val) maxCell = { val: v, y, s, g };
    })));

    // CAGR 2022→2025
    const t22 = byYear['2022'];
    const t25 = byYear['2025'];
    const cagr = (((t25 / t22) ** (1/3)) - 1) * 100;

    // Fastest growing specialty
    let fastSpec = '', fastRate = -Infinity;
    specs.forEach(s => {
      const v22 = geos.reduce((sum, g) => sum + CUBE_DATA.get('2022', s, g), 0);
      const v25 = geos.reduce((sum, g) => sum + CUBE_DATA.get('2025', s, g), 0);
      const r = ((v25 - v22) / v22) * 100;
      if (r > fastRate) { fastRate = r; fastSpec = s; }
    });

    const cards = [
      {
        label: 'Total Global (2022–2025)',
        value: grand.toLocaleString(),
        unit: 'miles',
        color: '#3b82f6',
        icon: '📦'
      },
      {
        label: 'CAGR Período',
        value: `+${cagr.toFixed(1)}%`,
        unit: 'tasa anual compuesta',
        color: '#10b981',
        icon: '📈'
      },
      {
        label: 'Celda Máxima',
        value: maxCell.val,
        unit: `${maxCell.s} · ${maxCell.g} · ${maxCell.y}`,
        color: '#f59e0b',
        icon: '🔺'
      },
      {
        label: 'Especialidad con Mayor Crecimiento',
        value: fastSpec,
        unit: `+${fastRate.toFixed(1)}% (2022→2025)`,
        color: '#8b5cf6',
        icon: '🚀'
      }
    ];

    // Year-by-year totals
    years.forEach(y => {
      const prev = y === '2022' ? null : byYear[String(+y - 1)];
      const curr = byYear[y];
      const delta = prev ? `+${((curr - prev) / prev * 100).toFixed(1)}%` : '—';
      cards.push({
        label: `Total ${y}`,
        value: curr.toLocaleString(),
        unit: `Variación: ${delta}`,
        color: '#06b6d4',
        icon: '📅'
      });
    });

    cards.forEach(c => {
      const el = document.createElement('div');
      el.className = 'stat-card';
      el.style.setProperty('--card-color', c.color);
      el.innerHTML = `
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-body">
          <div class="stat-label">${c.label}</div>
          <div class="stat-value" style="color:${c.color}">${c.value}</div>
          <div class="stat-unit">${c.unit}</div>
        </div>
      `;
      grid.appendChild(el);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TREND CHART (Chart.js)
  // ─────────────────────────────────────────────────────────────────────────
  let trendChart = null;
  let activeRegion = 'all';
  let activeSpec   = 'all';

  function buildTrendDatasets() {
    const datasets = [];

    if (activeSpec === 'all' && activeRegion === 'all') {
      // One line per specialty (sum across all geos)
      specs.forEach(spec => {
        datasets.push({
          label: spec,
          data: years.map(y => geos.reduce((s, g) => s + CUBE_DATA.get(y, spec, g), 0)),
          borderColor: SPECIALTY_COLORS[spec].primary,
          backgroundColor: SPECIALTY_COLORS[spec].light,
          borderWidth: 2.5,
          pointRadius: 5,
          tension: 0.35,
          fill: false
        });
      });
    } else if (activeSpec !== 'all' && activeRegion === 'all') {
      // One line per geo for the selected specialty
      geos.forEach(geo => {
        datasets.push({
          label: `${activeSpec} – ${geo}`,
          data: years.map(y => CUBE_DATA.get(y, activeSpec, geo)),
          borderColor: GEO_COLORS[geo],
          backgroundColor: GEO_COLORS[geo] + '22',
          borderWidth: 2.5,
          pointRadius: 5,
          tension: 0.35,
          fill: false
        });
      });
    } else if (activeSpec === 'all' && activeRegion !== 'all') {
      // One line per specialty for the selected geo
      specs.forEach(spec => {
        datasets.push({
          label: `${spec} – ${activeRegion}`,
          data: years.map(y => CUBE_DATA.get(y, spec, activeRegion)),
          borderColor: SPECIALTY_COLORS[spec].primary,
          backgroundColor: SPECIALTY_COLORS[spec].light,
          borderWidth: 2.5,
          pointRadius: 5,
          tension: 0.35,
          fill: false
        });
      });
    } else {
      // Single line
      datasets.push({
        label: `${activeSpec} – ${activeRegion}`,
        data: years.map(y => CUBE_DATA.get(y, activeSpec, activeRegion)),
        borderColor: SPECIALTY_COLORS[activeSpec].primary,
        backgroundColor: SPECIALTY_COLORS[activeSpec].light,
        borderWidth: 3,
        pointRadius: 6,
        tension: 0.35,
        fill: true
      });
    }
    return datasets;
  }

  function renderTrendChart() {
    const trendEl = document.getElementById('trendChart');
    if (!trendEl) return;
    const ctx = trendEl.getContext('2d');
    const datasets = buildTrendDatasets();

    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: 'line',
      data: { labels: years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              boxWidth: 14,
              padding: 16,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
            borderColor: '#3b82f6',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} mil`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b', font: { family: 'Inter' } },
            title: {
              display: true,
              text: 'Año (Dimensión Tiempo)',
              color: '#f59e0b',
              font: { family: 'Inter', size: 12, weight: '600' }
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter' },
              callback: v => v + ' mil'
            },
            title: {
              display: true,
              text: 'Prof. TI Desempleados (miles)',
              color: '#ec4899',
              font: { family: 'Inter', size: 12, weight: '600' }
            }
          }
        }
      }
    });
  }

  // Filter buttons (only attach if elements exist in current HTML)
  const regionFilterEl = document.getElementById('regionFilter');
  if (regionFilterEl) {
    regionFilterEl.addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      document.querySelectorAll('#regionFilter .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeRegion = pill.dataset.region;
      renderTrendChart();
    });
  }

  const specFilterEl = document.getElementById('specFilter');
  if (specFilterEl) {
    specFilterEl.addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      document.querySelectorAll('#specFilter .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeSpec = pill.dataset.spec;
      renderTrendChart();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. HEATMAP
  // ─────────────────────────────────────────────────────────────────────────
  function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;
    container.innerHTML = '';

    // Find global min/max
    let minV = Infinity, maxV = -Infinity;
    years.forEach(y => specs.forEach(s => geos.forEach(g => {
      const v = CUBE_DATA.get(y, s, g);
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    })));

    function toColor(v) {
      const t = (v - minV) / (maxV - minV);
      // dark-blue → bright-blue → cyan
      const r = Math.round(t * 6);
      const gr = Math.round(130 + t * 125);
      const b  = Math.round(246 - t * 50);
      return `rgb(${r},${gr},${b})`;
    }

    // One block per year
    years.forEach(year => {
      const block = document.createElement('div');
      block.className = 'hm-year-block';

      const yearLabel = document.createElement('div');
      yearLabel.className = 'hm-year-label';
      yearLabel.textContent = year;
      block.appendChild(yearLabel);

      const grid = document.createElement('div');
      grid.className = 'hm-grid';

      // Geo headers
      const cornerCell = document.createElement('div');
      cornerCell.className = 'hm-cell hm-header';
      cornerCell.textContent = '';
      grid.appendChild(cornerCell);

      geos.forEach(g => {
        const th = document.createElement('div');
        th.className = 'hm-cell hm-geo-header';
        th.textContent = g;
        grid.appendChild(th);
      });

      // Data rows
      specs.forEach(spec => {
        const th = document.createElement('div');
        th.className = 'hm-cell hm-spec-header';
        th.style.borderLeft = `3px solid ${SPECIALTY_COLORS[spec].primary}`;
        th.textContent = spec;
        grid.appendChild(th);

        geos.forEach(geo => {
          const v   = CUBE_DATA.get(year, spec, geo);
          const t   = (v - minV) / (maxV - minV);
          const bg  = toColor(v);
          const fg  = t > 0.55 ? '#0f172a' : '#e2e8f0';
          const cell = document.createElement('div');
          cell.className = 'hm-cell hm-data';
          cell.style.background = bg;
          cell.style.color = fg;
          cell.innerHTML = `<span class="hm-val">${v}</span>`;
          cell.title = `${year} · ${spec} · ${geo}: ${v} mil`;
          grid.appendChild(cell);
        });
      });

      block.appendChild(grid);
      container.appendChild(block);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. INIT — renderDataPanel is called at the END of the IIFE (after
  //           PANEL_CONFIG and all panel builder functions are defined)
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // 8. PDF EXPORT MODULE
  // ─────────────────────────────────────────────────────────────────────────
  let cubeTheme = 'dark';
  let cubeMode = 'base';

  /**
   * Builds a clean HTML table for the PDF modal (no bars, pure numeric).
   * @param {string} year
   * @returns {string} HTML string
   */
  function buildPdfTable(year) {
    const data    = CUBE_DATA.getLayer(year);
    const figMap  = { '2022': '1a', '2023': '1b', '2024': '1c', '2025': '1d' };
    const colTotals = {};
    geos.forEach(g => { colTotals[g] = 0; });
    let grandTotal = 0;

    let rows = '';
    specs.forEach((spec, si) => {
      let rowTotal = 0;
      const cells = geos.map(g => {
        const v = data[spec][g];
        rowTotal += v;
        colTotals[g] += v;
        return `<td class="pdf-td-num">${v}</td>`;
      }).join('');
      grandTotal += rowTotal;
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${dot}">${spec}</td>
        ${cells}
        <td class="pdf-td-total">${rowTotal}</td>
      </tr>`;
    });

    const footCells = geos.map(g => `<td class="pdf-td-total">${colTotals[g]}</td>`).join('');

    return `
      <div class="pdf-table-block">
        <div class="pdf-table-caption">
          Figura ${figMap[year]}. Capa del cubo – Año ${year}
          <span class="pdf-table-unit">(miles de profesionales TI desempleados)</span>
        </div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th class="pdf-th-spec">Especialidad TI</th>
              ${geos.map(g => `<th class="pdf-th-num">${g}</th>`).join('')}
              <th class="pdf-th-total">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td class="pdf-td-spec pdf-foot-label">Total</td>
              ${footCells}
              <td class="pdf-td-total pdf-grand">${grandTotal}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }

  /**
   * Builds the consolidated specialty × year summary table.
   */
  function buildPdfSummaryTable() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      const yearTotals = years.map(y =>
        geos.reduce((sum, g) => sum + CUBE_DATA.get(y, spec, g), 0)
      );
      const grandRow = yearTotals.reduce((a, b) => a + b, 0);
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${dot}">${spec}</td>
        ${yearTotals.map(v => `<td class="pdf-td-num">${v}</td>`).join('')}
        <td class="pdf-td-total">${grandRow}</td>
      </tr>`;
    });

    // Grand totals column
    const yearGrandTotals = years.map(y =>
      specs.reduce((sum, s) => sum + geos.reduce((ss, g) => ss + CUBE_DATA.get(y, s, g), 0), 0)
    );
    const allGrand = yearGrandTotals.reduce((a, b) => a + b, 0);

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec">Especialidad TI</th>
            ${years.map(y => `<th class="pdf-th-num">${y}</th>`).join('')}
            <th class="pdf-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total</td>
            ${yearGrandTotals.map(v => `<td class="pdf-td-total">${v}</td>`).join('')}
            <td class="pdf-td-total pdf-grand">${allGrand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  /**
   * Builds the consolidated Roll-Up table (Macro-category × year).
   */
  function buildPdfRollupTable() {
    const categories = [
      { name: 'Ingeniería y Desarrollo', specs: [0, 3], color: '#3b82f6' },
      { name: 'Datos y Soporte', specs: [1, 2], color: '#06b6d4' }
    ];

    let rows = '';
    categories.forEach(cat => {
      const yearTotals = years.map(y => {
        return cat.specs.reduce((sum, si) => {
          return sum + geos.reduce((s, g) => s + CUBE_DATA.get(y, specs[si], g), 0);
        }, 0);
      });
      const grandRow = yearTotals.reduce((a, b) => a + b, 0);
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${cat.color}">${cat.name}</td>
        ${yearTotals.map(v => `<td class="pdf-td-num">${v}</td>`).join('')}
        <td class="pdf-td-total">${grandRow}</td>
      </tr>`;
    });

    const yearGrandTotals = years.map(y => {
      return categories.reduce((sumCat, cat) => {
        return sumCat + cat.specs.reduce((sumSpec, si) => {
          return sumSpec + geos.reduce((s, g) => s + CUBE_DATA.get(y, specs[si], g), 0);
        }, 0);
      }, 0);
    });
    const allGrand = yearGrandTotals.reduce((a, b) => a + b, 0);

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec">Macro-Categoría TI</th>
            ${years.map(y => `<th class="pdf-th-num">${y}</th>`).join('')}
            <th class="pdf-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total Consolidado</td>
            ${yearGrandTotals.map(v => `<td class="pdf-td-total">${v}</td>`).join('')}
            <td class="pdf-td-total pdf-grand">${allGrand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  /**
   * Builds the consolidated Drill-Down table (Specialty × Semester for 2024).
   */
  function buildPdfDrilldownTable() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      const sem1Val = DRILLDOWN_2024[spec]['1er Semestre 2024'];
      const sem2Val = DRILLDOWN_2024[spec]['2do Semestre 2024'];
      const totalRow = sem1Val + sem2Val;
      
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${dot}">${spec}</td>
        <td class="pdf-td-num">${sem1Val}</td>
        <td class="pdf-td-num">${sem2Val}</td>
        <td class="pdf-td-total">${totalRow}</td>
      </tr>`;
    });

    const totSem1 = specs.reduce((sum, s) => sum + DRILLDOWN_2024[s]['1er Semestre 2024'], 0);
    const totSem2 = specs.reduce((sum, s) => sum + DRILLDOWN_2024[s]['2do Semestre 2024'], 0);
    const grand = totSem1 + totSem2;

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec">Especialidad TI</th>
            <th class="pdf-th-num">1er Semestre 2024</th>
            <th class="pdf-th-num">2do Semestre 2024</th>
            <th class="pdf-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total</td>
            <td class="pdf-td-total">${totSem1}</td>
            <td class="pdf-td-total">${totSem2}</td>
            <td class="pdf-td-total pdf-grand">${grand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  /**
   * Builds the consolidated geography × year summary table.
   */
  function buildPdfRegionTable() {
    let rows = '';
    const geoColors = { 'CDMX': '#f59e0b', 'Jalisco': '#ec4899', 'Nuevo León': '#6366f1' };

    geos.forEach(geo => {
      const yearTotals = years.map(y =>
        specs.reduce((sum, s) => sum + CUBE_DATA.get(y, s, geo), 0)
      );
      const grandRow = yearTotals.reduce((a, b) => a + b, 0);
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${geoColors[geo]}">${geo}</td>
        ${yearTotals.map(v => `<td class="pdf-td-num">${v}</td>`).join('')}
        <td class="pdf-td-total">${grandRow}</td>
      </tr>`;
    });

    const yearGrandTotals = years.map(y =>
      geos.reduce((sum, g) => sum + specs.reduce((ss, s) => ss + CUBE_DATA.get(y, s, g), 0), 0)
    );
    const allGrand = yearGrandTotals.reduce((a, b) => a + b, 0);

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec">Región (Geografía)</th>
            ${years.map(y => `<th class="pdf-th-num">${y}</th>`).join('')}
            <th class="pdf-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total</td>
            ${yearGrandTotals.map(v => `<td class="pdf-td-total">${v}</td>`).join('')}
            <td class="pdf-td-total pdf-grand">${allGrand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  /**
   * Builds the consolidated Pivoteo 2 table (specialty × geography).
   */
  function buildPdfPivot2Table() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      let rowTotal = 0;
      const cells = geos.map(g => {
        const v = years.reduce((sum, y) => sum + CUBE_DATA.get(y, spec, g), 0);
        rowTotal += v;
        return `<td class="pdf-td-num">${v}</td>`;
      }).join('');
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${dot}">${spec}</td>
        ${cells}
        <td class="pdf-td-total">${rowTotal}</td>
      </tr>`;
    });

    const colTotals = geos.map(g => 
      specs.reduce((sum, s) => sum + years.reduce((ss, y) => ss + CUBE_DATA.get(y, s, g), 0), 0)
    );
    const grand = colTotals.reduce((a, b) => a + b, 0);

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec">Especialidad TI</th>
            ${geos.map(g => `<th class="pdf-th-num">${g}</th>`).join('')}
            <th class="pdf-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total</td>
            ${colTotals.map(v => `<td class="pdf-td-total">${v}</td>`).join('')}
            <td class="pdf-td-total pdf-grand">${grand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  /**
   * Builds the consolidated Dice table (specialty × geography × year).
   */
  function buildPdfDiceTable() {
    const diceYears = ['2024', '2025'];
    const diceGeos = ['CDMX', 'Jalisco'];
    const diceSpecs = ['Desarrollo de Software', 'Análisis de Datos'];

    let rows = '';
    diceSpecs.forEach((spec, si) => {
      const dot = si === 0 ? '#3b82f6' : '#8b5cf6';
      let rowTotal = 0;
      
      let cells = '';
      diceYears.forEach(y => {
        diceGeos.forEach(g => {
          const v = CUBE_DATA.get(y, spec, g);
          rowTotal += v;
          cells += `<td class="pdf-td-num">${v}</td>`;
        });
      });

      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${dot}">${spec}</td>
        ${cells}
        <td class="pdf-td-total">${rowTotal}</td>
      </tr>`;
    });

    // Col totals
    let colCells = '';
    let grand = 0;
    diceYears.forEach(y => {
      diceGeos.forEach(g => {
        const colTotal = diceSpecs.reduce((sum, s) => sum + CUBE_DATA.get(y, s, g), 0);
        grand += colTotal;
        colCells += `<td class="pdf-td-total">${colTotal}</td>`;
      });
    });

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec" rowspan="2" style="vertical-align: middle;">Especialidad TI</th>
            <th class="pdf-th-num" colspan="2" style="text-align: center;">Año 2024</th>
            <th class="pdf-th-num" colspan="2" style="text-align: center;">Año 2025</th>
            <th class="pdf-th-total" rowspan="2" style="vertical-align: middle;">Total</th>
          </tr>
          <tr>
            <th class="pdf-th-num">CDMX</th>
            <th class="pdf-th-num">Jalisco</th>
            <th class="pdf-th-num">CDMX</th>
            <th class="pdf-th-num">Jalisco</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total</td>
            ${colCells}
            <td class="pdf-td-total pdf-grand">${grand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  /**
   * Builds the consolidated Slice table (specialty × year 2024).
   */
  function buildPdfSliceTable() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      // Sum of all geos for this spec in 2024
      const val = geos.reduce((sum, g) => sum + CUBE_DATA.get('2024', spec, g), 0);
      rows += `<tr>
        <td class="pdf-td-spec" style="border-left:4px solid ${dot}">${spec}</td>
        <td class="pdf-td-num">${val}</td>
      </tr>`;
    });

    const grand = specs.reduce((sum, s) => sum + geos.reduce((ss, g) => ss + CUBE_DATA.get('2024', s, g), 0), 0);

    return `
      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-th-spec">Especialidad TI</th>
            <th class="pdf-th-num">Desempleados TI — Año 2024 (miles)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td class="pdf-td-spec pdf-foot-label">Total Slice (Año 2024)</td>
            <td class="pdf-td-total pdf-grand">${grand}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. DYNAMIC DATA PANEL — screen table for each cube mode
  // ─────────────────────────────────────────────────────────────────────────

  function buildPanelTable_Base() {
    return `
      <div class="year-tabs">
        ${years.map((y, i) => `<button class="year-tab${i === 0 ? ' active' : ''}" data-year="${y}">${y}</button>`).join('')}
      </div>
      <div class="layer-container">
        <div class="layer-header">
          <span class="layer-icon">📊</span>
          <span id="layerTitle">Figura 1a. Capa del cubo – Año 2022</span>
          <span class="layer-unit">(miles de profesionales TI desempleados)</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table" id="dataTable">
            <thead><tr>
              <th class="th-specialty">Especialidad TI</th>
              ${geos.map(g => `<th>${g}</th>`).join('')}
              <th class="th-total">Total</th>
            </tr></thead>
            <tbody id="tableBody"></tbody>
            <tfoot id="tableFoot"></tfoot>
          </table>
        </div>
        <div class="sparkline-section">
          <h4 class="spark-title">Distribución por especialidad (<span id="sparkYear">2022</span>)</h4>
          <div class="sparklines" id="sparklines"></div>
        </div>
      </div>`;
  }

  function buildPanelTable_Pivot1() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      const yt = years.map(y => geos.reduce((s, g) => s + CUBE_DATA.get(y, spec, g), 0));
      const rt = yt.reduce((a, b) => a + b, 0);
      rows += `<tr><td class="td-specialty"><span class="spec-dot" style="background:${dot}"></span>${spec}</td>${yt.map(v => `<td class="td-value">${v}</td>`).join('')}<td class="td-total">${rt}</td></tr>`;
    });
    const ygt = years.map(y => specs.reduce((s, sp) => s + geos.reduce((ss, g) => ss + CUBE_DATA.get(y, sp, g), 0), 0));
    const grand = ygt.reduce((a, b) => a + b, 0);
    return `<div class="table-wrapper"><table class="data-table">
      <thead><tr><th class="th-specialty">Especialidad TI</th>${years.map(y => `<th>${y}</th>`).join('')}<th class="th-total">Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td class="td-specialty total-label">Total</td>${ygt.map(v => `<td class="td-value td-total">${v}</td>`).join('')}<td class="td-total grand-total">${grand}</td></tr></tfoot>
    </table></div>`;
  }

  function buildPanelTable_Pivot2() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      let rt = 0;
      const cells = geos.map(g => { const v = years.reduce((s, y) => s + CUBE_DATA.get(y, spec, g), 0); rt += v; return `<td class="td-value">${v}</td>`; }).join('');
      rows += `<tr><td class="td-specialty"><span class="spec-dot" style="background:${dot}"></span>${spec}</td>${cells}<td class="td-total">${rt}</td></tr>`;
    });
    const ct = geos.map(g => specs.reduce((s, sp) => s + years.reduce((ss, y) => ss + CUBE_DATA.get(y, sp, g), 0), 0));
    const grand = ct.reduce((a, b) => a + b, 0);
    return `<div class="table-wrapper"><table class="data-table">
      <thead><tr><th class="th-specialty">Especialidad TI</th>${geos.map(g => `<th>${g}</th>`).join('')}<th class="th-total">Total Especialidad</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td class="td-specialty total-label">TOTAL REGIONAL</td>${ct.map(v => `<td class="td-value td-total">${v}</td>`).join('')}<td class="td-total grand-total">${grand}</td></tr></tfoot>
    </table></div>`;
  }

  function buildPanelTable_Rollup() {
    const cats = [
      { name: 'Ingeniería y Desarrollo', indices: [0, 3], color: '#3b82f6' },
      { name: 'Datos y Soporte',         indices: [1, 2], color: '#06b6d4' }
    ];
    let rows = '';
    cats.forEach(cat => {
      const yt = years.map(y => cat.indices.reduce((s, si) => s + geos.reduce((ss, g) => ss + CUBE_DATA.get(y, specs[si], g), 0), 0));
      const rt = yt.reduce((a, b) => a + b, 0);
      rows += `<tr><td class="td-specialty"><span class="spec-dot" style="background:${cat.color}"></span>${cat.name}</td>${yt.map(v => `<td class="td-value">${v}</td>`).join('')}<td class="td-total">${rt}</td></tr>`;
    });
    const ygt = years.map(y => cats.reduce((s, cat) => s + cat.indices.reduce((ss, si) => ss + geos.reduce((sss, g) => sss + CUBE_DATA.get(y, specs[si], g), 0), 0), 0));
    const grand = ygt.reduce((a, b) => a + b, 0);
    return `<div class="table-wrapper"><table class="data-table">
      <thead><tr><th class="th-specialty">Macro-Categoría TI</th>${years.map(y => `<th>${y}</th>`).join('')}<th class="th-total">Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td class="td-specialty total-label">Total Consolidado</td>${ygt.map(v => `<td class="td-value td-total">${v}</td>`).join('')}<td class="td-total grand-total">${grand}</td></tr></tfoot>
    </table></div>`;
  }

  function buildPanelTable_Drilldown() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      const s1 = DRILLDOWN_2024[spec]['1er Semestre 2024'];
      const s2 = DRILLDOWN_2024[spec]['2do Semestre 2024'];
      rows += `<tr><td class="td-specialty"><span class="spec-dot" style="background:${dot}"></span>${spec}</td><td class="td-value">${s1}</td><td class="td-value">${s2}</td><td class="td-total">${s1 + s2}</td></tr>`;
    });
    const t1 = specs.reduce((s, sp) => s + DRILLDOWN_2024[sp]['1er Semestre 2024'], 0);
    const t2 = specs.reduce((s, sp) => s + DRILLDOWN_2024[sp]['2do Semestre 2024'], 0);
    return `<div class="table-wrapper"><table class="data-table">
      <thead><tr><th class="th-specialty">Especialidad TI</th><th>1er Semestre 2024</th><th>2do Semestre 2024</th><th class="th-total">Total Anual</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td class="td-specialty total-label">Total</td><td class="td-value td-total">${t1}</td><td class="td-value td-total">${t2}</td><td class="td-total grand-total">${t1 + t2}</td></tr></tfoot>
    </table></div>`;
  }

  function buildPanelTable_Dice() {
    const dY = ['2024','2025'], dG = ['CDMX','Jalisco'], dS = ['Desarrollo de Software','Análisis de Datos'];
    let rows = '';
    dS.forEach((spec, si) => {
      const dot = si === 0 ? '#3b82f6' : '#8b5cf6';
      let cells = '', rt = 0;
      dY.forEach(y => dG.forEach(g => { const v = CUBE_DATA.get(y, spec, g); rt += v; cells += `<td class="td-value">${v}</td>`; }));
      rows += `<tr><td class="td-specialty"><span class="spec-dot" style="background:${dot}"></span>${spec}</td>${cells}<td class="td-total">${rt}</td></tr>`;
    });
    let colCells = '', grand = 0;
    dY.forEach(y => dG.forEach(g => { const ct = dS.reduce((s, sp) => s + CUBE_DATA.get(y, sp, g), 0); grand += ct; colCells += `<td class="td-value td-total">${ct}</td>`; }));
    return `<div class="table-wrapper"><table class="data-table">
      <thead>
        <tr><th class="th-specialty" rowspan="2" style="vertical-align:middle">Especialidad TI</th><th colspan="2" style="text-align:center">Año 2024</th><th colspan="2" style="text-align:center">Año 2025</th><th class="th-total" rowspan="2" style="vertical-align:middle">Total Subcubo</th></tr>
        <tr><th>CDMX</th><th>Jalisco</th><th>CDMX</th><th>Jalisco</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td class="td-specialty total-label">TOTAL MARGINAL</td>${colCells}<td class="td-total grand-total">${grand}</td></tr></tfoot>
    </table></div>`;
  }

  function buildPanelTable_Slice() {
    let rows = '';
    specs.forEach((spec, si) => {
      const dot = ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][si];
      const val = geos.reduce((s, g) => s + CUBE_DATA.get('2024', spec, g), 0);
      rows += `<tr><td class="td-specialty"><span class="spec-dot" style="background:${dot}"></span>${spec}</td><td class="td-value">${val}</td></tr>`;
    });
    const grand = specs.reduce((s, sp) => s + geos.reduce((ss, g) => ss + CUBE_DATA.get('2024', sp, g), 0), 0);
    return `<div class="table-wrapper"><table class="data-table">
      <thead><tr><th class="th-specialty">Especialidad TI</th><th>Desempleados TI — Año 2024 (CDMX + Jalisco + Nuevo León, en miles)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td class="td-specialty total-label">Total Slice (Año 2024)</td><td class="td-total grand-total">${grand}</td></tr></tfoot>
    </table></div>`;
  }

  const PANEL_CONFIG = {
    base:      { badge: 'Inciso a)',   icon: '◧', label: 'Cubo de Datos Base — Capas Anuales',              title: 'Cubo de Datos Base',                                           desc: `El cubo está definido por tres dimensiones: <strong>Tiempo</strong> (2022–2025), <strong>Geografía</strong> (CDMX, Jalisco, Nuevo León) y <strong>Especialidad TI</strong>. El hecho medido es la cantidad de profesionales TI desempleados <em>(miles de personas)</em>.`,                                                                                                                                                                                                                              buildTable: buildPanelTable_Base      },
    pivot1:    { badge: 'Inciso b/c)', icon: '⧉', label: 'Pivoteo 1 — Especialidad TI × Año',               title: 'Pivoteo 1 — Especialidad TI vs. Año (Suma de Regiones)',        desc: `El <strong>Pivoteo 1</strong> reorganiza el cubo colocando las especialidades TI en filas y los años en columnas, acumulando los valores de las tres regiones (CDMX + Jalisco + Nuevo León). Permite comparar la evolución temporal del desempleo por perfil profesional. Total: <strong>7,945</strong>.`,                                                                                                                                                                                                    buildTable: buildPanelTable_Pivot1    },
    pivot2:    { badge: 'Inciso f)',   icon: '⧉', label: 'Cross-Tabulation — Especialidad TI × Geografía',  title: 'Cross-Tabulation (Pivoteo 2) — Especialidad TI × Geografía',   desc: `La <strong>Cross-Tabulation</strong> presenta las especialidades TI (filas) vs. regiones geográficas (columnas), sumando los cuatro años (2022–2025). Incluye totales marginales por especialidad y por región, y el gran total de <strong>7,945</strong>.`,                                                                                                                                                                                                                                                   buildTable: buildPanelTable_Pivot2    },
    rollup:    { badge: 'Inciso d)',   icon: '⧉', label: 'Roll-Up — Macro-Categorías de TI',                 title: 'Roll-Up sobre Especialidades de TI',                            desc: `La operación <strong>Roll-Up</strong> asciende en la jerarquía de Especialidad TI agrupando en dos macro-categorías: <strong>Ingeniería y Desarrollo</strong> (Software + Redes) y <strong>Datos y Soporte</strong> (Soporte Téc. + Análisis). Total: <strong>7,945</strong>.`,                                                                                                                                                                                                                                buildTable: buildPanelTable_Rollup    },
    drilldown: { badge: 'Inciso e)',   icon: '⧉', label: 'Drill-Down — Semestres del Año 2024',              title: 'Drill-Down sobre la Dimensión Tiempo',                          desc: `La operación <strong>Drill-Down</strong> desciende del nivel anual al <strong>semestral</strong> en el año 2024, permitiendo detectar estacionalidad intranual y planear ciclos de contratación. Total 2024: <strong>2,115</strong>.`,                                                                                                                                                                                                                                                                            buildTable: buildPanelTable_Drilldown },
    dice:      { badge: 'Inciso g)',   icon: '⧉', label: 'Dice — Subcubo 2×2×2',                             title: 'Operación Dice (Subcubo de 2×2×2)',                              desc: `La operación <strong>Dice</strong> extrae un subcubo 2×2×2: Tiempo {2024, 2025} × Geografía {CDMX, Jalisco} × Especialidad {Desarrollo de Software, Análisis de Datos}. Se concentra en las especialidades críticas en las dos regiones de mayor volumen laboral. Total subcubo: <strong>1,875</strong>.`,                                                                                                                                                                                                  buildTable: buildPanelTable_Dice      },
    slice:     { badge: 'Inciso h)',   icon: '⧉', label: 'Slice — Corte para Año 2024',                      title: 'Slice (usando Pivoteo 1)',                                       desc: `La operación <strong>Slice</strong> fija Año = 2024 en la dimensión Tiempo, generando una vista bidimensional que muestra la distribución del desempleo por especialidad TI acumulando los tres estados. Total slice: <strong>2,115</strong>.`,                                                                                                                                                                                                                                                                 buildTable: buildPanelTable_Slice     }
  };

  function renderDataPanel(mode) {
    const section = document.getElementById('dynamicDataSection');
    if (!section) return;
    const cfg = PANEL_CONFIG[mode] || PANEL_CONFIG.base;
    section.innerHTML = `
      <div class="olap-section">
        <div class="section-label">
          <span class="section-icon">${cfg.icon}</span>
          ${cfg.label}
        </div>
        <div class="olap-container">
          <div class="olap-desc-block">
            <div class="olap-badge">${cfg.badge}</div>
            <h3 class="olap-title">${cfg.title}</h3>
            <p class="olap-text">${cfg.desc}</p>
          </div>
          <div class="olap-table-block">
            ${cfg.buildTable()}
          </div>
        </div>
      </div>`;
    if (mode === 'base') {
      document.querySelectorAll('.year-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentYear = btn.dataset.year;
          renderTable(btn.dataset.year);
        });
      });
      renderTable(currentYear || '2022');
    }
  }

  /**
   * Captures the canvas and returns a data URL.
   */
  function captureCubeImage(theme = 'light', mode = cubeMode) {
    const canvas = document.getElementById('cubeCanvas');
    if (!canvas) return null;
    
    // Switch to target theme and mode temporarily
    if (window.renderOLAPCube) {
      window.renderOLAPCube(theme, mode);
    }
    
    let imgUrl = null;
    try {
      imgUrl = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Canvas capture failed:', e);
    }
    
    // Restore the screen theme and mode
    if (window.renderOLAPCube) {
      window.renderOLAPCube(cubeTheme, cubeMode);
    }
    
    return imgUrl;
  }

  /**
   * Opens the export modal and populates all data.
   */
  function openExportModal() {
    // Set date
    const now = new Date();
    document.getElementById('pdfDate').textContent =
      now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    // Capture cube image in light mode for the PDF
    const img = document.getElementById('pdfCubeImg');
    const imgUrl = captureCubeImage('light', cubeMode);
    if (imgUrl) {
      img.src = imgUrl;
      img.style.display = 'block';
      // Show download button
      const dlBtn = document.getElementById('btnDownloadImg');
      dlBtn.style.display = 'inline-flex';
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = 'cubo_datos_olap_3d.png';
        a.click();
      };
    } else {
      img.style.display = 'none';
      img.parentElement.innerHTML +=
        '<p style="color:#64748b;font-style:italic;margin-top:8px;">ℹ El cubo 3D se renderiza en tiempo real. Para incluirlo en el PDF, utiliza la herramienta de captura de pantalla de tu sistema operativo (Win+Shift+S).</p>';
    }

    // Build tables grid (4 annual layers)
    const tablesGrid = document.getElementById('pdfTablesGrid');
    tablesGrid.innerHTML = years.map(y => buildPdfTable(y)).join('');

    // Consolidated tables
    document.getElementById('pdfSummaryTable').innerHTML = buildPdfSummaryTable();
    document.getElementById('pdfRollupTable').innerHTML  = buildPdfRollupTable();
    document.getElementById('pdfDrilldownTable').innerHTML = buildPdfDrilldownTable();
    document.getElementById('pdfPivot2Table').innerHTML   = buildPdfPivot2Table();
    document.getElementById('pdfDiceTable').innerHTML     = buildPdfDiceTable();
    document.getElementById('pdfSliceTable').innerHTML    = buildPdfSliceTable();
    document.getElementById('pdfRegionTable').innerHTML  = buildPdfRegionTable();

    // Show modal
    document.getElementById('exportModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    document.body.style.overflow = '';
  }

  // ── Event wiring ────────────────────────────────────────────────────────
  document.getElementById('btnOpenExport').addEventListener('click', openExportModal);
  document.getElementById('btnCloseModal').addEventListener('click', closeExportModal);

  const btnToggleTheme = document.getElementById('btnToggleTheme');
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      cubeTheme = cubeTheme === 'dark' ? 'light' : 'dark';
      if (window.renderOLAPCube) {
        window.renderOLAPCube(cubeTheme, cubeMode);
      }
    });
  }

  // Cube mode buttons (Base, Pivoteo 1, Pivoteo 2)
  document.querySelectorAll('.ctrl-btn-cube').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ctrl-btn-cube').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cubeMode = btn.dataset.mode;
      if (window.renderOLAPCube) {
        window.renderOLAPCube(cubeTheme, cubeMode);
      }
      renderDataPanel(cubeMode);
    });
  });

  document.getElementById('btnCaptureCube').addEventListener('click', () => {
    const imgUrl = captureCubeImage(cubeTheme, cubeMode);
    if (imgUrl) {
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = 'cubo_datos_olap_3d.png';
      a.click();
    } else {
      alert('Para capturar el cubo, usa Win+Shift+S (Recorte de pantalla de Windows).');
    }
  });

  document.getElementById('btnPrint').addEventListener('click', () => {
    window.print();
  });

  // Close on overlay click
  document.getElementById('exportModal').addEventListener('click', e => {
    if (e.target === document.getElementById('exportModal')) closeExportModal();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INIT — boot the dynamic panel (must run after PANEL_CONFIG is defined)
  // ─────────────────────────────────────────────────────────────────────────
  renderDataPanel('base');

})();
