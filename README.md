
# SOAP BUBBLE IRIDESCENCE SIMULATOR: Thin-film interference simulation in a soap bubble

This project implements a physics-based interactive simulation of the iridescence observed in soap bubbles.
The model reproduces thin-film interference by combining Fresnel reflection coefficients, phase delay in thin films, and spectral integration across the visible range.

The poster included in this repository was created for the Optics course at the University of Oviedo and is written in Spanish.
However, the interactive simulator and documentation, written in English, provide the necessary context for international readers.

---

## 🌐 **Interactive Simulation**

The simulation can be explored directly in the browser:

👉 **[Open the web simulation](https://santiagogr11.github.io/pompa-iridiscencia/)**

---

## 📄 **Proyect poster**

The full scientific poster associated with this project is available here:

👉 **[Download the poster (PDF)](visuals/POSTER_Calculadora-Laser.pdf)**

<p align="center">
  <img src="visuals/Poster_Preview.png" width="700">
</p>

---

## 🔍 **Abstract**

Soap bubbles **exhibit vivid iridescent colours due to interference** in thin liquid films.
Because the film thickness is typically on the order of hundreds of nanometers, reflections from the two interfaces of the film interfere constructively or destructively depending on wavelength and viewing angle.

This project implements a physically motivated model of this phenomenon using:
 - Fresnel reflection coefficients for the two film interfaces
 - Phase delay due to optical path difference in the film
 - Spectral integration across the visible range
 - Conversion from CIE XYZ tristimulus values to sRGB
The resulting colour distribution is computed in real time through a **GPU fragment shader**, allowing interactive exploration of the parameters governing the iridescence.

---

## 🎯 **Scientific Objective**

 - Model the iridescence of a soap bubble using thin-film interference theory.
 - Simulate the wavelength-dependent reflectance of the film.
 - Convert spectral reflectance into perceptual colour through CIE colour matching functions.
 - Provide an interactive tool to explore how physical parameters affect the observed colours.

---

## ⚙️ **Physical Model**

The interference arises from the optical path difference between the first two reflected rays:

$$
\Delta = 2 n e \cos \theta_t
$$

The resulting phase difference is:

$$
\delta = \frac{2\pi}{\lambda}(2 n e \cos\theta_t) + \pi
$$

Constructive interference occurs when:

$$
\delta = 2m\pi
$$

The reflected intensity depends on the Fresnel reflection coefficients of the interfaces.

The perceived colour is obtained through spectral integration:

$$
I = \int_{\lambda_{vis}} R(\lambda),E(\lambda),d\lambda
$$

where:

(R($$\lambda$$)) is the spectral reflectance of the film

(E($$\lambda$$)) is the spectral power distribution of the illumination.

---

## 🧠 **Rendering Approach**

The simulation is implemented using **WebGL shaders**.

Key elements of the rendering pipeline:
 1. Compute local film thickness across the bubble surface.
 2. Evaluate Fresnel reflection coefficients for each wavelength.
 3. Calculate interference phase shift.
 4. Integrate reflectance across the visible spectrum.
 5. Convert the resulting XYZ colour to sRGB.

This computation is executed **per-pixel in the fragment shader**, enabling real-time visualisation.

---

## 📂 **Project Structure**

pompa-iridiscencia/  
│   
│  
├── visuals/   
│   ├── POSTER_Iridescent-Bubble.pdf      # Proyect presentation  
│   └── Poster_Preview.png                # Proyect prewiew  
│  
├── docs/   
│   ├── index.html         
│   ├── style.css      
│   ├── app.js     
│   └── shader.js        
│  
├── README.md  
├── LICENSE  
├── .gitignore  
└── requirements.txt  

---

## 🚀 **How to Run**

No installation is required.

 1. Clone the repository:
    git clone https://github.com/SantiagoGR11/pompa-iridiscencia.git
 2. Open the project folder.
 3. Launch index.html in a browser.

Because the project runs entirely in the browser, no external dependencies need to be installed.

---

## 🛠 **Technologies**

 - JavaScript (ES6)
 - WebGL
 - Three.js
 - GLSL shaders
 - html2canvas
 - jsPDF

---

## 📊 **Features**

 - Real-time thin-film interference simulation
 - Physically-motivated reflectance model
 - Spectral integration across the visible range
 - Interactive control of physical parameters
 - Export of simulation results as a certificate

---

## 📌 **Possible Extensions**

- Introduce time-dependent **gravitational drainage** of the film thickness.
 - Implement **multiple internal reflections** beyond the first two beams.
 - Include background illumination to reproduce real viewing conditions.

---

## 👨‍🔬 **Authors**

Developed by:
 - Mario Dávila Muñoz
 - Ángela Fanjul Álvarez
 - Santiago García Rodríguez
 - Samuel García Tuñón

Physics Degree - University of Oviedo

---

## 📬 **Connect with me**

- https://www.linkedin.com/in/santiago-garc%C3%ADa-rodr%C3%ADguez-b8aa58240/
- https://github.com/SantiagoGR11
