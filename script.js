/* ============================================================
 D A**DA'S RESTAURANT — Admin Panel Logic
 Vanilla JavaScript. No framework.
 ============================================================ */

(function () {
    'use strict';

    /* ==========================================================
     * 1. CONSTANTS
     * ========================================================== */
    const STORAGE_KEY = 'dadasAdminState';
    const THEME_KEY   = 'dadasAdminTheme';
    const MENU_URL    = 'https://dadasrestaurant.example/menu';
    const DAYS        = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Demo base so dashboard + orders page tell one coherent story:
    // 12 seeded orders + 70 earlier today = 82 total.
    const TODAY_ORDERS_BASE = 70;

    /* ==========================================================
     * 2. UTILITIES
     * ========================================================== */
    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    let uidCounter = Date.now();
    const uid = (prefix = 'id') => `${prefix}_${(uidCounter++).toString(36)}`;

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function formatINR(n) {
        const num = Number(n) || 0;
        return '₹' + num.toLocaleString('en-IN');
    }

    function formatNumber(n) {
        return (Number(n) || 0).toLocaleString('en-IN');
    }

    /** Pick readable text colour for any background hex. */
    function contrastColor(hex) {
        if (!hex || typeof hex !== 'string') return '#ffffff';
        let h = hex.replace('#', '').trim();
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (h.length !== 6) return '#ffffff';
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return lum > 0.62 ? '#1c1a17' : '#ffffff';
    }

    /** Generate an inline SVG placeholder for a failed image. */
    function placeholderImage(name, type) {
        const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
        const c1 = type === 'nonveg' ? '#c0392b' : '#2f8f5b';
        const c2 = '#c9a227';
        const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        `<stop offset="0" stop-color="${c1}" stop-opacity="0.16"/>` +
        `<stop offset="1" stop-color="${c2}" stop-opacity="0.22"/>` +
        '</linearGradient></defs>' +
        '<rect width="120" height="120" fill="url(#g)"/>' +
        `<text x="60" y="76" font-family="Georgia,serif" font-size="48" font-weight="700" ` +
        `fill="${c1}" text-anchor="middle" opacity="0.8">${letter}</text></svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    /** Re-initialise Lucide icons after dynamic rendering. */
    function refreshIcons() {
        try {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        } catch (err) {
            /* Silently ignore — icons are decorative. */
        }
    }

    function debounce(fn, wait = 180) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    /* ==========================================================
     * 3. DEFAULT DATA
     * ========================================================== */

    // [name, price, category, type, description, unsplashId]
    const RAW_ITEMS = [
        // ---- Starters (7)
        ['Paneer Tikka', 280, 'Starters', 'veg', 'Char-grilled cottage cheese with peppers and mint chutney.', '1565557623262-b51c2513a641'],
        ['Hara Bhara Kebab', 240, 'Starters', 'veg', 'Spinach and green pea patties, pan-seared till crisp.', '1601050690597-df0568f70950'],
        ['Tandoori Chicken', 380, 'Starters', 'nonveg', 'Half chicken marinated overnight in yoghurt and spices.', '1599487488170-d11ec9c172f0'],
        ['Chicken Seekh Kebab', 340, 'Starters', 'nonveg', 'Minced chicken skewers with fresh coriander and chilli.', '1601050690597-df0568f70950'],
        ['Veg Spring Rolls', 200, 'Starters', 'veg', 'Crispy rolls stuffed with julienned garden vegetables.', '1585032226651-759b368d7246'],
        ['Chilli Paneer', 260, 'Starters', 'veg', 'Wok-tossed paneer with bell peppers in a spicy soy glaze.', '1567188040759-fb8a883dc6d8'],
        ['Fish Amritsari', 360, 'Starters', 'nonveg', 'Gram-flour battered fish with carom seeds and lemon.', '1519708227418-c8fd9a32b7a2'],

        // ---- Main Course (8)
        ['Butter Chicken', 360, 'Main Course', 'nonveg', 'Tandoori chicken simmered in a velvety tomato-butter gravy.', '1588166524941-3bf61a9c41db'],
        ['Dal Makhani', 240, 'Main Course', 'veg', 'Black lentils slow-cooked overnight with cream and butter.', '1546833999-b9f581a1996d'],
        ['Paneer Butter Masala', 300, 'Main Course', 'veg', 'Soft paneer cubes in a rich, mildly sweet tomato gravy.', '1631452180519-c014fe946bc7'],
        ['Kadai Chicken', 340, 'Main Course', 'nonveg', 'Chicken cooked with crushed spices and bell peppers.', '1604908176997-125f25cc6f3d'],
        ['Rogan Josh', 420, 'Main Course', 'nonveg', 'Slow-braised lamb in a Kashmiri red chilli and fennel gravy.', '1546833999-b9f581a1996d'],
        ['Palak Paneer', 280, 'Main Course', 'veg', 'Cottage cheese in a smooth, garlicky spinach gravy.', '1618449840665-9ed506d73a34'],
        ['Mix Veg Curry', 250, 'Main Course', 'veg', 'Seasonal vegetables in a light, aromatic onion-tomato masala.', '1585937421612-70a008356fbe'],
        ['Malai Kofta', 300, 'Main Course', 'veg', 'Paneer dumplings in a creamy cashew and saffron sauce.', '1631452180519-c014fe946bc7'],

        // ---- Breads (5)
        ['Garlic Naan', 80, 'Breads', 'veg', 'Tandoor-baked flatbread brushed with garlic butter.', '1619221882220-947b3d3c8861'],
        ['Butter Naan', 70, 'Breads', 'veg', 'Soft leavened flatbread finished with melted butter.', '1619221882220-947b3d3c8861'],
        ['Tandoori Roti', 40, 'Breads', 'veg', 'Whole-wheat roti baked in the clay oven.', '1565557623262-b51c2513a641'],
        ['Laccha Paratha', 90, 'Breads', 'veg', 'Flaky layered paratha with a crisp golden exterior.', '1601050690597-df0568f70950'],
        ['Stuffed Kulcha', 110, 'Breads', 'veg', 'Amritsari kulcha stuffed with spiced potato and onion.', '1619221882220-947b3d3c8861'],

        // ---- Rice & Biryani (6)
        ['Veg Biryani', 260, 'Rice & Biryani', 'veg', 'Fragrant basmati layered with spiced vegetables and saffron.', '1563379091339-03b21ab4a4f8'],
        ['Chicken Biryani', 320, 'Rice & Biryani', 'nonveg', 'Hyderabadi-style biryani with tender chicken and mint.', '1585937421612-70a008356fbe'],
        ['Mutton Biryani', 420, 'Rice & Biryani', 'nonveg', 'Slow-cooked mutton with long-grain basmati and whole spices.', '1563379091339-03b21ab4a4f8'],
        ['Jeera Rice', 160, 'Rice & Biryani', 'veg', 'Basmati tempered with cumin and a touch of ghee.', '1596797038530-2c107229654b'],
        ['Egg Fried Rice', 220, 'Rice & Biryani', 'nonveg', 'Wok-fried rice with egg, spring onion and soy.', '1603133872878-684f208fb84b'],
        ['Hyderabadi Dum Biryani', 380, 'Rice & Biryani', 'nonveg', 'Sealed-pot dum biryani with saffron and fried onions.', '1585937421612-70a008356fbe'],

        // ---- Chinese (6)
        ['Veg Manchurian', 240, 'Chinese', 'veg', 'Vegetable dumplings in a tangy garlic Manchurian sauce.', '1585032226651-759b368d7246'],
        ['Chilli Chicken', 320, 'Chinese', 'nonveg', 'Crispy chicken tossed with chilli, garlic and spring onion.', '1603133872878-684f208fb84b'],
        ['Hakka Noodles', 220, 'Chinese', 'veg', 'Stir-fried noodles with julienned vegetables.', '1585032226651-759b368d7246'],
        ['Schezwan Fried Rice', 240, 'Chinese', 'veg', 'Spicy schezwan rice with crunchy vegetables.', '1603133872878-684f208fb84b'],
        ['Chicken Manchurian', 340, 'Chinese', 'nonveg', 'Battered chicken in a glossy ginger-garlic sauce.', '1585032226651-759b368d7246'],
        ['Crispy Chilli Potato', 200, 'Chinese', 'veg', 'Honey-chilli glazed potato fingers with sesame.', '1603133872878-684f208fb84b'],

        // ---- Beverages (6)
        ['Cold Coffee', 140, 'Beverages', 'veg', 'Thick blended coffee with ice cream and chocolate.', '1461023058943-07fcbe16d735'],
        ['Masala Chai', 60, 'Beverages', 'veg', 'Assam tea brewed with ginger, cardamom and clove.', '1571934811356-5cc061b6821f'],
        ['Fresh Lime Soda', 100, 'Beverages', 'veg', 'Sparkling lime with a choice of sweet or salted.', '1523677011781-c91d1bbe2f9e'],
        ['Sweet Lassi', 120, 'Beverages', 'veg', 'Chilled yoghurt drink topped with a hint of rose.', '1571934811356-5cc061b6821f'],
        ['Mango Shake', 160, 'Beverages', 'veg', 'Alphonso mango blended with cold milk.', '1546173159-315724a31696'],
        ['Filter Coffee', 80, 'Beverages', 'veg', 'South Indian filter decoction with frothed milk.', '1461023058943-07fcbe16d735'],

        // ---- Desserts (5)
        ['Gulab Jamun', 100, 'Desserts', 'veg', 'Warm milk dumplings soaked in cardamom sugar syrup.', '1601303516534-bf0e5f5e5a4d'],
        ['Chocolate Brownie', 180, 'Desserts', 'veg', 'Fudgy brownie served warm with vanilla ice cream.', '1606313564200-e75d5e30476c'],
        ['Rasmalai', 130, 'Desserts', 'veg', 'Saffron milk with soft cottage-cheese discs and pistachio.', '1601303516534-bf0e5f5e5a4d'],
        ['Gajar Ka Halwa', 140, 'Desserts', 'veg', 'Slow-cooked carrot pudding with ghee and almonds.', '1606313564200-e75d5e30476c'],
        ['Ice Cream Sundae', 160, 'Desserts', 'veg', 'Three scoops with chocolate sauce and roasted nuts.', '1567206563064-6f60f40a2b57'],

        // ---- Mocktails (5)
        ['Virgin Mojito', 180, 'Mocktails', 'veg', 'Mint, lime and soda over crushed ice.', '1523677011781-c91d1bbe2f9e'],
        ['Blue Lagoon', 190, 'Mocktails', 'veg', 'Blue curaçao syrup, lemon and sparkling water.', '1546173159-315724a31696'],
        ['Watermelon Cooler', 170, 'Mocktails', 'veg', 'Fresh watermelon with basil and a squeeze of lime.', '1523677011781-c91d1bbe2f9e'],
        ['Cranberry Spritzer', 200, 'Mocktails', 'veg', 'Cranberry juice with soda and a rosemary sprig.', '1546173159-315724a31696'],
        ['Passion Fruit Punch', 210, 'Mocktails', 'veg', 'Passion fruit, orange and pineapple over ice.', '1523677011781-c91d1bbe2f9e']
    ];

    const CATEGORY_ORDER = [
        'Starters', 'Main Course', 'Breads', 'Rice & Biryani',
        'Chinese', 'Beverages', 'Desserts', 'Mocktails'
    ];

    function buildMenuFromRaw() {
        return RAW_ITEMS.map((row, i) => {
            const [name, price, category, type, description, photoId] = row;
            // A few items intentionally marked unavailable for a realistic demo.
            const unavailable = ['Fish Amritsari', 'Mutton Biryani', 'Rogan Josh', 'Passion Fruit Punch'].includes(name);
            return {
                id: 'item_' + (i + 1),
                             name,
                             description,
                             price,
                             category,
                             type,
                             image: `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=200&h=200&q=70`,
                             available: !unavailable
            };
        });
    }

    function buildCategories() {
        return CATEGORY_ORDER.map((name, i) => ({
            id: 'cat_' + (i + 1),
                                                name,
                                                status: 'Active'
        }));
    }

    const DEFAULT_ORDERS = [
        { id: '#1024', customer: 'Rahul Sharma',  items: 2, amount: 620, status: 'Completed', time: '8:42 PM' },
        { id: '#1023', customer: 'Priya Verma',   items: 3, amount: 840, status: 'Completed', time: '8:28 PM' },
        { id: '#1022', customer: 'Arjun Nair',    items: 1, amount: 280, status: 'Pending',   time: '8:15 PM' },
        { id: '#1021', customer: 'Sneha Kapoor',  items: 4, amount: 1120, status: 'Completed', time: '7:58 PM' },
        { id: '#1020', customer: 'Vikram Singh',  items: 2, amount: 480, status: 'Cancelled', time: '7:41 PM' },
        { id: '#1019', customer: 'Ananya Iyer',   items: 3, amount: 760, status: 'Completed', time: '7:22 PM' },
        { id: '#1018', customer: 'Karan Mehta',   items: 5, amount: 1340, status: 'Pending',  time: '7:05 PM' },
        { id: '#1017', customer: 'Riya Das',      items: 2, amount: 520, status: 'Completed', time: '6:48 PM' },
        { id: '#1016', customer: 'Mohit Agarwal', items: 1, amount: 240, status: 'Completed', time: '6:30 PM' },
        { id: '#1015', customer: 'Neha Joshi',    items: 3, amount: 690, status: 'Cancelled', time: '6:12 PM' },
        { id: '#1014', customer: 'Siddharth Rao', items: 2, amount: 580, status: 'Completed', time: '5:55 PM' },
        { id: '#1013', customer: 'Tanvi Bhatia',  items: 4, amount: 980, status: 'Completed', time: '5:34 PM' }
    ];

    const DEFAULT_CUSTOMERS = [
        { name: 'Rahul Sharma',   visits: 12, last: 'Today',      fav: 'Paneer Tikka' },
        { name: 'Priya Verma',    visits: 8,  last: 'Yesterday',  fav: 'Veg Biryani' },
        { name: 'Arjun Nair',     visits: 15, last: 'Today',      fav: 'Butter Chicken' },
        { name: 'Sneha Kapoor',   visits: 6,  last: '2 days ago', fav: 'Dal Makhani' },
        { name: 'Vikram Singh',   visits: 11, last: 'Yesterday',  fav: 'Chicken Biryani' },
        { name: 'Ananya Iyer',    visits: 4,  last: '3 days ago', fav: 'Masala Dosa' },
        { name: 'Karan Mehta',    visits: 9,  last: 'Today',      fav: 'Garlic Naan' },
        { name: 'Riya Das',       visits: 7,  last: 'Yesterday',  fav: 'Chilli Paneer' },
        { name: 'Mohit Agarwal',  visits: 3,  last: '5 days ago', fav: 'Cold Coffee' },
        { name: 'Neha Joshi',     visits: 10, last: 'Today',      fav: 'Gulab Jamun' }
    ];

    const DEFAULT_ACTIVITY = [
        { text: 'Paneer Tikka updated',                 time: '2 min ago',  icon: 'pencil' },
        { text: 'New category "Mocktails" added',       time: '18 min ago', icon: 'folder-plus' },
        { text: 'QR Menu scanned 124 times today',      time: '1 hour ago', icon: 'qr-code' },
        { text: 'Butter Chicken marked unavailable',    time: '3 hours ago', icon: 'alert-circle' },
        { text: 'Restaurant profile updated',           time: 'Yesterday',  icon: 'store' }
    ];

    function defaultState() {
        return {
            menu: buildMenuFromRaw(),
 categories: buildCategories(),
 orders: DEFAULT_ORDERS.slice(),
 customers: DEFAULT_CUSTOMERS.slice(),
 activity: DEFAULT_ACTIVITY.slice(),
 scans: {
     week: [148, 172, 139, 186, 214, 245, 180],
 prev: [131, 158, 149, 162, 191, 208, 165]
 },
 views: {
     week: [112, 138, 106, 149, 172, 198, 147],
 prev: [98, 121, 114, 130, 154, 167, 132]
 },
 categoryViews: [
     { name: 'Main Course',    value: 386 },
 { name: 'Starters',       value: 312 },
 { name: 'Rice & Biryani', value: 248 },
 { name: 'Breads',         value: 186 },
 { name: 'Chinese',        value: 154 },
 { name: 'Beverages',      value: 132 },
 { name: 'Desserts',       value: 96 },
 { name: 'Mocktails',      value: 74 }
 ],
 qr: {
     size: 220,
 logo: 'dark',
 name: "DADA'S RESTAURANT",
 border: true
 },
 settings: {
     name: "DADA'S",
 tagline: 'Restaurant & Café',
 phone: '+91 98765 43210',
 email: 'hello@dadas.example',
 address: 'Main Market, India',
 days: 'Monday - Sunday',
 hours: '11:00 AM - 11:00 PM',
 instagram: '@dadasrestaurant',
 facebook: '/dadasrestaurant',
 logo: 'D',
 primary: '#1c1a17',
 accent: '#c9a227'
 }
        };
    }

    /* ==========================================================
     * 4. STATE + STORAGE
     * ========================================================== */
    let state = null;

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.menu)) {
                    // Merge with defaults so new keys never break older saves.
                    return Object.assign(defaultState(), parsed, {
                        qr: Object.assign(defaultState().qr, parsed.qr || {}),
                                         settings: Object.assign(defaultState().settings, parsed.settings || {})
                    });
                }
            }
        } catch (err) {
            console.warn('Could not read saved state, loading defaults.', err);
        }
        return defaultState();
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn('Could not persist state.', err);
        }
    }

    function resetState() {
        state = defaultState();
        saveState();
    }

    /* ==========================================================
     * 5. TOASTS
     * ========================================================== */
    const TOAST_ICONS = {
        success: 'check-circle',
 info: 'info',
 warning: 'alert-triangle',
 error: 'x-circle'
    };

    function showToast(message, type = 'success') {
        const host = $('#toasts');
        if (!host) return;

        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.setAttribute('role', 'status');
        el.innerHTML =
        `<span class="toast-icon"><i data-lucide="${TOAST_ICONS[type] || 'check-circle'}"></i></span>` +
        `<span class="toast-msg">${escapeHtml(message)}</span>` +
        `<button class="toast-close" type="button" aria-label="Dismiss notification"><i data-lucide="x"></i></button>`;

        host.appendChild(el);
        refreshIcons();

        requestAnimationFrame(() => el.classList.add('show'));

        const remove = () => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        };

        const timer = setTimeout(remove, 3400);
        el.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timer);
            remove();
        });
    }

    /* ==========================================================
     * 6. MODALS
     * ========================================================== */
    let lastFocusedElement = null;

    function openModal(target) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el) return;

        // Close any other open modal first
        $$('.modal.open').forEach(m => { if (m !== el) closeModal(m, true); });

        lastFocusedElement = document.activeElement;
        el.hidden = false;
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            el.classList.add('open');
            const focusable = el.querySelector('input:not([type="hidden"]), select, textarea, button');
            if (focusable) setTimeout(() => focusable.focus(), 120);
        });
    }

    function closeModal(target, immediate = false) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el || el.hidden) return;

        el.classList.remove('open');
        const finish = () => {
            el.hidden = true;
            if (!$$('.modal.open').length) document.body.style.overflow = '';
        };

            if (immediate) finish();
            else setTimeout(finish, 240);

            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus({ preventScroll: true });
                lastFocusedElement = null;
            }
    }

    function closeAllModals() {
        $$('.modal').forEach(m => closeModal(m, true));
        document.body.style.overflow = '';
    }

    /* Confirm modal helper */
    let confirmCallback = null;

    function openConfirm({ title, message, okLabel = 'Delete', okClass = 'btn-danger' }, onConfirm) {
        $('#confirmTitle').textContent = title;
        $('#confirmMessage').textContent = message;

        const okBtn = $('#confirmOk');
        okBtn.textContent = okLabel;
        okBtn.className = 'btn ' + okClass;

        confirmCallback = onConfirm;
        openModal('confirmModal');
    }

    /* ==========================================================
     * 7. THEME
     * ========================================================== */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }

        const btn = $('#themeToggle');
        if (btn) {
            const icon = btn.querySelector('i, svg');
            if (icon) {
                const name = theme === 'dark' ? 'sun' : 'moon';
                icon.setAttribute('data-lucide', name);
                // Recreate the icon element so Lucide re-renders correctly
                const fresh = document.createElement('i');
                fresh.setAttribute('data-lucide', name);
                btn.replaceChild(fresh, icon);
            }
        }
        refreshIcons();
        // Charts use CSS vars for colour; re-render on theme flip.
        renderVisibleCharts();
    }

    function initTheme() {
        let stored = null;
        try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(stored || (prefersDark ? 'dark' : 'light'));
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    /* ==========================================================
     * 8. NAVIGATION
     * ========================================================== */
    const PAGE_META = {
        dashboard:  { title: 'Dashboard',  subtitle: 'Overview of your restaurant' },
 menu:       { title: 'Menu',       subtitle: "Manage your restaurant's digital menu" },
 categories: { title: 'Categories', subtitle: 'Organise your dishes into groups' },
 qr:         { title: 'QR Menu',    subtitle: 'Share your digital menu with guests' },
 orders:     { title: 'Orders',     subtitle: 'Track incoming and completed orders' },
 analytics:  { title: 'Analytics',  subtitle: 'Understand how guests browse your menu' },
 customers:  { title: 'Customers',  subtitle: 'Guests who interacted with your menu' },
 settings:   { title: 'Settings',   subtitle: 'Restaurant profile and preferences' }
    };

    let currentPage = 'dashboard';

    function navigateTo(page) {
        if (!PAGE_META[page]) page = 'dashboard';
        currentPage = page;

        // Swap visible section
        $$('.page').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');

        // Update sidebar active state
        $$('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });

        // Update heading
        const meta = PAGE_META[page];
        const titleEl = $('#pageTitle');
        const subEl = $('#pageSubtitle');
        if (titleEl) titleEl.textContent = meta.title;
        if (subEl) subEl.textContent = meta.subtitle;

        // Lazy render page content
        renderPage(page);

        // Close mobile sidebar
        closeSidebar();

        // Scroll content to top
        const content = $('#content');
        if (content) content.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderPage(page) {
        switch (page) {
            case 'dashboard':  renderDashboard(); break;
            case 'menu':       renderMenu(); break;
            case 'categories': renderCategories(); break;
            case 'qr':         renderQRPage(); break;
            case 'orders':     renderOrders(); break;
            case 'analytics':  renderAnalytics(); break;
            case 'customers':  renderCustomers(); break;
            case 'settings':   renderSettings(); break;
            default: break;
        }
        refreshIcons();
    }

    function renderVisibleCharts() {
        if (currentPage === 'dashboard') renderScanChart();
        if (currentPage === 'analytics') { renderTrafficChart(); renderCategoryChart(); }
    }

    /* ==========================================================
     * 9. SIDEBAR (mobile)
     * ========================================================== */
    function openSidebar() {
        const sidebar = $('#sidebar');
        const backdrop = $('#sidebarBackdrop');
        if (!sidebar) return;
        sidebar.classList.add('open');
        if (backdrop) {
            backdrop.hidden = false;
            requestAnimationFrame(() => backdrop.classList.add('show'));
        }
    }

    function closeSidebar() {
        const sidebar = $('#sidebar');
        const backdrop = $('#sidebarBackdrop');
        if (!sidebar) return;
        sidebar.classList.remove('open');
        if (backdrop) {
            backdrop.classList.remove('show');
            setTimeout(() => { backdrop.hidden = true; }, 240);
        }
    }

    /* ==========================================================
     * 10. DASHBOARD
     * ========================================================== */
    function totalScans(range = 'week') {
        const arr = state.scans[range] || state.scans.week;
        return arr.reduce((a, b) => a + b, 0);
    }

    function todaysOrders() {
        return state.orders.length + TODAY_ORDERS_BASE;
    }

    function updateGreeting() {
        const el = $('#dashHeading');
        if (!el) return;
        const h = new Date().getHours();
        const part = h < 12 ? 'morning' : (h < 17 ? 'afternoon' : 'evening');
        const name = (state.settings.name || "Dada's").replace(/'$/, "'s");
        el.textContent = `Good ${part}, ${name} 👋`;
    }

    function renderDashboard() {
        updateGreeting();
        renderStatCards();
        renderActivity();
        renderScanChart();
    }

    function renderStatCards() {
        const host = $('#statGrid');
        if (!host) return;

        const total     = state.menu.length;
        const active    = state.menu.filter(i => i.available).length;
        const cats      = state.categories.length;
        const scans     = totalScans('week');
        const orders    = todaysOrders();

        const cards = [
            { label: 'Total Menu Items', value: total,  icon: 'book-open',     tone: 'gold',  trend: 12.5, note: 'vs last month' },
            { label: 'Active Items',     value: active, icon: 'check-circle',  tone: 'green', trend: 8.2,  note: 'currently available' },
            { label: 'Categories',       value: cats,   icon: 'layers',        tone: 'blue',  trend: 18.4, note: 'menu groups' },
            { label: 'QR Scans',         value: formatNumber(scans), icon: 'qr-code', tone: 'amber', trend: 14.7, note: 'this week' },
 { label: "Today's Orders",   value: orders, icon: 'receipt-text',  tone: 'gold',  trend: 9.3,  note: 'since midnight' }
        ];

        host.innerHTML = cards.map(c => `
        <article class="stat-card">
        <div class="stat-top">
        <span class="stat-label">${escapeHtml(c.label)}</span>
        <span class="stat-icon ${c.tone}"><i data-lucide="${c.icon}"></i></span>
        </div>
        <div class="stat-value">${typeof c.value === 'number' ? formatNumber(c.value) : c.value}</div>
        <div class="stat-foot">
        <span class="trend ${c.trend >= 0 ? 'up' : 'down'}">
        <i data-lucide="${c.trend >= 0 ? 'trending-up' : 'trending-down'}"></i>
        ${c.trend >= 0 ? '+' : ''}${c.trend}%
        </span>
        <span>${escapeHtml(c.note)}</span>
        </div>
        </article>
        `).join('');

        refreshIcons();
    }

    function renderActivity() {
        const host = $('#activityList');
        if (!host) return;

        if (!state.activity.length) {
            host.innerHTML = '<li class="muted-sm">No recent activity.</li>';
            return;
        }

        host.innerHTML = state.activity.map(a => `
        <li>
        <span class="activity-icon"><i data-lucide="${a.icon || 'check'}"></i></span>
        <div>
        <p>${escapeHtml(a.text)}</p>
        <small>${escapeHtml(a.time)}</small>
        </div>
        </li>
        `).join('');

        refreshIcons();
    }

    /* ----------------------------------------------------------
     * Chart: QR scans bar chart (dashboard)
     * Bars animate via attribute transitions (staggered per day).
     * ---------------------------------------------------------- */
    function renderScanChart() {
        const host = $('#scanChart');
        if (!host) return;

        const range = ($('#chartRange') && $('#chartRange').value) || 'week';
        const data = state.scans[range] || state.scans.week;

        const W = Math.max(host.clientWidth || 600, 320);
        const H = 260;
        const pad = { top: 18, right: 14, bottom: 36, left: 44 };
        const innerW = W - pad.left - pad.right;
        const innerH = H - pad.top - pad.bottom;
        const max = Math.max(...data, 1) * 1.15;

        const slot = innerW / data.length;
        const barW = Math.min(38, slot * 0.46);
        const baseY = pad.top + innerH;

        let gridLines = '';
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (innerH / 4) * i;
            const val = Math.round(max - (max / 4) * i);
            gridLines += `<line class="grid-line" x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}"/>`;
            gridLines += `<text class="axis-label" x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${val}</text>`;
        }

        let bars = '';
        data.forEach((value, i) => {
            const h = Math.max((value / max) * innerH, 4);
            const x = pad.left + slot * i + (slot - barW) / 2;
            const y = pad.top + innerH - h;

            bars += `
            <g class="bar-group">
            <rect class="bar-bg" x="${x}" y="${pad.top}" width="${barW}" height="${innerH}" rx="7"/>
            <rect class="bar" x="${x}" y="${y}" width="${barW}" height="${h}" rx="7">
            <title>${DAYS[i]}: ${value} scans</title>
            </rect>
            <text class="axis-label" x="${x + barW / 2}" y="${H - 12}" text-anchor="middle">${DAYS[i]}</text>
            </g>`;
        });

        host.innerHTML = `
        <svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
        aria-label="QR menu scans for the last 7 days">
        <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="1"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.55"/>
        </linearGradient>
        </defs>
        ${gridLines}
        ${bars}
        </svg>`;

        // Animate the bars growing from the baseline, staggered per day.
        requestAnimationFrame(() => {
            const rects = host.querySelectorAll('.bar');
            rects.forEach((rect, i) => {
                const fullHeight = parseFloat(rect.getAttribute('height'));
                const yTop = parseFloat(rect.getAttribute('y'));
                rect.setAttribute('y', baseY);
                rect.setAttribute('height', 0);
                setTimeout(() => {
                    rect.style.transition = 'y .65s cubic-bezier(.22,.8,.3,1), height .65s cubic-bezier(.22,.8,.3,1)';
                    rect.setAttribute('y', yTop);
                    rect.setAttribute('height', fullHeight);
                }, 40 + i * 55);
            });
        });

        const totalEl = $('#chartTotal');
        if (totalEl) totalEl.textContent = formatNumber(data.reduce((a, b) => a + b, 0));
    }

    /* ==========================================================
     * 11. MENU PAGE
     * ========================================================== */
    let menuFilters = {
        search: '',
        chip: 'all',
        category: 'all'
    };

    function getFilteredMenu() {
        const q = menuFilters.search.trim().toLowerCase();

        return state.menu.filter(item => {
            // Search
            if (q) {
                const hay = `${item.name} ${item.category} ${item.description || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }

            // Category filter
            if (menuFilters.category !== 'all' && item.category !== menuFilters.category) return false;

            // Chip filter
            switch (menuFilters.chip) {
                case 'available':   return item.available === true;
                case 'unavailable': return item.available === false;
                case 'veg':         return item.type === 'veg';
                case 'nonveg':      return item.type === 'nonveg';
                default:            return true;
            }
        });
    }

    function renderMenu() {
        renderMenuCategoryFilter();
        renderMenuRows();
        refreshIcons();
    }

    function renderMenuCategoryFilter() {
        const sel = $('#menuCategoryFilter');
        if (!sel) return;

        const current = sel.value || 'all';
        const options = ['<option value="all">All categories</option>']
        .concat(state.categories.map(c =>
        `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`));

        sel.innerHTML = options.join('');
        sel.value = state.categories.some(c => c.name === current) ? current : 'all';
        menuFilters.category = sel.value;
    }

    function renderMenuRows() {
        const body = $('#menuBody');
        const empty = $('#menuEmpty');
        const table = $('#menuTable');
        if (!body) return;

        const items = getFilteredMenu();

        if (!items.length) {
            body.innerHTML = '';
            if (table) table.style.display = 'none';
            if (empty) empty.hidden = false;
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.hidden = true;

        body.innerHTML = items.map(item => `
        <tr data-id="${item.id}">
        <td>
        <div class="item-cell">
        <img class="item-thumb"
        src="${escapeHtml(item.image)}"
        alt="${escapeHtml(item.name)}"
        loading="lazy"
        data-name="${escapeHtml(item.name)}"
        data-type="${item.type}">
        <div class="item-meta">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.description || '')}</small>
        </div>
        </div>
        </td>
        <td>${escapeHtml(item.category)}</td>
        <td class="price">${formatINR(item.price)}</td>
        <td>
        <span class="type-badge">
        <i class="dotmark ${item.type === 'nonveg' ? 'nonveg' : 'veg'}"></i>
        ${item.type === 'nonveg' ? 'Non-Veg' : 'Veg'}
        </span>
        </td>
        <td>
        <button class="avail-toggle ${item.available ? '' : 'off'}"
        type="button"
        data-action="toggle-availability"
        data-id="${item.id}"
        aria-pressed="${item.available}"
        aria-label="Toggle availability for ${escapeHtml(item.name)}">
        <span class="dot"></span>
        ${item.available ? 'Available' : 'Unavailable'}
        </button>
        </td>
        <td class="ta-right">
        <div class="row-actions">
        <button class="row-btn" type="button" data-action="edit-item" data-id="${item.id}"
        aria-label="Edit ${escapeHtml(item.name)}" title="Edit">
        <i data-lucide="pencil"></i>
        </button>
        <button class="row-btn danger" type="button" data-action="delete-item" data-id="${item.id}"
        aria-label="Delete ${escapeHtml(item.name)}" title="Delete">
        <i data-lucide="trash-2"></i>
        </button>
        </div>
        </td>
        </tr>
        `).join('');

        refreshIcons();
    }

    /* ----------------------------------------------------------
     * Item modal — add / edit
     * ---------------------------------------------------------- */
    function populateItemCategorySelect(selectedName) {
        const sel = $('#itemCategory');
        if (!sel) return;
        if (!state.categories.length) {
            sel.innerHTML = '<option value="">No categories yet — add one first</option>';
            return;
        }
        sel.innerHTML = state.categories
        .map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`)
        .join('');
        if (selectedName && state.categories.some(c => c.name === selectedName)) {
            sel.value = selectedName;
        }
    }

    function setSwitch(el, on) {
        if (!el) return;
        el.classList.toggle('on', !!on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
    }

    function isSwitchOn(el) {
        return el ? el.classList.contains('on') : false;
    }

    function clearItemFormErrors() {
        ['#itemName', '#itemPrice', '#itemCategory'].forEach(sel => {
            const el = $(sel);
            if (el) el.classList.remove('invalid');
        });
            $$('#itemForm .field-error').forEach(e => e.remove());
    }

    function openItemModal(item) {
        const form = $('#itemForm');
        if (!form) return;
        form.reset();
        clearItemFormErrors();

        const isEdit = !!item;
        $('#itemModalTitle').textContent = isEdit ? 'Edit Menu Item' : 'Add Menu Item';
        $('#itemSubmitBtn').textContent = isEdit ? 'Save Changes' : 'Add Item';

        populateItemCategorySelect(item ? item.category : state.categories[0] && state.categories[0].name);

        $('#itemId').value    = item ? item.id : '';
        $('#itemName').value  = item ? item.name : '';
        $('#itemDesc').value  = item ? (item.description || '') : '';
        $('#itemPrice').value = item ? item.price : '';
        $('#itemImage').value = item ? (item.image || '') : '';

        const typeRadio = form.querySelector(`input[name="type"][value="${item ? item.type : 'veg'}"]`);
        if (typeRadio) typeRadio.checked = true;

        setSwitch($('#itemAvailable'), item ? item.available : true);

        openModal('itemModal');
    }

    function validateItemForm() {
        let ok = true;
        clearItemFormErrors();

        const nameEl  = $('#itemName');
        const priceEl = $('#itemPrice');
        const catEl   = $('#itemCategory');

        const addError = (el, message) => {
            if (!el) return;
            el.classList.add('invalid');
            const err = document.createElement('span');
            err.className = 'field-error';
            err.textContent = message;
            el.parentElement.appendChild(err);
        };

        if (!nameEl.value.trim()) { addError(nameEl, 'Item name is required.'); ok = false; }

        const price = Number(priceEl.value);
        if (!priceEl.value || isNaN(price) || price <= 0) {
            addError(priceEl, 'Enter a valid price greater than 0.');
            ok = false;
        }

        if (!catEl.value) { addError(catEl, 'Please choose a category.'); ok = false; }

        return ok;
    }

    function handleItemSubmit(event) {
        event.preventDefault();
        if (!validateItemForm()) {
            showToast('Please fix the highlighted fields.', 'error');
            return;
        }

        const id = $('#itemId').value;
        const isEdit = !!id;

        const typeRadio = document.querySelector('#itemForm input[name="type"]:checked');
        const payload = {
            name: $('#itemName').value.trim(),
 description: $('#itemDesc').value.trim(),
 price: Number($('#itemPrice').value),
 category: $('#itemCategory').value,
 type: typeRadio ? typeRadio.value : 'veg',
 image: $('#itemImage').value.trim(),
 available: isSwitchOn($('#itemAvailable'))
        };

        // Fall back to a generated placeholder if no image URL supplied
        if (!payload.image) {
            payload.image = placeholderImage(payload.name, payload.type);
        }

        if (isEdit) {
            const idx = state.menu.findIndex(i => i.id === id);
            if (idx > -1) {
                state.menu[idx] = Object.assign({}, state.menu[idx], payload);
                pushActivity(`${payload.name} updated`, 'pencil');
                showToast('Menu item updated successfully');
            }
        } else {
            state.menu.unshift(Object.assign({ id: uid('item') }, payload));
            pushActivity(`New menu item "${payload.name}" added`, 'plus-circle');
            showToast('Menu item added successfully');
        }

        saveState();
        closeModal('itemModal');
        renderMenu();
        if (currentPage === 'dashboard') renderDashboard();
        refreshIcons();
    }

    /* ----------------------------------------------------------
     * Delete item
     * ---------------------------------------------------------- */
    function requestDeleteItem(id) {
        const item = state.menu.find(i => i.id === id);
        if (!item) return;

        openConfirm(
            {
                title: 'Delete this menu item?',
                message: `Are you sure you want to remove "${item.name}" from your menu? This cannot be undone.`,
                okLabel: 'Delete',
                okClass: 'btn-danger'
            },
            () => {
                state.menu = state.menu.filter(i => i.id !== id);
                pushActivity(`${item.name} deleted`, 'trash-2');
                saveState();
                renderMenu();
                if (currentPage === 'dashboard') renderDashboard();
                if (currentPage === 'categories') renderCategories();
                showToast('Menu item deleted');
            }
        );
    }

    /* ----------------------------------------------------------
     * Availability toggle
     * ---------------------------------------------------------- */
    function toggleAvailability(id) {
        const item = state.menu.find(i => i.id === id);
        if (!item) return;

        item.available = !item.available;

        const label = item.available ? 'Available' : 'Unavailable';
        showToast(`${item.name} marked ${label}`, item.available ? 'success' : 'warning');

        pushActivity(`${item.name} marked ${label.toLowerCase()}`, item.available ? 'check-circle' : 'alert-circle');
        saveState();

        renderMenu();
        if (currentPage === 'dashboard') renderDashboard();
    }

    function pushActivity(text, icon) {
        state.activity.unshift({ text, time: 'Just now', icon: icon || 'check' });
        state.activity = state.activity.slice(0, 8);
    }

    /* ==========================================================
     * 12. CATEGORIES
     * ========================================================== */
    function countItemsInCategory(name) {
        return state.menu.filter(i => i.category === name).length;
    }

    function renderCategories() {
        const body = $('#catBody');
        const empty = $('#catEmpty');
        const table = $('#catTable');
        if (!body) return;

        if (!state.categories.length) {
            body.innerHTML = '';
            if (table) table.style.display = 'none';
            if (empty) empty.hidden = false;
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.hidden = true;

        body.innerHTML = state.categories.map(cat => `
        <tr data-id="${cat.id}">
        <td>
        <div class="item-meta">
        <strong>${escapeHtml(cat.name)}</strong>
        <small>Menu group</small>
        </div>
        </td>
        <td><span class="count-pill">${countItemsInCategory(cat.name)}</span></td>
        <td><span class="cat-status ${cat.status === 'Hidden' ? 'Hidden' : ''}">${escapeHtml(cat.status || 'Active')}</span></td>
        <td class="ta-right">
        <div class="row-actions">
        <button class="row-btn" type="button" data-action="edit-category" data-id="${cat.id}"
        aria-label="Edit ${escapeHtml(cat.name)}" title="Edit">
        <i data-lucide="pencil"></i>
        </button>
        <button class="row-btn danger" type="button" data-action="delete-category" data-id="${cat.id}"
        aria-label="Delete ${escapeHtml(cat.name)}" title="Delete">
        <i data-lucide="trash-2"></i>
        </button>
        </div>
        </td>
        </tr>
        `).join('');

        refreshIcons();
    }

    function openCategoryModal(cat) {
        const form = $('#categoryForm');
        if (!form) return;
        form.reset();

        const isEdit = !!cat;
        $('#categoryModalTitle').textContent = isEdit ? 'Edit Category' : 'Add Category';
        $('#categorySubmitBtn').textContent = isEdit ? 'Save Changes' : 'Add Category';

        $('#categoryId').value = cat ? cat.id : '';
        $('#categoryName').value = cat ? cat.name : '';
        $('#categoryStatus').value = cat ? (cat.status || 'Active') : 'Active';

        openModal('categoryModal');
    }

    function handleCategorySubmit(event) {
        event.preventDefault();

        const nameEl = $('#categoryName');
        const name = nameEl.value.trim();

        if (!name) {
            nameEl.classList.add('invalid');
            showToast('Category name is required.', 'error');
            return;
        }

        // Duplicate check
        const id = $('#categoryId').value;
        const duplicate = state.categories.some(c =>
        c.name.toLowerCase() === name.toLowerCase() && c.id !== id);

        if (duplicate) {
            nameEl.classList.add('invalid');
            showToast('A category with that name already exists.', 'error');
            return;
        }

        const status = $('#categoryStatus').value;

        if (id) {
            const cat = state.categories.find(c => c.id === id);
            if (cat) {
                const oldName = cat.name;
                cat.name = name;
                cat.status = status;
                // Rename references in menu items
                if (oldName !== name) {
                    state.menu.forEach(item => {
                        if (item.category === oldName) item.category = name;
                    });
                }
                showToast('Category updated');
            }
        } else {
            state.categories.push({ id: uid('cat'), name, status });
            showToast('Category added successfully');
        }

        saveState();
        closeModal('categoryModal');
        renderCategories();
        renderMenuCategoryFilter();
        refreshIcons();
    }

    function requestDeleteCategory(id) {
        const cat = state.categories.find(c => c.id === id);
        if (!cat) return;

        const count = countItemsInCategory(cat.name);

        if (count > 0) {
            openConfirm(
                {
                    title: 'Category is not empty',
                    message: `"${cat.name}" still contains ${count} menu item${count === 1 ? '' : 's'}. Please move or delete those items before removing this category.`,
                    okLabel: 'Got it',
                    okClass: 'btn-primary'
                },
                () => { /* nothing to do — informative only */ }
            );
            return;
        }

        openConfirm(
            {
                title: 'Delete this category?',
                message: `Are you sure you want to remove "${cat.name}" from your menu structure?`,
                okLabel: 'Delete',
                okClass: 'btn-danger'
            },
            () => {
                state.categories = state.categories.filter(c => c.id !== id);
                saveState();
                renderCategories();
                renderMenuCategoryFilter();
                showToast('Category deleted');
            }
        );
    }

    /* ==========================================================
     * 13. QR PAGE
     * ========================================================== */
    function renderQRPage() {
        // Sync controls with saved state
        const sizeSel = $('#qrSize');
        const logoSel = $('#qrLogoSelect');
        const nameInput = $('#qrRestaurantName');
        const borderSwitch = $('#qrBorder');

        if (sizeSel) sizeSel.value = String(state.qr.size);
        if (logoSel) logoSel.value = state.qr.logo;
        if (nameInput) nameInput.value = state.qr.name;
        setSwitch(borderSwitch, state.qr.border);

        const frame = $('#qrFrame');
        if (frame) frame.classList.toggle('bordered', !!state.qr.border);

        const brandEl = document.querySelector('.qr-brand');
        if (brandEl) brandEl.textContent = state.qr.name;

        const logoEl = $('#qrLogo');
        if (logoEl) {
            if (state.qr.logo === 'none') {
                logoEl.hidden = true;
            } else {
                logoEl.hidden = false;
                logoEl.textContent = (state.settings.logo || 'D').charAt(0);
                logoEl.classList.toggle('gold', state.qr.logo === 'gold');
            }
        }

        generateQRCode();
    }

    function generateQRCode() {
        const target = $('#qrTarget');
        if (!target) return;

        if (!window.QRCode) {
            target.innerHTML =
            '<div style="width:220px;height:220px;display:grid;place-items:center;' +
            'background:var(--surface-2);border-radius:12px;font-size:12px;color:var(--muted);' +
            'text-align:center;padding:16px;">QR preview unavailable</div>';
        return;
        }

        const size = Number(state.qr.size) || 220;

        try {
            target.innerHTML = '';
            new window.QRCode(target, {
                text: MENU_URL,
                width: size,
                height: size,
                colorDark: '#1c1a17',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel.H
            });

            // Preserve size across renders
            const canvas = target.querySelector('canvas');
            if (canvas) {
                canvas.style.width = size + 'px';
                canvas.style.height = size + 'px';
            }
        } catch (err) {
            console.warn('QR generation failed', err);
            target.innerHTML =
            '<div style="width:220px;height:220px;display:grid;place-items:center;' +
            'background:var(--surface-2);border-radius:12px;font-size:12px;color:var(--muted);' +
            'text-align:center;padding:16px;">QR preview unavailable</div>';
        }
    }

    function copyMenuLink() {
        const text = MENU_URL;

        const fallback = () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('QR link copied');
            } catch (err) {
                showToast('Could not copy the link.', 'error');
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
            .then(() => showToast('QR link copied'))
            .catch(fallback);
        } else {
            fallback();
        }
    }

    function downloadQRCode() {
        const target = $('#qrTarget');
        if (!target) return;

        const canvas = target.querySelector('canvas');
        if (!canvas) {
            showToast('QR code is not ready yet.', 'warning');
            return;
        }

        try {
            const link = document.createElement('a');
            link.download = 'dadas-menu-qr.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('QR code downloaded');
        } catch (err) {
            showToast('Could not download the QR code.', 'error');
        }
    }

    function openMenuPreview() {
        const host = $('#phoneMenu');
        if (!host) return;

        // Sync phone header branding with current settings
        const brandEl = $('#phoneBrand');
        const subEl = $('#phoneSub');
        if (brandEl) brandEl.textContent = (state.settings.name || "DADA'S").toUpperCase();
        if (subEl) subEl.textContent = state.settings.tagline || 'Restaurant & Café';

        // Group ALL items by category — unavailable items appear dimmed with a
        // "Sold out" tag so the preview mirrors a real guest-facing menu.
        const grouped = {};
        state.categories.forEach(c => { grouped[c.name] = []; });
        state.menu.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });

        let html = '';
        Object.keys(grouped).forEach(cat => {
            const items = grouped[cat];
            if (!items.length) return;

            html += `<div class="phone-cat"><span>${escapeHtml(cat)}</span>` +
            `<span class="phone-cat-count">${items.length} item${items.length === 1 ? '' : 's'}</span></div>`;

            items.forEach(item => {
                const side = item.available
                ? `<span class="phone-item-price">${formatINR(item.price)}</span>` +
                `<i class="dotmark ${item.type === 'nonveg' ? 'nonveg' : 'veg'}"></i>`
                : `<span class="soldout-tag">Sold out</span>` +
                `<i class="dotmark ${item.type === 'nonveg' ? 'nonveg' : 'veg'}"></i>`;

                html += `
                <div class="phone-item ${item.available ? '' : 'unavailable'}">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
                data-name="${escapeHtml(item.name)}" data-type="${item.type}" loading="lazy">
                <div class="phone-item-info">
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(item.description || '')}</small>
                </div>
                <div class="phone-item-side">${side}</div>
                </div>`;
            });
        });

        if (!html) {
            html = '<p class="muted-sm" style="padding:20px;text-align:center;">No menu items yet.</p>';
        }

        host.innerHTML = html;
        openModal('previewModal');
    }

    function saveQRSettings() {
        const size = Number($('#qrSize').value) || 220;
        const logo = $('#qrLogoSelect').value;
        const name = $('#qrRestaurantName').value.trim() || "DADA'S RESTAURANT";
        const border = isSwitchOn($('#qrBorder'));

        state.qr = { size, logo, name, border };
        saveState();

        renderQRPage();
        showToast('QR settings saved');
    }

    /* ==========================================================
     * 14. ORDERS
     * ========================================================== */
    let orderFilter = 'all';

    function renderOrders() {
        renderOrderStats();
        renderOrderRows();
    }

    function renderOrderStats() {
        const host = $('#orderStats');
        if (!host) return;

        const all = state.orders;
        // Coherent demo story: totals add up to "Today's Orders".
        const pending   = all.filter(o => o.status === 'Pending').length + 10;
        const completed = all.filter(o => o.status === 'Completed').length + 56;
        const cancelled = all.filter(o => o.status === 'Cancelled').length + 4;
        const today     = all.length + TODAY_ORDERS_BASE;

        const cards = [
            { label: "Today's Orders", value: today,     icon: 'receipt-text', tone: 'gold' },
 { label: 'Pending',        value: pending,   icon: 'clock',        tone: 'amber' },
 { label: 'Completed',      value: completed, icon: 'check-circle', tone: 'green' },
 { label: 'Cancelled',      value: cancelled, icon: 'x-circle',     tone: 'blue' }
        ];

        host.innerHTML = cards.map(c => `
        <article class="stat-card">
        <div class="stat-top">
        <span class="stat-label">${escapeHtml(c.label)}</span>
        <span class="stat-icon ${c.tone}"><i data-lucide="${c.icon}"></i></span>
        </div>
        <div class="stat-value">${formatNumber(c.value)}</div>
        </article>
        `).join('');

        refreshIcons();
    }

    function renderOrderRows() {
        const body = $('#ordersBody');
        const empty = $('#ordersEmpty');
        const table = $('#ordersTable');
        if (!body) return;

        const rows = orderFilter === 'all'
        ? state.orders
        : state.orders.filter(o => o.status === orderFilter);

        if (!rows.length) {
            body.innerHTML = '';
            if (table) table.style.display = 'none';
            if (empty) empty.hidden = false;
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.hidden = true;

        body.innerHTML = rows.map(o => `
        <tr>
        <td><strong>${escapeHtml(o.id)}</strong></td>
        <td>${escapeHtml(o.customer)}</td>
        <td>${o.items} item${o.items === 1 ? '' : 's'}</td>
        <td class="price">${formatINR(o.amount)}</td>
        <td><span class="status-pill-sm ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
        <td class="muted-sm">${escapeHtml(o.time)}</td>
        </tr>
        `).join('');
    }

    /* ==========================================================
     * 15. ANALYTICS
     * ========================================================== */
    function renderAnalytics() {
        renderAnalyticsStats();
        renderTrafficChart();
        renderCategoryChart();
        renderRankList();
    }

    function renderAnalyticsStats() {
        const host = $('#analyticsStats');
        if (!host) return;

        const scans = totalScans('week');
        const views = (state.views.week || []).reduce((a, b) => a + b, 0);
        const topItem = state.menu[0] ? state.menu[0].name : 'Paneer Tikka';
        const topCat = state.categoryViews.slice().sort((a, b) => b.value - a.value)[0];

        const cards = [
            { label: 'Total QR Scans', value: formatNumber(scans), icon: 'qr-code', tone: 'gold', note: 'this week' },
 { label: 'Menu Views',     value: formatNumber(views), icon: 'eye',     tone: 'blue', note: 'this week' },
 { label: 'Most Viewed Item', value: topItem, icon: 'flame', tone: 'amber', note: 'last 7 days', small: true },
 { label: 'Popular Category', value: topCat ? topCat.name : 'Main Course', icon: 'layers', tone: 'green', note: 'by views', small: true }
        ];

        host.innerHTML = cards.map(c => `
        <article class="stat-card">
        <div class="stat-top">
        <span class="stat-label">${escapeHtml(c.label)}</span>
        <span class="stat-icon ${c.tone}"><i data-lucide="${c.icon}"></i></span>
        </div>
        <div class="stat-value" style="${c.small ? 'font-size:20px;line-height:1.3;' : ''}">${escapeHtml(String(c.value))}</div>
        <div class="stat-foot"><span>${escapeHtml(c.note)}</span></div>
        </article>
        `).join('');

        refreshIcons();
    }

    function renderTrafficChart() {
        const host = $('#trafficChart');
        if (!host) return;

        const scans = state.scans.week;
        const views = state.views.week;

        const W = Math.max(host.clientWidth || 700, 340);
        const H = 280;
        const pad = { top: 18, right: 16, bottom: 38, left: 46 };
        const innerW = W - pad.left - pad.right;
        const innerH = H - pad.top - pad.bottom;
        const max = Math.max(...scans, ...views, 1) * 1.15;

        const slot = innerW / 7;
        const barW = Math.min(20, slot * 0.26);

        let grid = '';
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (innerH / 4) * i;
            const val = Math.round(max - (max / 4) * i);
            grid += `<line class="grid-line" x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}"/>`;
            grid += `<text class="axis-label" x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${val}</text>`;
        }

        let bars = '';
        for (let i = 0; i < 7; i++) {
            const groupX = pad.left + slot * i + slot / 2;
            const sH = Math.max((scans[i] / max) * innerH, 3);
            const vH = Math.max((views[i] / max) * innerH, 3);

            const sX = groupX - barW - 3;
            const vX = groupX + 3;
            const delay = i * 45;

            bars += `
            <rect class="bar bar-anim" style="animation-delay:${delay}ms"
            x="${sX}" y="${pad.top + innerH - sH}" width="${barW}" height="${sH}" rx="5">
            <title>${DAYS[i]} — ${scans[i]} scans</title>
            </rect>
            <rect class="bar-ink bar-anim" style="animation-delay:${delay + 60}ms"
            x="${vX}" y="${pad.top + innerH - vH}" width="${barW}" height="${vH}" rx="5">
            <title>${DAYS[i]} — ${views[i]} views</title>
            </rect>
            <text class="axis-label" x="${groupX}" y="${H - 12}" text-anchor="middle">${DAYS[i]}</text>`;
        }

        host.innerHTML = `
        <svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
        aria-label="QR scans versus menu views for the last 7 days">
        <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="1"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.5"/>
        </linearGradient>
        </defs>
        ${grid}
        ${bars}
        </svg>`;
    }

    function renderCategoryChart() {
        const host = $('#categoryChart');
        if (!host) return;

        const data = state.categoryViews.slice().sort((a, b) => b.value - a.value);
        const max = data[0] ? data[0].value : 1;

        host.innerHTML = `<div class="hbar-list">${data.map(d => `
            <div class="hbar-item">
            <div class="hbar-top">
            <strong>${escapeHtml(d.name)}</strong>
            <span>${formatNumber(d.value)}</span>
            </div>
            <div class="hbar-track">
            <span class="hbar-fill" style="--w:${Math.round((d.value / max) * 100)}%"></span>
            </div>
            </div>
            `).join('')}</div>`;
    }

    function renderRankList() {
        const host = $('#rankList');
        if (!host) return;

        const top = state.menu.slice(0, 6).map((item, i) => ({
            name: item.name,
            category: item.category,
            views: 420 - i * 46
        }));

        const max = top[0] ? top[0].views : 1;

        host.innerHTML = top.map((t, i) => `
        <li>
        <span class="rank-num">${i + 1}</span>
        <div class="rank-info">
        <strong>${escapeHtml(t.name)}</strong>
        <small>${escapeHtml(t.category)}</small>
        </div>
        <span class="rank-bar"><i style="width:${Math.round((t.views / max) * 100)}%"></i></span>
        <span class="rank-val">${formatNumber(t.views)}</span>
        </li>
        `).join('');
    }

    /* ==========================================================
     * 16. CUSTOMERS
     * ========================================================== */
    function renderCustomers() {
        renderCustomerStats();
        renderCustomerRows();
    }

    function renderCustomerStats() {
        const host = $('#customerStats');
        if (!host) return;

        const total = state.customers.length;
        const returning = state.customers.filter(c => c.visits > 5).length;
        const today = state.customers.filter(c => c.last === 'Today').length;
        const avg = Math.round(
            state.customers.reduce((sum, c) => sum + c.visits, 0) / (total || 1)
        );

        const cards = [
            { label: 'Total Customers', value: total,     icon: 'users',       tone: 'gold' },
 { label: 'Returning',       value: returning, icon: 'repeat',      tone: 'green' },
 { label: 'Visited Today',   value: today,     icon: 'calendar',    tone: 'blue' },
 { label: 'Avg. Visits',     value: avg,       icon: 'trending-up', tone: 'amber' }
        ];

        host.innerHTML = cards.map(c => `
        <article class="stat-card">
        <div class="stat-top">
        <span class="stat-label">${escapeHtml(c.label)}</span>
        <span class="stat-icon ${c.tone}"><i data-lucide="${c.icon}"></i></span>
        </div>
        <div class="stat-value">${formatNumber(c.value)}</div>
        </article>
        `).join('');

        refreshIcons();
    }

    function renderCustomerRows() {
        const body = $('#customersBody');
        if (!body) return;

        body.innerHTML = state.customers.map(c => `
        <tr>
        <td>
        <div class="item-cell">
        <span class="avatar" aria-hidden="true">${escapeHtml(c.name.charAt(0))}</span>
        <div class="item-meta">
        <strong>${escapeHtml(c.name)}</strong>
        <small>Regular guest</small>
        </div>
        </div>
        </td>
        <td><span class="count-pill">${c.visits}</span></td>
        <td class="muted-sm">${escapeHtml(c.last)}</td>
        <td>${escapeHtml(c.fav)}</td>
        </tr>
        `).join('');
    }

    /* ==========================================================
     * 17. SETTINGS
     * ========================================================== */
    function renderSettings() {
        const s = state.settings;

        const map = {
            '#setName': s.name,
 '#setTagline': s.tagline,
 '#setPhone': s.phone,
 '#setEmail': s.email,
 '#setAddress': s.address,
 '#setDays': s.days,
 '#setHours': s.hours,
 '#setInstagram': s.instagram,
 '#setFacebook': s.facebook,
 '#setLogo': s.logo,
 '#setPrimary': s.primary,
 '#setAccent': s.accent
        };

        Object.keys(map).forEach(sel => {
            const el = $(sel);
            if (el) el.value = map[sel];
        });
    }

    function saveSettings() {
        const s = state.settings;

        s.name      = ($('#setName') || {}).value || s.name;
        s.tagline   = ($('#setTagline') || {}).value || s.tagline;
        s.phone     = ($('#setPhone') || {}).value || s.phone;
        s.email     = ($('#setEmail') || {}).value || s.email;
        s.address   = ($('#setAddress') || {}).value || s.address;
        s.days      = ($('#setDays') || {}).value || s.days;
        s.hours     = ($('#setHours') || {}).value || s.hours;
        s.instagram = ($('#setInstagram') || {}).value || s.instagram;
        s.facebook  = ($('#setFacebook') || {}).value || s.facebook;
        s.logo      = ($('#setLogo') || {}).value || s.logo;
        s.primary   = ($('#setPrimary') || {}).value || s.primary;
        s.accent    = ($('#setAccent') || {}).value || s.accent;

        applyBranding();
        saveState();
        showToast('Restaurant settings saved');
    }

    function applyBranding() {
        const s = state.settings;

        // Visible text
        const nameEl = $('#brandName');
        const tagEl = $('#brandTagline');
        if (nameEl) nameEl.textContent = s.name;
        if (tagEl) tagEl.textContent = s.tagline;

        // CSS variables
        const root = document.documentElement;
        root.style.setProperty('--primary', s.primary);
        root.style.setProperty('--on-primary', contrastColor(s.primary));
        root.style.setProperty('--accent', s.accent);
        root.style.setProperty('--on-accent', contrastColor(s.accent));
        root.style.setProperty('--accent-soft', hexToRgba(s.accent, 0.14));

        // QR logo mark
        const qrLogo = $('#qrLogo');
        if (qrLogo) qrLogo.textContent = (s.logo || 'D').charAt(0);

        const avatarEls = $$('.avatar');
        avatarEls.forEach(a => { a.textContent = (s.logo || 'D').charAt(0); });

        document.title = `${s.name} · Restaurant Admin Panel`;
    }

    function hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== 'string') return `rgba(201,162,39,${alpha})`;
        let h = hex.replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (h.length !== 6) return `rgba(201,162,39,${alpha})`;
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function resetDemoData() {
        openConfirm(
            {
                title: 'Reset demo data?',
                message: 'This will restore the original DADA\'S demo data and discard all changes you have made.',
                okLabel: 'Reset',
                okClass: 'btn-danger'
            },
            () => {
                try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
                state = defaultState();
                saveState();

                applyBranding();
                renderSettings();
                renderDashboard();
                renderMenuCategoryFilter();
                renderMenu();
                renderCategories();
                renderQRPage();
                renderOrders();
                renderAnalytics();
                renderCustomers();

                showToast('Demo data restored');
            }
        );
    }

    /* ==========================================================
     * 18. SEARCH
     * ========================================================== */
    function handleGlobalSearch(value) {
        const q = (value || '').trim();

        if (!q) return;

        // Always jump to the Menu page and apply the search there.
        menuFilters.search = q;
        menuFilters.chip = 'all';
        menuFilters.category = 'all';

        const chipAll = document.querySelector('.chip[data-filter="all"]');
        if (chipAll) {
            $$('.chip[data-filter]').forEach(c => c.classList.remove('active'));
            chipAll.classList.add('active');
        }

        const catSel = $('#menuCategoryFilter');
        if (catSel) catSel.value = 'all';

        const menuSearch = $('#menuSearch');
        if (menuSearch) menuSearch.value = q;

        navigateTo('menu');
    }

    function handleMenuSearch(value) {
        menuFilters.search = value || '';
        renderMenuRows();
        refreshIcons();
    }

    function clearMenuFilters() {
        menuFilters = { search: '', chip: 'all', category: 'all' };

        const menuSearch = $('#menuSearch');
        if (menuSearch) menuSearch.value = '';

        const globalSearch = $('#globalSearch');
        if (globalSearch) globalSearch.value = '';

        $$('.chip[data-filter]').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));

        const catSel = $('#menuCategoryFilter');
        if (catSel) catSel.value = 'all';

        renderMenu();
    }

    /* ==========================================================
     * 19. DROPDOWNS
     * ========================================================== */
    function closeAllDropdowns(except) {
        $$('.dropdown.open').forEach(d => {
            if (d !== except) {
                d.classList.remove('open');
                const btn = d.querySelector('button[aria-haspopup]');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function toggleDropdown(dropdown, button) {
        if (!dropdown || !button) return;
        const isOpen = dropdown.classList.contains('open');
        closeAllDropdowns(dropdown);

        dropdown.classList.toggle('open', !isOpen);
        button.setAttribute('aria-expanded', String(!isOpen));
    }

    /* ==========================================================
     * 20. EVENT WIRING
     * ========================================================== */
    function bindEvents() {

        /* ---- Theme ---- */
        const themeBtn = $('#themeToggle');
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

        /* ---- Sidebar / mobile ---- */
        const menuBtn = $('#menuBtn');
        const sidebarClose = $('#sidebarClose');
        const backdrop = $('#sidebarBackdrop');

        if (menuBtn) menuBtn.addEventListener('click', openSidebar);
        if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
        if (backdrop) backdrop.addEventListener('click', closeSidebar);

        /* ---- Navigation ---- */
        $$('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });

        // Any element with data-page navigates
        document.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('[data-page]:not(.nav-item)');
            if (pageBtn) {
                e.preventDefault();
                navigateTo(pageBtn.dataset.page);
            }
        });

        /* ---- Dropdowns ---- */
        const notifBtn = $('#notifBtn');
        const notifDropdown = $('#notifDropdown');
        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown(notifDropdown, notifBtn);
            });
        }

        const profileBtn = $('#profileBtn');
        const profileDropdown = $('#profileDropdown');
        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown(profileDropdown, profileBtn);
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) closeAllDropdowns();
        });

            // Profile dropdown items
            document.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item[data-action]');
                if (!item) return;
                const action = item.dataset.action;

                if (action === 'go-settings') {
                    closeAllDropdowns();
                    navigateTo('settings');
                } else if (action === 'logout') {
                    closeAllDropdowns();
                    showToast('Demo logout action', 'info');
                }
            });

            /* ---- Global action buttons (delegated) ---- */
            document.addEventListener('click', (e) => {
                const el = e.target.closest('[data-action]');
                if (!el) return;

                const action = el.dataset.action;
                const id = el.dataset.id;

                switch (action) {
                    case 'add-item':
                        e.preventDefault();
                        openItemModal(null);
                        break;

                    case 'edit-item':
                        e.preventDefault();
                        openItemModal(state.menu.find(i => i.id === id) || null);
                        break;

                    case 'delete-item':
                        e.preventDefault();
                        requestDeleteItem(id);
                        break;

                    case 'toggle-availability':
                        e.preventDefault();
                        toggleAvailability(id);
                        break;

                    case 'add-category':
                        e.preventDefault();
                        openCategoryModal(null);
                        break;

                    case 'edit-category':
                        e.preventDefault();
                        openCategoryModal(state.categories.find(c => c.id === id) || null);
                        break;

                    case 'delete-category':
                        e.preventDefault();
                        requestDeleteCategory(id);
                        break;

                    case 'clear-filters':
                        e.preventDefault();
                        clearMenuFilters();
                        break;

                    case 'copy-link':
                        e.preventDefault();
                        copyMenuLink();
                        break;

                    case 'download-qr':
                        e.preventDefault();
                        downloadQRCode();
                        break;

                    case 'open-menu':
                        e.preventDefault();
                        openMenuPreview();
                        break;

                    case 'save-qr':
                        e.preventDefault();
                        saveQRSettings();
                        break;

                    case 'save-settings':
                        e.preventDefault();
                        saveSettings();
                        break;

                    case 'reset-demo':
                        e.preventDefault();
                        resetDemoData();
                        break;

                    default:
                        break;
                }
            });

            /* ---- Menu page: search ---- */
            const menuSearch = $('#menuSearch');
            if (menuSearch) {
                menuSearch.addEventListener('input', debounce((e) => handleMenuSearch(e.target.value), 140));
            }

            /* ---- Menu page: chips ---- */
            $$('.chip[data-filter]').forEach(chip => {
                chip.addEventListener('click', () => {
                    $$('.chip[data-filter]').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    menuFilters.chip = chip.dataset.filter;
                    renderMenuRows();
                    refreshIcons();
                });
            });

            /* ---- Menu page: category dropdown ---- */
            const catFilter = $('#menuCategoryFilter');
            if (catFilter) {
                catFilter.addEventListener('change', () => {
                    menuFilters.category = catFilter.value;
                    renderMenuRows();
                    refreshIcons();
                });
            }

            /* ---- Global search ---- */
            const globalSearch = $('#globalSearch');
            if (globalSearch) {
                globalSearch.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGlobalSearch(globalSearch.value);
                    }
                });
            }

            /* ---- Item form ---- */
            const itemForm = $('#itemForm');
            if (itemForm) itemForm.addEventListener('submit', handleItemSubmit);

            const itemAvailableSwitch = $('#itemAvailable');
        if (itemAvailableSwitch) {
            itemAvailableSwitch.addEventListener('click', () => {
                setSwitch(itemAvailableSwitch, !isSwitchOn(itemAvailableSwitch));
            });
        }

        /* ---- Category form ---- */
        const catForm = $('#categoryForm');
        if (catForm) catForm.addEventListener('submit', handleCategorySubmit);

        /* ---- Confirm modal ---- */
        const confirmOk = $('#confirmOk');
        if (confirmOk) {
            confirmOk.addEventListener('click', () => {
                const cb = confirmCallback;
                confirmCallback = null;
                closeModal('confirmModal');
                if (typeof cb === 'function') cb();
            });
        }

        /* ---- Modal close (backdrop + close buttons) ---- */
        $$('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-close-modal]')) {
                    e.preventDefault();
                    closeModal(modal);
                }
            });
        });

        /* ---- Escape key ---- */
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // Close modal first
            const openModalEl = document.querySelector('.modal.open');
            if (openModalEl) {
                closeModal(openModalEl);
                return;
            }

            // Then dropdowns
            closeAllDropdowns();

            // Then mobile sidebar
            closeSidebar();
        });

        /* ---- QR controls ---- */
        const qrBorder = $('#qrBorder');
        if (qrBorder) {
            qrBorder.addEventListener('click', () => {
                const on = !isSwitchOn(qrBorder);
                setSwitch(qrBorder, on);
                const frame = $('#qrFrame');
                if (frame) frame.classList.toggle('bordered', on);
            });
        }

        const qrSize = $('#qrSize');
        if (qrSize) {
            qrSize.addEventListener('change', () => {
                state.qr.size = Number(qrSize.value) || 220;
                saveState();
                generateQRCode();
            });
        }

        const qrLogoSelect = $('#qrLogoSelect');
        if (qrLogoSelect) {
            qrLogoSelect.addEventListener('change', () => {
                state.qr.logo = qrLogoSelect.value;
                saveState();
                renderQRPage();
            });
        }

        const qrName = $('#qrRestaurantName');
        if (qrName) {
            qrName.addEventListener('input', () => {
                const brand = document.querySelector('.qr-brand');
                if (brand) brand.textContent = qrName.value || "DADA'S RESTAURANT";
            });
        }

        /* ---- Dashboard chart range ---- */
        const chartRange = $('#chartRange');
        if (chartRange) {
            chartRange.addEventListener('change', () => renderScanChart());
        }

        /* ---- Order filters ---- */
        $$('[data-order-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('[data-order-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                orderFilter = btn.dataset.orderFilter;
                renderOrderRows();
            });
        });

        /* ---- Image error fallback (capture phase) ---- */
        document.addEventListener('error', (e) => {
            const img = e.target;
            if (img && img.tagName === 'IMG' && !img.dataset.fallbackApplied) {
                img.dataset.fallbackApplied = '1';
                img.src = placeholderImage(img.dataset.name || '', img.dataset.type || 'veg');
            }
        }, true);

        /* ---- Responsive chart re-render ---- */
        const handleResize = debounce(() => {
            renderVisibleCharts();
        }, 220);
        window.addEventListener('resize', handleResize);
    }

    /* ==========================================================
     * 21. INITIALISATION
     * ========================================================== */
    function init() {
        state = loadState();
        saveState();

        initTheme();
        applyBranding();
        bindEvents();

        // Render every page once so the data is ready when navigated to.
        renderDashboard();
        renderMenuCategoryFilter();
        renderMenu();
        renderCategories();
        renderQRPage();
        renderOrders();
        renderAnalytics();
        renderCustomers();
        renderSettings();

        navigateTo('dashboard');

        refreshIcons();
    }

    /* Kick things off once the DOM is ready. */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
