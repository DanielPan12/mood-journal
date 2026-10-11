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

export function keptCards(list, limit=3) {
  return list.filter(e=>e.kept).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,limit).map(e=>`<button class="memory-card ink-${e.mood}" data-action="view" data-id="${esc(e.id)}"><span class="memory-date">${dateLabel(e.createdAt)}<span>留给以后 ↗</span></span><span class="memory-print">${moodPrint(e.mood)}</span><span class="memory-quote">${esc(e.note||e.emotions.join('、')||'只记下了这个心情。')}</span><span class="memory-tags">${esc(e.tags.join(' / ')||MOODS[e.mood-1].label)}</span></button>`).join('');
}

export function notebook({list,mode,mood,energy,note,rec}) {
  const now=new Date(),summary=summarize(list),kept=list.filter(e=>e.kept),month=String(now.getMonth()+1).padStart(2,'0');
  return `<div class="notebook-heading"><div><span class="edition">心晴 · 日常记录</span><h1>写下今天。</h1></div><div class="today-date"><strong>${month} / ${String(now.getDate()).padStart(2,'0')}</strong><span>${now.getFullYear()} · ${now.toLocaleDateString('zh-CN',{weekday:'long'})}</span></div></div>
  <section class="daily-spread" aria-label="记录此刻"><div class="feeling-cover ink-${mood}" id="feeling-cover"><div class="cover-meta"><span>此刻的心情</span><span id="cover-score">0${mood} / 05</span></div><div class="cover-print" id="cover-print">${moodPrint(mood)}</div><div class="cover-bottom"><h2 id="cover-label">${MOODS[mood-1].label}。</h2><span>一天可以有<br>不止一种心情。</span></div><div class="cover-rule"></div></div>
  <form class="quick-page" id="quick-form"><div class="quick-intro"><h2>现在是什么感觉？</h2><button type="button" class="text-link" data-action="open-coordinate">用坐标选 ${arrow}</button></div><div class="print-choices" role="group" aria-label="选择现在的心情">${MOODS.map(m=>`<button type="button" data-action="quick-mood" data-mood="${m.score}" aria-pressed="${mood===m.score}" aria-label="${m.label}">${moodPrint(m.score)}<span>${m.label}</span><i></i></button>`).join('')}</div>
  <label class="quick-note-label" for="quick-note">有什么想记下来的？<span>也可以只选心情</span></label><textarea id="quick-note" maxlength="10000" placeholder="比如，今天回家的路上……">${esc(note)}</textarea><div class="quick-energy"><label for="quick-energy">精力 <output id="quick-energy-label">${energy}/5</output></label><input id="quick-energy" type="range" min="1" max="5" value="${energy}" aria-label="现在的精力"><span>耗尽 → 充沛</span></div><p class="form-error" id="quick-error" role="alert"></p><div class="quick-actions"><button type="button" class="link-button" data-action="expand-entry">加事件、感受与时间 ${arrow}</button><button class="button" type="submit">收好这一页 <span aria-hidden="true">↗</span></button></div><span class="quick-privacy">仅保存在当前浏览器${mode==='demo'?' · 保存后进入你的日记':''}</span></form></section>
  <section class="week-section"><div class="section-heading"><div><span class="edition">七天，一起看</span><h2>这一周的颜色</h2></div><a href="#insights">看看变化 ${arrow}</a></div><div class="week-prints">${summary.daily.map(d=>{const score=d.average===null?0:Math.round(d.average);return `<button class="day-print ${score?'ink-'+score:'day-unwritten'}" data-action="open-day" data-date="${d.date}" aria-label="${dateLabel(d.date)}，${score?'平均心情 '+d.average.toFixed(1)+'，'+d.count+' 条记录':'未记录'}"><span class="day-date">${dateLabel(d.date)}${d.date===localDay()?' · 今天':''}</span>${score?moodPrint(score):'<span class="unwritten-ring"></span>'}<span class="day-caption">${score?MOODS[score-1].label:'空白也没关系'}<small>${score?d.count+' 条':'未记录'}</small></span></button>`;}).join('')}</div><p class="week-caption">每一天取心情均值，点开可以看到那天的日记。没有记录的日子留白。</p></section>
  <section class="memory-section"><div class="section-heading"><div><span class="edition">自己的经历，留着慢慢读</span><h2>留给以后</h2></div><button class="link-button" data-action="kept-journal">${kept.length?'全部 '+kept.length+' 页':'去日记里挑一页'} ${arrow}</button></div>${kept.length?`<div class="memory-grid">${keptCards(list)}</div>`:'<div class="keepsake-empty"><span class="bookmark-sketch" aria-hidden="true">▱</span><div><h3>哪一页，是你还想再读一次的？</h3><p>日记里点「留给以后」，它就会出现在这里。开心的、不开心的，都可以。</p></div></div>'}</section>
  <section class="rest-ticket"><span class="ticket-label">休息片刻</span><div><h2>${esc(rec.title)}</h2><p>${esc(rec.reason)}</p></div><button data-action="practice" data-id="${rec.id}"><span>${rec.minutes} 分钟</span><b aria-hidden="true">↗</b></button></section>`;
}
