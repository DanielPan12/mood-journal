import {MOODS, localDay, summarize} from './data.js';
import {moodPrint} from './prints.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = value => new Date(value.length === 10 ? value+'T12:00:00' : value).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});
const arrow = '<span aria-hidden="true">↗</span>';
export function readDraft() {
  try {
    const d=JSON.parse(sessionStorage.getItem('xinqing-draft')||'null');
    if(d && Number.isInteger(d.mood) && d.mood>=1 && d.mood<=5 && Number.isInteger(d.energy) && d.energy>=1 && d.energy<=5 && typeof d.note==='string' && d.note.length<=10000)return d;
  } catch {}
  return {mood:3,energy:3,note:''};
}
export function storeDraft(draft) { try { sessionStorage.setItem('xinqing-draft',JSON.stringify(draft)); } catch {} }
export function removeDraft() { try { sessionStorage.removeItem('xinqing-draft'); } catch {} }

export const energyLabel = score => ['有些耗尽','有点疲惫','刚刚好','比较有劲','精力充沛'][score-1];
export function coordinatePanel(mood,energy) {
  return `<section class="coordinate-panel" aria-labelledby="coordinate-title"><div class="panel-heading"><div><span class="step-label">01 · 感受此刻</span><h2 id="coordinate-title">心情与精力</h2></div><span class="drag-hint"><span aria-hidden="true">↔</span> 拖动圆点选择</span></div>
  <div class="plane-wrap"><span class="plane-axis axis-energy-high">精力充沛</span><span class="plane-axis axis-energy-low">有些耗尽</span><span class="plane-axis axis-mood-low">心情低落</span><span class="plane-axis axis-mood-high">心情愉快</span><div class="state-plane" id="state-plane" data-coordinate-plane data-mood="${mood}" data-energy="${energy}" tabindex="0" role="group" aria-roledescription="二维状态选择器" aria-label="心情${MOODS[mood-1].label}，精力${energy}/5" aria-describedby="plane-instructions" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"><div class="plane-quarter quarter-tense"><strong>紧绷</strong><span>不太好，但有些激动</span></div><div class="plane-quarter quarter-bright"><strong>兴奋</strong><span>心情好，也很有劲</span></div><div class="plane-quarter quarter-low"><strong>低落</strong><span>不太好，也有点累</span></div><div class="plane-quarter quarter-calm"><strong>平静</strong><span>心情好，想慢下来</span></div><span class="plane-marker" id="plane-marker" style="left:${10+(mood-1)*20}%;top:${90-(energy-1)*20}%" aria-hidden="true"><i></i></span></div></div>
  <div class="selection-summary" aria-live="polite" aria-atomic="true"><span id="selection-art">${moodPrint(mood)}</span><div><span>心情</span><strong id="selected-mood">${MOODS[mood-1].label}</strong></div><span class="summary-divider"></span><div><span>精力 <small id="selected-energy-score">${energy} / 5</small></span><strong id="selected-energy">${energyLabel(energy)}</strong></div></div><p id="plane-instructions" class="plane-instructions">点击或拖动选择；键盘方向键也可以调整。</p></section>`;
}

export function keptCards(list, limit=3) {
  return list.filter(e=>e.kept).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,limit).map(e=>`<button class="memory-card ink-${e.mood}" data-action="view" data-id="${esc(e.id)}"><span class="memory-date">${dateLabel(e.createdAt)}<span>留给以后 ↗</span></span><span class="memory-print">${moodPrint(e.mood)}</span><span class="memory-quote">${esc(e.note||e.emotions.join('、')||'只记下了这个心情。')}</span><span class="memory-tags">${esc(e.tags.join(' / ')||MOODS[e.mood-1].label)}</span></button>`).join('');
}

export function notebook({list,mode,mood,energy,note,rec}) {
  const now=new Date(),summary=summarize(list),kept=list.filter(e=>e.kept),month=String(now.getMonth()+1).padStart(2,'0');
  return `<div class="notebook-heading"><div><span class="edition">${now.getFullYear()} 年 ${now.getMonth()+1} 月 ${now.getDate()} 日 · ${now.toLocaleDateString('zh-CN',{weekday:'long'})}</span><h1>此刻，你感觉怎么样？</h1><p>选一个位置，再写下发生的事。</p></div><span class="heading-print" aria-hidden="true">${moodPrint(4)}</span></div>
  <div class="daily-spread">${coordinatePanel(mood,energy)}
  <form class="quick-page" id="quick-form"><div class="panel-heading"><div><span class="step-label">02 · 留下一点记录</span><h2>今天，发生了什么？</h2></div><span class="optional-label">选填</span></div><label class="visually-hidden" for="quick-note">想记下来的事</label><textarea id="quick-note" maxlength="10000" placeholder="一件小事，一句话。\n或者，先只记下现在的心情。">${esc(note)}</textarea><div class="quick-mood-heading"><span>也可以直接选心情</span><span>精力会保留</span></div><div class="print-choices" role="group" aria-label="直接选择心情">${MOODS.map(m=>`<button type="button" data-action="quick-mood" data-mood="${m.score}" aria-pressed="${mood===m.score}" aria-label="${m.label}">${moodPrint(m.score)}<span>${m.label}</span><i></i></button>`).join('')}</div><p class="form-error" id="quick-error" role="alert"></p><div class="quick-actions"><button type="button" class="link-button" data-action="expand-entry"><span aria-hidden="true">＋</span> 添加事件、感受或时间</button><button class="button" type="submit">保存这一刻 <span aria-hidden="true">→</span></button></div><span class="quick-privacy">仅保存在当前浏览器${mode==='demo'?' · 示例不会写入':''}</span></form></div>
  <section class="week-section"><div class="section-heading"><div><span class="edition">七天，一起看</span><h2>这一周的颜色</h2></div><a href="#insights">看看变化 ${arrow}</a></div><div class="week-prints">${summary.daily.map(d=>{const score=d.average===null?0:Math.round(d.average);return `<button class="day-print ${score?'ink-'+score:'day-unwritten'}" data-action="open-day" data-date="${d.date}" aria-label="${dateLabel(d.date)}，${score?'平均心情 '+d.average.toFixed(1)+'，'+d.count+' 条记录':'未记录'}"><span class="day-date">${dateLabel(d.date)}${d.date===localDay()?' · 今天':''}</span>${score?moodPrint(score):'<span class="unwritten-ring"></span>'}<span class="day-caption">${score?MOODS[score-1].label:'空白也没关系'}<small>${score?d.count+' 条':'未记录'}</small></span></button>`;}).join('')}</div><p class="week-caption">每一天取心情均值，点开可以看到那天的日记。没有记录的日子留白。</p></section>
  <section class="memory-section"><div class="section-heading"><div><span class="edition">自己的经历，留着慢慢读</span><h2>留给以后</h2></div><button class="link-button" data-action="kept-journal">${kept.length?'全部 '+kept.length+' 页':'去日记里挑一页'} ${arrow}</button></div>${kept.length?`<div class="memory-grid">${keptCards(list)}</div>`:'<div class="keepsake-empty"><span class="bookmark-sketch" aria-hidden="true">▱</span><div><h3>哪一页，是你还想再读一次的？</h3><p>日记里点「留给以后」，它就会出现在这里。开心的、不开心的，都可以。</p></div></div>'}</section>
  <section class="rest-ticket"><span class="ticket-label">休息片刻</span><div><h2>${esc(rec.title)}</h2><p>${esc(rec.reason)}</p></div><button data-action="practice" data-id="${rec.id}"><span>${rec.minutes} 分钟</span><b aria-hidden="true">↗</b></button></section>`;
}
