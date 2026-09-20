# LightLineRUSH — empacotamento Android (Capacitor)

Wrapper Capacitor do jogo web `LightLineRUSH` (pasta irmã `../LightLineRUSH`, que continua servindo o GitHub Pages sem nenhuma mudança de estrutura). Este projeto só existe para gerar o app Android e integrar anúncios recompensados (AdMob).

## Como funciona

- `../LightLineRUSH` é a fonte única do jogo (HTML/JS/CSS + `musics/` + `sprites/`). Nada aqui duplica esse código.
- `npm run build:web` (`scripts/build-web.js`) copia esses arquivos + os bundles `dist/capacitor.js` e `dist/plugin.js` (dos pacotes `@capacitor/core` e `@capacitor-community/admob`, publicados prontos para uso via `<script>`, sem bundler) para `www/`, e injeta as duas tags `<script>` só nessa cópia.
- `npm run sync` roda o build acima e depois `npx cap sync android`, que copia `www/` para `android/app/src/main/assets/public` e garante que o módulo nativo do AdMob esteja referenciado no Gradle.
- Sempre que `../LightLineRUSH/index.html` mudar, rode `npm run sync` de novo antes de abrir o Android Studio.

## Ajustes de Gradle já aplicados

- `android/gradle.properties`: `android.overridePathCheck=true` — o AGP recusa compilar se o caminho do projeto tiver caracteres não-ASCII (ex.: usuário do Windows com acento). Como este projeto não usa NDK/C++, é seguro ignorar essa checagem em vez de mover a pasta.
- `patches/@capacitor-community+admob+8.1.0.patch` (via `patch-package`, roda sozinho no `postinstall`): a versão publicada do plugin usa `getDefaultProguardFile('proguard-android.txt')` no `android/build.gradle` dele, chamada removida em versões recentes do Android Gradle Plugin. O patch troca para `'proguard-android-optimize.txt'`. Isso é reaplicado automaticamente toda vez que rodar `npm install`.

## O que já está implementado no jogo (`../LightLineRUSH/index.html`)

Um objeto `Ads` detecta se está rodando dentro do app nativo (`Capacitor.isNativePlatform()`). Na versão web ele nunca ativa nada — os botões de anúncio ficam ocultos e o jogo se comporta exatamente como antes.

Três pontos de anúncio recompensado:

1. **Reviver**: ao morrer (sem o poder VHS ativo), se ainda não usou o revive-por-anúncio nesta corrida, mostra a tela "Continuar a corrida?" com opção de assistir anúncio (reaproveita a mesma função `rewind()` do poder VHS) ou desistir.
2. **Bônus na garagem**: botão fixo no topo da garagem, `+40 moedas` por anúncio assistido, com cooldown de 15 min (persistido em `localStorage`).
3. **Bônus pós-corrida**: na tela de resultado, botão para assistir anúncio e dobrar as moedas ganhas naquela corrida.

Constantes ajustáveis no topo do bloco `Ads` em `index.html`: `AD_UNIT_IDS`, `AD_BONUS_COINS`, `AD_BONUS_COOLDOWN_MS`, `AD_RUN_BONUS_MULT`, `AD_TESTING`, `AD_TEST_DEVICE_IDS`.

### App ID e Ad Unit ID (já configurados)

- App ID (AdMob, `apps.admob.com`): `ca-app-pub-5824886976919418~2212374521` — em `android/app/src/main/AndroidManifest.xml`.
- Ad Unit ID (Rewarded): `ca-app-pub-5824886976919418/6687815316` — em `AD_UNIT_IDS.rewarded` (`../LightLineRUSH/index.html`).

### `AD_TESTING` — controle de teste x anúncio real

O plugin do AdMob tem uma proteção própria: enquanto `AD_TESTING = true` (valor atual), ele **ignora silenciosamente o Ad Unit ID real** e sempre mostra o anúncio de teste genérico do Google — mesmo já com o ID real configurado acima. Isso é seguro (sem risco pra conta AdMob) mas também significa **zero receita real** enquanto estiver assim.

- Enquanto testa no Android Studio: deixe `AD_TESTING = true`. Se quiser ver o criativo real (com selo "Test Ad", sem contar como impressão paga) no seu aparelho específico, pegue o ID de teste do dispositivo no Logcat (aparece na primeira tentativa de carregar anúncio, algo como `setTestDeviceIds(Arrays.asList("XXXXX"))`) e cole em `AD_TEST_DEVICE_IDS`.
- **Antes de gerar a build de release pra Play Store**: trocar `AD_TESTING` para `false`. Só assim o app passa a servir anúncios reais e gerar receita.

## Ícone e splash screen

Já gerados a partir de arte neon feita sob medida para o jogo. Fontes em `assets/` (Custom Mode do `@capacitor/assets`):

- `assets/icon-only.png` — ícone legado (pré-Android 8) e ícone redondo.
- `assets/icon-background.png` + `assets/icon-foreground.png` (transparente) — ícone adaptativo (Android 8+). Todo o desenho está na camada de fundo; o Android recorta as bordas conforme o formato do launcher (círculo/squircle), o que é esperado.
- `assets/splash.png` / `assets/splash-dark.png` — tela de abertura.
- `store-assets/icon-512.png` e `store-assets/feature-graphic.png` — pra upload direto na ficha da Play Store (não passam pelo gerador, são só o ícone em 512×512 e o banner 1024×500).

Pra regenerar depois de trocar alguma arte: `npx capacitor-assets generate --android`.

## O que falta (fora deste ambiente — aqui não há Android SDK/JDK instalados)

1. **Testar de verdade**: instalar o [Android Studio](https://developer.android.com/studio) (já traz JDK + SDK), rodar `npm run sync`, depois `npx cap open android`, e testar num emulador/dispositivo os 3 fluxos de anúncio (com `AD_TESTING=true`, os anúncios aparecem com um selo "Test Ad") e conferir o ícone/splash no launcher.
2. **Assinar e gerar o bundle de release**: criar um keystore (`keytool -genkey ...` ou pelo próprio Android Studio, *Build > Generate Signed Bundle*), gerar o `.aab` (obrigatório — a Play Store não aceita mais `.apk` para novos apps).
3. **Trocar `AD_TESTING` para `false`** em `../LightLineRUSH/index.html` antes dessa build de release (senão o app publicado nunca mostra anúncio real).
4. **Play Console**: criar o app, preencher política de privacidade (URL pública — obrigatória por causa do AdMob), classificação de conteúdo, formulário de segurança de dados (declarar uso de Advertising ID / AdMob), screenshots, descrição, subir `store-assets/icon-512.png` + `store-assets/feature-graphic.png`, e enviar o `.aab` assinado.

## Comandos úteis

```powershell
npm install          # instala @capacitor/core, @capacitor/android, @capacitor/cli, @capacitor-community/admob
npm run sync          # gera www/ e sincroniza com o projeto Android
npm run open:android  # abre o projeto no Android Studio
```
