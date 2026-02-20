// --- State ---
let currentLang = 'es';
let currentWeekData = null;
let configData = null;
let weeksList = [];
let selectedClass = localStorage.getItem('selectedClass') || '';

// --- Init ---
async function init() {
  try {
    const [config, index] = await Promise.all([
      fetchJSON('data/config.json'),
      fetchJSON('data/weeks/weeks-index.json')
    ]);
    configData = config;
    weeksList = index;

    buildClassSelector();

    // Check URL hash for a specific week
    const hash = window.location.hash.replace('#', '');
    const targetWeek = weeksList.includes(hash) ? hash : weeksList[0];

    await loadWeek(targetWeek, false);
    renderArchiveList();
  } catch (err) {
    showError('Could not load the newsletter. Please check back later.');
    console.error(err);
  }
}

async function fetchJSON(path) {
  const res = await fetch(path + '?v=' + Date.now());
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

// --- Class Selector ---
function buildClassSelector() {
  const container = document.getElementById('class-selector-buttons');
  const allBtn = container.querySelector('[data-class=""]');

  // Add classroom buttons
  const flags = configData.classroomFlags || {};
  configData.classrooms.forEach(classroom => {
    const btn = document.createElement('button');
    btn.className = 'class-btn';
    btn.dataset.class = classroom;
    const flag = flags[classroom] || '';
    if (flag.startsWith('img:')) {
      btn.innerHTML = flagHTML(flag, 'small') + ' ' + classroom;
    } else {
      btn.textContent = flag ? `${flag} ${classroom}` : classroom;
    }
    container.appendChild(btn);
  });

  // Set initial active state
  container.querySelectorAll('.class-btn').forEach(btn => {
    if (btn.dataset.class === selectedClass) btn.classList.add('active');
  });
  if (!selectedClass) allBtn.classList.add('active');

  // Click handler
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.class-btn');
    if (!btn) return;
    selectedClass = btn.dataset.class;
    localStorage.setItem('selectedClass', selectedClass);
    container.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMySpecials();
    renderClassroomGrids(currentWeekData.specials, configData.labels[currentLang]);
  });
}

// --- Load a week ---
async function loadWeek(date, updateHash) {
  try {
    currentWeekData = await fetchJSON(`data/weeks/${date}.json`);
    if (updateHash !== false) {
      window.location.hash = date;
    }
    render();
    updateActiveArchiveLink(date);
  } catch (err) {
    showError(`Could not load newsletter for ${date}. The data file may be missing.`);
    console.error(err);
  }
}

// --- Render everything ---
function render() {
  const data = currentWeekData;
  const lang = currentLang;
  const labels = configData.labels[lang];

  // Header
  document.getElementById('title').textContent = labels.title;
  document.getElementById('subtitle').textContent = labels.subtitle;
  document.getElementById('date-display').textContent = formatDate(data.date, lang);

  // Logo
  const logoSrc = configData.seasonLogos[data.season] || configData.seasonLogos['default'];
  document.getElementById('school-logo').src = logoSrc;

  // Language toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Class selector label
  document.getElementById('class-selector-label').textContent =
    lang === 'es' ? 'Mi Salón:' : 'My Classroom:';

  // Content sections
  document.getElementById('welcome-heading').textContent = labels.welcomeHeading;
  document.getElementById('welcome-body').innerHTML = textToHTML(data.welcome[lang]) + renderImages(data.welcomeImages);

  document.getElementById('math-heading').textContent = labels.mathHeading;
  document.getElementById('math-body').innerHTML = textToHTML(data.math[lang]) + renderImages(data.mathImages);

  document.getElementById('literacy-heading').textContent = labels.literacyHeading;
  document.getElementById('literacy-body').innerHTML = textToHTML(data.literacy[lang]) + renderImages(data.literacyImages);

  // Specials schedule
  document.getElementById('specials-heading').textContent = labels.specialsHeading;
  renderSpecials(data.specials, labels);

  // My Specials (personalized)
  renderMySpecials();

  // Classroom grids
  renderClassroomGrids(data.specials, labels);

  // ROARS
  document.getElementById('roars-heading').textContent = labels.roarsHeading;
  renderROARS(data.roars);

  // Archive headings
  document.getElementById('archive-heading').textContent = labels.archiveHeading;
  const mobileHeading = document.getElementById('archive-heading-mobile');
  if (mobileHeading) mobileHeading.textContent = labels.archiveHeading;

  // Weather
  renderWeather();

  // Re-render archive links with translated dates
  renderArchiveList();
}

