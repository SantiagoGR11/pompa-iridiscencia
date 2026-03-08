// 0) Importa Three.js desde CDN (no necesitas archivo local)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

// 2) Opcional: mostrar errores de shader en consola (después del import)
if (THREE && THREE.WebGLProgram) {
  THREE.WebGLProgram.prototype.getShaderInfoLog = function () {
    return this.__log || "";
  };
}

// 3) Escena básica
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1f2230);

const container = document.getElementById("simContainer");

const camera = new THREE.PerspectiveCamera(60,container.clientWidth / container.clientHeight,0.2,100);
// === Cámara en coordenadas esféricas (radio fijo) ===
const R = 3.0;                 // distancia fija
const thetaSlider = document.getElementById('thetaSlider');
const rollSlider  = document.getElementById('rollSlider');   // 0..360 (roll)

const thetaVal    = document.getElementById('thetaVal');
const rollVal  = document.getElementById('rollVal');

// Estado inicial
let thetaDeg = Number(thetaSlider.value); // [-89..89]
let rollDeg  = Number(rollSlider?.value ?? 0);

// Conversión grados->radianes
const deg2rad = d => d * Math.PI / 180.0;

// Coloca la cámara según (phi, theta)
function setCameraFromSpherical() {
  const theta = deg2rad(thetaDeg);        // elevación
  const gamma = deg2rad(rollDeg);    // roll (0..2π)

  // Sólida parametrización (elevación = ángulo sobre el plano XZ)
  // x = 0
  // y = R * sin(theta)
  // z = R * cos(theta)
  const x = 0;
  const y = R * Math.sin(theta);
  const z = R * Math.cos(theta);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
  camera.rotateZ(gamma);
  camera.updateProjectionMatrix();

  // UI
  thetaVal.textContent = thetaDeg.toFixed(0);
  rollVal.textContent = rollDeg.toFixed(0);
}

// Listeners UI
thetaSlider.addEventListener('input', () => {
  thetaDeg = Number(thetaSlider.value);
  setCameraFromSpherical();
});
rollSlider.addEventListener('input', () => {
  rollDeg = Number(rollSlider.value);
  setCameraFromSpherical();
});

// Colocar cámara al iniciar
setCameraFromSpherical();

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth,container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById("simContainer").appendChild(renderer.domElement);

// 4) Ver logs de shaders
renderer.debug.checkShaderErrors = true;


function captureCanvasPNG(maxWidth = 1000) {
  const src = renderer.domElement;
  // Si no queremos reescalar, devolvemos directamente:
  if (src.width <= maxWidth) return src.toDataURL("image/png");

  // Reescalar a ancho máximo (para URL más corta)
  const scale = maxWidth / src.width;
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const ctx = tmp.getContext('2d');
  ctx.drawImage(src, 0, 0, w, h);
  return tmp.toDataURL("image/png");
}


// 6) Uniforms
const uniforms = {
  n1: { value: 1.0 },
  n2: { value: 1.33 },
  n3: { value: 1.0 },

  Ldir: { value: new THREE.Vector3(0,1,0) },

  transAnglePower: { value: 1.5 },
  transAngleFloor: { value: 0.15 },

  e0_nm: { value: 10.0 },
  eavg_nm: { value: 1000.0 },

  showTransmission: { value: true }
};

// 7) Material: empieza con el TEST (colorines garantizados)
const material = new THREE.ShaderMaterial({
  vertexShader:   globalThis.__bubbleVertex__,
  fragmentShader: globalThis.__bubbleFragPhysical__,
  uniforms,                      // tus uniforms físicos (n1,n2,n3,h0/alpha o e0/eavg, cmfTex, wl, k_norm...)
  side: THREE.DoubleSide,
  transparent: true,             // ¡importante!
  depthWrite: false              // para que el blending funcione bien
});


// 8) Malla
const geometry = new THREE.SphereGeometry(1, 256, 256);
const bubble = new THREE.Mesh(geometry, material);
scene.add(bubble);

// 9) Resize
function resize(){

 const w = container.clientWidth;
 const h = container.clientHeight;

 camera.aspect = w/h;
 camera.updateProjectionMatrix();

 renderer.setSize(w,h);
}

window.addEventListener("resize",resize);
resize();

// ======== 1) Datos espectrales (81 muestras: 380..780 nm, paso 5 nm) ========
const WL_START = 380, WL_END = 780, STEP = 5;
const N = ((WL_END - WL_START) / STEP) + 1;

