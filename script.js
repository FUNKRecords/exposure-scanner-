// NOTE: This front-end expects a backend at /api/* that proxies to the external APIs.
// If you don't have a backend yet, the UI will show mocked responses.

const $ = (id) => document.getElementById(id);
const loading = $('loading');
const progressEl = $('loadingProgress');
const stepsEl = $('steps');
const resultsEl = $('results');

function showLoading() {
  loading.style.display = 'block';
  progressEl.style.width = '0%';
  // animate fake progress
  let p = 0;
  const tick = () => {
    p += Math.random() * 25;
    if (p >= 100) p = 100;
    progressEl.style.width = p + '%';
    if (p < 100) setTimeout(tick, 300 + Math.random()*400);
  };
  tick();
}

function hideLoading() {
  progressEl.style.width = '100%';
  setTimeout(()=> loading.style.display = 'none', 400);
}

function renderResults(payload) {
  // payload should contain { breaches:[], usernameMatches:[], tech:[], emails:[] }
  resultsEl.innerHTML = '';
  const breaches = payload.breaches || [];
  const uMatches = payload.usernameMatches || [];
  const tech = payload.tech || [];
  const emails = payload.emails || [];

  const riskScore = breaches.length + uMatches.length;
  const footprintSize = breaches.length + uMatches.length + tech.length + emails.length;
  let exposure = 'Low', cls='risk-low';
  if (riskScore >= 5) { exposure = 'High'; cls='risk-high' }
  else if (riskScore >= 2) { exposure = 'Medium'; cls='risk-medium' }

  resultsEl.appendChild(cardHTML('Risk Score', riskScore, cls));
  resultsEl.appendChild(cardHTML('Exposure Level', exposure, cls));
  resultsEl.appendChild(cardHTML('Digital Footprint Size', footprintSize, 'value'));
  resultsEl.appendChild(cardHTML('Breaches Found', breaches.length, 'value'));
  if (breaches.length) {
    const ul = document.createElement('ul');
    breaches.forEach(b=>{
      const li = document.createElement('li');
      li.textContent = `${b.Name} — ${b.Date || ''}`;
      ul.appendChild(li);
    });
    const div = document.createElement('div');
    div.className='result-card';
    div.appendChild(ul);
    resultsEl.appendChild(div);
  }

  resultsEl.appendChild(cardHTML('Username Matches', uMatches.length, 'value'));
  if (uMatches.length) {
    const ul2 = document.createElement('ul');
    uMatches.forEach(u=>{
      const li = document.createElement('li');
      li.innerHTML = `<a href="${u.url}" target="_blank">${u.site}</a>`;
      ul2.appendChild(li);
    });
    const div = document.createElement('div');
    div.className='result-card';
    div.appendChild(ul2);
    resultsEl.appendChild(div);
  }

  if (tech.length) {
    const ul3 = document.createElement('ul');
    tech.forEach(t=>{
      const li = document.createElement('li');
      li.textContent = `${t.category || 'tech'}: ${t.name || t}`;
      ul3.appendChild(li);
    });
    const div = document.createElement('div');
    div.className='result-card';
    div.appendChild(cardHTML('Tech footprint', tech.length, 'value'));
    div.appendChild(ul3);
    resultsEl.appendChild(div);
  }

  if (emails.length) {
    const ul4 = document.createElement('ul');
    emails.forEach(e=>{
      const li = document.createElement('li');
      li.textContent = `${e.value} (${e.type || 'discovered'})`;
      ul4.appendChild(li);
    });
    const div = document.createElement('div');
    div.className='result-card';
    div.appendChild(cardHTML('Public emails (business only)', emails.length, 'value'));
    div.appendChild(ul4);
    resultsEl.appendChild(div);
  }

  // share button idea
  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Share your Exposure Score';
  shareBtn.onclick = () => {
    const text = `My Exposure Score: ${riskScore} (${exposure}) — check yours at ${location.origin}`;
    if (navigator.share) navigator.share({text});
    else navigator.clipboard.writeText(text).then(()=> alert('Shared text copied to clipboard'));
  };
  resultsEl.appendChild(shareBtn);
}

function cardHTML(title, value, cls) {
  const div = document.createElement('div');
  div.className='result-card';
  div.innerHTML = `<div><span class="key">${title}:</span> <span class="value ${cls||''}">${value}</span></div>`;
  return div;
}

/* Button handlers */
$('checkEmailBtn').addEventListener('click', async () => {
  const email = $('emailInput').value.trim();
  if (!email) return alert('Enter an email');
  resultsEl.innerHTML = '';
  showLoading();
  try {
    const resp = await fetch(`/api/breach?email=${encodeURIComponent(email)}`);
    if (!resp.ok) {
      // fallback mock
      const mock = { breaches: [], usernameMatches: [], tech: [], emails: [] };
      renderResults(mock);
    } else {
      const data = await resp.json();
      renderResults({ breaches: data.breaches || [], usernameMatches: [], tech: [], emails: [] });
    }
  } catch (e) {
    // local mock if offline
    const mock = { breaches: [], usernameMatches: [], tech: [], emails: [] };
    renderResults(mock);
  } finally { hideLoading(); }
});

$('checkUserBtn').addEventListener('click', async () => {
  const username = $('usernameInput').value.trim();
  if (!username) return alert('Enter a username');
  resultsEl.innerHTML = '';
  showLoading();
  try {
    const resp = await fetch(`/api/username?username=${encodeURIComponent(username)}`);
    const data = resp.ok ? await resp.json() : { usernameMatches: [] };
    renderResults({ breaches: [], usernameMatches: data.usernameMatches || [], tech: [], emails: [] });
  } catch (e) {
    renderResults({ breaches: [], usernameMatches: [], tech: [], emails: [] });
  } finally { hideLoading(); }
});

$('checkDomainBtn').addEventListener('click', async () => {
  const domain = $('domainInput').value.trim();
  if (!domain) return alert('Enter a domain');
  resultsEl.innerHTML = '';
  showLoading();
  try {
    const resp = await fetch(`/api/builtwith?domain=${encodeURIComponent(domain)}`);
    const data = resp.ok ? await resp.json() : { tech: [] };
    renderResults({ breaches: [], usernameMatches: [], tech: data.tech || [], emails: [] });
  } catch (e) {
    renderResults({ breaches: [], usernameMatches: [], tech: [], emails: [] });
  } finally { hideLoading(); }
});

$('companyBtn').addEventListener('click', async () => {
  const domain = $('companyInput').value.trim();
  if (!domain) return alert('Enter a company domain');
  resultsEl.innerHTML = '';
  showLoading();
  try {
    const resp = await fetch(`/api/hunter?domain=${encodeURIComponent(domain)}`);
    const data = resp.ok ? await resp.json() : { emails: [] };
    renderResults({ breaches: [], usernameMatches: [], tech: [], emails: data.emails || [] });
  } catch (e) {
    renderResults({ breaches: [], usernameMatches: [], tech: [], emails: [] });
  } finally { hideLoading(); }
});
