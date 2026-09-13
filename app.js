/* GST Purchase Register Checker — all parsing and validation happen locally. */
const FIELDS = [
  ['gstin', 'Supplier GSTIN', true, ['gstin','supplier gstin','vendor gstin','gstin of supplier']],
  ['invoice', 'Invoice number', true, ['invoice no','invoice number','bill no','document no','inv no']],
  ['date', 'Invoice date', false, ['invoice date','bill date','date']],
  ['supplier', 'Supplier name', false, ['supplier','vendor name','party name','supplier name']],
  ['taxable', 'Taxable value', false, ['taxable value','taxable amount','assessable value','taxable']],
  ['cgst', 'CGST', false, ['cgst','cgst amount']], ['sgst', 'SGST', false, ['sgst','sgst amount','utgst','utgst amount']],
  ['igst', 'IGST', false, ['igst','igst amount']], ['total', 'Invoice total', false, ['invoice value','total amount','gross amount','invoice total']]
];
const state = { rows: [], headers: [], mappings: {}, report: [] };
const $ = (id) => document.getElementById(id);

function normaliseHeader(value) { return String(value || '').toLowerCase().replace(/[_\-().]/g, ' ').replace(/\s+/g, ' ').trim(); }
function asText(value) { return String(value ?? '').trim(); }
function numberValue(value) {
  if (value === null || value === undefined || asText(value) === '') return null;
  const raw = asText(value).replace(/[₹,\s]/g, '');
  const normal = raw.startsWith('(') && raw.endsWith(')') ? `-${raw.slice(1, -1)}` : raw;
  const output = Number(normal);
  return Number.isFinite(output) ? output : null;
}
function get(row, key) { const header = state.mappings[key]; return header ? row[header] : ''; }
function isValidGstin(value) {
  const gstin = asText(value).toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return false;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let factor = 2; let sum = 0;
  for (let i = gstin.length - 2; i >= 0; i--) { const code = chars.indexOf(gstin[i]); const product = code * factor; sum += Math.floor(product / 36) + (product % 36); factor = factor === 2 ? 1 : 2; }
  return chars[(36 - (sum % 36)) % 36] === gstin[14];
}
function rateWarning(taxable, tax) {
  if (taxable === null || tax === null || taxable <= 0 || tax < 0) return null;
  const actual = tax / taxable * 100; const common = [0, 0.25, 3, 5, 12, 18, 28];
  const nearest = common.reduce((best, rate) => Math.abs(rate - actual) < Math.abs(best - actual) ? rate : best, common[0]);
  return Math.abs(actual - nearest) > 0.45 ? `Tax amount implies ${actual.toFixed(2)}%; review rate/amount (nearest common rate: ${nearest}%).` : null;
}
function validate() {
  const seen = new Map();
  state.report = state.rows.map((row, index) => {
    const errors = [], warnings = []; const gstin = asText(get(row, 'gstin')).toUpperCase(); const invoice = asText(get(row, 'invoice'));
    const taxable = numberValue(get(row, 'taxable')); const cgst = numberValue(get(row, 'cgst')); const sgst = numberValue(get(row, 'sgst')); const igst = numberValue(get(row, 'igst'));
    if (!gstin) errors.push('Missing supplier GSTIN.'); else if (!isValidGstin(gstin)) errors.push('GSTIN format/checksum is invalid.');
    if (!invoice) errors.push('Missing invoice number.');
    if (gstin && invoice) { const key = `${gstin}|${invoice.toUpperCase()}`; if (seen.has(key)) errors.push(`Possible duplicate of row ${seen.get(key)} (same GSTIN + invoice).`); else seen.set(key, index + 2); }
    if (state.mappings.date && !asText(get(row, 'date'))) warnings.push('Missing invoice date.');
    if (cgst !== null && sgst !== null && Math.abs(cgst - sgst) > 1) warnings.push('CGST and SGST differ by more than ₹1.');
    const hasCgstSgst = (cgst || 0) > 0 || (sgst || 0) > 0;
    if ((igst || 0) > 0 && hasCgstSgst) errors.push('IGST and CGST/SGST are both present. Check tax type.');
    const totalTax = (cgst || 0) + (sgst || 0) + (igst || 0); const taxCheck = rateWarning(taxable, totalTax); if (taxCheck) warnings.push(taxCheck);
    if (taxable !== null && taxable < 0) warnings.push('Negative taxable value; verify credit note treatment.');
    if (state.mappings.taxable && taxable === null) warnings.push('Taxable value is not a valid number.');
    const issues = [...errors, ...warnings];
    return { rowNumber: index + 2, invoice, gstin, supplier: asText(get(row, 'supplier')), status: errors.length ? 'Error' : warnings.length ? 'Warning' : 'Valid', issues, taxable, cgst, sgst, igst, total: numberValue(get(row, 'total')), original: row };
  });
  renderResults();
}
function renderMappings() {
  const grid = $('mapping-grid'); grid.innerHTML = '';
  FIELDS.forEach(([key, label, required, aliases]) => {
    const found = state.headers.find(h => aliases.includes(normaliseHeader(h))) || state.headers.find(h => aliases.some(a => normaliseHeader(h).includes(a)));
    state.mappings[key] = found || '';
    const labelEl = document.createElement('label'); labelEl.textContent = `${label}${required ? ' *' : ''}`;
    const select = document.createElement('select'); select.dataset.key = key;
    select.innerHTML = `<option value="">Not mapped</option>${state.headers.map(h => `<option value="${escapeHtml(h)}" ${h === found ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('')}`;
    select.addEventListener('change', (event) => { state.mappings[key] = event.target.value; }); labelEl.appendChild(select); grid.appendChild(labelEl);
  });
  $('mapping-card').classList.remove('hidden');
}
function metric(label, value, className = '') { return `<div class="metric ${className}"><b>${value}</b><span>${label}</span></div>`; }
function renderResults() {
  const report = state.report; const errors = report.filter(r => r.status === 'Error').length; const warnings = report.filter(r => r.status === 'Warning').length;
  $('summary-text').textContent = `${report.length.toLocaleString()} rows checked. Review errors first, then warnings.`;
  $('metrics').innerHTML = metric('Rows checked', report.length) + metric('Errors', errors, 'error') + metric('Warnings', warnings, 'warning') + metric('Valid rows', report.length - errors - warnings, 'ok');
  $('results-card').classList.remove('hidden'); renderTable();
}
function renderTable() {
  const exceptions = $('exceptions-only').checked; const rows = (exceptions ? state.report.filter(r => r.status !== 'Valid') : state.report).slice(0, 500);
  $('results-body').innerHTML = rows.map(r => `<tr><td>${r.rowNumber}</td><td>${escapeHtml(r.invoice || '—')}</td><td>${escapeHtml(r.gstin || '—')}</td><td><span class="pill ${r.status.toLowerCase()}">${r.status}</span></td><td class="issues">${escapeHtml(r.issues.join('\n') || 'No issues found.')}</td></tr>`).join('') || '<tr><td colspan="5">No rows match this filter.</td></tr>';
}
function escapeHtml(value) { return asText(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char]); }
function downloadCsv() {
  const headers = ['Row','Status','Issues','Invoice Number','Supplier GSTIN','Supplier','Taxable Value','CGST','SGST','IGST','Invoice Total'];
  const values = state.report.map(r => [r.rowNumber,r.status,r.issues.join(' | '),r.invoice,r.gstin,r.supplier,r.taxable ?? '',r.cgst ?? '',r.sgst ?? '',r.igst ?? '',r.total ?? '']);
  const encode = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`; const csv = [headers, ...values].map(row => row.map(encode).join(',')).join('\r\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' })); link.download = `gst-purchase-register-report-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
function loadRows(rows, label) {
  state.rows = rows.filter(row => Object.values(row).some(value => asText(value) !== '')); state.headers = Array.from(new Set(state.rows.flatMap(Object.keys)));
  $('file-status').textContent = `${label}: ${state.rows.length.toLocaleString()} data rows loaded.`; renderMappings(); $('results-card').classList.add('hidden');
}
async function handleFile(file) {
  if (!file || !window.XLSX) { $('file-status').textContent = 'Spreadsheet reader is still loading. Please try again in a moment.'; return; }
  try { const workbook = XLSX.read(await file.arrayBuffer(), { type:'array', cellDates:true }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; loadRows(XLSX.utils.sheet_to_json(sheet, { defval:'' }), file.name); }
  catch (error) { $('file-status').textContent = `Could not read file: ${error.message}`; }
}
function loadDemo() { loadRows([
  {'Supplier GSTIN':'27AAPFU0939F1ZV','Invoice Number':'INV-101','Invoice Date':'01-04-2026','Supplier Name':'Demo Supplies','Taxable Value':'10,000','CGST':'900','SGST':'900','IGST':'','Invoice Total':'11,800'},
  {'Supplier GSTIN':'27AAPFU0939F1ZV','Invoice Number':'INV-101','Invoice Date':'01-04-2026','Supplier Name':'Demo Supplies','Taxable Value':'10,000','CGST':'900','SGST':'900','IGST':'','Invoice Total':'11,800'},
  {'Supplier GSTIN':'27AAPFU0939F1Z0','Invoice Number':'INV-102','Invoice Date':'','Supplier Name':'Example Traders','Taxable Value':'10,000','CGST':'900','SGST':'700','IGST':'','Invoice Total':'11,600'},
  {'Supplier GSTIN':'29ABCDE1234F1Z5','Invoice Number':'INV-103','Invoice Date':'03-04-2026','Supplier Name':'Interstate Co','Taxable Value':'10,000','CGST':'900','SGST':'900','IGST':'1800','Invoice Total':'13,600'}
], 'Demo data'); }
$('file-input').addEventListener('change', event => handleFile(event.target.files[0])); $('demo-button').addEventListener('click', loadDemo); $('run-button').addEventListener('click', validate); $('exceptions-only').addEventListener('change', renderTable); $('download-button').addEventListener('click', downloadCsv);