// Arrays reales (FLOAT32) longitud N:
const cie_x = new Float32Array([
  0.001368,0.002236,0.004243,0.007650,0.014310,0.023190,0.043510,0.077630,0.134380,0.214770,
  0.283900,0.328500,0.348280,0.348060,0.336200,0.318700,0.290800,0.251100,0.195360,0.142100,
  0.095640,0.057950,0.032010,0.014700,0.004900,0.002400,0.009300,0.029100,0.063270,0.109600,
  0.165500,0.225750,0.290400,0.359700,0.433450,0.512050,0.594500,0.678400,0.762100,0.842500,
  0.916300,0.978600,1.026300,1.056700,1.062200,1.045600,1.002600,0.938400,0.854450,0.751400,
  0.642400,0.541900,0.447900,0.360800,0.283500,0.218700,0.164900,0.121200,0.087400,0.063600,
  0.046770,0.032900,0.022700,0.015840,0.011359,0.008111,0.005790,0.004109,0.002899,0.002049,
  0.001440,0.001000,0.000690,0.000476,0.000332,0.000235,0.000166,0.000117,0.000083,0.000059,
  0.000042
]);
const cie_y = new Float32Array([
  0.000039,0.000064,0.000120,0.000217,0.000396,0.000640,0.001210,0.002180,0.004000,0.007300,
  0.011600,0.016840,0.023000,0.029800,0.038000,0.048000,0.060000,0.073900,0.090980,0.112600,
  0.139020,0.169300,0.208020,0.258600,0.323000,0.407300,0.503000,0.608200,0.710000,0.793200,
  0.862000,0.914850,0.954000,0.980300,0.994950,1.000000,0.995000,0.978600,0.952000,0.915400,
  0.870000,0.816300,0.757000,0.694900,0.631000,0.566800,0.503000,0.441200,0.381000,0.321000,
  0.265000,0.217000,0.175000,0.138200,0.107000,0.081600,0.061000,0.044580,0.032000,0.023200,
  0.017000,0.011920,0.008210,0.005723,0.004102,0.002929,0.002091,0.001484,0.001047,0.000740,
  0.000520,0.000361,0.000249,0.000172,0.000120,0.000085,0.000060,0.000042,0.000030,0.000021,
 0.000015
]);
const cie_z = new Float32Array([
  0.006450,0.010550,0.020050,0.036210,0.067850,0.110200,0.207400,0.371300,0.645600,1.039050,
  1.385600,1.622960,1.747060,1.782600,1.772110,1.744100,1.669200,1.528100,1.287640,1.041900,
  0.812950,0.616200,0.465180,0.353300,0.272000,0.212300,0.158200,0.111700,0.078250,0.057250,
  0.042160,0.029840,0.020300,0.013400,0.008750,0.005750,0.003900,0.002750,0.002100,0.001800,
  0.001650,0.001400,0.001100,0.001000,0.000800,0.000600,0.000340,0.000240,0.000190,0.000100,
  0.000050,0.000030,0.000020,0.000010,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,
  0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,
  0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,0.000000,
  0.000000
]);
const d65   = new Float32Array([
  49.98,52.31,54.65,68.70,82.75,87.12,91.49,92.46,93.43,90.06,
  86.68,95.77,104.86,110.94,117.01,117.41,117.81,116.34,114.86,115.39,
  115.92,112.37,108.81,109.08,109.35,108.58,107.80,106.30,104.79,106.24,
  107.69,106.05,104.41,104.23,104.05,102.02,100.00,98.17,96.33,96.06,
  95.79,92.24,88.69,89.35,90.01,89.80,89.60,88.65,87.70,85.49,
  83.29,83.49,83.70,81.86,80.03,80.12,80.21,81.25,82.28,80.28,
  78.28,74.00,69.72,70.67,71.61,72.98,74.35,67.98,61.60,65.44,
  69.28,72.30,75.32,69.67,64.02,57.10,50.19,54.17,58.15,57.85,57.55
]);

// Normalización k = 1 / sum(E(λ)*ybar(λ)*Δλ)
let sumEy = 0;
for (let i=0;i<N;i++) sumEy += d65[i]*cie_y[i];
const delta = STEP; // nm
const k_norm = 1.0 / (sumEy * delta);

// Empaquetamos en RGBA: R=x̄, G=ȳ, B=z̄, A=E_D65
const data = new Float32Array(N*4);
for (let i=0;i<N;i++){
  data[4*i+0] = cie_x[i];
  data[4*i+1] = cie_y[i];
  data[4*i+2] = cie_z[i];
  data[4*i+3] = d65[i];
}

