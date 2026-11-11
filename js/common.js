document.querySelectorAll('[data-copyright-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
});

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

const currentPath = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
document.querySelectorAll('.nav a, .mobile-menu a').forEach((link) => {
    const linkPath = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (linkPath === currentPath) link.setAttribute('aria-current', 'page');
});

function setMobileMenu(open) {
    mobileMenu.hidden = !open;
    mobileMenuBtn.setAttribute('aria-expanded', String(open));
    mobileMenuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.querySelector('main').hidden = open;
    document.querySelector('footer').hidden = open;
}

mobileMenuBtn.addEventListener('click', () => {
    setMobileMenu(mobileMenu.hidden);
});

window.matchMedia('(min-width: 769px)').addEventListener('change', (event) => {
    if (event.matches) setMobileMenu(false);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileMenu.hidden) {
        setMobileMenu(false);
        mobileMenuBtn.focus();
    }
});
