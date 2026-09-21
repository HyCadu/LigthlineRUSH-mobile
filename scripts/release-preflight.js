'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ANDROID_DIR = path.join(ROOT, 'android');

const PATHS = {
  sourceIndex: path.resolve(ROOT, '..', 'LightLineRUSH', 'index.html'),
  webIndex: path.join(ROOT, 'www', 'index.html'),
  appGradle: path.join(ANDROID_DIR, 'app', 'build.gradle'),
  varsGradle: path.join(ANDROID_DIR, 'variables.gradle'),
  manifest: path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml'),
  keystoreProps: path.join(ANDROID_DIR, 'keystore.properties'),
  keystorePropsExample: path.join(ANDROID_DIR, 'keystore.properties.example')
};

const errors = [];
const warnings = [];
const info = [];

function readText(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(label + ' nao encontrado: ' + filePath);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function findBooleanConst(source, name) {
  const pattern = new RegExp('const\\s+' + name + '\\s*=\\s*(true|false)\\s*;');
  const match = source.match(pattern);
  if (!match) return null;
  return match[1] === 'true';
}

function findStringValue(source, pattern) {
  const match = source.match(pattern);
  return match ? match[1] : '';
}

function parseProperties(text) {
  const output = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    output[key] = value;
  }
  return output;
}

function validateAdConfig() {
  const sourceIndex = readText(PATHS.sourceIndex, 'Arquivo fonte do jogo');
  const webIndex = readText(PATHS.webIndex, 'Copia web (www/index.html)');

  const sourceAdTesting = sourceIndex ? findBooleanConst(sourceIndex, 'AD_TESTING') : null;
  if (sourceAdTesting === null) {
    errors.push('Constante AD_TESTING nao encontrada em ' + PATHS.sourceIndex);
  } else if (sourceAdTesting) {
    errors.push('AD_TESTING=true em ' + PATHS.sourceIndex + '. Troque para false para release com anuncios reais.');
  } else {
    info.push('AD_TESTING=false no fonte do jogo.');
  }

  const webAdTesting = webIndex ? findBooleanConst(webIndex, 'AD_TESTING') : null;
  if (webAdTesting === null) {
    warnings.push('Constante AD_TESTING nao encontrada em ' + PATHS.webIndex);
  } else if (webAdTesting) {
    warnings.push('AD_TESTING=true em www/index.html. Rode `npm run sync` apos mudar no fonte do jogo.');
  } else {
    info.push('AD_TESTING=false em www/index.html.');
  }

  const rewardedId = findStringValue(
    sourceIndex || webIndex,
    /const\s+AD_UNIT_IDS\s*=\s*\{\s*rewarded\s*:\s*'([^']+)'/m
  );
  if (!rewardedId) {
    errors.push('AD_UNIT_IDS.rewarded nao encontrado no index.html.');
  } else {
    info.push('Rewarded Ad Unit ID configurado: ' + rewardedId);
  }
}

function validateAndroidConfig() {
  const appGradle = readText(PATHS.appGradle, 'Gradle do app');
  const varsGradle = readText(PATHS.varsGradle, 'Variaveis do Android');
  const manifest = readText(PATHS.manifest, 'AndroidManifest');

  const versionCode = Number(findStringValue(appGradle, /versionCode\s+(\d+)/));
  const versionName = findStringValue(appGradle, /versionName\s+"([^"]+)"/);
  if (!Number.isFinite(versionCode) || versionCode < 1) {
    errors.push('versionCode invalido em android/app/build.gradle.');
  } else {
    info.push('versionCode atual: ' + versionCode);
  }
  if (!versionName) {
    errors.push('versionName nao encontrado em android/app/build.gradle.');
  } else {
    info.push('versionName atual: ' + versionName);
  }

  const targetSdk = Number(findStringValue(varsGradle, /targetSdkVersion\s*=\s*(\d+)/));
  if (!Number.isFinite(targetSdk)) {
    errors.push('targetSdkVersion nao encontrado em android/variables.gradle.');
  } else {
    info.push('targetSdkVersion atual: ' + targetSdk);
  }

  const appId = findStringValue(
    manifest,
    /<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[\s\S]*?android:value="([^"]+)"/m
  );
  if (!appId) {
    errors.push('APPLICATION_ID do AdMob nao encontrado no AndroidManifest.xml.');
  } else {
    info.push('AdMob App ID no Manifest: ' + appId);
  }
}

function validateKeystore() {
  if (!fs.existsSync(PATHS.keystoreProps)) {
    errors.push(
      'Arquivo obrigatorio ausente: android/keystore.properties (use android/keystore.properties.example como base).'
    );
    return;
  }

  const props = parseProperties(readText(PATHS.keystoreProps, 'keystore.properties'));
  const required = ['storeFile', 'storePassword', 'keyAlias', 'keyPassword'];
  for (const key of required) {
    if (!props[key]) {
      errors.push('Campo obrigatorio ausente em keystore.properties: ' + key);
    }
  }

  if (props.storeFile) {
    const storeFilePath = path.isAbsolute(props.storeFile)
      ? props.storeFile
      : path.resolve(ANDROID_DIR, props.storeFile);
    if (!fs.existsSync(storeFilePath)) {
      errors.push('Arquivo da keystore nao encontrado: ' + storeFilePath);
    } else {
      info.push('Keystore encontrada: ' + storeFilePath);
    }
  }

  if (!fs.existsSync(PATHS.keystorePropsExample)) {
    warnings.push('Template recomendado ausente: android/keystore.properties.example');
  }
}

function printList(title, items) {
  if (!items.length) return;
  console.log('\n' + title);
  for (const item of items) {
    console.log('- ' + item);
  }
}

function main() {
  console.log('Release preflight - LightLineRUSH');
  validateAdConfig();
  validateAndroidConfig();
  validateKeystore();

  printList('[INFO]', info);
  printList('[WARN]', warnings);
  printList('[ERROS]', errors);

  if (errors.length) {
    console.error('\nPreflight falhou: corrija os erros antes de gerar o AAB de release.');
    process.exit(1);
  }

  console.log('\nPreflight OK. Projeto pronto para bundleRelease.');
}

main();