// Texture 1D (como 2D de 1xN), Float32
const cmfTex = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.FloatType);
cmfTex.needsUpdate = true;
cmfTex.magFilter = THREE.NearestFilter;       
cmfTex.minFilter = THREE.NearestFilter;       
cmfTex.generateMipmaps = false;           
cmfTex.wrapS = THREE.ClampToEdgeWrapping;    
cmfTex.wrapT = THREE.ClampToEdgeWrapping;


// Pasa uniforms nuevos al material (añade a los existentes)
material.uniforms.cmfTex = { value: cmfTex };
material.uniforms.wlStart = { value: WL_START };
material.uniforms.wlEnd   = { value: WL_END };
material.uniforms.stepNm  = { value: STEP };
material.uniforms.kNorm   = { value: k_norm };

material.uniforms.transAnglePower = { value: 2.0 };  // p, típico 1.0..3.0   (control angular de T)
material.uniforms.transAngleFloor = { value: 0.1 };  // A_min, típico 0.05..0.25 (suelo de transmisión)

// ======== SLIDERS FÍSICOS ========
const n2Slider   = document.getElementById("n2Slider");
const e0Slider   = document.getElementById("e0Slider");
const eavgSlider = document.getElementById("eavgSlider");
const transparencyToggle = document.getElementById("transparencyToggle");

// Los <span> que muestran el valor
const n2Val   = document.getElementById("n2Val");
const e0Val   = document.getElementById("e0Val");
const eavgVal = document.getElementById("eavgVal");

// Inicializa los span con el valor actual de los sliders
n2Val.textContent   = Number(n2Slider.value).toFixed(2);
e0Val.textContent   = Number(e0Slider.value).toFixed(0);
eavgVal.textContent = Number(eavgSlider.value).toFixed(0);

// Listeners: actualizan uniform y número visible
n2Slider.addEventListener("input", () => {
  const v = Number(n2Slider.value);
  material.uniforms.n2.value = v;      
  n2Val.textContent = v.toFixed(2);       
});

e0Slider.addEventListener("input", () => {
  const v = Number(e0Slider.value);
  material.uniforms.e0_nm.value = v;    
  e0Val.textContent = v.toFixed(0);   
});

eavgSlider.addEventListener("input", () => {
  const v = Number(eavgSlider.value);
  material.uniforms.eavg_nm.value = v;  
  eavgVal.textContent = v.toFixed(0);   
});

transparencyToggle.addEventListener("change", () => {
  material.uniforms.showTransmission.value = transparencyToggle.checked;
});

// === Botón "Descargar certificado": abre certificate.html con los valores actuales ===
const generateCert = document.getElementById('descargar');
const nombreInput  = document.getElementById('nombre');
const pompaInput   = document.getElementById('pompa');

function waitImagesLoaded(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(img =>
      img.complete ? Promise.resolve() :
      new Promise(res => { img.onload = img.onerror = () => res(); })
    )
  );
}

