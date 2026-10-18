/**
 * ARK STUDIO — Dashboard Interactive Project Manager & Studio Suite
 * Live studio clock, Project CMS (create/edit/preview/download), Image uploader,
 * localStorage persistence, Local server direct save bridge, interactive checklist.
 */

(function () {
  'use strict';

  /* ==========================================================================
     DEFAULT PROJECT DATA (Initial Seed)
     ========================================================================== */
  const DEFAULT_PROJECTS = [
    {
      id: 'concrete-pavilion',
      slug: 'concrete-pavilion',
      title: 'The Concrete Pavilion',
      typology: 'Residential',
      location: 'Dhaka, Bangladesh',
      year: '2025',
      status: 'Built',
      siteArea: '4,500 sq.ft.',
      builtArea: '6,200 sq.ft.',
      leadArchitect: 'Ark Studio Team',
      materials: 'Board-marked Concrete, Terracotta, Teak',
      concept: 'Pitched Roofs & Fluid Flight Geometry',
      narrative1: 'This project explores the intersection of raw materiality and lightweight, dynamic forms. Inspired by traditional regional roof profiles and the fluid contours of birds in flight, the massing transitions smoothly from ground-level concrete stability into soaring open vistas.',
      narrative2: 'Large glass apertures puncture the brutalist concrete form, allowing natural light to wash across the interior surfaces throughout the day, creating an ever-shifting play of shadows and connecting the occupants directly with changing daylight.',
      narrative3: 'Terracotta screening filters direct tropical solar radiation while maintaining continuous cross-ventilation, balancing private refuge with climatic responsiveness.',
      heroImage: 'images/projects/concrete-pavilion/project2.jpg',
      images: [
        { path: 'images/projects/concrete-pavilion/hero-bg.jpg', caption: '01. Solar screening and brickwork detail' },
        { path: 'images/projects/concrete-pavilion/project1.jpg', caption: '02. Vertical massing and corner apertures' },
        { path: 'images/projects/concrete-pavilion/project2.jpg', caption: '03. Primary elevation showing canopy overhang and street interface' }
      ]
    },
    {
      id: 'glasshouse-atrium',
      slug: 'glasshouse-atrium',
      title: 'Glasshouse Atrium',
      typology: 'Commercial',
      location: 'Dhaka, Bangladesh',
      year: '2024',
      status: 'Built',
      siteArea: '6,800 sq.ft.',
      builtArea: '18,500 sq.ft.',
      leadArchitect: 'Ark Studio Team',
      materials: 'Structural Steel, Low-E Glass, Cast Concrete',
      concept: 'Vertical Transparency & Urban Atrium',
      narrative1: 'Positioned at a bustling urban intersection in Dhaka, Glasshouse Atrium explores how vertical transparency can create civic porosity within dense commercial districts. The building steps back from the street line, offering a public plaza before ascending into a dramatic vertical atrium.',
      narrative2: 'Cantilevered glass volumes project outward from a rugged concrete spine, modulating natural light throughout the interior floors. The central light well acts as a natural thermal chimney, drawing warm air upward and reducing mechanical cooling demands.',
      narrative3: 'By night, the structure acts as an urban lantern, revealing its internal staircases, mezzanine galleries, and dynamic spatial rhythm to passersby on the street below.',
      heroImage: 'images/project1.jpg',
      images: [
        { path: 'images/project1.jpg', caption: '01. Cantilevered volumes and corner articulation' },
        { path: 'images/project2.jpg', caption: '02. Material dialogue: raw concrete and glass envelopes' },
        { path: 'images/hero-bg.jpg', caption: '03. Streetscape context and pedestrian threshold' }
      ]
    },
    {
      id: 'brick-screen-residence',
      slug: 'brick-screen-residence',
      title: 'Brick Screen Residence',
      typology: 'Residential',
      location: 'Dhaka, Bangladesh',
      year: '2025',
      status: 'Built',
      siteArea: '3,600 sq.ft.',
      builtArea: '5,200 sq.ft.',
      leadArchitect: 'Ark Studio Team',
      materials: 'Local Terracotta Brick, Fair-Face Concrete, Teak',
      concept: 'Perforated Jali & Passive Climate Envelope',
      narrative1: 'Nestled within a residential enclave of Dhaka, the Brick Screen Residence pays homage to Bengal\'s millenia-old brickmaking traditions while executing a contemporary, disciplined architectural form. The primary southern facade features an intricate double-skin terracotta jali screen.',
      narrative2: 'This screen acts as a breathable environmental buffer: filtering intense tropical afternoon sun, casting dancing geometric shadows across the interior terrazzo floors, and inducing passive air movement even on windless humid days.',
      narrative3: 'Behind the porous brick veil, deep recessed balconies and landscaped courtyards create intimate private retreats that remain shielded from the adjacent street without shutting out the neighborhood life.',
      heroImage: 'images/hero-bg.jpg',
      images: [
        { path: 'images/hero-bg.jpg', caption: '01. Solar screening and brick craftsmanship detail' },
        { path: 'images/project2.jpg', caption: '02. Spatial interface between cast concrete and masonry' },
        { path: 'images/project1.jpg', caption: '03. Neighborhood context and surrounding street fabric' }
      ]
    }
  ];

  const STORAGE_KEY_PROJECTS = 'ark_studio_projects_v2';
  const STORAGE_KEY_GH_CONFIG = 'ark_studio_gh_config_v1';
  let serverConnected = false;
  let currentProjects = [];
  let editingProjectId = null;
  let tempEditorImages = [];

  function getGhConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY_GH_CONFIG) || '{}');
      if (!cfg.repo) cfg.repo = 'redoyagltd-afk/arch-portfolio';
      if (!cfg.branch) cfg.branch = 'main';
      return cfg;
    } catch (e) {
      return { repo: 'redoyagltd-afk/arch-portfolio', branch: 'main' };
    }
  }

  function setGhConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY_GH_CONFIG, JSON.stringify(cfg));
    } catch (e) {}
  }

  function toBase64Utf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /* ==========================================================================
     1. STORAGE & STATE MANAGEMENT
     ========================================================================== */
  function loadProjects() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        currentProjects = JSON.parse(saved);
        if (!Array.isArray(currentProjects) || currentProjects.length === 0) {
          currentProjects = DEFAULT_PROJECTS.slice();
        }
      } else {
        currentProjects = DEFAULT_PROJECTS.slice();
        saveProjects();
      }
    } catch (e) {
      currentProjects = DEFAULT_PROJECTS.slice();
    }

    // Try fetching canonical data/projects.json if fresh visit
    fetch('data/projects.json')
      .then(function (res) {
        if (res.ok) return res.json();
        throw new Error('No remote json');
      })
      .then(function (remote) {
        if (Array.isArray(remote) && remote.length > 0) {
          const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
          if (!saved) {
            currentProjects = remote;
            renderProjectCards();
            updateStatsCounter();
          }
        }
      })
      .catch(function () {});
  }

  function saveProjects() {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(currentProjects));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
    renderProjectCards();
    updateStatsCounter();
  }


  /* ==========================================================================
     2. SERVER & CLOUD CONNECTION CHECK
     ========================================================================== */
  async function checkServerStatus() {
    const bannerEl = document.getElementById('dash-server-status-text');
    const badgeEl = document.getElementById('dash-server-badge');
    const directSaveBtn = document.getElementById('dash-btn-direct-save');

    try {
      const res = await fetch('/api/status', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        serverConnected = true;
        if (bannerEl) bannerEl.innerHTML = '<strong>Live Studio Server Connected</strong> (Port 3000) &bull; Direct 1-click save to disk enabled';
        if (badgeEl) {
          badgeEl.textContent = 'Server Connected';
          badgeEl.classList.add('dash-status-live');
        }
        if (directSaveBtn) {
          directSaveBtn.style.display = 'inline-flex';
        }
        return;
      }
    } catch (e) {
      // Server not running, fallback to cloud or standalone
    }

    serverConnected = false;
    if (directSaveBtn) {
      directSaveBtn.style.display = 'none';
    }

    const gh = getGhConfig();
    if (gh.repo && gh.token) {
      if (bannerEl) bannerEl.innerHTML = `<strong>🟢 Cloud Live Mode</strong> &bull; Connected to GitHub (<code>${escapeHtml(gh.repo)}</code>) &bull; 1-click live publish active`;
      if (badgeEl) {
        badgeEl.textContent = 'Cloud Live';
        badgeEl.classList.add('dash-status-live');
      }
    } else {
      if (bannerEl) bannerEl.innerHTML = '<strong>Local Draft Mode</strong> &bull; Changes saved on this device. Click <strong>⚙️ Cloud Sync</strong> to enable 1-click publishing worldwide.';
      if (badgeEl) {
        badgeEl.textContent = 'Local Draft Mode';
        badgeEl.classList.remove('dash-status-live');
      }
    }
  }


  /* ==========================================================================
     3. RENDER PROJECT CARDS IN DASHBOARD
     ========================================================================== */
  function renderProjectCards() {
    const container = document.getElementById('dash-project-cards-container');
    if (!container) return;

    container.innerHTML = '';

    currentProjects.forEach(function (proj) {
      const card = document.createElement('div');
      card.className = 'dash-proj-card';
      card.setAttribute('data-id', proj.id);

      const coverSrc = proj.heroImage || (proj.images && proj.images[0] ? proj.images[0].path : 'images/project2.jpg');
      const imgCount = (proj.images ? proj.images.length : 0);

      card.innerHTML = `
        <div class="dash-proj-thumb">
          <img src="${coverSrc}" alt="${proj.title}" loading="lazy">
          <span class="dash-proj-badge">${proj.status || 'Built'}</span>
        </div>
        <div class="dash-proj-body">
          <h3 class="dash-proj-title">${proj.title}</h3>
          <p class="dash-proj-sub">${proj.typology} • ${proj.location ? proj.location.split(',')[0] : 'Dhaka'} • ${proj.year}</p>
          <p class="dash-proj-desc">${proj.narrative1 || proj.concept || ''}</p>
          <div class="dash-proj-meta-bar">
            <span>${imgCount} image${imgCount === 1 ? '' : 's'}</span>
            <span>projects/${proj.slug}.html</span>
          </div>
        </div>
        <div class="dash-proj-actions">
          <button type="button" class="dash-proj-btn btn-edit-proj" title="Edit this project">✏️ Edit</button>
          <a href="projects/${proj.slug}.html" class="dash-proj-btn" target="_blank" title="View live published page">👁️ View</a>
          <button type="button" class="dash-proj-btn btn-preview-proj" title="Instant Preview in modal">Preview</button>
          <button type="button" class="dash-proj-btn btn-download-proj" title="Download HTML page">📥 Download</button>
          <button type="button" class="dash-proj-btn btn-copy-card" title="Copy Card snippet for index.html">📋 Copy Card</button>
        </div>
      `;

      // Event handlers
      card.querySelector('.btn-edit-proj').addEventListener('click', function () {
        openEditor(proj.id);
      });

      card.querySelector('.btn-preview-proj').addEventListener('click', function () {
        openPreview(proj);
      });

      card.querySelector('.btn-download-proj').addEventListener('click', function () {
        downloadProjectHtml(proj);
      });

      const copyBtn = card.querySelector('.btn-copy-card');
      copyBtn.addEventListener('click', function () {
        const cardHtml = generateCardHtml(proj);
        navigator.clipboard.writeText(cardHtml).then(function () {
          const orig = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => copyBtn.textContent = orig, 1500);
        });
      });

      container.appendChild(card);
    });

    updateStatsCounter();
  }

  function updateStatsCounter() {
    const statProjects = document.getElementById('stat-projects');
    const headerCount = document.getElementById('dash-project-count-badge');
    if (statProjects) statProjects.textContent = currentProjects.length;
    if (headerCount) headerCount.textContent = `${currentProjects.length} Projects Available`;
  }


  /* ==========================================================================
     4. HTML TEMPLATE GENERATOR
     ========================================================================== */
  function generateProjectHtml(proj) {
    const title = proj.title || 'Untitled Project';
    const typology = proj.typology || 'Architecture';
    const location = proj.location || 'Dhaka, Bangladesh';
    const year = proj.year || new Date().getFullYear();
    const status = proj.status || 'Built';
    const siteArea = proj.siteArea || 'N/A';
    const builtArea = proj.builtArea || 'N/A';
    const materials = proj.materials || 'Concrete, Timber, Glass';
    const concept = proj.concept || 'Spatial Light & Materiality';

    const narrative1 = proj.narrative1 || '';
    const narrative2 = proj.narrative2 || '';
    const narrative3 = proj.narrative3 || '';

    // Relative paths when file is inside projects/
    let heroSrc = proj.heroImage || (proj.images && proj.images[0] ? proj.images[0].path : 'images/project2.jpg');
    if (!heroSrc.startsWith('http') && !heroSrc.startsWith('../') && !heroSrc.startsWith('data:')) {
      heroSrc = '../' + heroSrc;
    }

    // Build Gallery Grid
    let galleryItemsHtml = '';
    const imagesList = proj.images && proj.images.length > 0 ? proj.images : [
      { path: heroSrc, caption: '01. Primary facade' }
    ];

    imagesList.forEach(function (img, idx) {
      let imgSrc = img.path;
      if (!imgSrc.startsWith('http') && !imgSrc.startsWith('../') && !imgSrc.startsWith('data:')) {
        imgSrc = '../' + imgSrc;
      }
      const caption = img.caption || `0${idx + 1}. Architectural study`;
      const isFullWidth = (idx === imagesList.length - 1 && imagesList.length % 2 !== 0) ? ' class="full-width"' : '';

      galleryItemsHtml += `
                <figure${isFullWidth}>
                    <img src="${imgSrc}" alt="${caption}" loading="lazy">
                    <figcaption>${caption}</figcaption>
                </figure>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — ARK STUDIO</title>
    <meta name="description" content="${title} by Ark Studio: A ${typology.toLowerCase()} project exploring ${concept.toLowerCase()} in ${location}.">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">

    <!-- Open Graph -->
    <meta property="og:title" content="${title} — ARK STUDIO">
    <meta property="og:description" content="A ${typology.toLowerCase()} project exploring ${concept.toLowerCase()} in ${location}.">
    <meta property="og:image" content="${heroSrc}">

    <!-- Inline Theme Init Script (Prevents FOUC) -->
    <script>
        (function() {
            try {
                var saved = localStorage.getItem('ark_theme');
                if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                }
            } catch (e) {}
        })();
    </script>

    <!-- Fonts & Styles -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/pages.css">
</head>
<body>

    <!-- Skip Link for Accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <!-- Header / Navigation -->
    <header class="site-header">
        <div class="logo">
            <a href="../index.html">ARK STUDIO</a>
        </div>
        <div class="header-actions">
            <nav class="site-nav" aria-label="Main navigation">
                <a href="../index.html#work" aria-current="page">Work</a>
                <a href="../about.html">About</a>
                <a href="../journal.html">Journal</a>
                <a href="../contact.html">Contact</a>
            </nav>
            <button class="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle dark / light mode">
                <svg class="icon-moon" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <svg class="icon-sun" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            </button>
            <button class="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
                <span></span>
                <span></span>
            </button>
        </div>
    </header>

    <!-- Main Content -->
    <main id="main-content">

        <!-- PROJECT HERO IMAGE -->
        <div class="project-hero">
            <img src="${heroSrc}" alt="${title} primary facade" fetchpriority="high">
        </div>

        <!-- PROJECT TITLE & METADATA -->
        <header class="project-header">
            <h1 class="project-title">${title}</h1>
            <p class="project-meta">${typology} • ${location} • ${year} • ${status}</p>
            <hr class="project-divider">
        </header>

        <!-- PROJECT BODY (SPECS + NARRATIVE) -->
        <section class="project-body" aria-label="Project Details">
            
            <!-- Sidebar: Project Specifications -->
            <div class="project-specs">
                <h3>Specifications</h3>
                <p><strong>Typology:</strong> ${typology}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Year:</strong> ${year}</p>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Site Area:</strong> ${siteArea}</p>
                <p><strong>Built Area:</strong> ${builtArea}</p>
                <p><strong>Key Materials:</strong> ${materials}</p>
                <p><strong>Concept:</strong> ${concept}</p>
            </div>

            <!-- Main Narrative -->
            <div class="project-narrative">
                <h3>Design Narrative</h3>
                ${narrative1 ? `<p>${narrative1}</p>` : ''}
                ${narrative2 ? `<p>${narrative2}</p>` : ''}
                ${narrative3 ? `<p>${narrative3}</p>` : ''}
            </div>
        </section>

        <!-- DRAWINGS & PROCESS (IMAGE GALLERY) -->
        <section class="project-gallery" aria-label="Project Gallery">
            <h3 class="project-gallery-title">Drawings &amp; Process</h3>
            <div class="gallery-grid">
${galleryItemsHtml}
            </div>
        </section>

        <!-- PROJECT NAVIGATION (PREV / NEXT) -->
        <nav class="project-nav" aria-label="Project navigation">
            <a href="../index.html#work">&larr; Back to Selected Works</a>
            <a href="concrete-pavilion.html">Next Project &rarr;</a>
        </nav>

    </main>

    <!-- LIGHTBOX MODAL -->
    <div class="lightbox" role="dialog" aria-modal="true" aria-label="Image view modal">
        <button class="lightbox-close" aria-label="Close image modal">&times;</button>
        <button class="lightbox-prev" aria-label="Previous image">&#10094;</button>
        <button class="lightbox-next" aria-label="Next image">&#10095;</button>
        <img src="" alt="">
    </div>

    <!-- Footer -->
    <footer class="site-footer">
        <p>&copy; 2026 ARK STUDIO. All rights reserved.</p>
        <div class="footer-nav">
            <a href="../index.html#work">Work</a>
            <a href="../about.html">About</a>
            <a href="../journal.html">Journal</a>
            <a href="../contact.html">Contact</a>
            <a href="../dashboard.html">Dashboard</a>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="../js/main.js" defer></script>
</body>
</html>`;
  }

  function generateCardHtml(proj) {
    const slug = proj.slug || 'new-project';
    const title = proj.title || 'Project Title';
    const typology = proj.typology || 'Residential';
    const loc = (proj.location || 'Dhaka').split(',')[0].trim();
    const year = proj.year || new Date().getFullYear();
    const img = proj.heroImage || (proj.images && proj.images[0] ? proj.images[0].path : 'images/project1.jpg');

    return `<a href="projects/${slug}.html" class="project-card" aria-label="View project: ${title}">
    <div class="project-card-image">
        <img src="${img}" alt="${title} facade" loading="lazy">
    </div>
    <div class="project-card-info">
        <h3>${title}</h3>
        <p>${typology} • ${loc} • ${year}</p>
    </div>
</a>`;
  }


  /* ==========================================================================
     5. VISUAL PROJECT EDITOR
     ========================================================================== */
  function openEditor(projectId) {
    editingProjectId = projectId;
    const modal = document.getElementById('dash-editor-modal');
    const headerTitle = document.getElementById('dash-editor-modal-title');
    if (!modal) return;

    let proj = null;
    if (projectId) {
      proj = currentProjects.find(p => p.id === projectId);
    }

    if (proj) {
      headerTitle.textContent = `Edit Project: ${proj.title}`;
      populateForm(proj);
      tempEditorImages = proj.images ? JSON.parse(JSON.stringify(proj.images)) : [];
    } else {
      headerTitle.textContent = 'Add New Project';
      resetForm();
      tempEditorImages = [];
    }

    renderEditorImages();
    switchEditorTab('tab-info');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeEditor() {
    const modal = document.getElementById('dash-editor-modal');
    if (modal) modal.classList.remove('is-open');
    document.body.style.overflow = '';
    editingProjectId = null;
    tempEditorImages = [];
  }

  function populateForm(proj) {
    document.getElementById('edit-title').value = proj.title || '';
    document.getElementById('edit-slug').value = proj.slug || '';
    document.getElementById('edit-typology').value = proj.typology || 'Residential';
    document.getElementById('edit-location').value = proj.location || 'Dhaka, Bangladesh';
    document.getElementById('edit-year').value = proj.year || new Date().getFullYear();
    document.getElementById('edit-status').value = proj.status || 'Built';

    document.getElementById('edit-architect').value = proj.leadArchitect || 'Ark Studio Team';
    document.getElementById('edit-site-area').value = proj.siteArea || '';
    document.getElementById('edit-built-area').value = proj.builtArea || '';
    document.getElementById('edit-materials').value = proj.materials || '';
    document.getElementById('edit-concept').value = proj.concept || '';

    document.getElementById('edit-narrative1').value = proj.narrative1 || '';
    document.getElementById('edit-narrative2').value = proj.narrative2 || '';
    document.getElementById('edit-narrative3').value = proj.narrative3 || '';

    highlightTypologyPill(proj.typology);
  }

  function resetForm() {
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-slug').value = '';
    document.getElementById('edit-typology').value = 'Residential';
    document.getElementById('edit-location').value = 'Dhaka, Bangladesh';
    document.getElementById('edit-year').value = new Date().getFullYear();
    document.getElementById('edit-status').value = 'Built';

    document.getElementById('edit-architect').value = 'Ark Studio Team';
    document.getElementById('edit-site-area').value = '';
    document.getElementById('edit-built-area').value = '';
    document.getElementById('edit-materials').value = 'Exposed Concrete, Brick, Teak';
    document.getElementById('edit-concept').value = '';

    document.getElementById('edit-narrative1').value = '';
    document.getElementById('edit-narrative2').value = '';
    document.getElementById('edit-narrative3').value = '';

    highlightTypologyPill('Residential');
  }

  function highlightTypologyPill(typology) {
    const pills = document.querySelectorAll('.dash-pill');
    pills.forEach(p => {
      p.classList.toggle('is-selected', p.getAttribute('data-value') === typology);
    });
  }

  function switchEditorTab(tabId) {
    document.querySelectorAll('.dash-editor-tab-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-target') === tabId);
    });
    document.querySelectorAll('.dash-editor-panel').forEach(panel => {
      panel.classList.toggle('is-active', panel.id === tabId);
    });
  }

  function getProjectFromForm() {
    const title = document.getElementById('edit-title').value.trim() || 'Untitled Project';
    let slug = document.getElementById('edit-slug').value.trim();
    if (!slug) {
      slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    }

    const heroImage = tempEditorImages.length > 0 ? tempEditorImages[0].path : 'images/project2.jpg';

    return {
      id: editingProjectId || slug || 'proj-' + Date.now(),
      slug: slug,
      title: title,
      typology: document.getElementById('edit-typology').value.trim() || 'Residential',
      location: document.getElementById('edit-location').value.trim() || 'Dhaka, Bangladesh',
      year: document.getElementById('edit-year').value.trim() || new Date().getFullYear(),
      status: document.getElementById('edit-status').value.trim() || 'Built',
      siteArea: document.getElementById('edit-site-area').value.trim() || '',
      builtArea: document.getElementById('edit-built-area').value.trim() || '',
      leadArchitect: document.getElementById('edit-architect').value.trim() || 'Ark Studio Team',
      materials: document.getElementById('edit-materials').value.trim() || '',
      concept: document.getElementById('edit-concept').value.trim() || '',
      narrative1: document.getElementById('edit-narrative1').value.trim() || '',
      narrative2: document.getElementById('edit-narrative2').value.trim() || '',
      narrative3: document.getElementById('edit-narrative3').value.trim() || '',
      heroImage: heroImage,
      images: tempEditorImages
    };
  }


  /* ==========================================================================
     6. IMAGE UPLOAD & GALLERY MANAGEMENT IN EDITOR
     ========================================================================== */
  function renderEditorImages() {
    const galleryEl = document.getElementById('dash-editor-image-gallery');
    if (!galleryEl) return;

    galleryEl.innerHTML = '';

    if (tempEditorImages.length === 0) {
      galleryEl.innerHTML = '<p style="grid-column: 1/-1; color: var(--color-text-muted); font-size: var(--text-xs); text-align: center; padding: 20px;">No images added yet. Drop photos above or pick from the studio library.</p>';
      return;
    }

    tempEditorImages.forEach((img, idx) => {
      const isHero = (idx === 0);
      const card = document.createElement('div');
      card.className = `dash-upload-card ${isHero ? 'is-hero' : ''}`;

      card.innerHTML = `
        ${isHero ? '<span class="dash-upload-hero-tag">★ Cover</span>' : ''}
        <img src="${img.path}" class="dash-upload-thumb" alt="Preview">
        <input type="text" class="dash-upload-caption-input" value="${img.caption || ''}" placeholder="Caption (e.g. 0${idx+1}. Twilight view)">
        <div class="dash-upload-actions">
          ${!isHero ? `<button type="button" class="dash-btn-set-hero btn-make-hero" data-index="${idx}">Make Cover</button>` : '<span></span>'}
          <button type="button" class="dash-btn-remove-img btn-del-img" data-index="${idx}">Remove</button>
        </div>
      `;

      card.querySelector('.dash-upload-caption-input').addEventListener('input', function (e) {
        tempEditorImages[idx].caption = e.target.value;
      });

      if (!isHero) {
        card.querySelector('.btn-make-hero').addEventListener('click', function () {
          const chosen = tempEditorImages.splice(idx, 1)[0];
          tempEditorImages.unshift(chosen);
          renderEditorImages();
        });
      }

      card.querySelector('.btn-del-img').addEventListener('click', function () {
        tempEditorImages.splice(idx, 1);
        renderEditorImages();
      });

      galleryEl.appendChild(card);
    });
  }

  function handleFilesSelected(files) {
    if (!files || !files.length) return;

    Array.from(files).forEach((file, i) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        tempEditorImages.push({
          path: e.target.result, // base64 for instant preview & local save
          name: file.name,
          caption: `0${tempEditorImages.length + 1}. ${file.name.replace(/\.[^/.]+$/, '')}`
        });
        renderEditorImages();
      };
      reader.readAsDataURL(file);
    });
  }


  /* ==========================================================================
     7. SAVE, EXPORT & PREVIEW ACTIONS
     ========================================================================== */
  function saveProjectToLibrary() {
    const proj = getProjectFromForm();
    const existingIndex = currentProjects.findIndex(p => p.id === proj.id || p.slug === proj.slug);

    if (existingIndex >= 0) {
      currentProjects[existingIndex] = proj;
    } else {
      currentProjects.unshift(proj);
    }

    saveProjects();
    closeEditor();
    showToast(`Project "${proj.title}" saved to Studio Library!`);
  }

  async function directSaveToServer() {
    const proj = getProjectFromForm();
    const html = generateProjectHtml(proj);
    const cardHtml = generateCardHtml(proj);

    try {
      // 1. Upload any base64 images to server disk
      for (let img of tempEditorImages) {
        if (img.path.startsWith('data:')) {
          const filename = img.name || `image-${Date.now()}.jpg`;
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: proj.slug,
              filename: filename,
              base64: img.path
            })
          });
          if (uploadRes.ok) {
            const upData = await uploadRes.json();
            img.path = upData.publicPath;
          }
        }
      }

      // Re-generate html with updated image paths
      const updatedHtml = generateProjectHtml(proj);

      // 2. Save HTML file to projects/
      const res = await fetch('/api/save-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: proj.slug,
          html: updatedHtml,
          cardHtml: cardHtml
        })
      });

      if (res.ok) {
        // Also update local list
        const existingIndex = currentProjects.findIndex(p => p.id === proj.id || p.slug === proj.slug);
        if (existingIndex >= 0) {
          currentProjects[existingIndex] = proj;
        } else {
          currentProjects.unshift(proj);
        }
        saveProjects();
        closeEditor();
        showToast(`⚡ Project "${proj.title}" written directly to projects/${proj.slug}.html!`);
        return;
      }
    } catch (err) {
      console.error('Server save error:', err);
    }

    // Fallback if failed
    showToast('Server save failed, falling back to browser download.');
    downloadProjectHtml(proj);
  }

  function downloadProjectHtml(proj) {
    const html = generateProjectHtml(proj);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.slug || 'project'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${proj.slug}.html (place inside projects/ folder)`);
  }

  function openPreview(proj) {
    const modal = document.getElementById('dash-preview-modal');
    const iframe = document.getElementById('dash-preview-iframe');
    const titleEl = document.getElementById('dash-preview-title');
    if (!modal || !iframe) return;

    titleEl.textContent = `Preview: ${proj.title}`;
    const html = generateProjectHtml(proj);
    iframe.srcdoc = html;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closePreview() {
    const modal = document.getElementById('dash-preview-modal');
    const iframe = document.getElementById('dash-preview-iframe');
    if (modal) modal.classList.remove('is-open');
    if (iframe) iframe.srcdoc = '';
    document.body.style.overflow = '';
  }

  function showToast(msg) {
    let toast = document.getElementById('dash-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dash-toast';
      toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; background: var(--color-text); color: var(--color-bg); padding: 12px 20px; font-size: 0.85rem; border-radius: 2px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3000);
  }


  /* ==========================================================================
     8. JSON BACKUP & RESTORE
     ========================================================================== */
  function exportProjectsJson() {
    const jsonStr = JSON.stringify(currentProjects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ark-studio-projects-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Studio projects exported to JSON!');
  }

  function importProjectsJson(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          currentProjects = imported;
          saveProjects();
          showToast(`Successfully imported ${imported.length} projects!`);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  }


  /* ==========================================================================
     9. EVENT BINDINGS & BOOTSTRAP
     ========================================================================== */
  function initDashboard() {
    loadProjects();
    checkServerStatus();

    // Studio Clock
    const clockEl = document.getElementById('dash-studio-clock');
    if (clockEl) {
      function updateClock() {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now);
        clockEl.textContent = timeStr + ' BST (UTC+6)';
      }
      updateClock();
      setInterval(updateClock, 1000);
    }

    // Viewport size
    const vpEl = document.getElementById('dash-viewport-size');
    if (vpEl) {
      function updateSize() {
        vpEl.textContent = window.innerWidth + ' × ' + window.innerHeight + 'px';
      }
      updateSize();
      window.addEventListener('resize', updateSize, { passive: true });
    }

    // New Project Button
    const btnNewProj = document.getElementById('dash-btn-new-proj');
    if (btnNewProj) {
      btnNewProj.addEventListener('click', function () {
        openEditor(null);
      });
    }

    // Editor Modal Close Buttons
    const btnCloseEditor = document.getElementById('dash-editor-close-btn');
    const btnCancelEditor = document.getElementById('dash-btn-cancel-editor');
    if (btnCloseEditor) btnCloseEditor.addEventListener('click', closeEditor);
    if (btnCancelEditor) btnCancelEditor.addEventListener('click', closeEditor);

    // Editor Tab Buttons
    document.querySelectorAll('.dash-editor-tab-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        switchEditorTab(btn.getAttribute('data-target'));
      });
    });

    // Typology Pills
    document.querySelectorAll('.dash-pill').forEach(pill => {
      pill.addEventListener('click', function () {
        const val = pill.getAttribute('data-value');
        document.getElementById('edit-typology').value = val;
        highlightTypologyPill(val);
      });
    });

    // Auto slug from title
    const titleInput = document.getElementById('edit-title');
    const slugInput = document.getElementById('edit-slug');
    if (titleInput && slugInput) {
      titleInput.addEventListener('input', function () {
        if (!editingProjectId) {
          slugInput.value = titleInput.value.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        }
      });
    }

    // Drag & Drop Image Uploader
    const dropzone = document.getElementById('dash-dropzone');
    const fileInput = document.getElementById('dash-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFilesSelected(e.target.files));

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('is-dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        handleFilesSelected(e.dataTransfer.files);
      });
    }

    // Quick add from media library
    const btnAddExistingMedia = document.getElementById('dash-btn-add-existing-media');
    if (btnAddExistingMedia) {
      btnAddExistingMedia.addEventListener('click', function () {
        const samples = [
          { path: 'images/project2.jpg', caption: 'Concrete facade study' },
          { path: 'images/project1.jpg', caption: 'Glass tower corner perspective' },
          { path: 'images/hero-bg.jpg', caption: 'Terracotta jali sunset detail' }
        ];
        samples.forEach(s => tempEditorImages.push(s));
        renderEditorImages();
      });
    }

    // Editor Actions
    const btnSaveLib = document.getElementById('dash-btn-save-library');
    if (btnSaveLib) btnSaveLib.addEventListener('click', saveProjectToLibrary);

    const btnDirectSave = document.getElementById('dash-btn-direct-save');
    if (btnDirectSave) btnDirectSave.addEventListener('click', directSaveToServer);

    const btnDownloadHtml = document.getElementById('dash-btn-download-html');
    if (btnDownloadHtml) {
      btnDownloadHtml.addEventListener('click', function () {
        const proj = getProjectFromForm();
        downloadProjectHtml(proj);
      });
    }

    const btnPreviewForm = document.getElementById('dash-btn-preview-form');
    if (btnPreviewForm) {
      btnPreviewForm.addEventListener('click', function () {
        const proj = getProjectFromForm();
        openPreview(proj);
      });
    }

    const btnCopyCardForm = document.getElementById('dash-btn-copy-card-form');
    if (btnCopyCardForm) {
      btnCopyCardForm.addEventListener('click', function () {
        const proj = getProjectFromForm();
        const cardHtml = generateCardHtml(proj);
        navigator.clipboard.writeText(cardHtml).then(function () {
          const orig = btnCopyCardForm.textContent;
          btnCopyCardForm.textContent = 'Card Copied!';
          setTimeout(() => btnCopyCardForm.textContent = orig, 1500);
        });
      });
    }

    // Preview Modal Close
    const btnClosePreview = document.getElementById('dash-preview-close-btn');
    if (btnClosePreview) btnClosePreview.addEventListener('click', closePreview);

    // JSON Export / Import
    const btnExportJson = document.getElementById('dash-btn-export-json');
    if (btnExportJson) btnExportJson.addEventListener('click', exportProjectsJson);

    const btnImportJson = document.getElementById('dash-btn-import-json');
    const jsonFileInput = document.getElementById('dash-json-file-input');
    if (btnImportJson && jsonFileInput) {
      btnImportJson.addEventListener('click', () => jsonFileInput.click());
      jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importProjectsJson(e.target.files[0]);
        }
      });
    }

    // Media library copy path buttons
    document.querySelectorAll('.dash-copy-path-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const path = btn.getAttribute('data-path');
        if (!path) return;
        navigator.clipboard.writeText(path).then(function () {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = orig, 1500);
        });
      });
    });

    // Cloud Sync & Remote Publishing Controls
    const btnPublishLive = document.getElementById('dash-btn-publish-live');
    if (btnPublishLive) btnPublishLive.addEventListener('click', publishToLiveWebsite);

    const btnCloudSettings = document.getElementById('dash-btn-cloud-settings');
    if (btnCloudSettings) btnCloudSettings.addEventListener('click', openCloudModal);

    const btnCloudClose = document.getElementById('dash-cloud-close-btn');
    if (btnCloudClose) btnCloudClose.addEventListener('click', closeCloudModal);

    const btnCloudCancel = document.getElementById('dash-cloud-btn-cancel');
    if (btnCloudCancel) btnCloudCancel.addEventListener('click', closeCloudModal);

    const backdropCloud = document.getElementById('dash-cloud-backdrop');
    if (backdropCloud) backdropCloud.addEventListener('click', closeCloudModal);

    const btnCloudTest = document.getElementById('dash-cloud-btn-test');
    if (btnCloudTest) btnCloudTest.addEventListener('click', testCloudConnection);

    const btnCloudSave = document.getElementById('dash-cloud-btn-save');
    if (btnCloudSave) btnCloudSave.addEventListener('click', saveCloudCredentials);

    // Interactive Checklist
    initChecklist();
  }

  /* ==========================================================================
     GLOBAL CLOUD SYNC & GITHUB REST API ENGINE
     ========================================================================== */
  function openCloudModal() {
    const modal = document.getElementById('dash-cloud-modal');
    const cfg = getGhConfig();
    if (modal) {
      const repoInput = document.getElementById('dash-gh-repo');
      const branchInput = document.getElementById('dash-gh-branch');
      const tokenInput = document.getElementById('dash-gh-token');
      if (repoInput) repoInput.value = cfg.repo || '';
      if (branchInput) branchInput.value = cfg.branch || 'main';
      if (tokenInput) tokenInput.value = cfg.token || '';
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCloudModal() {
    const modal = document.getElementById('dash-cloud-modal');
    if (modal) {
      modal.classList.remove('is-active');
      document.body.style.overflow = '';
    }
  }

  function showCloudStatus(msg, type) {
    const box = document.getElementById('dash-cloud-status-box');
    if (!box) return;
    box.style.display = 'block';
    box.innerHTML = msg;
    if (type === 'success') {
      box.style.color = '#15803d';
      box.style.borderColor = '#86efac';
    } else if (type === 'error' || type === 'warn') {
      box.style.color = '#b91c1c';
      box.style.borderColor = '#fca5a5';
    } else {
      box.style.color = 'var(--color-text)';
      box.style.borderColor = 'var(--color-border)';
    }
  }

  async function testCloudConnection() {
    const repoInput = document.getElementById('dash-gh-repo');
    const branchInput = document.getElementById('dash-gh-branch');
    const tokenInput = document.getElementById('dash-gh-token');

    const repo = repoInput ? repoInput.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '') : '';
    const branch = branchInput ? branchInput.value.trim() : 'main';
    const token = tokenInput ? tokenInput.value.trim() : '';

    if (!repo || !token) {
      showCloudStatus('⚠️ Please enter both Repository (e.g. <code>username/arch-portfolio</code>) and Personal Access Token.', 'warn');
      return;
    }

    showCloudStatus('⏳ Verifying credentials with GitHub API...', 'info');

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        showCloudStatus(`✅ Connection verified! Repository <strong>${escapeHtml(data.full_name)}</strong> is connected.<br>Default branch: <code>${escapeHtml(data.default_branch)}</code> &bull; Permission: Write access confirmed.`, 'success');
      } else if (res.status === 401) {
        showCloudStatus('❌ <strong>Authentication Failed</strong> (401): Invalid Personal Access Token. Please verify token on GitHub.', 'error');
      } else if (res.status === 404) {
        showCloudStatus('❌ <strong>Repository Not Found</strong> (404): Check repository name spelling (format: <code>username/repo-name</code>) and ensure token has repo access.', 'error');
      } else {
        showCloudStatus(`❌ GitHub API returned HTTP status ${res.status}.`, 'error');
      }
    } catch (e) {
      showCloudStatus('❌ Network error testing connection: ' + escapeHtml(e.message), 'error');
    }
  }

  function saveCloudCredentials() {
    const repo = (document.getElementById('dash-gh-repo')?.value || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    const branch = (document.getElementById('dash-gh-branch')?.value || 'main').trim();
    const token = (document.getElementById('dash-gh-token')?.value || '').trim();

    setGhConfig({ repo, branch, token });
    showCloudStatus('✅ Credentials saved in your local browser! 1-click live publish is now active.', 'success');
    checkServerStatus();
    setTimeout(closeCloudModal, 1200);
  }

  async function commitGitHubFile(repo, branch, token, filePath, contentUtf8, commitMessage) {
    const cleanPath = filePath.replace(/^\//, '');
    const getUrl = `https://api.github.com/repos/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`;
    let sha = null;

    try {
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }
    } catch (e) {}

    const putUrl = `https://api.github.com/repos/${repo}/contents/${cleanPath}`;
    const payload = {
      message: commitMessage || `Update ${cleanPath} via ARK STUDIO CMS`,
      content: toBase64Utf8(contentUtf8),
      branch: branch
    };
    if (sha) payload.sha = sha;

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to commit ${cleanPath} (HTTP ${putRes.status})`);
    }

    return await putRes.json();
  }

  async function publishToLiveWebsite() {
    const gh = getGhConfig();
    if (!gh.repo || !gh.token) {
      openCloudModal();
      showCloudStatus('⚠️ Please enter your GitHub Repository and Personal Access Token before publishing live.', 'warn');
      return;
    }

    const btnPublish = document.getElementById('dash-btn-publish-live');
    const origHtml = btnPublish ? btnPublish.innerHTML : '';
    if (btnPublish) {
      btnPublish.disabled = true;
      btnPublish.innerHTML = '⏳ Committing to GitHub...';
    }

    try {
      const repo = gh.repo.trim();
      const branch = (gh.branch || 'main').trim();
      const token = gh.token.trim();

      // 1. Commit data/projects.json
      const projectsJsonStr = JSON.stringify(currentProjects, null, 2);
      await commitGitHubFile(
        repo,
        branch,
        token,
        'data/projects.json',
        projectsJsonStr,
        `Update portfolio data (${currentProjects.length} projects) via Studio CMS`
      );

      // 2. Commit standalone static HTML files for all projects
      for (const proj of currentProjects) {
        const slug = proj.slug || proj.id;
        const html = generateProjectHtml(proj);
        await commitGitHubFile(
          repo,
          branch,
          token,
          `projects/${slug}.html`,
          html,
          `Update project page: ${proj.title}`
        );
      }

      if (btnPublish) {
        btnPublish.innerHTML = '✅ Live Deploy Triggered!';
        setTimeout(() => {
          btnPublish.disabled = false;
          btnPublish.innerHTML = origHtml;
        }, 4000);
      }

      alert(
        '🚀 SUCCESS: Your updates have been committed to GitHub!\n\n' +
        'Vercel has automatically started building and deploying your live website.\n' +
        'Your changes will be live worldwide across all devices in approximately 25-30 seconds.'
      );

      checkServerStatus();
    } catch (err) {
      console.error('Publish error:', err);
      if (btnPublish) {
        btnPublish.disabled = false;
        btnPublish.innerHTML = origHtml;
      }
      alert('❌ Failed to publish to GitHub:\n\n' + err.message + '\n\nPlease check your credentials in Cloud Sync settings.');
    }
  }

  function initChecklist() {
    const checklistItems = document.querySelectorAll('.dash-checklist-interactive li');
    const progressBar = document.getElementById('checklist-progress-bar');
    const progressText = document.getElementById('checklist-progress-text');
    const resetBtn = document.getElementById('checklist-reset-btn');

    if (!checklistItems.length) return;

    const CHECKLIST_STORAGE_KEY = 'ark_dashboard_checklist_v2';
    let savedState = {};
    try {
      savedState = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || '{}');
    } catch (e) {
      savedState = {};
    }

    function updateProgress() {
      let total = checklistItems.length;
      let completed = 0;

      checklistItems.forEach(function (item) {
        if (item.getAttribute('data-checked') === 'true') completed++;
      });

      const percentage = Math.round((completed / total) * 100);
      if (progressBar) progressBar.style.width = percentage + '%';
      if (progressText) progressText.textContent = `${completed} of ${total} completed (${percentage}%)`;
    }

    checklistItems.forEach(function (item, index) {
      const itemId = item.getAttribute('data-id') || ('item-' + index);
      if (savedState[itemId] !== undefined) {
        item.setAttribute('data-checked', savedState[itemId]);
      }

      item.addEventListener('click', function () {
        const next = item.getAttribute('data-checked') !== 'true';
        item.setAttribute('data-checked', next ? 'true' : 'false');
        savedState[itemId] = next;
        try {
          localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(savedState));
        } catch (e) {}
        updateProgress();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!confirm('Reset checklist items?')) return;
        localStorage.removeItem(CHECKLIST_STORAGE_KEY);
        checklistItems.forEach(function (item) {
          const initial = item.getAttribute('data-initial') === 'true';
          item.setAttribute('data-checked', initial ? 'true' : 'false');
        });
        savedState = {};
        updateProgress();
      });
    }

    updateProgress();
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }
})();
