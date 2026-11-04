document.querySelectorAll('[data-copyright-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
});

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const projectsButton = document.getElementById('dropbtn');
const projectsMenu = document.getElementById('myDropdown');

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

function setProjectsMenu(open) {
    projectsMenu.classList.toggle('show', open);
    projectsButton.setAttribute('aria-expanded', String(open));
}

projectsButton.addEventListener('click', () => {
    setProjectsMenu(!projectsMenu.classList.contains('show'));
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown')) setProjectsMenu(false);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (projectsMenu.classList.contains('show')) {
            setProjectsMenu(false);
            projectsButton.focus();
        } else if (!mobileMenu.hidden) {
            setMobileMenu(false);
            mobileMenuBtn.focus();
        }
    }
});
