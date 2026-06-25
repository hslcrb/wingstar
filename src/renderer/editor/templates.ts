export interface ComponentTemplate {
  html: string;
  name: string;
}

export const componentTemplates: { [key: string]: ComponentTemplate } = {
  header: {
    name: 'Header Banner',
    html: `<header class="site-header">
  <div class="nav-container">
    <div class="logo">WingStar Project</div>
    <nav class="nav-links">
      <a href="#features">Features</a>
      <a href="#about">About</a>
      <a href="#contact" class="nav-btn">Get Started</a>
    </nav>
  </div>
</header>`
  },
  hero: {
    name: 'Hero Centerpiece',
    html: `<section class="hero-section">
  <div class="hero-content">
    <h1 class="hero-title">Reach Beyond the Stars</h1>
    <p class="hero-subtitle">Create gorgeous web designs instantly. Import vector assets, map element IDs, and build semantic pages in real time.</p>
    <div class="hero-buttons">
      <button class="btn btn-primary" id="hero-cta">Explore Features</button>
      <button class="btn btn-secondary" id="hero-secondary">View Documentation</button>
    </div>
  </div>
</section>`
  },
  'card-grid': {
    name: 'Feature Cards Grid',
    html: `<section class="features-section" id="features">
  <h2 class="section-title">Celestial Capabilities</h2>
  <div class="card-grid">
    <div class="feature-card" id="card-wysiwyg">
      <div class="card-icon">⚡</div>
      <h3 class="card-title">WYSIWYG Editing</h3>
      <p class="card-text">Drag, resize, double-click to edit text directly on a beautiful, reactive visual editor canvas.</p>
    </div>
    <div class="feature-card" id="card-vector">
      <div class="card-icon">✨</div>
      <h3 class="card-title">Vector Integrator</h3>
      <p class="card-text">Load SVG and EPS files, inspect their paths, and compile vector IDs into native interactive HTML elements.</p>
    </div>
    <div class="feature-card" id="card-sync">
      <div class="card-icon">🚀</div>
      <h3 class="card-title">Live Code Sync</h3>
      <p class="card-text">Double-direction updating guarantees your raw HTML code and visual preview remain perfectly synced.</p>
    </div>
  </div>
</section>`
  },
  section: {
    name: 'Content Section',
    html: `<section class="content-section">
  <div class="content-container">
    <div class="content-text">
      <h2>Visual Control. Zero Bloat.</h2>
      <p>WingStar generates clean, semantic HTML and CSS. No redundant frameworks, no cluttered stylesheets. Just code you can deploy anywhere.</p>
      <ul class="features-list">
        <li>Clean, standard semantic layout</li>
        <li>Fully responsive grid and flex structures</li>
        <li>Built-in interactivity controls</li>
      </ul>
    </div>
    <div class="content-visual">
      <div class="visual-placeholder">
        <svg viewBox="0 0 100 100" width="80" height="80">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
          <polygon points="50,25 57,42 75,42 61,53 66,71 50,60 34,71 39,53 25,42 43,42" fill="rgba(192, 132, 252, 0.2)" />
        </svg>
      </div>
    </div>
  </div>
</section>`
  },
  footer: {
    name: 'Footer Block',
    html: `<footer class="site-footer">
  <div class="footer-container">
    <p class="copyright">&copy; 2026 WingStar Web Builder. All rights reserved.</p>
    <div class="footer-links">
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
      <a href="#">Support</a>
    </div>
  </div>
</footer>`
  },
  h1: {
    name: 'Heading 1',
    html: `<h1 class="editable-element">Main Heading Title</h1>`
  },
  p: {
    name: 'Paragraph',
    html: `<p class="editable-element">This is a editable paragraph of text. Double click to type or modify.</p>`
  },
  button: {
    name: 'Interactive Button',
    html: `<button class="btn btn-primary" id="btn-custom">Action Button</button>`
  },
  image: {
    name: 'Responsive Image',
    html: `<img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80" alt="Cosmic Stars" class="responsive-img">`
  },
  card: {
    name: 'Single Container Card',
    html: `<div class="info-card">
  <h3>Card Header</h3>
  <p>Add details or text description inside this card block.</p>
</div>`
  }
};

