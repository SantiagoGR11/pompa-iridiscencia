// ============================================================================
// shader.js — Pompa iridiscente (versión estable, con mezcla blanca homogénea)
// Exporta 2 strings GLSL en globalThis: __bubbleVertex__, __bubbleFragPhysical__
// ============================================================================

// ----------------------------- VERTEX SHADER --------------------------------
globalThis.__bubbleVertex__ = /* glsl */`
precision highp float;

varying vec3 vNormalObj;  // normal en espacio OBJETO
varying vec3 vPosObj;     // posición en espacio OBJETO

void main(){
  // Todo en OBJETO (no usamos normalMatrix ni modelView aquí)
  vNormalObj = normalize(normal);
  vPosObj    = position;

  // La proyección final sí usa las matrices estándar para dibujar
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
// ------------------------ FRAGMENT SHADER FÍSICO ----------------------------
globalThis.__bubbleFragPhysical__ = /* glsl */`
precision highp float;

varying vec3 vNormalObj;
varying vec3 vPosObj;

// ---- Parámetros de espesor ----
uniform int   thicknessModel;   // 1: e(φ)=e0+(eavg-e0)*(1-cosφ); 0: exponencial
uniform float e0_nm;            // nm (arriba)
uniform float eavg_nm;          // nm (medio)
uniform float h0;               // nm (solo si thicknessModel==0)
uniform float alpha;            // drenaje (solo si thicknessModel==0)

// ---- Óptica ----
uniform float n1;               // IOR medio 1 (aire)
uniform float n2;               // IOR película
uniform float n3;               // IOR medio 2 (aire)

// ---- Espectro CIE+D65 por textura (81 λ). RGBA = (x̄,ȳ,z̄,E) ----
uniform sampler2D cmfTex;
uniform float wlStart;          // 380
uniform float wlEnd;            // 780
uniform float stepNm;           // 5
uniform float kNorm;            // 1 / sum(E*ybar)*Δλ

uniform float transAnglePower;  // p, típico 1.0..3.0   (control angular de T)
uniform float transAngleFloor;  // A_min, típico 0.05..0.25 (suelo de transmisión)
uniform vec3 Ldir;          // dirección de luz en espacio de vista

uniform bool showTransmission;

const float PI = 3.14159265358979323846;
const float PImed = 1.5757463268;

// -------------------------- Utilidades espectrales --------------------------

const int NS = 81;  // 380..780 nm, paso 5 nm

vec4 sampleSpectral(int i){
  float u = (float(i) + 0.5) / float(NS);  // centro del texel en 1xN
  return texture2D(cmfTex, vec2(u, 0.5));
}

// -------------------------- Modelos de espesor ------------------------------
float thickness_nm_from_cosphi(float cosPhi){
  cosPhi = clamp(cosPhi, -1.0, 1.0);
  return e0_nm + (eavg_nm - e0_nm) * (1.0 - cosPhi);
}

// -------------------------- Fresnel (amplitud) ------------------------------
void fresnel(float ni,float nt,float cosi,
             out float rs,out float rp,out float cost)
{
  float sin2i = max(0.0, 1.0 - cosi*cosi);
  float sin2t = (ni/nt)*(ni/nt)*sin2i;
  if (sin2t > 1.0){
    rs = 1.0; rp = 1.0; cost = 0.0;
    return;
  }
  cost = sqrt(max(0.0, 1.0 - sin2t));
  rs = (ni*cosi - nt*cost) / (ni*cosi + nt*cost);
  rp = (nt*cosi - ni*cost) / (nt*cosi + ni*cost);
}

// -------------------------- XYZ → sRGB --------------------------------------
// XYZ -> LINEAR RGB (no compandado)
vec3 xyz2rgbLinear(vec3 XYZ){
  mat3 M = mat3(
     3.2406, -1.5372, -0.4986,
    -0.9689,  1.8758,  0.0415,
     0.0557, -0.2040,  1.0570
  );
  return max(M * XYZ, vec3(0.0));
}

