const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
menuButton.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', open);
});

document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(item => observer.observe(item));

let count = 0;
let toastTimer;
const bagCount = document.querySelector('.bag span');
const toast = document.querySelector('.toast');
document.querySelectorAll('.flavour-card button').forEach(button => button.addEventListener('click', () => {
  count += 1;
  bagCount.textContent = count;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}));

const contactForm = document.querySelector('#contact-form');
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = `Makaranya — ${data.get('subject')}`;
  const body = `Név: ${data.get('name')}\nE-mail: ${data.get('email')}\n\n${data.get('message')}`;
  window.location.href = `mailto:hello@makaranya.hu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