export const defaultStyles = `/* Modern CSS Reset & Core Styling */
:root {
  --primary: #c084fc;
  --primary-dark: #8b5cf6;
  --secondary: #fbbf24;
  --bg-color: #0b0b12;
  --card-bg: #141422;
  --border-color: #242436;
  --text-main: #f1f1f7;
  --text-muted: #8c8ca5;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-color);
  color: var(--text-main);
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  padding: 0;
  overflow-x: hidden;
}

/* Site Header */
.site-header {
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(11, 11, 18, 0.8);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 16px 0;
}

.nav-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--secondary), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: #fff;
}

.nav-links a.nav-btn {
  background: var(--primary-dark);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.nav-links a.nav-btn:hover {
  background: var(--primary);
}

/* Hero Section */
.hero-section {
  padding: 80px 20px;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #fff 40%, var(--primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 32px;
  line-height: 1.7;
}

.hero-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* Buttons */
.btn {
  padding: 10px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-dark);
  color: #fff;
}

.btn-primary:hover {
  background: var(--primary);
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}

.btn-secondary {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.btn-secondary:hover {
  background: #1c1c30;
  border-color: var(--primary-dark);
}

/* Card Grid */
.features-section {
  padding: 60px 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 40px;
  font-weight: 700;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.feature-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
}

.feature-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.25rem;
  margin-bottom: 10px;
  font-weight: 600;
  color: #fff;
}

.card-text {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Content Section */
.content-section {
  padding: 60px 20px;
  max-width: 1100px;
  margin: 0 auto;
  border-top: 1px solid var(--border-color);
}

.content-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}

@media (max-width: 768px) {
  .content-container {
    grid-template-columns: 1fr;
  }
}

.content-text h2 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.content-text p {
  color: var(--text-muted);
  margin-bottom: 24px;
}

.features-list {
  list-style: none;
}

.features-list li {
  margin-bottom: 12px;
  padding-left: 24px;
  position: relative;
  font-size: 0.95rem;
}

.features-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--primary);
  font-weight: bold;
}

.content-visual {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.visual-placeholder {
  animation: pulse 4s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

/* Info Card */
.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 20px;
  border-radius: 8px;
  margin: 12px 0;
}

.info-card h3 {
  margin-bottom: 8px;
  color: #fff;
}

.info-card p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Image */
.responsive-img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  border: 1px solid var(--border-color);
}

/* Footer */
.site-footer {
  border-top: 1px solid var(--border-color);
  padding: 30px 20px;
  margin-top: 60px;
  background: var(--bg-color);
}

.footer-container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.footer-links {
  display: flex;
  gap: 20px;
}

.footer-links a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: #fff;
}

/* WingStar Logo Styling for embedded vectors */
.wingstar-logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 50px auto;
  padding: 30px;
  background: radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 60%);
}

.wingstar-glow-logo {
  filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.3)) drop-shadow(0 0 25px rgba(251, 191, 36, 0.2));
  animation: logo-float 6s infinite ease-in-out;
}

@keyframes logo-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

.editable-element {
  outline: none;
  transition: outline 0.2s;
}
.editable-element:focus {
  outline: 2px dashed var(--primary);
}
`;

export const defaultHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WingStar Project</title>
  <!-- Load fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style id="project-styles">
${defaultStyles}
  </style>
</head>
<body>

  <!-- Header Section -->
  <header class="site-header" id="ws-header">
    <div class="nav-container">
      <div class="logo" id="ws-brand">WingStar</div>
      <nav class="nav-links">
        <a href="#features">Features</a>
        <a href="#about">About</a>
        <a href="#contact" class="nav-btn" id="ws-nav-btn">Get Started</a>
      </nav>
    </div>
  </header>

  <!-- WingStar Winged-Star Decorative Logo -->
  <div class="wingstar-logo-container">
    <svg class="wingstar-glow-logo" viewBox="0 0 100 100" width="160" height="160">
      <defs>
        <linearGradient id="star-grad-canvas" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="50%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <!-- Wings -->
      <path id="wing-left" d="M 50 45 C 25 15, 5 35, 10 65 C 15 55, 25 50, 45 48 Z" fill="url(#star-grad-canvas)" opacity="0.8" />
      <path id="wing-right" d="M 50 45 C 75 15, 95 35, 90 65 C 85 55, 75 50, 55 48 Z" fill="url(#star-grad-canvas)" opacity="0.8" />
      <!-- Star -->
      <polygon id="center-star" points="50,12 60,37 85,37 66,52 73,77 50,61 27,77 34,52 15,37 40,37" fill="url(#star-grad-canvas)" />
    </svg>
  </div>

  <!-- Hero Section -->
  <section class="hero-section" id="ws-hero">
    <div class="hero-content">
      <h1 class="hero-title" id="ws-hero-title">WingStar Web Builder</h1>
      <p class="hero-subtitle" id="ws-hero-subtitle">Make breathtaking designs, load vector icons, inspect elements with IDs, and export production-ready HTML/CSS instantly.</p>
      <div class="hero-buttons">
        <button class="btn btn-primary" id="ws-cta-button">Interactive Button</button>
        <button class="btn btn-secondary" id="ws-secondary-button">Learn More</button>
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section class="features-section" id="features">
    <h2 class="section-title">Visual Control. Zero Bloat.</h2>
    <div class="card-grid">
      <div class="feature-card" id="feat-wysiwyg">
        <div class="card-icon">⚡</div>
        <h3 class="card-title">WYSIWYG Workspace</h3>
        <p class="card-text">Directly drag components from the sidebar and place them inside the layout. Click elements to inspect and drag borders to resize.</p>
      </div>
      <div class="feature-card" id="feat-vector">
        <div class="card-icon">✨</div>
        <h3 class="card-title">Vector Imports</h3>
        <p class="card-text">Import SVG or EPS vector formats. WingStar automatically scans layer names and maps them into editable DOM elements.</p>
      </div>
      <div class="feature-card" id="feat-sync">
        <div class="card-icon">🚀</div>
        <h3 class="card-title">Dual Sync Editor</h3>
        <p class="card-text">Code changes render immediately on the design sheet, and visual interactions update the raw HTML code in real time.</p>
      </div>
    </div>
  </section>

  <!-- Footer Section -->
  <footer class="site-footer" id="ws-footer">
    <div class="footer-container">
      <p class="copyright">&copy; 2026 WingStar. Created with WingStar Web Builder.</p>
      <div class="footer-links">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Support</a>
      </div>
    </div>
  </footer>

</body>
</html>
`;
