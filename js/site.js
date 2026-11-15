document.querySelectorAll('[data-copyright-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
});

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

const currentPath = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
const projectPaths = ['/satellite', '/hangman', '/movie', '/language'];
const activePath = projectPaths.includes(currentPath) ? '/projects' : currentPath;
document.querySelectorAll('.nav a, .mobile-menu a').forEach((link) => {
    const linkPath = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (linkPath === activePath) {
        link.setAttribute('aria-current', activePath === currentPath ? 'page' : 'location');
    } else {
        link.removeAttribute('aria-current');
    }
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
