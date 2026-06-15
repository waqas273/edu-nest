# EduNest — Map & Recommendation System Technical Guide

This guide provides a professional, high-level technical explanation of the **Interactive Leaflet Map Integration** and the **AI-Powered Hybrid Recommendation Engine** in EduNest. It explains the core algorithms, mathematical formulas, and data structure designs without displaying complex code blocks.

---

## 1. Free Leaflet Map Integration Architecture
EduNest utilizes an open-source mapping architecture built on **Leaflet.js** and **OpenStreetMap (Nominatim)**.

### A. Core Components

*   **LeafletLocationPicker:** Used in the University Manager profile and registration forms. It provides a visual search-as-you-type search bar, click-to-pin, and a device GPS "Use My Location" locator.
*   **LeafletCampusView:** Used on the Student Overview tab inside the University Details page. It shows the campus spot with a customized brand icon, high-end interactive popups, and an external directions launcher.

### B. High-Fidelity Features
*   **Dynamic Theme Toggling:** The map components actively observe theme switches on the root document elements. It instantly switches visual tile sources:
    *   *Light Mode:* Uses CartoDB Voyager light vector tiles.
    *   *Dark Mode:* Uses CartoDB Dark Matter slate tiles.
*   **Zero-Setup Geocoding & Search:** Forward geocoding (search terms to coordinates) and reverse geocoding (pin drops to city names) are powered by the open-source **Nominatim API** without requiring API credentials.
*   **Pulsing Custom SVG Markers:** Instead of using standard Leaflet PNG images—which often break or scramble during Vite production bundles—both maps utilize inline SVG elements wrapped inside Leaflet's divIcon.
*   **Graceful Iframe Fallbacks:** For older university profiles lacking geographic coordinates, the student view falls back to a search-matched Google Maps iframe embed to guarantee zero screen errors.

---

## 2. Dynamic Hybrid Recommendation Engine

The recommendation engine scores and ranks Universities and Academic Programs using a weighted multi-factor scoring formula.

$$\text{Recommendation Score (100 Points)} = \text{Academic Interest (50%)} + \text{Geographical Proximity (30%)} + \text{Review Ratings (20%)} $$

### A. Academic Interest Match (Max 50 Points)
The student's career interest (determined by their AI assessment test) is matched against academic degrees using a semantic keyword matching vocabulary:
*   **Semantic Matching:** If the student's interest is "Computer Science", the engine scans all program titles for related keywords such as *CS, IT, computer, software, coding, systems, networks, AI, database*.
*   **University Scoring:** 
    *   *3 or more matching programs:* **50 Points**
    *   *2 matching programs:* **45 Points**
    *   *1 matching program:* **40 Points**
    *   *0 matching programs:* **0 Points** (Completely filtered out of recommended lists)
*   **Program Scoring:** A program gets **50 Points** if its title matches the keyword vocabulary; otherwise, it gets **0 Points**.

### B. Hybrid Location Proximity (Max 30 Points)
To calculate precise local rankings, the system combines real-time browser GPS tracking with text fallbacks:
1.  **Exact Distance (Active GPS):** The website dynamically requests the student's live device location coordinates from the browser. It calculates the physical distance to the university campus using the mathematical **Haversine Formula**:

    $$\text{Distance } (d) = 2R \times \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
    *(Where R is Earth's spherical radius: 6,371 Kilometers)*

    *   *Distance $\le$ 15 Kilometers:* **30 Points** (Nearest / Immediate area)
    *   *Distance $\le$ 50 Kilometers:* **20 Points** (Close proximity)
    *   *Distance $\le$ 150 Kilometers:* **15 Points** (Moderate distance)
    *   *Distance $>$ 150 Kilometers:* **10 Points** (Far distance)

2.  **City Name Fallback:** If the student blocks location permissions or uses a non-GPS device, the engine falls back to standard text matching:
    *   *University city matches Student home city:* **30 Points**
    *   *University city is outside Student home city:* **10 Points** (Baseline accessibility points)

### C. Review Ratings Strength (Max 20 Points)
Calculates institutional authority from verified student reviews:
*   **Formula:** (Average Review Rating / 5.0) $\times$ 20 Points
*   *5.0 Star average:* **20 Points**
*   *4.0 Star average:* **16 Points**
*   *No reviews yet:* **14 Points** (Neutral, unbiased fallback score)

---

## 3. Firestore Database Integration

The recommendation engine queries and writes to the following Firestore fields:

### A. Students (`users` collection & Browser Geolocation)
*   `interest`: The student's AI-assessed career category.
*   `city`: Home city text (e.g., "Lahore") used for fallback proximity.
*   **Browser Coordinates:** Dynamic real-time Latitude and Longitude retrieved via the `navigator.geolocation` API.

### B. Universities (`users` collection)
*   `latitude` & `longitude`: Decimal coordinate floats captured by LeafletLocationPicker.
*   `city` / `location`: Campus address strings resolved by reverse-geocoding.
*   `calculatedRating`: Numerical average review stars.

### C. Degrees (`degrees` collection)
*   `title`: Name of the academic program.
*   `universityId`: Foreign key linking the degree to its parent university.
