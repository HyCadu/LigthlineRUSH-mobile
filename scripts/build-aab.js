'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.join(__dirname, '..');
const ANDROID_DIR = path.join(ROOT, 'android');

function runBundleRelease() {
  const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const command = process.platform === 'win32' ? wrapper + ' bundleRelease' : wrapper + ' bundleRelease';
  const result = childProcess.spawnSync(command, {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
    shell: true
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function showOutputPath() {
  const outputAab = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (fs.existsSync(outputAab)) {
    console.log('\nAAB gerado com sucesso: ' + outputAab);
    return;
  }
  console.warn('\nBuild terminou, mas o app-release.aab nao foi encontrado no caminho esperado: ' + outputAab);
}

runBundleRelease();
showOutputPath();