// --- My Specials This Week (personalized) ---
function renderMySpecials() {
  const section = document.getElementById('my-specials');
  const body = document.getElementById('my-specials-body');
  const heading = document.getElementById('my-specials-heading');

  if (!selectedClass || !currentWeekData) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  const lang = currentLang;
  const labels = configData.labels[lang];
  const specials = currentWeekData.specials;
  const rotations = configData.rotations[selectedClass];
  const icons = configData.subjectIcons;
  const translations = configData.subjectTranslations;

  heading.textContent = lang === 'es'
    ? `Especialidades de ${selectedClass} Esta Semana`
    : `${selectedClass}'s Specials This Week`;

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[new Date().getDay()];

  // Calculate dates for each day of the week from the newsletter date (which is a Monday)
  const [ny, nm, nd] = currentWeekData.date.split('-').map(Number);
  const weekStart = new Date(ny, nm - 1, nd);

  body.innerHTML = dayKeys.map((day, i) => {
    const letter = (specials[day] || '').trim().toUpperCase();
    const isNoSchool = letter.includes('NO SCHOOL') || letter.includes('NO HAY') || letter.includes('CONFERENCES');
    const isToday = day === todayKey;

    // Calculate this day's date (Mon=0, Tue=1, etc.)
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const shortDate = `${dayDate.getMonth() + 1}/${dayDate.getDate()}`;
    const dayLabel = `${labels.days[i]} (${shortDate})`;

    if (isNoSchool) {
      return `<div class="my-specials-day no-school${isToday ? ' today' : ''}">
        <div class="my-specials-day-name">${dayLabel}</div>
        <div class="my-specials-day-icon">🚫</div>
        <div class="my-specials-day-subject">${labels.noSchool}</div>
      </div>`;
    }

    const subject = (letter.length === 1 && rotations[letter]) ? rotations[letter] : '—';
    const subjectName = lang === 'es' ? (translations[subject] || subject) : subject;
    const icon = icons[subject] || '📅';

    return `<div class="my-specials-day${isToday ? ' today' : ''}">
      <div class="my-specials-day-name">${dayLabel}</div>
      <div class="my-specials-day-icon">${icon}</div>
      <div class="my-specials-day-subject">${subjectName}</div>
      <div class="my-specials-day-letter">${letter}</div>
    </div>`;
  }).join('');
}

// --- Specials Schedule Table ---
function renderSpecials(specials, labels) {
  const tbody = document.querySelector('#specials-table tbody');
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  // Calculate dates for the week
  const [ny, nm, nd] = currentWeekData.date.split('-').map(Number);
  const weekStart = new Date(ny, nm - 1, nd);

  tbody.innerHTML = days.map((day, i) => {
    const val = specials[day] || '';
    const isNoSchool = val.toUpperCase().includes('NO SCHOOL') || val.toUpperCase().includes('NO HAY');
    const displayVal = isNoSchool ? labels.noSchool : val;
    const cellClass = isNoSchool ? ' class="no-school-cell"' : '';

    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const shortDate = `${dayDate.getMonth() + 1}/${dayDate.getDate()}`;

    return `<tr>
      <td>${labels.days[i]} <span class="specials-date">(${shortDate})</span></td>
      <td${cellClass}>${displayVal}</td>
    </tr>`;
  }).join('');
}

// --- Classroom Rotation Grids ---
function renderClassroomGrids(specials, labels) {
  const container = document.getElementById('classroom-grids');
  const rotations = configData.rotations;
  const icons = configData.subjectIcons;
  const translations = configData.subjectTranslations;
  const lang = currentLang;

  // Determine today's rotation letter (only highlight current day)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  const todayVal = (specials[today] || '').trim().toUpperCase();
  const activeLetters = new Set();
  if (todayVal.length === 1 && todayVal >= 'A' && todayVal <= 'F') {
    activeLetters.add(todayVal);
  }

  // If a class is selected, only show that class's grid
  const classroomsToShow = selectedClass
    ? [selectedClass]
    : configData.classrooms;

  container.innerHTML = classroomsToShow.map(classroom => {
    const classRotations = rotations[classroom];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'].map(letter => {
      const subject = classRotations[letter];
      const subjectName = lang === 'es' ? (translations[subject] || subject) : subject;
      const icon = icons[subject] || '';
      const highlight = activeLetters.has(letter) ? ' class="rotation-highlight"' : '';
      return `<tr${highlight}>
        <td>${letter}</td>
        <td>${icon}</td>
        <td>${subjectName}</td>
      </tr>`;
    }).join('');

    const flag = (configData.classroomFlags || {})[classroom] || '';
    return `<div class="classroom-card">
      <div class="classroom-card-header">${classroom}<br><span class="classroom-flag">${flagHTML(flag, 'large')}</span></div>
      <table>${rows}</table>
    </div>`;
  }).join('');
}

