/* Mini engine WebGL2: hình khối bo tròn, ánh sáng bán cầu + nắng, đổ bóng mềm (PCF) */
(function () {
'use strict';
/* ---------- Toán ma trận (column-major) ---------- */
const M4 = {
  ident: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) { const r = new Array(16); for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + i] * b[c * 4 + k]; r[c * 4 + i] = s; } return r; },
  persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
  ortho(l, r, b, t, n, f) { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; },
  lookAt(e, c, u) {
    let z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross(u, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  },
  // T * Ry * Rx * Rz * S
  trs(tx, ty, tz, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
    const cy = Math.cos(ry), syy = Math.sin(ry), cx = Math.cos(rx), sxx = Math.sin(rx), cz = Math.cos(rz), szz = Math.sin(rz);
    const Ry = [cy, 0, -syy, 0, 0, 1, 0, 0, syy, 0, cy, 0, 0, 0, 0, 1];
    const Rx = [1, 0, 0, 0, 0, cx, sxx, 0, 0, -sxx, cx, 0, 0, 0, 0, 1];
    const Rz = [cz, szz, 0, 0, -szz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    let m = M4.mul(Ry, M4.mul(Rx, Rz));
    m = M4.mul(m, [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]);
    m[12] = tx; m[13] = ty; m[14] = tz; return m;
  }
};
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function normalMat(m) { // inverse-transpose 3x3
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C || 1;
  const inv = [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map(x => x / det);
  return [inv[0], inv[3], inv[6], inv[1], inv[4], inv[7], inv[2], inv[5], inv[8]]; // transpose
}

/* ---------- Màu ---------- */
const colCache = {};
function col(hex) {
  if (Array.isArray(hex)) return hex;
  if (colCache[hex]) return colCache[hex];
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const v = [0, 2, 4].map(i => Math.pow(parseInt(h.substr(i, 2), 16) / 255, 2.2));
  return (colCache[hex] = v);
}

/* ---------- Hình khối (danh sách tam giác: P, N, U) ---------- */
const P = {};
function prim() { return { P: [], N: [], U: [] }; }
function tri(o, a, b, c) { for (const v of [a, b, c]) { o.P.push(v.p[0], v.p[1], v.p[2]); o.N.push(v.n[0], v.n[1], v.n[2]); o.U.push(v.u ? v.u[0] : 0, v.u ? v.u[1] : 0); } }
function quadv(o, a, b, c, d) { tri(o, a, b, c); tri(o, a, c, d); }

P.rbox = (w, h, d, r = .05, seg = 2) => {
  const o = prim(), hs = [w / 2, h / 2, d / 2];
  r = Math.max(0, Math.min(r, hs[0] - 1e-3, hs[1] - 1e-3, hs[2] - 1e-3));
  const axis = hh => { const a = []; for (let k = 0; k <= seg; k++) a.push(-hh + r * k / seg); for (let k = seg; k >= 0; k--) a.push(hh - r * k / seg); return a; };
  const vert = q => {
    const inner = q.map((v, i) => Math.max(-(hs[i] - r), Math.min(hs[i] - r, v)));
    let n = [q[0] - inner[0], q[1] - inner[1], q[2] - inner[2]]; const l = Math.hypot(...n);
    n = l < 1e-6 ? null : n.map(x => x / l);
    return { p: n ? inner.map((v, i) => v + n[i] * r) : q, n };
  };
  for (let ax = 0; ax < 3; ax++) for (const s of [-1, 1]) {
    const j = (ax + 1) % 3, k = (ax + 2) % 3, A = axis(hs[j]), B = axis(hs[k]);
    const fn = [0, 0, 0]; fn[ax] = s;
    const pt = (a, b) => { const q = [0, 0, 0]; q[ax] = s * hs[ax]; q[j] = a; q[k] = b; const v = vert(q); if (!v.n) v.n = fn; return v; };
    for (let x = 0; x < A.length - 1; x++) for (let y = 0; y < B.length - 1; y++) {
      if (A[x + 1] - A[x] < 1e-6 || B[y + 1] - B[y] < 1e-6) continue;
      quadv(o, pt(A[x], B[y]), pt(A[x + 1], B[y]), pt(A[x + 1], B[y + 1]), pt(A[x], B[y + 1]));
    }
  }
  return o;
};
P.lathe = (pts, seg = 16) => { // pts: [[r, y], ...] từ dưới lên
  const o = prim(), nrm = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dr = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dr, dy) || 1; return [dy / l, -dr / l];
  });
  for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < seg; s++) {
    const a0 = s / seg * Math.PI * 2, a1 = (s + 1) / seg * Math.PI * 2;
    const v = (k, a) => ({ p: [Math.cos(a) * pts[k][0], pts[k][1], Math.sin(a) * pts[k][0]], n: [Math.cos(a) * nrm[k][0], nrm[k][1], Math.sin(a) * nrm[k][0]], u: [s / seg, k / pts.length] });
    quadv(o, v(i, a0), v(i + 1, a0), v(i + 1, a1), v(i, a1));
  }
  return o;
};
P.cyl = (rt, rb, h, seg = 16, caps = true) => {
  const o = P.lathe(caps ? [[0, 0], [rb * .999, 0], [rb, 0.0001], [rt, h - .0001], [rt * .999, h], [0, h]] : [[rb, 0], [rt, h]], seg);
  return o;
};
P.sphere = (r, seg = 14) => {
  const pts = []; for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + Math.PI * i / seg; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  pts[0][0] = 0; pts[pts.length - 1][0] = 0;
  const o = prim();
  for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < seg * 2; s++) {
    const a0 = s / (seg * 2) * Math.PI * 2, a1 = (s + 1) / (seg * 2) * Math.PI * 2;
    const v = (k, a) => { const p = [Math.cos(a) * pts[k][0], pts[k][1], Math.sin(a) * pts[k][0]]; return { p, n: norm(p) }; };
    quadv(o, v(i, a0), v(i + 1, a0), v(i + 1, a1), v(i, a1));
  }
  return o;
};
P.frustum = (wb, db, wt, dt, h, dz = 0) => { // hình chóp cụt (mái)
  const o = prim();
  const b = [[-wb / 2, 0, -db / 2], [wb / 2, 0, -db / 2], [wb / 2, 0, db / 2], [-wb / 2, 0, db / 2]];
  const t = [[-wt / 2, h, -dt / 2 + dz], [wt / 2, h, -dt / 2 + dz], [wt / 2, h, dt / 2 + dz], [-wt / 2, h, dt / 2 + dz]];
  const face = (a, bb, c, d) => { const n = norm(cross([bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]], [d[0] - a[0], d[1] - a[1], d[2] - a[2]])); const nn = n[1] < -0.01 ? n.map(x => -x) : n; quadv(o, { p: a, n: nn }, { p: bb, n: nn }, { p: c, n: nn }, { p: d, n: nn }); };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; face(b[i], b[j], t[j], t[i]); }
  face(t[0], t[1], t[2], t[3]); face(b[0], b[1], b[2], b[3]);
  return o;
};
P.quad = (w, h) => { // mặt phẳng đứng nhìn về +z, gốc ở giữa
  const o = prim(), n = [0, 0, 1];
  quadv(o, { p: [-w / 2, -h / 2, 0], n, u: [0, 1] }, { p: [w / 2, -h / 2, 0], n, u: [1, 1] }, { p: [w / 2, h / 2, 0], n, u: [1, 0] }, { p: [-w / 2, h / 2, 0], n, u: [0, 0] });
  return o;
};

