'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8413;
const DEFAULT_LOGIN = 'powergpu';
const DEFAULT_ID = '54276431';
const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
const GQL_URL = 'https://gql.twitch.tv/gql';
const USER_HASH = 'bf6c594605caa0c63522f690156aa04bd434870bf963deb76668c381d16fcaa5';
const PLUS_HASH = '47af8e6f5ca964540743363dcd5c38e79b1a4375e42ba14b9a69b199c7302cee';
const started = Date.now();
const cache = new Map();
const inflight = new Map();
const rateLimits = new Map();
const overlayPath = path.join(__dirname, 'overlay.html');
const overlaySource = fs.readFileSync(overlayPath, 'utf8');
const landingPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Twitch Plus Goal Overlay Builder</title><style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#080a10;color:#f5f6fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 50% -15%,#252141 0,#10121e 42%,#080a10 78%);padding:48px 20px}.shell{max-width:900px;margin:auto}.brand{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#b7b8cc;font-weight:800}.hero{margin:24px 0 30px}.hero h1{font-size:clamp(34px,7vw,56px);line-height:1.02;letter-spacing:-.04em;margin:0 0 14px}.hero h1 span{background:linear-gradient(100deg,#a78bfa,#ff6bc8);color:transparent;background-clip:text}.hero p{max-width:640px;color:#b8bdce;line-height:1.6;font-size:16px}.card{background:rgba(17,19,31,.88);border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:clamp(20px,4vw,34px);box-shadow:0 25px 70px rgba(0,0,0,.35)}.step{display:grid;grid-template-columns:34px 1fr;gap:14px;margin-bottom:25px}.num{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:rgba(167,139,250,.15);color:#c8b7ff;font-weight:800}.step h2{font-size:17px;margin:3px 0 12px}.field{display:flex;flex-direction:column;gap:8px}.field label{font-size:13px;color:#aeb3c5}.field input,.field select{width:100%;background:#0b0d16;border:1px solid #33364a;color:#f5f6fb;border-radius:11px;padding:12px 14px;font:inherit;outline:none}.field input:focus,.field select:focus{border-color:#a78bfa;box-shadow:0 0 0 3px rgba(167,139,250,.16)}.choices{display:grid;grid-template-columns:1fr;gap:20px}.help{font-size:12px;color:#858b9f;margin-top:8px}.result{border-top:1px solid rgba(255,255,255,.1);padding-top:24px;margin-top:4px}.result h2{font-size:17px;margin:0 0 8px}.result p{color:#aeb3c5;font-size:13px;margin:0 0 12px}.urlbox{display:flex;gap:10px}.urlbox input{flex:1;min-width:0;background:#080a11;border:1px solid #34374b;color:#d9dbea;border-radius:11px;padding:12px;font:13px ui-monospace,Consolas,monospace}.button{border:0;border-radius:11px;padding:0 18px;background:linear-gradient(100deg,#8a63ff,#e959bd);color:#fff;font-weight:800;font-size:14px;cursor:pointer}.button:hover{filter:brightness(1.12)}.actions{display:flex;align-items:center;gap:16px;margin-top:14px}.preview{color:#d3c7ff;text-decoration:none;font-size:14px;font-weight:700}.preview:hover{text-decoration:underline}.live-preview{margin:0 0 26px 48px;padding:14px;background:#090b13;border:1px solid rgba(255,255,255,.09);border-radius:15px}.preview-head{display:flex;justify-content:space-between;gap:12px;color:#e7e8f0;font-size:13px;font-weight:750;margin-bottom:10px}.preview-head span{font-weight:500;color:#858b9f}.live-preview iframe{display:block;width:100%;height:280px;border:0;border-radius:10px;background:radial-gradient(ellipse at 50% 100%,#252b3d,#0a0c13)}.status{color:#a7e7cb;font-size:13px;min-height:18px}.tile-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.choice-tile{min-width:0;min-height:82px;padding:10px 9px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;text-align:left;color:#e8e9f2;background:#0b0d16;border:1px solid #303347;border-radius:12px;cursor:pointer;transition:border-color .15s,background .15s,transform .15s}.choice-tile:hover{border-color:#8172bd;transform:translateY(-1px)}.choice-tile[aria-pressed="true"]{border-color:#a78bfa;background:rgba(137,105,225,.15);box-shadow:0 0 0 1px rgba(167,139,250,.22)}.tile-icon{font-size:22px;line-height:1;color:#d4c7ff}.tile-name{font-size:13px;font-weight:750}.tile-detail{font-size:10px;color:#8e94a8}.theme-tile{min-height:68px;align-items:stretch}.swatch{height:18px;width:100%;border-radius:8px;background:linear-gradient(100deg,var(--swatch-a),var(--swatch-b));box-shadow:0 0 12px color-mix(in srgb,var(--swatch-a),transparent 60%)}.field select.hidden-select{position:absolute;width:1px;height:1px;padding:0;border:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;clip-path:inset(50%)}.history{margin-top:12px;padding:13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:12px}.history-title{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:750;color:#d7d9e4;margin-bottom:9px}.history-title span{font-size:10px;color:#858b9f;font-weight:500}.history-list{display:grid;gap:7px}.history-row{display:grid;grid-template-columns:62px 1fr 38px;gap:9px;align-items:center;font-size:11px;color:#aeb3c5}.history-track{height:7px;background:rgba(255,255,255,.07);border-radius:9px;overflow:hidden}.history-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#8a63ff,#e959bd)}.history-count{text-align:right;color:#edf0fa;font-variant-numeric:tabular-nums}.history-state{font-size:11px;color:#858b9f}.history-state.error{color:#ffb2b2}.full{padding:34px 38px}.fullbar{margin:28px 0 20px}.fullfoot{gap:18px;align-items:center;flex-wrap:wrap}.fullfoot>span{flex:1;min-width:max-content}.fullfoot>span:nth-child(2){text-align:center}.fullfoot>span:last-child{text-align:right}.banner{padding:18px 24px 16px}.bannerrow{height:54px;grid-template-columns:minmax(210px,1fr) minmax(150px,1.1fr) minmax(180px,1fr);gap:16px}.bannerleft{gap:12px;min-width:0}.bannerleft .month{white-space:nowrap}.bannertitle{font-size:21px;white-space:nowrap}.bannernums{font-size:24px}.bannerbar{margin-top:6px}@media(max-width:760px){.tile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bannerrow{grid-template-columns:1fr 1fr;height:auto}.bannertitle{grid-column:1/-1;grid-row:1;text-align:left}.bannerleft{grid-column:1;grid-row:2}.bannernums{grid-column:2;grid-row:2}.fullfoot>span{min-width:0}}.footer{font-size:12px;color:#777e93;margin:18px 4px 0;line-height:1.6}@media(max-width:600px){body{padding:30px 14px}.choices{grid-template-columns:1fr}.urlbox{flex-direction:column}.button{height:44px}.actions{flex-wrap:wrap}}
</style></head><body><main class="shell"><div class="brand">Twitch Plus Goal</div><header class="hero"><h1>Build your <span>OBS overlay.</span></h1><p>Choose a Twitch channel, a layout, and a color theme. Copy the generated URL into an OBS Browser Source.</p></header><section class="card"><div class="step"><div class="num">1</div><div class="field"><h2>Choose a channel</h2><label for="channel">Twitch channel name</label><input id="channel" value="powergpu" autocomplete="off" maxlength="25" placeholder="channelname"><div class="help">Use the channel login, without the @ symbol.</div><div id="history" class="history"><div class="history-state">Loading Plus history…</div></div></div></div><div class="step"><div class="num">2</div><div><h2>Pick your look</h2><div class="choices"><div class="field"><label>Overlay style</label><div class="tile-grid style-grid" role="group" aria-label="Overlay style"><button type="button" class="choice-tile" data-choice-style="text" aria-pressed="true"><span class="tile-icon">T</span><span class="tile-name">Text</span><span class="tile-detail">Single line</span></button><button type="button" class="choice-tile" data-choice-style="compact" aria-pressed="false"><span class="tile-icon">▰</span><span class="tile-name">Compact</span><span class="tile-detail">Small card</span></button><button type="button" class="choice-tile" data-choice-style="full" aria-pressed="false"><span class="tile-icon">▤</span><span class="tile-name">Full</span><span class="tile-detail">Progress card</span></button><button type="button" class="choice-tile" data-choice-style="ticker" aria-pressed="false"><span class="tile-icon">≋</span><span class="tile-name">Ticker</span><span class="tile-detail">Stream line</span></button><button type="button" class="choice-tile" data-choice-style="hero" aria-pressed="false"><span class="tile-icon">✦</span><span class="tile-name">Hero</span><span class="tile-detail">Large number</span></button><button type="button" class="choice-tile" data-choice-style="ring" aria-pressed="false"><span class="tile-icon">◉</span><span class="tile-name">Ring</span><span class="tile-detail">Progress ring</span></button><button type="button" class="choice-tile" data-choice-style="banner" aria-pressed="false"><span class="tile-icon">▭</span><span class="tile-name">Banner</span><span class="tile-detail">Wide strip</span></button><button type="button" class="choice-tile" data-choice-style="pill" aria-pressed="false"><span class="tile-icon">●</span><span class="tile-name">Pill</span><span class="tile-detail">Badge</span></button></div><select id="style" class="hidden-select" aria-hidden="true" tabindex="-1"><option value="text" selected>Text</option><option value="compact">Compact</option><option value="full">Full</option><option value="ticker">Ticker</option><option value="hero">Hero</option><option value="ring">Ring</option><option value="banner">Banner</option><option value="pill">Pill</option></select></div><div class="field"><label>Color theme</label><div class="tile-grid theme-grid" role="group" aria-label="Color theme"><button type="button" class="choice-tile theme-tile" data-choice-theme="mono" aria-pressed="true"><span class="swatch" style="--swatch-a:#f0f0f5;--swatch-b:#9a9aa5"></span><span class="tile-name">Silver</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="grape" aria-pressed="false"><span class="swatch" style="--swatch-a:#7b46ff;--swatch-b:#ff5ec4"></span><span class="tile-name">Grape</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="mint" aria-pressed="false"><span class="swatch" style="--swatch-a:#45e6cf;--swatch-b:#5ecbff"></span><span class="tile-name">Mint</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="gold" aria-pressed="false"><span class="swatch" style="--swatch-a:#ffd166;--swatch-b:#ff9e2c"></span><span class="tile-name">Gold</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="ocean" aria-pressed="false"><span class="swatch" style="--swatch-a:#4f8cff;--swatch-b:#5de0e6"></span><span class="tile-name">Ocean</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="sunset" aria-pressed="false"><span class="swatch" style="--swatch-a:#ff6b6b;--swatch-b:#ffc371"></span><span class="tile-name">Sunset</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="rose" aria-pressed="false"><span class="swatch" style="--swatch-a:#ff5c8a;--swatch-b:#d78bff"></span><span class="tile-name">Rose</span></button><button type="button" class="choice-tile theme-tile" data-choice-theme="emerald" aria-pressed="false"><span class="swatch" style="--swatch-a:#39d98a;--swatch-b:#c1f56a"></span><span class="tile-name">Emerald</span></button></div><select id="theme" class="hidden-select" aria-hidden="true" tabindex="-1"><option value="mono" selected>Silver</option><option value="grape">Grape</option><option value="mint">Mint</option><option value="gold">Gold</option><option value="ocean">Ocean</option><option value="sunset">Sunset</option><option value="rose">Rose</option><option value="emerald">Emerald</option></select></div></div></div></div><div class="live-preview"><div class="preview-head">Live preview <span>updates as you edit</span></div><iframe id="preview-frame" title="Live OBS overlay preview" loading="eager" referrerpolicy="no-referrer"></iframe></div><div class="result"><h2>3. Your OBS Browser Source URL</h2><p>Paste this URL into OBS. Set the source dimensions to match the selected style.</p><div class="urlbox"><input id="output" readonly aria-label="Generated OBS overlay URL"><button id="copy" class="button" type="button">Copy URL</button></div><div class="actions"><a id="preview" class="preview" target="_blank" rel="noopener">Open overlay preview ↗</a><span id="status" class="status" aria-live="polite"></span></div></div></section><p class="footer">The overlay refreshes automatically. Keep the browser source background transparent in OBS. The page preview opens the actual overlay URL.</p></main><script>(()=>{const channel=document.getElementById('channel'),style=document.getElementById('style'),theme=document.getElementById('theme'),output=document.getElementById('output'),preview=document.getElementById('preview'),frame=document.getElementById('preview-frame'),status=document.getElementById('status'),historyBox=document.getElementById('history');let historyTimer;function update(){const login=channel.value.trim().replace(/^@/,'').toLowerCase();const good=/^[a-z0-9_]{3,25}$/.test(login);channel.setCustomValidity(good?'':'Enter a valid Twitch channel name (3–25 letters, numbers, or underscores).');const url=good?new URL('/overlay='+encodeURIComponent(login),location.origin):null;if(url){url.searchParams.set('style',style.value);url.searchParams.set('theme',theme.value);url.searchParams.set('refresh','10');output.value=url.href;preview.href=url.href;const liveUrl=new URL(url.href);liveUrl.searchParams.set('stage','1');if(frame.src!==liveUrl.href)frame.src=liveUrl.href;status.textContent=''}else{output.value='Enter a valid Twitch channel name to generate a URL.';preview.removeAttribute('href');frame.src='about:blank';status.textContent=''}}function chooseTile(button){const isStyle=button.hasAttribute('data-choice-style');const kind=isStyle?'style':'theme';const value=button.getAttribute(isStyle?'data-choice-style':'data-choice-theme');const select=isStyle?style:theme;select.value=value;document.querySelectorAll(isStyle?'[data-choice-style]':'[data-choice-theme]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile===button)));update()}function showHistoryMessage(text,isError){const message=document.createElement('div');message.className='history-state'+(isError?' error':'');message.textContent=text;historyBox.replaceChildren(message)}async function loadHistory(){const login=channel.value.trim().replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_]{3,25}$/.test(login)){showHistoryMessage('Enter a valid channel name to load its history.',true);return}showHistoryMessage('Loading Plus history…',false);try{const response=await fetch(location.origin+'/plusgoal='+encodeURIComponent(login),{cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('unavailable');const data=await response.json();if(!Array.isArray(data.history)||!data.history.length)throw new Error('missing');const max=Math.max(1,...data.history.map(item=>Number(item.count)||0));const title=document.createElement('div');title.className='history-title';title.appendChild(document.createTextNode('Monthly Plus Points'));const note=document.createElement('span');note.textContent='Latest available months';title.appendChild(note);const list=document.createElement('div');list.className='history-list';for(const item of data.history){const row=document.createElement('div');row.className='history-row';const parts=String(item.month).split('-');const month=document.createElement('span');month.textContent=new Date(Date.UTC(Number(parts[0]),Number(parts[1])-1,1)).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});const track=document.createElement('div');track.className='history-track';const fill=document.createElement('div');fill.className='history-fill';fill.style.width=Math.min(100,(Number(item.count)/max)*100)+'%';track.appendChild(fill);const count=document.createElement('span');count.className='history-count';count.textContent=String(item.count);row.append(month,track,count);list.appendChild(row)}historyBox.replaceChildren(title,list)}catch{showHistoryMessage('No Plus history available for @'+login+'.',true)}}document.querySelectorAll('[data-choice-style],[data-choice-theme]').forEach(button=>button.addEventListener('click',()=>chooseTile(button)));channel.addEventListener('input',()=>{update();clearTimeout(historyTimer);historyTimer=setTimeout(loadHistory,450)});document.getElementById('copy').addEventListener('click',async()=>{if(!channel.checkValidity()){channel.reportValidity();return}try{await navigator.clipboard.writeText(output.value);status.textContent='Copied to clipboard.'}catch{output.select();document.execCommand('copy');status.textContent='Copied to clipboard.'}});update();loadHistory()})();</script></body></html>`;

class UpstreamError extends Error {}
class UnknownChannelError extends Error {}
class NoProgramDataError extends Error {}

function validLogin(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_]{3,25}$/.test(value);
}

async function gql(body) {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Client-ID': CLIENT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  let payload;
  try { payload = await response.json(); } catch { throw new UpstreamError('Invalid GraphQL response'); }
  if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length)) {
    throw new UpstreamError('GraphQL request failed');
  }
  return payload;
}

function userRequest(login) {
  return {
    operationName: 'GetUserID',
    variables: { login, lookupType: 'ACTIVE' },
    extensions: { persistedQuery: { version: 1, sha256Hash: USER_HASH } }
  };
}

function plusRequest(channelID) {
  return {
    operationName: 'PartnerPlusPublicQuery',
    variables: { channelID: String(channelID) },
    extensions: { persistedQuery: { version: 1, sha256Hash: PLUS_HASH } }
  };
}

async function resolveChannel(login) {
  let result;
  try { result = await gql(userRequest(login)); }
  catch { throw new UpstreamError('Channel lookup failed'); }
  const id = result && result.data && result.data.user && result.data.user.id;
  if (!id) throw new UnknownChannelError('Unknown channel');
  return String(id);
}

function monthKey(entry) {
  const year = Number(entry && entry.year);
  const month = Number(entry && entry.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabel(key, abbreviated = false) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: abbreviated ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function levelNumber(value) {
  return value === 'LEVEL_1' ? 1 : value === 'LEVEL_2' ? 2 : null;
}

function streakFor(monthsNewest, field, threshold) {
  let streak = 0;
  for (const item of monthsNewest) {
    if (item.count >= threshold) streak++;
    else if (item.month !== monthsNewest[0]?.month) break;
    else continue;
  }
  return { threshold, required: 3, streak, qualified: streak >= 3, current_month_met: Boolean(monthsNewest[0] && monthsNewest[0].count >= threshold) };
}

function buildData(login, channelId, raw) {
  const program = raw && raw.data && raw.data.plusStatus && raw.data.plusStatus.partnerPlusProgram;
  if (!program || !Array.isArray(program.subPoints) || program.subPoints.length === 0) throw new NoProgramDataError('No Plus points data');
  const entries = program.subPoints.map(entry => ({ month: monthKey(entry), count: Number(entry.count), updatedAt: entry.updatedAt }))
    .filter(entry => entry.month && Number.isFinite(entry.count))
    .sort((a, b) => a.month.localeCompare(b.month));
  if (!entries.length) throw new NoProgramDataError('No Plus points data');
  const latest = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const l1 = Number(program.l1Threshold);
  const l2 = Number(program.l2Threshold);
  const widget = levelNumber(program.widgetSetting);
  const programLevel = levelNumber(program.level);
  let goalLevel, goalSource;
  if (widget) { goalLevel = widget; goalSource = 'widget'; }
  else if (prev && prev.count >= l2) { goalLevel = 2; goalSource = 'previous_month'; }
  else if (programLevel) { goalLevel = programLevel; goalSource = 'program_level'; }
  else { goalLevel = 1; goalSource = 'default'; }
  const target = goalLevel === 2 ? 300 : 100;
  const remaining = Math.max(0, target - latest.count);
  const newestSix = entries.slice(-6).reverse();
  const qualificationMonths = newestSix.map(item => ({
    month: item.month,
    label: `${monthLabel(item.month, true)} ${item.month.slice(0, 4)}`,
    count: item.count,
    level_1: item.count >= l1,
    level_2: item.count >= l2
  }));
  return {
    username: login,
    channel_id: String(channelId),
    displayed: program.widgetSetting === 'LEVEL_1' || program.widgetSetting === 'LEVEL_2',
    widget_setting: program.widgetSetting || 'OFF',
    program_level: programLevel,
    goal_level: goalLevel,
    goal_source: goalSource,
    previous_month: prev ? { month: prev.month, count: prev.count } : null,
    month: latest.month,
    month_label: monthLabel(latest.month),
    current: latest.count,
    target,
    l1_threshold: l1,
    l2_threshold: l2,
    remaining,
    percent: Math.round((latest.count / target) * 1000) / 10,
    goal_description: programLevel === goalLevel ? `maintain Plus Level ${goalLevel}` : `reach Plus Level ${goalLevel}`,
    subscription_estimates: {
      tier_1: { subscriptions: Math.ceil(remaining / 1), label: 'estimate' },
      tier_2: { subscriptions: Math.ceil(remaining / 2), label: 'estimate' },
      tier_3: { subscriptions: Math.ceil(remaining / 6), label: 'estimate' },
      note: 'Gift and Prime subscriptions contribute zero Plus Points.'
    },
    history: entries.slice(-6).map(item => ({ month: item.month, count: item.count })),
    qualification: {
      current_month: latest.month,
      months: qualificationMonths,
      level_1: streakFor(newestSix, 'level_1', l1),
      level_2: streakFor(newestSix, 'level_2', l2)
    }
  };
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key);
}

async function loadData(login) {
  pruneCache();
  const hit = cache.get(login);
  if (hit) return { ...hit.data, cached: true };
  if (inflight.has(login)) return inflight.get(login).then(data => ({ ...data, cached: false }));
  const task = (async () => {
    const channelId = await resolveChannel(login);
    let raw;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { raw = await gql(plusRequest(channelId)); break; }
      catch (error) { if (attempt === 1) throw new UpstreamError('Plus program query failed'); }
    }
    let result;
    try { result = buildData(login, channelId, raw); }
    catch (error) { if (error instanceof NoProgramDataError) throw error; throw new UpstreamError('Invalid Plus program data'); }
    result.fetched_at = new Date().toISOString();
    result.cached = false;
    cache.set(login, { data: result, expiresAt: Date.now() + 10000 });
    return result;
  })();
  inflight.set(login, task);
  try { return await task; }
  finally { inflight.delete(login); }
}

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function getLogin(pathname, searchParams) {
  let match = pathname.match(/^\/(?:plusgoal|gqldebug)=([^/]+)$/);
  if (!match) match = pathname.match(/^\/plusgoal\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]).toLowerCase() : null;
}

