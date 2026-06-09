/**
 * data.js
 * -------
 * Cubo de Datos OLAP – Desempleo de Profesionales TI en México
 * Dimensiones: Tiempo × Geografía × Especialidad TI
 * Medida: Miles de profesionales TI desempleados
 *
 * Actividad 3 – Inciso a) Cubo de Datos Base
 */

const CUBE_DATA = {
  // ── Dimensiones ──────────────────────────────────────────────────────────
  dimensions: {
    time: {
      label: 'Tiempo',
      axis: 'X',
      members: ['2022', '2023', '2024', '2025']
    },
    geography: {
      label: 'Geografía',
      axis: 'Y',
      members: ['CDMX', 'Jalisco', 'Nuevo León']
    },
    specialty: {
      label: 'Especialidad TI',
      axis: 'Z',
      members: [
        'Desarrollo de Software',
        'Soporte Técnico',
        'Análisis de Datos',
        'Redes y Telecomunicaciones'
      ]
    }
  },

  // ── Medida ────────────────────────────────────────────────────────────────
  measure: {
    label: 'Profesionales TI Desempleados',
    unit: 'miles de personas'
  },

  /**
   * Hecho: cubo[año][especialidad][geografía]
   * Estructura indexada para acceso O(1) a cualquier celda.
   */
  facts: {
    '2022': {
      'Desarrollo de Software':      { 'CDMX': 320, 'Jalisco': 180, 'Nuevo León': 150 },
      'Soporte Técnico':             { 'CDMX': 210, 'Jalisco': 140, 'Nuevo León': 120 },
      'Análisis de Datos':           { 'CDMX':  95, 'Jalisco':  60, 'Nuevo León':  55 },
      'Redes y Telecomunicaciones':  { 'CDMX': 130, 'Jalisco':  85, 'Nuevo León':  70 }
    },
    '2023': {
      'Desarrollo de Software':      { 'CDMX': 350, 'Jalisco': 200, 'Nuevo León': 170 },
      'Soporte Técnico':             { 'CDMX': 230, 'Jalisco': 155, 'Nuevo León': 135 },
      'Análisis de Datos':           { 'CDMX': 110, 'Jalisco':  75, 'Nuevo León':  65 },
      'Redes y Telecomunicaciones':  { 'CDMX': 145, 'Jalisco':  95, 'Nuevo León':  80 }
    },
    '2024': {
      'Desarrollo de Software':      { 'CDMX': 410, 'Jalisco': 240, 'Nuevo León': 195 },
      'Soporte Técnico':             { 'CDMX': 270, 'Jalisco': 175, 'Nuevo León': 155 },
      'Análisis de Datos':           { 'CDMX': 130, 'Jalisco':  90, 'Nuevo León':  80 },
      'Redes y Telecomunicaciones':  { 'CDMX': 165, 'Jalisco': 110, 'Nuevo León':  95 }
    },
    '2025': {
      'Desarrollo de Software':      { 'CDMX': 460, 'Jalisco': 280, 'Nuevo León': 225 },
      'Soporte Técnico':             { 'CDMX': 295, 'Jalisco': 195, 'Nuevo León': 170 },
      'Análisis de Datos':           { 'CDMX': 155, 'Jalisco': 110, 'Nuevo León':  95 },
      'Redes y Telecomunicaciones':  { 'CDMX': 185, 'Jalisco': 125, 'Nuevo León': 110 }
    }
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  /**
   * Retorna el valor de una celda específica del cubo.
   * @param {string} year
   * @param {string} specialty
   * @param {string} geo
   * @returns {number}
   */
  get(year, specialty, geo) {
    return this.facts[year]?.[specialty]?.[geo] ?? 0;
  },

  /**
   * Retorna todos los valores de un año (capa/slice temporal).
   * @param {string} year
   * @returns {object}
   */
  getLayer(year) {
    return this.facts[year] ?? {};
  },

  /**
   * Agrega (suma) sobre una dimensión:
   * getAggregated('geography') → { CDMX: ..., Jalisco: ..., 'Nuevo León': ... }
   * @param {'time'|'geography'|'specialty'} dimension
   * @returns {object}
   */
  getAggregated(dimension) {
    const result = {};
    const years = this.dimensions.time.members;
    const geos  = this.dimensions.geography.members;
    const specs = this.dimensions.specialty.members;

    if (dimension === 'geography') {
      geos.forEach(g => {
        result[g] = 0;
        years.forEach(y => specs.forEach(s => { result[g] += this.get(y, s, g); }));
      });
    } else if (dimension === 'specialty') {
      specs.forEach(s => {
        result[s] = 0;
        years.forEach(y => geos.forEach(g => { result[s] += this.get(y, s, g); }));
      });
    } else if (dimension === 'time') {
      years.forEach(y => {
        result[y] = 0;
        specs.forEach(s => geos.forEach(g => { result[y] += this.get(y, s, g); }));
      });
    }
    return result;
  },

  /**
   * Grand total across the entire cube.
   * @returns {number}
   */
  grandTotal() {
    let total = 0;
    const { time, geography, specialty } = this.dimensions;
    time.members.forEach(y =>
      specialty.members.forEach(s =>
        geography.members.forEach(g => { total += this.get(y, s, g); })
      )
    );
    return total;
  }
};

// Color palette mapped to specialties
const SPECIALTY_COLORS = {
  'Desarrollo de Software':     { primary: '#3b82f6', light: 'rgba(59,130,246,0.15)', dark: '#2563eb' },
  'Soporte Técnico':            { primary: '#06b6d4', light: 'rgba(6,182,212,0.15)',  dark: '#0891b2' },
  'Análisis de Datos':          { primary: '#8b5cf6', light: 'rgba(139,92,246,0.15)', dark: '#7c3aed' },
  'Redes y Telecomunicaciones': { primary: '#10b981', light: 'rgba(16,185,129,0.15)', dark: '#059669' }
};

const GEO_COLORS = {
  'CDMX':       '#f59e0b',
  'Jalisco':    '#ec4899',
  'Nuevo León': '#6366f1'
};

const YEAR_LABELS = {
  '2022': 'Figura 1a. Capa del cubo – Año 2022',
  '2023': 'Figura 1b. Capa del cubo – Año 2023',
  '2024': 'Figura 1c. Capa del cubo – Año 2024',
  '2025': 'Figura 1d. Capa del cubo – Año 2025'
};

const DRILLDOWN_2024 = {
  'Desarrollo de Software':      { '1er Semestre 2024': 398, '2do Semestre 2024': 447 },
  'Soporte Técnico':             { '1er Semestre 2024': 282, '2do Semestre 2024': 318 },
  'Análisis de Datos':           { '1er Semestre 2024': 141, '2do Semestre 2024': 159 },
  'Redes y Telecomunicaciones':  { '1er Semestre 2024': 174, '2do Semestre 2024': 196 }
};
