(() => {
    const root = document.documentElement;
    const motion = root.classList.contains('motion');
    // The animations can be paused and played again with the button in the nav, so the effects check when they run
    const moving = () => root.classList.contains('motion');

    /* ---------- Name: split into letters so each can hop in (motion only) ---------- */
    if (motion) {
        const title = document.getElementById('hero-title');
        const text = title.textContent.trim();
        const holder = document.createElement('span');
        holder.setAttribute('aria-hidden', 'true');
        let i = 0;
        text.split(' ').forEach((word, wi) => {
            if (wi) holder.append(' ');
            const w = document.createElement('span');
            w.style.whiteSpace = 'nowrap';
            [...word].forEach((c) => {
                const ch = document.createElement('span');
                ch.className = 'ch';
                ch.style.setProperty('--i', i++);
                ch.textContent = c;
                w.append(ch);
            });
            holder.append(w);
        });
        title.setAttribute('aria-label', text);
        title.replaceChildren(holder);
    }

    /* ---------- Phone menu ---------- */
    const nav = document.getElementById('nav');
    const menuBtn = nav.querySelector('.menu-btn');
    const setMenu = (open) => {
        nav.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setMenu(false); });

    /* ---------- Count up the numbers when they come into view ---------- */
    const counters = [...document.querySelectorAll('[data-count]')];
    const countUp = (el) => {
        const end = Number(el.dataset.count);
        const start = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - start) / 1400);
            el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    /* ---------- Fade sections in as they scroll into view ---------- */
    if (motion) {
        counters.forEach((el) => { el.textContent = '0'; });
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                entry.target.querySelectorAll('[data-count]').forEach(countUp);
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    }

    // Printing shows the final numbers, not a count in progress.
    window.addEventListener('beforeprint', () => counters.forEach((el) => { el.textContent = el.dataset.count; }));

    /* ---------- Hearts that float up and fade (copying her email, and the cat) ---------- */
    const hearts = (x, y, { count = 7, spread = 1, reach = 44, rise = 14 } = {}) => {
        if (!moving()) return;
        for (let i = 0; i < count; i++) {
            const h = document.createElement('span');
            h.className = 'burst-heart';
            h.setAttribute('aria-hidden', 'true');
            h.innerHTML = '<svg class="icon filled"><use href="#i-heart"/></svg>';
            h.style.left = `${x}px`;
            h.style.top = `${y}px`;
            h.style.color = i % 2 ? 'var(--mint-300)' : 'var(--pink-400)';
            h.style.fontSize = `${10 + Math.random() * 7}px`;
            document.body.append(h);
            const a = -Math.PI / 2 + (i - (count - 1) / 2) * 0.42 * spread + (Math.random() - 0.5) * 0.25;
            const d = reach * (0.75 + Math.random() * 0.5);
            const spin = (Math.random() - 0.5) * 50;
            h.animate([
                { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d * 0.6}px), calc(-50% + ${Math.sin(a) * d * 0.6}px)) scale(1) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.35 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - rise}px)) scale(0.8) rotate(${spin}deg)`, opacity: 0 },
            ], { duration: 900 + Math.random() * 250, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).finished.then(() => h.remove(), () => h.remove());
        }
    };

    /* ---------- Copy email ---------- */
    document.querySelectorAll('.copy-btn').forEach((btn) => {
        const label = btn.querySelector('.copy-label');
        const status = btn.parentElement.querySelector('.copy-status');
        let timer;
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            let ok = false;
            // The clipboard API can stall on a permission prompt, so give it a moment, then fall back.
            if (navigator.clipboard) {
                ok = await Promise.race([
                    navigator.clipboard.writeText(text).then(() => true, () => false),
                    new Promise((r) => setTimeout(() => r(false), 800)),
                ]);
            }
            if (!ok) {
                const t = document.createElement('textarea');
                t.value = text;
                t.setAttribute('readonly', '');
                t.style.cssText = 'position:fixed;opacity:0';
                document.body.append(t);
                t.select();
                try { ok = document.execCommand('copy'); } catch (err) {}
                t.remove();
            }
            btn.classList.toggle('copied', ok);
            if (ok) {
                const b = btn.getBoundingClientRect();
                hearts(b.left + b.width / 2, b.top + b.height / 2);
            }
            label.textContent = ok ? 'Copied' : 'Copy failed';
            status.textContent = ok ? 'Email address copied' : 'Could not copy the email address';
            clearTimeout(timer);
            timer = setTimeout(() => {
                btn.classList.remove('copied');
                label.textContent = 'Copy';
                status.textContent = '';
            }, 2000);
        });
    });

    /* ---------- The nav follows along ---------- */
    // The link for the section you're reading lights up (and tells screen readers it's where you are): a section counts
    // once its top passes a third of the way down the screen, and at the very bottom it's the last one. On phones a
    // back-to-top button shows once you're a screen down.
    const links = [...nav.querySelectorAll('.nav-links a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.hash)).filter(Boolean);
    const floatTop = document.querySelector('.float-top');
    let here = null;
    let queued = false;
    const follow = () => {
        queued = false;
        let found = null;
        sections.forEach((s) => { if (s.getBoundingClientRect().top <= window.innerHeight / 3) found = s; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) found = sections[sections.length - 1];
        if (floatTop) floatTop.classList.toggle('show', window.scrollY > window.innerHeight * 0.8);
        if (found === here) return;
        here = found;
        links.forEach((a) => {
            const on = !!found && a.hash === `#${found.id}`;
            a.classList.toggle('current', on);
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
        });
    };
    window.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(follow);
    }, { passive: true });
    window.addEventListener('resize', follow);
    follow();

    /* ---------- The heartbeat line ---------- */
    // The nav's edge as a heart monitor's trace: a beat where each section begins (at the point in the scroll where its
    // top passes a third of the way down, the same moment the nav lights its link), each a small P bump, the sharp QRS
    // spike, and a gentle T wave. The solid line draws itself as you scroll, and each beat it passes on the way down
    // makes the heart in her name beat.
    const brandHeart = nav.querySelector('.brand .icon');
    const ekg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ekg.setAttribute('class', 'ekg');
    ekg.setAttribute('aria-hidden', 'true');
    ekg.innerHTML = '<path class="ekg-base"/><path class="ekg-line"/><circle class="ekg-glow" r="4"/><circle class="ekg-dot" r="3"/>';
    const [ekgBase, ekgLine, ekgGlow, ekgDot] = ekg.children;
    nav.append(ekg);
    nav.classList.add('has-ekg');
    const EKG_H = 24;
    const EKG_Y = 12;
    let ekgWidth = 0;
    let beats = [];
    let along = []; // [x, length along the trace], every 1.5px of length
    let traceLength = 0;
    let lastX = -1;
    let traceQueued = false;
    const thump = () => {
        if (!moving() || !brandHeart) return;
        brandHeart.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
            { duration: 650, easing: 'ease-out' }
        );
    };
    const drawTrace = () => {
        traceQueued = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        const x = ekgWidth * (max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0);
        // the length along the trace at x (the trace only ever moves rightward, so x picks one point)
        let lo = 0;
        let hi = along.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (along[mid][0] <= x) lo = mid;
            else hi = mid - 1;
        }
        const len = along.length ? along[lo][1] : 0;
        ekgLine.style.strokeDashoffset = traceLength - len;
        const pt = traceLength ? ekgLine.getPointAtLength(len) : { x: 0, y: EKG_Y };
        [ekgDot, ekgGlow].forEach((c) => {
            c.setAttribute('cx', pt.x);
            c.setAttribute('cy', pt.y);
        });
        if (lastX >= 0 && beats.some((b) => lastX < b && x >= b)) thump();
        lastX = x;
    };
    const buildTrace = () => {
        ekgWidth = nav.getBoundingClientRect().width; // (exact: the page can be a fractional width, and clientWidth rounds)
        const max = document.documentElement.scrollHeight - innerHeight;
        root.classList.add('measuring'); // (where each section sits on the page, not where it's held as the next rises)
        beats = sections.map((s) => {
            const at = s.getBoundingClientRect().top + scrollY - innerHeight / 3;
            return Math.min(ekgWidth - 24, Math.max(24, (at / Math.max(1, max)) * ekgWidth));
        });
        root.classList.remove('measuring');
        let d = `M0 ${EKG_Y}`;
        beats.forEach((x) => {
            d += ` L${(x - 20).toFixed(1)} ${EKG_Y} q4 -3.5 8 0 L${(x - 4).toFixed(1)} ${EKG_Y} l2 2.5 l3 -11 l3 14 l2 -5.5 L${(x + 10).toFixed(1)} ${EKG_Y} q5 -4.5 10 0`;
        });
        d += ` L${ekgWidth} ${EKG_Y}`;
        ekg.setAttribute('viewBox', `0 0 ${ekgWidth} ${EKG_H}`);
        ekg.setAttribute('height', EKG_H);
        ekgBase.setAttribute('d', d);
        ekgLine.setAttribute('d', d);
        traceLength = ekgLine.getTotalLength();
        along = [];
        for (let l = 0; l <= traceLength; l += 1.5) along.push([ekgLine.getPointAtLength(l).x, l]);
        ekgLine.style.strokeDasharray = `${traceLength} ${traceLength}`;
        lastX = -1;
        drawTrace();
    };
    window.addEventListener('scroll', () => {
        if (traceQueued) return;
        traceQueued = true;
        requestAnimationFrame(drawTrace);
    }, { passive: true });
    new ResizeObserver(() => requestAnimationFrame(buildTrace)).observe(document.body);
    buildTrace();

    /* ---------- Sections rising over one another ---------- */
    // As you scroll, each section holds still while the next one rises over it on its wavy edge, the wave rolling
    // sideways as it climbs, and the one underneath settles back a little and dims (see "Sections rising over one
    // another" in styles.css). Each section and the wave above it become one layer, each above the last. With motion
    // off it's the ordinary page.
    const main = document.getElementById('main');
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const layers = [];
    [...main.children].filter((el) => el.tagName === 'SECTION').forEach((sec) => {
        const layer = document.createElement('div');
        layer.className = 'layer';
        const above = sec.previousElementSibling;
        sec.before(layer);
        if (above && above.classList.contains('wave')) layer.append(above);
        layer.append(sec);
        layers.push(layer);
    });
    const layerSections = layers.map((l) => l.querySelector(':scope > section'));
    const layerWaves = layers.map((l) => l.querySelector(':scope > .wave'));
    // Each wave gets a period more on either side (looking just the same), so it can roll sideways without running out
    const wavePaths = layerWaves.map((wave) => {
        const path = wave && wave.querySelector('path');
        if (!path) return null;
        const crest = path.getAttribute('d').startsWith('M0 34');
        const hump = crest ? ' c120-22 240-22 360 0s240 22 360 0' : ' c120 22 240 22 360 0s240-22 360 0';
        path.setAttribute('d', `M-720 ${crest ? 34 : 26}${hump.repeat(4)}V60H-720z`);
        return path;
    });
    let holdFrom = [];
    let waveHeights = [];
    let stackQueued = false;
    const stackFrame = () => {
        stackQueued = false;
        if (!root.classList.contains('stacking')) return;
        layers.forEach((layer, i) => {
            const next = layers[i + 1];
            if (!next) return;
            const top = next.getBoundingClientRect().top;
            // how far the next layer has come up over this one while it holds (0 to 1)
            const p = clamp01((holdFrom[i] - top) / holdFrom[i]);
            layerSections[i].classList.toggle('held', p > 0 && p < 1);
            layerSections[i].style.setProperty('--p', p.toFixed(3));
            const wave = layerWaves[i + 1];
            if (!wave) return;
            const open = layerSections[i].getBoundingClientRect().bottom - top;
            wave.style.setProperty('--open', `${Math.max(0, Math.min(waveHeights[i + 1], open)).toFixed(1)}px`);
            wavePaths[i + 1].setAttribute('transform', `translate(${(-p * 540).toFixed(1)} 0)`);
        });
    };
    const stack = () => {
        const on = moving();
        root.classList.toggle('stacking', on);
        layerSections.forEach((s) => s.classList.remove('held'));
        if (!on) return;
        const ih = innerHeight;
        layers.forEach((layer, i) => {
            const h = layerSections[i].offsetHeight;
            layer.style.zIndex = i + 1;
            waveHeights[i] = layerWaves[i] ? layerWaves[i].offsetHeight : 0;
            // held at the top, or for a section taller than the screen, by its bottom edge at the bottom
            layerSections[i].style.setProperty('--stick', `${Math.min(0, ih - h)}px`);
            // and settling back around the middle of whatever part of it is showing
            layerSections[i].style.setProperty('--origin', `${Math.max(h / 2, h - ih / 2)}px`);
            holdFrom[i] = Math.min(ih, h);
        });
        // Room to hold in: a screen, or the height of the layer rising over it if that's shorter (so the last one
        // doesn't reach past the footer); the next layer tucks up by the same, so nothing on the page moves
        layers.forEach((layer, i) => {
            const next = layers[i + 1];
            if (!next) return;
            const room = Math.min(ih, layerSections[i + 1].offsetHeight + waveHeights[i + 1]);
            layer.style.setProperty('--room', `${room}px`);
            next.style.setProperty('--tuck', `${room}px`);
        });
        stackFrame();
    };
    window.addEventListener('scroll', () => {
        if (stackQueued) return;
        stackQueued = true;
        requestAnimationFrame(stackFrame);
    }, { passive: true });
    let stackTimer;
    window.addEventListener('resize', () => {
        clearTimeout(stackTimer);
        stackTimer = setTimeout(stack, 120);
    });
    new ResizeObserver(() => requestAnimationFrame(stack)).observe(main);
    stack();
    // Links within the page go by where a section sits on the page, not where it happens to be held right now (the
    // skip link keeps the browser's own jump, which also moves the keyboard there)
    document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || a.classList.contains('skip-link') || !root.classList.contains('stacking')) return;
        const target = a.hash === '#top' ? null : document.querySelector(a.hash);
        if (!target && a.hash !== '#top') return;
        e.preventDefault();
        root.classList.add('measuring');
        const y = target ? target.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(root).scrollPaddingTop || '0') : 0;
        root.classList.remove('measuring');
        scrollTo({ top: y, behavior: 'smooth' });
        history.pushState(null, '', a.hash);
        if (target) {
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }
    });

    /* ---------- Night mode, more contrast, and motion ---------- */
    // Each choice is remembered for next time. Until she's chosen, the page follows the device's setting, even if it
    // changes while she's here.
    const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const themeBtn = document.querySelector('[data-toggle="theme"]');
    const contrastBtn = document.querySelector('[data-toggle="contrast"]');
    const motionBtn = document.querySelector('[data-toggle="motion"]');
    const syncToggles = () => {
        const dark = root.dataset.theme === 'dark';
        themeBtn.setAttribute('aria-label', dark ? 'Switch to day mode' : 'Switch to night mode');
        themeBtn.title = themeBtn.getAttribute('aria-label');
        contrastBtn.setAttribute('aria-pressed', String(root.dataset.contrast === 'more'));
        motionBtn.setAttribute('aria-pressed', String(!moving()));
        motionBtn.setAttribute('aria-label', moving() ? 'Pause animations' : 'Play animations');
        motionBtn.title = motionBtn.getAttribute('aria-label');
        if (metaTheme) metaTheme.content = getComputedStyle(root).getPropertyValue('--cream').trim();
    };
    // The new theme spreads out from the button in the shape of a heart, big enough by the end to cover the farthest
    // corner (a heart is narrowest at its dip, so it grows to four times that distance)
    const setTheme = (theme) => {
        const apply = () => {
            root.dataset.theme = theme;
            remember('theme', theme);
            syncToggles();
        };
        if (!document.startViewTransition || !moving()) {
            apply();
            return;
        }
        const b = themeBtn.getBoundingClientRect();
        const x = b.left + b.width / 2;
        const y = b.top + b.height / 2;
        const size = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) * 4;
        const from = { size: '0px 0px', at: `${x}px ${y}px` };
        const to = { size: `${size}px ${size}px`, at: `${x - size * 0.5}px ${y - size * 0.4}px` };
        document.startViewTransition(apply).ready.then(() => {
            root.animate({
                maskSize: [from.size, to.size],
                maskPosition: [from.at, to.at],
                webkitMaskSize: [from.size, to.size],
                webkitMaskPosition: [from.at, to.at],
            }, { duration: 1100, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' });
        }).catch(() => {});
    };
    themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    contrastBtn.addEventListener('click', () => {
        const more = root.dataset.contrast !== 'more';
        if (more) root.dataset.contrast = 'more';
        else delete root.dataset.contrast;
        remember('contrast', more ? 'more' : 'normal');
        syncToggles();
    });
    motionBtn.addEventListener('click', () => {
        const on = !moving();
        // Anything still waiting to fade in shows first, so nothing hides itself when the animations come back on
        if (on) document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
        root.classList.toggle('motion', on);
        remember('motion', on ? 'on' : 'off');
        syncToggles();
        stack();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        let chosen = null;
        try { chosen = localStorage.getItem('theme'); } catch (err) {}
        if (chosen) return;
        root.dataset.theme = e.matches ? 'dark' : 'light';
        syncToggles();
    });
    syncToggles();

    /* ---------- The cat behind the portrait ---------- */
    // Tap her portrait five times and a cat peeks over the top of the frame (it waits behind it, and its paws come up
    // over the rim), blinks, floats a few hearts, and slips back down after a few seconds
    const portrait = document.querySelector('.portrait');
    if (portrait) {
        const cat = document.createElement('div');
        cat.className = 'peek-cat';
        cat.setAttribute('aria-hidden', 'true');
        cat.innerHTML = `<svg viewBox="0 0 120 100">
            <path class="cat-line cat-ear-l" d="M24 46 L31 9 L54 32 Z"/>
            <path class="cat-line cat-ear-r" d="M96 46 L89 9 L66 32 Z"/>
            <path class="cat-pink" d="M31 37 L34 18 L46 31 Z"/>
            <path class="cat-pink" d="M89 37 L86 18 L74 31 Z"/>
            <ellipse class="cat-line" cx="60" cy="60" rx="44" ry="37"/>
            <ellipse class="cat-blush" cx="33" cy="70" rx="8" ry="4.5"/>
            <ellipse class="cat-blush" cx="87" cy="70" rx="8" ry="4.5"/>
            <g class="cat-eyes"><ellipse class="cat-ink" cx="44" cy="57" rx="4.6" ry="6"/><ellipse class="cat-ink" cx="76" cy="57" rx="4.6" ry="6"/></g>
            <path class="cat-pink" d="M56 65 h8 l-4 4.5 z"/>
            <path class="cat-stroke" d="M53 72 q3.5 4 7 0 q3.5 4 7 0"/>
            <path class="cat-stroke" d="M22 63 l-14 -3 M22 69 l-14 2 M98 63 l14 -3 M98 69 l14 2"/>
        </svg>`;
        const paws = document.createElement('div');
        paws.className = 'peek-paws';
        paws.setAttribute('aria-hidden', 'true');
        paws.innerHTML = `<svg viewBox="0 0 120 30">
            <ellipse class="cat-line" cx="34" cy="16" rx="13" ry="9"/>
            <ellipse class="cat-line" cx="86" cy="16" rx="13" ry="9"/>
            <path class="cat-stroke" d="M30 10 v5 M38 10 v5 M82 10 v5 M90 10 v5"/>
        </svg>`;
        const said = document.createElement('p');
        said.className = 'visually-hidden';
        said.setAttribute('aria-live', 'polite');
        portrait.querySelector('.portrait-blob').after(cat);
        portrait.querySelector('.portrait-frame').after(paws);
        portrait.append(said);
        let taps = 0;
        let tapTimer;
        portrait.querySelector('.portrait-frame').addEventListener('click', () => {
            taps++;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => { taps = 0; }, 1200);
            if (taps < 5 || portrait.classList.contains('cat-out')) return;
            taps = 0;
            portrait.classList.add('cat-out');
            said.textContent = 'A cat peeked out to say hi!';
            setTimeout(() => {
                const b = cat.getBoundingClientRect();
                hearts(b.left + b.width / 2, b.top + b.height * 0.2, { count: 5, spread: 0.8, reach: 40, rise: 24 });
            }, 650);
            setTimeout(() => {
                portrait.classList.remove('cat-out');
                said.textContent = '';
            }, 4200);
        });
    }

    /* ---------- Her local time, under the contact intro ---------- */
    // So someone writing from another time zone can tell whether it's the middle of her night. It keeps to the minute,
    // and without the script the line simply isn't there.
    const localTime = document.querySelector('.local-time');
    if (localTime) {
        const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
        const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' });
        const tick = () => {
            const now = new Date();
            const h = Number(hour.format(now));
            const night = h >= 23 || h < 7;
            localTime.textContent = `It’s ${clock.format(now)} for me in Queens${night ? ', so I’ll write back in the morning' : ''}.`;
            localTime.hidden = false;
            setTimeout(tick, 60000 - (now.getTime() % 60000) + 50); // just after the next minute turns
        };
        tick();
    }

    /* ---------- Offline copy ---------- */
    // Repeat visits open from a saved copy if the network is slow, and the site still opens offline (see sw.js)
    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    }

    /* ---------- Footer year ---------- */
    document.getElementById('year').textContent = new Date().getFullYear();
})();
