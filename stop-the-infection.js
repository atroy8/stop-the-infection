// Stop the Infection Game with Difficulty Setting, Start/Restart Controls, 3D Rotation, and Report UI
// Uses Three.js with OrbitControls for interaction

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.175.0/examples/jsm/controls/OrbitControls.js';

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

  document.getElementById("startGameButton").addEventListener("click", () => {
    const difficulty = document.getElementById("difficulty").value;
    setDifficulty(difficulty);
    restartGame();
  });

  document.getElementById("restartGameButton").addEventListener("click", () => {
    restartGame();
  });

  document.getElementById("nextRoundButton").addEventListener("click", nextRound);
  window.addEventListener('click', onMouseClick);

  // Automatically generate network when page loads
  restartGame();
}

// ...rest of the code remains unchanged

init();
animate();