// LINEAR -> sRGB (compandado)
vec3 linear2srgb(vec3 lin){
  vec3 a = 12.92 * lin;
  vec3 b = 1.055 * pow(max(lin, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
  return mix(a, b, step(vec3(0.0031308), lin));
}

// sRGB -> LINEAR (por si usas envColor != vec3(1.0))
vec3 srgb2linear(vec3 c){
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055)/1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}

// -------------------------- MAIN -------------------------------------------
void main(){
  vec3 N = normalize(vNormalObj);
  vec3 L = normalize(Ldir); 

  float cosInc = clamp(abs(dot(N, L)), 1e-4, 1.0);   

  // Espesor local: cosφ ≈ yLocal (esfera radio 1)
  float cosPhi = clamp(vPosObj.y, -1.0, 1.0);
  float d_nm   = thickness_nm_from_cosphi(cosPhi);
  float d_m    = d_nm * 1e-9;

  // Integración espectral (Airy + Fresnel s/p)
  float X=0.0, Y=0.0, Z=0.0, Rsum=0.0;
  
for (int i = 0; i < NS; ++i) {
  float wl_nm = wlStart + float(i) * stepNm;  // sigues usando tus uniforms
  float wl_m  = wl_nm * 1e-9;

  float rs12, rp12, cos2;
  float n2_disp = n2 + 0.004 * (550.0 - wl_nm) / 170.0;
  fresnel(n1, n2_disp, cosInc, rs12, rp12, cos2);

  float rs23, rp23, cos3;
  fresnel(n2_disp, n3, cos2, rs23, rp23, cos3);

  float phi = 4.0 * PI * n2_disp * d_m * cos2 / wl_m;
  float c = cos(phi), s = sin(phi);

  float a = rs12, b = rs23;
  float Rs = ((a+b*c)*(a+b*c) + (b*s)*(b*s)) /
             ((1.0+a*b*c)*(1.0+a*b*c) + (a*b*s)*(a*b*s));

  a = rp12; b = rp23;
  float Rp = ((a+b*c)*(a+b*c) + (b*s)*(b*s)) /
             ((1.0+a*b*c)*(1.0+a*b*c) + (a*b*s)*(a*b*s));

  float R = 0.5 * (Rs + Rp);
  Rsum += R;

  vec4 spec = sampleSpectral(i);     // (x̄,ȳ,z̄,E)
  float I = spec.a * R;
  X += I * spec.r;
  Y += I * spec.g;
  Z += I * spec.b;
}


// --- Normalización fotométrica e irradiancia reflejada (como ya tenías) ---
float scale = kNorm * stepNm;
vec3 XYZ    = vec3(X, Y, Z) * scale;
vec3 rgbLin = xyz2rgbLinear(XYZ);
vec3 rgbRefl = linear2srgb(rgbLin);  // reflexión en sRGB

// --- Reflectancia media local (ya acumulaste Rsum) ---
float Rmean = Rsum / float(NS);

// --- Transmitancia media local ---
float Tmean = clamp(1.0 - Rmean, 0.0, 1.0);

// --- Ángulo local de vista (incidencia efectiva en pompa) ---
float cosAng = clamp(abs(dot(N, L)), 1e-4, 1.0);


// --- Atenuación angular de la transmisión: A(θ) = mix(floor, 1, (cosθ)^p) ---
float Aang = mix(transAngleFloor, 1.0, pow(cosAng, transAnglePower));

// --- Mezcla FÍSICA: rgb_out = (Tmean * Aang) * white + reflexión ---
float T = clamp(1.0 - Rmean, 0.0, 1.0);

vec3 rgb = rgbRefl;

// --- Transparencia: ligada a Tmean * Aang (película transmite mucho) ---
float alphaOut = showTransmission ? clamp(0.15 + 0.85 * Rmean, 0.15, 1.0) : 0.99;

// --- Salida ---
gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), alphaOut);

}
`;
