/** Small, self-contained care activities. No network requests or external audio. */
export const CARES = Object.freeze([
  { id: 'breathe', title: '跟着呼吸', category: '呼吸', minutes: 1, description: '看圆圈的节奏呼吸，也可以选择自己的节奏。', reason: '想暂停一下时，可以先把注意力放回呼吸。', color: '#dae7d4', icon: '◌' },
  { id: 'music', title: '听会儿音乐', category: '音乐', minutes: 3, description: '三分钟合成器和弦，没有歌词，可以调节音量。', reason: '不想做太多时，让柔和的声音陪你坐一会儿。', color: '#e4e1ed', icon: '♫' },
  { id: 'grounding', title: '看看周围', category: '感官', minutes: 2, description: '找五样看得到的东西，再留意触感、声音和气味。', reason: '思绪有些拥挤时，试着看看、听听身边的事物。', color: '#f0e6cf', icon: '✧' },
  { id: 'stretch', title: '松开肩膀', category: '舒展', minutes: 3, description: '耸肩、绕肩、放松双手。坐着也能做。', reason: '久坐或身体紧绷时，给肩膀一点活动的空间。', color: '#e3e8df', icon: '↗' },
]);

const FEEDBACK = ['轻松一些', '差不多', '仍需休息'];
let closeActive = null;

function injectStyles() {
  if (document.getElementById('care-module-styles')) return;
  const style = document.createElement('style');
  style.id = 'care-module-styles';
  style.textContent = `
    .care-dialog { box-sizing:border-box; width:min(540px,calc(100% - 28px)); max-height:calc(100dvh - 32px); padding:0; border:1px solid #dce2d8; border-radius:28px; background:#fafaf5; color:#283e36; box-shadow:0 28px 100px #263a3433; font:15px/1.7 "PingFang SC","Microsoft YaHei",system-ui,sans-serif; overflow:auto; }
    .care-dialog::backdrop { background:#21342e66; backdrop-filter:blur(5px); }
    .care-dialog * { box-sizing:border-box; }
    .care-dialog .care-inner { padding:30px; }
    .care-dialog .care-top { display:flex; justify-content:space-between; align-items:center; gap:16px; }
    .care-dialog .care-kicker { margin:0; color:#687b67; font-size:12px; letter-spacing:2px; }
    .care-dialog h2 { margin:13px 0 6px; font-size:25px; line-height:1.5; font-weight:550; letter-spacing:-.5px; }
    .care-dialog h3 { font-size:18px; font-weight:550; margin:0 0 8px; }
    .care-dialog p { margin:0; }
    .care-dialog .care-muted { color:#657269; font-size:13px; }
    .care-dialog button,.care-dialog select { font:inherit; }
    .care-dialog button { cursor:pointer; min-height:44px; border:1px solid #c8d2c2; border-radius:13px; padding:10px 18px; background:#fdfef9; color:#354e3a; line-height:1.5; transition:background .15s; }
    .care-dialog button:hover { background:#eaf0e4; }
    .care-dialog button:disabled { opacity:.52; cursor:default; }
    .care-dialog :focus-visible { outline:3px solid #738d67; outline-offset:3px; }
    .care-dialog .care-close { width:44px; flex:none; padding:0; background:transparent; font-size:25px; border:0; border-radius:50%; }
    .care-dialog .care-primary { background:#53704b; border-color:#53704b; color:#fff; }
    .care-dialog .care-primary:hover { background:#425e3c; }
    .care-dialog .care-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
    .care-dialog .care-actions button { flex:1; }
    .care-dialog .care-visual { display:grid; place-items:center; margin:26px 0 22px; min-height:132px; }
    .care-dialog .care-orb { width:114px; height:114px; display:grid; place-items:center; background:radial-gradient(circle at 30% 22%,#f7f4d9,var(--care-tint,#dce7d2)); border:1px solid #bdccb650; border-radius:50%; font-size:38px; color:#66815d; transition:transform .25s linear; }
    .care-dialog .care-clock { text-align:center; font-size:36px; line-height:1.3; font-variant-numeric:tabular-nums; letter-spacing:2px; }
    .care-dialog .care-clock-label { display:block; text-align:center; color:#71806e; font-size:12px; margin-top:4px; }
    .care-dialog .care-progress { appearance:none; width:100%; height:5px; margin:18px 0 20px; display:block; border:none; border-radius:5px; background:#e6ebdf; overflow:hidden; }
    .care-dialog .care-progress::-webkit-progress-bar { background:#e6ebdf; }
    .care-dialog .care-progress::-webkit-progress-value { background:#8da67b; }
    .care-dialog .care-progress::-moz-progress-bar { background:#8da67b; }
    .care-dialog .care-guidance { padding:20px; border:1px solid #e1e6d9; border-radius:18px; background:#f0f3e9; min-height:137px; }
    .care-dialog .care-guidance p { font-size:14px; line-height:1.85; color:#5f705c; }
    .care-dialog .care-setting { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-top:17px; color:#5c6f57; font-size:13px; }
    .care-dialog .care-setting select { min-height:42px; max-width:100%; background:#fffef8; color:#354e3a; border:1px solid #c8d2c2; border-radius:9px; padding:5px 10px; }
    .care-dialog .care-setting input { flex:1; min-width:80px; accent-color:#668653; }
    .care-dialog .care-help { margin-top:14px; color:#6a7965; font-size:12px; line-height:1.8; }
    .care-dialog .care-error { margin-top:14px; color:#8c453f; font-size:13px; }
    .care-dialog .care-feedback { display:grid; gap:10px; margin-top:24px; }
    .care-dialog .care-feedback button { text-align:left; padding:13px 17px; }
    .care-dialog .care-feedback button[aria-pressed="true"] { background:#e2ecd9; border-color:#6e8b5b; color:#35552b; box-shadow:inset 0 0 0 1px #6e8b5b; }
    .care-dialog .care-finished { margin:26px 0 18px; font-size:40px; color:#789166; }
    .care-dialog [hidden] { display:none!important; }
    @media(max-width:480px) { .care-dialog { border-radius:23px; } .care-dialog .care-inner { padding:22px; } .care-dialog h2 { font-size:22px; } .care-dialog .care-visual { margin:23px 0 20px; min-height:104px; } .care-dialog .care-orb { width:94px; height:94px; } }
    @media(prefers-reduced-motion:reduce) { .care-dialog * { transition:none!important; animation:none!important; } .care-dialog .care-orb { transform:none!important; } }
  `;
  document.head.append(style);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}

