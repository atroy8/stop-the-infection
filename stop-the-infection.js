import * as THREE from './Js/three.module.js';
import { OrbitControls } from './Js/OrbitControls.js';


let scene, camera, renderer, controls;
let nodes = [], edges = [], infected = new Set(), dead = new Set(), vaccinated = new Set();
let nodeMeshes = new Map(), lineMeshes = [];
let round = 1, vaccinesPerDay = 3, infectionRate = 1.2, fatalityRate = 0.1;

const successSound = new Audio("success.mp3");
const failureSound = new Audio("failure.mp3");
const vaccinateSound = new Audio("click.mp3");

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 250;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(50, 50, 50);
  scene.add(light);

  const startGameButton = document.getElementById("startGameButton");
  if (startGameButton) {
    startGameButton.addEventListener("click", () => {
      const difficulty = document.getElementById("difficulty").value;
      setDifficulty(difficulty);
      restartGame();
    });
  }

  const restartGameButton = document.getElementById("restartGameButton");
  if (restartGameButton) {
    restartGameButton.addEventListener("click", restartGame);
  }

  const nextRoundButton = document.getElementById("nextRoundButton");
  if (nextRoundButton) {
    nextRoundButton.addEventListener("click", nextRound);
  }

  window.addEventListener('click', onMouseClick);

  // Automatically show nodes when page loads
  restartGame();
}

function setDifficulty(level) {
  switch (level) {
    case "easy":
      infectionRate = 0.8;
      fatalityRate = 0.05;
      break;
    case "hard":
      infectionRate = 1.8;
      fatalityRate = 0.2;
      break;
    default:
      infectionRate = 1.2;
      fatalityRate = 0.1;
  }
}

function restartGame() {
  clearScene();
  round = 1;
  vaccinesPerDay = 3;
  createGraph(20);
  drawGraph();
  updateStatus();
  removeReportCard();
}

function clearScene() {
  nodeMeshes.forEach(mesh => scene.remove(mesh));
  lineMeshes.forEach(line => scene.remove(line));
  nodeMeshes.clear();
  lineMeshes = [];
}

function createGraph(nodeCount) {
  nodes = [];
  edges = [];
  infected.clear();
  dead.clear();
  vaccinated.clear();

  for (let i = 0; i < nodeCount; i++) {
    let x = (Math.random() - 0.5) * 200;
    let y = (Math.random() - 0.5) * 200;
    let z = (Math.random() - 0.5) * 200;
    nodes.push({ id: i, position: new THREE.Vector3(x, y, z) });
  }

  for (let i = 0; i < nodeCount; i++) {
    const connections = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < connections; j++) {
      let target = Math.floor(Math.random() * nodeCount);
      if (target !== i && !edges.some(e => (e.from === i && e.to === target) || (e.from === target && e.to === i))) {
        edges.push({ from: i, to: target });
      }
    }
  }

  const patientZero = Math.floor(Math.random() * nodeCount);
  infected.add(patientZero);
}

function drawGraph() {
  nodeMeshes.clear();
  lineMeshes.forEach(line => scene.remove(line));
  lineMeshes = [];

  nodes.forEach(node => {
    const material = new THREE.MeshBasicMaterial({ color: getNodeColor(node.id) });
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(node.position);
    scene.add(sphere);
    nodeMeshes.set(node.id, sphere);
  });

  edges.forEach(edge => {
    const from = nodes[edge.from].position;
    const to = nodes[edge.to].position;
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
    scene.add(line);
    lineMeshes.push(line);
  });
}

function getNodeColor(id) {
  if (dead.has(id)) return 0x000000;
  if (infected.has(id)) return 0xff0000;
  if (vaccinated.has(id)) return 0x00ff00;
  return 0x0000ff;
}