function allowRequest(ip) {
  const now = Date.now();
  for (const [key, record] of rateLimits) {
    while (record.timestamps.length && record.timestamps[0] <= now - 60000) record.timestamps.shift();
    if (!record.timestamps.length) rateLimits.delete(key);
  }
  let record = rateLimits.get(ip);
  if (!record) { record = { timestamps: [] }; rateLimits.set(ip, record); }
  if (record.timestamps.length >= 120) return false;
  record.timestamps.push(now);
  return true;
}

const server = http.createServer(async (req, res) => {
  const began = Date.now();
  let status = 500;
  const finish = () => console.log(`${new Date().toISOString()} ${req.method} ${req.url.split('?')[0]} ${status} ${Date.now() - began}ms`);
  res.on('finish', finish);
  try {
    if (!allowRequest(req.socket.remoteAddress || 'unknown')) { status = 429; send(res, status, JSON.stringify({ error: 'rate limit exceeded' })); return; }
    if (req.method !== 'GET') { status = 405; send(res, status, JSON.stringify({ error: 'method not allowed' })); return; }
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    if (pathname === '/') {
      status = 200; send(res, status, landingPage, 'text/html; charset=utf-8'); return;
    }
    if (pathname === '/health') {
      status = 200;
      send(res, status, JSON.stringify({ status: 'ok', build: '1.0.0', uptime_seconds: Math.floor((Date.now() - started) / 1000) }));
      return;
    }
    if (pathname === '/overlay.html' || pathname === '/overlay' || pathname.startsWith('/overlay?')) {
      status = 200; send(res, status, overlaySource, 'text/html; charset=utf-8'); return;
    }
    if (pathname.startsWith('/overlay=')) {
      const login = decodeURIComponent(pathname.slice('/overlay='.length)).toLowerCase();
      if (!validLogin(login)) { status = 400; send(res, status, 'Invalid channel', 'text/plain; charset=utf-8'); return; }
      const injection = `<script>window.__PLUS_CHANNEL=${JSON.stringify(login)};</script>`;
      status = 200; send(res, status, overlaySource.replace('</head>', `${injection}</head>`), 'text/html; charset=utf-8'); return;
    }
    if (pathname.startsWith('/plusgoal=') || pathname.startsWith('/plusgoal/')) {
      const login = getLogin(pathname, url.searchParams);
      if (!validLogin(login || '')) { status = 400; send(res, status, JSON.stringify({ error: 'invalid channel login' })); return; }
      let data;
      try { data = await loadData(login); }
      catch (error) {
        status = error instanceof UnknownChannelError || error instanceof NoProgramDataError ? 404 : error instanceof UpstreamError ? 502 : 502;
        send(res, status, JSON.stringify({ error: status === 404 ? 'no Plus Goal data for channel' : 'Twitch upstream unavailable', username: login })); return;
      }
      if (url.searchParams.get('format') === 'text') {
        status = 200;
        const label = url.searchParams.get('label') === '1' ? `Level ${data.goal_level}: ` : '';
        send(res, status, `${label}${data.current} / ${data.target}`, 'text/plain; charset=utf-8'); return;
      }
      if ((req.headers.accept || '').includes('text/html')) {
        status = 200;
        const json = escapeHtml(JSON.stringify(data, null, 2));
        send(res, status, `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(login)} - TwitchPlusGoal</title><style>body{background:#10111a;color:#eee;font:15px system-ui;margin:32px}pre{white-space:pre-wrap;background:#191b27;padding:20px;border-radius:12px}</style></head><body><h1>${escapeHtml(login)} - TwitchPlusGoal</h1><pre>${json}</pre></body></html>`, 'text/html; charset=utf-8'); return;
      }
      status = 200; send(res, status, JSON.stringify(data)); return;
    }
    if (pathname.startsWith('/gqldebug=')) {
      const login = getLogin(pathname, url.searchParams);
      if (!validLogin(login || '')) { status = 400; send(res, status, JSON.stringify({ error: 'invalid channel login' })); return; }
      let channelId;
      try { channelId = await resolveChannel(login); }
      catch (error) { status = error instanceof UnknownChannelError ? 404 : 502; send(res, status, JSON.stringify({ error: status === 404 ? 'unknown channel' : 'Twitch upstream unavailable' })); return; }
      const body = plusRequest(channelId);
      try {
        const response = await fetch(GQL_URL, { method: 'POST', headers: { 'Client-ID': CLIENT_ID, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        const raw = await response.text();
        status = response.ok ? 200 : 502;
        send(res, status, JSON.stringify({ request: body, status: response.status, response: raw }));
      } catch { status = 502; send(res, status, JSON.stringify({ error: 'Twitch upstream unavailable', request: body })); }
      return;
    }
    status = 404; send(res, status, JSON.stringify({ error: 'not found' }));
  } catch {
    status = 500;
    if (!res.headersSent) send(res, status, JSON.stringify({ error: 'internal server error' }));
  }
});

server.listen(PORT, () => console.log(`Twitch Plus Goal server listening on http://localhost:${PORT}`));
