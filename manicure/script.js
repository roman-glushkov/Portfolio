const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav');

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

const form = document.querySelector('#bookingForm');
const success = document.querySelector('.form-success');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  success.style.display = 'block';
  form.reset();
});
