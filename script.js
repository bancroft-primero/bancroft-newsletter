// --- State ---
let currentLang = 'en';
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
  const res = await fetch(path);
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

  // Language toggle button
  document.getElementById('lang-toggle').textContent = labels.langToggle;

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
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'es' : 'en';
  document.documentElement.lang = currentLang;
  render();
}

document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);

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