function updateStatus() {
  const status = document.getElementById("status");
  if (status) {
    status.innerText = `Round: ${round} | Vaccines Left: ${vaccinesPerDay} | Infectiousness: R=${infectionRate.toFixed(2)} Fatality=${(fatalityRate * 100).toFixed(1)}%`;
  }
}

function nextRound() {
  round++;
  infectionRate += 0.1;
  fatalityRate += 0.02;
  vaccinesPerDay = 3;

  const newInfections = new Set();
  const animations = [];

  for (let id of infected) {
    const contacts = edges.filter(e => e.from === id || e.to === id)
      .map(e => (e.from === id ? e.to : e.from));

    for (let contactId of contacts) {
      if (!infected.has(contactId) && !vaccinated.has(contactId) && !dead.has(contactId)) {
        if (Math.random() < infectionRate / contacts.length) {
          newInfections.add(contactId);
          animations.push({ from: id, to: contactId });
        }
      }
    }

    if (Math.random() < fatalityRate) {
      dead.add(id);
    }
  }

  animateSpread(animations, () => {
    for (let id of newInfections) {
      infected.add(id);
    }
    updateGraphColors();
    updateStatus();
    checkGameOver();
  });
}

function animateSpread(animations, onComplete) {
  let index = 0;
  function animateNext() {
    if (index >= animations.length) {
      onComplete();
      return;
    }
    const { from, to } = animations[index];
    const fromPos = nodes[from].position;
    const toPos = nodes[to].position;
    const flash = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([fromPos, toPos]),
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    scene.add(flash);
    setTimeout(() => {
      scene.remove(flash);
      index++;
      animateNext();
    }, 300);
  }
  animateNext();
}

function updateGraphColors() {
  for (let [id, mesh] of nodeMeshes.entries()) {
    mesh.material.color.setHex(getNodeColor(id));
  }
}

function checkGameOver() {
  const total = nodes.length;
  const saved = vaccinated.size;
  const perished = dead.size;
  const active = infected.size;

  if (active === 0 || (saved + perished === total)) {
    const report = document.createElement('div');
    report.id = 'reportCard';
    report.style.position = 'absolute';
    report.style.top = '20%';
    report.style.left = '50%';
    report.style.transform = 'translateX(-50%)';
    report.style.background = 'white';
    report.style.padding = '30px';
    report.style.border = '2px solid black';
    report.style.borderRadius = '10px';
    report.style.zIndex = '1000';
    report.style.textAlign = 'center';
    report.style.fontSize = '18px';
    report.style.boxShadow = '0px 0px 15px rgba(0,0,0,0.3)';

    let message = `Game Over!<br><br><strong>Rounds:</strong> ${round}<br><strong>Total Nodes:</strong> ${total}<br><strong>Vaccinated (Saved):</strong> ${saved}<br><strong>Deceased:</strong> ${perished}`;

    if (active === 0 && saved + perished === total) {
      successSound.play();
      message = "🎉 <strong>Congratulations!</strong> You stopped the infection!<br><br>" + message;
    } else if (perished === total) {
      failureSound.play();
      message = "💀 <strong>Oh no!</strong> Everyone perished.<br><br>" + message;
    }

    report.innerHTML = message + '<br><br><button onclick="document.getElementById(\'reportCard\').remove()">Close</button>';
    document.body.appendChild(report);
  }
}

function removeReportCard() {
  const report = document.getElementById("reportCard");
  if (report) report.remove();
}

function onMouseClick(event) {
  event.preventDefault();
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(Array.from(nodeMeshes.values()));
  if (intersects.length > 0 && vaccinesPerDay > 0) {
    const selectedMesh = intersects[0].object;
    for (let [id, mesh] of nodeMeshes.entries()) {
      if (mesh === selectedMesh && !vaccinated.has(id) && !dead.has(id)) {
        vaccinated.add(id);
        vaccinesPerDay--;
        vaccinateSound.play();
        updateGraphColors();
        updateStatus();
        break;
      }
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
animate();
