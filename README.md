# BigQuery Release Sentinel

A premium, responsive, and modern Python Flask web application to monitor, filter, and share the latest Google Cloud BigQuery release updates.

![Screenshot Preview](https://img.shields.io/badge/BigQuery-Release%20Sentinel-indigo)
![Python 3.12](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey)

---

## ✨ Features

- **Granular Update Splitting:** Automatically parses date-level release summaries into individual sub-update cards (*Features*, *Changes*, *Deprecations*, *Fixes*) using BeautifulSoup.
- **Dynamic Category Filtering:** Toggle specific pills to instantly view updates by type with color-coded badges.
- **Real-Time Keyword Search:** Filter titles, dates, SQL syntax, or details dynamically.
- **Animated Slate & Neon Aesthetics:** Styled using a custom CSS layout featuring a dark slate palette, neon border highlights, glassmorphic containers, and skeleton-shimmer loader cards.
- **Built-in Tweet Composer:**
  - Multiple templates (Feature Emoji style, Hot Highlights, Corporate style).
  - Character counter safety check (280 characters limit warning).
  - Quick hashtag toggles (`#GoogleCloud`, `#BigQuery`, `#SQL`).
  - Integration with Twitter Web Intent for one-click publishing.
- **Cache-Optimized Backend:** Uses an in-memory 10-minute cache with a force-refresh trigger that displays a rotating spinner.

---

## 📂 Project Structure

```
├── app.py                 # Flask server, Atom feed parsing, and cache endpoint
├── static/
│   ├── app.js             # Client-side render, filtering, and Tweet composer logic
│   └── style.css          # Core custom styles, variables, transitions, and loading states
├── templates/
│   └── index.html         # Web app main page template
└── .gitignore             # Ignored directories (virtualenv, python caches, IDE config)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.12 or higher.

### 2. Set Up Environment & Run
1. Clone this repository:
   ```bash
   git clone https://github.com/RitikaJain8818/Ritika-event-talks-app.git
   cd Ritika-event-talks-app
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install flask requests feedparser beautifulsoup4
   ```
4. Run the web server:
   ```bash
   python app.py
   ```
5. Navigate to: **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🛠️ Built with
- Python Flask
- Vanilla HTML5 / JavaScript (ES6)
- Pure Vanilla CSS3
- Google Cloud Atom Feed URL: `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`
