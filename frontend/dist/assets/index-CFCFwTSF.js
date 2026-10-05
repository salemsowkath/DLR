(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&a(u)}).observe(document,{childList:!0,subtree:!0});function i(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(r){if(r.ep)return;r.ep=!0;const o=i(r);fetch(r.href,o)}})();const ue="";function de(){return localStorage.getItem("dlr_citizen_token")||null}function N(t){t?localStorage.setItem("dlr_citizen_token",t):localStorage.removeItem("dlr_citizen_token")}async function E(t,e={}){var $,w,l;const i=`${ue}${t}`,a=de(),r={...e.headers||{}};a&&(r.Authorization=`Bearer ${a}`),!e.isFormData&&!r["Content-Type"]&&(r["Content-Type"]="application/json");const o={method:e.method||"GET",headers:r,body:e.isFormData?e.body:e.body?JSON.stringify(e.body):void 0};let u;try{u=await fetch(i,o)}catch{throw new Error("Network error: Unable to communicate with DLR backend service.")}let n;try{n=await u.json()}catch{n=null}if(!u.ok){u.status===401&&(N(null),window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const c=(($=n==null?void 0:n.error)==null?void 0:$.message)||(n==null?void 0:n.message)||`API Error (${u.status})`,p=new Error(c);throw p.status=u.status,p.code=((w=n==null?void 0:n.error)==null?void 0:w.code)||"API_ERROR",p.details=((l=n==null?void 0:n.error)==null?void 0:l.details)||null,p}return(n==null?void 0:n.data)||n}const y={getStoredToken:de,setStoredToken:N,async requestOtp(t){return E("/api/auth/citizen/otp/request",{method:"POST",body:{aadhaarNumber:t}})},async citizenLogin(t){return this.requestOtp(t)},async citizenRegister(t){return E("/api/auth/citizen/register",{method:"POST",body:t})},async verifyOtp({aadhaarNumber:t,otp:e,sessionId:i}){const a=await E("/api/auth/citizen/otp/verify",{method:"POST",body:{aadhaarNumber:t,otp:e,sessionId:i}});return a!=null&&a.accessToken&&N(a.accessToken),a},async citizenVerifyOtp({aadhaarNumber:t,otp:e,sessionId:i}){return this.verifyOtp({aadhaarNumber:t,otp:e,sessionId:i})},async citizenVerifyRegistrationOtp({aadhaarNumber:t,otp:e,sessionId:i}){return this.verifyOtp({aadhaarNumber:t,otp:e,sessionId:i})},async officerLogin({username:t,password:e}){const i=await E("/api/auth/officer/login",{method:"POST",body:{username:t,password:e}});return i!=null&&i.accessToken&&N(i.accessToken),i},async ministerLogin({username:t,password:e}){const i=await E("/api/auth/minister/login",{method:"POST",body:{username:t,password:e}});return i!=null&&i.accessToken&&N(i.accessToken),i},async getMe(){return E("/api/auth/me")},async logout(){try{await E("/api/auth/logout",{method:"POST"})}finally{N(null)}},async uploadDocument(t){const e=new FormData;return e.append("file",t),E("/api/documents/upload",{method:"POST",isFormData:!0,body:e})},async processDocument(t,{language:e="eng",geometry:i=null,crs:a=""}={}){const r=new FormData;return r.append("file",t),r.append("language",e),i&&r.append("geometry",typeof i=="string"?i:JSON.stringify(i)),a&&r.append("crs",a),E("/api/documents/process",{method:"POST",isFormData:!0,body:r})},async getMyDocuments(){const t=await E("/api/documents/mine");return(t==null?void 0:t.documents)||t||[]},async getDocumentById(t){return E(`/api/documents/${t}`)},async getMyApplications(){const t=await E("/api/documents/applications/mine");return(t==null?void 0:t.applications)||[]}};class pe{constructor(){this.user=null,this.isAuthenticated=!1,this.activeTab="dashboard",this.selectedRecordId=null,this.lastProcessResult=null,this.myDocuments=[],this.applications=[],this.applicationsLoading=!1,this.applicationsError="",this.selectedRecord=null,this.recordLoading=!1,this.recordError="",this.toasts=[],this.loading=!1,this.listeners=new Set,window.addEventListener("dlr:unauthorized",()=>{this.user=null,this.isAuthenticated=!1,this.activeTab="login",this.addToast("error","Session expired. Please log in again with your Aadhaar number."),this.notify()})}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}notify(){for(const e of this.listeners)e(this)}addToast(e,i){const a=Date.now()+Math.random();this.toasts.push({id:a,type:e,message:i}),this.notify(),setTimeout(()=>{this.toasts=this.toasts.filter(r=>r.id!==a),this.notify()},4e3)}async init(){if(!y.getStoredToken()){this.activeTab="login",this.notify();return}try{this.loading=!0,this.notify();const i=await y.getMe();this.user=i,this.isAuthenticated=!0,this.activeTab="dashboard",await Promise.all([this.loadMyDocuments(),this.loadApplications()])}catch{y.setStoredToken(null),this.user=null,this.isAuthenticated=!1,this.activeTab="login"}finally{this.loading=!1,this.notify()}}async setAuthenticatedUser(e){this.user=e,this.isAuthenticated=!0,this.activeTab="dashboard",await Promise.all([this.loadMyDocuments(),this.loadApplications()]),this.notify()}async loadMyDocuments(){if(this.isAuthenticated)try{const e=await y.getMyDocuments();this.myDocuments=Array.isArray(e)?e:[],this.notify()}catch(e){console.warn("Failed to load citizen documents:",e.message)}}async loadApplications(){if(this.isAuthenticated){this.applicationsLoading=!0,this.applicationsError="",this.notify();try{this.applications=await y.getMyApplications()}catch(e){this.applicationsError=e.message||"Unable to load applications."}finally{this.applicationsLoading=!1,this.notify()}}}async loadSelectedRecord(e=this.selectedRecordId){if(!(!e||!this.isAuthenticated)){this.recordLoading=!0,this.recordError="",this.selectedRecord=null,this.notify();try{this.selectedRecord=await y.getDocumentById(e)}catch(i){this.recordError=i.status===403?"You do not have access to this record.":i.message||"Unable to load this record."}finally{this.recordLoading=!1,this.notify()}}}async logout(){try{await y.logout()}catch{}this.user=null,this.isAuthenticated=!1,this.myDocuments=[],this.applications=[],this.lastProcessResult=null,this.selectedRecord=null,this.activeTab="login",this.addToast("info","Logged out successfully."),this.notify()}setActiveTab(e,i=null){this.activeTab=e,i&&(this.selectedRecordId=i),this.notify(),e==="record-details"&&this.loadSelectedRecord(),e==="applications"&&this.loadApplications()}setLastProcessResult(e){this.lastProcessResult=e,this.loadMyDocuments(),this.loadApplications(),this.setActiveTab("processing-result")}}const s=new pe;function d(t){return String(t??"").replace(/[&<>'"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[e])}function W(t){if(!t)return"—";const e=new Date(t);return Number.isNaN(e.getTime())?"—":e.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}function I(t){const e=String(t||"").toUpperCase();return["PROCESSED","APPROVED","PASS","VALID","COMPLETED"].includes(e)?"badge-success":["FAILED","REJECTED","CRITICAL","ERROR","INVALID"].includes(e)?"badge-danger":["WARNING","CORRECTION_REQUIRED","ON_HOLD","PENDING_REVIEW","IN_REVIEW","REVIEW_REQUIRED"].includes(e)?"badge-warning":"badge-info"}function ce(t){return typeof t=="object"&&t!==null?t.value:t}function ie(){const{user:t,isAuthenticated:e}=s;if(!e||!t)return`
      <header class="app-header">
        <div class="header-left">
          <div class="emblem-badge">
            <div class="emblem-icon">🏛️</div>
            <div>
              <div>DLR Citizen Portal</div>
              <div class="gov-tag">Government of India • SIH 2026</div>
            </div>
          </div>
        </div>
      </header>
    `;const a=(t.external_reference||"CITIZEN-USER").replace("AADHAAR-","");return`
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display: none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">📜</div>
          <div>
            <div style="font-size: 1.05rem;">DLR Citizen Portal</div>
            <div class="gov-tag">Intelligent Land Digitization</div>
          </div>
        </div>
      </div>

      <div class="header-right">
        <div class="user-pill">
          <div class="user-avatar">👤</div>
          <div>
            <div style="font-weight: 600; line-height: 1.2;">${d(t.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${d(a)}</div>
          </div>
        </div>

        <button id="header-profile-btn" class="btn btn-outline btn-sm" title="View Profile">Profile</button>
        <button id="header-logout-btn" class="btn btn-secondary btn-sm">Logout</button>
      </div>
    </header>
  `}function se(){const t=document.getElementById("header-logout-btn");t&&t.addEventListener("click",()=>{s.logout()});const e=document.getElementById("header-profile-btn");e&&e.addEventListener("click",()=>{s.setActiveTab("profile")})}function me(){const{activeTab:t,isAuthenticated:e}=s;return e?`
    <aside class="app-sidebar" id="sidebar">
      <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-subtle); padding: 0.5rem 1rem; letter-spacing: 0.08em;">
        Main Menu
      </div>
      ${[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"my-records",label:"My Land Records",icon:"📁"},{id:"upload",label:"Upload Document",icon:"📤"},{id:"applications",label:"Track Applications",icon:"📝"},{id:"profile",label:"Citizen Profile",icon:"👤"}].map(a=>`
        <div class="nav-item ${t===a.id?"active":""}" data-tab="${a.id}">
          <span class="nav-icon">${a.icon}</span>
          <span>${a.label}</span>
        </div>
      `).join("")}

      <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        <div class="nav-item" id="sidebar-logout-btn" style="color: var(--danger);">
          <span class="nav-icon">🚪</span>
          <span>Logout</span>
        </div>
      </div>
    </aside>
  `:""}function ge(){document.querySelectorAll(".app-sidebar .nav-item[data-tab]").forEach(i=>{i.addEventListener("click",()=>{const a=i.getAttribute("data-tab");s.setActiveTab(a)})});const e=document.getElementById("sidebar-logout-btn");e&&e.addEventListener("click",()=>{s.logout()})}function ae(){const{toasts:t}=s;return!t||t.length===0?"":`
    <div class="toast-container">
      ${t.map(e=>`
        <div class="toast toast-${e.type}">
          <span>${e.type==="error"?"⚠️":e.type==="success"?"✅":"ℹ️"}</span>
          <div>${e.message}</div>
        </div>
      `).join("")}
    </div>
  `}let h="login",k=!1,P="",f={aadhaarNumber:"",fullName:"",dateOfBirth:"",gender:"",state:"",district:"",taluk:"",village:"",pincode:""},T=["","","","","",""],O="",j="",V="",b=!1,m="",C="",S=45,R=null;function ve(t){const e=Math.floor(t/60),i=t%60;return`${e<10?"0":""}${e}:${i<10?"0":""}${i}`}function M(){R&&clearInterval(R),S=45,R=setInterval(()=>{S-=1,S<=0&&(clearInterval(R),R=null),s.notify()},1e3)}function fe(){return`
    <div class="auth-container">
      <div class="auth-card ${h==="register"?"wide-card":""}">
        <div class="auth-header">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
          <h1>${h==="register"?"CREATE CITIZEN ACCOUNT":h==="otp"?"VERIFY YOUR IDENTITY":"Citizen Land Portal"}</h1>
          <p>${h==="register"?"Register your identity with official land records":h==="otp"?`OTP sent to registered mobile ending in ${j||"••••"+O.slice(-4)}`:"Aadhaar Identity Authentication"}</p>
        </div>

        ${m?`
          <div class="badge badge-danger" style="width: 100%; padding: 0.75rem; margin-bottom: 1.25rem; font-size: 0.85rem; text-transform: none; display: flex; align-items: center; justify-content: space-between;">
            <span>⚠️ ${m}</span>
            ${m.includes("not found")&&h==="login"?'<button type="button" id="error-go-register" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem;">Register Now</button>':m.includes("already registered")&&h==="register"?'<button type="button" id="error-go-login" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem;">Login Here</button>':""}
          </div>
        `:""}

        ${C&&h==="otp"?`
          <div class="dev-banner">
            <span>🔑 ${C}</span>
          </div>
        `:""}

        ${h==="login"?`
          <form id="request-otp-form">
            <div class="form-group">
              <label class="form-label" for="aadhaar-input">12-Digit Aadhaar Number</label>
              <input
                type="text"
                id="aadhaar-input"
                class="form-control"
                placeholder="e.g. 9999 8888 1234"
                maxlength="14"
                value="${P}"
                required
                autocomplete="off"
              />
              <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.35rem;">
                Your Aadhaar is used for identity verification only. Full Aadhaar is never stored or displayed.
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;" ${b?"disabled":""}>
              ${b?'<div class="spinner"></div> Requesting OTP...':"Send OTP →"}
            </button>
          </form>

          <div style="margin-top: 1.25rem; text-align: center; font-size: 0.9rem;">
            <span style="color: var(--text-muted);">New citizen?</span>
            <a href="#" id="link-go-register" style="color: var(--primary); font-weight: 600; text-decoration: none; margin-left: 0.35rem;">Register Now</a>
          </div>
        `:h==="register"?`
          <form id="citizen-register-form">
            <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <h3 style="font-size: 0.9rem; text-transform: uppercase; color: var(--primary); letter-spacing: 0.05em; font-weight: 700;">Identity Details</h3>
            </div>

            <div class="two-column" style="margin-top: 0; margin-bottom: 1rem;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-aadhaar">Aadhaar Number *</label>
                <input
                  type="text"
                  id="reg-aadhaar"
                  class="form-control"
                  placeholder="12-digit number"
                  maxlength="14"
                  value="${f.aadhaarNumber}"
                  required
                />
              </div>

              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-name">Full Name *</label>
                <input
                  type="text"
                  id="reg-name"
                  class="form-control"
                  placeholder="As per official documents"
                  value="${f.fullName}"
                  required
                />
              </div>
            </div>

            <div class="two-column" style="margin-top: 0; margin-bottom: 1.25rem;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-dob">Date of Birth *</label>
                <input
                  type="date"
                  id="reg-dob"
                  class="form-control"
                  value="${f.dateOfBirth}"
                  required
                />
              </div>

              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-gender">Gender *</label>
                <select id="reg-gender" class="form-control" required style="appearance: auto;">
                  <option value="">Select Gender</option>
                  <option value="Male" ${f.gender==="Male"?"selected":""}>Male</option>
                  <option value="Female" ${f.gender==="Female"?"selected":""}>Female</option>
                  <option value="Other" ${f.gender==="Other"?"selected":""}>Other</option>
                  <option value="Prefer not to say" ${f.gender==="Prefer not to say"?"selected":""}>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <h3 style="font-size: 0.9rem; text-transform: uppercase; color: var(--primary); letter-spacing: 0.05em; font-weight: 700;">Address Details</h3>
            </div>

            <div class="two-column" style="margin-top: 0; margin-bottom: 0.75rem;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-state">State *</label>
                <input type="text" id="reg-state" class="form-control" placeholder="e.g. Karnataka" value="${f.state}" required />
              </div>

              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-district">District *</label>
                <input type="text" id="reg-district" class="form-control" placeholder="e.g. Bengaluru Urban" value="${f.district}" required />
              </div>
            </div>

            <div class="two-column" style="margin-top: 0; margin-bottom: 1.25rem;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-taluk">Taluk *</label>
                <input type="text" id="reg-taluk" class="form-control" placeholder="e.g. Bengaluru South" value="${f.taluk}" required />
              </div>

              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="reg-village">Village / Town *</label>
                <input type="text" id="reg-village" class="form-control" placeholder="e.g. Jayanagar" value="${f.village}" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="reg-pincode">Pincode *</label>
              <input type="text" id="reg-pincode" class="form-control" placeholder="6-digit pincode" maxlength="6" value="${f.pincode}" required />
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.85rem;" ${b?"disabled":""}>
              ${b?'<div class="spinner"></div> Processing Registration...':"Verify & Send OTP →"}
            </button>
          </form>

          <div style="margin-top: 1.25rem; text-align: center; font-size: 0.9rem;">
            <span style="color: var(--text-muted);">Already registered?</span>
            <a href="#" id="link-go-login" style="color: var(--primary); font-weight: 600; text-decoration: none; margin-left: 0.35rem;">Login</a>
          </div>
        `:`
          <form id="verify-otp-form">
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label class="form-label" style="margin: 0;">Verified Identity Reference</label>
                <span class="badge badge-info">${O}</span>
              </div>

              <div class="otp-inputs-container" style="display: flex; gap: 0.5rem; justify-content: center; margin: 1.5rem 0;">
                ${[0,1,2,3,4,5].map(e=>`
                  <input
                    type="text"
                    class="otp-box"
                    data-index="${e}"
                    maxlength="1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    value="${T[e]||""}"
                    ${e===0?"autofocus":""}
                  />
                `).join("")}
              </div>
            </div>

            <button type="submit" id="verify-otp-btn" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.85rem;" ${b?"disabled":""}>
              ${b?'<div class="spinner"></div> Verifying...':k?"Verify & Register":"Verify OTP & Enter Portal"}
            </button>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; padding: 0.75rem 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <button type="button" id="resend-otp-btn" class="btn btn-outline" style="font-size: 0.85rem; padding: 0.4rem 0.75rem;" ${S>0||b?"disabled":""}>
                Resend OTP
              </button>
              <span style="font-family: monospace; font-size: 1.1rem; font-weight: 700; color: ${S>0?"var(--primary)":"var(--text-muted)"};">
                ${ve(S)}
              </span>
            </div>

            <button type="button" id="back-from-otp" class="btn btn-outline" style="width: 100%; margin-top: 1rem;">
              ← Back to ${k?"Registration":"Login"}
            </button>
          </form>
        `}

        <div style="margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); text-align: center; font-size: 0.8rem; color: var(--text-subtle);">
          Protected by Node.js Security & Role-Based Access Control
        </div>
      </div>
    </div>
  `}function he(){const t=document.getElementById("link-go-register");t&&t.addEventListener("click",l=>{l.preventDefault(),h="register",m="",s.notify()});const e=document.getElementById("link-go-login");e&&e.addEventListener("click",l=>{l.preventDefault(),h="login",m="",s.notify()});const i=document.getElementById("error-go-register");i&&i.addEventListener("click",()=>{h="register",f.aadhaarNumber=P,m="",s.notify()});const a=document.getElementById("error-go-login");a&&a.addEventListener("click",()=>{h="login",f.aadhaarNumber&&(P=f.aadhaarNumber),m="",s.notify()});const r=document.getElementById("request-otp-form");r&&r.addEventListener("submit",async l=>{l.preventDefault();const c=document.getElementById("aadhaar-input"),g=(c?c.value.trim():"").replace(/[\s-]/g,"");if(g.length!==12||!/^\d{12}$/.test(g)){m="Please enter a valid 12-digit Aadhaar number.",s.notify();return}P=g,b=!0,m="",s.notify();try{const v=await y.citizenLogin(g);O=v.maskedAadhaar||`XXXX-XXXX-${g.slice(-4)}`,j=`••••${g.slice(-4)}`,V=v.sessionId,k=!1,C=v.devOtp?`Dev OTP: ${v.devOtp}`:"",T=["","","","","",""],h="otp",M(),s.addToast("success",`OTP sent to mobile registered with ${O}.`)}catch(v){v.status===404||v.code==="CITIZEN_NOT_FOUND"?m="Citizen account not found. Please register first.":m=v.message||"Failed to request OTP. Please check your connection."}finally{b=!1,s.notify()}});const o=document.getElementById("citizen-register-form");o&&o.addEventListener("submit",async l=>{var X,H,J,Y,Q,Z,K,ee,te;l.preventDefault();const c=(((X=document.getElementById("reg-aadhaar"))==null?void 0:X.value)||"").trim().replace(/[\s-]/g,""),p=(((H=document.getElementById("reg-name"))==null?void 0:H.value)||"").trim(),g=(((J=document.getElementById("reg-dob"))==null?void 0:J.value)||"").trim(),v=(((Y=document.getElementById("reg-gender"))==null?void 0:Y.value)||"").trim(),A=(((Q=document.getElementById("reg-state"))==null?void 0:Q.value)||"").trim(),B=(((Z=document.getElementById("reg-district"))==null?void 0:Z.value)||"").trim(),_=(((K=document.getElementById("reg-taluk"))==null?void 0:K.value)||"").trim(),z=(((ee=document.getElementById("reg-village"))==null?void 0:ee.value)||"").trim(),F=(((te=document.getElementById("reg-pincode"))==null?void 0:te.value)||"").trim();if(f={aadhaarNumber:c,fullName:p,dateOfBirth:g,gender:v,state:A,district:B,taluk:_,village:z,pincode:F},c.length!==12||!/^\d{12}$/.test(c)){m="Aadhaar number must contain exactly 12 numeric digits.",s.notify();return}if(!p){m="Full Name is required.",s.notify();return}if(!g){m="Date of Birth is required.",s.notify();return}if(!v){m="Please select a Gender option.",s.notify();return}if(!A||!B||!_||!z){m="State, District, Taluk, and Village details are all required.",s.notify();return}if(F.length!==6||!/^\d{6}$/.test(F)){m="Pincode must contain exactly 6 numeric digits.",s.notify();return}P=c,b=!0,m="",s.notify();try{const D=await y.citizenRegister(f);O=D.maskedAadhaar||`XXXX-XXXX-${c.slice(-4)}`,j=`••••${c.slice(-4)}`,V=D.sessionId,k=!0,C=D.devOtp?`Dev OTP: ${D.devOtp}`:"",T=["","","","","",""],h="otp",M(),s.addToast("success",`Registration initiated! OTP sent to mobile for ${O}.`)}catch(D){D.status===409||D.code==="DUPLICATE_IDENTITY"||D.code==="CITIZEN_ALREADY_REGISTERED"?m="This identity is already registered. Please use Citizen Login.":m=D.message||"Registration failed. Please try again."}finally{b=!1,s.notify()}});const u=document.querySelectorAll(".otp-box");u.length>0&&u.forEach(l=>{l.addEventListener("input",c=>{const p=parseInt(l.getAttribute("data-index"),10),g=c.target.value.replace(/\D/g,"");if(l.value=g?g.slice(-1):"",T[p]=l.value,g&&p<5){const v=document.querySelector(`.otp-box[data-index="${p+1}"]`);v&&v.focus()}}),l.addEventListener("keydown",c=>{const p=parseInt(l.getAttribute("data-index"),10);if(c.key==="Backspace"&&!l.value&&p>0){const g=document.querySelector(`.otp-box[data-index="${p-1}"]`);g&&(g.focus(),g.value="",T[p-1]="")}}),l.addEventListener("paste",c=>{c.preventDefault();const p=(c.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"");if(!p)return;const g=p.slice(0,6).split("");g.forEach((B,_)=>{T[_]=B;const z=document.querySelector(`.otp-box[data-index="${_}"]`);z&&(z.value=B)});const v=Math.min(g.length,5),A=document.querySelector(`.otp-box[data-index="${v}"]`);A&&A.focus()})});const n=document.getElementById("verify-otp-form");n&&n.addEventListener("submit",async l=>{l.preventDefault();const c=T.join("");if(c.length!==6||!/^\d{6}$/.test(c)){m="Please enter the complete 6-digit OTP code.",s.notify();return}b=!0,m="",s.notify();try{const p=await y.citizenVerifyOtp({aadhaarNumber:P,otp:c,sessionId:V});R&&clearInterval(R),s.addToast("success",k?"Account created & verified! Welcome to the Citizen Portal.":"Authentication successful! Welcome to the Citizen Portal."),await s.setAuthenticatedUser(p.user)}catch(p){m=p.message||"Verification failed. Incorrect or expired OTP code."}finally{b=!1,s.notify()}});const $=document.getElementById("resend-otp-btn");$&&$.addEventListener("click",async()=>{if(!(S>0||b)){b=!0,m="",s.notify();try{let l;k?l=await y.citizenRegister(f):l=await y.citizenLogin(P),V=l.sessionId,C=l.devOtp?`Dev OTP: ${l.devOtp}`:"",T=["","","","","",""],M(),s.addToast("success",`A new OTP has been sent for ${O}.`)}catch(l){m=l.message||"Failed to resend OTP."}finally{b=!1,s.notify()}}});const w=document.getElementById("back-from-otp");w&&w.addEventListener("click",()=>{R&&clearInterval(R),h=k?"register":"login",m="",s.notify()})}function be(){const{user:t,myDocuments:e}=s,i=e.length,a=e.filter(n=>n.processing_status==="PROCESSED").length,r=e.filter(n=>n.processing_status==="UPLOADED"||n.processing_status==="PROCESSING").length,o=e.filter(n=>n.processing_status==="FAILED").length,u=s.applications.filter(n=>["PENDING_REVIEW","IN_REVIEW","CORRECTION_REQUIRED","ON_HOLD"].includes(n.status)).length;return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem;">Citizen Dashboard</h1>
          <p style="color: var(--text-muted);">Welcome back, <strong>${d((t==null?void 0:t.name)||"Citizen")}</strong></p>
        </div>
        <button id="quick-upload-btn" class="btn btn-primary">
          <span>📤</span> Upload Land Document
        </button>
      </div>

      ${o?`<div class="notice notice-error">${o} document${o>1?"s need":" needs"} attention. Open My Land Records to view the processing status.</div>`:""}

      <!-- Metric Cards -->
      <div class="grid-metrics">
        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Submitted Documents</div>
            <div class="value">${i}</div>
          </div>
          <div class="metric-icon" style="background: rgba(79, 70, 229, 0.15); color: var(--primary);">📁</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Processed</div>
            <div class="value">${a}</div>
          </div>
          <div class="metric-icon" style="background: var(--success-bg); color: var(--success);">✅</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Pending Processing</div>
            <div class="value">${r}</div>
          </div>
          <div class="metric-icon" style="background: var(--warning-bg); color: var(--warning);">⏳</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Pending Applications</div>
            <div class="value">${u}</div>
          </div>
          <div class="metric-icon" style="background: ${u?"var(--warning-bg)":"var(--success-bg)"}; color: ${u?"var(--warning)":"var(--success)"};">${u?"⚠️":"✓"}</div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <h2 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">Quick Actions</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem;">
        <div class="card action-card" id="card-action-upload" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📄</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Digitize Land Document</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Upload Patta/Chitta or sale deed PDF/image for automated AI OCR & GIS extraction.</p>
          <div class="btn btn-outline btn-sm">Upload Document →</div>
        </div>

        <div class="card action-card" id="card-action-records" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📜</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">View My Land Records</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Browse extracted land details, survey numbers, and official verification statuses.</p>
          <div class="btn btn-outline btn-sm">View Land Records →</div>
        </div>

        <div class="card action-card" id="card-action-applications" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Track Application Status</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Monitor officer review cases, anomaly resolution, and status timeline updates.</p>
          <div class="btn btn-outline btn-sm">Track Applications →</div>
        </div>
      </div>

      <!-- Recent Uploads Table -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 600;">Recent Document Submissions</h2>
          <button id="view-all-records-btn" class="btn btn-outline btn-sm">View All Records</button>
        </div>

        ${e.length===0?`
          <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
            <p>No land documents submitted yet.</p>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Upload Land Document" above to start AI extraction and validation.</p>
          </div>
        `:`
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Original Filename</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Uploaded Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${e.slice(0,5).map(n=>`
                  <tr>
                    <td><strong style="font-family: monospace;">${n.document_id}</strong></td>
                    <td>${n.original_filename}</td>
                    <td><span class="badge badge-info">${(n.file_type||"PDF").toUpperCase()}</span></td>
                    <td>
                      <span class="badge ${n.processing_status==="PROCESSED"?"badge-success":n.processing_status==="FAILED"?"badge-danger":"badge-warning"}">
                        ${n.processing_status}
                      </span>
                    </td>
                    <td>${new Date(n.uploaded_at||n.created_at).toLocaleDateString()}</td>
                    <td>
                      <button class="btn btn-outline btn-sm view-doc-btn" data-id="${n.document_id}">
                        View Details
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `}function ye(){const t=document.getElementById("quick-upload-btn");t&&t.addEventListener("click",()=>s.setActiveTab("upload"));const e=document.getElementById("card-action-upload");e&&e.addEventListener("click",()=>s.setActiveTab("upload"));const i=document.getElementById("card-action-records");i&&i.addEventListener("click",()=>s.setActiveTab("my-records"));const a=document.getElementById("card-action-applications");a&&a.addEventListener("click",()=>s.setActiveTab("applications"));const r=document.getElementById("view-all-records-btn");r&&r.addEventListener("click",()=>s.setActiveTab("my-records")),document.querySelectorAll(".view-doc-btn").forEach(u=>{u.addEventListener("click",()=>{const n=u.getAttribute("data-id");s.setActiveTab("record-details",n)})})}let L=null,q="idle",x="";const Ee=["application/pdf","image/jpeg","image/png"],ne=5*1024*1024;function $e(t){return`${d(t.name)} · ${(t.size/1024/1024).toFixed(2)} MB · ${d(t.type||"unknown")}`}function re(t){x="",t&&(!Ee.includes(t.type)||t.size>ne?(L=null,x=t.size>ne?"The file exceeds the 5 MB limit.":"Upload a PDF, JPG, JPEG, or PNG document."):L=t,s.notify())}function we(){return`
    <div class="page-content narrow-page">
      <div class="page-heading"><div><h1>Upload land document</h1><p>Submit a PDF or clear image for OCR, extraction, validation, and officer review when required.</p></div></div>
      <div class="notice notice-info">AI output is advisory. A government officer remains responsible for verification and approval.</div>
      <section class="card">
        <input id="document-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden />
        <div id="document-dropzone" class="dropzone" role="button" tabindex="0" aria-label="Choose a land document">
          <div class="dropzone-icon">⇧</div><h2>Drop your document here</h2><p>or select a file from your device</p>
          <button id="browse-document-btn" type="button" class="btn btn-outline">Browse files</button>
          <p class="helper-text">PDF, JPG, JPEG, or PNG · maximum 5 MB</p>
        </div>
        ${L?`<div class="file-row"><div><strong>${d(L.name)}</strong><p>${$e(L)}</p></div><button id="remove-document-btn" class="btn btn-outline btn-sm">Remove</button></div>`:""}
        ${x?`<div class="notice notice-error">${d(x)}</div>`:""}
        <div class="upload-actions"><button id="process-document-btn" class="btn btn-primary" ${!L||q==="processing"?"disabled":""}>${q==="processing"?'<span class="spinner"></span> Processing document…':"Upload and process document"}</button></div>
      </section>
    </div>`}function Ie(){const t=document.getElementById("document-file-input"),e=document.getElementById("document-dropzone"),i=document.getElementById("browse-document-btn"),a=document.getElementById("remove-document-btn"),r=document.getElementById("process-document-btn");i==null||i.addEventListener("click",o=>{o.stopPropagation(),t==null||t.click()}),e==null||e.addEventListener("click",()=>t==null?void 0:t.click()),e==null||e.addEventListener("keydown",o=>{(o.key==="Enter"||o.key===" ")&&(t==null||t.click())}),t==null||t.addEventListener("change",()=>{var o;return re((o=t.files)==null?void 0:o[0])});for(const o of["dragenter","dragover"])e==null||e.addEventListener(o,u=>{u.preventDefault(),e.classList.add("active")});for(const o of["dragleave","drop"])e==null||e.addEventListener(o,u=>{u.preventDefault(),e.classList.remove("active")});e==null||e.addEventListener("drop",o=>{var u,n;return re((n=(u=o.dataTransfer)==null?void 0:u.files)==null?void 0:n[0])}),a==null||a.addEventListener("click",()=>{L=null,x="",s.notify()}),r==null||r.addEventListener("click",async()=>{if(L){q="processing",x="",s.notify();try{const o=await y.processDocument(L);L=null,s.addToast("success","Document processed successfully."),s.setLastProcessResult(o)}catch(o){x=o.status>=500?"Document processing failed. Please try again or upload a clearer document.":o.message,q="idle",s.notify()}}})}const Ae=["Document uploaded","OCR processing","Information extraction","AI validation","GIS validation","Officer review"];function Le(t){return String(t).replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase())}function De(t,e){const i=typeof e=="object"?e.confidence:null,a=ce(e);return`<div class="result-field"><dt>${d(Le(t))}</dt><dd>${d(a??"Not extracted")}${typeof i=="number"?`<span>Confidence: ${Math.round(i*100)}%</span>`:""}${typeof i=="number"&&i<.8?'<small class="warning-text">Officer verification required</small>':""}</dd></div>`}function Re(){var r,o,u,n,$,w,l;const t=s.lastProcessResult;if(!t)return'<div class="page-content"><div class="empty-state"><h1>No processing result selected</h1><p>Choose a document from My Land Records to view its results.</p><button id="go-records" class="btn btn-primary">My Land Records</button></div></div>';const e=(r=t.review)!=null&&r.required?t.review.status||"PENDING_REVIEW":"NO_REVIEW_REQUIRED",i=t.validation||{},a=i.issues||[];return`<div class="page-content">
    <div class="page-heading heading-actions"><div><h1>Processing result</h1><p>${d(((o=t.document)==null?void 0:o.filename)||"Land document")} · ${d(((u=t.document)==null?void 0:u.document_id)||"")}</p></div><button id="view-processed-record" class="btn btn-outline">View saved record</button></div>
    <div class="notice notice-info">Extraction and validation results support officer review. They are not a legal land-record determination.</div>
    <section class="card"><h2>Processing workflow</h2><div class="pipeline-steps">${Ae.map((c,p)=>`<div class="step-item completed"><span class="step-icon">✓</span><span>${c}</span>${p===5?`<span class="badge ${I(e)}">${d(e)}</span>`:""}</div>`).join("")}</div></section>
    <div class="two-column">
      <section class="card"><h2>Extracted land-record information</h2><dl class="result-grid">${Object.entries(t.extraction||{}).map(([c,p])=>De(c,p)).join("")||"<p>No structured fields were returned.</p>"}</dl></section>
      <section class="card"><h2>Validation summary</h2><p><span class="badge ${I(i.status)}">${d(i.status||"UNAVAILABLE")}</span></p><p class="metric-inline">Confidence score: <strong>${i.score??"—"}</strong></p>${a.length?`<ul class="issue-list">${a.map(c=>`<li><span class="badge ${I(c.severity)}">${d(c.severity||"WARNING")}</span> ${d(c.message||c.rule||"Validation issue")}</li>`).join("")}</ul>`:'<p class="muted">No validation issues were reported.</p>'}<h3>GIS validation</h3><p><span class="badge ${I((n=t.gis)==null?void 0:n.status)}">${d((($=t.gis)==null?void 0:$.status)||"UNAVAILABLE")}</span></p><p class="muted">${((w=t.gis)==null?void 0:w.status)==="UNAVAILABLE"?"No geometry was supplied with this document.":`Area comparison: ${d(((l=t.gis)==null?void 0:l.area_match)||"Unavailable")}`}</p></section>
    </div>
  </div>`}function Te(){var t,e;(t=document.getElementById("go-records"))==null||t.addEventListener("click",()=>s.setActiveTab("my-records")),(e=document.getElementById("view-processed-record"))==null||e.addEventListener("click",()=>{var i,a;return s.setActiveTab("record-details",(a=(i=s.lastProcessResult)==null?void 0:i.document)==null?void 0:a.document_id)})}let G="",U="ALL";function Pe(){const t=s.myDocuments.filter(e=>{const i=G.toLowerCase();return(!i||[e.original_filename,e.document_id].some(r=>String(r||"").toLowerCase().includes(i)))&&(U==="ALL"||e.processing_status===U)});return`<div class="page-content"><div class="page-heading heading-actions"><div><h1>My Land Records</h1><p>Documents and digitized records associated with your verified account.</p></div><button id="records-upload-btn" class="btn btn-primary">Upload document</button></div>
    <section class="card"><div class="toolbar"><input id="record-search" class="form-control" value="${d(G)}" placeholder="Search by document name or ID" /><select id="record-status-filter" class="form-control"><option value="ALL">All statuses</option>${["UPLOADED","PROCESSING","PROCESSED","FAILED"].map(e=>`<option value="${e}" ${U===e?"selected":""}>${e}</option>`).join("")}</select></div>
    ${t.length?`<div class="table-responsive"><table class="table"><thead><tr><th>Document</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>${t.map(e=>`<tr><td><strong>${d(e.original_filename)}</strong><br><small>${d(e.document_id)}</small></td><td><span class="badge ${I(e.processing_status)}">${d(e.processing_status)}</span></td><td>${W(e.uploaded_at)}</td><td><button class="btn btn-outline btn-sm open-record" data-id="${d(e.document_id)}">View details</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty-state"><h2>No matching records</h2><p>${s.myDocuments.length?"Try changing the search or status filter.":"Upload a land document to begin digitization."}</p></div>`}</section></div>`}function ke(){var t,e,i;(t=document.getElementById("records-upload-btn"))==null||t.addEventListener("click",()=>s.setActiveTab("upload")),(e=document.getElementById("record-search"))==null||e.addEventListener("input",a=>{G=a.target.value,s.notify()}),(i=document.getElementById("record-status-filter"))==null||i.addEventListener("change",a=>{U=a.target.value,s.notify()}),document.querySelectorAll(".open-record").forEach(a=>a.addEventListener("click",()=>s.setActiveTab("record-details",a.dataset.id)))}function Oe(t){return String(t).replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase())}function Se(t){return Object.entries(t||{}).map(([e,i])=>`<div class="detail-row"><span>${d(Oe(e))}</span><strong>${d(ce(i)??"Not available")}</strong>${typeof i=="object"&&typeof i.confidence=="number"?`<small>${Math.round(i.confidence*100)}% confidence</small>`:""}</div>`).join("")}function xe(){var i,a,r,o,u,n,$,w,l,c,p,g,v;if(s.recordLoading)return'<div class="page-content"><div class="loading-state"><span class="spinner"></span> Loading record details…</div></div>';if(s.recordError)return`<div class="page-content"><div class="notice notice-error">${d(s.recordError)}</div><button id="back-to-records" class="btn btn-outline">Back to records</button></div>`;const t=s.selectedRecord;if(!t)return'<div class="page-content"><div class="empty-state"><h1>Record unavailable</h1><p>Select a document from My Land Records.</p></div></div>';const e=t.processing_result;return`<div class="page-content"><div class="page-heading heading-actions"><div><button id="back-to-records" class="text-button">← My Land Records</button><h1>${d(t.original_filename)}</h1><p>${d(t.document_id)} · Submitted ${W(t.uploaded_at)}</p></div><span class="badge ${I(t.processing_status)}">${d(t.processing_status)}</span></div>
    ${e?`<>
    <div class="notice notice-info">AI-generated information is advisory and remains subject to government officer verification.</div>
    <div class="two-column"><section class="card"><h2>Basic information</h2><div class="detail-list">${Se(e.extraction)}</div></section><section class="card"><h2>Document</h2><div class="detail-list"><div class="detail-row"><span>File type</span><strong>${d(t.file_type||"—").toUpperCase()}</strong></div><div class="detail-row"><span>File size</span><strong>${t.file_size?`${(t.file_size/1024/1024).toFixed(2)} MB`:"—"}</strong></div><div class="detail-row"><span>OCR language</span><strong>${d(((i=e.ocr)==null?void 0:i.language)||"—")}</strong></div><div class="detail-row"><span>OCR confidence</span><strong>${typeof((a=e.ocr)==null?void 0:a.confidence)=="number"?`${Math.round(e.ocr.confidence)}%`:"—"}</strong></div></div></section></div>
    <div class="two-column"><section class="card"><h2>Validation</h2><p><span class="badge ${I((r=e.validation)==null?void 0:r.status)}">${d(((o=e.validation)==null?void 0:o.status)||"UNAVAILABLE")}</span></p><p>Confidence score: <strong>${((u=e.validation)==null?void 0:u.score)??"—"}</strong></p>${(((n=e.validation)==null?void 0:n.issues)||[]).length?`<ul class="issue-list">${e.validation.issues.map(A=>`<li><span class="badge ${I(A.severity)}">${d(A.severity||"WARNING")}</span> ${d(A.message||A.rule||"Issue requires review")}</li>`).join("")}</ul>`:'<p class="muted">No validation issues were returned.</p>'}</section><section class="card"><h2>GIS and review</h2><p>GIS: <span class="badge ${I(($=e.gis)==null?void 0:$.status)}">${d(((w=e.gis)==null?void 0:w.status)||"UNAVAILABLE")}</span></p><p>Review: <span class="badge ${I(((l=e.review)==null?void 0:l.status)||((c=e.review)!=null&&c.required?"PENDING_REVIEW":"COMPLETED"))}">${d(((p=e.review)==null?void 0:p.status)||((g=e.review)!=null&&g.required?"PENDING_REVIEW":"No review required"))}</span></p>${(v=e.review)!=null&&v.case_id?`<p class="muted">Application reference: ${d(e.review.case_id)}</p>`:""}</section></div></>`:`<section class="card"><h2>Processing status</h2><p>${t.processing_status==="FAILED"?"Processing did not complete. Upload a clearer document and try again.":"This document is awaiting processing results."}</p></section>`}</div>`}function Ne(){var t;(t=document.getElementById("back-to-records"))==null||t.addEventListener("click",()=>s.setActiveTab("my-records"))}function Be(){if(s.applicationsLoading)return'<div class="page-content"><div class="loading-state"><span class="spinner"></span> Loading applications…</div></div>';if(s.applicationsError)return`<div class="page-content"><div class="notice notice-error">${d(s.applicationsError)}</div></div>`;const t=s.applications||[];return`<div class="page-content"><div class="page-heading"><h1>Applications and review status</h1><p>Only submissions that require an officer review are listed here.</p></div><section class="card">${t.length?`<div class="table-responsive"><table class="table"><thead><tr><th>Application ID</th><th>Land record</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>${t.map(e=>`<tr><td><strong>${d(e.application_id)}</strong></td><td>${d(e.survey_number||e.filename)}</td><td>${W(e.submitted_at)}</td><td><span class="badge ${I(e.status)}">${d(e.status)}</span></td><td><button class="btn btn-outline btn-sm application-record" data-id="${d(e.document_id)}">View</button></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty-state"><h2>No review applications</h2><p>Documents that need officer review will appear here after processing.</p></div>'}</section></div>`}function _e(){document.querySelectorAll(".application-record").forEach(t=>t.addEventListener("click",()=>s.setActiveTab("record-details",t.dataset.id)))}function ze(){var i;const t=s.user||{},e=String(t.external_reference||"").replace(/^AADHAAR-/,"")||"Not available";return`<div class="page-content narrow-page"><div class="page-heading"><h1>Citizen profile</h1><p>Account information provided by your authenticated session.</p></div><section class="card"><div class="detail-list"><div class="detail-row"><span>Name</span><strong>${d(t.name||"Citizen")}</strong></div><div class="detail-row"><span>Identity reference</span><strong>${d(e)}</strong></div><div class="detail-row"><span>Role</span><strong>${d(t.primary_role||((i=t.roles)==null?void 0:i[0])||"CITIZEN")}</strong></div><div class="detail-row"><span>Account status</span><strong>${d(t.status||"ACTIVE")}</strong></div></div></section></div>`}function Ce(){}const oe={dashboard:[be,ye],upload:[we,Ie],"processing-result":[Re,Te],"my-records":[Pe,ke],"record-details":[xe,Ne],applications:[Be,_e],profile:[ze,Ce]};function le(){const t=document.getElementById("app");if(!s.isAuthenticated){t.innerHTML=`${ie()}${fe()}${ae()}`,se(),he();return}const[e,i]=oe[s.activeTab]||oe.dashboard;t.innerHTML=`<div class="app-container">${me()}<div class="main-content-wrapper">${ie()}${e()}</div></div>${ae()}`,ge(),se(),i()}s.subscribe(le);le();s.init();
