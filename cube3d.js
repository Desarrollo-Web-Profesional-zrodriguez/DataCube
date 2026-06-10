/**
 * cube3d.js — OLAP Cube Canvas 2D Renderer
 * ==========================================
 * Visualización de cubo OLAP en proyección oblicua (cabinet).
 * Estilo idéntico al diagrama de referencia:
 *   · Tres ejes etiquetados: Tiempo(X), Geografía(Y), Especialidad TI(Z)
 *   · Tres caras visibles con datos reales del CUBE_DATA
 *   · Mini gráfica de barras + valor numérico en cada celda
 *   · Conectores con puntos y líneas punteadas a los rótulos
 *
 * Cara FRONTAL (zi=0, Desarrollo de Software): Tiempo × Geografía
 * Cara SUPERIOR (yi=nY, Nuevo León):           Tiempo × Especialidad
 * Cara DERECHA  (xi=nX, Año 2025):             Geografía × Especialidad
 */
(function () {
  'use strict';

  const canvas = document.getElementById('cubeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ─────────────────────────────────── Data refs ─────────────────────── */
  const years = CUBE_DATA.dimensions.time.members;       // 4
  const geos  = CUBE_DATA.dimensions.geography.members;  // 3
  const specs = CUBE_DATA.dimensions.specialty.members;  // 4
  const nX = years.length, nY = geos.length, nZ = specs.length;

  /* Short specialty labels */
  const SPEC_SHORT = [
    'Des. Software',
    'Soporte Téc.',
    'Análisis Datos',
    'Redes y Telecom.'
  ];

  /* Layout variables (computed in render) */
  let CW, CH, DX, DY, OX, OY;
  let currentTheme = 'dark';
  let currentMode = 'base';

  /* ─────────────────────────────── Projection ──────────────────────── */
  /**
   * 3-D integer coordinates → 2-D canvas pixel.
   * xi: time index,  yi: geography index,  zi: specialty index
   */
  function p(xi, yi, zi) {
    return {
      x: OX + xi * CW + zi * DX,
      y: OY - yi * CH - zi * DY
    };
  }

  /* ───────────────────────────── Draw helpers ─────────────────────── */
  function poly(pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill)   { ctx.fillStyle = fill;     ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  /* Modified ln to accept dynamic dash */
  function ln(a, b, col, lw, dash) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash || []);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
    ctx.restore();
  }

  function arrowHead(to, nx, ny, size, col) {
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - nx * size - ny * size * 0.4, to.y - ny * size + nx * size * 0.4);
    ctx.lineTo(to.x - nx * size + ny * size * 0.4, to.y - ny * size - nx * size * 0.4);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }

  function arrow(from, to, col, lw) {
    ln(from, to, col, lw || 2);
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len) arrowHead(to, dx / len, dy / len, 9, col);
  }

  function dot(pt, col, r) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r || 3.5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  }

  function connector(cubePoint, labelX, labelY, col) {
    ln(cubePoint, { x: labelX, y: labelY }, col + '88', 1, [4, 4]);
    dot(cubePoint, col, 3.5);
  }

  /* ─────────────────────── Mini bar chart inside a cell ────────────── */
  function drawBars(cellX, cellY, cellW, cellH, col) {
    const nBars   = 3;
    const bw      = Math.max(3, cellW * 0.07);
    const bGap    = bw * 0.8;
    const startX  = cellX + cellW * 0.08;
    const baseY   = cellY + cellH * 0.82;
    const maxH    = cellH * 0.58;
    const ratios  = [0.6, 1.0, 0.75];

    ratios.forEach((r, i) => {
      const bh = maxH * r;
      ctx.fillStyle = col + 'bb';
      ctx.fillRect(startX + i * (bw + bGap), baseY - bh, bw, bh);
    });
  }

  /* ─────────────────────────────── Main render ────────────────────── */
  function render(theme, mode) {
    if (theme && (theme === 'dark' || theme === 'light')) {
      currentTheme = theme;
    }
    if (mode && (mode === 'base' || mode === 'pivot1' || mode === 'pivot2' || mode === 'rollup' || mode === 'drilldown' || mode === 'dice' || mode === 'slice')) {
      currentMode = mode;
    }
    const isLight = (currentTheme === 'light');
    const activeCubeMode = currentMode;

    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;

    canvas.width  = Math.round(W * devicePixelRatio);
    canvas.height = Math.round(H * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Draw background
    if (isLight) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#070f1e';
      ctx.fillRect(0, 0, W, H);
    }

    /* Colors based on theme (Darkened for light theme/Word print high contrast) */
    const TIME_C  = isLight ? '#b45309' : '#f59e0b';
    const GEO_C   = isLight ? '#be185d' : '#ec4899';
    const SPEC_AC = isLight ? '#6d28d9' : '#a78bfa';
    const SPEC_C  = isLight 
      ? ['#1d4ed8', '#0e7490', '#6d28d9', '#059669'] 
      : ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'];

    const CAGE = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(90,150,255,0.20)';
    const BC = isLight ? 'rgba(29,78,216,0.80)' : 'rgba(130,190,255,0.95)';
    const wallBack = isLight ? 'rgba(241,245,249,0.95)' : 'rgba(4,10,35,0.93)';
    const wallLeft = isLight ? 'rgba(226,232,240,0.72)' : 'rgba(6,15,50,0.72)';
    const wallFloor = isLight ? 'rgba(226,232,240,0.55)' : 'rgba(6,15,50,0.55)';
    const cellTextLight = isLight ? '#1e293b' : '#dde8ff';
    const cellTextFront = isLight ? '#0f172a' : '#ffffff';
    const barColor = isLight ? '#1d4ed8' : '#3b82f6';

    let nX_curr, nY_curr, nZ_curr;
    let colorX, colorY, colorZ;
    let lblX, lblY, lblZ;

    if (activeCubeMode === 'base') {
      nX_curr = nX; // 4 (years)
      nY_curr = nY; // 3 (geos)
      nZ_curr = nZ; // 4 (specs)
      
      colorX = TIME_C;
      colorY = GEO_C;
      colorZ = SPEC_AC;
      
      lblX = 'Tiempo (X)';
      lblY = 'Geografía (Y)';
      lblZ = 'Especialidad TI (Z)';
    } else if (activeCubeMode === 'pivot1') {
      // Rotation: X = specialty, Y = year, Z = geography
      nX_curr = nZ; // 4 (specs)
      nY_curr = nX; // 4 (years)
      nZ_curr = nY; // 3 (geos)
      
      colorX = SPEC_AC;
      colorY = TIME_C;
      colorZ = GEO_C;
      
      lblX = 'Especialidad TI (X)';
      lblY = 'Tiempo (Y)';
      lblZ = 'Geografía (Z)';
    } else if (activeCubeMode === 'pivot2') {
      // Rotation: X = geography, Y = specialty, Z = year
      nX_curr = nY; // 3 (geos)
      nY_curr = nZ; // 4 (specs)
      nZ_curr = nX; // 4 (years)
      
      colorX = GEO_C;
      colorY = SPEC_AC;
      colorZ = TIME_C;
      
      lblX = 'Geografía (X)';
      lblY = 'Especialidad TI (Y)';
      lblZ = 'Tiempo (Z)';
    } else if (activeCubeMode === 'rollup') {
      nX_curr = nX; // 4 (years)
      nY_curr = 2;  // 2 (macro-categories)
      nZ_curr = 1;  // collapsed region
      
      colorX = TIME_C;
      colorY = SPEC_AC;
      colorZ = GEO_C;
      
      lblX = 'Tiempo (X)';
      lblY = 'Macro-Categoría TI (Y)';
      lblZ = 'Geografía (Z)';
    } else if (activeCubeMode === 'drilldown') {
      nX_curr = 2;  // 2 semestres
      nY_curr = nZ; // 4 (specs)
      nZ_curr = 1;  // collapsed region
      
      colorX = TIME_C;
      colorY = SPEC_AC;
      colorZ = GEO_C;
      
      lblX = 'Semestre (X)';
      lblY = 'Especialidad TI (Y)';
      lblZ = 'Geografía (Z)';
    } else if (activeCubeMode === 'dice') {
      nX_curr = 2;  // 2024, 2025
      nY_curr = 2;  // CDMX, Jalisco
      nZ_curr = 2;  // Software, Análisis Datos
      
      colorX = TIME_C;
      colorY = GEO_C;
      colorZ = SPEC_AC;
      
      lblX = 'Tiempo (X)';
      lblY = 'Geografía (Y)';
      lblZ = 'Especialidad TI (Z)';
    } else if (activeCubeMode === 'slice') {
      nX_curr = 1;  // 2024
      nY_curr = nY; // 3 (geos)
      nZ_curr = nZ; // 4 (specs)
      
      colorX = TIME_C;
      colorY = GEO_C;
      colorZ = SPEC_AC;
      
      lblX = 'Tiempo (X)';
      lblY = 'Geografía (Y)';
      lblZ = 'Especialidad TI (Z)';
    }

    let frontTagText;
    if (activeCubeMode === 'base') frontTagText = '▶ Cara frontal: ' + specs[0];
    else if (activeCubeMode === 'pivot1') frontTagText = '▶ Cara frontal: ' + geos[0];
    else if (activeCubeMode === 'pivot2') frontTagText = '▶ Cara frontal: ' + years[0];
    else if (activeCubeMode === 'rollup') frontTagText = '▶ Cara frontal: Ingeniería y Desarrollo';
    else if (activeCubeMode === 'drilldown') frontTagText = '▶ Cara frontal: Especialidades × Semestre (2024)';
    else if (activeCubeMode === 'dice') frontTagText = '▶ Cara frontal: ' + specs[0] + ' (2024)';
    else if (activeCubeMode === 'slice') frontTagText = '▶ Cara frontal: ' + specs[0] + ' (2024)';

    let mainTitleText, subTitleText;
    if (activeCubeMode === 'base') {
      mainTitleText = 'CUBO DE DATOS 3D';
      subTitleText = 'Modelo Multidimensional: Tiempo (X) × Geografía (Y) × Especialidad TI (Z)';
    } else if (activeCubeMode === 'pivot1') {
      mainTitleText = 'CUBO DE DATOS 3D – PIVOTEO 1';
      subTitleText = 'Pivoteo 1 (Rotación): Especialidad TI (X) × Tiempo (Y) × Geografía (Z)';
    } else if (activeCubeMode === 'rollup') {
      mainTitleText = 'CUBO DE DATOS 3D – ROLL-UP';
      subTitleText = 'Roll-Up: Macro-Categorías de TI vs. Años (Suma de Regiones)';
    } else if (activeCubeMode === 'drilldown') {
      mainTitleText = 'CUBO DE DATOS 3D – DRILL-DOWN';
      subTitleText = 'Drill-Down: Especialidades TI por Semestre (Año 2024)';
    } else if (activeCubeMode === 'dice') {
      mainTitleText = 'CUBO DE DATOS 3D – DICE (SUBCUBO)';
      subTitleText = 'Dice: Tiempo {2024, 2025} × Geografía {CDMX, Jalisco} × Especialidad {Soft, Datos}';
    } else if (activeCubeMode === 'slice') {
      mainTitleText = 'CUBO DE DATOS 3D – SLICE';
      subTitleText = 'Slice: Especialidades × Geografía para Año 2024 (Eje Tiempo = 2024)';
    } else {
      mainTitleText = 'CUBO DE DATOS 3D – PIVOTEO 2';
      subTitleText = 'Pivoteo 2 (Rotación): Geografía (X) × Especialidad TI (Y) × Tiempo (Z)';
    }

    /* ── Layout (Adjusted left ML to 185 and bottom MB to 80 for no overlap) ── */
    const ML = 185, MB = 80, MR = 192, MT = 50;
    const AW = Math.max(250, W - ML - MR);
    const AH = Math.max(180, H - MB - MT);

    if (activeCubeMode === 'slice') {
      CW = 240;
      DX = 40;
      DY = 30;
      CH = 65;
    } else if (activeCubeMode === 'pivot1') {
      CW = Math.floor((AW * 0.90) / (nX_curr + nZ_curr * 0.53));
      DX = Math.floor(CW * 0.53);
      DY = Math.floor(CW * 0.38);
      CH = Math.floor((AH - nZ_curr * DY) / nY_curr);
    } else if (activeCubeMode === 'pivot2') {
      CW = Math.floor((AW * 0.90) / (nX_curr + nZ_curr * 0.45));
      DX = Math.floor(CW * 0.45);
      DY = Math.floor(CW * 0.30);
      CH = Math.floor((AH - nZ_curr * DY) / nY_curr);
    } else {
      CW = Math.floor(AW / (nX_curr + nZ_curr * 0.53));
      DX = Math.floor(CW * 0.53);
      DY = Math.floor(CW * 0.38);
      CH = Math.floor((AH - nZ_curr * DY) / nY_curr);
    }

    OX = ML;
    OY = H - MB;

    const origin = p(0, 0, 0);
    const EXT = 30;
    const ze = p(0, 0, nZ_curr);

    /* Global max for relative sizing (not used for colour here) */
    let maxVal = 0;
    years.forEach(y => specs.forEach(s => geos.forEach(g => {
      maxVal = Math.max(maxVal, CUBE_DATA.get(y, s, g));
    })));

    /* ── 1. Back + side walls ─────────────────────────────────────────── */
    // Back plane Z=nZ
    poly(
      [p(0,nY_curr,nZ_curr), p(nX_curr,nY_curr,nZ_curr), p(nX_curr,0,nZ_curr), p(0,0,nZ_curr)],
      wallBack, isLight ? 'rgba(15,23,42,0.15)' : 'rgba(60,120,230,0.45)', 1
    );
    // Left wall X=0
    poly(
      [p(0,0,0), p(0,0,nZ_curr), p(0,nY_curr,nZ_curr), p(0,nY_curr,0)],
      wallLeft, null, 0
    );
    // Bottom floor Y=0
    poly(
      [p(0,0,0), p(nX_curr,0,0), p(nX_curr,0,nZ_curr), p(0,0,nZ_curr)],
      wallFloor, null, 0
    );

    /* ── 2. Interior cage (all 3 sets of grid lines) ─────────────────── */
    for (let xi = 0; xi <= nX_curr; xi++)
      for (let yi = 0; yi <= nY_curr; yi++)
        ln(p(xi,yi,0), p(xi,yi,nZ_curr), CAGE, 0.55);
    for (let yi = 0; yi <= nY_curr; yi++)
      for (let zi = 0; zi <= nZ_curr; zi++)
        ln(p(0,yi,zi), p(nX_curr,yi,zi), CAGE, 0.55);
    for (let xi = 0; xi <= nX_curr; xi++)
      for (let zi = 0; zi <= nZ_curr; zi++)
        ln(p(xi,0,zi), p(xi,nY_curr,zi), CAGE, 0.55);

    // Draw axis arrows in the background (behind cells)
    arrow(origin, { x: p(nX_curr,0,0).x + EXT, y: p(nX_curr,0,0).y }, colorX, 2);
    arrow(origin, { x: p(0,nY_curr,0).x, y: p(0,nY_curr,0).y - EXT }, colorY, 2);
    arrow(origin, { x: ze.x + EXT * 0.65, y: ze.y - EXT * 0.45 }, colorZ, 2);

    /* ── 3. RIGHT face (xi=nX) · Año 2025 × Geografía × Especialidad ── */
    /* ── 3. RIGHT face (xi=nX) · Año 2025 × Geografía × Especialidad ── */
    for (let zi = 0; zi < nZ_curr; zi++) {
      for (let yi = 0; yi < nY_curr; yi++) {
        let val, col;
        if (activeCubeMode === 'base') {
          val = CUBE_DATA.get(years[nX - 1], specs[zi], geos[yi]);
          col = SPEC_C[zi];
        } else if (activeCubeMode === 'pivot1') {
          val = CUBE_DATA.get(years[yi], specs[3], geos[zi]);
          col = SPEC_C[3];
        } else if (activeCubeMode === 'rollup') {
          const specIndices = (yi === 0) ? [0, 3] : [1, 2];
          val = specIndices.reduce((sumSpec, si) => {
            return sumSpec + geos.reduce((sumGeo, g) => sumGeo + CUBE_DATA.get(years[nX - 1], specs[si], g), 0);
          }, 0);
          col = (yi === 0) ? '#3b82f6' : '#06b6d4';
        } else if (activeCubeMode === 'drilldown') {
          val = DRILLDOWN_2024[specs[yi]]['2do Semestre 2024'];
          col = SPEC_C[yi];
        } else if (activeCubeMode === 'dice') {
          const specIdx = (zi === 0) ? 0 : 2;
          val = CUBE_DATA.get('2025', specs[specIdx], geos[yi]);
          col = SPEC_C[specIdx];
        } else if (activeCubeMode === 'slice') {
          val = CUBE_DATA.get('2024', specs[zi], geos[yi]);
          col = SPEC_C[zi];
        } else { // pivot2
          val = CUBE_DATA.get(years[zi], specs[yi], geos[2]);
          col = SPEC_C[yi];
        }

        const corners = [p(nX_curr,yi,zi), p(nX_curr,yi+1,zi), p(nX_curr,yi+1,zi+1), p(nX_curr,yi,zi+1)];
        poly(corners, col + '38', col + '85', 0.8);
        const cx = corners.reduce((s, c) => s + c.x, 0) / 4;
        const cy = corners.reduce((s, c) => s + c.y, 0) / 4;
        if (nZ_curr > 1) {
          ctx.fillStyle = cellTextLight;
          ctx.font = `bold ${Math.max(8, Math.floor(Math.min(CW, CH) * 0.19))}px 'JetBrains Mono',monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val, cx, cy);
        }
      }
    }

    /* ── 4. TOP face (yi=nY) · Nuevo León × Tiempo × Especialidad ──── */
    for (let xi = 0; xi < nX_curr; xi++) {
      for (let zi = 0; zi < nZ_curr; zi++) {
        let val, col;
        if (activeCubeMode === 'base') {
          val = CUBE_DATA.get(years[xi], specs[zi], geos[nY - 1]);
          col = SPEC_C[zi];
        } else if (activeCubeMode === 'pivot1') {
          val = CUBE_DATA.get(years[3], specs[xi], geos[zi]);
          col = SPEC_C[xi];
        } else if (activeCubeMode === 'rollup') {
          // Top face is at y = 2, which is the top of row index 1 (Datos y Soporte, specs 1 and 2)
          val = geos.reduce((sum, g) => sum + CUBE_DATA.get(years[xi], specs[1], g) + CUBE_DATA.get(years[xi], specs[2], g), 0);
          col = '#06b6d4';
        } else if (activeCubeMode === 'drilldown') {
          // Top face represents the upper surface of the top row (Redes y Telecomunicaciones = index 3)
          val = (xi === 0) ? DRILLDOWN_2024['Redes y Telecomunicaciones']['1er Semestre 2024'] 
                           : DRILLDOWN_2024['Redes y Telecomunicaciones']['2do Semestre 2024'];
          col = SPEC_C[3];
        } else if (activeCubeMode === 'dice') {
          const specIdx = (zi === 0) ? 0 : 2;
          const yearStr = String(2024 + xi);
          val = CUBE_DATA.get(yearStr, specs[specIdx], 'Jalisco');
          col = SPEC_C[specIdx];
        } else if (activeCubeMode === 'slice') {
          val = CUBE_DATA.get('2024', specs[zi], geos[2]);
          col = SPEC_C[zi];
        } else { // pivot2
          val = CUBE_DATA.get(years[zi], specs[3], geos[xi]);
          col = SPEC_C[3];
        }

        const corners = [p(xi,nY_curr,zi), p(xi+1,nY_curr,zi), p(xi+1,nY_curr,zi+1), p(xi,nY_curr,zi+1)];
        poly(corners, col + '42', col + '90', 0.8);
      }
    }

    /* ── 5. FRONT face (zi=0) · Desarrollo de Software × Tiempo × Geo ─ */
    for (let xi = 0; xi < nX_curr; xi++) {
      for (let yi = 0; yi < nY_curr; yi++) {
        let val, col;
        if (activeCubeMode === 'base') {
          val = CUBE_DATA.get(years[xi], specs[0], geos[yi]);
          col = '#1441be'; // base front face color
        } else if (activeCubeMode === 'pivot1') {
          val = geos.reduce((sum, g) => sum + CUBE_DATA.get(years[xi], specs[yi], g), 0);
          col = SPEC_C[yi];
        } else if (activeCubeMode === 'rollup') {
          const specIndices = (yi === 0) ? [0, 3] : [1, 2];
          val = specIndices.reduce((sumSpec, si) => {
            return sumSpec + geos.reduce((sumGeo, g) => sumGeo + CUBE_DATA.get(years[xi], specs[si], g), 0);
          }, 0);
          col = (yi === 0) ? '#3b82f6' : '#06b6d4';
        } else if (activeCubeMode === 'drilldown') {
          val = (xi === 0) ? DRILLDOWN_2024[specs[yi]]['1er Semestre 2024'] 
                           : DRILLDOWN_2024[specs[yi]]['2do Semestre 2024'];
          col = SPEC_C[yi];
        } else if (activeCubeMode === 'dice') {
          const yearStr = String(2024 + xi);
          val = CUBE_DATA.get(yearStr, specs[0], geos[yi]);
          col = SPEC_C[0];
        } else if (activeCubeMode === 'slice') {
          val = CUBE_DATA.get('2024', specs[0], geos[yi]);
          col = SPEC_C[0];
        } else { // pivot2
          val = years.reduce((sum, y) => sum + CUBE_DATA.get(y, specs[yi], geos[xi]), 0);
          col = SPEC_C[yi];
        }

        /* Corners are a rectangle when zi = 0 */
        const BL = p(xi,   yi,   0);
        const BR = p(xi+1, yi,   0);
        const TR = p(xi+1, yi+1, 0);
        const TL = p(xi,   yi+1, 0);

        let fillCol;
        if (activeCubeMode === 'base') {
          const geoAlpha = [0.42, 0.56, 0.70][yi];
          fillCol = `rgba(20,65,190,${geoAlpha})`;
        } else {
          fillCol = col + '55'; // semi-transparent specialty color
        }

        poly([BL, BR, TR, TL], fillCol, isLight ? 'rgba(29,78,216,0.85)' : 'rgba(120,180,255,0.88)', 1.2);

        const cw = BR.x - BL.x;
        const ch = BL.y - TL.y;

        /* Mini bar chart */
        if (activeCubeMode === 'base') {
          drawBars(BL.x, TL.y, cw, ch, barColor);
        } else {
          drawBars(BL.x, TL.y, cw, ch, col);
        }

        /* Numeric value */
        ctx.fillStyle = cellTextFront;
        ctx.font = `bold ${Math.max(10, Math.floor(ch * 0.31))}px 'JetBrains Mono',monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val, BL.x + cw * (activeCubeMode === 'base' ? 0.65 : 0.5), TL.y + ch * 0.50);
      }
    }

    /* ── 6. Strong outer border lines ───────────────────────────────── */
    const BW = 1.7, IW = 0.8;

    // Front face (Z=0)
    for (let xi = 0; xi <= nX_curr; xi++)
      ln(p(xi,0,0), p(xi,nY_curr,0), BC, xi === 0 || xi === nX_curr ? BW : IW);
    for (let yi = 0; yi <= nY_curr; yi++)
      ln(p(0,yi,0), p(nX_curr,yi,0), BC, yi === 0 || yi === nY_curr ? BW : IW);

    // Top face (Y=nY)
    for (let xi = 0; xi <= nX_curr; xi++)
      ln(p(xi,nY_curr,0), p(xi,nY_curr,nZ_curr), BC, xi === 0 || xi === nX_curr ? BW : IW);
    for (let zi = 0; zi <= nZ_curr; zi++)
      ln(p(0,nY_curr,zi), p(nX_curr,nY_curr,zi), BC, zi === 0 || zi === nZ_curr ? BW : IW);

    // Right face (X=nX)
    for (let yi = 0; yi <= nY_curr; yi++)
      ln(p(nX_curr,yi,0), p(nX_curr,yi,nZ_curr), BC, yi === 0 || yi === nY_curr ? BW : IW);
    for (let zi = 0; zi <= nZ_curr; zi++)
      ln(p(nX_curr,0,zi), p(nX_curr,nY_curr,zi), BC, zi === 0 || zi === nZ_curr ? BW : IW);

    /* ── 7. Axis arrows (drawn in background) ───────────────────────── */

    /* ── 8. Dimension name labels (Pushed further back to prevent collisions) ── */
    ctx.save();

    // Tiempo (X) — below X axis
    {
      const mid = p(nX_curr / 2, 0, 0);
      ctx.fillStyle = colorX;
      ctx.font = `bold 13px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(lblX, mid.x, OY + 32);
    }

    // Geografía (Y) — rotated on left (Shifted to OX-155 to avoid overlap with long member labels)
    {
      const mid = p(0, nY_curr / 2, 0);
      ctx.save();
      ctx.translate(OX - 155, mid.y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = colorY;
      ctx.font = `bold 13px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lblY, 0, 0);
      ctx.restore();
    }

    // Especialidad TI (Z) — at Z axis tip
    {
      ctx.fillStyle = colorZ;
      ctx.font = `bold 13px 'Inter',sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      const lblZX = ze.x - 12;
      const lblZY = ze.y - 12;
      ctx.fillText(lblZ, lblZX, lblZY);
    }

    ctx.restore();

    /* ── 9. Dimension member labels ─────────────────────────────────── */
    const LABEL_FONT_SM = `600 12px 'Inter',sans-serif`;
    const SPEC_FONT_SM  = `500 11px 'Inter',sans-serif`;

    // X members below front face
    let membersX;
    if (activeCubeMode === 'base') {
      membersX = years;
    } else if (activeCubeMode === 'pivot1') {
      membersX = ['Des. Soft. (3180)', 'Soporte Téc. (2250)', 'Análisis Datos (1120)', 'Redes (1395)'];
    } else if (activeCubeMode === 'pivot2') {
      membersX = ['CDMX (3660)', 'Jalisco (2315)', 'Nuevo León (1970)'];
    } else if (activeCubeMode === 'rollup') {
      membersX = years;
    } else if (activeCubeMode === 'drilldown') {
      membersX = ['1er Sem. (995)', '2do Sem. (1120)'];
    } else if (activeCubeMode === 'dice') {
      membersX = ['2024 (870)', '2025 (1005)'];
    } else if (activeCubeMode === 'slice') {
      membersX = ['2024 (2115)'];
    } else {
      membersX = geos;
    }

    membersX.forEach((m, xi) => {
      const pt = p(xi + 0.5, 0, 0);
      ln(pt, { x: pt.x, y: OY + 5 }, colorX, 1);
      ctx.fillStyle = colorX;
      ctx.font = LABEL_FONT_SM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(m, pt.x, OY + 7);
    });

    // Y members on the left (dashed connectors)
    let membersY;
    if (activeCubeMode === 'base') {
      membersY = geos;
    } else if (activeCubeMode === 'pivot1') {
      membersY = ['2022 (1615)', '2023 (1810)', '2024 (2115)', '2025 (2405)'];
    } else if (activeCubeMode === 'pivot2') {
      membersY = ['Des. Soft. (3180)', 'Soporte Téc. (2250)', 'Análisis Datos (1120)', 'Redes (1395)'];
    } else if (activeCubeMode === 'rollup') {
      membersY = ['Ing. y Des. (4575)', 'Datos y Soporte (3370)'];
    } else if (activeCubeMode === 'drilldown') {
      membersY = [
        'Des. Software (845)',
        'Soporte Téc. (600)',
        'Análisis Datos (300)',
        'Redes (370)'
      ];
    } else if (activeCubeMode === 'dice') {
      membersY = ['CDMX (1155)', 'Jalisco (720)'];
    } else if (activeCubeMode === 'slice') {
      membersY = ['CDMX (975)', 'Jalisco (615)', 'Nuevo León (525)'];
    } else {
      membersY = specs;
    }

    membersY.forEach((m, yi) => {
      const pt = p(0, yi + 0.5, 0);
      const lx = OX - 12;
      connector(pt, lx, pt.y, colorY);
      ctx.fillStyle = colorY;
      ctx.font = LABEL_FONT_SM;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const displayName = m; // displays full string directly
      ctx.fillText(displayName, lx - 5, pt.y);
    });

    // Z members on the right side (dashed connectors from right face bottom edge)
    let membersZ;
    if (activeCubeMode === 'base') {
      membersZ = specs;
    } else if (activeCubeMode === 'pivot1') {
      membersZ = ['CDMX (3660)', 'Jalisco (2315)', 'Nuevo León (1970)'];
    } else if (activeCubeMode === 'pivot2') {
      membersZ = ['2022 (1615)', '2023 (1810)', '2024 (2115)', '2025 (2405)'];
    } else if (activeCubeMode === 'rollup' || activeCubeMode === 'drilldown') {
      membersZ = ['Suma Regiones'];
    } else if (activeCubeMode === 'dice') {
      membersZ = ['Des. Software (1390)', 'Análisis Datos (485)'];
    } else if (activeCubeMode === 'slice') {
      membersZ = ['Des. Software (845)', 'Soporte Téc. (600)', 'Análisis Datos (300)', 'Redes (370)'];
    } else {
      membersZ = ['Suma Años'];
    }

    const specRightX = p(nX_curr, 0, nZ_curr).x + 22;
    membersZ.forEach((m, zi) => {
      const pt = p(nX_curr, 0, zi + 0.5);
      const col = (activeCubeMode === 'base') ? SPEC_C[zi] 
                : (activeCubeMode === 'dice' ? (zi === 0 ? SPEC_C[0] : SPEC_C[2]) 
                : (activeCubeMode === 'slice' ? SPEC_C[zi] 
                : (activeCubeMode === 'pivot1' ? ['#f59e0b', '#ec4899', '#6366f1'][zi] : colorZ)));
      connector(pt, specRightX, pt.y, col);
      ctx.fillStyle = col;
      ctx.font = SPEC_FONT_SM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const displayName = (activeCubeMode === 'base') ? SPEC_SHORT[zi] : m;
      ctx.fillText(displayName, specRightX + 5, pt.y);
    });

    /* ── 10. Face annotation tags ────────────────────────────────────── */
    const TAG_ALPHA = 0.85;

    // Front face
    {
      const tl = p(0, nY_curr, 0);
      ctx.fillStyle = isLight ? '#1d4ed8' : `rgba(150,200,255,${TAG_ALPHA})`;
      ctx.font = `italic 10px 'Inter',sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const tagY = (activeCubeMode === 'slice') ? tl.y - 20 : tl.y - 4;
      ctx.fillText(frontTagText, tl.x + 4, tagY);
    }

    // Top face
    {
      const tp = p(0, nY_curr, nZ_curr);
      ctx.fillStyle = isLight ? '#047857' : `rgba(16,185,129,${TAG_ALPHA})`;
      ctx.font = `italic 10px 'Inter',sans-serif`;
      ctx.textAlign = 'left';
      let topTagText;
      if (activeCubeMode === 'base' || activeCubeMode === 'slice') {
        topTagText = '▲ ' + geos[nY - 1];
      } else if (activeCubeMode === 'pivot1') {
        topTagText = '▲ ' + years[nX - 1];
      } else if (activeCubeMode === 'pivot2') {
        topTagText = '▲ ' + SPEC_SHORT[nY_curr - 1];
      } else if (activeCubeMode === 'rollup') {
        topTagText = '▲ Datos y Soporte';
      } else if (activeCubeMode === 'drilldown') {
        topTagText = '▲ Redes y Telecom.';
      } else if (activeCubeMode === 'dice') {
        topTagText = '▲ ' + geos[1];
      }
      if (activeCubeMode === 'slice') {
        ctx.textBaseline = 'bottom';
        ctx.fillText(topTagText, tp.x + 4, tp.y - 8);
      } else {
        ctx.textBaseline = 'top';
        ctx.fillText(topTagText, tp.x + 4, tp.y + 4);
      }
    }

    // Right face
    {
      const rp = p(nX_curr, nY_curr, 0);
      ctx.fillStyle = isLight ? '#b45309' : `rgba(245,158,11,${TAG_ALPHA})`;
      ctx.font = `italic 10px 'Inter',sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const tagY = (activeCubeMode === 'slice') ? rp.y - 20 : rp.y - 4;
      let rightTagText;
      if (activeCubeMode === 'base' || activeCubeMode === 'rollup') {
        rightTagText = '▶ ' + years[nX - 1];
      } else if (activeCubeMode === 'pivot1') {
        rightTagText = '▶ ' + SPEC_SHORT[3];
      } else if (activeCubeMode === 'pivot2') {
        rightTagText = '▶ ' + geos[2];
      } else if (activeCubeMode === 'drilldown') {
        rightTagText = '▶ 2do Sem. 2024';
      } else if (activeCubeMode === 'dice') {
        rightTagText = '▶ 2025';
      } else if (activeCubeMode === 'slice') {
        rightTagText = '▶ 2024';
      }
      ctx.fillText(rightTagText, rp.x + 4, tagY);
    }

    /* ── 11. Title inside canvas (top-center) ────────────────────────── */
    {
      const midX = OX + (nX_curr * CW + nZ_curr * DX) / 2;
      ctx.fillStyle = isLight ? '#0f172a' : 'rgba(240,248,255,0.95)';
      ctx.font = `bold 15px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(mainTitleText, midX, 14);
      ctx.fillStyle = isLight ? '#475569' : 'rgba(180,210,255,0.75)';
      ctx.font = `12px 'Inter',sans-serif`;
      ctx.fillText(subTitleText, midX, 34);
    }

    // Update face tags in HTML DOM dynamically if elements exist
    const frontTagEl = (typeof document.querySelector === 'function') ? document.querySelector('.face-front') : null;
    const topTagEl = (typeof document.querySelector === 'function') ? document.querySelector('.face-top') : null;
    const rightTagEl = (typeof document.querySelector === 'function') ? document.querySelector('.face-right') : null;
    
    if (frontTagEl) {
      let txt;
      if (activeCubeMode === 'base') txt = '▶ Cara frontal: Desarrollo de Software (Especialidad) × Tiempo × Geografía';
      else if (activeCubeMode === 'pivot1') txt = '▶ Cara frontal: CDMX (Geografía) × Especialidad × Tiempo';
      else if (activeCubeMode === 'pivot2') txt = '▶ Cara frontal: Año 2022 (Tiempo) × Geografía × Especialidad';
      else if (activeCubeMode === 'rollup') txt = '▶ Cara frontal: Ingeniería y Desarrollo (Macro-Categoría) × Tiempo × Geografía';
      else if (activeCubeMode === 'drilldown') txt = '▶ Cara frontal: Especialidades × Semestres (Año 2024)';
      else if (activeCubeMode === 'dice') txt = '▶ Cara frontal: Desarrollo de Software (Especialidad) × Tiempo × Geografía (Subcubo)';
      else if (activeCubeMode === 'slice') txt = '▶ Cara frontal: Desarrollo de Software (Especialidad) × Geografía (Año 2024)';
      frontTagEl.textContent = txt;
    }
    if (topTagEl) {
      let txt;
      if (activeCubeMode === 'base') txt = '▲ Cara superior: Nuevo León (Geografía) × Tiempo × Especialidad';
      else if (activeCubeMode === 'pivot1') txt = '▲ Cara superior: Año 2025 (Tiempo) × Especialidad × Geografía';
      else if (activeCubeMode === 'pivot2') txt = '▲ Cara superior: Redes y Telecomunicaciones (Especialidad) × Geografía × Tiempo';
      else if (activeCubeMode === 'rollup') txt = '▲ Cara superior: Datos y Soporte (Macro-Categoría) × Tiempo × Geografía';
      else if (activeCubeMode === 'drilldown') txt = '▲ Cara superior: Redes y Telecomunicaciones (Especialidad) × Semestres (Año 2024)';
      else if (activeCubeMode === 'dice') txt = '▲ Cara superior: Jalisco (Geografía) × Tiempo × Especialidad (Subcubo)';
      else if (activeCubeMode === 'slice') txt = '▲ Cara superior: Nuevo León (Geografía) × Especialidad (Año 2024)';
      topTagEl.textContent = txt;
    }
    if (rightTagEl) {
      let txt;
      if (activeCubeMode === 'base') txt = '▶ Cara derecha: Año 2025 (Tiempo) × Geografía × Especialidad';
      else if (activeCubeMode === 'pivot1') txt = '▶ Cara derecha: Redes y Telecomunicaciones (Especialidad) × Tiempo × Geografía';
      else if (activeCubeMode === 'pivot2') txt = '▶ Cara derecha: Nuevo León (Geografía) × Especialidad × Tiempo';
      else if (activeCubeMode === 'rollup') txt = '▶ Cara derecha: Año 2025 (Tiempo) × Macro-Categoría × Geografía';
      else if (activeCubeMode === 'drilldown') txt = '▶ Cara derecha: 2do Semestre 2024 × Especialidad × Geografía';
      else if (activeCubeMode === 'dice') txt = '▶ Cara derecha: Año 2025 (Tiempo) × Geografía × Especialidad (Subcubo)';
      else if (activeCubeMode === 'slice') txt = '▶ Cara derecha: Año 2024 × Geografía × Especialidad';
      rightTagEl.textContent = txt;
    }
  }

  /* ── Initial render + responsive resize ────────────────────────────── */
  render();

  let _timer;
  window.addEventListener('resize', () => {
    clearTimeout(_timer);
    _timer = setTimeout(() => render(), 80);
  });

  /* Public API used by the PDF export module */
  window.renderOLAPCube    = render;
  window.captureOLAPCube   = (theme = 'light', mode = currentMode) => { 
    const oldTheme = currentTheme;
    render(theme, mode); 
    const url = canvas.toDataURL('image/png'); 
    render(oldTheme, currentMode); // Restore screen theme/mode
    return url; 
  };
  window.__cubeAutoRotate  = () => {}; // stub (Three.js API no longer used)
})();
