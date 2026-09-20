'use strict';
/*
 * Gera www/ a partir do jogo web (../LightLineRUSH) + os bundles do Capacitor/AdMob
 * prontos para uso sem bundler (campo "unpkg" de cada pacote). O index.html original
 * do GitHub Pages nunca e tocado: as tags <script> dos vendors sao injetadas so na copia.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME_DIR = path.join(ROOT, '..', 'LightLineRUSH');
const WWW_DIR = path.join(ROOT, 'www');

const VENDOR_FILES = [
  { from: path.join(ROOT, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js'), to: 'capacitor.js' },
  { from: path.join(ROOT, 'node_modules', '@capacitor-community', 'admob', 'dist', 'plugin.js'), to: 'admob-plugin.js' }
];

function copyGameFiles() {
  fs.cpSync(path.join(GAME_DIR, 'index.html'), path.join(WWW_DIR, 'index.html'));
  fs.cpSync(path.join(GAME_DIR, 'musics'), path.join(WWW_DIR, 'musics'), { recursive: true });
  fs.cpSync(path.join(GAME_DIR, 'sprites'), path.join(WWW_DIR, 'sprites'), { recursive: true });
}

function copyVendorFiles() {
  for (const f of VENDOR_FILES) {
    if (!fs.existsSync(f.from)) {
      throw new Error('Vendor file nao encontrado: ' + f.from + ' (rode "npm install" antes).');
    }
    fs.cpSync(f.from, path.join(WWW_DIR, f.to));
  }
}

function injectVendorScripts() {
  const indexPath = path.join(WWW_DIR, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const marker = '<script>';
  const idx = html.indexOf(marker);
  if (idx === -1) {
    throw new Error('Marcador do script principal nao encontrado em index.html — verifique se o arquivo do jogo mudou de estrutura.');
  }
  const vendorTags = VENDOR_FILES.map(f => '<script src="' + f.to + '"></script>').join('\n') + '\n';
  html = html.slice(0, idx) + vendorTags + html.slice(idx);
  fs.writeFileSync(indexPath, html);
}

function main() {
  fs.rmSync(WWW_DIR, { recursive: true, force: true });
  fs.mkdirSync(WWW_DIR, { recursive: true });
  copyGameFiles();
  copyVendorFiles();
  injectVendorScripts();
  console.log('www/ gerado em: ' + WWW_DIR);
}

main();
