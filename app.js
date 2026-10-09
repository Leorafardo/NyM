// Configura aquí tu bin de JSONBin (el bin debe contener inicialmente: {"ranking": []})
const JSONBIN_BIN_ID = '6ac8944aac6210605a21c17f';
const JSONBIN_API_KEY = '$2a$10$EbeObdWYgrqfGyQw.2zVBu90jubK1/Kt75F04Dbmf2GpX3hr7ZCvW';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

const MAX_PREGUNTAS = 20;
const PUNTOS_BASE = 100;
const PUNTOS_BONUS_MAX = 50; // bonus por rapidez
const SEGUNDOS_POR_PREGUNTA = 15;
const PAUSA_FEEDBACK_MS = 900;

const $ = (id) => document.getElementById(id);
const botones = [...document.querySelectorAll('#opciones .opcion')];

let preguntas = [];
let indice = 0;
let puntos = 0;
let restante = 0;
let timer = null;
let bloqueado = false;

async function init() {
  try {
    const res = await fetch('./preguntas.json');
    if (!res.ok) throw new Error(res.status);
    const todas = await res.json();
    preguntas = mezclar(todas).slice(0, MAX_PREGUNTAS);
    $('cargando').hidden = true;
    empezar();
  } catch (e) {
    $('cargando').textContent = 'No se pudieron cargar las preguntas.';
  }
}

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function empezar() {
  indice = 0;
  puntos = 0;
  $('pantalla-final').hidden = true;
  $('pantalla-juego').hidden = false;
  $('total-preguntas').textContent = preguntas.length;
  mostrarPregunta();
}

function mostrarPregunta() {
  const p = preguntas[indice];
  bloqueado = false;
  $('num-pregunta').textContent = indice + 1;
  $('puntos').textContent = puntos;
  $('pregunta').textContent = p.pregunta;
  botones.forEach((b, i) => {
    b.textContent = p.opciones[i] ?? '';
    b.hidden = p.opciones[i] === undefined;
    b.disabled = false;
    b.className = 'opcion';
  });
  iniciarTemporizador();
}

function iniciarTemporizador() {
  clearInterval(timer);
  restante = SEGUNDOS_POR_PREGUNTA;
  $('tiempo').textContent = restante;
  timer = setInterval(() => {
    restante--;
    $('tiempo').textContent = restante;
    if (restante <= 0) responder(-1);
  }, 1000);
}

function responder(elegida) {
  if (bloqueado) return;
  bloqueado = true;
  clearInterval(timer);
  const correcta = preguntas[indice].correcta;
  if (elegida === correcta) {
    puntos += PUNTOS_BASE + Math.round((restante / SEGUNDOS_POR_PREGUNTA) * PUNTOS_BONUS_MAX);
    $('puntos').textContent = puntos;
  }
  botones.forEach((b, i) => {
    b.disabled = true;
    if (i === correcta) b.classList.add('correcta');
    else if (i === elegida) b.classList.add('incorrecta');
  });
  setTimeout(siguiente, PAUSA_FEEDBACK_MS);
}

function siguiente() {
  indice++;
  if (indice < preguntas.length) mostrarPregunta();
  else terminar();
}

function terminar() {
  $('pantalla-juego').hidden = true;
  $('pantalla-final').hidden = false;
  $('puntos-finales').textContent = puntos;
  $('form-nombre').hidden = false;
  $('ranking-box').hidden = true;
  $('estado').textContent = '';
  $('nombre').value = '';
  $('nombre').focus();
}

const cabeceras = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_API_KEY,
};

async function obtenerRanking() {
  const res = await fetch(`${JSONBIN_URL}/latest`, { headers: cabeceras });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.record?.ranking) ? data.record.ranking : [];
}

async function guardarPuntuacion(nombre, puntos) {
  const ranking = await obtenerRanking();
  ranking.push({ nombre, puntos });
  const res = await fetch(JSONBIN_URL, {
    method: 'PUT',
    headers: cabeceras,
    body: JSON.stringify({ ranking }),
  });
  if (!res.ok) throw new Error(`PUT ${res.status}`);
}

function mostrarRanking(ranking) {
  const top = [...ranking].sort((a, b) => b.puntos - a.puntos).slice(0, 10);
  const ol = $('ranking');
  ol.replaceChildren(...top.map((r) => {
    const li = document.createElement('li');
    const n = document.createElement('span');
    const p = document.createElement('span');
    n.textContent = r.nombre;
    p.textContent = r.puntos;
    li.append(n, p);
    return li;
  }));
  $('ranking-box').hidden = false;
}

$('form-nombre').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = $('nombre').value.trim();
  if (!nombre) return;
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('estado').textContent = 'Guardando…';
  try {
    await guardarPuntuacion(nombre, puntos);
    const ranking = await obtenerRanking();
    $('form-nombre').hidden = true;
    $('estado').textContent = '';
    mostrarRanking(ranking);
  } catch (err) {
    $('estado').textContent = 'Error al conectar con JSONBin. Inténtalo de nuevo.';
  } finally {
    btn.disabled = false;
  }
});

botones.forEach((b, i) => b.addEventListener('click', () => responder(i)));
$('reiniciar').addEventListener('click', () => {
  preguntas = mezclar(preguntas);
  empezar();
});

init();