// --- ROARS ---
function renderROARS(roars) {
  const container = document.getElementById('roars-cards');
  container.innerHTML = configData.classrooms.map(classroom => {
    const name = roars[classroom] || '';
    const flag = (configData.classroomFlags || {})[classroom] || '';
    return `<div class="roars-card">
      <div class="roars-card-classroom">${classroom}</div>
      <div class="roars-card-flag">${flagHTML(flag, 'large')}</div>
      <div class="roars-card-name">${name}</div>
    </div>`;
  }).join('');
}

// --- Archive List ---
function renderArchiveList() {
  const labels = configData.labels[currentLang];
  const html = weeksList.map(date => {
    const formatted = `${labels.weekOf} ${formatDate(date, currentLang)}`;
    const activeClass = currentWeekData && currentWeekData.date === date ? ' class="active"' : '';
    return `<li><a href="#${date}"${activeClass} onclick="loadWeek('${date}'); return false;">${formatted}</a></li>`;
  }).join('');

  document.getElementById('archive-list').innerHTML = html;
  const mobileList = document.getElementById('archive-list-mobile');
  if (mobileList) mobileList.innerHTML = html;
}

function updateActiveArchiveLink(date) {
  document.querySelectorAll('.archive-sidebar a, .archive-mobile a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + date);
  });
}

// --- Language Toggle ---
document.getElementById('lang-toggle-wrap').addEventListener('click', (e) => {
  const btn = e.target.closest('.lang-btn');
  if (!btn || btn.dataset.lang === currentLang) return;
  currentLang = btn.dataset.lang;
  document.documentElement.lang = currentLang;
  render();
});

// --- Hash change listener ---
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (weeksList.includes(hash) && (!currentWeekData || currentWeekData.date !== hash)) {
    loadWeek(hash, false);
  }
});