/* ---------- Bộ gom hình (Geo) ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  add(pr, color, m) {
    const c = col(color), nm = m ? normalMat(m) : null;
    for (let i = 0; i < pr.P.length; i += 3) {
      let x = pr.P[i], y = pr.P[i + 1], z = pr.P[i + 2], nx = pr.N[i], ny = pr.N[i + 1], nz = pr.N[i + 2];
      if (m) {
        const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], Z = m[2] * x + m[6] * y + m[10] * z + m[14];
        x = X; y = Y; z = Z;
        const NX = nm[0] * nx + nm[3] * ny + nm[6] * nz, NY = nm[1] * nx + nm[4] * ny + nm[7] * nz, NZ = nm[2] * nx + nm[5] * ny + nm[8] * nz, l = Math.hypot(NX, NY, NZ) || 1;
        nx = NX / l; ny = NY / l; nz = NZ / l;
      }
      this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(c[0], c[1], c[2]);
    }
    for (const v of pr.U) this.u.push(v);
    return this;
  }
}

/* ---------- Renderer ---------- */
function createRenderer(canvas, opts = {}) {
  const gl = canvas.getContext('webgl2', { antialias: opts.antialias !== false, alpha: true, premultipliedAlpha: false, powerPreference: opts.power || 'default' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const VS = `#version 300 es
  layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC; layout(location=3) in vec2 aU;
  uniform mat4 uM, uVP, uLVP; uniform mat3 uNM; uniform vec3 uTint;
  out vec3 vW; out vec3 vN; out vec3 vC; out vec2 vU; out vec4 vL;
  void main(){ vec4 w = uM*vec4(aP,1.); vW=w.xyz; vN=uNM*aN; vC=aC*uTint; vU=aU; vL=uLVP*w; gl_Position=uVP*w; }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DShadow;
  in vec3 vW; in vec3 vN; in vec3 vC; in vec2 vU; in vec4 vL;
  uniform sampler2DShadow uSh; uniform sampler2D uTex; uniform int uUseTex; uniform int uPcf;
  uniform vec3 uSun, uSunC, uSky, uGnd, uCam; uniform float uEm, uAlpha, uExp, uSat, uGlow;
  out vec4 o;
  float shadow(){ vec3 p=vL.xyz/vL.w*.5+.5; if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.;
    vec2 t=1./vec2(textureSize(uSh,0)); float s=0.;
    if(uPcf==0) return texture(uSh, vec3(p.xy, p.z-.0012));      // 1 mẫu (GPU tự lọc 2x2)
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) s+=texture(uSh, vec3(p.xy+vec2(x,y)*t*1.5, p.z-.0012));
    return s/9.; }
  void main(){
    vec3 n=normalize(vN); vec3 base=vC; float a=uAlpha;
    if(uUseTex==1){ vec4 t=texture(uTex,vU); if(t.a<.5) discard; base=pow(t.rgb, vec3(2.2)); }
    float d=max(dot(n,uSun),0.); d = d*.85 + .15*smoothstep(-.2,.6,dot(n,uSun));
    float s=shadow();
    vec3 hemi=mix(uGnd,uSky,n.y*.5+.5);
    float ao = n.y < .7 ? mix(.62,1.,smoothstep(0.,.45,vW.y)) : 1.;
    vec3 v=normalize(uCam-vW); float rim=pow(1.-max(dot(n,v),0.),3.)*.12;
    vec3 c = base*(hemi*ao + uSunC*d*mix(.25,1.,s)) + rim*uSky*base*1.5 + base*uEm*2.2*uGlow;
    c *= .74*uExp; c = clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14), 0., 1.);
    float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, uSat);
    o=vec4(pow(c,vec3(1./2.2)), a);
  }`;
  const SVS = `#version 300 es
  layout(location=0) in vec3 aP; uniform mat4 uM, uLVP; void main(){ gl_Position=uLVP*uM*vec4(aP,1.); }`;
  const SFS = `#version 300 es
  precision mediump float; out vec4 o; void main(){ o=vec4(1.); }`;
  const main = prog(VS, FS), shp = prog(SVS, SFS);
  const U = {}; ['uM', 'uVP', 'uLVP', 'uNM', 'uTint', 'uSh', 'uTex', 'uUseTex', 'uSun', 'uSunC', 'uSky', 'uGnd', 'uCam', 'uEm', 'uAlpha', 'uExp', 'uSat', 'uGlow', 'uPcf'].forEach(n => U[n] = gl.getUniformLocation(main, n));
  const SU = { uM: gl.getUniformLocation(shp, 'uM'), uLVP: gl.getUniformLocation(shp, 'uLVP') };

  // shadow map
  let SM = opts.shadow || 1024, pcf = opts.pcf === undefined ? 1 : opts.pcf;
  const depth = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, depth);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SM, SM, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
  const dummy = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, dummy); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, SM, SM);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, dummy);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  function setShadow(size, p) {           // đổi độ phân giải bóng / số mẫu lọc khi chỉnh chất lượng
    if (p !== undefined) pcf = p;
    if (!size || size === SM) return; SM = size;
    gl.bindTexture(gl.TEXTURE_2D, depth); gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SM, SM, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, dummy); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, SM, SM);
  }
  const white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, white); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 0]));

  function mesh(geo) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
    buf(geo.p, 0, 3); buf(geo.n, 1, 3); buf(geo.c, 2, 3); buf(geo.u.length ? geo.u : new Array(geo.p.length / 3 * 2).fill(0), 3, 2);
    gl.bindVertexArray(null);
    return { vao, count: geo.p.length / 3 };
  }
  function texture(source) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); } catch (e) { return null; }
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  const env = { sun: norm([-0.8, 1, 0.12]), sunC: [1.35, 1.25, 1.08], sky: [.5, .54, .6], gnd: [.33, .28, .23], exp: 1, sat: .82, glow: .3 };

  // items: {mesh, m, tint, em, alpha, tex, noShadow}
  function render(items, cam, lightTarget, lightSize) {
    const W = canvas.width, H = canvas.height;
    // ánh sáng
    const le = [lightTarget[0] + env.sun[0] * 30, lightTarget[1] + env.sun[1] * 30, lightTarget[2] + env.sun[2] * 30];
    const LVP = M4.mul(M4.ortho(-lightSize, lightSize, -lightSize, lightSize, 1, 70), M4.lookAt(le, lightTarget, [0, 1, 0]));
    // pass bóng
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, SM, SM);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
    gl.useProgram(shp); gl.uniformMatrix4fv(SU.uLVP, false, LVP);
    for (const it of items) { if (it.noShadow || (it.alpha !== undefined && it.alpha < .5)) continue; gl.uniformMatrix4fv(SU.uM, false, it.m || I); gl.bindVertexArray(it.mesh.vao); gl.drawArrays(gl.TRIANGLES, 0, it.mesh.count); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // pass chính
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(main);
    gl.uniformMatrix4fv(U.uVP, false, cam.vp); gl.uniformMatrix4fv(U.uLVP, false, LVP);
    gl.uniform3fv(U.uSun, env.sun); gl.uniform3fv(U.uSunC, env.sunC); gl.uniform3fv(U.uSky, env.sky); gl.uniform3fv(U.uGnd, env.gnd); gl.uniform3fv(U.uCam, cam.eye); gl.uniform1f(U.uExp, env.exp); gl.uniform1f(U.uSat, env.sat); gl.uniform1f(U.uGlow, env.glow); gl.uniform1i(U.uPcf, pcf);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, depth); gl.uniform1i(U.uSh, 0);
    gl.uniform1i(U.uTex, 1);
    const draw = it => {
      const m = it.m || I;
      gl.uniformMatrix4fv(U.uM, false, m); gl.uniformMatrix3fv(U.uNM, false, it.m ? normalMat(m) : I3);
      gl.uniform3fv(U.uTint, it.tint || ONE); gl.uniform1f(U.uEm, it.em || 0); gl.uniform1f(U.uAlpha, it.alpha === undefined ? 1 : it.alpha);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, it.tex || white); gl.uniform1i(U.uUseTex, it.tex ? 1 : 0);
      gl.bindVertexArray(it.mesh.vao); gl.drawArrays(gl.TRIANGLES, 0, it.mesh.count);
    };
    const opaque = items.filter(i => i.alpha === undefined || i.alpha >= 1), trans = items.filter(i => i.alpha !== undefined && i.alpha < 1);
    opaque.forEach(draw);
    if (trans.length) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      trans.forEach(draw);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }
  const I = M4.ident(), I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1], ONE = [1, 1, 1];
  return { gl, mesh, texture, render, env, setShadow };
}

window.ENGINE = { M4, P, Geo, col, createRenderer, norm, cross, dot };
})();
