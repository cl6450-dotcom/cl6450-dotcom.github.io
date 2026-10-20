(() => {
    const root = document.documentElement;
    const motion = root.classList.contains('motion');

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

    /* ---------- Footer year ---------- */
    document.getElementById('year').textContent = new Date().getFullYear();
})();