// --- Helpers ---
function formatDate(dateStr, lang) {
  // dateStr is "YYYY-MM-DD"
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function textToHTML(text) {
  if (!text) return '';
  // Escape HTML entities
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Split on double newlines for paragraphs
  const paragraphs = escaped.split(/\n\n+/);
  return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function renderImages(images) {
  if (!images || images.length === 0) return '';
  const imgs = images.map(img => {
    const alt = img.alt || '';
    const caption = img.caption || '';
    const captionHTML = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="section-image"><img src="${img.src}" alt="${alt}" loading="lazy">${captionHTML}</figure>`;
  }).join('');
  return `<div class="section-images">${imgs}</div>`;
}

// --- Weather ---
const BANCROFT_LAT = 38.9296;
const BANCROFT_LON = -77.0325;
let weatherCache = {};

async function renderWeather() {
  const section = document.getElementById('weather-section');
  const body = document.getElementById('weather-body');
  const heading = document.getElementById('weather-heading');
  const credit = document.getElementById('weather-credit');
  const lang = currentLang;

  heading.textContent = lang === 'es' ? 'El Clima de Esta Semana' : "This Week's Weather";
  credit.textContent = lang === 'es' ? 'Pronóstico de Open-Meteo.com' : 'Forecast from Open-Meteo.com';

  // Only show weather for the most recent newsletter (current/upcoming week)
  if (!currentWeekData || currentWeekData.date !== weeksList[0]) {
    section.hidden = true;
    return;
  }

  // Calculate the week's date range
  const [ny, nm, nd] = currentWeekData.date.split('-').map(Number);
  const weekStart = new Date(ny, nm - 1, nd);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  // Check if the week is too far in the future for forecasts (>14 days)
  const now = new Date();
  const daysUntilEnd = Math.ceil((weekEnd - now) / (1000 * 60 * 60 * 24));
  if (daysUntilEnd > 16) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  // Fetch weather data
  const startStr = formatDateISO(weekStart);
  const endStr = formatDateISO(weekEnd);
  const cacheKey = `${startStr}_${endStr}`;

  if (!weatherCache[cacheKey]) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${BANCROFT_LAT}&longitude=${BANCROFT_LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America/New_York&start_date=${startStr}&end_date=${endStr}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      weatherCache[cacheKey] = await res.json();
    } catch (err) {
      console.error('Weather error:', err);
      body.innerHTML = `<p class="weather-unavailable">${lang === 'es' ? 'Pronóstico no disponible' : 'Forecast not available'}</p>`;
      return;
    }
  }

  const weather = weatherCache[cacheKey];
  const daily = weather.daily;
  if (!daily || !daily.time || daily.time.length === 0) {
    body.innerHTML = `<p class="weather-unavailable">${lang === 'es' ? 'Pronóstico no disponible' : 'Forecast not available'}</p>`;
    return;
  }

  const labels = configData.labels[lang];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayStr = formatDateISO(now);

  body.innerHTML = daily.time.map((dateStr, i) => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayIdx = date.getDay();
    const dayOfWeek = labels.days[dayIdx === 0 ? 6 : dayIdx - 1]; // Mon-Fri mapping
    const shortDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const isToday = dateStr === todayStr;

    const high = Math.round(daily.temperature_2m_max[i]);
    const low = Math.round(daily.temperature_2m_min[i]);
    const rainChance = daily.precipitation_probability_max[i];
    const code = daily.weathercode[i];

    const icon = weatherIcon(code);
    const desc = weatherDescription(code, lang);
    const tips = weatherTips(high, low, rainChance, code, lang);

    return `<div class="weather-day${isToday ? ' today' : ''}" onclick="this.classList.toggle('expanded')">
      <div class="weather-day-name">${dayOfWeek}</div>
      <div class="weather-day-date">${shortDate}</div>
      <div class="weather-day-icon">${icon}</div>
      <div class="weather-day-temp">${high}° / ${low}°</div>
      <div class="weather-day-desc">${desc}</div>
      ${rainChance > 0 ? `<div class="weather-day-desc">💧 ${rainChance}%</div>` : ''}
      <div class="weather-day-tips">
        ${tips.map(t => `<div class="weather-tip">${t}</div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function formatDateISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '☁️';
  if (code <= 57) return '🌧️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '❄️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

function weatherDescription(code, lang) {
  const descriptions = {
    en: {
      0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle',
      55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      66: 'Freezing rain', 67: 'Freezing rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
      77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
      85: 'Snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ hail'
    },
    es: {
      0: 'Cielo despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
      45: 'Niebla', 48: 'Niebla helada', 51: 'Llovizna ligera', 53: 'Llovizna',
      55: 'Llovizna fuerte', 56: 'Llovizna helada', 57: 'Llovizna helada',
      61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
      66: 'Lluvia helada', 67: 'Lluvia helada',
      71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte',
      77: 'Granizo', 80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos fuertes',
      85: 'Chubascos de nieve', 86: 'Chubascos fuertes de nieve',
      95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo'
    }
  };
  const map = descriptions[lang] || descriptions.en;
  return map[code] || map[Math.floor(code / 10) * 10] || (lang === 'es' ? 'Variable' : 'Mixed');
}

function weatherTips(high, low, rainChance, code, lang) {
  const tips = [];
  const isEn = lang === 'en';

  // Temperature-based tips
  if (low <= 32) {
    tips.push(isEn ? '🧤 Heavy coat, hat & gloves' : '🧤 Abrigo grueso, gorro y guantes');
  } else if (low <= 45) {
    tips.push(isEn ? '🧥 Warm jacket & layers' : '🧥 Chaqueta abrigada y capas');
  } else if (high <= 55) {
    tips.push(isEn ? '🧥 Light jacket' : '🧥 Chaqueta ligera');
  }

  if (high >= 85) {
    tips.push(isEn ? '💧 Extra water bottle' : '💧 Botella de agua extra');
    tips.push(isEn ? '🧴 Sunscreen' : '🧴 Protector solar');
  }

  // Rain/snow tips
  if (rainChance >= 50 || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    tips.push(isEn ? '☂️ Umbrella & rain boots' : '☂️ Paraguas y botas de lluvia');
  } else if (rainChance >= 30) {
    tips.push(isEn ? '☂️ Umbrella just in case' : '☂️ Paraguas por si acaso');
  }

  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) {
    tips.push(isEn ? '🥾 Snow boots & warm socks' : '🥾 Botas de nieve y calcetines abrigados');
  }

  if (code >= 95) {
    tips.push(isEn ? '⚡ Stay safe indoors if possible' : '⚡ Manténganse seguros adentro si es posible');
  }

  if (tips.length === 0) {
    tips.push(isEn ? '👍 Great weather for school!' : '👍 ¡Buen clima para la escuela!');
  }

  return tips;
}

function flagHTML(flagValue, size) {
  if (!flagValue) return '';
  const px = size === 'small' ? 16 : size === 'large' ? 24 : 18;
  if (flagValue.startsWith('img:')) {
    const src = flagValue.slice(4);
    return `<img src="${src}" alt="flag" class="flag-img" style="height:${px}px;width:auto;vertical-align:middle;">`;
  }
  return `<span class="flag-emoji" style="font-size:${px}px;line-height:1;">${flagValue}</span>`;
}

function showError(msg) {
  document.getElementById('error-message').textContent = msg;
  document.getElementById('error-overlay').hidden = false;
  // Auto-hide after 5 seconds
  setTimeout(() => {
    document.getElementById('error-overlay').hidden = true;
  }, 5000);
}

// --- Start ---
init();
