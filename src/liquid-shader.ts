/** Independently authored studio-lighting integrator; no third-party shader source. */
export const liquidFragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform sampler2D uImage;
uniform vec2 uResolution,uImageSize;
uniform float uTime,uRefraction,uEdge,uPatternBlur,uLiquify,uSpeed,uPatternScale;
const float PI=3.141592653589793;
float fresnel(float c,float eta,float k){
  c=clamp(c,0.,1.);float c2=c*c,s2=1.-c2,t=eta*eta-k*k-s2;
  float magnitude=sqrt(t*t+4.*eta*eta*k*k),a=sqrt(max(0.,(magnitude+t)*.5));
  float crossTerm=2.*c*a;
  float rs=(magnitude+c2-crossTerm)/(magnitude+c2+crossTerm);
  float rp=rs*(c2*magnitude+s2*s2-crossTerm*s2)/(c2*magnitude+s2*s2+crossTerm*s2);
  return clamp((rs+rp)*.5,0.,1.);
}
float masking(float cosine,float alpha){return cosine<=0.?0.:2.*cosine/(cosine+sqrt(alpha*alpha+(1.-alpha*alpha)*cosine*cosine));}
float panel(vec2 p,vec2 center,vec2 radius,float softness){
  vec2 d=abs(p-center)-radius;
  return (1.-smoothstep(-softness,softness,d.x))*(1.-smoothstep(-softness,softness,d.y));
}
vec3 studio(vec3 direction){
  vec2 p=vec2(atan(direction.x,direction.z),asin(clamp(direction.y,-1.,1.)));
  float scale=clamp(uPatternScale*.5,.2,4.);
  p.x*=scale;
  float key=panel(p,vec2(-.48,.38),vec2(.42,.66),.09);
  float ribbon=panel(p,vec2(.85,.12),vec2(.17,1.05),.065);
  float top=panel(p,vec2(.2,1.18),vec2(1.15,.2),.12);
  float lower=panel(p,vec2(-1.2,-.55),vec2(.3,.3),.18);
  vec3 ambient=mix(vec3(.025,.03,.04),vec3(.16,.19,.22),smoothstep(-.5,.9,direction.y));
  return ambient+vec3(5.2,5.05,4.8)*key+vec3(3.7,4.1,4.6)*ribbon+vec3(3.2)*top+vec3(.65,.56,.45)*lower;
}
float radicalInverse(uint bits){
  bits=(bits<<16u)|(bits>>16u);
  bits=((bits&0x55555555u)<<1u)|((bits&0xAAAAAAAAu)>>1u);
  bits=((bits&0x33333333u)<<2u)|((bits&0xCCCCCCCCu)>>2u);
  bits=((bits&0x0F0F0F0Fu)<<4u)|((bits&0xF0F0F0F0u)>>4u);
  bits=((bits&0x00FF00FFu)<<8u)|((bits&0xFF00FF00u)>>8u);
  return float(bits)*2.3283064365386963e-10;
}
vec3 displayColor(vec3 linear){
  vec3 mapped=linear/(vec3(1.)+linear);
  return mix(12.92*mapped,1.055*pow(mapped,vec3(1./2.4))-.055,step(vec3(.0031308),mapped));
}
void main(){
  vec2 center=uv-.5;float frame=uResolution.x/uResolution.y,aspect=uImageSize.x/uImageSize.y;
  vec2 fit=frame>aspect?vec2(aspect/frame,1.):vec2(1.,frame/aspect);
  vec2 q=center/(fit*.82)+.5;
  if(any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.)))){frag=vec4(0.);return;}
  vec4 field=texture(uImage,q);if(field.a<.001){frag=vec4(0.);return;}
  vec2 slopes=field.gb*2.-1.;float nz=sqrt(max(.01,1.-dot(slopes,slopes)));
  float time=uTime*uSpeed;
  vec2 centered=q-.5;
  vec2 k1=vec2(5.,3.),k2=vec2(-3.,7.),k3=vec2(9.,-2.);
  vec2 wave=-uLiquify*(.75*k1*cos(dot(k1,centered)-time)+.45*k2*cos(dot(k2,centered)+time*.83)+.25*k3*cos(dot(k3,centered)-time*1.27));
  vec3 normal=normalize(vec3(slopes*(.3+uEdge*2.5)+wave,nz));
  vec3 view=normalize(vec3(-center*.2,1.));float noV=dot(normal,view);
  if(noV<=0.){frag=vec4(0.,0.,0.,field.a);return;}
  float roughness=clamp(.08+uPatternBlur*8.,.05,.7),alpha=roughness*roughness;
  // A continuous orthonormal basis avoids the old near-pole tangent switch.
  float basisScale=1./(1.+normal.z);
  vec3 tangent=vec3(1.-normal.x*normal.x*basisScale,-normal.x*normal.y*basisScale,-normal.x);
  vec3 bitangent=vec3(-normal.x*normal.y*basisScale,1.-normal.y*normal.y*basisScale,-normal.y),result=vec3(0.);
  // Real part of complex IOR controls conductor reflectance; no transmitted rainbow bands.
  vec3 eta=vec3(.14,.16,.13)+uRefraction*12.,extinction=vec3(3.9,3.4,2.8);
  for(uint i=0u;i<48u;i++){
    vec2 xi=vec2((float(i)+.5)/48.,radicalInverse(i));
    float phi=2.*PI*xi.x,cosTheta=sqrt((1.-xi.y)/(1.+(alpha*alpha-1.)*xi.y));
    float sinTheta=sqrt(max(0.,1.-cosTheta*cosTheta));
    vec3 h=normalize(tangent*cos(phi)*sinTheta+bitangent*sin(phi)*sinTheta+normal*cosTheta);
    float voH=dot(view,h);if(voH<=0.)continue;
    vec3 light=reflect(-view,h);float noL=dot(normal,light);if(noL<=0.)continue;
    vec3 F=vec3(fresnel(voH,eta.r,extinction.r),fresnel(voH,eta.g,extinction.g),fresnel(voH,eta.b,extinction.b));
    float G=masking(noV,alpha)*masking(noL,alpha);
    result+=studio(light)*F*G*voH/max(.00001,dot(normal,h)*noV);
  }
  // The canvas context uses premultiplied alpha; preserve coverage without bright edge halos.
  frag=vec4(displayColor(result/48.)*field.a,field.a);
}`;