function durationText(seconds) {
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return mins ? `${mins} 分钟${rest ? ` ${rest} 秒` : ''}` : `${rest} 秒`;
}

function uniqueId() {
  return globalThis.crypto?.randomUUID?.() || `care-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Opens a modal. Cancel/close never calls onComplete.
 * onComplete(session) may be async; rejection keeps feedback open for retry.
 * session: {id, activityId, title, durationSeconds, minutes, feedback, at}.
 * minutes is actual active time rounded to one decimal; durationSeconds is exact to the second.
 */
export function openCare(id, { onComplete = () => {} } = {}) {
  const care = CARES.find((item) => item.id === id);
  if (!care) throw new Error(`Unknown care activity: ${id}`);
  closeActive?.();
  injectStyles();
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'care-dialog';
  dialog.setAttribute('aria-labelledby', 'care-title');
  dialog.setAttribute('aria-describedby', 'care-description');
  dialog.style.setProperty('--care-tint', care.color);
  dialog.innerHTML = `
    <div class="care-inner">
      <div class="care-top"><p class="care-kicker">休息练习</p><button type="button" class="care-close" aria-label="关闭练习，不保存">×</button></div>
      <h2 id="care-title"></h2><p id="care-description" class="care-muted"></p>
      <section class="care-exercise">
        <div class="care-visual" aria-hidden="true"><div class="care-orb"></div></div>
        <div class="care-clock" aria-live="off"></div><span class="care-clock-label">剩余时间</span>
        <progress class="care-progress" value="0" max="100" aria-label="练习进度"></progress>
        <div class="care-guidance" aria-live="polite" aria-atomic="true"><h3></h3><p></p></div>
        <div class="care-settings"></div>
        <p class="care-help"></p>
        <div class="care-actions"><button type="button" class="care-primary care-toggle"></button><button type="button" class="care-end" disabled>结束练习</button></div>
      </section>
      <section class="care-result" hidden>
        <div class="care-finished" aria-hidden="true">✧</div>
        <h3 tabindex="-1" class="care-result-heading">此刻的你，感觉如何？</h3>
        <p class="care-muted care-duration"></p>
        <div class="care-feedback" role="group" aria-label="选择练习后的感受"></div>
        <p class="care-help">这次有没有舒服一点？照实选就行。</p>
        <div class="care-actions"><button type="button" class="care-primary care-save" disabled>保存这次练习</button><button type="button" class="care-discard">不保存，返回</button></div>
      </section>
      <p class="care-error" role="alert" hidden></p>
    </div>`;
  const $ = (selector) => dialog.querySelector(selector);
  $('#care-title').textContent = care.title;
  $('#care-description').textContent = care.description;
  $('.care-orb').textContent = care.icon;

  let targetSeconds = care.minutes * 60;
  let elapsedMs = 0;
  let runAt = null;
  let started = false;
  let finished = false;
  let closed = false;
  let preparing = false;
  let saving = false;
  let interval = null;
  let lastGuidance = '';
  let audioContext = null;
  let masterGain = null;
  let audioGeneration = 0;
  let volume = 0.3;
  let lastChord = -1;
  let selectedFeedback = null;
  let sessionBase = null;
  const audioNodes = new Set();

  const getElapsedMs = () => Math.min(targetSeconds * 1000, Math.max(0, elapsedMs + (runAt === null ? 0 : Date.now() - runAt)));

  function showError(message = '') {
    $('.care-error').textContent = message;
    $('.care-error').hidden = !message;
  }

  function stopAudio() {
    audioGeneration += 1;
    for (const node of audioNodes) {
      try { node.stop(); } catch { /* Already ended. */ }
      try { node.disconnect(); } catch { /* Already detached. */ }
    }
    audioNodes.clear();
    masterGain?.disconnect();
    masterGain = null;
    const context = audioContext;
    audioContext = null;
    if (context && context.state !== 'closed') context.close().catch(() => {});
    lastChord = -1;
  }

  // Original, locally synthesized slow chords; no recording or remote media.
  function playChord(elapsedSeconds) {
    if (!audioContext || !masterGain || audioContext.state !== 'running') return;
    const chordIndex = Math.floor(elapsedSeconds / 12);
    if (lastChord === chordIndex) return;
    lastChord = chordIndex;
    const chords = [[130.81, 196, 261.63, 329.63], [110, 164.81, 220, 293.66], [87.31, 130.81, 174.61, 261.63], [98, 146.83, 196, 293.66]];
    const now = audioContext.currentTime;
    const length = Math.min(14, targetSeconds - elapsedSeconds + 0.2);
    if (length <= 0) return;
    chords[chordIndex % chords.length].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 ? 3 : -3;
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.075, now + Math.min(2, length * 0.25));
      envelope.gain.setValueAtTime(0.075, now + Math.max(length * 0.3, length - 3));
      envelope.gain.linearRampToValueAtTime(0, now + length);
      oscillator.connect(envelope);
      envelope.connect(masterGain);
      audioNodes.add(oscillator);
      oscillator.onended = () => { audioNodes.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(now);
      oscillator.stop(now + length);
    });
  }

  async function startAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('这个浏览器暂时无法播放合成音频。可以试试其他练习。');
    const generation = ++audioGeneration;
    const context = new AudioContextClass();
    audioContext = context;
    masterGain = context.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(context.destination);
    await context.resume();
    if (closed || generation !== audioGeneration) return false;
    if (context.state !== 'running') throw new Error('声音暂时无法播放，请再试一次。');
    return true;
  }

  function guidance(elapsedSeconds) {
    if (care.id === 'breathe') {
      if ($('.care-rhythm').value === 'natural') return ['按自己的节奏', '让呼吸自然来去。只要感觉舒适，不需要刻意吸得更深。'];
      if (!started) return ['找一个舒服的姿势', '如果舒适，可以吸气约 4 秒、呼气约 6 秒。不必屏息，也不需要勉强跟上。'];
      return elapsedSeconds % 10 < 4
        ? ['轻轻吸气', '让空气自然进入。跟随节奏，或回到你舒服的呼吸。']
        : ['缓缓呼气', '轻轻呼出，不必用力。下一次吸气自然开始。'];
    }
    if (care.id === 'music') return [
      ['先调到舒服的音量', '点击开始后会播放轻柔的合成器和弦。可以睁眼，也可以把视线停在一处。'],
      ['让声音慢慢经过', '不必刻意集中注意力。听见一个声音，再给自己一点空间。'],
      ['只是坐在这里，也很好', '注意身体与椅子或地面的接触，保持舒服的姿势。'],
    ][Math.min(2, Math.floor(elapsedSeconds / 60))];
    if (care.id === 'grounding') return [
      ['5 · 看见五样东西', '慢慢看看周围，在心里说出五样看到的事物。留意它们的颜色或形状。'],
      ['4 · 感受四处触感', '试着感受衣料、椅面、脚下的地板，或手心的温度。选你方便感受到的四处。'],
      ['3 · 听见三种声音', '留意近处、远处或自己的呼吸声。安静也可以，不需要凑齐。'],
      ['2 · 留意两种气味', '发现周围的气味，也可以想起两种你喜欢的气味。没有闻到也没关系。'],
      ['1 · 感受一种味道', '留意口中的味道，或想象一种熟悉的味道。最后再看看你所在的地方。'],
    ][Math.min(4, Math.floor(elapsedSeconds / 24))];
    return [
      ['先让肩膀放下来', '坐稳或站稳，双脚有支撑。轻轻抬起肩膀，再自然放下，按舒适的速度重复。'],
      ['轻轻活动肩膀', '让双肩向后画小小的圆，动作缓慢、幅度舒服。手臂自然垂放。'],
      ['找回舒服的头颈位置', '看向前方，轻轻收一点下巴，回到自然位置。幅度很小即可，不低头用力、不转圈。'],
      ['松开双手，回到自然', '轻轻张开再放松双手，肩膀自然垂下。最后停一会儿，感受此刻的身体。'],
    ][Math.min(3, Math.floor(elapsedSeconds / 45))];
  }

  function update() {
    if (closed || finished) return;
    const elapsed = getElapsedMs() / 1000;
    $('.care-clock').textContent = formatTime(targetSeconds - elapsed);
    $('.care-progress').value = elapsed / targetSeconds * 100;
    const [title, detail] = guidance(elapsed);
    const key = `${title}|${detail}`;
    if (key !== lastGuidance) {
      $('.care-guidance h3').textContent = title;
      $('.care-guidance p').textContent = detail;
      lastGuidance = key;
    }
    if (care.id === 'breathe') {
      const phase = elapsed % 10;
      const scale = !started || $('.care-rhythm').value === 'natural' ? 1 : 1 + 0.15 * (phase < 4 ? phase / 4 : (10 - phase) / 6);
      $('.care-orb').style.transform = `scale(${scale})`;
    }
    if (runAt !== null) {
      if (elapsed >= targetSeconds) { finish(); return; }
      if (care.id === 'music') playChord(elapsed);
    }
  }

  function pause() {
    if (runAt === null) return;
    if (getElapsedMs() >= targetSeconds * 1000) { finish(); return; }
    elapsedMs = getElapsedMs();
    runAt = null;
    clearInterval(interval);
    interval = null;
    stopAudio();
    $('.care-toggle').textContent = care.id === 'music' ? '继续播放' : '继续练习';
    $('.care-clock-label').textContent = '已暂停 · 时间不会计入练习';
    update();
  }

  async function toggle() {
    if (closed || finished || preparing) return;
    if (runAt !== null) { pause(); return; }
    preparing = true;
    $('.care-toggle').disabled = true;
    showError();
    try {
      if (care.id === 'music' && !await startAudio()) return;
      if (closed || finished) return;
      started = true;
      runAt = Date.now();
      $('.care-toggle').textContent = '暂停';
      $('.care-end').disabled = false;
      $('.care-clock-label').textContent = '剩余时间';
      $('.care-duration-select')?.setAttribute('disabled', '');
      interval = setInterval(update, 200);
      update();
    } catch (error) {
      stopAudio();
      if (!closed) showError(error.message || '暂时无法开始，请再试一次。');
    } finally {
      preparing = false;
      if (!closed) $('.care-toggle').disabled = false;
    }
  }

  function finish() {
    if (closed || finished || !started) return;
    elapsedMs = getElapsedMs();
    runAt = null;
    finished = true;
    clearInterval(interval);
    interval = null;
    stopAudio();
    const durationSeconds = Math.round(elapsedMs / 1000);
    sessionBase = {
      id: uniqueId(), activityId: care.id, title: care.title,
      durationSeconds, minutes: Math.round(durationSeconds / 6) / 10,
      at: new Date().toISOString(),
    };
    $('.care-exercise').hidden = true;
    $('.care-result').hidden = false;
    $('.care-duration').textContent = `已练习 ${durationText(durationSeconds)}。${durationSeconds >= targetSeconds ? '练习结束。' : '已提前结束。'}`;
    showError();
    $('.care-result-heading').focus();
  }

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(interval);
    stopAudio();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', close);
    dialog.close();
    dialog.remove();
    if (closeActive === close) closeActive = null;
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  // Avoid silently counting or playing while the page is in the background.
  function onVisibility() {
    if (document.hidden && preparing) stopAudio();
    if (document.hidden && runAt !== null) {
      update();
      if (!finished) pause();
    }
  }

  const settings = $('.care-settings');
  if (care.id === 'breathe') {
    settings.innerHTML = `
      <label class="care-setting">练习时长 <select class="care-duration-select" aria-label="选择呼吸练习时长"><option value="60">1 分钟</option><option value="180">3 分钟</option></select></label>
      <label class="care-setting">呼吸节奏 <select class="care-rhythm" aria-label="选择呼吸节奏"><option value="paced">可选节奏 · 吸 4 秒 / 呼 6 秒</option><option value="natural">按自己的节奏</option></select></label>`;
    $('.care-duration-select').addEventListener('change', (event) => { targetSeconds = Number(event.target.value); update(); });
    $('.care-rhythm').addEventListener('change', update);
    $('.care-help').textContent = '保持轻柔、自然的呼吸，不屏息、不勉强。若感觉不舒服，恢复平常呼吸或结束练习。';
  } else if (care.id === 'music') {
    settings.innerHTML = '<label class="care-setting">音量 <input class="care-volume" type="range" min="0" max="100" value="30" aria-label="音乐音量"><output class="care-volume-output">30%</output></label>';
    $('.care-volume').addEventListener('input', (event) => {
      volume = Number(event.target.value) / 100;
      $('.care-volume-output').textContent = `${event.target.value}%`;
      if (masterGain && audioContext) masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
    });
    $('.care-help').textContent = '由浏览器实时合成的原创氛围器乐。点击后才播放，可随时调低音量或暂停。切换页面会自动暂停。';
  } else if (care.id === 'grounding') {
    $('.care-help').textContent = '每一步约 24 秒。不需要全部找到，可以跳过不方便感受的部分。';
  } else {
    $('.care-help').textContent = '动作轻柔、小幅度即可，不拉扯头颈。若出现疼痛或头晕，请立即停止；也可以只坐着休息。';
  }
  $('.care-toggle').textContent = care.id === 'music' ? '开始播放' : '开始练习';
  $('.care-toggle').addEventListener('click', toggle);
  $('.care-end').addEventListener('click', finish);
  $('.care-close').addEventListener('click', close);
  $('.care-discard').addEventListener('click', close);
  FEEDBACK.forEach((feedback) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = feedback;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (saving) return;
      selectedFeedback = feedback;
      $('.care-feedback').querySelectorAll('button').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
      $('.care-save').disabled = false;
    });
    $('.care-feedback').append(button);
  });
  $('.care-save').addEventListener('click', async () => {
    if (saving || !selectedFeedback || !sessionBase || closed) return;
    saving = true;
    $('.care-save').disabled = true;
    $('.care-save').textContent = '正在保存…';
    showError();
    try {
      await onComplete({ ...sessionBase, feedback: selectedFeedback });
      close();
    } catch {
      if (!closed) {
        showError('这次练习还没有保存成功。可以再试一次，或选择不保存。');
        $('.care-save').disabled = false;
        $('.care-save').textContent = '重新保存';
      }
    } finally { saving = false; }
  });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('close', close);
  document.body.append(dialog);
  closeActive = close;
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', close);
  update();
  dialog.showModal();
  $('.care-toggle').focus();
  return { close };
}
