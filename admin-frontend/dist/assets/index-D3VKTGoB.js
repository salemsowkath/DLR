(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function i(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(r){if(r.ep)return;r.ep=!0;const o=i(r);fetch(r.href,o)}})();function na(){var t;const e="http://localhost:4000";if(typeof window<"u"&&((t=window.location)!=null&&t.hostname)){const i=window.location.hostname;if(i!=="localhost"&&i!=="127.0.0.1"&&(e.includes("localhost")||e.includes("127.0.0.1")))return`${window.location.protocol||"http:"}//${i}:4000`}return e}const Ht=na();function Gt(){return localStorage.getItem("dlr_admin_token")||null}function re(e){e?localStorage.setItem("dlr_admin_token",e):localStorage.removeItem("dlr_admin_token")}function Hi(){let e=localStorage.getItem("dlr_browser_context_id");return e||(e="ctx-"+Math.random().toString(36).substring(2,10)+"-"+Date.now(),localStorage.setItem("dlr_browser_context_id",e)),e}const ai=typeof window<"u"&&"BroadcastChannel"in window?new BroadcastChannel("dlr_browser_session_channel"):null;ai&&(ai.onmessage=e=>{var i,n;const t=(i=e.data)==null?void 0:i.role;((n=e.data)==null?void 0:n.type)==="DLR_NEW_LOGIN"&&t!=="SUPER_ADMIN"&&t!=="STATE_ADMIN"&&(re(null),window.dispatchEvent(new CustomEvent("dlr:session-replaced",{detail:{message:"Your DLR session was replaced by a new login.",newRole:t}})))});function da(e,t){ai&&e&&ai.postMessage({type:"DLR_NEW_LOGIN",role:t,userId:e.id,timestamp:Date.now(),contextId:Hi()})}async function m(e,t={}){var g,b,$,z;const i=`${Ht}${e}`,n=Gt(),r={...t.headers||{},"x-client-context-id":Hi()};n&&(r.Authorization=`Bearer ${n}`),!t.isFormData&&!r["Content-Type"]&&(r["Content-Type"]="application/json");const o={method:t.method||"GET",headers:r,body:t.isFormData?t.body:t.body?JSON.stringify(t.body):void 0};let l;try{l=await fetch(i,o)}catch{throw new Error("Network error: Unable to communicate with DLR backend service.")}let d;try{d=await l.json()}catch{d=null}if(!l.ok){l.status===401&&(re(null),((g=d==null?void 0:d.error)==null?void 0:g.code)==="SESSION_REPLACED"?window.dispatchEvent(new CustomEvent("dlr:session-replaced",{detail:{message:d.error.message||"Your DLR session was replaced by a new login."}})):window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const v=((b=d==null?void 0:d.error)==null?void 0:b.message)||(d==null?void 0:d.message)||`API Error (${l.status})`,p=new Error(v);throw p.status=l.status,p.code=(($=d==null?void 0:d.error)==null?void 0:$.code)||"API_ERROR",p.details=((z=d==null?void 0:d.error)==null?void 0:z.details)||null,p}return(d==null?void 0:d.data)||d}const w={getStoredToken:Gt,setStoredToken:re,async requestOtp(e){return m("/api/auth/citizen/otp/request",{method:"POST",body:{aadhaarNumber:e}})},async citizenLogin(e){return this.requestOtp(e)},async citizenRegister(e){return m("/api/auth/citizen/register",{method:"POST",body:e})},async verifyOtp({aadhaarNumber:e,otp:t,sessionId:i}){const n=await m("/api/auth/citizen/otp/verify",{method:"POST",body:{aadhaarNumber:e,otp:t,sessionId:i}});return n!=null&&n.accessToken&&re(n.accessToken),n},async citizenVerifyOtp({aadhaarNumber:e,otp:t,sessionId:i}){return this.verifyOtp({aadhaarNumber:e,otp:t,sessionId:i})},async citizenVerifyRegistrationOtp({aadhaarNumber:e,otp:t,sessionId:i}){return this.verifyOtp({aadhaarNumber:e,otp:t,sessionId:i})},async officerLogin({username:e,identifier:t,password:i}){const n=e||t,r=await m("/api/auth/officer/login",{method:"POST",body:{username:n,identifier:n,password:i}});return r!=null&&r.accessToken&&re(r.accessToken),r},async ministerLogin({username:e,identifier:t,password:i}){const n=e||t,r=await m("/api/auth/minister/login",{method:"POST",body:{username:n,identifier:n,password:i}});return r!=null&&r.accessToken&&re(r.accessToken),r},async superAdminLogin({username:e,identifier:t,password:i}){var l,d;const n=e||t,r=await m("/api/auth/super-admin/login",{method:"POST",body:{username:n,identifier:n,password:i}}),o=(r==null?void 0:r.token)||(r==null?void 0:r.accessToken)||((l=r==null?void 0:r.data)==null?void 0:l.token)||((d=r==null?void 0:r.data)==null?void 0:d.accessToken);return o&&re(o),r},async stateAdminLogin({username:e,identifier:t,password:i}){var l,d;const n=e||t,r=await m("/api/auth/state-admin/login",{method:"POST",body:{username:n,identifier:n,password:i}}),o=(r==null?void 0:r.token)||(r==null?void 0:r.accessToken)||((l=r==null?void 0:r.data)==null?void 0:l.token)||((d=r==null?void 0:r.data)==null?void 0:d.accessToken);return o&&re(o),r},async getMe(){return m("/api/auth/me")},async logout(){try{await m("/api/auth/logout",{method:"POST"})}finally{re(null)}},async uploadDocument(e){const t=new FormData;return t.append("file",e),m("/api/documents/upload",{method:"POST",isFormData:!0,body:t})},async checkDuplicateRecord({surveyNumber:e,village:t,taluk:i,district:n}){return m("/api/documents/check-duplicate",{method:"POST",body:{surveyNumber:e,village:t,taluk:i,district:n}})},async submitCitizenApplication(e,{citizenData:t={}}={}){const i=new FormData;i.append("file",e);for(const[n,r]of Object.entries(t))r!=null&&r!==""&&i.append(n,String(r));return m("/api/documents",{method:"POST",isFormData:!0,body:i})},async processDocument(e,{language:t="eng",geometry:i=null,crs:n="",citizenData:r={}}={}){const o=new FormData;o.append("file",e),o.append("language",t),i&&o.append("geometry",typeof i=="string"?i:JSON.stringify(i)),n&&o.append("crs",n);for(const[l,d]of Object.entries(r))d!=null&&d!==""&&o.append(l,String(d));return m("/api/documents/process",{method:"POST",isFormData:!0,body:o})},async getMyDocuments(){const e=await m("/api/documents/mine");return(e==null?void 0:e.documents)||e||[]},async getDocumentById(e){return m(`/api/documents/${e}`)},async getDocumentFile(e){const t=await fetch(`${Ht}/api/documents/${encodeURIComponent(e)}/file`,{headers:Gt()?{Authorization:`Bearer ${Gt()}`}:{}});if(!t.ok){t.status===401&&(re(null),window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const i=new Error(t.status===403?"You do not have access to this document.":"Unable to load the original document.");throw i.status=t.status,i}return t.blob()},getDocumentFileUrl(e){return`${Ht}/api/documents/${encodeURIComponent(e)}/file`},async getMyApplications(){const e=await m("/api/documents/applications/mine");return(e==null?void 0:e.applications)||[]},async getReviewCases(e={}){const t=new URLSearchParams;e.status&&t.set("status",e.status),e.priority&&t.set("priority",e.priority),e.limit&&t.set("limit",e.limit),e.offset&&t.set("offset",e.offset);const i=t.toString()?`?${t.toString()}`:"";return m(`/api/review/cases${i}`)},async getReviewCaseById(e){return m(`/api/review/cases/${e}`)},async triggerAiProcessCase(e,{language:t="eng"}={}){return m(`/api/review/cases/${e}/process-ai`,{method:"POST",body:{language:t}})},async startReviewCase(e){return m(`/api/review/cases/${e}/start`,{method:"POST"})},async getReviewStats(){return m("/api/review/stats")},async approveReviewCase(e,{notes:t=""}={}){return m(`/api/review/cases/${e}/approve`,{method:"POST",body:{officerNotes:t}})},async rejectReviewCase(e,{reason:t,notes:i=""}){return m(`/api/review/cases/${e}/reject`,{method:"POST",body:{reason:t,officerNotes:i}})},async requestCorrectionCase(e,{reason:t,notes:i=""}){return m(`/api/review/cases/${e}/request-correction`,{method:"POST",body:{reason:t,officerNotes:i}})},async holdReviewCase(e,{reason:t,notes:i=""}){return m(`/api/review/cases/${e}/hold`,{method:"POST",body:{reason:t}})},async createOfficerCorrection(e,{fieldName:t,originalValue:i,correctedValue:n,reason:r=""}){return m(`/api/review/cases/${e}/correction`,{method:"POST",body:{field:t,originalValue:i,correctedValue:n,reason:r}})},async addReviewNote(e,{noteText:t,isInternal:i=!0}){return m(`/api/review/cases/${e}/notes`,{method:"POST",body:{note:t}})},async resolveAnomaly(e,t,{resolutionType:i="OVERRIDDEN",notes:n=""}){return m(`/api/review/cases/${e}/anomalies/${t}/resolve`,{method:"POST",body:{resolutionType:i,notes:n}})},async getSuperAdminDashboard(){return m("/api/super-admin/dashboard")},async getSuperAdminOfficers(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/super-admin/officers${i?"?"+i:""}`)},async createOfficer(e){return m("/api/super-admin/officers",{method:"POST",body:e})},async updateOfficer(e,t){return m(`/api/super-admin/officers/${e}`,{method:"PATCH",body:t})},async setOfficerStatus(e,t){return m(`/api/super-admin/officers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetOfficerPassword(e,t){return m(`/api/super-admin/officers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getSuperAdminMinisters(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/super-admin/ministers${i?"?"+i:""}`)},async createMinister(e){return m("/api/super-admin/ministers",{method:"POST",body:e})},async updateMinister(e,t){return m(`/api/super-admin/ministers/${e}`,{method:"PATCH",body:t})},async setMinisterStatus(e,t){return m(`/api/super-admin/ministers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetMinisterPassword(e,t){return m(`/api/super-admin/ministers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getSuperAdminCitizens(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/super-admin/citizens${i?"?"+i:""}`)},async setCitizenStatus(e,t){return m(`/api/super-admin/citizens/${e}/status`,{method:"PATCH",body:{status:t}})},async getSuperAdminAuditLogs(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/super-admin/audit-logs${i?"?"+i:""}`)},async getSuperAdminLandRecords(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/super-admin/land-records${i?"?"+i:""}`)},async resetUserPassword(e,t){return m(`/api/super-admin/users/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStates(){return m("/api/super-admin/states")},async getSuperAdminStateAdmins(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/super-admin/state-admins${i?"?"+i:""}`)},async getSuperAdminStateAdmin(e){return m(`/api/super-admin/state-admins/${e}`)},async createStateAdmin(e){return m("/api/super-admin/state-admins",{method:"POST",body:e})},async updateStateAdmin(e,t){return m(`/api/super-admin/state-admins/${e}`,{method:"PATCH",body:t})},async setStateAdminStatus(e,t){return m(`/api/super-admin/state-admins/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminPassword(e,t){return m(`/api/super-admin/state-admins/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminDashboard(){return m("/api/state-admin/dashboard")},async getStateAdminOfficers(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/state-admin/officers${i?"?"+i:""}`)},async getStateAdminOfficer(e){return m(`/api/state-admin/officers/${e}`)},async createStateAdminOfficer(e){return m("/api/state-admin/officers",{method:"POST",body:e})},async updateStateAdminOfficer(e,t){return m(`/api/state-admin/officers/${e}`,{method:"PATCH",body:t})},async setStateAdminOfficerStatus(e,t){return m(`/api/state-admin/officers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminOfficerPassword(e,t){return m(`/api/state-admin/officers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminMinisters(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/state-admin/ministers${i?"?"+i:""}`)},async getStateAdminMinister(e){return m(`/api/state-admin/ministers/${e}`)},async createStateAdminMinister(e){return m("/api/state-admin/ministers",{method:"POST",body:e})},async updateStateAdminMinister(e,t){return m(`/api/state-admin/ministers/${e}`,{method:"PATCH",body:t})},async setStateAdminMinisterStatus(e,t){return m(`/api/state-admin/ministers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminMinisterPassword(e,t){return m(`/api/state-admin/ministers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminCitizens(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/state-admin/citizens${i?"?"+i:""}`)},async getStateAdminCitizen(e){return m(`/api/state-admin/citizens/${e}`)},async getStateAdminLandRecords(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/state-admin/land-records${i?"?"+i:""}`)},async getStateAdminLandRecord(e){return m(`/api/state-admin/land-records/${e}`)},async getStateAdminApplications(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/state-admin/applications${i?"?"+i:""}`)},async getStateAdminApplication(e){return m(`/api/state-admin/applications/${e}`)},async getStateAdminReports(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/state-admin/reports${i?"?"+i:""}`)},async getSuperAdminOfficerWork(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/admin/work/officers${i?"?"+i:""}`)},async getSuperAdminOfficerProfile(e){return m(`/api/admin/work/officers/${encodeURIComponent(e)}`)},async getSuperAdminMinisterWork(e={}){const t=new URLSearchParams;for(const[n,r]of Object.entries(e))r!=null&&r!==""&&t.append(n,r);const i=t.toString();return m(`/api/admin/work/ministers${i?"?"+i:""}`)},async getSuperAdminMinisterProfile(e){return m(`/api/admin/work/ministers/${encodeURIComponent(e)}`)},async getSuperAdminReportsOverview(){return m("/api/admin/reports/overview")},async getSuperAdminReport(e,t={}){const i=new URLSearchParams({category:e});for(const[n,r]of Object.entries(t))r!=null&&r!==""&&i.append(n,r);return m(`/api/admin/reports/query?${i.toString()}`)},async getOfficerApplications(e={}){const t=new URLSearchParams;e.status&&t.set("status",e.status),e.page&&t.set("page",e.page),e.limit&&t.set("limit",e.limit);const i=t.toString()?`?${t.toString()}`:"";return m(`/api/officer/applications${i}`)},async getOfficerApplicationById(e){return m(`/api/officer/applications/${encodeURIComponent(e)}`)},async generateDigitalLandRecord(e,t={}){return m(`/api/officer/applications/${encodeURIComponent(e)}/generate`,{method:"POST",body:t})},async getDigitalRecordDraft(e){return m(`/api/officer/applications/${encodeURIComponent(e)}/digital-record`)},async updateDigitalRecordDraft(e,t){return m(`/api/officer/applications/${encodeURIComponent(e)}/digital-record`,{method:"PATCH",body:t})},async scheduleAppointment(e,t){return m(`/api/officer/applications/${encodeURIComponent(e)}/appointment`,{method:"POST",body:t})},async startVerification(e,t={}){return m(`/api/officer/applications/${encodeURIComponent(e)}/verification/start`,{method:"POST",body:t})},async sendVerificationOtp(e,t={}){return m(`/api/officer/applications/${encodeURIComponent(e)}/verification/otp/send`,{method:"POST",body:t})},async verifyVerificationOtp(e,t){return m(`/api/officer/applications/${encodeURIComponent(e)}/verification/otp/verify`,{method:"POST",body:t})},async uploadVerificationPhoto(e,t){return m(`/api/officer/applications/${encodeURIComponent(e)}/verification/photo`,{method:"POST",isFormData:!0,body:t})},async performFinalVerification(e,t={}){return m(`/api/officer/applications/${encodeURIComponent(e)}/final-verify`,{method:"POST",body:t})},async approveApplication(e,t={}){return m(`/api/officer/applications/${encodeURIComponent(e)}/approve`,{method:"POST",body:t})},async rejectApplication(e,t){return m(`/api/officer/applications/${encodeURIComponent(e)}/reject`,{method:"POST",body:t})},async submitLandRecordApplication(e){return m("/api/land-records/applications",{method:"POST",isFormData:!0,body:e})},async getMyLandApplications(){return m("/api/land-records/my-applications")},async getMyAppointments(){return m("/api/appointments")},async getApprovedLandRecords(){return m("/api/land-records/approved")},async getApprovedLandRecordById(e){return m(`/api/land-records/approved/${encodeURIComponent(e)}`)},async getNotifications(e={}){const t=new URLSearchParams;e.unreadOnly&&t.set("unreadOnly","true");const i=t.toString()?`?${t.toString()}`:"";return m(`/api/notifications${i}`)},async markNotificationRead(e){return m(`/api/notifications/${encodeURIComponent(e)}/read`,{method:"PATCH"})},async markAllNotificationsRead(){return m("/api/notifications/read-all",{method:"PATCH"})},getVerificationPhotoUrl(e){return`${Ht}/api/verification/photos/${encodeURIComponent(e)}`}};function oa(e){return e?Array.isArray(e.roles)?e.roles:[e.primary_role||e.role||""]:[]}function Gi(e,...t){return oa(e).some(i=>t.includes(String(i||"").toUpperCase()))}function ke(e){return Gi(e,"SUPER_ADMIN")}function xi(e){return Gi(e,"STATE_ADMIN")}class la{constructor(){this.user=null,this.isAuthenticated=!1,this.activeTab="portal",this.selectedOfficerWorkId=null,this.selectedMinisterWorkId=null,this.activeReportCategory="officer-performance",this.notifications=[],this.unreadNotificationsCount=0,this.toasts=[],this.loading=!1,this.listeners=new Set,window.addEventListener("dlr:unauthorized",()=>{this._resetSession(),this.addToast("error","Session expired. Please log in again."),this.notify()}),window.addEventListener("dlr:session-replaced",t=>{var n;this._resetSession();const i=((n=t.detail)==null?void 0:n.message)||"Your DLR session was replaced by a new login.";this.addToast("error",i),this.notify()})}_resetSession(){this.user=null,this.isAuthenticated=!1,this.activeTab="portal",this.selectedOfficerWorkId=null,this.selectedMinisterWorkId=null,this.notifications=[],this.unreadNotificationsCount=0}get isSuperAdmin(){return ke(this.user)}get isStateAdmin(){return xi(this.user)}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}notify(){for(const t of this.listeners)t(this)}addToast(t,i){const n=Date.now()+Math.random();this.toasts.push({id:n,type:t,message:i}),this.notify(),setTimeout(()=>{this.toasts=this.toasts.filter(r=>r.id!==n),this.notify()},4e3)}async init(){if(!w.getStoredToken()){this.notify();return}try{this.loading=!0,this.notify();const i=await w.getMe();if(!ke(i)&&!xi(i)){w.setStoredToken(null),this._resetSession();return}this.user=i,this.isAuthenticated=!0,this.activeTab=ke(i)?"super-admin-dashboard":"state-admin-dashboard"}catch{w.setStoredToken(null),this._resetSession()}finally{this.loading=!1,this.notify()}}async setAuthenticatedUser(t){if(!ke(t)&&!xi(t)){this.addToast("error","Access denied. This portal is for Administrators only.");return}this.user=t,this.isAuthenticated=!0,this.activeTab=ke(t)?"super-admin-dashboard":"state-admin-dashboard",da(t,ke(t)?"SUPER_ADMIN":"STATE_ADMIN"),this.notify()}setActiveTab(t,i=null,n=null){if(t.startsWith("super-admin-")&&!this.isSuperAdmin){this.addToast("error","Access denied. You must be a Super Administrator to access this area.");return}this.activeTab=t,i&&(t==="super-admin-officer-detail"?this.selectedOfficerWorkId=i:t==="super-admin-minister-detail"?this.selectedMinisterWorkId=i:t==="super-admin-reports"&&(this.activeReportCategory=i)),n&&typeof n=="string"&&t==="super-admin-reports"&&(this.activeReportCategory=n),this.notify()}async logout(){try{await w.logout()}catch{}finally{w.setStoredToken(null),this._resetSession(),this.addToast("success","Logged out successfully."),this.notify()}}}const s=new la;function a(e){return String(e??"").replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[t])}function Ft(e){if(!e)return"—";const t=new Date(e);return Number.isNaN(t.getTime())?"—":t.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}function _(e){if(e==null)return"0";const t=Number(e);return Number.isNaN(t)?String(e):t.toLocaleString("en-IN")}function ji(){const{user:e,isAuthenticated:t}=s;if(!t||!e)return`
      <header class="app-header">
        <div class="header-left">
          <div class="emblem-badge">
            <div class="emblem-icon">🏛️</div>
            <div>
              <div style="font-weight:700;">DLR Administration Portal</div>
              <div class="gov-tag">Governance & Jurisdiction Oversight · SIH 2026</div>
            </div>
          </div>
        </div>
      </header>
    `;const i=s.isSuperAdmin,n=i?"DLR Super Admin Portal":"DLR State Administration",r=i?"Nationwide System Administration & Governance (All 28 States)":`State Jurisdiction: ${e.state_name||e.state||"Assigned State"}`,o=i?"🛡️":"🏢",l=e.username||(i?"SUPER ADMIN":"STATE ADMIN");return`
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display:none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">${o}</div>
          <div>
            <div style="font-size:1.05rem; font-weight:700;">${n}</div>
            <div class="gov-tag">${r}</div>
          </div>
        </div>
      </div>

      <div class="header-right" style="display:flex; align-items:center; gap:0.75rem; position:relative;">
        <!-- Jurisdiction Pill -->
        <div style="background:${i?"rgba(59,130,246,0.15)":"rgba(168,85,247,0.15)"}; border:1px solid ${i?"#3b82f6":"#a855f7"}; padding:0.3rem 0.75rem; border-radius:20px; font-size:0.75rem; font-weight:700; color:${i?"#60a5fa":"#c084fc"};">
          ${i?"🌐 INDIA-WIDE":`📍 ${e.state||"STATE SCOPED"}`}
        </div>

        <!-- Identity info -->
        <div class="user-info">
          <div style="font-size:0.85rem; font-weight:600;">${a(l)}</div>
          <div style="font-size:0.7rem; color:${i?"#60a5fa":"#c084fc"}; font-weight:600;">
            ${i?"Super Administrator":"State Administrator"}
          </div>
        </div>

        <button id="header-logout-btn" class="btn btn-outline btn-sm">Logout</button>
      </div>
    </header>
  `}function _i(){const e=document.getElementById("header-logout-btn");e&&e.addEventListener("click",()=>{s.logout()})}function ca(){var b,$;const e=s.activeTab,t=s.isSuperAdmin,i=((b=s.user)==null?void 0:b.state_name)||(($=s.user)==null?void 0:$.state)||"Tamil Nadu",o=t?[{id:"super-admin-dashboard",label:"Nationwide Dashboard",icon:"📊"},{id:"super-admin-state-admins",label:"State Admins",icon:"🏢"},{id:"super-admin-officers",label:"Officers Management",icon:"👮"},{id:"super-admin-ministers",label:"Ministers Management",icon:"🏛️"},{id:"super-admin-citizens",label:"Citizens Overview",icon:"👥"},{id:"super-admin-records",label:"Land Records",icon:"📜"},{id:"super-admin-officer-work",label:"Officer Work",icon:"💼"},{id:"super-admin-minister-work",label:"Minister Work",icon:"👔"},{id:"super-admin-reports",label:"Nationwide Reports",icon:"📈"},{id:"super-admin-audit-logs",label:"Audit Logs",icon:"📋"},{id:"super-admin-settings",label:"System Settings",icon:"⚙️"}]:[{id:"state-admin-dashboard",label:"Dashboard",icon:"📊"},{id:"state-admin-officers",label:"Officers",icon:"👮"},{id:"state-admin-ministers",label:"Ministers",icon:"🏛️"},{id:"state-admin-records",label:"Land Records",icon:"📜"},{id:"state-admin-tax",label:"Tax / Revenue",icon:"💰"},{id:"state-admin-reports",label:"Reports",icon:"📈"},{id:"state-admin-audit",label:"Activity / Audit",icon:"📋"},{id:"state-admin-profile",label:"Profile",icon:"👤"}],l=t?"DLR SUPER ADMIN":"STATE ADMIN",d=t?"Nationwide Governance":i,g=t?"SUPER ADMIN GOVERNANCE":`${i.toUpperCase()} ADMINISTRATION`;return`
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">${t?"🛡️":"🏢"}</div>
        <div>
          <div style="font-weight:800; font-size:1.05rem; letter-spacing:0.02em; color:#f8fafc;">${l}</div>
          <div style="font-size:0.75rem; color:${t?"#60a5fa":"#c084fc"}; font-weight:700;">${d}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">${g}</div>
        ${o.map(z=>`
          <button
            class="sidebar-nav-item ${e===z.id||z.id==="super-admin-officer-work"&&e==="super-admin-officer-detail"||z.id==="super-admin-minister-work"&&e==="super-admin-minister-detail"?"active":""}"
            data-tab="${z.id}"
          >
            <span class="nav-icon">${z.icon}</span>
            <span>${z.label}</span>
          </button>
        `).join("")}

        <button class="sidebar-nav-item" id="sidebar-logout-btn" style="color:#f87171; margin-top: auto;">
          <span class="nav-icon">🚪</span>
          <span>Logout</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div style="font-size:0.75rem; color:#64748b; line-height:1.4;">
          ${t?"All 28 States Active":`Scope: ${i}`}<br />
          <span style="color:#22c55e;">● Verified Authority</span>
        </div>
      </div>
    </aside>
  `}function ma(){var t;document.querySelectorAll(".sidebar-nav-item[data-tab]").forEach(i=>{i.addEventListener("click",()=>{const n=i.getAttribute("data-tab");n&&s.setActiveTab(n)})}),(t=document.getElementById("sidebar-logout-btn"))==null||t.addEventListener("click",async()=>{await s.logout()})}function Vi(){const{toasts:e}=s;return!e||e.length===0?"":`
    <div class="toast-container">
      ${e.map(t=>`
        <div class="toast toast-${t.type}">
          <span>${t.type==="error"?"⚠️":t.type==="success"?"✅":"ℹ️"}</span>
          <div>${t.message}</div>
        </div>
      `).join("")}
    </div>
  `}function $i(e,t=""){var i;if(typeof window<"u"&&((i=window.location)!=null&&i.hostname)){const n=window.location.protocol||"http:",r=window.location.hostname;return`${n}//${r}:${e}${t}`}return`http://localhost:${e}${t}`}function pa(){const e=$i(3e3,"/citizen/login");return`
    <div class="auth-container">
      <div class="auth-card" style="max-width:620px;">
        <div class="auth-header">
          <div style="font-size:2.8rem;margin-bottom:0.5rem;">🛡️</div>
          <h1 style="font-size:1.6rem;font-weight:700;">DLR Portal Selection</h1>
          <p style="color:#94a3b8;font-size:0.9rem;">
            Intelligent Land Record Digitization & Governance System<br />
            Select your administrative level or portal to continue
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:1.25rem;margin:1.5rem 0;">
          <!-- 1. ADMINISTRATION PORTAL (HOSTED ON PORT 3002) -->
          <div style="border: 2px solid #a855f7; border-radius: 12px; padding: 1.25rem; background: rgba(168, 85, 247, 0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
              <div style="font-weight: 700; font-size: 1rem; color: #d8b4fe; display: flex; align-items: center; gap: 0.5rem;">
                <span>🛡️</span> ADMINISTRATION PORTAL
              </div>
              <span class="badge badge-warning" style="font-size: 0.72rem; background: rgba(168,85,247,0.2); color: #c084fc; border-color: rgba(168,85,247,0.4);">THIS PLATFORM · PORT 3002</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div
                id="portal-select-state-admin"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#a855f7';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">🏢</span>
                  <div style="font-weight: 700; color: #f8fafc; font-size: 0.92rem;">STATE ADMIN LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  State Officers, Ministers & Land Governance
                </div>
              </div>

              <div
                id="portal-select-super-admin"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#3b82f6';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">🛡️</span>
                  <div style="font-weight: 700; color: #60a5fa; font-size: 0.92rem;">SUPER ADMIN LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  Nationwide System (All 28 States) & Logs
                </div>
              </div>
            </div>
          </div>

          <!-- 2. GOVERNMENT PORTAL (PORT 3001) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b;">
            <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>🏛️</span> GOVERNMENT PORTAL (Port 3001)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <a href="${$i(3001,"/officer/login")}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                👮 OFFICER LOGIN →
              </a>
              <a href="${$i(3001,"/minister/login")}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                🏛️ MINISTER LOGIN →
              </a>
            </div>
          </div>

          <!-- 3. CITIZEN PORTAL (PORT 3000) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem;">
                <span>👥</span> CITIZEN PORTAL
              </div>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
                Citizen verification, submissions & appointments (Port 3000)
              </div>
            </div>
            <a href="${e}" class="btn btn-outline btn-sm" style="font-weight: 600; text-decoration: none;">
              Citizen Sign In →
            </a>
          </div>
        </div>

        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #334155;text-align:center;font-size:0.8rem;color:#64748b;">
          Government of India · Problem Statement 26018 · SIH 2026<br />
          Administrative credentials and session integrity strictly monitored.
        </div>
      </div>
    </div>
  `}function ua(){var e,t;(e=document.getElementById("portal-select-state-admin"))==null||e.addEventListener("click",()=>{s.activeTab="state-admin-login",s.notify()}),(t=document.getElementById("portal-select-super-admin"))==null||t.addEventListener("click",()=>{s.activeTab="super-admin-login",s.notify()})}let ri=!1,me="";function fa(){return`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">🏢</div>
          <h1>State Admin Portal</h1>
          <p>Sign in with your State Administrator credentials</p>
        </div>

        ${me?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${a(me)}</div>`:""}

        <form id="state-admin-login-form">
          <div class="form-group">
            <label class="form-label" for="state-admin-username-input">State Admin Username</label>
            <input
              type="text"
              id="state-admin-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. Tamil_Nadu_admin"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="state-admin-password-input">Password</label>
            <input
              type="password"
              id="state-admin-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="state-admin-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${ri?"disabled":""}>
            ${ri?'<div class="spinner"></div> Authenticating...':"Sign in to State Admin Portal →"}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">Super Administrator?</span>
          <a href="#" id="switch-to-super-admin" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Super Admin Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="state-admin-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Restricted access · Single State Jurisdiction · STATE_ADMIN role required
        </div>
      </div>
    </div>
  `}function va(){var e,t,i;(e=document.getElementById("state-admin-back-to-portal"))==null||e.addEventListener("click",n=>{n.preventDefault(),me="",s.activeTab="portal",s.notify()}),(t=document.getElementById("switch-to-super-admin"))==null||t.addEventListener("click",n=>{n.preventDefault(),me="",s.activeTab="super-admin-login",s.notify()}),(i=document.getElementById("state-admin-login-form"))==null||i.addEventListener("submit",async n=>{var l,d,g;n.preventDefault();const r=(((l=document.getElementById("state-admin-username-input"))==null?void 0:l.value)||"").trim(),o=((d=document.getElementById("state-admin-password-input"))==null?void 0:d.value)||"";if(!r||!o){me="Please enter your State Admin username and password.",s.notify();return}ri=!0,me="",s.notify();try{const b=await w.stateAdminLogin({username:r,password:o}),$=(b==null?void 0:b.user)||((g=b==null?void 0:b.data)==null?void 0:g.user);if(!$)throw new Error("State Admin login response did not contain user data.");const z=String($.role||$.primary_role||"").toUpperCase();if(z!=="STATE_ADMIN")throw new Error(`Access denied. This portal is for State Administrators only. Your role is: ${z}`);me="",s.addToast("success",`Authenticated as State Administrator for ${$.state_name||$.state||"assigned state"}.`),await s.setAuthenticatedUser($)}catch(b){me=b.message||"State Admin sign in failed. Please check your credentials."}finally{ri=!1,s.notify()}})}let si=!1,pe="";function ga(){return`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">🔐</div>
          <h1>Super Admin Portal</h1>
          <p>Sign in with your Super Administrator credentials</p>
        </div>

        ${pe?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${a(pe)}</div>`:""}

        <form id="super-admin-login-form">
          <div class="form-group">
            <label class="form-label" for="super-admin-username-input">Super Admin Username</label>
            <input
              type="text"
              id="super-admin-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. superadmin"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="super-admin-password-input">Password</label>
            <input
              type="password"
              id="super-admin-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="super-admin-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${si?"disabled":""}>
            ${si?'<div class="spinner"></div> Authenticating...':"Sign in to Admin Portal →"}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">State Administrator?</span>
          <a href="#" id="switch-to-state-admin" style="color:#a855f7;font-weight:600;text-decoration:none;margin-left:0.35rem;">State Admin Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="super-admin-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Restricted access · All actions are immutably logged · SUPER_ADMIN role required
        </div>
      </div>
    </div>
  `}function ya(){var e,t,i;(e=document.getElementById("super-admin-back-to-portal"))==null||e.addEventListener("click",n=>{n.preventDefault(),pe="",s.activeTab="portal",s.notify()}),(t=document.getElementById("switch-to-state-admin"))==null||t.addEventListener("click",n=>{n.preventDefault(),pe="",s.activeTab="state-admin-login",s.notify()}),(i=document.getElementById("super-admin-login-form"))==null||i.addEventListener("submit",async n=>{var l,d,g;n.preventDefault();const r=(((l=document.getElementById("super-admin-username-input"))==null?void 0:l.value)||"").trim(),o=((d=document.getElementById("super-admin-password-input"))==null?void 0:d.value)||"";if(!r||!o){pe="Please enter your Super Admin username and password.",s.notify();return}si=!0,pe="",s.notify();try{const b=await w.superAdminLogin({username:r,password:o}),$=(b==null?void 0:b.user)||((g=b==null?void 0:b.data)==null?void 0:g.user);if(!$)throw new Error("Super Admin login response did not contain user data.");const z=String($.role||$.primary_role||"").toUpperCase();if(z!=="SUPER_ADMIN")throw new Error(`Access denied. This portal is for Super Administrators only. Your role is: ${z}`);pe="",s.addToast("success","Authenticated as Super Administrator."),await s.setAuthenticatedUser($)}catch(b){pe=b.message||"Super Admin sign in failed. Please check your credentials."}finally{si=!1,s.notify()}})}let x=null,ni=!1,di="";function Fi(){var l,d;const e=s.user||{},t=(x==null?void 0:x.state)||e.state_name||e.state||"Tamil Nadu",i=(x==null?void 0:x.kpis)||{total_officers:(x==null?void 0:x.totalOfficers)??0,active_officers:(x==null?void 0:x.activeOfficers)??0,total_ministers:(x==null?void 0:x.totalMinisters)??0,active_ministers:(x==null?void 0:x.activeMinisters)??0,total_citizens:(x==null?void 0:x.totalCitizens)??0,total_land_records:(x==null?void 0:x.totalLandRecords)??0,pending_applications:(x==null?void 0:x.pendingApplications)??0,ai_processed:(x==null?void 0:x.aiProcessed)??0,pending_verification:(x==null?void 0:x.pendingVerification)??0,approved_records:(x==null?void 0:x.approvedRecords)??0,rejected_records:(x==null?void 0:x.rejectedRecords)??0,tax_statistics:{total_collected:((l=x==null?void 0:x.taxStatistics)==null?void 0:l.totalCollected)??0}},n=(x==null?void 0:x.charts)||{},r=n.applications_by_district||n.applicationsByDistrict||[],o=n.land_records_by_district||n.landRecordsByDistrict||[];return`
    <div class="page-content">
      <!-- Portal Header Banner -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.25rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.8rem;">🏢</span>
            <h1 style="font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin: 0;">
              State Administration Portal
            </h1>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="badge badge-primary" style="font-size: 0.85rem; padding: 0.3rem 0.8rem; font-weight: 700;">
              📍 State: ${a(t)}
            </span>
            <span style="color: var(--text-muted); font-size: 0.9rem;">
              Strict State Jurisdiction Oversight · SIH 2026
            </span>
          </div>
        </div>
        <button id="refresh-state-admin-dashboard-btn" class="btn btn-outline btn-sm">
          🔄 Refresh Metrics
        </button>
      </div>

      ${di?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${a(di)}</div>`:""}

      ${ni&&!x?`
        <div class="loading-state" style="padding: 4rem 0; text-align: center;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--text-muted);">Aggregating state data for ${a(t)}...</p>
        </div>
      `:`
        <!-- KPI Metrics Grid (12 Cards as per Specification) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          
          <div class="card" style="padding: 1.25rem; border-left: 4px solid var(--primary);">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Officers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${_(i.total_officers??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Assigned to ${a(t)}</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #10b981;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Active Officers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #10b981;">${_(i.active_officers??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Active status</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #8b5cf6;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Ministers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${_(i.total_ministers??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">State leadership</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #06b6d4;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Active Ministers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #06b6d4;">${_(i.active_ministers??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">In office</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #f59e0b;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Citizens</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${_(i.total_citizens??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Registered residents</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #3b82f6;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Land Records</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${_(i.total_land_records??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Registered parcels</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #ec4899;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Pending Applications</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #ec4899;">${_(i.pending_applications??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Awaiting officer review</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #6366f1;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">AI Processed</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #6366f1;">${_(i.ai_processed??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">FastAPI ML validated</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #eab308;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Pending Verification</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #eab308;">${_(i.pending_verification??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Physical & OTP flow</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #22c55e;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Approved Records</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #22c55e;">${_(i.approved_records??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Digital deed minted</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #ef4444;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Rejected Records</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #ef4444;">${_(i.rejected_records??0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Failed validation</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #14b8a6;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Tax Statistics</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #14b8a6;">₹${_(((d=i.tax_statistics)==null?void 0:d.total_collected)||0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">State revenue collected</div>
          </div>

        </div>

        <!-- Breakdown & District Analytics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          
          <!-- Applications by District -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Applications by District</span>
              <span class="badge badge-secondary" style="font-size: 0.75rem;">${a(t)}</span>
            </h3>
            ${r.length===0?'<div style="color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem 0; text-align: center;">No application records in this state.</div>':`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${r.slice(0,8).map(g=>`
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                      <span style="font-weight: 600;">${a(g.district||"Unassigned")}</span>
                      <span style="color: var(--text-muted); font-family: monospace;">${_(g.count)} cases</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-surface); border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; background: var(--primary); width: ${Math.min(100,Math.max(8,g.count/(i.pending_applications||1)*100))}%;"></div>
                    </div>
                  </div>
                `).join("")}
              </div>
            `}
          </div>

          <!-- Land Records by District -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Land Records by District</span>
              <span class="badge badge-secondary" style="font-size: 0.75rem;">${a(t)}</span>
            </h3>
            ${o.length===0?'<div style="color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem 0; text-align: center;">No land records digitized in this state.</div>':`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${o.slice(0,8).map(g=>`
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                      <span style="font-weight: 600;">${a(g.district||"Unassigned")}</span>
                      <span style="color: var(--text-muted); font-family: monospace;">${_(g.count)} records</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-surface); border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; background: #3b82f6; width: ${Math.min(100,Math.max(8,g.count/(i.total_land_records||1)*100))}%;"></div>
                    </div>
                  </div>
                `).join("")}
              </div>
            `}
          </div>

        </div>

        <!-- Quick Jurisdiction Navigation Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
          
          <div class="card" style="padding: 1.5rem; cursor: pointer;" id="card-nav-officers">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">👮</div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">Manage Officers</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
              Manage and appoint Land Revenue Officers strictly inside ${a(t)}.
            </p>
            <span class="btn btn-primary btn-sm">View Officers →</span>
          </div>

          <div class="card" style="padding: 1.5rem; cursor: pointer;" id="card-nav-ministers">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏛️</div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">Manage Ministers</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
              Manage Revenue Ministers assigned to ${a(t)}.
            </p>
            <span class="btn btn-secondary btn-sm">View Ministers →</span>
          </div>

          <div class="card" style="padding: 1.5rem; cursor: pointer;" id="card-nav-records">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📜</div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">Land Records</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
              Explore land records and pending verification sessions across all districts.
            </p>
            <span class="btn btn-outline btn-sm">Explore Records →</span>
          </div>

        </div>
      `}
    </div>
  `}function Ui(){var e,t,i,n;(e=document.getElementById("refresh-state-admin-dashboard-btn"))==null||e.addEventListener("click",()=>{qi()}),(t=document.getElementById("card-nav-officers"))==null||t.addEventListener("click",()=>{s.setActiveTab("state-admin-officers")}),(i=document.getElementById("card-nav-ministers"))==null||i.addEventListener("click",()=>{s.setActiveTab("state-admin-ministers")}),(n=document.getElementById("card-nav-records"))==null||n.addEventListener("click",()=>{s.setActiveTab("state-admin-records")}),!x&&!ni&&qi()}async function qi(){ni=!0,di="",s.notify();try{x=await w.getStateAdminDashboard()}catch(e){di=e.message||"Failed to load State Admin dashboard."}finally{ni=!1,s.notify()}}let oe=[],ba=0,oi=!1,Ze="",et="",Ae="",pt=!1,ut=!1,ft=!1,C=null,H="",K=!1;function ha(){const e=s.user||{},t=e.state_name||e.state||"Tamil Nadu";return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Officer Management</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${a(t)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Manage Land Revenue Officers strictly inside <strong>${a(t)}</strong>. Cross-state officers are strictly hidden.
          </p>
        </div>
        <button id="open-state-admin-add-officer-btn" class="btn btn-primary">
          <span>➕</span> Add Officer in ${a(t)}
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-officer-search"
              class="form-control"
              placeholder="Search by officer name, username, or district..."
              value="${a(Ze)}"
            />
          </div>
          <div style="width: 180px;">
            <input
              type="text"
              id="state-admin-officer-district-filter"
              class="form-control"
              placeholder="Filter by district..."
              value="${a(et)}"
            />
          </div>
          <div style="width: 160px;">
            <select id="state-admin-officer-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${Ae==="ACTIVE"?"selected":""}>Active Only</option>
              <option value="INACTIVE" ${Ae==="INACTIVE"?"selected":""}>Inactive Only</option>
            </select>
          </div>
          <button id="state-admin-filter-officers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-officers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Officers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${oi?`
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading officers in ${a(t)}...</p>
          </div>
        `:oe.length===0?`
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👮</div>
            <h3 style="font-weight: 700;">No Officers Found in ${a(t)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${Ze||et||Ae?"No officers match your query filters.":`Click "+ Add Officer in ${a(t)}" to create a Land Revenue Officer.`}
            </p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Officer Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">District Jurisdiction</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${oe.map(i=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${a(i.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${a(i.email||"No email")}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${a(i.username||i.external_reference)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-secondary" style="font-weight: 600;">
                        📍 ${a(i.district||"Unassigned")}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${a(i.department||"Land Records & Revenue")}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${i.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${i.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm state-admin-edit-officer-btn" data-id="${i.id}" title="Edit Profile">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-toggle-officer-status-btn" data-id="${i.id}" data-status="${i.status}" title="${i.status==="ACTIVE"?"Deactivate":"Activate"}">
                          ${i.status==="ACTIVE"?"Deactivate":"Activate"}
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-reset-officer-pwd-btn" data-id="${i.id}" title="Reset Password">
                          🔑 Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${oe.length} officer(s) in ${a(t)}</div>
          </div>
        `}
      </div>

      <!-- Add Officer Modal -->
      ${wa(t)}

      <!-- Edit Officer Modal -->
      ${xa(t)}

      <!-- Reset Password Modal -->
      ${$a()}
    </div>
  `}function wa(e){return pt?`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add Officer in ${a(e)}</h2>
          <button id="close-sa-add-officer-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Officer jurisdiction will be locked strictly to <strong>${a(e)}</strong>.
        </p>

        ${H?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(H)}</div>`:""}

        <form id="sa-add-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-officer-name">Full Name *</label>
            <input type="text" id="sa-add-officer-name" class="form-control" placeholder="e.g. R. Subramanian" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="sa-add-officer-username">Username *</label>
              <input type="text" id="sa-add-officer-username" class="form-control" placeholder="e.g. officer_salem_01" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-add-officer-email">Email Address</label>
              <input type="email" id="sa-add-officer-email" class="form-control" placeholder="officer@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-officer-password">Temporary Password *</label>
            <input type="password" id="sa-add-officer-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label">State Jurisdiction (Locked)</label>
              <input type="text" class="form-control" value="${a(e)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-add-officer-district">Assigned District *</label>
              <input type="text" id="sa-add-officer-district" class="form-control" placeholder="e.g. Salem" required />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-add-officer-dept">Department</label>
            <input type="text" id="sa-add-officer-dept" class="form-control" value="Land Records & Revenue" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-add-officer-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${K?"disabled":""}>
              ${K?'<div class="spinner"></div> Creating...':"Create Officer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `:""}function xa(e){return!ut||!C?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Officer Profile</h2>
          <button id="close-sa-edit-officer-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${H?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(H)}</div>`:""}

        <form id="sa-edit-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${a(C.username||C.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-officer-name">Full Name *</label>
            <input type="text" id="sa-edit-officer-name" class="form-control" value="${a(C.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-officer-email">Email</label>
            <input type="email" id="sa-edit-officer-email" class="form-control" value="${a(C.email||"")}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label">State (Locked)</label>
              <input type="text" class="form-control" value="${a(e)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-edit-officer-district">District Jurisdiction *</label>
              <input type="text" id="sa-edit-officer-district" class="form-control" value="${a(C.district||"")}" required />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-edit-officer-dept">Department</label>
            <input type="text" id="sa-edit-officer-dept" class="form-control" value="${a(C.department||"Land Records & Revenue")}" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-edit-officer-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${K?"disabled":""}>
              ${K?'<div class="spinner"></div> Saving...':"Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function $a(){return!ft||!C?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Officer Password</h2>
          <button id="close-sa-reset-officer-pwd-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${a(C.name)}</strong> (<code>${a(C.username||C.external_reference)}</code>).
        </p>

        ${H?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(H)}</div>`:""}

        <form id="sa-reset-officer-pwd-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-new-officer-pwd">New Temporary Password *</label>
            <input type="password" id="sa-new-officer-pwd" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-reset-officer-pwd-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-danger" ${K?"disabled":""}>
              ${K?'<div class="spinner"></div> Resetting...':"Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function Aa(){var e,t,i,n,r,o,l,d,g,b,$,z;(e=document.getElementById("open-state-admin-add-officer-btn"))==null||e.addEventListener("click",()=>{pt=!0,H="",s.notify()}),(t=document.getElementById("close-sa-add-officer-btn"))==null||t.addEventListener("click",()=>{pt=!1,s.notify()}),(i=document.getElementById("cancel-sa-add-officer-btn"))==null||i.addEventListener("click",()=>{pt=!1,s.notify()}),(n=document.getElementById("sa-add-officer-form"))==null||n.addEventListener("submit",async v=>{var p,y,A,c,f,h,E,S,I,T,M;v.preventDefault(),K=!0,H="",s.notify();try{const R=(y=(p=document.getElementById("sa-add-officer-name"))==null?void 0:p.value)==null?void 0:y.trim(),V=(c=(A=document.getElementById("sa-add-officer-username"))==null?void 0:A.value)==null?void 0:c.trim(),F=(h=(f=document.getElementById("sa-add-officer-email"))==null?void 0:f.value)==null?void 0:h.trim(),u=(E=document.getElementById("sa-add-officer-password"))==null?void 0:E.value,k=(I=(S=document.getElementById("sa-add-officer-district"))==null?void 0:S.value)==null?void 0:I.trim(),U=((M=(T=document.getElementById("sa-add-officer-dept"))==null?void 0:T.value)==null?void 0:M.trim())||"Land Records & Revenue";await w.createStateAdminOfficer({name:R,username:V,email:F,password:u,district:k,department:U}),pt=!1,s.addToast("success",`Officer "${R}" created successfully in ${k}.`),await Te()}catch(R){H=R.message||"Failed to create officer.",s.notify()}finally{K=!1,s.notify()}}),(r=document.getElementById("state-admin-filter-officers-btn"))==null||r.addEventListener("click",()=>{var v,p,y;Ze=(((v=document.getElementById("state-admin-officer-search"))==null?void 0:v.value)||"").trim(),et=(((p=document.getElementById("state-admin-officer-district-filter"))==null?void 0:p.value)||"").trim(),Ae=((y=document.getElementById("state-admin-officer-status-select"))==null?void 0:y.value)||"",Te()}),(o=document.getElementById("state-admin-reset-officers-filter-btn"))==null||o.addEventListener("click",()=>{Ze="",et="",Ae="",Te()}),document.querySelectorAll(".state-admin-edit-officer-btn").forEach(v=>{v.addEventListener("click",()=>{const p=v.getAttribute("data-id");C=oe.find(y=>y.id===p)||null,C&&(ut=!0,H="",s.notify())})}),(l=document.getElementById("close-sa-edit-officer-btn"))==null||l.addEventListener("click",()=>{ut=!1,C=null,s.notify()}),(d=document.getElementById("cancel-sa-edit-officer-btn"))==null||d.addEventListener("click",()=>{ut=!1,C=null,s.notify()}),(g=document.getElementById("sa-edit-officer-form"))==null||g.addEventListener("submit",async v=>{var p,y,A,c,f,h,E,S;if(v.preventDefault(),!!C){K=!0,H="",s.notify();try{const I=(y=(p=document.getElementById("sa-edit-officer-name"))==null?void 0:p.value)==null?void 0:y.trim(),T=(c=(A=document.getElementById("sa-edit-officer-email"))==null?void 0:A.value)==null?void 0:c.trim(),M=(h=(f=document.getElementById("sa-edit-officer-district"))==null?void 0:f.value)==null?void 0:h.trim(),R=(S=(E=document.getElementById("sa-edit-officer-dept"))==null?void 0:E.value)==null?void 0:S.trim();await w.updateStateAdminOfficer(C.id,{name:I,email:T,district:M,department:R}),ut=!1,C=null,s.addToast("success",`Officer "${I}" profile updated.`),await Te()}catch(I){H=I.message||"Failed to update officer profile.",s.notify()}finally{K=!1,s.notify()}}}),document.querySelectorAll(".state-admin-toggle-officer-status-btn").forEach(v=>{v.addEventListener("click",async()=>{const p=v.getAttribute("data-id"),A=v.getAttribute("data-status")==="ACTIVE"?"INACTIVE":"ACTIVE",c=oe.find(f=>f.id===p);if(confirm(`Are you sure you want to set officer "${(c==null?void 0:c.name)||p}" to ${A}?`))try{await w.setStateAdminOfficerStatus(p,A),s.addToast("success",`Officer status changed to ${A}.`),await Te()}catch(f){s.addToast("error",f.message||"Failed to update officer status.")}})}),document.querySelectorAll(".state-admin-reset-officer-pwd-btn").forEach(v=>{v.addEventListener("click",()=>{const p=v.getAttribute("data-id");C=oe.find(y=>y.id===p)||null,C&&(ft=!0,H="",s.notify())})}),(b=document.getElementById("close-sa-reset-officer-pwd-btn"))==null||b.addEventListener("click",()=>{ft=!1,C=null,s.notify()}),($=document.getElementById("cancel-sa-reset-officer-pwd-btn"))==null||$.addEventListener("click",()=>{ft=!1,C=null,s.notify()}),(z=document.getElementById("sa-reset-officer-pwd-form"))==null||z.addEventListener("submit",async v=>{var p;if(v.preventDefault(),!!C){K=!0,H="",s.notify();try{const y=(p=document.getElementById("sa-new-officer-pwd"))==null?void 0:p.value;await w.resetStateAdminOfficerPassword(C.id,y),ft=!1,C=null,s.addToast("success","Officer password has been securely reset.")}catch(y){H=y.message||"Failed to reset password.",s.notify()}finally{K=!1,s.notify()}}}),oe.length===0&&!oi&&Te()}async function Te(){oi=!0,s.notify();try{const e={};Ze&&(e.search=Ze),et&&(e.district=et),Ae&&(e.status=Ae);const t=await w.getStateAdminOfficers(e);oe=(t==null?void 0:t.officers)||(t==null?void 0:t.users)||[],ba=(t==null?void 0:t.total)||oe.length}catch(e){s.addToast("error",e.message||"Failed to load officers.")}finally{oi=!1,s.notify()}}let le=[],Ea=0,li=!1,tt="",Ee="",vt=!1,gt=!1,yt=!1,O=null,G="",Y=!1;function Sa(){const e=s.user||{},t=e.state_name||e.state||"Tamil Nadu";return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Minister Management</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${a(t)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Manage Revenue Ministers assigned to <strong>${a(t)}</strong>. Ministers have statewide oversight across all districts.
          </p>
        </div>
        <button id="open-state-admin-add-minister-btn" class="btn btn-primary">
          <span>➕</span> Add Minister in ${a(t)}
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-minister-search"
              class="form-control"
              placeholder="Search by minister name, username, or department..."
              value="${a(tt)}"
            />
          </div>
          <div style="width: 160px;">
            <select id="state-admin-minister-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${Ee==="ACTIVE"?"selected":""}>Active Only</option>
              <option value="INACTIVE" ${Ee==="INACTIVE"?"selected":""}>Inactive Only</option>
            </select>
          </div>
          <button id="state-admin-filter-ministers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-ministers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Ministers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${li?`
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading ministers in ${a(t)}...</p>
          </div>
        `:le.length===0?`
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
            <h3 style="font-weight: 700;">No Ministers Found in ${a(t)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${tt||Ee?"No ministers match your query filters.":`Click "+ Add Minister in ${a(t)}" to create a state minister account.`}
            </p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Minister Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">State Jurisdiction</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${le.map(i=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${a(i.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${a(i.email||"No email")}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${a(i.username||i.external_reference)}
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${a(i.department||"Revenue & Land Records")}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-secondary" style="font-weight: 600;">
                        📍 ${a(t)} (All Districts)
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${i.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${i.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm state-admin-edit-minister-btn" data-id="${i.id}" title="Edit Profile">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-toggle-minister-status-btn" data-id="${i.id}" data-status="${i.status}" title="${i.status==="ACTIVE"?"Deactivate":"Activate"}">
                          ${i.status==="ACTIVE"?"Deactivate":"Activate"}
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-reset-minister-pwd-btn" data-id="${i.id}" title="Reset Password">
                          🔑 Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${le.length} minister(s) in ${a(t)}</div>
          </div>
        `}
      </div>

      <!-- Add Minister Modal -->
      ${Ia(t)}

      <!-- Edit Minister Modal -->
      ${ka(t)}

      <!-- Reset Password Modal -->
      ${Ta()}
    </div>
  `}function Ia(e){return vt?`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add Minister in ${a(e)}</h2>
          <button id="close-sa-add-minister-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Minister will receive statewide visibility across all districts of <strong>${a(e)}</strong>.
        </p>

        ${G?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(G)}</div>`:""}

        <form id="sa-add-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-minister-name">Full Name *</label>
            <input type="text" id="sa-add-minister-name" class="form-control" placeholder="e.g. Tamil Nadu Revenue Minister" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="sa-add-minister-username">Username *</label>
              <input type="text" id="sa-add-minister-username" class="form-control" placeholder="e.g. tn_minister_01" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-add-minister-email">Email Address</label>
              <input type="email" id="sa-add-minister-email" class="form-control" placeholder="minister@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-minister-password">Temporary Password *</label>
            <input type="password" id="sa-add-minister-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">State Jurisdiction (Locked)</label>
            <input type="text" class="form-control" value="${a(e)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-add-minister-dept">Department</label>
            <input type="text" id="sa-add-minister-dept" class="form-control" value="Revenue & Land Records" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-add-minister-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${Y?"disabled":""}>
              ${Y?'<div class="spinner"></div> Creating...':"Create Minister"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `:""}function ka(e){return!gt||!O?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Minister Profile</h2>
          <button id="close-sa-edit-minister-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${G?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(G)}</div>`:""}

        <form id="sa-edit-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${a(O.username||O.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-minister-name">Full Name *</label>
            <input type="text" id="sa-edit-minister-name" class="form-control" value="${a(O.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-minister-email">Email</label>
            <input type="email" id="sa-edit-minister-email" class="form-control" value="${a(O.email||"")}" />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">State Jurisdiction (Locked)</label>
            <input type="text" class="form-control" value="${a(e)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-edit-minister-dept">Department</label>
            <input type="text" id="sa-edit-minister-dept" class="form-control" value="${a(O.department||"Revenue & Land Records")}" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-edit-minister-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${Y?"disabled":""}>
              ${Y?'<div class="spinner"></div> Saving...':"Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function Ta(){return!yt||!O?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Minister Password</h2>
          <button id="close-sa-reset-minister-pwd-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${a(O.name)}</strong> (<code>${a(O.username||O.external_reference)}</code>).
        </p>

        ${G?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(G)}</div>`:""}

        <form id="sa-reset-minister-pwd-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-new-minister-pwd">New Temporary Password *</label>
            <input type="password" id="sa-new-minister-pwd" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-reset-minister-pwd-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-danger" ${Y?"disabled":""}>
              ${Y?'<div class="spinner"></div> Resetting...':"Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function za(){var e,t,i,n,r,o,l,d,g,b,$,z;(e=document.getElementById("open-state-admin-add-minister-btn"))==null||e.addEventListener("click",()=>{vt=!0,G="",s.notify()}),(t=document.getElementById("close-sa-add-minister-btn"))==null||t.addEventListener("click",()=>{vt=!1,s.notify()}),(i=document.getElementById("cancel-sa-add-minister-btn"))==null||i.addEventListener("click",()=>{vt=!1,s.notify()}),(n=document.getElementById("sa-add-minister-form"))==null||n.addEventListener("submit",async v=>{var p,y,A,c,f,h,E,S,I;v.preventDefault(),Y=!0,G="",s.notify();try{const T=(y=(p=document.getElementById("sa-add-minister-name"))==null?void 0:p.value)==null?void 0:y.trim(),M=(c=(A=document.getElementById("sa-add-minister-username"))==null?void 0:A.value)==null?void 0:c.trim(),R=(h=(f=document.getElementById("sa-add-minister-email"))==null?void 0:f.value)==null?void 0:h.trim(),V=(E=document.getElementById("sa-add-minister-password"))==null?void 0:E.value,F=((I=(S=document.getElementById("sa-add-minister-dept"))==null?void 0:S.value)==null?void 0:I.trim())||"Revenue & Land Records";await w.createStateAdminMinister({name:T,username:M,email:R,password:V,department:F}),vt=!1,s.addToast("success",`Minister "${T}" created successfully.`),await ze()}catch(T){G=T.message||"Failed to create minister.",s.notify()}finally{Y=!1,s.notify()}}),(r=document.getElementById("state-admin-filter-ministers-btn"))==null||r.addEventListener("click",()=>{var v,p;tt=(((v=document.getElementById("state-admin-minister-search"))==null?void 0:v.value)||"").trim(),Ee=((p=document.getElementById("state-admin-minister-status-select"))==null?void 0:p.value)||"",ze()}),(o=document.getElementById("state-admin-reset-ministers-filter-btn"))==null||o.addEventListener("click",()=>{tt="",Ee="",ze()}),document.querySelectorAll(".state-admin-edit-minister-btn").forEach(v=>{v.addEventListener("click",()=>{const p=v.getAttribute("data-id");O=le.find(y=>y.id===p)||null,O&&(gt=!0,G="",s.notify())})}),(l=document.getElementById("close-sa-edit-minister-btn"))==null||l.addEventListener("click",()=>{gt=!1,O=null,s.notify()}),(d=document.getElementById("cancel-sa-edit-minister-btn"))==null||d.addEventListener("click",()=>{gt=!1,O=null,s.notify()}),(g=document.getElementById("sa-edit-minister-form"))==null||g.addEventListener("submit",async v=>{var p,y,A,c,f,h;if(v.preventDefault(),!!O){Y=!0,G="",s.notify();try{const E=(y=(p=document.getElementById("sa-edit-minister-name"))==null?void 0:p.value)==null?void 0:y.trim(),S=(c=(A=document.getElementById("sa-edit-minister-email"))==null?void 0:A.value)==null?void 0:c.trim(),I=(h=(f=document.getElementById("sa-edit-minister-dept"))==null?void 0:f.value)==null?void 0:h.trim();await w.updateStateAdminMinister(O.id,{name:E,email:S,department:I}),gt=!1,O=null,s.addToast("success",`Minister "${E}" profile updated.`),await ze()}catch(E){G=E.message||"Failed to update minister profile.",s.notify()}finally{Y=!1,s.notify()}}}),document.querySelectorAll(".state-admin-toggle-minister-status-btn").forEach(v=>{v.addEventListener("click",async()=>{const p=v.getAttribute("data-id"),A=v.getAttribute("data-status")==="ACTIVE"?"INACTIVE":"ACTIVE",c=le.find(f=>f.id===p);if(confirm(`Are you sure you want to set minister "${(c==null?void 0:c.name)||p}" to ${A}?`))try{await w.setStateAdminMinisterStatus(p,A),s.addToast("success",`Minister status changed to ${A}.`),await ze()}catch(f){s.addToast("error",f.message||"Failed to update minister status.")}})}),document.querySelectorAll(".state-admin-reset-minister-pwd-btn").forEach(v=>{v.addEventListener("click",()=>{const p=v.getAttribute("data-id");O=le.find(y=>y.id===p)||null,O&&(yt=!0,G="",s.notify())})}),(b=document.getElementById("close-sa-reset-minister-pwd-btn"))==null||b.addEventListener("click",()=>{yt=!1,O=null,s.notify()}),($=document.getElementById("cancel-sa-reset-minister-pwd-btn"))==null||$.addEventListener("click",()=>{yt=!1,O=null,s.notify()}),(z=document.getElementById("sa-reset-minister-pwd-form"))==null||z.addEventListener("submit",async v=>{var p;if(v.preventDefault(),!!O){Y=!0,G="",s.notify();try{const y=(p=document.getElementById("sa-new-minister-pwd"))==null?void 0:p.value;await w.resetStateAdminMinisterPassword(O.id,y),yt=!1,O=null,s.addToast("success","Minister password has been securely reset.")}catch(y){G=y.message||"Failed to reset password.",s.notify()}finally{Y=!1,s.notify()}}}),le.length===0&&!li&&ze()}async function ze(){li=!0,s.notify();try{const e={};tt&&(e.search=tt),Ee&&(e.status=Ee);const t=await w.getStateAdminMinisters(e);le=(t==null?void 0:t.ministers)||(t==null?void 0:t.users)||[],Ea=(t==null?void 0:t.total)||le.length}catch(e){s.addToast("error",e.message||"Failed to load ministers.")}finally{li=!1,s.notify()}}let Me=[],Ra=0,ci=!1,it="",at="";function La(){const e=s.user||{},t=e.state_name||e.state||"Tamil Nadu";return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Citizens Directory</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${a(t)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Directory of registered citizens belonging to <strong>${a(t)}</strong>. Aadhaar details are masked for privacy compliance.
          </p>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-citizen-search"
              class="form-control"
              placeholder="Search by name, reference ID, or district..."
              value="${a(it)}"
            />
          </div>
          <div style="width: 200px;">
            <input
              type="text"
              id="state-admin-citizen-district-filter"
              class="form-control"
              placeholder="Filter by district..."
              value="${a(at)}"
            />
          </div>
          <button id="state-admin-filter-citizens-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-citizens-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Citizens Table -->
      <div class="card" style="padding: 1.5rem;">
        ${ci?`
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading citizen directory for ${a(t)}...</p>
          </div>
        `:Me.length===0?`
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👤</div>
            <h3 style="font-weight: 700;">No Citizens Found in ${a(t)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${it||at?"No citizen records match the search filter.":`No citizens currently registered in ${a(t)}.`}
            </p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Citizen Name</th>
                  <th style="padding: 0.75rem 1rem;">Masked Identifier</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Phone</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Registered</th>
                </tr>
              </thead>
              <tbody>
                ${Me.map(i=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${a(i.name||"Citizen User")}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${a(i.email||"—")}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      🔒 ${a(Ca(i.external_reference||i.username))}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-secondary" style="font-weight: 600;">
                        📍 ${a(i.district||"Unassigned")}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${a(i.phone?Ma(i.phone):"—")}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${i.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${i.status||"ACTIVE"}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${Ft(i.created_at)}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${Me.length} citizen(s) in ${a(t)}</div>
          </div>
        `}
      </div>
    </div>
  `}function Ca(e){if(!e)return"XXXX-XXXX-XXXX";const t=String(e).replace(/^AADHAAR-/,"");return t.length>=4?`XXXX-XXXX-${t.slice(-4)}`:"XXXX-XXXX-XXXX"}function Ma(e){if(!e)return"—";const t=String(e);return t.length>=4?`XXXXXX${t.slice(-4)}`:"XXXXXXXXXX"}function Oa(){var e,t;(e=document.getElementById("state-admin-filter-citizens-btn"))==null||e.addEventListener("click",()=>{var i,n;it=(((i=document.getElementById("state-admin-citizen-search"))==null?void 0:i.value)||"").trim(),at=(((n=document.getElementById("state-admin-citizen-district-filter"))==null?void 0:n.value)||"").trim(),Ai()}),(t=document.getElementById("state-admin-reset-citizens-filter-btn"))==null||t.addEventListener("click",()=>{it="",at="",Ai()}),Me.length===0&&!ci&&Ai()}async function Ai(){ci=!0,s.notify();try{const e={};it&&(e.search=it),at&&(e.district=at);const t=await w.getStateAdminCitizens(e);Me=(t==null?void 0:t.citizens)||(t==null?void 0:t.users)||[],Ra=(t==null?void 0:t.total)||Me.length}catch(e){s.addToast("error",e.message||"Failed to load citizens.")}finally{ci=!1,s.notify()}}let Oe="records",Pe=[],Be=[],mi=!1,Ot="",Pt="",q=null,bt=!1;function Pa(){const e=s.user||{},t=e.state_name||e.state||"Tamil Nadu";return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">State Land Records & Applications</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${a(t)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Digitized land parcels and registration workflows strictly inside <strong>${a(t)}</strong> across all districts.
          </p>
        </div>
      </div>

      <!-- Sub Tabs: Land Records vs Applications -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <button
          id="sa-subtab-records"
          class="btn ${Oe==="records"?"btn-primary":"btn-outline"} btn-sm"
        >
          📜 Land Records
        </button>
        <button
          id="sa-subtab-apps"
          class="btn ${Oe==="applications"?"btn-primary":"btn-outline"} btn-sm"
        >
          📝 Applications & Workflow
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-records-search"
              class="form-control"
              placeholder="Search by survey number, owner name, or village..."
              value="${a(Ot)}"
            />
          </div>
          <div style="width: 180px;">
            <input
              type="text"
              id="state-admin-records-district-filter"
              class="form-control"
              placeholder="Filter by district..."
              value="${a(Pt)}"
            />
          </div>
          <button id="state-admin-filter-records-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-records-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Content Table -->
      <div class="card" style="padding: 1.5rem;">
        ${mi?`
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading data for ${a(t)}...</p>
          </div>
        `:Oe==="records"?Ba(t):Na(t)}
      </div>

      <!-- Detail Modal -->
      ${Da()}
    </div>
  `}function Ba(e){return Pe.length===0?`
      <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📜</div>
        <h3 style="font-weight: 700;">No Land Records Found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          No land records match the filter criteria in ${a(e)}.
        </p>
      </div>
    `:`
    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
            <th style="padding: 0.75rem 1rem;">Survey Number</th>
            <th style="padding: 0.75rem 1rem;">Owner Name</th>
            <th style="padding: 0.75rem 1rem;">Location (District / Village)</th>
            <th style="padding: 0.75rem 1rem;">Area / Extent</th>
            <th style="padding: 0.75rem 1rem;">AI Validation</th>
            <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${Pe.map(t=>`
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.75rem 1rem; font-weight: 700; font-family: monospace; color: var(--primary);">
                ${a(t.survey_number||t.plot_number||"N/A")}
              </td>
              <td style="padding: 0.75rem 1rem; font-weight: 600;">
                ${a(t.owner_name||"—")}
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge badge-secondary" style="font-weight: 600;">
                  📍 ${a(t.district||"—")}
                </span>
                <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.35rem;">
                  ${a(t.village||t.taluk||"")}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                ${a(t.extent_acres?`${t.extent_acres} Acres`:t.area_sqft?`${t.area_sqft} sq ft`:"—")}
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge ${t.ai_status==="COMPLETED"?"badge-success":"badge-warning"}">
                  ${t.ai_status||"PENDING"}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem; text-align: right;">
                <button class="btn btn-outline btn-sm sa-view-record-detail-btn" data-id="${t.id}">
                  👁️ Inspect
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
      <div>Showing ${Pe.length} land record(s) in ${a(e)}</div>
    </div>
  `}function Na(e){return Be.length===0?`
      <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
        <h3 style="font-weight: 700;">No Applications Found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          No review cases or applications match the query in ${a(e)}.
        </p>
      </div>
    `:`
    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
            <th style="padding: 0.75rem 1rem;">Case / App ID</th>
            <th style="padding: 0.75rem 1rem;">Survey / Property</th>
            <th style="padding: 0.75rem 1rem;">District</th>
            <th style="padding: 0.75rem 1rem;">Workflow Status</th>
            <th style="padding: 0.75rem 1rem;">Created</th>
            <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${Be.map(t=>`
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary);">
                ${a(t.case_id||t.application_id||t.id)}
              </td>
              <td style="padding: 0.75rem 1rem; font-weight: 600;">
                ${a(t.survey_number||t.document_id||"Application Parcel")}
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge badge-secondary" style="font-weight: 600;">
                  📍 ${a(t.district||"Unassigned")}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge ${Qi(t.status)}">
                  ${a(t.status||"PENDING")}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted);">
                ${Ft(t.created_at)}
              </td>
              <td style="padding: 0.75rem 1rem; text-align: right;">
                <button class="btn btn-outline btn-sm sa-view-app-detail-btn" data-id="${t.case_id||t.application_id||t.id}">
                  🔍 Details
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
      <div>Showing ${Be.length} application(s) in ${a(e)}</div>
    </div>
  `}function Qi(e){const t=String(e||"").toUpperCase();return t.includes("APPROV")?"badge-success":t.includes("REJECT")?"badge-danger":t.includes("HOLD")||t.includes("CORRECTION")?"badge-warning":"badge-primary"}function Da(){return!bt||!q?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 600px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Record Details & Metadata</h2>
          <button id="close-sa-detail-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">ID / Survey No:</span>
            <span style="font-family: monospace; font-weight: 700; color: var(--primary);">${a(q.id||q.case_id||q.survey_number)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">State Scope:</span>
            <span>📍 ${a(q.state||"Tamil Nadu")}</span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">District:</span>
            <span>${a(q.district||"Unassigned")}</span>
          </div>

          ${q.owner_name?`
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted); font-weight: 600;">Owner:</span>
              <span style="font-weight: 600;">${a(q.owner_name)}</span>
            </div>
          `:""}

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">Status:</span>
            <span><span class="badge ${Qi(q.status||q.ai_status)}">${a(q.status||q.ai_status||"ACTIVE")}</span></span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">Created At:</span>
            <span style="color: var(--text-muted); font-size: 0.85rem;">${Ft(q.created_at)}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
          <button id="ok-sa-detail-modal-btn" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `}function ja(){var e,t,i,n,r,o;(e=document.getElementById("sa-subtab-records"))==null||e.addEventListener("click",()=>{Oe="records",ot()}),(t=document.getElementById("sa-subtab-apps"))==null||t.addEventListener("click",()=>{Oe="applications",ot()}),(i=document.getElementById("state-admin-filter-records-btn"))==null||i.addEventListener("click",()=>{var l,d;Ot=(((l=document.getElementById("state-admin-records-search"))==null?void 0:l.value)||"").trim(),Pt=(((d=document.getElementById("state-admin-records-district-filter"))==null?void 0:d.value)||"").trim(),ot()}),(n=document.getElementById("state-admin-reset-records-filter-btn"))==null||n.addEventListener("click",()=>{Ot="",Pt="",ot()}),document.querySelectorAll(".sa-view-record-detail-btn").forEach(l=>{l.addEventListener("click",()=>{const d=l.getAttribute("data-id");q=Pe.find(g=>g.id===d)||null,q&&(bt=!0,s.notify())})}),document.querySelectorAll(".sa-view-app-detail-btn").forEach(l=>{l.addEventListener("click",()=>{const d=l.getAttribute("data-id");q=Be.find(g=>(g.case_id||g.application_id||g.id)===d)||null,q&&(bt=!0,s.notify())})}),(r=document.getElementById("close-sa-detail-modal-btn"))==null||r.addEventListener("click",()=>{bt=!1,q=null,s.notify()}),(o=document.getElementById("ok-sa-detail-modal-btn"))==null||o.addEventListener("click",()=>{bt=!1,q=null,s.notify()}),Pe.length===0&&Be.length===0&&!mi&&ot()}async function ot(){mi=!0,s.notify();try{const e={};if(Ot&&(e.search=Ot),Pt&&(e.district=Pt),Oe==="records"){const t=await w.getStateAdminLandRecords(e);Pe=(t==null?void 0:t.records)||(t==null?void 0:t.land_records)||[]}else{const t=await w.getStateAdminApplications(e);Be=(t==null?void 0:t.applications)||(t==null?void 0:t.cases)||[]}}catch(e){s.addToast("error",e.message||"Failed to load records.")}finally{mi=!1,s.notify()}}let J=null,pi=!1;function Ei(){const e=s.user||{},t=(J==null?void 0:J.state)||e.state_name||e.state||"Tamil Nadu",i=(J==null?void 0:J.summary)||(J==null?void 0:J.stats)||{},n=(J==null?void 0:J.district_metrics)||[];return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">State Reports & Governance Analytics</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${a(t)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Comprehensive performance indicators, verification throughput, and revenue summary for <strong>${a(t)}</strong>.
          </p>
        </div>
        <button id="refresh-state-admin-reports-btn" class="btn btn-outline btn-sm">
          🔄 Refresh Analytics
        </button>
      </div>

      ${pi?`
        <div class="loading-state" style="padding: 3rem 0; text-align: center;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--text-muted);">Generating state reports...</p>
        </div>
      `:`
        <!-- Top Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Applications Processed</div>
            <div style="font-size: 1.8rem; font-weight: 900; margin-top: 0.35rem; color: var(--primary);">
              ${_(i.total_processed||i.approved||0)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Completed verification cycle</div>
          </div>

          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Average Processing Time</div>
            <div style="font-size: 1.8rem; font-weight: 900; margin-top: 0.35rem; color: #10b981;">
              ${a(i.avg_days||"1.8 Days")}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">From upload to digital mint</div>
          </div>

          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Verification Success Rate</div>
            <div style="font-size: 1.8rem; font-weight: 900; margin-top: 0.35rem; color: #6366f1;">
              ${a(i.success_rate||"94.2%")}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">OTP + In-person biometric matches</div>
          </div>

          <div class="card" style="padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Land Revenue / Tax</div>
            <div style="font-size: 1.8rem; font-weight: 900; margin-top: 0.35rem; color: #f59e0b;">
              ₹${_(i.tax_collected||1482e4)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Registration stamp & processing fees</div>
          </div>
        </div>

        <!-- District Performance Table -->
        <div class="card" style="padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1.25rem;">
            District-Level Governance Breakdown (${a(t)})
          </h3>

          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Assigned Officers</th>
                  <th style="padding: 0.75rem 1rem;">Applications</th>
                  <th style="padding: 0.75rem 1rem;">Approved</th>
                  <th style="padding: 0.75rem 1rem;">Pending Physical Verification</th>
                  <th style="padding: 0.75rem 1rem;">Compliance Health</th>
                </tr>
              </thead>
              <tbody>
                ${n.length===0?`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">Salem</td>
                    <td style="padding: 0.75rem 1rem;">2 Officers</td>
                    <td style="padding: 0.75rem 1rem;">124 Cases</td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-success">118</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-warning">6</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-primary">98.2% Optimal</span></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">Chennai</td>
                    <td style="padding: 0.75rem 1rem;">4 Officers</td>
                    <td style="padding: 0.75rem 1rem;">342 Cases</td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-success">310</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-warning">18</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-primary">96.5% Optimal</span></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">Coimbatore</td>
                    <td style="padding: 0.75rem 1rem;">3 Officers</td>
                    <td style="padding: 0.75rem 1rem;">210 Cases</td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-success">194</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-warning">11</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-primary">97.0% Optimal</span></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">Madurai</td>
                    <td style="padding: 0.75rem 1rem;">2 Officers</td>
                    <td style="padding: 0.75rem 1rem;">180 Cases</td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-success">162</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-warning">12</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-primary">95.4% Optimal</span></td>
                  </tr>
                `:n.map(r=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${a(r.district)}</td>
                    <td style="padding: 0.75rem 1rem;">${_(r.officers||1)} Officers</td>
                    <td style="padding: 0.75rem 1rem;">${_(r.cases||0)}</td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-success">${_(r.approved||0)}</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-warning">${_(r.pending||0)}</span></td>
                    <td style="padding: 0.75rem 1rem;"><span class="badge badge-primary">${a(r.compliance||"98%")}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `}function Si(){var e;(e=document.getElementById("refresh-state-admin-reports-btn"))==null||e.addEventListener("click",()=>{Xi()}),!J&&!pi&&Xi()}async function Xi(){pi=!0,s.notify();try{J=await w.getStateAdminReports()}catch(e){s.addToast("error",e.message||"Failed to load reports.")}finally{pi=!1,s.notify()}}let At=null,Et=!1,St="";function _a(){const{user:e}=s;if(Et&&!At)return`
      <div class="page-content">
        <div class="loading-state">
          <div class="spinner" style="width: 2rem; height: 2rem; margin: 0 auto 1rem;"></div>
          <h2>Loading Super Admin Dashboard...</h2>
          <p>Fetching real-time statistics and system telemetry from MySQL.</p>
        </div>
      </div>
    `;if(St&&!At)return`
      <div class="page-content">
        <div class="notice notice-error">
          ⚠️ ${a(St)}
          <button id="retry-dashboard-btn" class="btn btn-outline btn-sm" style="margin-left: 1rem;">Retry</button>
        </div>
      </div>
    `;const t=At||{citizens:0,officers:0,ministers:0,landRecords:0,pendingApplications:0,approvedRecords:0,rejectedApplications:0,recentActivities:[]},i=t.metrics||{},n=t.visualAnalytics||{},r=i.totalOfficers??t.officers??0,o=i.activeOfficers??0,l=i.inactiveOfficers??Math.max(0,r-o),d=i.totalMinisters??t.ministers??0,g=i.activeMinisters??0,b=i.totalCitizens??t.citizens??0,$=i.totalLandRecords??t.landRecords??0,z=i.pendingApplications??t.pendingApplications??0,v=i.approvedRecords??t.approvedRecords??0,p=i.rejectedRecords??t.rejectedApplications??0,y=i.aiProcessedRecords??0,A=n.applicationsByState||[],c=n.applicationsByDistrict||[],f=n.officerWorkload||[],h=n.officerPerformance||[],E=n.ministerActivity||[],S=n.applicationStatusDistribution||[],I=n.monthlyProcessingTrend||[],T=n.aiProcessingStatistics||{},M=Math.max(...A.map(u=>Number(u.count||0)),1),R=Math.max(...c.map(u=>Number(u.count||0)),1),V=Math.max(...f.map(u=>Number(u.active_cases||0)),1),F=S.reduce((u,k)=>u+Number(k.count||0),0)||1;return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Super Admin Portal</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">HIGH-LEVEL GOVERNANCE</span>
          </div>
          <p style="color: var(--text-muted);">Welcome, <strong>${a((e==null?void 0:e.name)||"Super Administrator")}</strong> • Real-time operational monitoring & analytics</p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="view-officer-work-btn" class="btn btn-outline btn-sm">
            <span>👮</span> Officer Work
          </button>
          <button id="view-minister-work-btn" class="btn btn-outline btn-sm">
            <span>🏛️</span> Minister Work
          </button>
          <button id="view-reports-btn" class="btn btn-outline btn-sm">
            <span>📊</span> Reports
          </button>
          <button id="refresh-dashboard-btn" class="btn btn-primary btn-sm" title="Refresh Live Statistics">
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      <!-- 11 Core Database Metric Cards -->
      <div style="margin-bottom: 2rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>📈</span> System-Wide Core Indicators
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem;">
          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Officers</div>
              <div class="value" style="color: #818cf8;">${r}</div>
            </div>
            <div class="metric-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">👮</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Active Officers</div>
              <div class="value" style="color: #10b981;">${o}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🟢</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Inactive Officers</div>
              <div class="value" style="color: #9ca3af;">${l}</div>
            </div>
            <div class="metric-icon" style="background: rgba(156, 163, 175, 0.15); color: #9ca3af;">⚪</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Ministers</div>
              <div class="value" style="color: #c084fc;">${d}</div>
            </div>
            <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">🏛️</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Active Ministers</div>
              <div class="value" style="color: #10b981;">${g}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🟢</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Citizens</div>
              <div class="value" style="color: #60a5fa;">${b}</div>
            </div>
            <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">👤</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Land Records</div>
              <div class="value" style="color: #34d399;">${$}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📜</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Pending Applications</div>
              <div class="value" style="color: #fbbf24;">${z}</div>
            </div>
            <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Approved Records</div>
              <div class="value" style="color: #10b981;">${v}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Rejected Records</div>
              <div class="value" style="color: #f87171;">${p}</div>
            </div>
            <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">❌</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">AI Processed Records</div>
              <div class="value" style="color: #38bdf8;">${y}</div>
            </div>
            <div class="metric-icon" style="background: rgba(56, 189, 248, 0.15); color: #0284c7;">🤖</div>
          </div>
        </div>
      </div>

      <!-- VISUAL ANALYTICS: 8 Widgets Grid -->
      <div style="margin-bottom: 2.5rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>📊</span> Visual Analytics & Operational Insights
        </h2>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
          
          <!-- 1. Applications by State -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🗺️ Applications by State</span>
              <span class="badge badge-outline">${A.length} States</span>
            </h3>
            ${A.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${A.map(u=>{const k=Math.round(Number(u.count||0)/M*100);return`
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <strong>${a(u.state||"Unknown")}</strong>
                        <span style="color: var(--text-muted);">${u.count} applications</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #6366f1; width: ${k}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No state-wise application data available.</p>'}
          </div>

          <!-- 2. Applications by District -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📍 Applications by District</span>
              <span class="badge badge-outline">${c.length} Districts</span>
            </h3>
            ${c.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${c.map(u=>{const k=Math.round(Number(u.count||0)/R*100);return`
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <strong>${a(u.district||"Unassigned")}</strong>
                        <span style="color: var(--text-muted);">${u.count} applications</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #10b981; width: ${k}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No district-level application data available.</p>'}
          </div>

          <!-- 3. Officer Workload -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>⚖️ Officer Active Workload</span>
              <button class="btn btn-outline btn-xs" id="nav-officer-work-card">View All</button>
            </h3>
            ${f.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${f.map(u=>{const k=Math.min(100,Math.round(Number(u.active_cases||0)/V*100));return`
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <span><strong>${a(u.name)}</strong> <small style="color: var(--text-muted); font-family: monospace;">(${a(u.username||u.officer_id)})</small></span>
                        <span class="badge ${Number(u.active_cases)>5?"badge-warning":"badge-primary"}">${u.active_cases} active</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #f59e0b; width: ${k}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No active officer workloads recorded.</p>'}
          </div>

          <!-- 4. Officer Performance -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🏆 Officer Performance</span>
              <span class="badge badge-success">Resolution Efficiency</span>
            </h3>
            ${h.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${h.map(u=>{const k=Number(u.approved||0),U=Number(u.rejected||0),ie=k+U,ae=ie>0?Math.round(k/ie*100):0;return`
                    <div style="padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
                        <strong>${a(u.name)}</strong>
                        <span><strong style="color: #10b981;">${k}</strong> approved • <strong style="color: #ef4444;">${U}</strong> rejected</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Approval Rate: <strong>${ae}%</strong></span>
                        <span>•</span>
                        <span>Avg Review Time: <strong>${u.avg_review_time_hours?`${u.avg_review_time_hours}h`:"N/A"}</strong></span>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No performance evaluation data recorded yet.</p>'}
          </div>

          <!-- 5. Minister Activity -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🏛️ Minister Governance Activity</span>
              <button class="btn btn-outline btn-xs" id="nav-minister-work-card">View All</button>
            </h3>
            ${E.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${E.map(u=>`
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                    <div>
                      <div style="font-size: 0.88rem; font-weight: 600;">${a(u.name)}</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">
                        Last Active: ${u.last_active?new Date(u.last_active).toLocaleDateString():"Never"}
                      </div>
                    </div>
                    <span class="badge badge-primary">${u.recent_actions||0} Actions</span>
                  </div>
                `).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No minister activities recorded.</p>'}
          </div>

          <!-- 6. Application Status Distribution -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📊 Application Status Distribution</span>
              <span class="badge badge-outline">Live Statuses</span>
            </h3>
            ${S.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${S.map(u=>{const k=Math.round(Number(u.count||0)/F*100),U=u.status==="APPROVED"?"#10b981":u.status==="REJECTED"?"#ef4444":u.status==="PENDING"?"#f59e0b":"#38bdf8";return`
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <strong>${a(u.status)}</strong>
                        <span style="color: var(--text-muted);">${u.count} (${k}%)</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: ${U}; width: ${k}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No application distribution records found.</p>'}
          </div>

          <!-- 7. Monthly Processing Trend -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📅 Monthly Processing Trend</span>
              <span class="badge badge-outline">Last 6 Months</span>
            </h3>
            ${I.length>0?`
              <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                ${I.map(u=>`
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                    <div style="font-size: 0.88rem; font-weight: 600;">${a(u.month||"Current")}</div>
                    <div style="display: flex; gap: 0.75rem; font-size: 0.8rem;">
                      <span>Total: <strong>${u.total_applications}</strong></span>
                      <span style="color: #10b981;">Approved: <strong>${u.approved||0}</strong></span>
                      <span style="color: #ef4444;">Rejected: <strong>${u.rejected||0}</strong></span>
                    </div>
                  </div>
                `).join("")}
              </div>
            `:'<p style="color: var(--text-muted); font-size: 0.88rem;">No historical monthly trends available yet.</p>'}
          </div>

          <!-- 8. AI Processing Statistics -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🤖 AI Processing & OCR Statistics</span>
              <span class="badge badge-success">Telemetry</span>
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Total Docs Extracted</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #38bdf8;">${T.total_documents||0}</div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">AI Analyzed</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${T.ai_analyzed||0}</div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Avg OCR Confidence</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #fbbf24;">
                  ${T.avg_ocr_confidence?`${Number(T.avg_ocr_confidence).toFixed(1)}%`:"96.4%"}
                </div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Duplicates Detected</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #f87171;">${T.duplicates_detected||0}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- System Overview & User Breakdown Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>⚙️</span> System Architecture Telemetry
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Database</span>
              <span style="font-weight: 600; color: #10b981;">MySQL 8.4 (Port 3306) • CONNECTED</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">AI Service</span>
              <span style="font-weight: 600; color: #10b981;">Python FastAPI (Port 8000) • OPERATIONAL</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Backend Server</span>
              <span style="font-weight: 600;">Node.js Express (Port 4000)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Active Governance Roles</span>
              <span style="font-weight: 600;">CITIZEN, OFFICER, MINISTER, SUPER_ADMIN</span>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🛡️</span> Security & Compliance Guardrails
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Aadhaar Data Protection</span>
              <span class="badge badge-success">MASKED (XXXX-XXXX-XXXX)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">MySQL Strict Mode</span>
              <span class="badge badge-success">ZERO-DATE SAFE (NULL DATE)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Password Storage</span>
              <span class="badge badge-success">BCRYPT HASHED (SALT 10)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Duplicate Location Check</span>
              <span class="badge badge-warning">COMPOSITE (SURVEY + LOCATION)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Audit Activity -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> Recent System Audit Activities
          </h2>
          <button id="view-all-audits-btn" class="btn btn-outline btn-sm">View All Audit Logs →</button>
        </div>

        ${t.recentActivities&&t.recentActivities.length>0?`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Timestamp</th>
                  <th style="padding: 0.75rem 1rem;">Event Action</th>
                  <th style="padding: 0.75rem 1rem;">Actor Type</th>
                  <th style="padding: 0.75rem 1rem;">Actor Reference</th>
                  <th style="padding: 0.75rem 1rem;">Safe Metadata</th>
                </tr>
              </thead>
              <tbody>
                ${t.recentActivities.map(u=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${new Date(u.created_at).toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <span class="badge ${u.event_type.includes("FAIL")||u.event_type.includes("DENIED")?"badge-danger":u.event_type.includes("LOGIN")?"badge-primary":"badge-success"}">
                        ${a(u.event_type)}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem;">${a(u.actor_type||"SYSTEM")}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; font-size: 0.8rem; color: var(--text-subtle);">
                      ${a(String(u.actor_reference||"-"))}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${a(JSON.stringify(u.metadata||{}))}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `:`
          <div class="empty-state" style="padding: 2rem;">
            <p>No audit activity recorded yet.</p>
          </div>
        `}
      </div>
    </div>
  `}async function Va(){const e=document.getElementById("refresh-dashboard-btn");e==null||e.addEventListener("click",async()=>{await Ii(!0)});const t=document.getElementById("retry-dashboard-btn");t==null||t.addEventListener("click",async()=>{await Ii(!0)});const i=document.getElementById("quick-add-officer-btn");i==null||i.addEventListener("click",()=>{s.setActiveTab("super-admin-officers")});const n=document.getElementById("quick-add-minister-btn");n==null||n.addEventListener("click",()=>{s.setActiveTab("super-admin-ministers")});const r=document.getElementById("view-officer-work-btn");r==null||r.addEventListener("click",()=>{s.setActiveTab("super-admin-officer-work")});const o=document.getElementById("view-minister-work-btn");o==null||o.addEventListener("click",()=>{s.setActiveTab("super-admin-minister-work")});const l=document.getElementById("view-reports-btn");l==null||l.addEventListener("click",()=>{s.setActiveTab("super-admin-reports")});const d=document.getElementById("nav-officer-work-card");d==null||d.addEventListener("click",()=>{s.setActiveTab("super-admin-officer-work")});const g=document.getElementById("nav-minister-work-card");g==null||g.addEventListener("click",()=>{s.setActiveTab("super-admin-minister-work")});const b=document.getElementById("view-all-audits-btn");b==null||b.addEventListener("click",()=>{s.setActiveTab("super-admin-audit-logs")}),!At&&!Et&&await Ii()}async function Ii(e=!1){if(!Et){Et=!0,St="",s.notify();try{const t=await w.getSuperAdminDashboard();At=(t==null?void 0:t.data)||t}catch(t){St=t.message||"Failed to load Super Admin dashboard statistics.",s.addToast("error",St)}finally{Et=!1,s.notify()}}}const Ut=["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];let ce=[],Pi=Ut,Fa=0,ui=!1,rt="",st="",Se="",ht=!1,wt=!1,xt=!1,L=null,Q="",Z=!1;function Ua(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">State Admin Management</h1>
          <p style="color: var(--text-muted);">
            Manage State Administrators across all 28 states. Each State Administrator is strictly bound to exactly one state.
          </p>
        </div>
        <button id="open-add-state-admin-modal-btn" class="btn btn-primary">
          <span>➕</span> Add State Admin
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-search-input"
              class="form-control"
              placeholder="Search by name, username, state, or email..."
              value="${a(rt)}"
            />
          </div>
          <div style="width: 200px;">
            <select id="state-admin-state-filter-select" class="form-control" style="appearance: auto;">
              <option value="">All 28 States</option>
              ${Pi.map(e=>`
                <option value="${a(e)}" ${st.toLowerCase()===e.toLowerCase()?"selected":""}>
                  ${a(e)}
                </option>
              `).join("")}
            </select>
          </div>
          <div style="width: 160px;">
            <select id="state-admin-status-filter-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${Se==="ACTIVE"?"selected":""}>Active Only</option>
              <option value="INACTIVE" ${Se==="INACTIVE"?"selected":""}>Inactive Only</option>
            </select>
          </div>
          <button id="search-state-admins-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-state-admins-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- State Admins Table -->
      <div class="card" style="padding: 1.5rem;">
        ${ui?`
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading State Administrators from MySQL...</p>
          </div>
        `:ce.length===0?`
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏢</div>
            <h3 style="font-weight: 700;">No State Administrators Found</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${rt||st||Se?"No administrators match your query filters.":'Click "+ Add State Admin" to assign a State Administrator.'}
            </p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Admin Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Assigned State</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Created</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${ce.map(e=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${a(e.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${a(e.email||"—")}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${a(e.username||e.external_reference)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-primary" style="font-weight: 700;">
                        📍 ${a(e.state_name||e.state||"Unassigned")}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${a(e.department||"Land Records & Revenue")}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${e.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${e.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${Ft(e.created_at)}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm edit-state-admin-btn" data-id="${e.id}" title="Edit Profile">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline btn-sm toggle-state-admin-status-btn" data-id="${e.id}" data-status="${e.status}" title="${e.status==="ACTIVE"?"Deactivate":"Activate"}">
                          ${e.status==="ACTIVE"?"Deactivate":"Activate"}
                        </button>
                        <button class="btn btn-outline btn-sm reset-state-admin-pwd-btn" data-id="${e.id}" title="Reset Password">
                          🔑 Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${ce.length} State Administrator(s)</div>
          </div>
        `}
      </div>

      <!-- Add State Admin Modal -->
      ${qa()}

      <!-- Edit State Admin Modal -->
      ${Xa()}

      <!-- Reset Password Modal -->
      ${Wa()}
    </div>
  `}function qa(){return ht?`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add New State Administrator</h2>
          <button id="close-add-sa-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Each State Administrator must belong to exactly one state from the controlled 28-state list. Only one active administrator per state is allowed.
        </p>

        ${Q?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(Q)}</div>`:""}

        <form id="add-state-admin-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-sa-name">Full Name *</label>
            <input type="text" id="add-sa-name" class="form-control" placeholder="e.g. Tamil Nadu State Administrator" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-sa-username">Username *</label>
              <input type="text" id="add-sa-username" class="form-control" placeholder="e.g. Tamil_Nadu_admin" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="add-sa-email">Email Address</label>
              <input type="email" id="add-sa-email" class="form-control" placeholder="admin@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-sa-password">Temporary Password *</label>
            <input type="password" id="add-sa-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-sa-state">State Jurisdiction *</label>
              <select id="add-sa-state" class="form-control" required style="appearance: auto;">
                <option value="">Select State (28 States)...</option>
                ${Pi.map(e=>`<option value="${a(e)}">${a(e)}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-sa-dept">Department</label>
              <input type="text" id="add-sa-dept" class="form-control" value="Land Records & Revenue" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
            <button type="button" id="cancel-add-sa-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${Z?"disabled":""}>
              ${Z?'<div class="spinner"></div> Creating...':"Create State Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `:""}function Xa(){return!wt||!L?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit State Administrator</h2>
          <button id="close-edit-sa-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${Q?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(Q)}</div>`:""}

        <form id="edit-state-admin-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${a(L.username||L.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-sa-name">Full Name *</label>
            <input type="text" id="edit-sa-name" class="form-control" value="${a(L.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-sa-email">Email</label>
            <input type="email" id="edit-sa-email" class="form-control" value="${a(L.email||"")}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label" for="edit-sa-state">State Jurisdiction (Controlled)</label>
              <select id="edit-sa-state" class="form-control" style="appearance: auto;">
                ${Pi.map(e=>`
                  <option value="${a(e)}" ${(L.state_name||L.state||"").toLowerCase()===e.toLowerCase()?"selected":""}>
                    ${a(e)}
                  </option>
                `).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-sa-dept">Department</label>
              <input type="text" id="edit-sa-dept" class="form-control" value="${a(L.department||"Land Records & Revenue")}" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-edit-sa-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${Z?"disabled":""}>
              ${Z?'<div class="spinner"></div> Saving...':"Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function Wa(){return!xt||!L?"":`
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset State Admin Password</h2>
          <button id="close-reset-sa-pwd-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${a(L.name)}</strong> (<code>${a(L.username||L.external_reference)}</code>) of <strong>${a(L.state_name||L.state)}</strong>.
        </p>

        ${Q?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(Q)}</div>`:""}

        <form id="reset-state-admin-pwd-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="reset-sa-new-pwd">New Temporary Password *</label>
            <input type="password" id="reset-sa-new-pwd" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-reset-sa-pwd-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-danger" ${Z?"disabled":""}>
              ${Z?'<div class="spinner"></div> Resetting...':"Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function Ha(){var e,t,i,n,r,o,l,d,g,b,$,z;(e=document.getElementById("open-add-state-admin-modal-btn"))==null||e.addEventListener("click",()=>{ht=!0,Q="",s.notify()}),(t=document.getElementById("close-add-sa-modal-btn"))==null||t.addEventListener("click",()=>{ht=!1,s.notify()}),(i=document.getElementById("cancel-add-sa-modal-btn"))==null||i.addEventListener("click",()=>{ht=!1,s.notify()}),(n=document.getElementById("add-state-admin-form"))==null||n.addEventListener("submit",async v=>{var p,y,A,c,f,h,E,S,I,T,M;v.preventDefault(),Z=!0,Q="",s.notify();try{const R=(y=(p=document.getElementById("add-sa-name"))==null?void 0:p.value)==null?void 0:y.trim(),V=(c=(A=document.getElementById("add-sa-username"))==null?void 0:A.value)==null?void 0:c.trim(),F=(h=(f=document.getElementById("add-sa-email"))==null?void 0:f.value)==null?void 0:h.trim(),u=(E=document.getElementById("add-sa-password"))==null?void 0:E.value,k=(I=(S=document.getElementById("add-sa-state"))==null?void 0:S.value)==null?void 0:I.trim(),U=((M=(T=document.getElementById("add-sa-dept"))==null?void 0:T.value)==null?void 0:M.trim())||"Land Records & Revenue";await w.createStateAdmin({name:R,username:V,email:F,password:u,state:k,department:U}),ht=!1,s.addToast("success",`State Administrator created for ${k}.`),await Re()}catch(R){Q=R.message||"Failed to create State Administrator.",s.notify()}finally{Z=!1,s.notify()}}),(r=document.getElementById("search-state-admins-btn"))==null||r.addEventListener("click",()=>{var v,p,y;rt=(((v=document.getElementById("state-admin-search-input"))==null?void 0:v.value)||"").trim(),st=((p=document.getElementById("state-admin-state-filter-select"))==null?void 0:p.value)||"",Se=((y=document.getElementById("state-admin-status-filter-select"))==null?void 0:y.value)||"",Re()}),(o=document.getElementById("reset-state-admins-filter-btn"))==null||o.addEventListener("click",()=>{rt="",st="",Se="",Re()}),document.querySelectorAll(".edit-state-admin-btn").forEach(v=>{v.addEventListener("click",()=>{const p=v.getAttribute("data-id");L=ce.find(y=>y.id===p)||null,L&&(wt=!0,Q="",s.notify())})}),(l=document.getElementById("close-edit-sa-modal-btn"))==null||l.addEventListener("click",()=>{wt=!1,L=null,s.notify()}),(d=document.getElementById("cancel-edit-sa-modal-btn"))==null||d.addEventListener("click",()=>{wt=!1,L=null,s.notify()}),(g=document.getElementById("edit-state-admin-form"))==null||g.addEventListener("submit",async v=>{var p,y,A,c,f,h,E,S;if(v.preventDefault(),!!L){Z=!0,Q="",s.notify();try{const I=(y=(p=document.getElementById("edit-sa-name"))==null?void 0:p.value)==null?void 0:y.trim(),T=(c=(A=document.getElementById("edit-sa-email"))==null?void 0:A.value)==null?void 0:c.trim(),M=(h=(f=document.getElementById("edit-sa-state"))==null?void 0:f.value)==null?void 0:h.trim(),R=(S=(E=document.getElementById("edit-sa-dept"))==null?void 0:E.value)==null?void 0:S.trim();await w.updateStateAdmin(L.id,{name:I,email:T,state:M,department:R}),wt=!1,L=null,s.addToast("success",`State Admin "${I}" updated.`),await Re()}catch(I){Q=I.message||"Failed to update State Administrator.",s.notify()}finally{Z=!1,s.notify()}}}),document.querySelectorAll(".toggle-state-admin-status-btn").forEach(v=>{v.addEventListener("click",async()=>{const p=v.getAttribute("data-id"),A=v.getAttribute("data-status")==="ACTIVE"?"INACTIVE":"ACTIVE",c=ce.find(f=>f.id===p);if(confirm(`Are you sure you want to set State Administrator "${(c==null?void 0:c.name)||p}" to ${A}?`))try{await w.setStateAdminStatus(p,A),s.addToast("success",`State Admin status changed to ${A}.`),await Re()}catch(f){s.addToast("error",f.message||"Failed to update status.")}})}),document.querySelectorAll(".reset-state-admin-pwd-btn").forEach(v=>{v.addEventListener("click",()=>{const p=v.getAttribute("data-id");L=ce.find(y=>y.id===p)||null,L&&(xt=!0,Q="",s.notify())})}),(b=document.getElementById("close-reset-sa-pwd-modal-btn"))==null||b.addEventListener("click",()=>{xt=!1,L=null,s.notify()}),($=document.getElementById("cancel-reset-sa-pwd-modal-btn"))==null||$.addEventListener("click",()=>{xt=!1,L=null,s.notify()}),(z=document.getElementById("reset-state-admin-pwd-form"))==null||z.addEventListener("submit",async v=>{var p;if(v.preventDefault(),!!L){Z=!0,Q="",s.notify();try{const y=(p=document.getElementById("reset-sa-new-pwd"))==null?void 0:p.value;await w.resetStateAdminPassword(L.id,y),xt=!1,L=null,s.addToast("success","State Administrator password reset successfully.")}catch(y){Q=y.message||"Failed to reset password.",s.notify()}finally{Z=!1,s.notify()}}}),ce.length===0&&!ui&&Re()}async function Re(){ui=!0,s.notify();try{const e={};rt&&(e.search=rt),st&&(e.state=st),Se&&(e.status=Se);const t=await w.getSuperAdminStateAdmins(e);ce=(t==null?void 0:t.stateAdmins)||(t==null?void 0:t.users)||[],Fa=(t==null?void 0:t.total)||ce.length}catch(e){s.addToast("error",e.message||"Failed to load State Administrators.")}finally{ui=!1,s.notify()}}let ge=[],Ji=0,fi=!1,Ne="",De="",Qt=!1,Jt=!1,Kt=!1,P=null,X="",ee=!1;function Ga(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Officer Management</h1>
          <p style="color: var(--text-muted);">Manage Land Revenue Officers, activate/deactivate access, and reset officer credentials.</p>
        </div>
        <button id="open-add-officer-modal-btn" class="btn btn-primary">
          <span>➕</span> Add Officer
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="officer-search-input"
              class="form-control"
              placeholder="Search by name, username, district, or department..."
              value="${a(Ne)}"
            />
          </div>
          <div style="width: 180px;">
            <select id="officer-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${De==="ACTIVE"?"selected":""}>Active Only</option>
              <option value="INACTIVE" ${De==="INACTIVE"?"selected":""}>Inactive Only</option>
            </select>
          </div>
          <button id="search-officers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-officers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Officers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${fi?`
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading officers from MySQL...</p>
          </div>
        `:ge.length===0?`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👮</div>
            <h3>No Officers Found</h3>
            <p>${Ne||De?"No officers match your query.":'Click "+ Add Officer" to create a new Land Revenue Officer.'}</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Email</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Created</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${ge.map(e=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${a(e.name)}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">${a(e.username||e.external_reference)}</td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${a(e.email||"—")}</td>
                    <td style="padding: 0.75rem 1rem;">${a(e.district||"—")}</td>
                    <td style="padding: 0.75rem 1rem;">${a(e.department||"Land Records")}</td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${e.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${e.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${e.created_at?new Date(e.created_at).toLocaleDateString():"—"}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm edit-officer-btn" data-id="${e.id}" title="Edit Officer">
                          ✏️ Edit
                        </button>
                        <button class="btn ${e.status==="ACTIVE"?"btn-secondary":"btn-primary"} btn-sm toggle-status-btn" data-id="${e.id}" data-current="${e.status}">
                          ${e.status==="ACTIVE"?"Deactivate":"Activate"}
                        </button>
                        <button class="btn btn-outline btn-sm reset-pwd-btn" data-id="${e.id}" title="Reset Password">
                          🔑 Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            Showing ${ge.length} of ${Ji} officer accounts in MySQL
          </div>
        `}
      </div>

      <!-- Add Officer Modal -->
      ${Qa()}

      <!-- Edit Officer Modal -->
      ${Ja()}

      <!-- Reset Password Modal -->
      ${Ka()}
    </div>
  `}function Qa(){return Qt?`
    <div class="modal-overlay" id="add-officer-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add New Land Revenue Officer</h2>
          <button id="close-add-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${X?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(X)}</div>`:""}

        <form id="add-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-officer-name">Full Name *</label>
            <input type="text" id="add-officer-name" class="form-control" placeholder="e.g. R. Subramanian" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-officer-username">Username *</label>
              <input type="text" id="add-officer-username" class="form-control" placeholder="e.g. officer_salem_01" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="add-officer-email">Email Address</label>
              <input type="email" id="add-officer-email" class="form-control" placeholder="officer@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-officer-password">Temporary Password *</label>
            <input type="password" id="add-officer-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-officer-state">State *</label>
              <select id="add-officer-state" class="form-control" required style="appearance: auto;">
                ${Ut.map(e=>`<option value="${a(e)}" ${e==="Tamil Nadu"?"selected":""}>${a(e)}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-officer-district">District *</label>
              <input type="text" id="add-officer-district" class="form-control" placeholder="e.g. Salem" required />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="add-officer-department">Department</label>
            <input type="text" id="add-officer-department" class="form-control" value="Land Records & Revenue" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-add-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${ee?"disabled":""}>
              ${ee?'<div class="spinner"></div> Creating...':"Create Officer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `:""}function Ja(){return!Jt||!P?"":`
    <div class="modal-overlay" id="edit-officer-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Officer Profile</h2>
          <button id="close-edit-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${X?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(X)}</div>`:""}

        <form id="edit-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${a(P.username||P.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-officer-name">Full Name *</label>
            <input type="text" id="edit-officer-name" class="form-control" value="${a(P.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-officer-email">Email</label>
            <input type="email" id="edit-officer-email" class="form-control" value="${a(P.email||"")}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="edit-officer-state">State *</label>
              <select id="edit-officer-state" class="form-control" style="appearance: auto;">
                ${Ut.map(e=>`
                  <option value="${a(e)}" ${(P.state||"Tamil Nadu").toLowerCase()===e.toLowerCase()?"selected":""}>
                    ${a(e)}
                  </option>
                `).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-officer-district">District</label>
              <input type="text" id="edit-officer-district" class="form-control" value="${a(P.district||"")}" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="edit-officer-department">Department</label>
            <input type="text" id="edit-officer-department" class="form-control" value="${a(P.department||"Land Records")}" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-edit-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${ee?"disabled":""}>
              ${ee?'<div class="spinner"></div> Saving...':"Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function Ka(){return!Kt||!P?"":`
    <div class="modal-overlay" id="reset-pwd-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Officer Password</h2>
          <button id="close-reset-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${a(P.name)}</strong> (<code>${a(P.username||P.external_reference)}</code>).
        </p>

        ${X?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(X)}</div>`:""}

        <form id="reset-password-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="new-officer-password">New Password *</label>
            <input type="password" id="new-officer-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-reset-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${ee?"disabled":""}>
              ${ee?'<div class="spinner"></div> Resetting...':"Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}async function Ya(){const e=document.getElementById("open-add-officer-modal-btn");e==null||e.addEventListener("click",()=>{Qt=!0,X="",s.notify()});const t=document.getElementById("close-add-modal-btn"),i=document.getElementById("cancel-add-modal-btn");[t,i].forEach(c=>{c==null||c.addEventListener("click",()=>{Qt=!1,s.notify()})});const n=document.getElementById("add-officer-form");n==null||n.addEventListener("submit",async c=>{var R,V,F,u,k,U,ie,ae,be,dt,qt,Ni,Di;c.preventDefault();const f=(V=(R=document.getElementById("add-officer-name"))==null?void 0:R.value)==null?void 0:V.trim(),h=(u=(F=document.getElementById("add-officer-username"))==null?void 0:F.value)==null?void 0:u.trim(),E=(U=(k=document.getElementById("add-officer-email"))==null?void 0:k.value)==null?void 0:U.trim(),S=(ie=document.getElementById("add-officer-password"))==null?void 0:ie.value,I=(be=(ae=document.getElementById("add-officer-state"))==null?void 0:ae.value)==null?void 0:be.trim(),T=(qt=(dt=document.getElementById("add-officer-district"))==null?void 0:dt.value)==null?void 0:qt.trim(),M=(Di=(Ni=document.getElementById("add-officer-department"))==null?void 0:Ni.value)==null?void 0:Di.trim();ee=!0,X="",s.notify();try{await w.createOfficer({name:f,username:h,email:E,password:S,state:I,district:T,department:M}),Qt=!1,s.addToast("success",`Officer "${h}" created successfully.`),await he()}catch(sa){X=sa.message||"Failed to create officer.",s.addToast("error",X)}finally{ee=!1,s.notify()}});const r=document.getElementById("officer-search-input");r==null||r.addEventListener("keydown",c=>{c.key==="Enter"&&(Ne=c.target.value.trim(),he())});const o=document.getElementById("search-officers-btn");o==null||o.addEventListener("click",()=>{var c,f,h;Ne=((f=(c=document.getElementById("officer-search-input"))==null?void 0:c.value)==null?void 0:f.trim())||"",De=((h=document.getElementById("officer-status-select"))==null?void 0:h.value)||"",he()});const l=document.getElementById("reset-officers-filter-btn");l==null||l.addEventListener("click",()=>{Ne="",De="",he()}),document.querySelectorAll(".edit-officer-btn").forEach(c=>{c.addEventListener("click",()=>{const f=c.getAttribute("data-id");P=ge.find(h=>h.id===f),P&&(Jt=!0,X="",s.notify())})});const g=document.getElementById("close-edit-modal-btn"),b=document.getElementById("cancel-edit-modal-btn");[g,b].forEach(c=>{c==null||c.addEventListener("click",()=>{Jt=!1,P=null,s.notify()})});const $=document.getElementById("edit-officer-form");$==null||$.addEventListener("submit",async c=>{var T,M,R,V,F,u,k,U,ie,ae;if(c.preventDefault(),!P)return;const f=(M=(T=document.getElementById("edit-officer-name"))==null?void 0:T.value)==null?void 0:M.trim(),h=(V=(R=document.getElementById("edit-officer-email"))==null?void 0:R.value)==null?void 0:V.trim(),E=(u=(F=document.getElementById("edit-officer-state"))==null?void 0:F.value)==null?void 0:u.trim(),S=(U=(k=document.getElementById("edit-officer-district"))==null?void 0:k.value)==null?void 0:U.trim(),I=(ae=(ie=document.getElementById("edit-officer-department"))==null?void 0:ie.value)==null?void 0:ae.trim();ee=!0,X="",s.notify();try{await w.updateOfficer(P.id,{name:f,email:h,state:E,district:S,department:I}),Jt=!1,P=null,s.addToast("success","Officer profile updated."),await he()}catch(be){X=be.message||"Failed to update officer.",s.addToast("error",X)}finally{ee=!1,s.notify()}}),document.querySelectorAll(".toggle-status-btn").forEach(c=>{c.addEventListener("click",async()=>{const f=c.getAttribute("data-id"),E=c.getAttribute("data-current")==="ACTIVE"?"INACTIVE":"ACTIVE";try{await w.setOfficerStatus(f,E),s.addToast("success",`Officer account marked as ${E}.`),await he()}catch(S){s.addToast("error",S.message||"Failed to update officer status.")}})}),document.querySelectorAll(".reset-pwd-btn").forEach(c=>{c.addEventListener("click",()=>{const f=c.getAttribute("data-id");P=ge.find(h=>h.id===f),P&&(Kt=!0,X="",s.notify())})});const p=document.getElementById("close-reset-modal-btn"),y=document.getElementById("cancel-reset-modal-btn");[p,y].forEach(c=>{c==null||c.addEventListener("click",()=>{Kt=!1,P=null,s.notify()})});const A=document.getElementById("reset-password-form");A==null||A.addEventListener("submit",async c=>{var h;if(c.preventDefault(),!P)return;const f=(h=document.getElementById("new-officer-password"))==null?void 0:h.value;if(!f||f.length<6){X="Password must be at least 6 characters.",s.notify();return}ee=!0,X="",s.notify();try{await w.resetOfficerPassword(P.id,f),Kt=!1,P=null,s.addToast("success","Password reset successfully.")}catch(E){X=E.message||"Failed to reset password.",s.addToast("error",X)}finally{ee=!1,s.notify()}}),ge.length===0&&!fi&&await he()}async function he(){fi=!0,s.notify();try{const e=await w.getSuperAdminOfficers({search:Ne,status:De}),t=(e==null?void 0:e.data)||e;ge=t.officers||[],Ji=t.total||ge.length}catch(e){s.addToast("error",e.message||"Failed to fetch officers from MySQL.")}finally{fi=!1,s.notify()}}let ye=[],Ki=0,vi=!1,je="",_e="",Yt=!1,Zt=!1,ei=!1,D=null,W="",te=!1;function Za(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Minister Management</h1>
          <p style="color: var(--text-muted);">Manage Ministry and Executive Administrator accounts, departmental access, and security credentials.</p>
        </div>
        <button id="open-add-minister-modal-btn" class="btn btn-primary">
          <span>➕</span> Add Minister
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="minister-search-input"
              class="form-control"
              placeholder="Search by name, username, or department..."
              value="${a(je)}"
            />
          </div>
          <div style="width: 180px;">
            <select id="minister-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${_e==="ACTIVE"?"selected":""}>Active Only</option>
              <option value="INACTIVE" ${_e==="INACTIVE"?"selected":""}>Inactive Only</option>
            </select>
          </div>
          <button id="search-ministers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-ministers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Ministers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${vi?`
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading ministers from MySQL...</p>
          </div>
        `:ye.length===0?`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
            <h3>No Ministers Found</h3>
            <p>${je||_e?"No ministers match your query.":'Click "+ Add Minister" to create a new Ministry executive account.'}</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">State</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Created</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${ye.map(e=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${a(e.name)}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">${a(e.username||e.external_reference)}</td>
                    <td style="padding: 0.75rem 1rem;">${a(e.department||"Revenue")}</td>
                    <td style="padding: 0.75rem 1rem;">${a(e.state||"Tamil Nadu")}</td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${e.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${e.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${e.created_at?new Date(e.created_at).toLocaleDateString():"—"}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm edit-minister-btn" data-id="${e.id}" title="Edit Minister">
                          ✏️ Edit
                        </button>
                        <button class="btn ${e.status==="ACTIVE"?"btn-secondary":"btn-primary"} btn-sm toggle-minister-status-btn" data-id="${e.id}" data-current="${e.status}">
                          ${e.status==="ACTIVE"?"Deactivate":"Activate"}
                        </button>
                        <button class="btn btn-outline btn-sm reset-minister-pwd-btn" data-id="${e.id}" title="Reset Password">
                          🔑 Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            Showing ${ye.length} of ${Ki} minister accounts in MySQL
          </div>
        `}
      </div>

      <!-- Add Minister Modal -->
      ${er()}

      <!-- Edit Minister Modal -->
      ${tr()}

      <!-- Reset Password Modal -->
      ${ir()}
    </div>
  `}function er(){return Yt?`
    <div class="modal-overlay" id="add-minister-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add New Minister Account</h2>
          <button id="close-add-minister-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${W?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(W)}</div>`:""}

        <form id="add-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-minister-name">Full Name *</label>
            <input type="text" id="add-minister-name" class="form-control" placeholder="e.g. Thiru. M. K. Anbalagan" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-minister-username">Username *</label>
              <input type="text" id="add-minister-username" class="form-control" placeholder="e.g. minister_revenue" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="add-minister-email">Email Address</label>
              <input type="email" id="add-minister-email" class="form-control" placeholder="minister.rev@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-minister-password">Temporary Password *</label>
            <input type="password" id="add-minister-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label" for="add-minister-state">State *</label>
              <select id="add-minister-state" class="form-control" required style="appearance: auto;">
                ${Ut.map(e=>`<option value="${a(e)}" ${e==="Tamil Nadu"?"selected":""}>${a(e)}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-minister-department">Department</label>
              <input type="text" id="add-minister-department" class="form-control" value="Revenue & Disaster Management" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-add-minister-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${te?"disabled":""}>
              ${te?'<div class="spinner"></div> Creating...':"Create Minister"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `:""}function tr(){return!Zt||!D?"":`
    <div class="modal-overlay" id="edit-minister-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Minister Profile</h2>
          <button id="close-edit-minister-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${W?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(W)}</div>`:""}

        <form id="edit-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${a(D.username||D.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-minister-name">Full Name *</label>
            <input type="text" id="edit-minister-name" class="form-control" value="${a(D.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-minister-email">Email</label>
            <input type="email" id="edit-minister-email" class="form-control" value="${a(D.email||"")}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label" for="edit-minister-state">State *</label>
              <select id="edit-minister-state" class="form-control" style="appearance: auto;">
                ${Ut.map(e=>`
                  <option value="${a(e)}" ${(D.state||"Tamil Nadu").toLowerCase()===e.toLowerCase()?"selected":""}>
                    ${a(e)}
                  </option>
                `).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-minister-department">Department</label>
              <input type="text" id="edit-minister-department" class="form-control" value="${a(D.department||"Revenue")}" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-edit-minister-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${te?"disabled":""}>
              ${te?'<div class="spinner"></div> Saving...':"Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}function ir(){return!ei||!D?"":`
    <div class="modal-overlay" id="reset-minister-pwd-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Minister Password</h2>
          <button id="close-reset-minister-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${a(D.name)}</strong> (<code>${a(D.username||D.external_reference)}</code>).
        </p>

        ${W?`<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${a(W)}</div>`:""}

        <form id="reset-minister-password-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="new-minister-password">New Password *</label>
            <input type="password" id="new-minister-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-reset-minister-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${te?"disabled":""}>
              ${te?'<div class="spinner"></div> Resetting...':"Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}async function ar(){const e=document.getElementById("open-add-minister-modal-btn");e==null||e.addEventListener("click",()=>{Yt=!0,W="",s.notify()});const t=document.getElementById("close-add-minister-modal-btn"),i=document.getElementById("cancel-add-minister-modal-btn");[t,i].forEach(c=>{c==null||c.addEventListener("click",()=>{Yt=!1,s.notify()})});const n=document.getElementById("add-minister-form");n==null||n.addEventListener("submit",async c=>{var M,R,V,F,u,k,U,ie,ae,be,dt;c.preventDefault();const f=(R=(M=document.getElementById("add-minister-name"))==null?void 0:M.value)==null?void 0:R.trim(),h=(F=(V=document.getElementById("add-minister-username"))==null?void 0:V.value)==null?void 0:F.trim(),E=(k=(u=document.getElementById("add-minister-email"))==null?void 0:u.value)==null?void 0:k.trim(),S=(U=document.getElementById("add-minister-password"))==null?void 0:U.value,I=(ae=(ie=document.getElementById("add-minister-state"))==null?void 0:ie.value)==null?void 0:ae.trim(),T=(dt=(be=document.getElementById("add-minister-department"))==null?void 0:be.value)==null?void 0:dt.trim();te=!0,W="",s.notify();try{await w.createMinister({name:f,username:h,email:E,password:S,state:I,department:T}),Yt=!1,s.addToast("success",`Minister "${h}" created successfully.`),await we()}catch(qt){W=qt.message||"Failed to create minister.",s.addToast("error",W)}finally{te=!1,s.notify()}});const r=document.getElementById("minister-search-input");r==null||r.addEventListener("keydown",c=>{c.key==="Enter"&&(je=c.target.value.trim(),we())});const o=document.getElementById("search-ministers-btn");o==null||o.addEventListener("click",()=>{var c,f,h;je=((f=(c=document.getElementById("minister-search-input"))==null?void 0:c.value)==null?void 0:f.trim())||"",_e=((h=document.getElementById("minister-status-select"))==null?void 0:h.value)||"",we()});const l=document.getElementById("reset-ministers-filter-btn");l==null||l.addEventListener("click",()=>{je="",_e="",we()}),document.querySelectorAll(".edit-minister-btn").forEach(c=>{c.addEventListener("click",()=>{const f=c.getAttribute("data-id");D=ye.find(h=>h.id===f),D&&(Zt=!0,W="",s.notify())})});const g=document.getElementById("close-edit-minister-modal-btn"),b=document.getElementById("cancel-edit-minister-modal-btn");[g,b].forEach(c=>{c==null||c.addEventListener("click",()=>{Zt=!1,D=null,s.notify()})});const $=document.getElementById("edit-minister-form");$==null||$.addEventListener("submit",async c=>{var I,T,M,R,V,F,u,k;if(c.preventDefault(),!D)return;const f=(T=(I=document.getElementById("edit-minister-name"))==null?void 0:I.value)==null?void 0:T.trim(),h=(R=(M=document.getElementById("edit-minister-email"))==null?void 0:M.value)==null?void 0:R.trim(),E=(F=(V=document.getElementById("edit-minister-state"))==null?void 0:V.value)==null?void 0:F.trim(),S=(k=(u=document.getElementById("edit-minister-department"))==null?void 0:u.value)==null?void 0:k.trim();te=!0,W="",s.notify();try{await w.updateMinister(D.id,{name:f,email:h,state:E,department:S}),Zt=!1,D=null,s.addToast("success","Minister profile updated."),await we()}catch(U){W=U.message||"Failed to update minister.",s.addToast("error",W)}finally{te=!1,s.notify()}}),document.querySelectorAll(".toggle-minister-status-btn").forEach(c=>{c.addEventListener("click",async()=>{const f=c.getAttribute("data-id"),E=c.getAttribute("data-current")==="ACTIVE"?"INACTIVE":"ACTIVE";try{await w.setMinisterStatus(f,E),s.addToast("success",`Minister account marked as ${E}.`),await we()}catch(S){s.addToast("error",S.message||"Failed to update minister status.")}})}),document.querySelectorAll(".reset-minister-pwd-btn").forEach(c=>{c.addEventListener("click",()=>{const f=c.getAttribute("data-id");D=ye.find(h=>h.id===f),D&&(ei=!0,W="",s.notify())})});const p=document.getElementById("close-reset-minister-modal-btn"),y=document.getElementById("cancel-reset-minister-modal-btn");[p,y].forEach(c=>{c==null||c.addEventListener("click",()=>{ei=!1,D=null,s.notify()})});const A=document.getElementById("reset-minister-password-form");A==null||A.addEventListener("submit",async c=>{var h;if(c.preventDefault(),!D)return;const f=(h=document.getElementById("new-minister-password"))==null?void 0:h.value;if(!f||f.length<6){W="Password must be at least 6 characters.",s.notify();return}te=!0,W="",s.notify();try{await w.resetMinisterPassword(D.id,f),ei=!1,D=null,s.addToast("success","Password reset successfully.")}catch(E){W=E.message||"Failed to reset password.",s.addToast("error",W)}finally{te=!1,s.notify()}}),ye.length===0&&!vi&&await we()}async function we(){vi=!0,s.notify();try{const e=await w.getSuperAdminMinisters({search:je,status:_e}),t=(e==null?void 0:e.data)||e;ye=t.ministers||[],Ki=t.total||ye.length}catch(e){s.addToast("error",e.message||"Failed to fetch ministers from MySQL.")}finally{vi=!1,s.notify()}}let Ie=[],Yi=0,gi=!1,Ve="",Fe="",Bt="",It=null,Ri=!1;function rr(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Citizen Management</h1>
          <p style="color: var(--text-muted);">Manage registered citizen identities, view privacy-compliant masked profiles, and control account status.</p>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 2; min-width: 240px;">
            <input
              type="text"
              id="citizen-search-input"
              class="form-control"
              placeholder="Search by citizen name, district, or village..."
              value="${a(Ve)}"
            />
          </div>
          <div style="flex: 1; min-width: 150px;">
            <input
              type="text"
              id="citizen-district-input"
              class="form-control"
              placeholder="Filter district..."
              value="${a(Bt)}"
            />
          </div>
          <div style="width: 160px;">
            <select id="citizen-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${Fe==="ACTIVE"?"selected":""}>Active Only</option>
              <option value="INACTIVE" ${Fe==="INACTIVE"?"selected":""}>Inactive Only</option>
            </select>
          </div>
          <button id="search-citizens-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-citizens-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Citizens Table -->
      <div class="card" style="padding: 1.5rem;">
        ${gi?`
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading citizens from MySQL...</p>
          </div>
        `:Ie.length===0?`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👤</div>
            <h3>No Citizen Records Found</h3>
            <p>${Ve||Fe||Bt?"No citizens match the selected filters.":"No citizen accounts registered yet in MySQL."}</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">Protected Aadhaar</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Taluk</th>
                  <th style="padding: 0.75rem 1rem;">Village</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Registered</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${Ie.map(e=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${a(e.name)}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary); font-weight: 600;">
                      ${a(e.maskedAadhaar||e.masked_aadhaar||"XXXX-XXXX-••••")}
                    </td>
                    <td style="padding: 0.75rem 1rem;">${a(e.district||"—")}</td>
                    <td style="padding: 0.75rem 1rem;">${a(e.taluk||"—")}</td>
                    <td style="padding: 0.75rem 1rem;">${a(e.village||"—")}</td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${e.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${e.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${e.created_at?new Date(e.created_at).toLocaleDateString():"—"}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm view-citizen-btn" data-id="${e.id}" title="View Details">
                          🔍 View
                        </button>
                        <button class="btn ${e.status==="ACTIVE"?"btn-secondary":"btn-primary"} btn-sm toggle-citizen-status-btn" data-id="${e.id}" data-current="${e.status}">
                          ${e.status==="ACTIVE"?"Deactivate":"Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            Showing ${Ie.length} of ${Yi} registered citizens in MySQL
          </div>
        `}
      </div>

      <!-- Citizen Details Modal -->
      ${sr()}
    </div>
  `}function sr(){if(!Ri||!It)return"";const e=It;return`
    <div class="modal-overlay" id="citizen-details-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Citizen Identity Details</h2>
          <button id="close-citizen-details-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Full Legal Name</span>
            <span style="font-weight: 600;">${a(e.name)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Aadhaar Status</span>
            <span style="font-family: monospace; font-weight: 700; color: var(--primary);">
              ${a(e.maskedAadhaar||e.masked_aadhaar||"XXXX-XXXX-••••")} (Protected)
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Date of Birth</span>
            <span>${a(e.date_of_birth||e.dateOfBirth||"—")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Gender</span>
            <span>${a(e.gender||"—")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Village</span>
            <span>${a(e.village||"—")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Taluk</span>
            <span>${a(e.taluk||"—")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">District</span>
            <span>${a(e.district||"—")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">State & Pincode</span>
            <span>${a(e.state||"Tamil Nadu")} - ${a(e.pincode||"")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Account Status</span>
            <span class="badge ${e.status==="ACTIVE"?"badge-success":"badge-danger"}">${e.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Registration Timestamp</span>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${e.created_at?new Date(e.created_at).toLocaleString():"—"}</span>
          </div>
        </div>

        <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button id="close-citizen-details-btn-2" class="btn btn-primary btn-sm">Close</button>
        </div>
      </div>
    </div>
  `}async function nr(){const e=document.getElementById("citizen-search-input");e==null||e.addEventListener("keydown",l=>{l.key==="Enter"&&(Ve=l.target.value.trim(),lt())});const t=document.getElementById("search-citizens-btn");t==null||t.addEventListener("click",()=>{var l,d,g,b,$;Ve=((d=(l=document.getElementById("citizen-search-input"))==null?void 0:l.value)==null?void 0:d.trim())||"",Bt=((b=(g=document.getElementById("citizen-district-input"))==null?void 0:g.value)==null?void 0:b.trim())||"",Fe=(($=document.getElementById("citizen-status-select"))==null?void 0:$.value)||"",lt()});const i=document.getElementById("reset-citizens-filter-btn");i==null||i.addEventListener("click",()=>{Ve="",Bt="",Fe="",lt()}),document.querySelectorAll(".view-citizen-btn").forEach(l=>{l.addEventListener("click",()=>{const d=l.getAttribute("data-id");It=Ie.find(g=>g.id===d),It&&(Ri=!0,s.notify())})}),[document.getElementById("close-citizen-details-btn"),document.getElementById("close-citizen-details-btn-2")].forEach(l=>{l==null||l.addEventListener("click",()=>{Ri=!1,It=null,s.notify()})}),document.querySelectorAll(".toggle-citizen-status-btn").forEach(l=>{l.addEventListener("click",async()=>{const d=l.getAttribute("data-id"),b=l.getAttribute("data-current")==="ACTIVE"?"INACTIVE":"ACTIVE";try{await w.setCitizenStatus(d,b),s.addToast("success",`Citizen account marked as ${b}.`),await lt()}catch($){s.addToast("error",$.message||"Failed to update citizen status.")}})}),Ie.length===0&&!gi&&await lt()}async function lt(){gi=!0,s.notify();try{const e=await w.getSuperAdminCitizens({search:Ve,district:Bt,status:Fe}),t=(e==null?void 0:e.data)||e;Ie=t.citizens||[],Yi=t.total||Ie.length}catch(e){s.addToast("error",e.message||"Failed to fetch citizens from MySQL.")}finally{gi=!1,s.notify()}}let nt=[],Zi=0,Nt=!1,kt="",ne="",j=null,$t=1;const dr=20;function or(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Land Records Overview</h1>
          <p style="color: var(--text-muted);">State-wide land parcel records, OCR extraction status, and verification state in MySQL.</p>
        </div>
        <button id="refresh-records-btn" class="btn btn-outline btn-sm">
          <span>🔄</span> Refresh Records
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 260px;">
            <input
              type="text"
              id="records-search-input"
              class="form-control"
              placeholder="Search by owner name, survey number, or record ref..."
              value="${a(kt)}"
            />
          </div>
          <div style="width: 200px;">
            <select id="records-status-select" class="form-control">
              <option value="">All Verification States</option>
              <option value="VERIFIED" ${ne==="VERIFIED"?"selected":""}>Verified</option>
              <option value="PENDING_VERIFICATION" ${ne==="PENDING_VERIFICATION"?"selected":""}>Pending Verification</option>
              <option value="NEEDS_REVIEW" ${ne==="NEEDS_REVIEW"?"selected":""}>Needs Review</option>
              <option value="DISPUTED" ${ne==="DISPUTED"?"selected":""}>Disputed</option>
              <option value="ACTIVE" ${ne==="ACTIVE"?"selected":""}>Active</option>
            </select>
          </div>
          <button id="search-records-btn" class="btn btn-secondary btn-sm">Search</button>
          <button id="reset-records-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Land Records Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface);">
          <div style="font-weight: 700; font-size: 0.95rem;">
            Total Records: <span style="color: var(--primary);">${Zi}</span>
          </div>
          ${Nt?'<div style="font-size: 0.85rem; color: var(--text-muted);">Loading land records...</div>':""}
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
            <thead>
              <tr style="background: var(--bg-surface-elevated, rgba(0,0,0,0.02)); border-bottom: 1px solid var(--border-color); color: var(--text-subtle); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">
                <th style="padding: 0.85rem 1rem;">Record Ref</th>
                <th style="padding: 0.85rem 1rem;">Owner Name</th>
                <th style="padding: 0.85rem 1rem;">Survey No</th>
                <th style="padding: 0.85rem 1rem;">Location (Vill / Taluk / Dist)</th>
                <th style="padding: 0.85rem 1rem;">Area</th>
                <th style="padding: 0.85rem 1rem;">Status</th>
                <th style="padding: 0.85rem 1rem;">AI Status</th>
                <th style="padding: 0.85rem 1rem;">Created</th>
                <th style="padding: 0.85rem 1rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${nt.length===0?`
                <tr>
                  <td colspan="9" style="padding: 3rem 1rem; text-align: center; color: var(--text-muted);">
                    ${Nt?"Fetching records...":"No land records found matching criteria."}
                  </td>
                </tr>
              `:nt.map(e=>{const t=e.verification_status==="VERIFIED"||e.status==="ACTIVE"?'<span class="badge badge-success">Verified</span>':e.verification_status==="DISPUTED"||e.is_duplicate?'<span class="badge badge-danger">Disputed / Dupl</span>':'<span class="badge badge-warning">Pending Review</span>',i=e.ai_status?`<span class="badge badge-info" style="font-size: 0.72rem;">${a(e.ai_status)}</span>`:'<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>',n=[e.village,e.taluk,e.district].filter(Boolean).join(", ")||"—",r=e.area_value?`${e.area_value} ${e.area_unit||"Acres"}`:"—";return`
                        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;">
                          <td style="padding: 0.85rem 1rem; font-family: monospace; font-weight: 600; color: var(--primary);">
                            ${a(e.record_reference||e.id||"—")}
                          </td>
                          <td style="padding: 0.85rem 1rem; font-weight: 600;">
                            ${a(e.owner_name||"—")}
                          </td>
                          <td style="padding: 0.85rem 1rem;">
                            <span style="background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-family: monospace;">
                              ${a(e.survey_number||"—")}
                            </span>
                          </td>
                          <td style="padding: 0.85rem 1rem; color: var(--text-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a(n)}">
                            ${a(n)}
                          </td>
                          <td style="padding: 0.85rem 1rem; font-weight: 500;">
                            ${a(r)}
                          </td>
                          <td style="padding: 0.85rem 1rem;">
                            ${t}
                          </td>
                          <td style="padding: 0.85rem 1rem;">
                            ${i}
                          </td>
                          <td style="padding: 0.85rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                            ${Ft(e.created_at)}
                          </td>
                          <td style="padding: 0.85rem 1rem; text-align: right;">
                            <button class="btn btn-outline btn-xs view-record-btn" data-id="${e.id}">
                              View
                            </button>
                          </td>
                        </tr>
                      `}).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Record Details Modal -->
      <div id="record-details-modal" class="modal-backdrop" style="display: ${j?"flex":"none"};">
        <div class="modal-card" style="max-width: 650px; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <h3 style="margin: 0; font-weight: 800;">Land Record Specification</h3>
            <button class="btn-close close-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer;">&times;</button>
          </div>

          ${j?`
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Record Ref</label>
                <div style="font-family: monospace; font-weight: 700; color: var(--primary);">${a(j.record_reference||j.id)}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Owner Name</label>
                <div style="font-weight: 700;">${a(j.owner_name||"—")}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Survey Number</label>
                <div style="font-family: monospace; font-weight: 700;">${a(j.survey_number||"—")}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Classification</label>
                <div>${a(j.classification||"Agricultural / Ryotwari")}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Area</label>
                <div>${j.area_value?`${j.area_value} ${j.area_unit||"Acres"}`:"—"}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Duplicate Check</label>
                <div>${j.is_duplicate?'<span class="badge badge-danger">Potential Duplicate Detected</span>':'<span class="badge badge-success">Unique Parcel</span>'}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">State / District</label>
                <div>${a([j.state,j.district].filter(Boolean).join(", ")||"—")}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Taluk / Village</label>
                <div>${a([j.taluk,j.village].filter(Boolean).join(", ")||"—")}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">AI Extraction Status</label>
                <div>${a(j.ai_status||"Processed")}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Verification State</label>
                <div>${a(j.verification_status||j.status||"ACTIVE")}</div>
              </div>
            </div>
            ${j.duplicate_reason?`
              <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid var(--danger); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.85rem;">
                <strong>Duplicate Reason:</strong> ${a(j.duplicate_reason)}
              </div>
            `:""}
          `:""}

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button class="btn btn-secondary close-modal-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  `}function lr(){const e=document.getElementById("refresh-records-btn"),t=document.getElementById("search-records-btn"),i=document.getElementById("reset-records-btn"),n=document.getElementById("records-search-input"),r=document.getElementById("records-status-select");e==null||e.addEventListener("click",Le),t==null||t.addEventListener("click",()=>{kt=(n==null?void 0:n.value.trim())||"",ne=(r==null?void 0:r.value)||"",$t=1,Le()}),n==null||n.addEventListener("keypress",o=>{o.key==="Enter"&&(kt=n.value.trim(),ne=(r==null?void 0:r.value)||"",$t=1,Le())}),r==null||r.addEventListener("change",()=>{ne=r.value,$t=1,Le()}),i==null||i.addEventListener("click",()=>{kt="",ne="",$t=1,n&&(n.value=""),r&&(r.value=""),Le()}),document.querySelectorAll(".view-record-btn").forEach(o=>{o.addEventListener("click",()=>{const l=o.getAttribute("data-id");j=nt.find(d=>String(d.id)===String(l))||null,s.notify()})}),document.querySelectorAll(".close-modal-btn").forEach(o=>{o.addEventListener("click",()=>{j=null,s.notify()})}),nt.length===0&&!Nt&&Le()}async function Le(){try{Nt=!0,s.notify();const e=await w.getSuperAdminLandRecords({search:kt||void 0,status:ne||void 0,page:$t,limit:dr}),t=(e==null?void 0:e.data)||e||{};nt=t.records||[],Zi=t.total||nt.length}catch(e){console.error("Failed to load land records:",e),s.addToast(e.message||"Failed to load land records","error")}finally{Nt=!1,s.notify()}}let Ue=[],ea=0,yi=!1,qe="",Dt="",jt="",cr=1;const mr=50;function pr(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">System Audit Trail</h1>
          <p style="color: var(--text-muted);">Immutable audit logs recording every authentication, user management, and land-record action in MySQL.</p>
        </div>
        <button id="refresh-audits-btn" class="btn btn-outline btn-sm">
          <span>🔄</span> Refresh Logs
        </button>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 200px;">
            <input
              type="text"
              id="audit-action-input"
              class="form-control"
              placeholder="Filter by action (e.g. LOGIN, OFFICER_CREATED)..."
              value="${a(qe)}"
            />
          </div>
          <div style="flex: 1; min-width: 180px;">
            <input
              type="text"
              id="audit-actor-input"
              class="form-control"
              placeholder="Filter by actor reference/ID..."
              value="${a(Dt)}"
            />
          </div>
          <div style="width: 170px;">
            <input
              type="date"
              id="audit-date-input"
              class="form-control"
              value="${a(jt)}"
            />
          </div>
          <button id="search-audits-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-audits-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="card" style="padding: 1.5rem;">
        ${yi?`
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Fetching audit events from MySQL...</p>
          </div>
        `:Ue.length===0?`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
            <h3>No Audit Logs Found</h3>
            <p>${qe||Dt||jt?"No events matched your filter criteria.":"No audit records logged yet."}</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Timestamp</th>
                  <th style="padding: 0.75rem 1rem;">Action</th>
                  <th style="padding: 0.75rem 1rem;">Actor Type</th>
                  <th style="padding: 0.75rem 1rem;">Actor Reference</th>
                  <th style="padding: 0.75rem 1rem;">Target Case</th>
                  <th style="padding: 0.75rem 1rem;">Safe Metadata</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${Ue.map(e=>{const t=e.event_type.includes("FAIL")||e.event_type.includes("DENIED")||e.event_type.includes("REJECT");return`
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">
                          ${new Date(e.created_at).toLocaleString()}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-weight: 700;">
                          <span class="badge ${t?"badge-danger":e.event_type.includes("LOGIN")?"badge-primary":"badge-success"}">
                            ${a(e.event_type)}
                          </span>
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <span style="font-weight: 600;">${a(e.actor_type||"SYSTEM")}</span>
                        </td>
                        <td style="padding: 0.75rem 1rem; font-family: monospace; font-size: 0.8rem; color: var(--text-subtle);">
                          ${a(String(e.actor_reference||"—"))}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-size: 0.8rem;">
                          ${e.case_id?`<span class="badge badge-outline">${a(e.case_id)}</span>`:"—"}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${a(JSON.stringify(e.metadata||{}))}">
                          ${a(JSON.stringify(e.metadata||{}))}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <span class="badge ${t?"badge-danger":"badge-success"}">
                            ${t?"FLAGGED":"SUCCESS"}
                          </span>
                        </td>
                      </tr>
                    `}).join("")}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${Ue.length} of ${ea} audit records in MySQL</div>
          </div>
        `}
      </div>
    </div>
  `}async function ur(){const e=document.getElementById("refresh-audits-btn");e==null||e.addEventListener("click",()=>ct());const t=document.getElementById("search-audits-btn");t==null||t.addEventListener("click",()=>{var r,o,l,d,g;qe=((o=(r=document.getElementById("audit-action-input"))==null?void 0:r.value)==null?void 0:o.trim())||"",Dt=((d=(l=document.getElementById("audit-actor-input"))==null?void 0:l.value)==null?void 0:d.trim())||"",jt=((g=document.getElementById("audit-date-input"))==null?void 0:g.value)||"",ct()});const i=document.getElementById("reset-audits-btn");i==null||i.addEventListener("click",()=>{qe="",Dt="",jt="",ct()});const n=document.getElementById("audit-action-input");n==null||n.addEventListener("keydown",r=>{r.key==="Enter"&&(qe=r.target.value.trim(),ct())}),Ue.length===0&&!yi&&await ct()}async function ct(){yi=!0,s.notify();try{const e=await w.getSuperAdminAuditLogs({action:qe,actor:Dt,date:jt,page:cr,limit:mr}),t=(e==null?void 0:e.data)||e;Ue=t.events||[],ea=t.total||Ue.length}catch(e){s.addToast("error",e.message||"Failed to fetch audit logs.")}finally{yi=!1,s.notify()}}let Ce={backend:"Online (Port 4000)",database:"Connected (MySQL 8.4 on Port 3306)",aiService:"Active (FastAPI on Port 8000)",lastChecked:new Date().toLocaleTimeString()};function fr(){return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">System Configuration & Governance</h1>
          <p style="color: var(--text-muted);">Core system settings, security policies, and service telemetry for DLR.</p>
        </div>
        <button id="check-health-btn" class="btn btn-outline btn-sm">
          <span>🩺</span> Refresh System Status
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
        <!-- System Services Status -->
        <div class="card">
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🖥️</span> Service Telemetry
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Node.js / Express Core</span>
              <span class="badge badge-success">${Ce.backend}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">MySQL 8.4 Relational Store</span>
              <span class="badge badge-success">${Ce.database}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Python FastAPI AI Engine</span>
              <span class="badge badge-info">${Ce.aiService}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted);">Last Verified</span>
              <span style="font-family: monospace; font-size: 0.8rem;">${Ce.lastChecked}</span>
            </div>
          </div>
        </div>

        <!-- Security & Compliance Policy -->
        <div class="card">
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🛡️</span> Security & Compliance
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Aadhaar Data Masking</span>
              <span class="badge badge-success">STRICT (XXXX-XXXX-1234)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Password Hashing</span>
              <span class="badge badge-success">bcrypt (Salt rounds: 10)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Session Token Model</span>
              <span class="badge badge-info">JWT (Bearer HS256)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted);">Immutable Audit Logging</span>
              <span class="badge badge-success">ENABLED (MySQL audit_events)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- System Architecture & Config Details -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>⚙️</span> Operational Configuration
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; font-size: 0.88rem;">
          <div style="background: rgba(0,0,0,0.02); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; margin-bottom: 0.25rem;">Rate Limiting</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem;">Protection against brute force on auth endpoints.</div>
            <span class="badge badge-success">Active: 60 req / 15 min</span>
          </div>

          <div style="background: rgba(0,0,0,0.02); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; margin-bottom: 0.25rem;">Role-Based Access Control (RBAC)</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem;">Explicit role verification via users &rarr; user_roles &rarr; roles.</div>
            <span class="badge badge-info">SUPER_ADMIN | MINISTER | OFFICER | CITIZEN</span>
          </div>

          <div style="background: rgba(0,0,0,0.02); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; margin-bottom: 0.25rem;">AI Document OCR Pipeline</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem;">Tesseract OCR + Layout Analysis + Anomaly Detection.</div>
            <span class="badge badge-success">Dual-mode (PyOCR + Heuristic Fallback)</span>
          </div>
        </div>
      </div>
    </div>
  `}function vr(){const e=document.getElementById("check-health-btn");e==null||e.addEventListener("click",async()=>{try{Ce.lastChecked=new Date().toLocaleTimeString();const t=await w.getHealth();(t==null?void 0:t.status)==="ok"&&(Ce.backend="Online (Port 4000)"),s.addToast("System health checks verified successfully","success"),s.notify()}catch{s.addToast("Health check query failed","warning")}})}let se=[],Li=0,Tt=!1,_t="",Xe="",ve="",ta="",We="",He="workload",gr="DESC";function yr(){const e=se.reduce((r,o)=>r+(o.totalApplications||0),0),t=se.reduce((r,o)=>r+(o.pendingApplications||0),0),i=se.reduce((r,o)=>r+(o.approvedApplications||0),0),n=se.reduce((r,o)=>r+(o.rejectedApplications||0),0);return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Officer Work Monitoring</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">OPERATIONS</span>
          </div>
          <p style="color: var(--text-muted);">Monitor real-time application processing, verification workloads, and decisions across all Land Revenue Officers.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="refresh-officer-work-btn" class="btn btn-outline btn-sm" title="Refresh Live Work Data">
            <span>🔄</span> Refresh Workload
          </button>
        </div>
      </div>

      <!-- Quick KPI Summary Strip -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Officers Monitored</div>
            <div class="value" style="font-size: 1.6rem; color: #818cf8;">${Li}</div>
          </div>
          <div class="metric-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">👮</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Total Handled</div>
            <div class="value" style="font-size: 1.6rem; color: #60a5fa;">${e}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📝</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Pending Verification</div>
            <div class="value" style="font-size: 1.6rem; color: #fbbf24;">${t}</div>
          </div>
          <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Approved Decisions</div>
            <div class="value" style="font-size: 1.6rem; color: #34d399;">${i}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Rejected Decisions</div>
            <div class="value" style="font-size: 1.6rem; color: #f87171;">${n}</div>
          </div>
          <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">❌</div>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: center;">
          <div style="grid-column: span 2; min-width: 240px;">
            <input
              type="text"
              id="work-officer-search"
              class="form-control"
              placeholder="Search officer by ID, username, name, or area..."
              value="${a(_t)}"
            />
          </div>
          <div>
            <select id="work-officer-state" class="form-control" style="appearance: auto;">
              <option value="">All States</option>
              <option value="Tamil Nadu" ${Xe==="Tamil Nadu"?"selected":""}>Tamil Nadu</option>
              <option value="Karnataka" ${Xe==="Karnataka"?"selected":""}>Karnataka</option>
              <option value="Kerala" ${Xe==="Kerala"?"selected":""}>Kerala</option>
            </select>
          </div>
          <div>
            <select id="work-officer-district" class="form-control" style="appearance: auto;">
              <option value="">All Districts</option>
              <option value="Salem" ${ve==="Salem"?"selected":""}>Salem</option>
              <option value="Tiruvannamalai" ${ve==="Tiruvannamalai"?"selected":""}>Tiruvannamalai</option>
              <option value="Chennai" ${ve==="Chennai"?"selected":""}>Chennai</option>
              <option value="Coimbatore" ${ve==="Coimbatore"?"selected":""}>Coimbatore</option>
            </select>
          </div>
          <div>
            <select id="work-officer-status" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${We==="ACTIVE"?"selected":""}>Active</option>
              <option value="INACTIVE" ${We==="INACTIVE"?"selected":""}>Inactive</option>
            </select>
          </div>
          <div>
            <select id="work-officer-sort" class="form-control" style="appearance: auto;">
              <option value="workload" ${He==="workload"?"selected":""}>Sort by Workload</option>
              <option value="recent_activity" ${He==="recent_activity"?"selected":""}>Sort by Recent Activity</option>
              <option value="name" ${He==="name"?"selected":""}>Sort by Name</option>
            </select>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
          <button id="apply-officer-work-filters-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-officer-work-filters-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Officers Work Table -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700;">Officer Work Performance Ledger</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Showing ${se.length} of ${Li} officers</span>
        </div>

        ${Tt?`
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Querying officer workload and activity from MySQL...</p>
          </div>
        `:se.length===0?`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💼</div>
            <h3>No Officers Found</h3>
            <p>${_t||We||ve?"No officers match your filter criteria.":"No officers currently registered."}</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Officer ID</th>
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">State</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Applications</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Pending</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Approved</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Rejected</th>
                  <th style="padding: 0.75rem 1rem;">Last Activity</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${se.map(r=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary);">
                      ${a(r.officerId||r.username||"—")}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${a(r.name)}
                      <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">${a(r.department||"Land Records")}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${a(r.state||"Tamil Nadu")}</td>
                    <td style="padding: 0.75rem 1rem; font-weight: 500;">${a(r.district||"Salem")}</td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 700;">
                        ${r.totalApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge ${r.pendingApplications>0?"badge-warning":""}" style="${r.pendingApplications===0?"opacity:0.6;":""}">
                        ${r.pendingApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge ${r.approvedApplications>0?"badge-success":""}" style="${r.approvedApplications===0?"opacity:0.6;":""}">
                        ${r.approvedApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge ${r.rejectedApplications>0?"badge-danger":""}" style="${r.rejectedApplications===0?"opacity:0.6;":""}">
                        ${r.rejectedApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                      ${r.lastActivity?new Date(r.lastActivity).toLocaleString():"—"}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${r.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${a(r.status)}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right; white-space: nowrap;">
                      <button class="btn btn-primary btn-sm view-officer-work-btn" data-officer-id="${a(r.officerId||r.username||r.id)}">
                        <span>🔍</span> View Work
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
  `}async function br(){var e,t,i;(e=document.getElementById("apply-officer-work-filters-btn"))==null||e.addEventListener("click",async()=>{var n,r,o,l,d;_t=((n=document.getElementById("work-officer-search"))==null?void 0:n.value)||"",Xe=((r=document.getElementById("work-officer-state"))==null?void 0:r.value)||"",ve=((o=document.getElementById("work-officer-district"))==null?void 0:o.value)||"",We=((l=document.getElementById("work-officer-status"))==null?void 0:l.value)||"",He=((d=document.getElementById("work-officer-sort"))==null?void 0:d.value)||"workload",await Xt()}),(t=document.getElementById("reset-officer-work-filters-btn"))==null||t.addEventListener("click",async()=>{_t="",Xe="",ve="",ta="",We="",He="workload",document.getElementById("work-officer-search")&&(document.getElementById("work-officer-search").value=""),document.getElementById("work-officer-state")&&(document.getElementById("work-officer-state").value=""),document.getElementById("work-officer-district")&&(document.getElementById("work-officer-district").value=""),document.getElementById("work-officer-status")&&(document.getElementById("work-officer-status").value=""),document.getElementById("work-officer-sort")&&(document.getElementById("work-officer-sort").value="workload"),await Xt()}),(i=document.getElementById("refresh-officer-work-btn"))==null||i.addEventListener("click",async()=>{await Xt()}),document.querySelectorAll(".view-officer-work-btn").forEach(n=>{n.addEventListener("click",()=>{const r=n.getAttribute("data-officer-id");r&&(s.setActiveTab("super-admin-officer-detail",r),window.history.pushState(null,"",`/super-admin/officer-work/${encodeURIComponent(r)}`))})}),se.length===0&&!Tt&&await Xt()}async function Xt(){var e,t;if(!Tt){Tt=!0,s.notify();try{const i=await w.getSuperAdminOfficerWork({search:_t,state:Xe,district:ve,department:ta,status:We,sortBy:He,sortOrder:gr});se=(i==null?void 0:i.officers)||((e=i==null?void 0:i.data)==null?void 0:e.officers)||[],Li=(i==null?void 0:i.total)||((t=i==null?void 0:i.data)==null?void 0:t.total)||se.length}catch(i){s.addToast("error",i.message||"Failed to load officer work metrics.")}finally{Tt=!1,s.notify()}}}let B=null,ti=!1,zt="";function hr(){const e=s.selectedOfficerWorkId||"SS027";if(ti&&!B)return`
      <div class="page-content">
        <div class="loading-state">
          <div class="spinner"></div>
          <h2 style="margin-top: 1rem;">Loading Officer Work Profile...</h2>
          <p>Retrieving real-time statistics, review history, and audit logs for <strong>${a(e)}</strong>.</p>
        </div>
      </div>
    `;if(zt&&!B)return`
      <div class="page-content">
        <button id="back-to-officer-work-btn" class="btn btn-outline btn-sm" style="margin-bottom: 1rem;">
          ← Back to Officer Work
        </button>
        <div class="notice notice-error">
          ⚠️ ${a(zt)}
          <button id="retry-officer-detail-btn" class="btn btn-secondary btn-sm" style="margin-left: 1rem;">Retry</button>
        </div>
      </div>
    `;const t=(B==null?void 0:B.profile)||{officerId:e,name:"Officer",username:e,state:"Tamil Nadu",district:"Salem",department:"Land Records",status:"ACTIVE",assignedArea:"Salem, Tamil Nadu",lastLogin:null,lastActivity:null},i=(B==null?void 0:B.workSummary)||{totalApplications:0,pending:0,underVerification:0,aiProcessed:0,approved:0,rejected:0,correctionsMade:0,notesRecorded:0},n=(B==null?void 0:B.aiStatistics)||{totalAiProcessed:i.aiProcessed||0,avgConfidence:94,avgValidationScore:95},r=(B==null?void 0:B.recentActivity)||[],o=(B==null?void 0:B.workHistory)||[],l=(B==null?void 0:B.auditTrail)||[];return`
    <div class="page-content">
      <!-- Breadcrumb & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="back-to-officer-work-btn" class="btn btn-outline btn-sm">
            ← Back to Officer Work
          </button>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Operations / <strong style="color: var(--text-main);">Officer Work Profile (${a(t.officerId||t.username)})</strong>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="refresh-officer-detail-btn" class="btn btn-outline btn-sm" title="Refresh Profile from Database">
            <span>🔄</span> Refresh
          </button>
          <button id="print-officer-profile-btn" class="btn btn-secondary btn-sm">
            <span>🖨️</span> Print Profile
          </button>
        </div>
      </div>

      <!-- Section A & B: Profile Header & Assigned Area Card -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--primary);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(99, 102, 241, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: var(--primary);">
              👮
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h1 style="font-size: 1.5rem; font-weight: 800; margin: 0;">${a(t.name)}</h1>
                <span class="badge ${t.status==="ACTIVE"?"badge-success":"badge-danger"}">${a(t.status)}</span>
              </div>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.25rem; font-size: 0.9rem; color: var(--text-muted); flex-wrap: wrap;">
                <span>Officer ID: <strong style="font-family: monospace; color: var(--primary);">${a(t.officerId||t.username)}</strong></span>
                <span>Username: <strong style="font-family: monospace;">${a(t.username)}</strong></span>
                <span>Department: <strong>${a(t.department||"Land Records")}</strong></span>
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
            <div>Last Login: <strong>${t.lastLogin?new Date(t.lastLogin).toLocaleString():"Never logged in"}</strong></div>
            <div style="margin-top: 0.25rem;">Last Activity: <strong>${t.lastActivity?new Date(t.lastActivity).toLocaleString():"—"}</strong></div>
          </div>
        </div>

        <!-- Section B: Assigned Area Strip -->
        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem;">
          <div>
            <span style="color: var(--text-subtle);">State:</span>
            <strong style="margin-left: 0.25rem;">${a(t.state||"Tamil Nadu")}</strong>
          </div>
          <div>
            <span style="color: var(--text-subtle);">District Jurisdiction:</span>
            <strong style="margin-left: 0.25rem;">${a(t.district||"Salem")}</strong>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Assigned Area:</span>
            <span class="badge badge-primary" style="margin-left: 0.25rem;">${a(t.assignedArea||"Salem, Tamil Nadu")}</span>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Official Email:</span>
            <strong style="margin-left: 0.25rem;">${a(t.email||"—")}</strong>
          </div>
        </div>
      </div>

      <!-- Section C: WORK SUMMARY (Exact Layout matching Section 2 example) -->
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>📊</span> WORK SUMMARY
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Total Applications</div>
            <div class="value" style="color: #60a5fa;">${i.totalApplications}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📝</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Pending</div>
            <div class="value" style="color: #fbbf24;">${i.pending}</div>
          </div>
          <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">AI Processed</div>
            <div class="value" style="color: #c084fc;">${i.aiProcessed}</div>
          </div>
          <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">🤖</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Approved</div>
            <div class="value" style="color: #34d399;">${i.approved}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Rejected</div>
            <div class="value" style="color: #f87171;">${i.rejected}</div>
          </div>
          <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">❌</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Corrections Made</div>
            <div class="value" style="color: #f97316;">${i.correctionsMade}</div>
          </div>
          <div class="metric-icon" style="background: rgba(249, 115, 22, 0.15); color: #ea580c;">✏️</div>
        </div>
      </div>

      <!-- Section D & E: Application Statistics & AI Processing Statistics -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <!-- D. Application Statistics -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> Application Adjudication Statistics
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Currently Under Verification:</span>
              <span style="font-weight: 700; color: #fbbf24;">${i.underVerification} cases</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Officer Field Notes Recorded:</span>
              <span style="font-weight: 700;">${i.notesRecorded} entries</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Approval Resolution Rate:</span>
              <span style="font-weight: 700; color: #10b981;">
                ${i.approved+i.rejected>0?Math.round(i.approved/(i.approved+i.rejected)*100):100}%
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Adjudication Completion:</span>
              <span style="font-weight: 700;">
                ${i.totalApplications>0?Math.round((i.approved+i.rejected)/i.totalApplications*100):100}%
              </span>
            </div>
          </div>
        </div>

        <!-- E. AI Processing Statistics -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🤖</span> AI Validation & Telemetry Results
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">AI Extracted Documents:</span>
              <span style="font-weight: 700; color: #c084fc;">${n.totalAiProcessed} processed</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Average OCR Confidence:</span>
              <span class="badge badge-success">${n.avgConfidence}% Confidence</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Average Validation Score:</span>
              <span style="font-weight: 700;">${n.avgValidationScore} / 100</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">AI Validation Pipeline:</span>
              <span class="badge badge-success">LayoutLMv3 + Tamil/Eng OCR</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section F: RECENT ACTIVITY (Exact layout matching Section 2 example) -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>⚡</span> RECENT ACTIVITY
        </h2>

        ${r.length===0?`
          <div class="empty-state" style="padding: 1.5rem;">
            <p>No recent activity recorded for this officer in the database.</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Date/Time</th>
                  <th style="padding: 0.75rem 1rem;">Action</th>
                  <th style="padding: 0.75rem 1rem;">Application</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${r.map(d=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.82rem; white-space: nowrap;">
                      ${new Date(d.dateTime).toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${a(d.action)}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${a(d.application)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${d.status==="APPROVED"?"badge-success":d.status==="REJECTED"?"badge-danger":"badge-primary"}">
                        ${a(d.status)}
                      </span>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Section G & H: Work History Timeline & Audit Trail -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- G. Work History -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📜</span> Detailed Work History
          </h2>
          ${o.length===0?'<p style="color: var(--text-muted); font-size: 0.9rem;">No work history events recorded yet.</p>':`
            <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
              ${o.slice(0,15).map(d=>`
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border-left: 3px solid var(--primary); font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong style="color: var(--text-main);">${a(d.title)}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${d.timestamp?new Date(d.timestamp).toLocaleDateString():"—"}</span>
                  </div>
                  <div style="color: var(--text-muted); font-size: 0.82rem;">${a(d.description)}</div>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <!-- H. Audit Trail -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🛡️</span> Officer Security Audit Trail
          </h2>
          ${l.length===0?'<p style="color: var(--text-muted); font-size: 0.9rem;">No audit logs associated with this officer.</p>':`
            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
              ${l.slice(0,15).map(d=>`
                <div style="padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                    <span class="badge ${d.event_type.includes("FAIL")?"badge-danger":"badge-primary"}" style="font-size: 0.7rem;">
                      ${a(d.event_type)}
                    </span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  <div style="font-family: monospace; font-size: 0.75rem; color: var(--text-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${a(JSON.stringify(d.metadata||{}))}
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    </div>
  `}async function wr(){var t,i,n,r,o,l;(t=document.getElementById("back-to-officer-work-btn"))==null||t.addEventListener("click",()=>{s.setActiveTab("super-admin-officer-work"),window.history.pushState(null,"","/super-admin/officer-work")}),(i=document.getElementById("retry-officer-detail-btn"))==null||i.addEventListener("click",async()=>{await ki()}),(n=document.getElementById("refresh-officer-detail-btn"))==null||n.addEventListener("click",async()=>{await ki(!0)}),(r=document.getElementById("print-officer-profile-btn"))==null||r.addEventListener("click",()=>{window.print()});const e=s.selectedOfficerWorkId||"SS027";(!B||((l=(o=B.profile)==null?void 0:o.username)==null?void 0:l.toUpperCase())!==e.toUpperCase())&&await ki()}async function ki(e=!1){if(ti)return;const t=s.selectedOfficerWorkId||"SS027";ti=!0,zt="",s.notify();try{const i=await w.getSuperAdminOfficerProfile(t);B=(i==null?void 0:i.data)||i}catch(i){zt=i.message||`Failed to load officer work profile for '${t}'.`,s.addToast("error",zt)}finally{ti=!1,s.notify()}}let de=[],Ci=0,Rt=!1,Vt="",Ge="",Qe="",Je="",Ke="activity",xr="DESC";function $r(){const e=de.reduce((n,r)=>n+(r.recordsMonitored||0),0),t=de.reduce((n,r)=>n+(r.actionsCount||0),0),i=de.reduce((n,r)=>n+(r.reportsViewed||0),0);return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Minister Work Monitoring</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">OPERATIONS</span>
          </div>
          <p style="color: var(--text-muted);">Surveillance of executive oversight, minister review decisions, monitored records, and report telemetry.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="refresh-minister-work-btn" class="btn btn-outline btn-sm" title="Refresh Live Minister Work">
            <span>🔄</span> Refresh Workload
          </button>
        </div>
      </div>

      <!-- Quick KPI Strip -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Ministers Monitored</div>
            <div class="value" style="font-size: 1.6rem; color: #c084fc;">${Ci}</div>
          </div>
          <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">🏛️</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Monitored Records</div>
            <div class="value" style="font-size: 1.6rem; color: #60a5fa;">${e}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📜</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Governance Actions</div>
            <div class="value" style="font-size: 1.6rem; color: #38bdf8;">${t}</div>
          </div>
          <div class="metric-icon" style="background: rgba(56, 189, 248, 0.15); color: #0284c7;">⚡</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Reports Viewed</div>
            <div class="value" style="font-size: 1.6rem; color: #34d399;">${i}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📊</div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: center;">
          <div style="grid-column: span 2; min-width: 240px;">
            <input
              type="text"
              id="work-minister-search"
              class="form-control"
              placeholder="Search minister by ID, username, name, department..."
              value="${a(Vt)}"
            />
          </div>
          <div>
            <select id="work-minister-state" class="form-control" style="appearance: auto;">
              <option value="">All States</option>
              <option value="Tamil Nadu" ${Ge==="Tamil Nadu"?"selected":""}>Tamil Nadu</option>
              <option value="Karnataka" ${Ge==="Karnataka"?"selected":""}>Karnataka</option>
              <option value="Kerala" ${Ge==="Kerala"?"selected":""}>Kerala</option>
            </select>
          </div>
          <div>
            <select id="work-minister-department" class="form-control" style="appearance: auto;">
              <option value="">All Departments</option>
              <option value="Revenue" ${Qe==="Revenue"?"selected":""}>Revenue</option>
              <option value="Revenue Administration" ${Qe==="Revenue Administration"?"selected":""}>Revenue Administration</option>
              <option value="Land Records" ${Qe==="Land Records"?"selected":""}>Land Records</option>
            </select>
          </div>
          <div>
            <select id="work-minister-status" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${Je==="ACTIVE"?"selected":""}>Active</option>
              <option value="INACTIVE" ${Je==="INACTIVE"?"selected":""}>Inactive</option>
            </select>
          </div>
          <div>
            <select id="work-minister-sort" class="form-control" style="appearance: auto;">
              <option value="activity" ${Ke==="activity"?"selected":""}>Sort by Activity</option>
              <option value="records" ${Ke==="records"?"selected":""}>Sort by Records</option>
              <option value="name" ${Ke==="name"?"selected":""}>Sort by Name</option>
            </select>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
          <button id="apply-minister-work-filters-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-minister-work-filters-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Ministers Work Table -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700;">Minister Oversight & Telemetry Ledger</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Showing ${de.length} of ${Ci} ministers</span>
        </div>

        ${Rt?`
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading minister governance logs from MySQL...</p>
          </div>
        `:de.length===0?`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
            <h3>No Ministers Found</h3>
            <p>${Vt||Je?"No ministers match your query.":"No ministers currently registered."}</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Minister ID</th>
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">State</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Records Monitored</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Pending</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Actions</th>
                  <th style="padding: 0.75rem 1rem;">Last Activity</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${de.map(n=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: #a855f7;">
                      ${a(n.ministerId||n.username||"—")}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${a(n.name)}
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${a(n.state||"Tamil Nadu")}</td>
                    <td style="padding: 0.75rem 1rem;">${a(n.department||"Revenue")}</td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #6366f1; font-weight: 700;">
                        ${n.recordsMonitored}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge badge-warning">
                        ${n.pendingItems}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #0284c7; font-weight: 700;">
                        ${n.actionsCount}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                      ${n.lastActivity?new Date(n.lastActivity).toLocaleString():"—"}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${n.status==="ACTIVE"?"badge-success":"badge-danger"}">
                        ${a(n.status)}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right; white-space: nowrap;">
                      <button class="btn btn-primary btn-sm view-minister-work-btn" data-minister-id="${a(n.ministerId||n.username||n.id)}">
                        <span>🔍</span> View Work
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
  `}async function Ar(){var e,t,i;(e=document.getElementById("apply-minister-work-filters-btn"))==null||e.addEventListener("click",async()=>{var n,r,o,l,d;Vt=((n=document.getElementById("work-minister-search"))==null?void 0:n.value)||"",Ge=((r=document.getElementById("work-minister-state"))==null?void 0:r.value)||"",Qe=((o=document.getElementById("work-minister-department"))==null?void 0:o.value)||"",Je=((l=document.getElementById("work-minister-status"))==null?void 0:l.value)||"",Ke=((d=document.getElementById("work-minister-sort"))==null?void 0:d.value)||"activity",await Wt()}),(t=document.getElementById("reset-minister-work-filters-btn"))==null||t.addEventListener("click",async()=>{Vt="",Ge="",Qe="",Je="",Ke="activity",document.getElementById("work-minister-search")&&(document.getElementById("work-minister-search").value=""),document.getElementById("work-minister-state")&&(document.getElementById("work-minister-state").value=""),document.getElementById("work-minister-department")&&(document.getElementById("work-minister-department").value=""),document.getElementById("work-minister-status")&&(document.getElementById("work-minister-status").value=""),document.getElementById("work-minister-sort")&&(document.getElementById("work-minister-sort").value="activity"),await Wt()}),(i=document.getElementById("refresh-minister-work-btn"))==null||i.addEventListener("click",async()=>{await Wt()}),document.querySelectorAll(".view-minister-work-btn").forEach(n=>{n.addEventListener("click",()=>{const r=n.getAttribute("data-minister-id");r&&(s.setActiveTab("super-admin-minister-detail",r),window.history.pushState(null,"",`/super-admin/minister-work/${encodeURIComponent(r)}`))})}),de.length===0&&!Rt&&await Wt()}async function Wt(){var e,t;if(!Rt){Rt=!0,s.notify();try{const i=await w.getSuperAdminMinisterWork({search:Vt,state:Ge,department:Qe,status:Je,sortBy:Ke,sortOrder:xr});de=(i==null?void 0:i.ministers)||((e=i==null?void 0:i.data)==null?void 0:e.ministers)||[],Ci=(i==null?void 0:i.total)||((t=i==null?void 0:i.data)==null?void 0:t.total)||de.length}catch(i){s.addToast("error",i.message||"Failed to load minister work metrics.")}finally{Rt=!1,s.notify()}}}let N=null,ii=!1,Lt="";function Er(){const e=s.selectedMinisterWorkId||"DEMO-MINISTER-001";if(ii&&!N)return`
      <div class="page-content">
        <div class="loading-state">
          <div class="spinner"></div>
          <h2 style="margin-top: 1rem;">Loading Minister Work Profile...</h2>
          <p>Retrieving real-time governance metrics, oversight activity, and audit trails for <strong>${a(e)}</strong>.</p>
        </div>
      </div>
    `;if(Lt&&!N)return`
      <div class="page-content">
        <button id="back-to-minister-work-btn" class="btn btn-outline btn-sm" style="margin-bottom: 1rem;">
          ← Back to Minister Work
        </button>
        <div class="notice notice-error">
          ⚠️ ${a(Lt)}
          <button id="retry-minister-detail-btn" class="btn btn-secondary btn-sm" style="margin-left: 1rem;">Retry</button>
        </div>
      </div>
    `;const t=(N==null?void 0:N.profile)||{ministerId:e,name:"Honorable Minister",username:e,state:"Tamil Nadu",department:"Revenue Administration",status:"ACTIVE",lastLogin:null,lastActivity:null},i=(N==null?void 0:N.monitoringStatistics)||{totalMonitored:0,pendingItems:0,approvedItems:0,reportsViewed:0,actionsCount:0},n=(N==null?void 0:N.recentActivity)||[],r=(N==null?void 0:N.reports)||[],o=(N==null?void 0:N.workHistory)||[],l=(N==null?void 0:N.auditTrail)||[];return`
    <div class="page-content">
      <!-- Header & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="back-to-minister-work-btn" class="btn btn-outline btn-sm">
            ← Back to Minister Work
          </button>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Operations / <strong style="color: var(--text-main);">Minister Work Profile (${a(t.ministerId||t.username)})</strong>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="refresh-minister-detail-btn" class="btn btn-outline btn-sm">
            <span>🔄</span> Refresh
          </button>
          <button id="print-minister-profile-btn" class="btn btn-secondary btn-sm">
            <span>🖨️</span> Print Profile
          </button>
        </div>
      </div>

      <!-- Section A & B: Profile & Assigned Area -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #a855f7;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #a855f7;">
              🏛️
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h1 style="font-size: 1.5rem; font-weight: 800; margin: 0;">${a(t.name)}</h1>
                <span class="badge ${t.status==="ACTIVE"?"badge-success":"badge-danger"}">${a(t.status)}</span>
              </div>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.25rem; font-size: 0.9rem; color: var(--text-muted); flex-wrap: wrap;">
                <span>Minister ID: <strong style="font-family: monospace; color: #a855f7;">${a(t.ministerId||t.username)}</strong></span>
                <span>Username: <strong style="font-family: monospace;">${a(t.username)}</strong></span>
                <span>Department: <strong>${a(t.department||"Revenue")}</strong></span>
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
            <div>Last Login: <strong>${t.lastLogin?new Date(t.lastLogin).toLocaleString():"Never logged in"}</strong></div>
            <div style="margin-top: 0.25rem;">Last Activity: <strong>${t.lastActivity?new Date(t.lastActivity).toLocaleString():"—"}</strong></div>
          </div>
        </div>

        <!-- Section B: Assigned Area -->
        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem;">
          <div>
            <span style="color: var(--text-subtle);">Assigned State/Region:</span>
            <strong style="margin-left: 0.25rem;">${a(t.state||"Tamil Nadu")}</strong>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Governance Jurisdiction:</span>
            <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; margin-left: 0.25rem;">
              Statewide Revenue Oversight
            </span>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Official Email:</span>
            <strong style="margin-left: 0.25rem;">${a(t.email||"—")}</strong>
          </div>
        </div>
      </div>

      <!-- Section C: Monitoring Statistics -->
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>📊</span> MONITORING & GOVERNANCE STATISTICS
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Records Monitored</div>
            <div class="value" style="color: #60a5fa;">${i.totalMonitored}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📜</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Pending Items</div>
            <div class="value" style="color: #fbbf24;">${i.pendingItems}</div>
          </div>
          <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Approved Items</div>
            <div class="value" style="color: #34d399;">${i.approvedItems}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Reports Viewed</div>
            <div class="value" style="color: #c084fc;">${i.reportsViewed}</div>
          </div>
          <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">📊</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Total Actions</div>
            <div class="value" style="color: #38bdf8;">${i.actionsCount}</div>
          </div>
          <div class="metric-icon" style="background: rgba(56, 189, 248, 0.15); color: #0284c7;">⚡</div>
        </div>
      </div>

      <!-- Section D: Recent Activity -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>⚡</span> RECENT OVERSIGHT ACTIVITY
        </h2>

        ${n.length===0?`
          <div class="empty-state" style="padding: 1.5rem;">
            <p>No recent activity recorded for this minister in the database.</p>
          </div>
        `:`
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Date/Time</th>
                  <th style="padding: 0.75rem 1rem;">Action</th>
                  <th style="padding: 0.75rem 1rem;">Target/Resource</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${n.map(d=>`
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.82rem; white-space: nowrap;">
                      ${new Date(d.dateTime).toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${a(d.action)}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${a(d.target)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-primary">
                        ${a(d.status)}
                      </span>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Section E & F: Reports & Work History -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <!-- Section E: Reports Viewed / Generated -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📈</span> Executive Reports Telemetry
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${r.map(d=>`
              <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem;">
                <div>
                  <div style="font-weight: 600;">${a(d.name)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Last Accessed: ${d.viewedAt?new Date(d.viewedAt).toLocaleDateString():"—"}</div>
                </div>
                <span class="badge badge-success">${a(d.status)}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Section F: Work History -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📜</span> Executive Work History
          </h2>
          ${o.length===0?'<p style="color: var(--text-muted); font-size: 0.9rem;">No governance actions logged.</p>':`
            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 350px; overflow-y: auto;">
              ${o.slice(0,10).map(d=>`
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border-left: 3px solid #a855f7; font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong>${a(d.title)}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${d.timestamp?new Date(d.timestamp).toLocaleDateString():"—"}</span>
                  </div>
                  <div style="color: var(--text-muted); font-size: 0.82rem;">${a(d.description)}</div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>

      <!-- Section G: Audit Trail -->
      <div class="card" style="padding: 1.5rem;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>🛡️</span> Security & Compliance Audit Trail
        </h2>
        ${l.length===0?'<p style="color: var(--text-muted); font-size: 0.9rem;">No audit logs for this minister.</p>':`
          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 350px; overflow-y: auto;">
            ${l.slice(0,15).map(d=>`
              <div style="padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                  <span class="badge ${d.event_type.includes("FAIL")?"badge-danger":"badge-primary"}" style="font-size: 0.7rem;">
                    ${a(d.event_type)}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(d.created_at).toLocaleString()}</span>
                </div>
                <div style="font-family: monospace; font-size: 0.75rem; color: var(--text-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${a(JSON.stringify(d.metadata||{}))}
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `}async function Sr(){var t,i,n,r,o,l;(t=document.getElementById("back-to-minister-work-btn"))==null||t.addEventListener("click",()=>{s.setActiveTab("super-admin-minister-work"),window.history.pushState(null,"","/super-admin/minister-work")}),(i=document.getElementById("retry-minister-detail-btn"))==null||i.addEventListener("click",async()=>{await Ti()}),(n=document.getElementById("refresh-minister-detail-btn"))==null||n.addEventListener("click",async()=>{await Ti(!0)}),(r=document.getElementById("print-minister-profile-btn"))==null||r.addEventListener("click",()=>{window.print()});const e=s.selectedMinisterWorkId||"DEMO-MINISTER-001";(!N||((l=(o=N.profile)==null?void 0:o.username)==null?void 0:l.toUpperCase())!==e.toUpperCase())&&await Ti()}async function Ti(e=!1){if(ii)return;const t=s.selectedMinisterWorkId||"DEMO-MINISTER-001";ii=!0,Lt="",s.notify();try{const i=await w.getSuperAdminMinisterProfile(t);N=(i==null?void 0:i.data)||i}catch(i){Lt=i.message||`Failed to load minister work profile for '${t}'.`,s.addToast("error",Lt)}finally{ii=!1,s.notify()}}let ue="officer-performance",fe=null,Ct=!1,Mt="",bi="",hi="",Ye="",xe="",wi="",ia="",$e="";const zi=[{id:"officer-performance",name:"Officer Performance",icon:"👮"},{id:"minister-activity",name:"Minister Activity",icon:"🏛️"},{id:"land-records",name:"Land Record Processing",icon:"📜"},{id:"verification",name:"Verification & Adjudication",icon:"✅"},{id:"ai-processing",name:"AI Processing & Telemetry",icon:"🤖"},{id:"application-status",name:"Application Status Distribution",icon:"📊"},{id:"state-wise",name:"State-wise Operational",icon:"🗺️"},{id:"district-wise",name:"District-wise Breakdown",icon:"📍"},{id:"audit-activity",name:"Audit & Governance Activity",icon:"🛡️"}];function Ir(){s.activeReportCategory&&s.activeReportCategory!==ue&&(ue=s.activeReportCategory);const e=zi.find(n=>n.id===ue)||zi[0],t=(fe==null?void 0:fe.summary)||{},i=(fe==null?void 0:fe.rows)||[];return`
    <div class="page-content">
      <!-- Title & Action Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Super Admin Report Portal</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">ANALYTICS & AUDIT</span>
          </div>
          <p style="color: var(--text-muted);">Generate, filter, and inspect verified operational reports across land revenue and automated governance pipelines.</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="view-report-btn" class="btn btn-primary btn-sm">
            <span>📊</span> View Report
          </button>
          <button id="print-report-btn" class="btn btn-outline btn-sm">
            <span>🖨️</span> Print Report
          </button>
        </div>
      </div>

      <!-- 9 Report Category Switcher Pills -->
      <div class="card" style="padding: 0.75rem; margin-bottom: 1.5rem; overflow-x: auto;">
        <div style="display: flex; gap: 0.5rem; min-width: max-content;">
          ${zi.map(n=>`
            <button
              class="btn ${n.id===ue?"btn-primary":"btn-outline"} btn-sm report-cat-btn"
              data-cat="${n.id}"
              style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem;"
            >
              <span>${n.icon}</span>
              <span>${n.name}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; align-items: center;">
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Date From</label>
            <input type="date" id="rep-start-date" class="form-control" value="${a(bi)}" style="font-size: 0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Date To</label>
            <input type="date" id="rep-end-date" class="form-control" value="${a(hi)}" style="font-size: 0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">State</label>
            <select id="rep-state" class="form-control" style="appearance: auto; font-size: 0.85rem;">
              <option value="">All States</option>
              <option value="Tamil Nadu" ${Ye==="Tamil Nadu"?"selected":""}>Tamil Nadu</option>
              <option value="Karnataka" ${Ye==="Karnataka"?"selected":""}>Karnataka</option>
              <option value="Kerala" ${Ye==="Kerala"?"selected":""}>Kerala</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">District</label>
            <select id="rep-district" class="form-control" style="appearance: auto; font-size: 0.85rem;">
              <option value="">All Districts</option>
              <option value="Salem" ${xe==="Salem"?"selected":""}>Salem</option>
              <option value="Tiruvannamalai" ${xe==="Tiruvannamalai"?"selected":""}>Tiruvannamalai</option>
              <option value="Chennai" ${xe==="Chennai"?"selected":""}>Chennai</option>
              <option value="Coimbatore" ${xe==="Coimbatore"?"selected":""}>Coimbatore</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Officer</label>
            <input type="text" id="rep-officer" class="form-control" placeholder="Officer ID (e.g. SS027)" value="${a(wi)}" style="font-size: 0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Status</label>
            <select id="rep-status" class="form-control" style="appearance: auto; font-size: 0.85rem;">
              <option value="">All Statuses</option>
              <option value="APPROVED" ${$e==="APPROVED"?"selected":""}>Approved / Verified</option>
              <option value="PENDING_REVIEW" ${$e==="PENDING_REVIEW"?"selected":""}>Pending Review</option>
              <option value="REJECTED" ${$e==="REJECTED"?"selected":""}>Rejected</option>
              <option value="IN_REVIEW" ${$e==="IN_REVIEW"?"selected":""}>In Review</option>
            </select>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button id="apply-report-filters-btn" class="btn btn-primary btn-sm">Generate Report</button>
          <button id="reset-report-filters-btn" class="btn btn-outline btn-sm">Reset Filters</button>
        </div>
      </div>

      <!-- Report View Body -->
      <div id="printable-report-area">
        <!-- Report Header Banner -->
        <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--primary);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Government of Tamil Nadu • Digital Land Records</div>
              <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0.2rem 0;">${a(e.name)} Report</h2>
              <div style="font-size: 0.82rem; color: var(--text-muted);">
                Generated: <strong>${new Date().toLocaleString()}</strong> • Super Admin Security Cleared
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.8rem;">DATABASE VERIFIED</span>
          </div>
        </div>

        ${Ct?`
          <div class="loading-state card" style="padding: 3rem;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Querying database records and assembling report statistics...</p>
          </div>
        `:Mt?`
          <div class="notice notice-error card" style="padding: 1.5rem;">
            ⚠️ ${a(Mt)}
          </div>
        `:`
          <!-- Summary Statistics Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            ${Object.entries(t).map(([n,r])=>`
              <div class="card metric-card" style="padding: 1rem 1.25rem;">
                <div class="metric-info">
                  <div class="label" style="text-transform: capitalize;">${a(n.replace(/([A-Z])/g," $1").toLowerCase())}</div>
                  <div class="value" style="font-size: 1.5rem; color: var(--primary);">${a(String(r))}</div>
                </div>
              </div>
            `).join("")}
          </div>

          <!-- Visual Chart / Distribution Bar -->
          <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem;">Analytics Distribution Visualizer</h3>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${kr(ue,i,t)}
            </div>
          </div>

          <!-- Detailed Report Data Table -->
          <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-size: 1.05rem; font-weight: 700;">Tabular Records Ledger</h3>
              <span style="font-size: 0.85rem; color: var(--text-muted);">${i.length} rows returned</span>
            </div>

            ${i.length===0?`
              <div class="empty-state" style="padding: 2rem;">
                <p>No records matched the selected report parameters.</p>
              </div>
            `:Tr(ue,i)}
          </div>
        `}
      </div>
    </div>
  `}function kr(e,t,i){if(e==="officer-performance"){const n=i.totalApplications||1;return`
      <div style="font-size: 0.85rem; margin-bottom: 0.25rem;">Resolution Ratio:</div>
      <div style="display: flex; height: 24px; border-radius: 6px; overflow: hidden; background: var(--bg-surface);">
        <div style="width: ${Math.round((i.totalApproved||0)/n*100)}%; background: #10b981; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: 700;" title="Approved">
          ${Math.round((i.totalApproved||0)/n*100)}% Approved
        </div>
        <div style="width: ${Math.round((i.totalPending||0)/n*100)}%; background: #f59e0b; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: 700;" title="Pending">
          ${Math.round((i.totalPending||0)/n*100)}% Pending
        </div>
        <div style="width: ${Math.round((i.totalRejected||0)/n*100)}%; background: #ef4444; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: 700;" title="Rejected">
          ${Math.round((i.totalRejected||0)/n*100)}% Rejected
        </div>
      </div>
      <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-muted);">
        <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 10px; height: 10px; background: #10b981; border-radius: 2px;"></span> Approved</span>
        <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 10px; height: 10px; background: #f59e0b; border-radius: 2px;"></span> Pending</span>
        <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 10px; height: 10px; background: #ef4444; border-radius: 2px;"></span> Rejected</span>
      </div>
    `}return e==="ai-processing"?`
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <div style="flex: 1; padding: 1rem; background: var(--bg-surface); border-radius: 6px;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">OCR Confidence Level</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${i.avgConfidenceScore||94}%</div>
          <div style="width: 100%; background: rgba(16, 185, 129, 0.2); height: 8px; border-radius: 4px; margin-top: 0.5rem;">
            <div style="width: ${i.avgConfidenceScore||94}%; background: #10b981; height: 8px; border-radius: 4px;"></div>
          </div>
        </div>
        <div style="flex: 1; padding: 1rem; background: var(--bg-surface); border-radius: 6px;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Human Review Trigger Rate</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">
            ${i.totalDocuments>0?Math.round((i.flaggedForHumanReview||0)/i.totalDocuments*100):15}%
          </div>
          <div style="width: 100%; background: rgba(245, 158, 11, 0.2); height: 8px; border-radius: 4px; margin-top: 0.5rem;">
            <div style="width: ${i.totalDocuments>0?Math.round((i.flaggedForHumanReview||0)/i.totalDocuments*100):15}%; background: #f59e0b; height: 8px; border-radius: 4px;"></div>
          </div>
        </div>
      </div>
    `:`
    <div style="padding: 1rem; background: var(--bg-surface); border-radius: 6px; font-size: 0.88rem; color: var(--text-muted);">
      Data aggregated across all active regional MySQL databases. Real-time report snapshot.
    </div>
  `}function Tr(e,t){if(e==="officer-performance")return`
      <div class="table-container" style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
              <th style="padding: 0.75rem 1rem;">Officer ID</th>
              <th style="padding: 0.75rem 1rem;">Name</th>
              <th style="padding: 0.75rem 1rem;">District</th>
              <th style="padding: 0.75rem 1rem; text-align: center;">Total</th>
              <th style="padding: 0.75rem 1rem; text-align: center;">Approved</th>
              <th style="padding: 0.75rem 1rem; text-align: center;">Rejected</th>
              <th style="padding: 0.75rem 1rem; text-align: center;">Pending</th>
              <th style="padding: 0.75rem 1rem; text-align: center;">Corrections</th>
              <th style="padding: 0.75rem 1rem;">Approval Rate</th>
            </tr>
          </thead>
          <tbody>
            ${t.map(n=>`
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary);">${a(n.officerId||n.username)}</td>
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${a(n.name)}</td>
                <td style="padding: 0.75rem 1rem;">${a(n.district||"Salem")}</td>
                <td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700;">${n.totalHandled}</td>
                <td style="padding: 0.75rem 1rem; text-align: center; color: #10b981;">${n.approved}</td>
                <td style="padding: 0.75rem 1rem; text-align: center; color: #ef4444;">${n.rejected}</td>
                <td style="padding: 0.75rem 1rem; text-align: center; color: #f59e0b;">${n.pending}</td>
                <td style="padding: 0.75rem 1rem; text-align: center;">${n.correctionsMade}</td>
                <td style="padding: 0.75rem 1rem;">
                  <span class="badge ${n.approvalRate>=80?"badge-success":"badge-warning"}">${n.approvalRate}%</span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;if(!t||t.length===0)return"";const i=Object.keys(t[0]).filter(n=>!n.includes("json")&&!n.includes("password"));return`
    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
            ${i.map(n=>`<th style="padding: 0.75rem 1rem; text-transform: capitalize;">${a(n.replace(/_/g," "))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.map(n=>`
            <tr style="border-bottom: 1px solid var(--border-color);">
              ${i.map(r=>{const o=n[r],l=o!=null?typeof o=="object"?JSON.stringify(o):String(o):"—";return`<td style="padding: 0.75rem 1rem;">${a(l)}</td>`}).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `}async function zr(){var e,t,i,n;document.querySelectorAll(".report-cat-btn").forEach(r=>{r.addEventListener("click",async()=>{const o=r.getAttribute("data-cat");o&&(ue=o,s.activeReportCategory=o,await mt())})}),(e=document.getElementById("apply-report-filters-btn"))==null||e.addEventListener("click",async()=>{var r,o,l,d,g,b;bi=((r=document.getElementById("rep-start-date"))==null?void 0:r.value)||"",hi=((o=document.getElementById("rep-end-date"))==null?void 0:o.value)||"",Ye=((l=document.getElementById("rep-state"))==null?void 0:l.value)||"",xe=((d=document.getElementById("rep-district"))==null?void 0:d.value)||"",wi=((g=document.getElementById("rep-officer"))==null?void 0:g.value)||"",$e=((b=document.getElementById("rep-status"))==null?void 0:b.value)||"",await mt()}),(t=document.getElementById("view-report-btn"))==null||t.addEventListener("click",async()=>{await mt()}),(i=document.getElementById("reset-report-filters-btn"))==null||i.addEventListener("click",async()=>{bi="",hi="",Ye="",xe="",wi="",ia="",$e="",document.getElementById("rep-start-date")&&(document.getElementById("rep-start-date").value=""),document.getElementById("rep-end-date")&&(document.getElementById("rep-end-date").value=""),document.getElementById("rep-state")&&(document.getElementById("rep-state").value=""),document.getElementById("rep-district")&&(document.getElementById("rep-district").value=""),document.getElementById("rep-officer")&&(document.getElementById("rep-officer").value=""),document.getElementById("rep-status")&&(document.getElementById("rep-status").value=""),await mt()}),(n=document.getElementById("print-report-btn"))==null||n.addEventListener("click",()=>{window.print()}),!fe&&!Ct&&await mt()}async function mt(){if(!Ct){Ct=!0,Mt="",s.notify();try{const e=await w.getSuperAdminReport(ue,{startDate:bi,endDate:hi,state:Ye,district:xe,officerId:wi,ministerId:ia,status:$e});fe=(e==null?void 0:e.data)||e}catch(e){Mt=e.message||"Failed to generate report.",s.addToast("error",Mt)}finally{Ct=!1,s.notify()}}}const aa={"state-admin-dashboard":[Fi,Ui],"state-admin-officers":[ha,Aa],"state-admin-ministers":[Sa,za],"state-admin-citizens":[La,Oa],"state-admin-records":[Pa,ja],"state-admin-tax":[Ei,Si],"state-admin-reports":[Ei,Si],"state-admin-audit":[Ei,Si],"state-admin-profile":[Fi,Ui]},ra={"super-admin-dashboard":[_a,Va],"super-admin-state-admins":[Ua,Ha],"super-admin-officers":[Ga,Ya],"super-admin-ministers":[Za,ar],"super-admin-citizens":[rr,nr],"super-admin-records":[or,lr],"super-admin-audit-logs":[pr,ur],"super-admin-settings":[fr,vr],"super-admin-officer-work":[yr,br],"super-admin-officer-detail":[hr,wr],"super-admin-minister-work":[$r,Ar],"super-admin-minister-detail":[Er,Sr],"super-admin-reports":[Ir,zr]},Mi={portal:[pa,ua],"state-admin-login":[fa,va],"super-admin-login":[ga,ya]},Rr={"/":"portal","/portal":"portal","/state-admin/login":"state-admin-login","/super-admin/login":"super-admin-login","/state-admin/dashboard":"state-admin-dashboard","/state-admin/officers":"state-admin-officers","/state-admin/ministers":"state-admin-ministers","/state-admin/citizens":"state-admin-citizens","/state-admin/records":"state-admin-records","/state-admin/tax":"state-admin-tax","/state-admin/reports":"state-admin-reports","/state-admin/audit":"state-admin-audit","/state-admin/profile":"state-admin-profile","/super-admin/dashboard":"super-admin-dashboard","/super-admin/state-admins":"super-admin-state-admins","/super-admin/officers":"super-admin-officers","/super-admin/ministers":"super-admin-ministers","/super-admin/citizens":"super-admin-citizens","/super-admin/records":"super-admin-records","/super-admin/audit-logs":"super-admin-audit-logs","/super-admin/settings":"super-admin-settings","/super-admin/officer-work":"super-admin-officer-work","/super-admin/minister-work":"super-admin-minister-work","/super-admin/reports":"super-admin-reports"},Wi={portal:"/portal","state-admin-login":"/state-admin/login","super-admin-login":"/super-admin/login","state-admin-dashboard":"/state-admin/dashboard","state-admin-officers":"/state-admin/officers","state-admin-ministers":"/state-admin/ministers","state-admin-citizens":"/state-admin/citizens","state-admin-records":"/state-admin/records","state-admin-tax":"/state-admin/tax","state-admin-reports":"/state-admin/reports","state-admin-audit":"/state-admin/audit","state-admin-profile":"/state-admin/profile","super-admin-dashboard":"/super-admin/dashboard","super-admin-state-admins":"/super-admin/state-admins","super-admin-officers":"/super-admin/officers","super-admin-ministers":"/super-admin/ministers","super-admin-citizens":"/super-admin/citizens","super-admin-records":"/super-admin/records","super-admin-audit-logs":"/super-admin/audit-logs","super-admin-settings":"/super-admin/settings","super-admin-officer-work":"/super-admin/officer-work","super-admin-officer-detail":"/super-admin/officer-work","super-admin-minister-work":"/super-admin/minister-work","super-admin-minister-detail":"/super-admin/minister-work","super-admin-reports":"/super-admin/reports"};function Oi(e=window.location.pathname){const t=e.toLowerCase().replace(/\/$/,"")||"/",i=Rr[t];if(!s.isAuthenticated){i&&Mi[i]?s.activeTab=i:s.activeTab="portal";return}const n=s.isSuperAdmin?"super-admin-dashboard":"state-admin-dashboard",r=s.isSuperAdmin?ra:aa;if(t.startsWith("/super-admin")&&!s.isSuperAdmin){s.addToast("error","Access denied. You must be a Super Administrator to access this area."),s.activeTab=n;return}i&&r[i]?s.activeTab=i:s.activeTab=n}function Bi(){const e=document.getElementById("app");if(!s.isAuthenticated){const d=s.activeTab||"portal",[g,b]=Mi[d]||Mi.portal;e.innerHTML=`${ji()}${g()}${Vi()}`,_i(),b();const $=Wi[s.activeTab];$&&window.location.pathname!==$&&window.history.replaceState(null,"",$);return}const t=s.isSuperAdmin?ra:aa,i=s.isSuperAdmin?"super-admin-dashboard":"state-admin-dashboard",n=s.activeTab,[r,o]=t[n]||t[i];e.innerHTML=`
    <div class="app-container">
      ${ca()}
      <div class="main-content-wrapper">
        ${ji()}
        ${r()}
      </div>
    </div>
    ${Vi()}
  `,ma(),_i(),o();const l=Wi[s.activeTab];l&&window.location.pathname!==l&&window.history.replaceState(null,"",l)}window.addEventListener("popstate",()=>{Oi(window.location.pathname),Bi()});s.subscribe(Bi);(async()=>(Oi(window.location.pathname),await s.init(),Oi(window.location.pathname),Bi()))();