async function downloadCertificatePDF() {
  // 1) Datos actuales
  const nombre = (document.getElementById('nombre')?.value || '').trim() || '[NOMBRE]';
  const pompa  = (document.getElementById('pompa')?.value  || '').trim() || '[NOMBRE DE LA POMPA]';
  const n2   = Number(material.uniforms.n2.value).toFixed(2);
  const e0   = Number(material.uniforms.e0_nm.value).toFixed(0);
  const eavg = Number(material.uniforms.eavg_nm.value).toFixed(0);
  const refl = material.uniforms.showTransmission?.value ? 'Si' : 'No';

  // 2) Captura del canvas (redimensionado para PDF)
  const imgDataURL = captureCanvasPNG(600); // asegura que tienes preserveDrawingBuffer:true

  // 3) Montaje del certificado en contenedor oculto
  const root = document.getElementById('certRoot');
  root.innerHTML = `
  <div id="certSheet" style="
    width:1123px;height:794px;box-sizing:border-box;padding:32px 40px;
    background: radial-gradient(1200px 800px at 30% 20%, #2a1e65 0%, #1b1740 40%, #0b1d34 100%);
    border:2px solid rgba(255,255,255,.15); border-radius:8px; color:#e9e7f4;
    font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; position:relative;">

    <h2 class="cert-title">
      CERTIFICADO DE POMPA IRIDISCENTE
    </h2>

    <p class="cert-subtitle">
      Este documento certifica que <b style="color:#fff">${nombre}</b> ha generado la pompa
      <b style="color:#fff">${pompa}</b> mediante la web de simulación física recogida en el QR.
    </p>

    <div style="position:absolute;right:120px;left:120px;bottom:180px;display:grid;grid-template-columns:1.05fr 1fr;gap:28px;align-items:start;">
      <div>
        <div style="font-weight:700;margin:0 0 8px;font-size:24px;">Datos de la pompa:</div>
        <ul style="list-style:none;padding:0;margin:15px 0 0;">
          <li style="display:flex;gap:10px;margin:12px 0;line-height:1.2;font-size:20px;">
            <span style="width:12px;flex:0 0 12px;color:#fff;font-weight:700;margin-top:-1px;">•</span>
            Índice de refracción: <span style="color:#fff;font-weight:600;margin-left:6px">${n2}</span>
          </li>
          <li style="display:flex;gap:10px;margin:10px 0;line-height:1.2;font-size:20px;">
            <span style="width:12px;flex:0 0 12px;color:#fff;font-weight:700;margin-top:-1px;">•</span>
            Espesor superior: <span style="color:#fff;font-weight:600;margin-left:6px">${e0}</span> nm
          </li>
          <li style="display:flex;gap:10px;margin:10px 0;line-height:1.2;font-size:20px;">
            <span style="width:12px;flex:0 0 12px;color:#fff;font-weight:700;margin-top:-1px;">•</span>
            Espesor promedio: <span style="color:#fff;font-weight:600;margin-left:6px">${eavg}</span> nm
          </li>
          <li style="display:flex;gap:10px;margin:10px 0;line-height:1.2;font-size:20px;">
            <span style="width:12px;flex:0 0 12px;color:#fff;font-weight:700;margin-top:-1px;">•</span>
            Efectos de la reflectancia: <span style="color:#fff;font-weight:600;margin-left:6px">${refl}</span>
          </li>
        </ul>
      </div>

      <div style="
        width:400px;
        aspect-ratio: 400/380;
        border:10px solid #fff;
        border-radius:8px;
        display:grid;
        place-items:center;
        overflow:hidden;
        background:
          radial-gradient(1250px 500px at 60% 40%, rgba(255,255,255,.12) 0, rgba(255,255,255,.04) 30%, rgba(255,255,255,.02) 60%, transparent 100%),
          linear-gradient(140deg, rgba(255,255,255,.07) 0, rgba(255,255,255,.01) 70%);
      ">
        <img src="${imgDataURL}" alt="Vista de la pompa"
            style="object-fit:contain; object-position:center;" />
      </div>
    </div>

    <div style="position:absolute;left:40px;right:40px;bottom:40px;display:grid;grid-template-columns:1fr auto auto;gap:22px;align-items:end;color:#cdd0e6;font-size:13px;">
      <div style="white-space:pre-line">
Desarrollado por:
• Dávila Muñoz, Mario
• Fanjul Álvarez, Ángela
• García Rodríguez, Santiago
• García Tuñón, Samuel
      </div>

      <div style="display:grid;justify-items:center;gap:8px;">
        <div>Más información en:</div>
        <div style="width:96px;height:96px;border:2px solid rgba(255,255,255,.35);border-radius:6px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.03);">
          <img src="qrs/complementario.PNG" alt="QR info" style="width:100%;height:100%;object-fit:cover;" />
        </div>
      </div>
      <div style="display:grid;justify-items:center;gap:8px;">
        <div>Crea tu pompa en:</div>
        <div style="width:96px;height:96px;border:2px solid rgba(255,255,255,.35);border-radius:6px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.03);">
          <img src="qrs/web.PNG" alt="QR web" style="width:100%;height:100%;object-fit:cover;" />
        </div>
      </div>
    </div>
  </div>`;

  // 4) Espera a que las <img> se carguen
  const sheet = document.getElementById('certSheet');
  await waitImagesLoaded(sheet);

  // 5) Rasteriza (escala 2 para nitidez)
  const canvas = await html2canvas(sheet, { backgroundColor: null, scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  // 6) PDF A4 apaisado
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();   // 297 mm
  const pageH = doc.internal.pageSize.getHeight();  // 210 mm
  const imgWmm = pageW;
  const imgHmm = (canvas.height / canvas.width) * imgWmm;
  const offsetY = (pageH - imgHmm) / 2;

  doc.addImage(imgData, 'PNG', 0, Math.max(0, offsetY), imgWmm, imgHmm, undefined, 'FAST');
  
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Certificado_${pompa.replace(/\s+/g,'_')}.pdf`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

generateCert.onclick = () => {
  requestAnimationFrame(() => downloadCertificatePDF());
};

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

}
animate();