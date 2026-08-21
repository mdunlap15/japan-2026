// Headless smoke test — run before EVERY deploy (node test/smoke.mjs).
// 1) checks tag balance, 2) boots index.html in jsdom with all inline scripts
// eval'd in order, 3) clicks the dock + every More-menu item + day chips and
// asserts body[data-tab] / active-panel changes. Catches init-order (TDZ)
// bugs that silently kill half the app's bindings.
// STRICT=1 additionally requires trip content (venues, ballot, glossary) to be non-empty.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const configJs = fs.readFileSync(path.join(here, '..', 'config.js'), 'utf8');
const STRICT = process.env.STRICT === '1' || process.argv.includes('--strict');
let failures = 0;
const fail = (m) => { failures++; console.error('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

// ---------- 1) tag balance ----------
console.log('tag balance:');
for (const tag of ['div', 'section', 'button', 'span', 'main', 'header', 'footer', 'nav', 'label', 'a', 'style']) {
  const open = (html.match(new RegExp('<' + tag + '(?=[\\s>])', 'g')) || []).length;
  const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  if (open !== close) fail(`<${tag}> open ${open} != close ${close}`);
}
{
  const open = (html.match(/<script(?=[\s>])/g) || []).length;
  const close = (html.match(/<\/script>/g) || []).length;
  if (open !== close) fail(`<script> open ${open} != close ${close}`);
}
if (!failures) ok('all checked tags balanced');

// ---------- 2) boot in jsdom ----------
console.log('boot:');
const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// stubs the engine expects in a real browser
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.fetch = () => Promise.resolve({ ok: true, json: async () => ({ rates: { USD: 0.0066 }, daily: null }) });
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
window.navigator.geolocation = { getCurrentPosition: () => {} };
window.SpeechSynthesisUtterance = function () {};
window.speechSynthesis = { cancel() {}, speak() {} };
window.createImageBitmap = undefined;
try { window.localStorage.clear(); } catch (e) {}

// eval config.js, then every inline script in document order (external src scripts skipped — L stays undefined, guarded paths no-op)
const scripts = [...document.querySelectorAll('script')].filter(s => !s.src && s.textContent.trim());
let booted = true;
try {
  window.eval(configJs);
  for (const s of scripts) window.eval(s.textContent);
  ok(`config.js + ${scripts.length} inline scripts eval'd with no exception`);
} catch (e) {
  booted = false;
  fail('script eval threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e));
}

// ---------- 3) interaction sweep ----------
if (booted) {
  console.log('interactions:');
  const T = window.TRIP || {};
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

  // day chips generated from TRIP.DAYS
  const chips = [...document.querySelectorAll('.chip')];
  if (!T.DAYS || !T.DAYS.length) fail('TRIP.DAYS is empty');
  else if (chips.length !== T.DAYS.length) fail(`chips ${chips.length} != TRIP.DAYS ${T.DAYS.length}`);
  else ok(`daystrip: ${chips.length} chips generated`);
  for (const d of T.DAYS || []) {
    if (!document.getElementById(d.key)) fail(`day panel #${d.key} missing for ${d.date}`);
  }

  // dock buttons
  const expect = { days: 'days', map: 'map', chat: 'chat', vote: 'vote', journal: 'journal', more: 'more' };
  for (const b of document.querySelectorAll('.tbtn')) {
    click(b);
    const want = expect[b.dataset.tabbtn];
    if (document.body.dataset.tab !== want) fail(`dock "${b.dataset.tabbtn}" -> data-tab="${document.body.dataset.tab}", wanted "${want}"`);
  }
  ok('dock: all buttons switch body[data-tab]');

  // every More-menu item
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'more'));
  for (const m of document.querySelectorAll('.mitem')) {
    click(m);
    const activePanel = document.querySelector('.panel.is-active');
    if (!activePanel) { fail(`More item "${m.dataset.go}" left no active panel`); continue; }
    if (activePanel.id !== m.dataset.go && document.body.dataset.tab === 'more') fail(`More item "${m.dataset.go}" did not navigate (still on More)`);
    click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'more'));
  }
  ok('More menu: every item navigates');

  // day chips switch panels
  click([...document.querySelectorAll('.tbtn')].find(b => b.dataset.tabbtn === 'days'));
  for (const c of chips.slice(0, 3).concat(chips.slice(-1))) {
    click(c);
    if (document.body.dataset.tab !== 'days') fail(`chip ${c.dataset.day}: body[data-tab] != days`);
    const p = document.querySelector('.panel.is-active');
    if (!p || p.id !== c.dataset.day) fail(`chip ${c.dataset.day}: active panel is ${p && p.id}`);
  }
  ok('chips: first/last day panels activate');

  // language toggle
  {
    const lb = document.getElementById('langbtn');
    if (!lb) fail('langbtn missing');
    else {
      click(lb);
      if (document.body.dataset.lang !== 'ru') fail('langbtn did not switch body[data-lang] to ru');
      const gloss = (T.GLOSS || [])[0] || [];
      if (gloss.length < 4) fail('GLOSS entries lack the RU column');
      click(lb);
      if (document.body.dataset.lang !== 'en') fail('langbtn did not switch back to en');
      if (!failures) ok('language toggle: en ⇄ ru works, GLOSS is bilingual');
    }
  }

  // trip-data sanity
  console.log('trip data:');
  const V = T.VENUES || [];
  const cities = new Set(Object.keys(T.CITIES || {}));
  for (const v of V) {
    if (!cities.has(v[5])) fail(`venue "${v[0]}" has unknown city "${v[5]}"`);
    if (typeof v[1] !== 'number' || typeof v[2] !== 'number' || v[1] < 24 || v[1] > 46 || v[2] < 122 || v[2] > 154) fail(`venue "${v[0]}" coords look wrong: ${v[1]},${v[2]}`);
  }
  const dates = new Set((T.DAYS || []).map(d => d.date));
  for (const e of T.EVENTS || []) {
    const k = e[0] + '-' + String(e[1]).padStart(2, '0') + '-' + String(e[2]).padStart(2, '0');
    if (!dates.has(k)) fail(`ticker event "${e[5]}" date ${k} is outside TRIP.DAYS`);
  }
  for (const g of T.VGROUPS || []) for (const it of g.items) {
    if (!/^https:\/\//.test(it[2])) fail(`ballot "${it[1]}" link is not https: ${it[2]}`);
  }
  if (STRICT) {
    if (!V.length) fail('STRICT: TRIP.VENUES is empty');
    if (!(T.VGROUPS || []).length) fail('STRICT: TRIP.VGROUPS is empty');
    if (!(T.GLOSS || []).length) fail('STRICT: TRIP.GLOSS is empty');
    if (!(T.PHRASES || []).length) fail('STRICT: TRIP.PHRASES is empty');
    if (/@@[A-Z:]+@@/.test(html)) fail('STRICT: unfilled @@PLACEHOLDER@@ still in index.html: ' + (html.match(/@@[A-Z:d0-9]+@@/g) || []).join(', '));
  }
  if (!failures) ok('venue cities, coords, event dates, ballot links all sane');
}

console.log(failures ? `\nFAIL — ${failures} problem(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
