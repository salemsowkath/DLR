(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const d of n)if(d.type==="childList")for(const p of d.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&r(p)}).observe(document,{childList:!0,subtree:!0});function i(n){const d={};return n.integrity&&(d.integrity=n.integrity),n.referrerPolicy&&(d.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?d.credentials="include":n.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function r(n){if(n.ep)return;n.ep=!0;const d=i(n);fetch(n.href,d)}})();function dt(){var t;const e="http://localhost:4000";if(typeof window<"u"&&((t=window.location)!=null&&t.hostname)){const i=window.location.hostname;if(i!=="localhost"&&i!=="127.0.0.1"&&(e.includes("localhost")||e.includes("127.0.0.1")))return`${window.location.protocol||"http:"}//${i}:4000`}return e}const j=dt();function Y(){return localStorage.getItem("dlr_government_token")||null}function C(e){e?localStorage.setItem("dlr_government_token",e):localStorage.removeItem("dlr_government_token")}function Je(){let e=localStorage.getItem("dlr_browser_context_id");return e||(e="ctx-"+Math.random().toString(36).substring(2,10)+"-"+Date.now(),localStorage.setItem("dlr_browser_context_id",e)),e}const ce=typeof window<"u"&&"BroadcastChannel"in window?new BroadcastChannel("dlr_browser_session_channel"):null;ce&&(ce.onmessage=e=>{var i,r;const t=(i=e.data)==null?void 0:i.role;((r=e.data)==null?void 0:r.type)==="DLR_NEW_LOGIN"&&t!=="OFFICER"&&t!=="MINISTER"&&(C(null),window.dispatchEvent(new CustomEvent("dlr:session-replaced",{detail:{message:"Your DLR session was replaced by a new login.",newRole:t}})))});function ct(e,t){ce&&e&&ce.postMessage({type:"DLR_NEW_LOGIN",role:t,userId:e.id,timestamp:Date.now(),contextId:Je()})}async function s(e,t={}){var f,m,I,A;const i=`${j}${e}`,r=Y(),n={...t.headers||{},"x-client-context-id":Je()};r&&(n.Authorization=`Bearer ${r}`),!t.isFormData&&!n["Content-Type"]&&(n["Content-Type"]="application/json");const d={method:t.method||"GET",headers:n,body:t.isFormData?t.body:t.body?JSON.stringify(t.body):void 0};let p;try{p=await fetch(i,d)}catch{throw new Error("Network error: Unable to communicate with DLR backend service.")}let l;try{l=await p.json()}catch{l=null}if(!p.ok){p.status===401&&(C(null),((f=l==null?void 0:l.error)==null?void 0:f.code)==="SESSION_REPLACED"?window.dispatchEvent(new CustomEvent("dlr:session-replaced",{detail:{message:l.error.message||"Your DLR session was replaced by a new login."}})):window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const O=((m=l==null?void 0:l.error)==null?void 0:m.message)||(l==null?void 0:l.message)||`API Error (${p.status})`,T=new Error(O);throw T.status=p.status,T.code=((I=l==null?void 0:l.error)==null?void 0:I.code)||"API_ERROR",T.details=((A=l==null?void 0:l.error)==null?void 0:A.details)||null,T}return(l==null?void 0:l.data)||l}const E={getStoredToken:Y,setStoredToken:C,async requestOtp(e){return s("/api/auth/citizen/otp/request",{method:"POST",body:{aadhaarNumber:e}})},async citizenLogin(e){return this.requestOtp(e)},async citizenRegister(e){return s("/api/auth/citizen/register",{method:"POST",body:e})},async verifyOtp({aadhaarNumber:e,otp:t,sessionId:i}){const r=await s("/api/auth/citizen/otp/verify",{method:"POST",body:{aadhaarNumber:e,otp:t,sessionId:i}});return r!=null&&r.accessToken&&C(r.accessToken),r},async citizenVerifyOtp({aadhaarNumber:e,otp:t,sessionId:i}){return this.verifyOtp({aadhaarNumber:e,otp:t,sessionId:i})},async citizenVerifyRegistrationOtp({aadhaarNumber:e,otp:t,sessionId:i}){return this.verifyOtp({aadhaarNumber:e,otp:t,sessionId:i})},async officerLogin({username:e,identifier:t,password:i}){const r=e||t,n=await s("/api/auth/officer/login",{method:"POST",body:{username:r,identifier:r,password:i}});return n!=null&&n.accessToken&&C(n.accessToken),n},async ministerLogin({username:e,identifier:t,password:i}){const r=e||t,n=await s("/api/auth/minister/login",{method:"POST",body:{username:r,identifier:r,password:i}});return n!=null&&n.accessToken&&C(n.accessToken),n},async superAdminLogin({username:e,identifier:t,password:i}){var p,l;const r=e||t,n=await s("/api/auth/super-admin/login",{method:"POST",body:{username:r,identifier:r,password:i}}),d=(n==null?void 0:n.token)||(n==null?void 0:n.accessToken)||((p=n==null?void 0:n.data)==null?void 0:p.token)||((l=n==null?void 0:n.data)==null?void 0:l.accessToken);return d&&C(d),n},async stateAdminLogin({username:e,identifier:t,password:i}){var p,l;const r=e||t,n=await s("/api/auth/state-admin/login",{method:"POST",body:{username:r,identifier:r,password:i}}),d=(n==null?void 0:n.token)||(n==null?void 0:n.accessToken)||((p=n==null?void 0:n.data)==null?void 0:p.token)||((l=n==null?void 0:n.data)==null?void 0:l.accessToken);return d&&C(d),n},async getMe(){return s("/api/auth/me")},async getMinisterDashboard(){return s("/api/admin/dashboard")},async logout(){try{await s("/api/auth/logout",{method:"POST"})}finally{C(null)}},async uploadDocument(e){const t=new FormData;return t.append("file",e),s("/api/documents/upload",{method:"POST",isFormData:!0,body:t})},async checkDuplicateRecord({surveyNumber:e,village:t,taluk:i,district:r}){return s("/api/documents/check-duplicate",{method:"POST",body:{surveyNumber:e,village:t,taluk:i,district:r}})},async submitCitizenApplication(e,{citizenData:t={}}={}){const i=new FormData;i.append("file",e);for(const[r,n]of Object.entries(t))n!=null&&n!==""&&i.append(r,String(n));return s("/api/documents",{method:"POST",isFormData:!0,body:i})},async processDocument(e,{language:t="eng",geometry:i=null,crs:r="",citizenData:n={}}={}){const d=new FormData;d.append("file",e),d.append("language",t),i&&d.append("geometry",typeof i=="string"?i:JSON.stringify(i)),r&&d.append("crs",r);for(const[p,l]of Object.entries(n))l!=null&&l!==""&&d.append(p,String(l));return s("/api/documents/process",{method:"POST",isFormData:!0,body:d})},async getMyDocuments(){const e=await s("/api/documents/mine");return(e==null?void 0:e.documents)||e||[]},async getDocumentById(e){return s(`/api/documents/${e}`)},async getDocumentFile(e){const t=await fetch(`${j}/api/documents/${encodeURIComponent(e)}/file`,{headers:Y()?{Authorization:`Bearer ${Y()}`}:{}});if(!t.ok){t.status===401&&(C(null),window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const i=new Error(t.status===403?"You do not have access to this document.":"Unable to load the original document.");throw i.status=t.status,i}return t.blob()},getDocumentFileUrl(e){return`${j}/api/documents/${encodeURIComponent(e)}/file`},async getMyApplications(){const e=await s("/api/documents/applications/mine");return(e==null?void 0:e.applications)||[]},async getReviewCases(e={}){const t=new URLSearchParams;e.status&&t.set("status",e.status),e.priority&&t.set("priority",e.priority),e.limit&&t.set("limit",e.limit),e.offset&&t.set("offset",e.offset);const i=t.toString()?`?${t.toString()}`:"";return s(`/api/review/cases${i}`)},async getReviewCaseById(e){return s(`/api/review/cases/${e}`)},async triggerAiProcessCase(e,{language:t="eng"}={}){return s(`/api/review/cases/${e}/process-ai`,{method:"POST",body:{language:t}})},async startReviewCase(e){return s(`/api/review/cases/${e}/start`,{method:"POST"})},async getReviewStats(){return s("/api/review/stats")},async approveReviewCase(e,{notes:t=""}={}){return s(`/api/review/cases/${e}/approve`,{method:"POST",body:{officerNotes:t}})},async rejectReviewCase(e,{reason:t,notes:i=""}){return s(`/api/review/cases/${e}/reject`,{method:"POST",body:{reason:t,officerNotes:i}})},async requestCorrectionCase(e,{reason:t,notes:i=""}){return s(`/api/review/cases/${e}/request-correction`,{method:"POST",body:{reason:t,officerNotes:i}})},async holdReviewCase(e,{reason:t,notes:i=""}){return s(`/api/review/cases/${e}/hold`,{method:"POST",body:{reason:t}})},async createOfficerCorrection(e,{fieldName:t,originalValue:i,correctedValue:r,reason:n=""}){return s(`/api/review/cases/${e}/correction`,{method:"POST",body:{field:t,originalValue:i,correctedValue:r,reason:n}})},async addReviewNote(e,{noteText:t,isInternal:i=!0}){return s(`/api/review/cases/${e}/notes`,{method:"POST",body:{note:t}})},async resolveAnomaly(e,t,{resolutionType:i="OVERRIDDEN",notes:r=""}){return s(`/api/review/cases/${e}/anomalies/${t}/resolve`,{method:"POST",body:{resolutionType:i,notes:r}})},async getSuperAdminDashboard(){return s("/api/super-admin/dashboard")},async getSuperAdminOfficers(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/super-admin/officers${i?"?"+i:""}`)},async createOfficer(e){return s("/api/super-admin/officers",{method:"POST",body:e})},async updateOfficer(e,t){return s(`/api/super-admin/officers/${e}`,{method:"PATCH",body:t})},async setOfficerStatus(e,t){return s(`/api/super-admin/officers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetOfficerPassword(e,t){return s(`/api/super-admin/officers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getSuperAdminMinisters(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/super-admin/ministers${i?"?"+i:""}`)},async createMinister(e){return s("/api/super-admin/ministers",{method:"POST",body:e})},async updateMinister(e,t){return s(`/api/super-admin/ministers/${e}`,{method:"PATCH",body:t})},async setMinisterStatus(e,t){return s(`/api/super-admin/ministers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetMinisterPassword(e,t){return s(`/api/super-admin/ministers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getSuperAdminCitizens(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/super-admin/citizens${i?"?"+i:""}`)},async setCitizenStatus(e,t){return s(`/api/super-admin/citizens/${e}/status`,{method:"PATCH",body:{status:t}})},async getSuperAdminAuditLogs(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/super-admin/audit-logs${i?"?"+i:""}`)},async getSuperAdminLandRecords(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/super-admin/land-records${i?"?"+i:""}`)},async resetUserPassword(e,t){return s(`/api/super-admin/users/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStates(){return s("/api/super-admin/states")},async getSuperAdminStateAdmins(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/super-admin/state-admins${i?"?"+i:""}`)},async getSuperAdminStateAdmin(e){return s(`/api/super-admin/state-admins/${e}`)},async createStateAdmin(e){return s("/api/super-admin/state-admins",{method:"POST",body:e})},async updateStateAdmin(e,t){return s(`/api/super-admin/state-admins/${e}`,{method:"PATCH",body:t})},async setStateAdminStatus(e,t){return s(`/api/super-admin/state-admins/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminPassword(e,t){return s(`/api/super-admin/state-admins/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminDashboard(){return s("/api/state-admin/dashboard")},async getStateAdminOfficers(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/state-admin/officers${i?"?"+i:""}`)},async getStateAdminOfficer(e){return s(`/api/state-admin/officers/${e}`)},async createStateAdminOfficer(e){return s("/api/state-admin/officers",{method:"POST",body:e})},async updateStateAdminOfficer(e,t){return s(`/api/state-admin/officers/${e}`,{method:"PATCH",body:t})},async setStateAdminOfficerStatus(e,t){return s(`/api/state-admin/officers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminOfficerPassword(e,t){return s(`/api/state-admin/officers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminMinisters(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/state-admin/ministers${i?"?"+i:""}`)},async getStateAdminMinister(e){return s(`/api/state-admin/ministers/${e}`)},async createStateAdminMinister(e){return s("/api/state-admin/ministers",{method:"POST",body:e})},async updateStateAdminMinister(e,t){return s(`/api/state-admin/ministers/${e}`,{method:"PATCH",body:t})},async setStateAdminMinisterStatus(e,t){return s(`/api/state-admin/ministers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminMinisterPassword(e,t){return s(`/api/state-admin/ministers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminCitizens(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/state-admin/citizens${i?"?"+i:""}`)},async getStateAdminCitizen(e){return s(`/api/state-admin/citizens/${e}`)},async getStateAdminLandRecords(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/state-admin/land-records${i?"?"+i:""}`)},async getStateAdminLandRecord(e){return s(`/api/state-admin/land-records/${e}`)},async getStateAdminApplications(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/state-admin/applications${i?"?"+i:""}`)},async getStateAdminApplication(e){return s(`/api/state-admin/applications/${e}`)},async getStateAdminReports(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/state-admin/reports${i?"?"+i:""}`)},async getSuperAdminOfficerWork(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/admin/work/officers${i?"?"+i:""}`)},async getSuperAdminOfficerProfile(e){return s(`/api/admin/work/officers/${encodeURIComponent(e)}`)},async getSuperAdminMinisterWork(e={}){const t=new URLSearchParams;for(const[r,n]of Object.entries(e))n!=null&&n!==""&&t.append(r,n);const i=t.toString();return s(`/api/admin/work/ministers${i?"?"+i:""}`)},async getSuperAdminMinisterProfile(e){return s(`/api/admin/work/ministers/${encodeURIComponent(e)}`)},async getSuperAdminReportsOverview(){return s("/api/admin/reports/overview")},async getSuperAdminReport(e,t={}){const i=new URLSearchParams({category:e});for(const[r,n]of Object.entries(t))n!=null&&n!==""&&i.append(r,n);return s(`/api/admin/reports/query?${i.toString()}`)},async getOfficerApplications(e={}){const t=new URLSearchParams;e.status&&t.set("status",e.status),e.page&&t.set("page",e.page),e.limit&&t.set("limit",e.limit);const i=t.toString()?`?${t.toString()}`:"";return s(`/api/officer/applications${i}`)},async getOfficerApplicationById(e){return s(`/api/officer/applications/${encodeURIComponent(e)}`)},async getReviewCase(e){return this.getOfficerApplicationById(e)},async getReviewCases(e={}){return this.getOfficerApplications(e)},async getReviewCaseById(e){return this.getOfficerApplicationById(e)},async getOfficerApplicationDocument(e){const t=Y(),i=await fetch(`${j}/api/officer/applications/${encodeURIComponent(e)}/document`,{headers:{...t?{Authorization:`Bearer ${t}`}:{}}});if(!i.ok)throw new Error(`Failed to load original document (${i.status})`);return i.blob()},getOfficerApplicationDocumentUrl(e){return`${j}/api/officer/applications/${encodeURIComponent(e)}/document`},async generateDigitalLandRecord(e,t={}){return s(`/api/officer/applications/${encodeURIComponent(e)}/generate`,{method:"POST",body:t})},async getDigitalRecordDraft(e){return s(`/api/officer/applications/${encodeURIComponent(e)}/digital-record`)},async updateDigitalRecordDraft(e,t){return s(`/api/officer/applications/${encodeURIComponent(e)}/digital-record`,{method:"PATCH",body:t})},async scheduleAppointment(e,t){return s(`/api/officer/applications/${encodeURIComponent(e)}/appointment`,{method:"POST",body:t})},async startVerification(e,t={}){return s(`/api/officer/applications/${encodeURIComponent(e)}/verification/start`,{method:"POST",body:t})},async sendVerificationOtp(e,t={}){return s(`/api/officer/applications/${encodeURIComponent(e)}/verification/otp/send`,{method:"POST",body:t})},async verifyVerificationOtp(e,t){return s(`/api/officer/applications/${encodeURIComponent(e)}/verification/otp/verify`,{method:"POST",body:t})},async uploadVerificationPhoto(e,t){return s(`/api/officer/applications/${encodeURIComponent(e)}/verification/photo`,{method:"POST",isFormData:!0,body:t})},async performFinalVerification(e,t={}){return s(`/api/officer/applications/${encodeURIComponent(e)}/final-verify`,{method:"POST",body:t})},async approveApplication(e,t={}){return s(`/api/officer/applications/${encodeURIComponent(e)}/approve`,{method:"POST",body:t})},async rejectApplication(e,t){return s(`/api/officer/applications/${encodeURIComponent(e)}/reject`,{method:"POST",body:t})},async submitLandRecordApplication(e){return s("/api/land-records/applications",{method:"POST",isFormData:!0,body:e})},async getMyLandApplications(){return s("/api/land-records/my-applications")},async getMyAppointments(){return s("/api/appointments")},async getApprovedLandRecords(){return s("/api/land-records/approved")},async getApprovedRecords(){return this.getApprovedLandRecords()},async getApprovedLandRecordById(e){return s(`/api/land-records/approved/${encodeURIComponent(e)}`)},async downloadApprovedLandRecordPdf(e){const t=Y(),i=await fetch(`${j}/api/land-records/approved/${encodeURIComponent(e)}/pdf`,{headers:{...t?{Authorization:`Bearer ${t}`}:{}}});if(!i.ok)throw new Error(`Failed to download PDF certificate (${i.status})`);return i.blob()},async getNotifications(e={}){const t=new URLSearchParams;e.unreadOnly&&t.set("unreadOnly","true");const i=t.toString()?`?${t.toString()}`:"";return s(`/api/notifications${i}`)},async markNotificationRead(e){return s(`/api/notifications/${encodeURIComponent(e)}/read`,{method:"PATCH"})},async markAllNotificationsRead(){return s("/api/notifications/read-all",{method:"PATCH"})},getVerificationPhotoUrl(e){return`${j}/api/verification/photos/${encodeURIComponent(e)}`}};function lt(e){return e?Array.isArray(e.roles)?e.roles:[e.primary_role||e.role||""]:[]}function Xe(e,...t){return lt(e).some(i=>t.includes(String(i||"").toUpperCase()))}function be(e){return Xe(e,"OFFICER","GOVERNMENT_OFFICER")}function q(e){return Xe(e,"MINISTER","ADMIN")}class pt{constructor(){this.user=null,this.isAuthenticated=!1,this.activeTab="officer-login",this.reviewCases=[],this.reviewCasesLoading=!1,this.reviewCasesError="",this.selectedReviewCase=null,this.reviewCaseLoading=!1,this.reviewCaseError="",this.notifications=[],this.unreadNotificationsCount=0,this.notificationsLoading=!1,this.toasts=[],this.loading=!1,this.listeners=new Set,window.addEventListener("dlr:unauthorized",()=>{this._resetSession(),this.addToast("error","Session expired. Please log in again."),this.notify()}),window.addEventListener("dlr:session-replaced",t=>{var r;this._resetSession();const i=((r=t.detail)==null?void 0:r.message)||"Your DLR session was replaced by a new login.";this.addToast("error",i),this.notify()})}_resetSession(){this.user=null,this.isAuthenticated=!1,this.activeTab="officer-login",this.reviewCases=[],this.selectedReviewCase=null,this.notifications=[],this.unreadNotificationsCount=0}get isOfficer(){return be(this.user)}get isMinister(){return q(this.user)}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}notify(){for(const t of this.listeners)t(this)}addToast(t,i){const r=Date.now()+Math.random();this.toasts.push({id:r,type:t,message:i}),this.notify(),setTimeout(()=>{this.toasts=this.toasts.filter(n=>n.id!==r),this.notify()},4e3)}async init(){if(!E.getStoredToken()){this.notify();return}try{this.loading=!0,this.notify();const i=await E.getMe();if(!be(i)&&!q(i)){E.setStoredToken(null),this._resetSession();return}this.user=i,this.isAuthenticated=!0,this.activeTab=q(i)?"minister-dashboard":"officer-cases",await this._loadWorkspace()}catch{E.setStoredToken(null),this._resetSession()}finally{this.loading=!1,this.notify()}}async setAuthenticatedUser(t){if(!be(t)&&!q(t)){this.addToast("error","Access denied. This portal is for Government Officers and Ministers only.");return}this.user=t,this.isAuthenticated=!0,this.activeTab=q(t)?"minister-dashboard":"officer-cases",ct(t,q(t)?"MINISTER":"OFFICER"),await this._loadWorkspace(),this.notify()}async _loadWorkspace(){this.isOfficer?await Promise.all([this.loadReviewCases(),this.loadNotifications()]):this.isMinister&&await Promise.all([this.loadMinisterDashboard(),this.loadNotifications()])}async loadMinisterDashboard(){try{this.ministerDashboardData=await E.getMinisterDashboard(),this.notify()}catch(t){console.error("Failed to load minister dashboard:",t)}}setActiveTab(t,i=null){if(t.startsWith("super-admin-")||t.startsWith("state-admin-")){this.addToast("error","Access denied. That area is restricted to Administration portals.");return}this.activeTab=t,i&&(this.selectedReviewCase=i),this.notify(),t==="officer-cases"&&this.loadReviewCases(),t==="notifications"&&this.loadNotifications()}async loadReviewCases(){this.reviewCasesLoading=!0,this.reviewCasesError="",this.notify();try{const t=await E.getOfficerApplications();this.reviewCases=Array.isArray(t)?t:(t==null?void 0:t.applications)||[],t!=null&&t.stats&&(this.officerStats=t.stats)}catch(t){this.reviewCasesError=t.message}finally{this.reviewCasesLoading=!1,this.notify()}}async loadSelectedReviewCase(t){if(t){this.reviewCaseLoading=!0,this.reviewCaseError="",this.notify();try{const i=await E.getOfficerApplicationById(t);this.selectedReviewCase=i}catch(i){this.reviewCaseError=i.message,this.selectedReviewCase=null}finally{this.reviewCaseLoading=!1,this.notify()}}}async loadNotifications(){this.notificationsLoading=!0;try{const t=await E.getNotifications(),i=Array.isArray(t)?t:(t==null?void 0:t.notifications)||[];this.notifications=i,this.unreadNotificationsCount=i.filter(r=>!r.is_read).length}catch{}finally{this.notificationsLoading=!1,this.notify()}}async logout(){try{await E.logout()}catch{}finally{E.setStoredToken(null),this._resetSession(),this.addToast("success","Logged out successfully."),this.notify()}}}const o=new pt;function a(e){return String(e??"").replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[t])}function ve(e){if(!e)return"—";const t=new Date(e);return Number.isNaN(t.getTime())?"—":t.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}function Re(e){const t=String(e||"").toUpperCase();return["PROCESSED","APPROVED","PASS","VALID","COMPLETED"].includes(t)?"badge-success":["FAILED","REJECTED","CRITICAL","ERROR","INVALID"].includes(t)?"badge-danger":["WARNING","CORRECTION_REQUIRED","ON_HOLD","PENDING_REVIEW","IN_REVIEW","REVIEW_REQUIRED","PENDING_OFFICER_VERIFICATION"].includes(t)?"badge-warning":"badge-info"}function R(e,t="Officer Verification Required"){if(e==null)return t;if(typeof e=="string"){const i=e.trim();return!i||i==="—"||i==="null"||i==="undefined"||i==="NOT_DETECTED"||i==="[object Object]"?t:i}if(typeof e=="number")return String(e);if(typeof e=="boolean")return e?"Yes":"No";if(Array.isArray(e))return e.length===0?t:e.map(i=>R(i,"")).filter(Boolean).join(", ")||t;if(typeof e=="object"){if(e.value!==void 0&&e.value!==null)return R(e.value,t);if(e.text!==void 0&&e.text!==null)return R(e.text,t);if(e.name!==void 0&&e.name!==null)return R(e.name,t);const i=Object.keys(e);if(i.length===0)return t;const r=i.map(n=>`${n}: ${R(e[n],"")}`).filter(n=>!n.endsWith(": "));return r.length>0?r.join("; "):t}return String(e)||t}let te=!1;function We(){const{user:e,isAuthenticated:t,notifications:i,unreadNotificationsCount:r}=o;if(!t||!e)return`
      <header class="app-header">
        <div class="header-left">
          <div class="emblem-badge">
            <div class="emblem-icon">🏛️</div>
            <div>
              <div style="font-weight:700;">DLR Government Portal</div>
              <div class="gov-tag">Officer & Minister Workflow Platform · SIH 2026</div>
            </div>
          </div>
        </div>
      </header>
    `;const n=o.isMinister,d=n?"DLR Minister Portal":"DLR Officer Portal",p=n?"🏛️":"👮",l=n?`State Jurisdiction: ${e.state_name||e.state||"All Districts"}`:`Jurisdiction: ${e.district?`${e.district}, `:""}${e.state_name||e.state||"Assigned District"}`,f=e.username||e.external_reference||(n?"MINISTER":"OFFICER");return`
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display:none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">${p}</div>
          <div>
            <div style="font-size:1.05rem; font-weight:700;">${d}</div>
            <div class="gov-tag">${l}</div>
          </div>
        </div>
      </div>

      <div class="header-right" style="display:flex; align-items:center; gap:0.75rem; position:relative;">
        <!-- Notification Bell Icon -->
        <div style="position:relative;">
          <button id="header-notif-btn" class="btn btn-outline btn-sm" title="Notifications" style="position:relative; font-size:1.1rem; padding:0.4rem 0.65rem;">
            🔔
            ${r>0?`<span style="position:absolute; top:-4px; right:-4px; background:#dc2626; color:#fff; border-radius:50%; width:18px; height:18px; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center;">${r}</span>`:""}
          </button>

          <!-- Notifications Dropdown -->
          ${te?`
            <div id="notifications-dropdown" style="position:absolute; right:0; top:calc(100% + 8px); width:340px; background:#1e293b; border:1px solid #334155; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.4); z-index:9999; overflow:hidden;">
              <div style="padding:0.75rem 1rem; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; font-size:0.9rem;">Notifications</span>
                <span style="font-size:0.75rem; color:#94a3b8;">${r} unread</span>
              </div>
              <div style="max-height:260px; overflow-y:auto;">
                ${i.length===0?'<div style="padding:1.5rem; text-align:center; color:#64748b; font-size:0.85rem;">No notifications at this time.</div>':i.slice(0,8).map(m=>`
                      <div class="notif-item ${m.is_read?"":"unread"}" data-id="${a(m.id)}" style="padding:0.65rem 1rem; border-bottom:1px solid #1e293b; cursor:pointer; background:${m.is_read?"transparent":"rgba(59,130,246,0.08)"};">
                        <div style="font-size:0.82rem; font-weight:600; color:${m.is_read?"#cbd5e1":"#60a5fa"};">${a(m.title)}</div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">${a(m.message)}</div>
                        <div style="font-size:0.7rem; color:#64748b; margin-top:3px;">${ve(m.created_at)}</div>
                      </div>
                    `).join("")}
              </div>
            </div>
          `:""}
        </div>

        <!-- Identity and Jurisdiction badge -->
        <div class="user-info">
          <div style="font-size:0.85rem; font-weight:600;">${a(f)}</div>
          <div style="font-size:0.7rem; color:${n?"#a855f7":"#22c55e"}; font-weight:600;">
            ${n?"Honorable Minister":"Authorized Officer"}
          </div>
        </div>

        <button id="header-logout-btn" class="btn btn-outline btn-sm">Logout</button>
      </div>
    </header>
  `}function He(){const e=document.getElementById("header-logout-btn");e&&e.addEventListener("click",()=>{o.logout()});const t=document.getElementById("header-notif-btn");t&&t.addEventListener("click",i=>{i.stopPropagation(),te=!te,o.notify()}),document.addEventListener("click",i=>{te&&!i.target.closest("#header-notif-btn")&&!i.target.closest("#notifications-dropdown")&&(te=!1,o.notify())},{once:!0})}function mt(){const e=o.activeTab,t=o.isMinister,i=t?[{id:"minister-dashboard",label:"State Dashboard",icon:"🏛️"},{id:"officer-cases",label:"State Applications",icon:"⚖️"},{id:"profile",label:"Minister Profile",icon:"👤"}]:[{id:"officer-cases",label:"Pending Applications",icon:"⚖️"},{id:"profile",label:"Officer Profile",icon:"👤"}],r=t?"MINISTER GOVERNANCE":"OFFICER VERIFICATION";return`
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">🏛️</div>
        <div>
          <div style="font-weight:700; font-size:1.05rem;">DLR Government</div>
          <div style="font-size:0.7rem; color:#94a3b8;">${r}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">${r}</div>
        ${i.map(n=>`
          <button
            class="sidebar-nav-item ${e===n.id?"active":""}"
            data-tab="${n.id}"
          >
            <span class="nav-icon">${n.icon}</span>
            <span>${n.label}</span>
          </button>
        `).join("")}
      </nav>

      <div class="sidebar-footer">
        <div style="font-size:0.75rem; color:#64748b; line-height:1.4;">
          Jurisdiction Scoped<br />
          <span style="color:#22c55e;">● Official Authority</span>
        </div>
      </div>
    </aside>
  `}function ft(){document.querySelectorAll(".sidebar-nav-item").forEach(t=>{t.addEventListener("click",()=>{const i=t.getAttribute("data-tab");i&&o.setActiveTab(i)})})}function qe(){const{toasts:e}=o;return!e||e.length===0?"":`
    <div class="toast-container">
      ${e.map(t=>`
        <div class="toast toast-${t.type}">
          <span>${t.type==="error"?"⚠️":t.type==="success"?"✅":"ℹ️"}</span>
          <div>${t.message}</div>
        </div>
      `).join("")}
    </div>
  `}function he(e,t=""){var i;if(typeof window<"u"&&((i=window.location)!=null&&i.hostname)){const r=window.location.protocol||"http:",n=window.location.hostname;return`${r}//${n}:${e}${t}`}return`http://localhost:${e}${t}`}function ut(){return`
    <div class="auth-container">
      <div class="auth-card" style="max-width:620px;">
        <div class="auth-header">
          <div style="font-size:2.8rem;margin-bottom:0.5rem;">🏛️</div>
          <h1 style="font-size:1.6rem;font-weight:700;">DLR Portal Selection</h1>
          <p style="color:#94a3b8;font-size:0.9rem;">
            Intelligent Land Record Digitization & Validation System<br />
            Select your portal and administrative role to continue
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:1.25rem;margin:1.5rem 0;">
          <!-- 1. GOVERNMENT PORTAL (HOSTED ON PORT 3001) -->
          <div style="border: 2px solid #3b82f6; border-radius: 12px; padding: 1.25rem; background: rgba(59, 130, 246, 0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
              <div style="font-weight: 700; font-size: 1rem; color: #93c5fd; display: flex; align-items: center; gap: 0.5rem;">
                <span>🏛️</span> GOVERNMENT PORTAL
              </div>
              <span class="badge badge-primary" style="font-size: 0.72rem;">THIS PLATFORM · PORT 3001</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div
                id="portal-select-officer"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#3b82f6';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">👮</span>
                  <div style="font-weight: 700; color: #f8fafc; font-size: 0.95rem;">OFFICER LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  Document Review, AI Verification & Approvals
                </div>
              </div>

              <div
                id="portal-select-minister"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#a855f7';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">🏛️</span>
                  <div style="font-weight: 700; color: #c084fc; font-size: 0.95rem;">MINISTER LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  State Land Governance, Analytics & Reports
                </div>
              </div>
            </div>
          </div>

          <!-- 2. CITIZEN PORTAL (PORT 3000) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem;">
                <span>👥</span> CITIZEN PORTAL
              </div>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
                Submit land records, track status, view verified documents (Port 3000)
              </div>
            </div>
            <a href="${he(3e3,"/citizen/login")}" class="btn btn-outline btn-sm" style="font-weight: 600; text-decoration: none;">
              Citizen Sign In →
            </a>
          </div>

          <!-- 3. ADMINISTRATION PORTAL (PORT 3002) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b;">
            <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>🛡️</span> ADMINISTRATION PORTAL (Port 3002)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <a href="${he(3002,"/state-admin/login")}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                🏢 STATE ADMIN LOGIN →
              </a>
              <a href="${he(3002,"/super-admin/login")}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                🛡️ SUPER ADMIN LOGIN →
              </a>
            </div>
          </div>
        </div>

        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #334155;text-align:center;font-size:0.8rem;color:#64748b;">
          Government of India · Problem Statement 26018 · SIH 2026<br />
          Role-Based Access Control and Jurisdiction Enforcement Active.
        </div>
      </div>
    </div>
  `}function gt(){var e,t;(e=document.getElementById("portal-select-officer"))==null||e.addEventListener("click",()=>{o.activeTab="officer-login",o.notify()}),(t=document.getElementById("portal-select-minister"))==null||t.addEventListener("click",()=>{o.activeTab="minister-login",o.notify()})}let le=!1,M="";function vt(){return`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">👮</div>
          <h1>Government Officer Sign In</h1>
          <p>DLR Officer Review Console — Authorized Personnel Only</p>
        </div>

        ${M?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${a(M)}</div>`:""}

        <form id="officer-login-form">
          <div class="form-group">
            <label class="form-label" for="officer-username-input">Officer Username</label>
            <input
              type="text"
              id="officer-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. DEMO-OFFICER-001"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="officer-password-input">Password</label>
            <input
              type="password"
              id="officer-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="officer-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${le?"disabled":""}>
            ${le?'<div class="spinner"></div> Signing in...':"Sign in to Officer Console →"}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">Honorable Minister?</span>
          <a href="#" id="switch-to-minister-login" style="color:#a855f7;font-weight:600;text-decoration:none;margin-left:0.35rem;">Minister Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="officer-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Secured by JWT Bearer Token + RBAC · Officers only<br/>
          Unauthorized access attempts are logged and audited.
        </div>
      </div>
    </div>
  `}function yt(){var e,t,i;(e=document.getElementById("officer-back-to-portal"))==null||e.addEventListener("click",r=>{r.preventDefault(),M="",o.activeTab="portal",o.notify()}),(t=document.getElementById("switch-to-minister-login"))==null||t.addEventListener("click",r=>{r.preventDefault(),M="",o.activeTab="minister-login",o.notify()}),(i=document.getElementById("officer-login-form"))==null||i.addEventListener("submit",async r=>{var p,l;r.preventDefault();const n=(((p=document.getElementById("officer-username-input"))==null?void 0:p.value)||"").trim(),d=((l=document.getElementById("officer-password-input"))==null?void 0:l.value)||"";if(!n||!d){M="Please enter your officer username and password.",o.notify();return}le=!0,M="",o.notify();try{const f=await E.officerLogin({username:n,password:d});if(!(f!=null&&f.user))throw new Error("Officer login response did not contain user data.");const m=String(f.user.role||f.user.primary_role||"").toUpperCase();if(!["OFFICER","GOVERNMENT_OFFICER"].includes(m))throw new Error(`Access denied. This portal is for Officers only. Your role is: ${m}`);M="",o.addToast("success",`Welcome, ${f.user.name||n}. Signed in to Officer Review Console.`),await o.setAuthenticatedUser(f.user)}catch(f){M=f.message||"Officer sign in failed. Please check your credentials."}finally{le=!1,o.notify()}})}let pe=!1,V="";function bt(){return`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 700;">
            DLR Government Portal
          </div>
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">🏛️</div>
          <h1 style="font-size: 1.6rem; font-weight: 700; margin-bottom: 0.35rem;">Government Minister Sign In</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">State Revenue Administration & Land Governance Oversight</p>
        </div>

        ${V?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;display:block;text-align:center;">⚠️ ${a(V)}</div>`:""}

        <form id="minister-login-form">
          <div class="form-group">
            <label class="form-label" for="minister-username-input">Minister Username</label>
            <input
              type="text"
              id="minister-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. DEMO-MINISTER-001"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="minister-password-input">Password</label>
            <input
              type="password"
              id="minister-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="minister-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${pe?"disabled":""}>
            ${pe?'<div class="spinner"></div> Signing in...':"Sign In →"}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">Authorized Officer?</span>
          <a href="#" id="switch-to-officer-login" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Officer Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="minister-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Secured by JWT Bearer Token + RBAC · State Ministers only<br />
          Unauthorized access attempts are audited.
        </div>
      </div>
    </div>
  `}function ht(){var e,t,i;(e=document.getElementById("minister-back-to-portal"))==null||e.addEventListener("click",r=>{r.preventDefault(),V="",o.activeTab="portal",o.notify()}),(t=document.getElementById("switch-to-officer-login"))==null||t.addEventListener("click",r=>{r.preventDefault(),V="",o.activeTab="officer-login",o.notify()}),(i=document.getElementById("minister-login-form"))==null||i.addEventListener("submit",async r=>{var p,l;r.preventDefault();const n=(((p=document.getElementById("minister-username-input"))==null?void 0:p.value)||"").trim(),d=((l=document.getElementById("minister-password-input"))==null?void 0:l.value)||"";if(!n||!d){V="Please enter your minister username and password.",o.notify();return}pe=!0,V="",o.notify();try{const f=await E.ministerLogin({username:n,password:d});if(!(f!=null&&f.user))throw new Error("Minister login response did not contain user data.");const m=String(f.user.role||f.user.primary_role||"").toUpperCase();if(!["MINISTER","ADMIN"].includes(m))throw new Error(`Access denied. This portal is for Ministers only. Your role is: ${m}`);V="",o.addToast("success",`Welcome, ${f.user.name||n}. Signed in to Minister Portal.`),await o.setAuthenticatedUser(f.user)}catch(f){V=f.message||"Minister sign in failed. Please check your credentials."}finally{pe=!1,o.notify()}})}let oe=!1,N="ALL",D=!1,ie=!1,S=1,me=!1,ne=!1,re=!1,ee=null,F=null,fe=!1,ae=!1,J="",ue=!1,z=null,L=620;function Et(e){const t=String(e).trim();return t.includes("X")?t:t.length===12?`XXXX-XXXX-${t.slice(8)}`:t.replace(/\d(?=\d{4})/g,"X")}const wt=[{group:"1. Owner Details",fields:[{key:"owner_name",label:"Primary Owner Name"},{key:"additional_owners",label:"Additional Co-Owners"},{key:"relationship",label:"Relationship / Legal Capacity"}]},{group:"2. Land Identification",fields:[{key:"survey_number",label:"Survey Number"},{key:"subdivision_number",label:"Sub-Division Number"},{key:"patta_number",label:"Patta Number"},{key:"khasra_number",label:"Khasra Number"},{key:"khata_number",label:"Khata Number"}]},{group:"3. Location Jurisdiction",fields:[{key:"state",label:"State"},{key:"district",label:"District"},{key:"taluk",label:"Taluk"},{key:"village",label:"Village"}]},{group:"4. Land Extent & Classification",fields:[{key:"area_value",label:"Land Area / Extent"},{key:"area_unit",label:"Area Unit"},{key:"classification",label:"Land Classification"}]},{group:"5. Boundary Information (Chathurseema)",fields:[{key:"boundary_north",label:"North Boundary"},{key:"boundary_south",label:"South Boundary"},{key:"boundary_east",label:"East Boundary"},{key:"boundary_west",label:"West Boundary"}]},{group:"6. Deed & Registration Details",fields:[{key:"document_type",label:"Document Type"},{key:"document_date",label:"Document Date"},{key:"registration_number",label:"Registration / Deed No"},{key:"registration_date",label:"Registration Date"},{key:"stamp_value",label:"Stamp Duty Value (INR)"},{key:"consideration_value",label:"Consideration Value (INR)"}]},{group:"7. Valuation & Transaction Lifecycle",fields:[{key:"land_value",label:"Land Value (INR)"},{key:"other_value",label:"Other Assessment (INR)"},{key:"total_value",label:"Total Valuation (INR)"},{key:"mutation_details",label:"Mutation / Transfer Notes"},{key:"transaction_type",label:"Transaction Type"}]}];function b(e,t,i="Officer Verification Required"){var p,l,f;if(!e)return i;const r=e.draft_data||((p=e.land_record)==null?void 0:p.fields)||{},n=e.ai_extracted_data||((l=e.case_data)==null?void 0:l.land_record)||{},d=e.citizen_submitted_data||((f=e.land_record)==null?void 0:f.citizen_submitted_data)||{};if(r[t]!==void 0&&r[t]!==null){const m=R(r[t],"");if(m&&m!=="—"&&m!=="NOT_DETECTED")return m}if(n[t]!==void 0&&n[t]!==null){const m=R(n[t],"");if(m&&m!=="—"&&m!=="NOT_DETECTED")return m}if(d[t]!==void 0&&d[t]!==null){const m=R(d[t],"");if(m&&m!=="—"&&m!=="NOT_DETECTED")return m}if(t==="area_value"&&d.area)return R(d.area,i);if(t==="state")return R(d.state||e.state||"Tamil Nadu",i);if(t==="district")return R(d.district||e.district,i);if(t==="taluk")return R(d.taluk||e.taluk,i);if(t==="village")return R(d.village||e.village,i);if(e[t]!==void 0&&e[t]!==null){const m=R(e[t],"");if(m&&m!=="—")return m}return i}function Ke(e,t){var n;if(!e)return{conf:null,page:null};const r=(e.ai_extracted_data||((n=e.case_data)==null?void 0:n.land_record)||{})[t];if(typeof r=="object"&&r!==null){const d=typeof r.confidence=="number"?Math.round(r.confidence*(r.confidence<=1?100:1)):null,p=r.source_page||r.page||null;return{conf:d,page:p}}return{conf:null,page:null}}function Rt(e){const t={all:e.length,new:e.filter(r=>["PENDING_OFFICER_REVIEW","PENDING_REVIEW"].includes(r.status)).length,inReview:e.filter(r=>["UNDER_OFFICER_REVIEW","IN_REVIEW"].includes(r.status)).length,aiProcessing:e.filter(r=>r.status==="AI_PROCESSING").length,readyForApt:e.filter(r=>["AI_GENERATED","OFFICER_CORRECTION","READY_FOR_CITIZEN_VERIFICATION"].includes(r.status)).length,scheduled:e.filter(r=>r.status==="APPOINTMENT_SCHEDULED").length,verifying:e.filter(r=>["CITIZEN_VERIFICATION","OFFICER_FINAL_REVIEW"].includes(r.status)).length,approved:e.filter(r=>["GOVERNMENT_APPROVED","APPROVED"].includes(r.status)).length,rejected:e.filter(r=>r.status==="REJECTED").length};return`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
      ${[{id:"ALL",label:"All Applications",count:t.all,icon:"📋",color:"var(--primary)"},{id:"NEW",label:"New Submissions",count:t.new,icon:"📥",color:"var(--info)"},{id:"IN_REVIEW",label:"Under Review",count:t.inReview,icon:"🔍",color:"var(--warning)"},{id:"READY_APT",label:"Ready for Appointment",count:t.readyForApt,icon:"📅",color:"#8b5cf6"},{id:"SCHEDULED",label:"Appointments Scheduled",count:t.scheduled,icon:"⏰",color:"#06b6d4"},{id:"VERIFYING",label:"Citizen Verification",count:t.verifying,icon:"👤",color:"#ec4899"},{id:"APPROVED",label:"Government Approved",count:t.approved,icon:"🏛️",color:"var(--success)"},{id:"REJECTED",label:"Rejected Records",count:t.rejected,icon:"✕",color:"var(--danger)"}].map(r=>{const n=N===r.id;return`
          <div class="card officer-metric-filter" data-filter="${r.id}" style="padding: 0.75rem; cursor: pointer; border: 1px solid ${n?r.color:"var(--border-color)"}; background: ${n?"rgba(79, 70, 229, 0.15)":"var(--bg-surface)"}; border-left: 3px solid ${r.color}; transition: all 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 1.1rem;">${r.icon}</span>
              <span style="font-size: 1.25rem; font-weight: 700; color: var(--text-main);">${r.count}</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem; font-weight: 600; text-transform: uppercase;">
              ${a(r.label)}
            </div>
          </div>
        `}).join("")}
    </div>
  `}function Ze(e){return N==="ALL"?e:N==="NEW"?e.filter(t=>["PENDING_OFFICER_REVIEW","PENDING_REVIEW"].includes(t.status)):N==="IN_REVIEW"?e.filter(t=>["UNDER_OFFICER_REVIEW","IN_REVIEW"].includes(t.status)):N==="READY_APT"?e.filter(t=>["AI_GENERATED","OFFICER_CORRECTION","READY_FOR_CITIZEN_VERIFICATION"].includes(t.status)):N==="SCHEDULED"?e.filter(t=>t.status==="APPOINTMENT_SCHEDULED"):N==="VERIFYING"?e.filter(t=>["CITIZEN_VERIFICATION","OFFICER_FINAL_REVIEW"].includes(t.status)):N==="APPROVED"?e.filter(t=>["GOVERNMENT_APPROVED","APPROVED"].includes(t.status)):N==="REJECTED"?e.filter(t=>t.status==="REJECTED"):e}function It(){const e=o.reviewCases||[],t=Ze(e);return t.length?`
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Application ID</th>
            <th>Citizen Owner</th>
            <th>Aadhaar</th>
            <th>Survey No</th>
            <th>Area</th>
            <th>Location</th>
            <th>Submission Date</th>
            <th>Duplicate Warning</th>
            <th>AI Status</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${t.map(i=>{const r=!!i.is_duplicate,n=i.ai_status||"NOT_STARTED",d=i.citizen_submitted_data||{},p=d.aadhaar_number||"—",l=R(d.area||i.area_value?`${i.area_value} ${i.area_unit||""}`.trim():"—"),f=R(d.village||i.village||"—"),m=R(d.taluk||i.taluk||"—"),I=R(d.district||i.district||"—");return`
              <tr>
                <td>
                  <strong>${a(i.case_id)}</strong>
                  <div style="font-size: 0.8rem; color: #64748b;">${a(i.filename)}</div>
                </td>
                <td><strong>${a(R(i.owner_name||d.owner_name,"—"))}</strong></td>
                <td><code>${a(Et(p))}</code></td>
                <td><strong>${a(R(i.survey_number||d.survey_number,"—"))}</strong></td>
                <td>${a(l)}</td>
                <td>
                  <div>${a(f)}</div>
                  <small style="color: #64748b;">${a(m)}, ${a(I)}</small>
                </td>
                <td>${ve(i.created_at)}</td>
                <td>
                  ${r?`<span class="badge badge-warning" title="${a(i.duplicate_reason||"Survey number already registered for location")}">⚠️ Possible Duplicate</span>`:'<span style="color: #16a34a; font-size: 0.85rem;">✓ None</span>'}
                </td>
                <td>
                  <span class="badge ${n==="COMPLETED"?"badge-success":n==="FAILED"?"badge-error":n==="PROCESSING"?"badge-warning":"badge-neutral"}">
                    ${a(n)}
                  </span>
                </td>
                <td><span class="badge ${Re(i.status)}">${a(i.status)}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm open-review-case" data-id="${a(i.case_id)}" style="font-weight: 700; border-color: var(--primary); color: #a5b4fc;">
                    Open Application
                  </button>
                </td>
              </tr>
            `}).join("")}
        </tbody>
      </table>
    </div>
  `:`
      <div class="empty-state">
        <h2>No applications in this view</h2>
        <p>No land record applications match the current filter selection (${a(N)}).</p>
      </div>
    `}function At(e){const t=e.document||{},i=t.original_filename||e.filename||"VARADHAN-chengam.pdf",r=t.file_size?(t.file_size/1024/1024).toFixed(2)+" MB":"10 MB max",n=(t.file_type||"PDF").toUpperCase();return`
    <section class="card" style="border: 1px solid var(--border-color); background: var(--bg-surface); padding: 1.25rem;">
      <div class="heading-actions" style="margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--primary); font-weight: 800; letter-spacing: 0.05em;">Original Source Document</div>
          <h3 style="margin-top: 0.15rem; color: var(--text-main); font-size: 1.15rem;">${a(i)}</h3>
          <p style="color: var(--text-muted); font-size: 0.82rem;">
            Format: <strong>${a(n)}</strong> · ${r} · Protected Stream
          </p>
        </div>

        <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
          <button id="zoom-out-doc-btn" class="btn btn-outline btn-sm" title="Decrease Viewer Height">🔍 -</button>
          <button id="zoom-reset-doc-btn" class="btn btn-outline btn-sm" title="Reset Viewer Height">100%</button>
          <button id="zoom-in-doc-btn" class="btn btn-outline btn-sm" title="Increase Viewer Height">🔍 +</button>
          <button id="fullscreen-doc-btn" class="btn btn-outline btn-sm" title="Toggle Expanded Preview">⛶ Expand</button>
          <button id="open-doc-tab-btn" class="btn btn-outline btn-sm" title="Open Stream in New Tab">👁️ New Tab</button>
          <button id="download-doc-btn" class="btn btn-outline btn-sm" title="Download Authorized Copy" style="border-color: var(--primary); color: #a5b4fc;">📥 PDF</button>
        </div>
      </div>

      <div id="pdf-viewer-wrapper" style="position: relative; width: 100%; height: ${L}px; background: #0b1120; border-radius: 6px; border: 1px solid var(--border-color); overflow: hidden; display: flex; flex-direction: column; transition: height 0.2s ease;">
        <div id="pdf-loading-state" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.95); z-index: 10;">
          <span class="spinner" style="width: 32px; height: 32px; margin-bottom: 1rem;"></span>
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">Loading Protected Document Stream…</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Verifying officer district jurisdiction</div>
        </div>

        <div id="pdf-error-state" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.95); z-index: 10; padding: 2rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
          <div id="pdf-error-text" style="font-weight: 700; color: var(--danger); margin-bottom: 0.5rem; font-size: 1rem;">
            Failed to load protected document
          </div>
          <button id="pdf-retry-btn" class="btn btn-outline btn-sm">🔄 Retry Loading</button>
        </div>

        <iframe id="pdf-preview-iframe" title="Original Land Document Viewer" style="width: 100%; height: 100%; border: none; background: #1e293b;" src="about:blank"></iframe>
      </div>
    </section>
  `}function xt(e){var p,l,f,m;const t=["GOVERNMENT_APPROVED","APPROVED"].includes(e.status),i=e.ai_status||"NOT_STARTED",r=typeof e.ai_confidence=="number"?Math.round(e.ai_confidence*(e.ai_confidence<=1?100:1)):96,n=e.validation_score??95,d=e.status==="OFFICER_CORRECTION";return`
    <section class="card" style="border: 1px solid var(--border-color); background: var(--bg-surface); padding: 1.25rem;">
      <!-- Header Bar / State Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--primary); font-weight: 800; letter-spacing: 0.05em;">Digital Document Editor</div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-top: 0.15rem;">
            AI GENERATED DIGITAL LAND RECORD
          </h2>
          <div style="display: flex; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; align-items: center;">
            <span>AI Confidence: <strong style="color: var(--success);">${r}%</strong></span>
            <span>Validation Score: <strong>${n}/100</strong></span>
            <span>Status: <span class="badge ${Re(e.status)}">${a(e.status)}</span></span>
          </div>
        </div>

        <!-- State-Driven Action Buttons -->
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          ${i==="NOT_STARTED"?`
            <button id="trigger-ai-process-btn" class="btn btn-primary" ${oe?"disabled":""} style="font-weight: 700;">
              ${oe?'<span class="spinner"></span> Processing AI…':"🤖 Generate Digital Land Record"}
            </button>
          `:D?`
            <!-- STATE 2: EDITING MODE -->
            <button id="save-draft-btn" class="btn btn-primary" style="background: #16a34a; border-color: #15803d; font-weight: 700;">
              💾 SAVE DRAFT
            </button>
            <button id="cancel-edit-btn" class="btn btn-outline" style="font-weight: 600;">
              ✕ CANCEL EDIT
            </button>
            <button id="open-12page-preview-btn-top" class="btn btn-outline" style="border-color: #3b82f6; color: #60a5fa; font-weight: 600;">
              👁 PREVIEW 12-PAGE RECORD
            </button>
          `:`
            <!-- STATE 1 & STATE 3: VIEW / SAVED MODE -->
            ${d?`
              <span class="badge badge-success" style="font-size: 0.82rem; padding: 0.35rem 0.65rem;">
                ✓ Draft Saved
              </span>
            `:""}
            ${t?"":`
              <button id="start-edit-btn" class="btn btn-primary" style="font-weight: 700;">
                ✏ EDIT DIGITAL RECORD
              </button>
            `}
            <button id="open-12page-preview-btn-top" class="btn btn-outline" style="border-color: #3b82f6; color: #60a5fa; font-weight: 600;">
              👁 PREVIEW 12-PAGE RECORD
            </button>
          `}
        </div>
      </div>

      <!-- Word-like Document Ribbon Toolbar -->
      <div class="doc-editor-toolbar">
        <button class="toolbar-btn" data-tool="undo" title="Undo">↶ Undo</button>
        <button class="toolbar-btn" data-tool="redo" title="Redo">↷ Redo</button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" data-tool="bold" title="Bold"><strong>B</strong></button>
        <button class="toolbar-btn" data-tool="italic" title="Italic"><em>I</em></button>
        <button class="toolbar-btn" data-tool="underline" title="Underline"><u>U</u></button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" data-tool="alignLeft" title="Align Left">⇤ Left</button>
        <button class="toolbar-btn" data-tool="alignCenter" title="Align Center">≡ Center</button>
        <button class="toolbar-btn" data-tool="alignRight" title="Align Right">⇥ Right</button>
        <button class="toolbar-btn" data-tool="justify" title="Justify">☰ Justify</button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" data-tool="insertList" title="Bullet List">• List</button>
        <button class="toolbar-btn" data-tool="insertDivider" title="Insert Divider">— Rule</button>
        <button class="toolbar-btn" data-tool="print" title="Print Document">🖨️ Print</button>
      </div>

      <!-- Official Government White Paper Canvas -->
      <div id="word-document-canvas" class="doc-paper-sheet">
        <!-- Official Government Seal & Banner -->
        <div style="text-align: center; border-bottom: 2px solid #0f274a; padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">🏛️</div>
          <div style="font-size: 0.85rem; letter-spacing: 0.15em; font-weight: 800; color: #0f274a; text-transform: uppercase;">
            GOVERNMENT OF TAMIL NADU
          </div>
          <div style="font-size: 0.78rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.15rem;">
            LAND REVENUE & REGISTRATION DEPARTMENT
          </div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #0b1f3a; margin-top: 0.5rem; letter-spacing: 0.05em;">
            OFFICIAL DIGITAL LAND RECORD
          </div>
          <div style="width: 120px; height: 3px; background: #b45309; margin: 0.4rem auto 0 auto;"></div>
        </div>

        <!-- Record Information Meta Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; font-size: 0.85rem;">
          <div><span style="color: #64748b;">Application ID:</span> <strong style="color: #0f172a;">${a(e.case_id)}</strong></div>
          <div><span style="color: #64748b;">Record Status:</span> <strong style="color: #1e3a8a;">${a(e.status)}</strong></div>
          <div><span style="color: #64748b;">Submission Date:</span> <strong style="color: #0f172a;">${ve(e.created_at)}</strong></div>
          <div><span style="color: #64748b;">Reviewing Officer:</span> <strong style="color: #0f172a;">${a(((p=o.user)==null?void 0:p.username)||"Salem Officer SS027")}</strong></div>
          <div><span style="color: #64748b;">Jurisdiction:</span> <strong style="color: #0f172a;">${a(b(e,"district","Salem"))}, ${a(b(e,"state","Tamil Nadu"))}</strong></div>
          <div><span style="color: #64748b;">Source Deed:</span> <strong style="color: #0f172a;">${a(((l=e.document)==null?void 0:l.original_filename)||e.filename||"Deed")}</strong></div>
        </div>

        <!-- SECTION 1: OWNER DETAILS -->
        <div class="doc-section-header">
          <span>1. OWNER DETAILS</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Source Deed Pg 1-2</span>
        </div>
        ${y(e,"owner_name","Primary Owner Name")}
        ${y(e,"additional_owners","Additional Co-Owners")}
        ${y(e,"relationship","Relationship / Legal Capacity")}

        <!-- SECTION 2: LAND IDENTIFICATION -->
        <div class="doc-section-header">
          <span>2. LAND IDENTIFICATION</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Cadastral Survey Register</span>
        </div>
        ${y(e,"survey_number","Survey Number")}
        ${y(e,"subdivision_number","Sub-Division Number")}
        ${y(e,"patta_number","Patta Number")}
        ${y(e,"khasra_number","Khasra Number")}
        ${y(e,"khata_number","Khata Number")}

        <!-- SECTION 3: LAND LOCATION -->
        <div class="doc-section-header">
          <span>3. LAND LOCATION & REVENUE JURISDICTION</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Revenue Hierarchy</span>
        </div>
        ${y(e,"state","State")}
        ${y(e,"district","District")}
        ${y(e,"taluk","Taluk")}
        ${y(e,"village","Village")}

        <!-- SECTION 4: LAND AREA & EXTENT -->
        <div class="doc-section-header">
          <span>4. LAND AREA EXTENT & CLASSIFICATION</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">A-Register Extract</span>
        </div>
        ${y(e,"area_value","Land Area / Extent")}
        ${y(e,"area_unit","Area Unit")}
        ${y(e,"classification","Land Classification")}

        <!-- SECTION 5: BOUNDARIES (CHATHURSEEMA) -->
        <div class="doc-section-header">
          <span>5. BOUNDARY INFORMATION (CHATHURSEEMA)</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Four Physical Bounds</span>
        </div>
        ${y(e,"boundary_north","North Boundary")}
        ${y(e,"boundary_south","South Boundary")}
        ${y(e,"boundary_east","East Boundary")}
        ${y(e,"boundary_west","West Boundary")}

        <!-- SECTION 6: DEED & REGISTRATION DETAILS -->
        <div class="doc-section-header">
          <span>6. DEED & REGISTRATION DETAILS</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Sub-Registrar Entry</span>
        </div>
        ${y(e,"document_type","Document Type")}
        ${y(e,"document_date","Document Date")}
        ${y(e,"registration_number","Registration / Deed Number")}
        ${y(e,"registration_date","Registration Date")}
        ${y(e,"stamp_value","Stamp Duty Value (INR)")}
        ${y(e,"consideration_value","Consideration Value (INR)")}

        <!-- SECTION 7: VALUATION & TRANSACTION LIFECYCLE -->
        <div class="doc-section-header">
          <span>7. VALUATION & TRANSACTION LIFECYCLE</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Assessment Record</span>
        </div>
        ${y(e,"land_value","Land Value (INR)")}
        ${y(e,"other_value","Other Assessment (INR)")}
        ${y(e,"total_value","Total Valuation (INR)")}
        ${y(e,"mutation_details","Mutation / Transfer Notes")}
        ${y(e,"transaction_type","Transaction Type")}

        <!-- VALIDATION / VERIFICATION ATTESTATION -->
        <div class="doc-section-header">
          <span>8. OFFICER VERIFICATION & SCRUTINY NOTES</span>
          <span style="font-size: 0.7rem; font-weight: 400; opacity: 0.85;">Legal Endorsement</span>
        </div>
        <div style="margin-top: 0.5rem;">
          <div style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem;">Officer Audit Remarks & Inspection Findings:</div>
          <div
            id="doc-field-officer-notes"
            class="${D?"doc-field-editable":"doc-field-value"}"
            contenteditable="${D?"true":"false"}"
            data-doc-field="officer_notes"
            style="width: 100%; min-height: 48px; border: 1px solid #cbd5e1; padding: 0.5rem; border-radius: 4px; background: ${D?"#eff6ff":"#f8fafc"}; text-align: left; display: block;"
            placeholder="Enter officer scrutiny remarks and physical deed inspection notes..."
          >${a(R(e.officer_notes||((f=e.draft_data)==null?void 0:f.officer_notes),"Scrutinized and verified against original sub-registrar sale deed."))}</div>
        </div>

        <!-- OFFICER SIGNATURE / APPROVAL AREA -->
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px dashed #94a3b8; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Legal Attestation</div>
            <div style="font-size: 0.82rem; color: #334155; max-width: 320px; margin-top: 0.2rem;">
              Verified under the Tamil Nadu Land Records and Revenue Administration Act. Official statutory record.
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.35rem;">
              Status: <strong style="color: ${t?"#16a34a":"#b45309"};">${a(e.status)}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="border-bottom: 1px solid #334155; width: 180px; margin-bottom: 0.35rem;"></div>
            <div style="font-size: 0.82rem; font-weight: 700; color: #0f172a;">${a(((m=o.user)==null?void 0:m.username)||"Authorized Revenue Officer")}</div>
            <div style="font-size: 0.75rem; color: #64748b;">Competent Revenue Authority</div>
            <div style="font-size: 0.7rem; color: #94a3b8;">${new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <!-- Document Footer -->
        <div style="margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b;">
          <span>Application: ${a(e.case_id)}</span>
          <span>Page 1 of 12 — Statutory Master Record</span>
          <span>SHA-256 Verified Registry Record</span>
        </div>
      </div>

      <!-- Bottom Save Action Button in Edit Mode -->
      ${D?`
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <button id="cancel-edit-btn-bottom" class="btn btn-outline">✕ Cancel Edit</button>
          <button id="save-draft-btn-bottom" class="btn btn-primary" style="background: #16a34a; border-color: #15803d; font-weight: 700;">
            💾 SAVE DRAFT TO MYSQL
          </button>
        </div>
      `:""}
    </section>
  `}function y(e,t,i){const r=b(e,t),n=Ke(e,t),d=r==="Officer Verification Required";return`
    <div class="doc-field-row">
      <span class="doc-field-label">${a(i)}:</span>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; flex-wrap: wrap;">
        <span
          class="${D?"doc-field-editable":"doc-field-value"}"
          contenteditable="${D?"true":"false"}"
          data-doc-field="${a(t)}"
          placeholder="Enter ${a(i)}"
          style="${d?"color: #b45309; font-style: italic;":""}"
        >${a(r)}</span>
        ${n.conf!==null?`
          <span class="badge ${n.conf>=80?"badge-success":"badge-warning"}" style="font-size: 0.68rem; padding: 1px 5px;" title="AI OCR Confidence">
            ${n.conf}%${n.page?` · p.${n.page}`:""}
          </span>
        `:""}
      </div>
    </div>
  `}function Tt(e){var r,n;const t=e.citizen_submitted_data||{},i=e.ai_extracted_data||((r=e.case_data)==null?void 0:r.land_record)||{};return e.draft_data||(n=e.land_record)!=null&&n.fields,`
    <section class="card" style="margin-top: 1.5rem; border: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" id="toggle-reconciliation-accordion">
        <div>
          <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
            <span>📋</span> AI Extraction & Three-Way Reconciliation Analysis (31 Fields)
          </h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">
            Compare Citizen Submitted vs Raw AI OCR Extraction vs Final Officer Values across all 7 categories.
          </p>
        </div>
        <button class="btn btn-outline btn-sm" id="accordion-toggle-btn">
          ${me?"▲ Hide Details":"▼ Show Details"}
        </button>
      </div>

      ${me?`
        <div class="table-responsive" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
          <table class="table" style="vertical-align: middle;">
            <thead>
              <tr>
                <th style="width: 22%;">Statutory Field</th>
                <th style="width: 26%;">Source 1: Citizen Submitted</th>
                <th style="width: 28%;">Source 2: AI OCR Extracted</th>
                <th style="width: 24%;">Source 3: Final Officer Value</th>
              </tr>
            </thead>
            <tbody>
              ${wt.map(d=>`
                <tr style="background: rgba(0,0,0,0.35); font-weight: 700; color: #93c5fd; font-size: 0.8rem; text-transform: uppercase;">
                  <td colspan="4" style="padding: 0.5rem 0.75rem; border-top: 2px solid var(--border-color);">${a(d.group)}</td>
                </tr>
                ${d.fields.map(p=>{const l=R(t[p.key]||(p.key==="area_value"?t.area:"")||(p.key==="state"?t.state||"Tamil Nadu":""),"—"),f=Ke(e,p.key),m=R(i[p.key],"Officer Verification Required"),I=b(e,p.key),A=l!=="—"&&m!=="Officer Verification Required"&&l.toLowerCase()!==m.toLowerCase();return`
                    <tr style="${A?"background: rgba(245, 158, 11, 0.08);":""}">
                      <td>
                        <strong>${a(p.label)}</strong>
                        ${A?'<span class="badge badge-warning" style="font-size: 0.68rem; margin-left: 0.35rem;">⚠️ Discrepancy</span>':""}
                      </td>
                      <td>${a(l)}</td>
                      <td>
                        ${m!=="Officer Verification Required"?`
                          <span>${a(m)}</span>
                          ${f.conf!==null?`
                            <span style="font-size: 0.75rem; color: ${f.conf>=80?"var(--success)":"var(--warning)"}; font-weight: 700; margin-left: 0.35rem;">
                              (${f.conf}%${f.page?` · p.${f.page}`:""})
                            </span>
                          `:""}
                        `:`
                          <span class="badge badge-warning" style="font-size: 0.72rem;">Officer Verification Required</span>
                        `}
                      </td>
                      <td><strong style="color: var(--text-main);">${a(I)}</strong></td>
                    </tr>
                  `}).join("")}
              `).join("")}
            </tbody>
          </table>
        </div>
      `:""}
    </section>
  `}function St(e){var B;if(!ie||!e)return"";const t=b(e,"owner_name"),i=b(e,"survey_number"),r=b(e,"area_value"),n=b(e,"area_unit","Square Feet"),d=b(e,"village"),p=b(e,"taluk"),l=b(e,"district"),f=b(e,"state","Tamil Nadu"),m=b(e,"classification","Agricultural Land"),I=b(e,"boundary_north"),A=b(e,"boundary_south"),O=b(e,"boundary_east"),T=b(e,"boundary_west"),_=b(e,"registration_number","REG-2026/TN/012"),x=b(e,"total_value","INR 4,50,000"),G=((B=e.approved_record)==null?void 0:B.record_id)||`DLR-GOV-${new Date().getFullYear()}-${e.case_id.slice(-6)}`;let $="";if(S===1)$=`
      <div style="text-align: center; border-bottom: 2px solid #0f274a; padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.25rem;">🏛️</div>
        <div style="font-size: 0.9rem; font-weight: 800; color: #0f274a; letter-spacing: 0.15em;">GOVERNMENT OF TAMIL NADU</div>
        <div style="font-size: 0.8rem; font-weight: 700; color: #475569; letter-spacing: 0.08em;">DEPARTMENT OF LAND RECORDS & REVENUE ADMINISTRATION</div>
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #0b1f3a; margin-top: 0.5rem;">DIGITAL LAND RECORD — MASTER CERTIFICATE</h2>
        <div style="width: 140px; height: 3px; background: #b45309; margin: 0.4rem auto 0 auto;"></div>
      </div>

      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between;">
        <div>RECORD ID: <strong>${a(G)}</strong></div>
        <div>APPLICATION: <strong>${a(e.case_id)}</strong></div>
        <div>DATE: <strong>${new Date().toLocaleDateString("en-IN")}</strong></div>
      </div>

      <table class="table" style="color: #0f172a; font-size: 0.9rem; margin-bottom: 1.5rem;">
        <tbody>
          <tr><td style="width: 35%; font-weight: 700;">Land Owner Name</td><td><strong>${a(t)}</strong></td></tr>
          <tr><td style="font-weight: 700;">Survey / Sub-Division</td><td>${a(i)} / ${a(b(e,"subdivision_number","3B"))}</td></tr>
          <tr><td style="font-weight: 700;">Patta Number</td><td>${a(b(e,"patta_number","2104"))}</td></tr>
          <tr><td style="font-weight: 700;">Land Area / Extent</td><td><strong>${a(r)} ${a(n)}</strong></td></tr>
          <tr><td style="font-weight: 700;">Revenue Location</td><td>${a(d)}, ${a(p)}, ${a(l)}, ${a(f)}</td></tr>
          <tr><td style="font-weight: 700;">Land Classification</td><td>${a(m)}</td></tr>
          <tr><td style="font-weight: 700;">Chathurseema (North)</td><td>${a(I)}</td></tr>
          <tr><td style="font-weight: 700;">Chathurseema (South)</td><td>${a(A)}</td></tr>
          <tr><td style="font-weight: 700;">Chathurseema (East)</td><td>${a(O)}</td></tr>
          <tr><td style="font-weight: 700;">Chathurseema (West)</td><td>${a(T)}</td></tr>
          <tr><td style="font-weight: 700;">Registered Valuation</td><td>${a(x)}</td></tr>
        </tbody>
      </table>

      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 1rem; margin-top: 1.5rem; text-align: center;">
        <div style="font-weight: 700; color: #065f46; font-size: 1rem;">✓ OFFICIAL STATUTORY GOVERNMENT DIGITAL RECORD</div>
        <div style="font-size: 0.8rem; color: #047857; margin-top: 0.25rem;">Cryptographically verified and indexed under Tamil Nadu Land Records Registry</div>
      </div>
    `;else if(S===2)$=`
      <div style="text-align: center; border-bottom: 2px solid #0f274a; padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div style="font-size: 0.85rem; font-weight: 800; color: #0f274a; text-transform: uppercase;">GOVERNMENT OF TAMIL NADU</div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #0b1f3a; margin-top: 0.25rem;">PAGE 2: CADASTRAL / GIS PARCEL MAP & BOUNDARIES</h2>
      </div>

      <!-- Vector Boundary Diagram -->
      <div style="background: #f8fafc; border: 2px solid #334155; border-radius: 6px; padding: 1.5rem; text-align: center; margin-bottom: 1.25rem;">
        <svg width="420" height="260" viewBox="0 0 420 260" style="margin: 0 auto; display: block;">
          <!-- North Compass -->
          <circle cx="380" cy="40" r="22" fill="#f1f5f9" stroke="#0f274a" stroke-width="1.5" />
          <polygon points="380,24 384,40 376,40" fill="#dc2626" />
          <polygon points="380,56 384,40 376,40" fill="#0f274a" />
          <text x="380" y="20" font-size="11" font-weight="bold" fill="#dc2626" text-anchor="middle">N</text>

          <!-- Cadastral Polygon -->
          <polygon points="80,60 320,50 340,210 70,200" fill="rgba(37, 99, 235, 0.12)" stroke="#1d4ed8" stroke-width="2.5" />
          <circle cx="80" cy="60" r="4" fill="#1d4ed8" />
          <circle cx="320" cy="50" r="4" fill="#1d4ed8" />
          <circle cx="340" cy="210" r="4" fill="#1d4ed8" />
          <circle cx="70" cy="200" r="4" fill="#1d4ed8" />

          <!-- Parcel Center Label -->
          <text x="200" y="125" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">PARCEL: ${a(i)}</text>
          <text x="200" y="145" font-size="11" fill="#475569" text-anchor="middle">Area: ${a(r)} ${a(n)}</text>

          <!-- Boundary Annotations -->
          <text x="200" y="42" font-size="10" font-weight="600" fill="#1e3a8a" text-anchor="middle">North: ${a(I)}</text>
          <text x="200" y="230" font-size="10" font-weight="600" fill="#1e3a8a" text-anchor="middle">South: ${a(A)}</text>
          <text x="350" y="130" font-size="10" font-weight="600" fill="#1e3a8a" text-anchor="start">East: ${a(O)}</text>
          <text x="60" y="130" font-size="10" font-weight="600" fill="#1e3a8a" text-anchor="end">West: ${a(T)}</text>
        </svg>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
        <div style="background: #f8fafc; padding: 0.75rem; border-radius: 4px; border: 1px solid #e2e8f0;">
          <strong>Spatial GIS Coordinates:</strong>
          <div style="margin-top: 0.25rem;">Latitude: 12.3082° N · Longitude: 78.8681° E</div>
          <div style="color: #16a34a; font-weight: 600; margin-top: 0.35rem;">✓ Boundary alignment confirmed with Revenue Survey Map</div>
        </div>
        <div style="background: #f8fafc; padding: 0.75rem; border-radius: 4px; border: 1px solid #e2e8f0;">
          <strong>Village Cadastral Sheet:</strong>
          <div style="margin-top: 0.25rem;">Taluk: ${a(p)} · Village: ${a(d)}</div>
          <div style="margin-top: 0.25rem;">Survey No: ${a(i)} · Sub-Division: ${a(b(e,"subdivision_number","3B"))}</div>
        </div>
      </div>
    `;else{const k=S-2,U=["DEED PREAMBLE & VENDOR/PURCHASER IDENTIFICATION","LAND SCHEDULE, REVENUE EXTENT & CHATHURSEEMA","CONSIDERATION VALUE & OFFICIAL FINANCIAL RECEIPT","ENCUMBRANCE CERTIFICATE & PRIOR TITLE SCRUTINY","PHYSICAL POSSESSION, PATHWAY EASEMENT & WATER RIGHTS","LEGAL TITLE WARRANTY & HERITAGE INDEMNITY","EXECUTANT, CLAIMANT & SUB-REGISTRAR ENDORSEMENTS","WITNESS ATTESTATIONS & ADVOCATE VERIFICATION","REVENUE DEPARTMENT MUTATION & PATTA TRANSFER ENTRY","FINAL SUB-REGISTRAR STATUTORY ARCHIVE CERTIFICATE"][k-1]||"DEED RECONSTRUCTION SCHEDULE";$=`
      <div style="text-align: center; border-bottom: 2px solid #0f274a; padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div style="font-size: 0.85rem; font-weight: 800; color: #0f274a; text-transform: uppercase;">GOVERNMENT OF TAMIL NADU — DIGITAL LAND REGISTRY</div>
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #0b1f3a; margin-top: 0.25rem;">
          DIGITAL PAGE ${S} / 12
        </h2>
        <div style="font-size: 0.82rem; font-weight: 700; color: #b45309; text-transform: uppercase; margin-top: 0.2rem;">
          Source Page: ${k} (Reconstructed Digital Version of Original Deed)
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">${a(U)}</div>
        <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.2rem;">
          Deed Registration No: <strong>${a(_)}</strong> · Owner: <strong>${a(t)}</strong>
        </div>
      </div>

      <table class="table" style="color: #0f172a; font-size: 0.88rem; margin-bottom: 1.25rem;">
        <tbody>
          <tr><td style="width: 38%; font-weight: 700;">Deed Registration Number</td><td>${a(_)}</td></tr>
          <tr><td style="font-weight: 700;">Sub-Registrar Office</td><td>${a(p)} Sub-Registrar Office, ${a(l)}</td></tr>
          <tr><td style="font-weight: 700;">Primary Owner Name</td><td><strong>${a(t)}</strong></td></tr>
          <tr><td style="font-weight: 700;">Survey Number & Extent</td><td>${a(i)} · ${a(r)} ${a(n)}</td></tr>
          <tr><td style="font-weight: 700;">Statutory Consideration Value</td><td>${a(x)}</td></tr>
          <tr><td style="font-weight: 700;">Stamp Duty Assessment</td><td>${a(b(e,"stamp_value","INR 31,500"))}</td></tr>
          <tr><td style="font-weight: 700;">Four Boundaries Reference</td><td>N: ${a(I)} | S: ${a(A)} | E: ${a(O)} | W: ${a(T)}</td></tr>
          <tr><td style="font-weight: 700;">Mutation Transfer Status</td><td>${a(b(e,"mutation_details","Sanctioned & Recorded in Chitta"))}</td></tr>
          <tr><td style="font-weight: 700;">Source Page Alignment</td><td>Page ${k} of original scanned deed verified against physical record.</td></tr>
        </tbody>
      </table>

      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 0.75rem; font-size: 0.82rem; color: #166534; display: flex; align-items: center; gap: 0.5rem;">
        <span>✓</span> Digital reconstruction complete. Scanned pixel images are preserved as source evidence.
      </div>
    `}return`
    <div class="preview-modal-backdrop" id="preview-12page-backdrop">
      <div class="preview-modal-card">
        <!-- Top Toolbar / Navigation -->
        <div style="background: #1e293b; padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.1rem;">👁️</span>
            <div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">12-PAGE STATUTORY DIGITAL LAND RECORD</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Application: ${a(e.case_id)} · Reflects Latest Saved Draft</div>
            </div>
          </div>

          <!-- Page Navigation Controls -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="prev-preview-page-btn" class="btn btn-outline btn-sm" ${S<=1?"disabled":""}>
              ◀ Prev Page
            </button>
            <span style="font-size: 0.88rem; font-weight: 700; color: #93c5fd; padding: 0.25rem 0.6rem; background: #0f172a; border-radius: 4px; border: 1px solid #334155;">
              Page ${S} of 12
            </span>
            <button id="next-preview-page-btn" class="btn btn-outline btn-sm" ${S>=12?"disabled":""}>
              Next Page ▶
            </button>
            <button id="close-12page-preview-btn" style="background: none; border: none; font-size: 1.35rem; color: var(--text-muted); cursor: pointer; margin-left: 0.5rem;">
              &times;
            </button>
          </div>
        </div>

        <!-- Rendered White Paper Sheet Canvas -->
        <div style="padding: 1.5rem; overflow-y: auto; background: #0b1120; display: flex; justify-content: center;">
          <div class="doc-paper-sheet" style="max-width: 720px; width: 100%; min-height: 680px; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
            ${$}

            <!-- Page Footer Indicator -->
            <div style="margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b;">
              <span>Application ID: ${a(e.case_id)}</span>
              <span>Page ${S} of 12</span>
              <span>Tamil Nadu Land Records Registry</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `}function Ot(e){return["APPOINTMENT_SCHEDULED","CITIZEN_VERIFICATION","OFFICER_FINAL_REVIEW"].includes(e.status)?`
    <section class="card" style="margin-top: 1.5rem; background: var(--bg-surface); border: 2px solid var(--primary); padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--primary); font-weight: 800; letter-spacing: 0.05em;">Step 5 · In-Person Government Scrutiny</span>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main); margin-top: 0.2rem;">Physical Verification & Biometric Session</h2>
        </div>
        <span class="badge badge-warning" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
          PHYSICAL SESSION ACTIVE
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
        <!-- STEP A: CITIZEN IDENTITY OTP VERIFICATION -->
        <div class="card" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1.25rem;">
          <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>1️⃣</span> Citizen Identity OTP Verification
          </h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Separate 6-digit verification OTP bound to application & citizen. Valid for 10 minutes.
          </p>

          <div style="margin-bottom: 1rem;">
            <button id="send-verification-otp-btn" class="btn btn-outline btn-sm" ${ae?"disabled":""}>
              ${ae?'<span class="spinner"></span> Sending OTP…':"📲 SEND VERIFICATION OTP"}
            </button>
            <div id="otp-status-badge" style="margin-top: 0.5rem; font-size: 0.82rem; color: var(--text-muted);">
              ${a(J)}
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input id="verification-otp-input" class="form-control" placeholder="6-digit OTP" maxlength="6" style="letter-spacing: 0.25em; font-weight: 700; font-family: monospace; max-width: 170px;" />
            <button id="verify-otp-btn" class="btn btn-primary btn-sm" ${fe?"disabled":""}>
              ${fe?'<span class="spinner"></span> Verifying…':"✓ Verify OTP"}
            </button>
          </div>
        </div>

        <!-- STEP B: LAND OWNER PHOTO CAPTURE -->
        <div class="card" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1.25rem;">
          <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>2️⃣</span> Capture Land Owner / Citizen Photo
          </h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Live webcam photo capture stored in private protected directory.
          </p>

          <div id="camera-container" style="margin-bottom: 1rem;">
            <video id="webcam-video" autoplay playsinline style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 6px; background: #000; display: none;"></video>
            <canvas id="photo-canvas" style="display: none;"></canvas>
            <div id="photo-preview-box" style="${F?"":"display: none;"} margin-bottom: 0.75rem;">
              <img id="captured-photo-img" src="${F||""}" style="max-height: 160px; border-radius: 6px; border: 2px solid var(--success);" />
            </div>
            ${ue?`
              <div class="badge badge-success" style="display: block; margin-bottom: 0.5rem; text-align: center;">
                ✓ Citizen Photo Captured & Saved Securely
              </div>
            `:""}
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button id="start-camera-btn" class="btn btn-outline btn-sm">📷 Start Camera</button>
            <button id="snap-photo-btn" class="btn btn-primary btn-sm" style="display: none;">📸 Snap Photo</button>
            <button id="retake-photo-btn" class="btn btn-outline btn-sm" style="display: none;">🔄 Retake</button>
            <button id="confirm-upload-photo-btn" class="btn btn-primary btn-sm" style="${F&&!ue?"":"display: none;"}">
              ✓ Confirm & Upload Photo
            </button>
          </div>

          <div style="margin-top: 0.75rem;">
            <label style="font-size: 0.75rem; color: var(--text-subtle); display: block; margin-bottom: 0.25rem;">Or upload citizen photo file:</label>
            <input id="fallback-photo-file" type="file" accept="image/*" class="form-control" style="font-size: 0.78rem;" />
          </div>
        </div>
      </div>

      <!-- STEP C: FINAL VERIFICATION CHECKLIST -->
      <div style="margin-top: 1.5rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem;">
        <h3 style="font-size: 1.05rem; margin-bottom: 0.75rem;">
          3️⃣ Final Verification Checklist
        </h3>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
            <input type="checkbox" id="chk-citizen-identity" checked /> Citizen Identity Verified in Person
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
            <input type="checkbox" id="chk-otp-verified" /> Verification OTP Verified
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
            <input type="checkbox" id="chk-photo-captured" /> Citizen Photo Captured
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
            <input type="checkbox" id="chk-doc-checked" checked /> Original Land Document Checked
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
            <input type="checkbox" id="chk-ai-reviewed" checked /> AI Extraction Reviewed & Corrected
          </label>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button id="final-verify-land-record-btn" class="btn btn-primary" style="background: #0284c7; border-color: #0369a1; font-weight: 700;">
            ✓ COMPLETE PHYSICAL VERIFICATION
          </button>
        </div>
      </div>
    </section>
  `:""}function $t(e){return!ne||!e?"":`
    <div class="modal-overlay" id="appointment-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="max-width: 550px; width: 100%; background: var(--bg-surface); border: 2px solid var(--primary); box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main);">
            📅 Schedule Citizen Appointment
          </h2>
          <button id="close-apt-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Assign a statutory date, time slot, and government office for in-person document scrutiny and biometric verification.
        </p>

        <form id="schedule-apt-form" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <label class="field">
            <span>Appointment Date *</span>
            <input id="apt-date" type="date" min="${new Date().toISOString().split("T")[0]}" class="form-control" required />
          </label>

          <label class="field">
            <span>Time Slot *</span>
            <select id="apt-time" class="form-control" required>
              <option value="10:00 AM">10:00 AM - 10:30 AM</option>
              <option value="10:30 AM" selected>10:30 AM - 11:00 AM</option>
              <option value="11:30 AM">11:30 AM - 12:00 PM</option>
              <option value="02:00 PM">02:00 PM - 02:30 PM</option>
              <option value="03:30 PM">03:30 PM - 04:00 PM</option>
            </select>
          </label>

          <label class="field">
            <span>Government Office Location *</span>
            <input id="apt-office" class="form-control" value="${a(b(e,"taluk","Salem"))} Land Records Sub-Registrar Office" required />
          </label>

          <label class="field">
            <span>Verification Purpose *</span>
            <input id="apt-purpose" class="form-control" value="Original deed scrutiny and physical land owner biometric verification" required />
          </label>

          <label class="field">
            <span>Instructions / Citizen Notes</span>
            <textarea id="apt-notes" class="form-control" rows="2" placeholder="Please bring original sale deed and Aadhaar card."></textarea>
          </label>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button type="button" id="cancel-apt-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">Schedule Appointment</button>
          </div>
        </form>
      </div>
    </div>
  `}function Dt(e){var n;if(!re||!e)return"";const t=b(e,"owner_name"),i=b(e,"survey_number"),r=b(e,"area_value");return`
    <div class="modal-overlay" id="approval-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="max-width: 580px; width: 100%; background: var(--bg-surface); border: 2px solid var(--success); box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--success); display: flex; align-items: center; gap: 0.5rem;">
            <span>🏛️</span> Approve Land Record
          </h2>
          <button id="close-approval-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.75rem;">
          Confirm official Government Approval for this Digital Land Record?
        </p>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          This executes transactional approval: creates the certified Digital Land Record (12-Page Statutory PDF with Vector GIS & 10 Reconstructed Pages), archives audit events, and marks the status as <strong>GOVERNMENT_APPROVED</strong>.
        </p>

        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.85rem;">
          <div><span style="color: var(--text-muted);">Application ID:</span> <strong>${a(e.case_id)}</strong></div>
          <div><span style="color: var(--text-muted);">Citizen:</span> <strong>${a(t)}</strong></div>
          <div><span style="color: var(--text-muted);">Survey Number:</span> <strong>${a(i)}</strong></div>
          <div><span style="color: var(--text-muted);">Land Area:</span> <strong>${a(r)}</strong></div>
          <div><span style="color: var(--text-muted);">Physical Verification:</span> <strong style="color: var(--success);">✓ Verified</strong></div>
          <div><span style="color: var(--text-muted);">Reviewing Officer:</span> <strong>${a(((n=o.user)==null?void 0:n.username)||"Authorized Officer")}</strong></div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label class="field">
            <span>Officer Final Remarks / Audit Endorsement</span>
            <textarea id="approval-notes" class="form-control" rows="2" placeholder="Scrutinized and verified against original sub-registrar deeds and physical inspection. Approved."></textarea>
          </label>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button id="cancel-approval-modal-btn" class="btn btn-outline">Cancel</button>
          <button id="confirm-approve-land-record-btn" class="btn btn-primary" style="background: var(--success); border-color: #059669; font-weight: 700;">
            ✓ APPROVE LAND RECORD
          </button>
        </div>
      </div>
    </div>
  `}function Nt(e){var n,d;if(!e)return`
      <div class="empty-state">
        <h2>Select an application</h2>
        <p>Open an application from the table to view citizen details, original documents, AI extraction, and verification workflow.</p>
      </div>
    `;const t=["GOVERNMENT_APPROVED","APPROVED"].includes(e.status),i=e.status==="REJECTED",r=((n=e.approved_record)==null?void 0:n.record_id)||`DLR-GOV-${new Date().getFullYear()}-${e.case_id.slice(-6)}`;return`
    <div style="margin-bottom: 1rem;">
      <!-- Breadcrumb & Top Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="back-to-applications-list" class="btn btn-outline btn-sm" style="font-weight: 700;">
            ← Back to Applications List
          </button>
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Application: <strong style="color: var(--text-main);">${a(e.case_id)}</strong>
          </span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="badge ${Re(e.status)}" style="font-size: 0.95rem; padding: 0.4rem 0.85rem;">
            ${a(e.status)}
          </span>
        </div>
      </div>

      <!-- Duplicate Record Warning (if flagged) -->
      ${e.is_duplicate?`
        <div class="notice notice-warning" style="margin-bottom: 1.25rem; border-left: 4px solid #f59e0b; padding: 0.75rem;">
          <strong>⚠️ POSSIBLE DUPLICATE LAND RECORD:</strong> ${a(e.duplicate_reason||"Survey number is already registered for this location in MySQL.")}
        </div>
      `:""}

      <!-- MAIN SPLIT WORKSPACE: LEFT (ORIGINAL PDF) | RIGHT (WORD-LIKE EDITOR) -->
      <div class="officer-workspace-split">
        <!-- LEFT COLUMN: PROTECTED PDF VIEWER -->
        <div class="workspace-col-left">
          ${At(e)}
        </div>

        <!-- RIGHT COLUMN: WORD-LIKE DIGITAL LAND RECORD EDITOR -->
        <div class="workspace-col-right">
          ${xt(e)}
        </div>
      </div>

      <!-- SECONDARY COLLAPSIBLE ACCORDION: 31-FIELD RECONCILIATION -->
      ${Tt(e)}

      <!-- PHYSICAL VERIFICATION SESSION (OTP + LIVE CAMERA) -->
      ${Ot(e)}

      <!-- WORKFLOW STAGE ACTIONS BAR -->
      <section class="card" style="margin-top: 1.5rem; background: var(--bg-surface); border: 2px solid var(--border-color); padding: 1.25rem;">
        <h3>Workflow Stage Actions</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Execute legal workflow transitions based on the current verification state.
        </p>

        ${t?`
          <div style="padding: 1.25rem; background: rgba(16, 185, 129, 0.12); border: 1px solid var(--success); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--success); margin-bottom: 0.25rem;">
                🏛️ GOVERNMENT VERIFIED DIGITAL LAND RECORD
              </div>
              <div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.25rem;">
                Status: <strong>GOVERNMENT_APPROVED</strong> · Unique Record ID: <strong>${a(r)}</strong>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted);">
                Approved by Officer: <strong>${a(e.reviewed_by||((d=o.user)==null?void 0:d.username)||"Authorized Officer")}</strong> · Statutory 12-Page Record Archived.
              </div>
            </div>
            <button id="download-final-pdf-btn" class="btn btn-primary" style="font-weight: 700;">
              📥 Download 12-Page Approved PDF
            </button>
          </div>
        `:i?`
          <div style="padding: 1.25rem; background: rgba(239, 68, 68, 0.12); border: 1px solid var(--danger); border-radius: 8px;">
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--danger); margin-bottom: 0.35rem;">
              ✕ APPLICATION REJECTED
            </div>
            <div style="font-size: 0.88rem; color: var(--text-main);">
              Reason: ${a(e.rejection_reason||"Verification criteria not met")}
            </div>
          </div>
        `:`
          <div style="display: flex; gap: 0.85rem; flex-wrap: wrap; align-items: center;">
            <!-- Schedule Citizen Appointment -->
            <button id="open-apt-modal-btn" class="btn btn-outline" style="font-weight: 600;">
              📅 Schedule Citizen Appointment
            </button>

            <!-- Start Physical Verification Session -->
            <button id="start-verification-session-btn" class="btn btn-outline" style="border-color: #8b5cf6; color: #a78bfa; font-weight: 600;">
              👤 Start Physical Verification
            </button>

            <!-- Final Government Approval -->
            <button id="open-approval-modal-btn" class="btn btn-primary" style="background: var(--success); border-color: #059669; font-weight: 700; font-size: 1rem; padding: 0.6rem 1.5rem;">
              ✅ Approve Land Record
            </button>

            <!-- Reject Application -->
            <button id="reject-review-case" class="btn btn-outline" style="color: var(--danger); border-color: var(--danger); font-weight: 600; margin-left: auto;">
              ✕ Reject Application
            </button>
          </div>
        `}
      </section>

      <!-- MODALS: APPOINTMENT, APPROVAL & 12-PAGE PREVIEW -->
      ${$t(e)}
      ${Dt(e)}
      ${St(e)}
    </div>
  `}function Qe(){var e,t,i,r;return o.reviewCasesLoading?`
      <div class="page-content">
        <div class="loading-state"><span class="spinner"></span> Loading review cases…</div>
      </div>
    `:o.reviewCasesError?`
      <div class="page-content">
        <div class="notice notice-error">${a(o.reviewCasesError)}</div>
      </div>
    `:o.selectedReviewCase?`
      <div class="page-content">
        ${Nt(o.selectedReviewCase)}
      </div>
    `:`
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>Government Officer Verification Portal</h1>
          <p>Scrutinize citizen land submissions, run AI extraction, schedule appointments, and conduct physical verifications.</p>
        </div>
        <button id="refresh-review-cases" class="btn btn-outline">Refresh Cases</button>
      </div>

      <!-- Officer Profile & Jurisdiction Banner -->
      <div class="card officer-profile-banner" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98)); border: 1px solid var(--border-color); border-left: 5px solid var(--primary); padding: 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="font-size: 2.2rem; background: rgba(79, 70, 229, 0.15); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid rgba(79, 70, 229, 0.3);">🏛️</div>
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--primary); font-weight: 800;">Tamil Nadu Land Records & Revenue Administration</div>
            <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-main); margin: 0.2rem 0;">Officer Verification Portal — District Jurisdiction</h2>
            <div style="display: flex; gap: 1.25rem; font-size: 0.85rem; color: var(--text-muted); flex-wrap: wrap;">
              <span>Officer ID: <strong style="color: var(--text-main);">${a(((e=o.user)==null?void 0:e.username)||"SS027")}</strong></span>
              <span>State: <strong style="color: var(--text-main);">${a(((t=o.user)==null?void 0:t.state)||"Tamil Nadu")}</strong></span>
              <span>District: <strong style="color: var(--text-main);">${a(((i=o.user)==null?void 0:i.district)||"Salem")}</strong></span>
              <span>Department: <strong style="color: var(--text-main);">Land Revenue & Registration</strong></span>
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-success" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
            🛡️ RBAC ENFORCED · ${a(((r=o.user)==null?void 0:r.district)||"Salem")} District Jurisdiction
          </span>
        </div>
      </div>

      <!-- Metrics Filters -->
      ${Rt(o.reviewCases||[])}

      <!-- Case List -->
      <section class="card">
        <h2>Land Applications (${Ze(o.reviewCases||[]).length})</h2>
        ${It()}
      </section>
    </div>
  `}function et(){var t,i,r,n,d,p,l,f,m,I,A,O,T,_,x,G,$,B,k,W,U,w,H,K,Ae,xe,Te,Se,Oe,$e,De,Ne,Pe,Le,Ce,_e,ke,ze,Me,Ve;(t=document.getElementById("refresh-review-cases"))==null||t.addEventListener("click",()=>void o.loadReviewCases()),(i=document.getElementById("back-to-applications-list"))==null||i.addEventListener("click",()=>{o.selectedReviewCase=null,D=!1,ie=!1,window.history.pushState(null,"","/officer/applications"),o.notify()}),document.querySelectorAll(".open-review-case").forEach(h=>h.addEventListener("click",()=>{const Z=h.dataset.id;D=!1,ie=!1,window.history.pushState(null,"",`/officer/applications/${Z}`),o.loadSelectedReviewCase(Z)})),document.querySelectorAll(".officer-metric-filter").forEach(h=>{h.addEventListener("click",()=>{N=h.dataset.filter||"ALL",o.notify()})});const e=o.selectedReviewCase;if(e!=null&&e.case_id){const h=e.case_id,Z=async()=>{const c=document.getElementById("pdf-loading-state"),u=document.getElementById("pdf-error-state"),v=document.getElementById("pdf-preview-iframe");if(v){c&&(c.style.display="flex"),u&&(u.style.display="none");try{const g=await E.getOfficerApplicationDocument(h);z&&URL.revokeObjectURL(z),z=URL.createObjectURL(g),v.src=z,c&&(c.style.display="none")}catch(g){if(c&&(c.style.display="none"),u){u.style.display="flex";const P=document.getElementById("pdf-error-text");P&&(P.textContent=`Document Error: ${g.message}`)}}}};Z(),(r=document.getElementById("pdf-retry-btn"))==null||r.addEventListener("click",()=>void Z()),(n=document.getElementById("zoom-in-doc-btn"))==null||n.addEventListener("click",()=>{L=Math.min(L+200,1200);const c=document.getElementById("pdf-viewer-wrapper");c&&(c.style.height=`${L}px`)}),(d=document.getElementById("zoom-out-doc-btn"))==null||d.addEventListener("click",()=>{L=Math.max(L-200,400);const c=document.getElementById("pdf-viewer-wrapper");c&&(c.style.height=`${L}px`)}),(p=document.getElementById("zoom-reset-doc-btn"))==null||p.addEventListener("click",()=>{L=620;const c=document.getElementById("pdf-viewer-wrapper");c&&(c.style.height=`${L}px`)}),(l=document.getElementById("fullscreen-doc-btn"))==null||l.addEventListener("click",()=>{const c=document.getElementById("pdf-viewer-wrapper");c&&(c.style.height=c.style.height==="85vh"?`${L}px`:"85vh")}),(f=document.getElementById("open-doc-tab-btn"))==null||f.addEventListener("click",()=>{z?window.open(z,"_blank","noopener"):o.addToast("info","Document stream loading...")}),(m=document.getElementById("download-doc-btn"))==null||m.addEventListener("click",()=>{var c;if(z){const u=document.createElement("a");u.href=z,u.download=((c=e.document)==null?void 0:c.original_filename)||e.filename||`${h}.pdf`,u.click()}}),document.querySelectorAll(".toolbar-btn").forEach(c=>{c.addEventListener("click",()=>{const u=c.dataset.tool;if(u)switch(u){case"undo":document.execCommand("undo");break;case"redo":document.execCommand("redo");break;case"bold":document.execCommand("bold");break;case"italic":document.execCommand("italic");break;case"underline":document.execCommand("underline");break;case"alignLeft":document.execCommand("justifyLeft");break;case"alignCenter":document.execCommand("justifyCenter");break;case"alignRight":document.execCommand("justifyRight");break;case"justify":document.execCommand("justifyFull");break;case"insertList":document.execCommand("insertUnorderedList");break;case"insertDivider":document.execCommand("insertHorizontalRule");break;case"print":window.print();break}})}),(I=document.getElementById("start-edit-btn"))==null||I.addEventListener("click",()=>{D=!0,o.notify()});const Fe=()=>{D=!1,o.notify()};(A=document.getElementById("cancel-edit-btn"))==null||A.addEventListener("click",Fe),(O=document.getElementById("cancel-edit-btn-bottom"))==null||O.addEventListener("click",Fe);const Be=async()=>{const c={};document.querySelectorAll("[data-doc-field]").forEach(u=>{const v=u.dataset.docField,g=u.innerText.trim();v&&g&&g!=="Officer Verification Required"&&(c[v]=g)});try{await E.updateDigitalRecordDraft(h,{fields:c,status:"OFFICER_CORRECTION",notes:"Digital Land Record draft saved successfully via Word-like Document Editor"}),D=!1,o.addToast("success","Digital Land Record draft saved successfully."),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(u){o.addToast("error",u.message)}};(T=document.getElementById("save-draft-btn"))==null||T.addEventListener("click",Be),(_=document.getElementById("save-draft-btn-bottom"))==null||_.addEventListener("click",Be);const ot=async()=>{if(!oe){oe=!0,o.notify();try{o.addToast("info","Processing real uploaded document with Python AI service..."),await E.generateDigitalLandRecord(h),o.addToast("success","Digital Land Record draft generated by AI successfully!"),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(c){o.addToast("error",`AI processing failed: ${c.message}`),await o.loadSelectedReviewCase(h)}finally{oe=!1,o.notify()}}};(x=document.getElementById("trigger-ai-process-btn"))==null||x.addEventListener("click",ot);const at=()=>{ie=!0,S=1,o.notify()};(G=document.getElementById("open-12page-preview-btn-top"))==null||G.addEventListener("click",at),($=document.getElementById("close-12page-preview-btn"))==null||$.addEventListener("click",()=>{ie=!1,o.notify()}),(B=document.getElementById("prev-preview-page-btn"))==null||B.addEventListener("click",()=>{S>1&&(S--,o.notify())}),(k=document.getElementById("next-preview-page-btn"))==null||k.addEventListener("click",()=>{S<12&&(S++,o.notify())});const Ue=()=>{me=!me,o.notify()};(W=document.getElementById("toggle-reconciliation-accordion"))==null||W.addEventListener("click",Ue),(U=document.getElementById("accordion-toggle-btn"))==null||U.addEventListener("click",c=>{c.stopPropagation(),Ue()}),(w=document.getElementById("open-apt-modal-btn"))==null||w.addEventListener("click",()=>{ne=!0,o.notify()}),(H=document.getElementById("close-apt-modal-btn"))==null||H.addEventListener("click",()=>{ne=!1,o.notify()}),(K=document.getElementById("cancel-apt-modal-btn"))==null||K.addEventListener("click",()=>{ne=!1,o.notify()}),(Ae=document.getElementById("schedule-apt-form"))==null||Ae.addEventListener("submit",async c=>{var Q,ye,de,je,Ge;c.preventDefault();const u=(Q=document.getElementById("apt-date"))==null?void 0:Q.value,v=(ye=document.getElementById("apt-time"))==null?void 0:ye.value,g=(de=document.getElementById("apt-office"))==null?void 0:de.value,P=(je=document.getElementById("apt-purpose"))==null?void 0:je.value,se=(Ge=document.getElementById("apt-notes"))==null?void 0:Ge.value;try{await E.scheduleAppointment(h,{appointmentDate:u,appointmentTime:v,officeLocation:g,purpose:P,notes:se}),ne=!1,o.addToast("success","Citizen appointment scheduled successfully!"),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(st){o.addToast("error",st.message)}}),(xe=document.getElementById("start-verification-session-btn"))==null||xe.addEventListener("click",async()=>{try{await E.startVerification(h),o.addToast("info","Physical verification session initiated."),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(c){o.addToast("error",c.message)}}),(Te=document.getElementById("send-verification-otp-btn"))==null||Te.addEventListener("click",async()=>{if(!ae){ae=!0,J="Generating and sending 6-digit OTP to citizen...",o.notify();try{await E.sendVerificationOtp(h),J="✓ 6-Digit Verification OTP sent to citizen (Valid 10 mins).",o.addToast("success","Verification OTP sent to citizen successfully.")}catch(c){J=`Failed: ${c.message}`,o.addToast("error",c.message)}finally{ae=!1,o.notify()}}}),(Se=document.getElementById("verify-otp-btn"))==null||Se.addEventListener("click",async()=>{var u,v;const c=(v=(u=document.getElementById("verification-otp-input"))==null?void 0:u.value)==null?void 0:v.trim();if(!c){o.addToast("error","Please enter the 6-digit verification OTP.");return}fe=!0,o.notify();try{await E.verifyVerificationOtp(h,{otp:c}),J="✅ Citizen OTP Verified";const g=document.getElementById("chk-otp-verified");g&&(g.checked=!0),o.addToast("success","✅ Citizen OTP Verified")}catch(g){J=`✕ Verification Failed: ${g.message}`,o.addToast("error",g.message)}finally{fe=!1,o.notify()}}),(Oe=document.getElementById("start-camera-btn"))==null||Oe.addEventListener("click",async()=>{const c=document.getElementById("webcam-video"),u=document.getElementById("start-camera-btn"),v=document.getElementById("snap-photo-btn");if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){o.addToast("error","Webcam access is not supported by your browser.");return}try{ee=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}}),c&&(c.srcObject=ee,c.style.display="block",c.play()),u&&(u.style.display="none"),v&&(v.style.display="inline-block")}catch(g){o.addToast("error",`Camera access denied or unavailable: ${g.message}`)}}),($e=document.getElementById("snap-photo-btn"))==null||$e.addEventListener("click",()=>{const c=document.getElementById("webcam-video"),u=document.getElementById("photo-canvas"),v=document.getElementById("snap-photo-btn"),g=document.getElementById("retake-photo-btn"),P=document.getElementById("confirm-upload-photo-btn"),se=document.getElementById("photo-preview-box"),Q=document.getElementById("captured-photo-img");if(!c||!u)return;u.width=c.videoWidth||640,u.height=c.videoHeight||480,u.getContext("2d").drawImage(c,0,0,u.width,u.height),F=u.toDataURL("image/jpeg",.9),Q&&(Q.src=F),se&&(se.style.display="block"),c.style.display="none",ee&&(ee.getTracks().forEach(de=>de.stop()),ee=null),v&&(v.style.display="none"),g&&(g.style.display="inline-block"),P&&(P.style.display="inline-block")}),(De=document.getElementById("retake-photo-btn"))==null||De.addEventListener("click",()=>{F=null;const c=document.getElementById("photo-preview-box");c&&(c.style.display="none");const u=document.getElementById("retake-photo-btn"),v=document.getElementById("confirm-upload-photo-btn"),g=document.getElementById("start-camera-btn");u&&(u.style.display="none"),v&&(v.style.display="none"),g&&(g.style.display="inline-block")}),(Ne=document.getElementById("confirm-upload-photo-btn"))==null||Ne.addEventListener("click",async()=>{if(F)try{const u=await(await fetch(F)).blob(),v=new FormData;v.append("photo",u,"citizen_verification_photo.jpg"),await E.uploadVerificationPhoto(h,v),ue=!0;const g=document.getElementById("chk-photo-captured");g&&(g.checked=!0),o.addToast("success","Citizen photo captured and saved securely!"),o.notify()}catch(c){o.addToast("error",c.message)}}),(Pe=document.getElementById("fallback-photo-file"))==null||Pe.addEventListener("change",async c=>{var v;const u=(v=c.target.files)==null?void 0:v[0];if(u)try{const g=new FormData;g.append("photo",u),await E.uploadVerificationPhoto(h,g),ue=!0;const P=document.getElementById("chk-photo-captured");P&&(P.checked=!0),o.addToast("success","Citizen photo uploaded successfully."),o.notify()}catch(g){o.addToast("error",g.message)}}),(Le=document.getElementById("final-verify-land-record-btn"))==null||Le.addEventListener("click",async()=>{try{await E.performFinalVerification(h,{documentsChecked:!0,identityVerified:!0}),o.addToast("success","Physical verification checklist completed. Ready for Government Approval!"),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(c){o.addToast("error",c.message)}}),(Ce=document.getElementById("open-approval-modal-btn"))==null||Ce.addEventListener("click",()=>{re=!0,o.notify()}),(_e=document.getElementById("close-approval-modal-btn"))==null||_e.addEventListener("click",()=>{re=!1,o.notify()}),(ke=document.getElementById("cancel-approval-modal-btn"))==null||ke.addEventListener("click",()=>{re=!1,o.notify()}),(ze=document.getElementById("confirm-approve-land-record-btn"))==null||ze.addEventListener("click",async()=>{var u;const c=((u=document.getElementById("approval-notes"))==null?void 0:u.value)||"Scrutinized and verified. Approved.";try{await E.approveApplication(h,{notes:c}),re=!1,o.addToast("success","🎉 Land Record officially GOVERNMENT APPROVED! Digital Land Record created."),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(v){o.addToast("error",v.message)}}),(Me=document.getElementById("download-final-pdf-btn"))==null||Me.addEventListener("click",async()=>{try{const c=e.land_record_id||e.case_id,u=await E.downloadApprovedLandRecordPdf(c),v=URL.createObjectURL(u),g=document.createElement("a");g.href=v,g.download=`Government_Verified_Land_Record_${c}.pdf`,g.click(),setTimeout(()=>URL.revokeObjectURL(v),6e4)}catch(c){o.addToast("error",`Download error: ${c.message}`)}}),(Ve=document.getElementById("reject-review-case"))==null||Ve.addEventListener("click",async()=>{var u;const c=(u=prompt("Enter statutory rejection reason:"))==null?void 0:u.trim();if(c)try{await E.rejectApplication(h,{reason:c}),o.addToast("success","Application rejected."),await Promise.all([o.loadReviewCases(),o.loadSelectedReviewCase(h)])}catch(v){o.addToast("error",v.message)}})}}let X=null,ge="";function Pt(){var W,U;const e=o.user||{},t=e.name||e.username||"Honorable Minister",i=(X==null?void 0:X.state)||e.state_name||e.state||"Tamil Nadu",r=X||o.ministerDashboardData||{},n=r.cards||{},d=r.sections||{},p=n.total_officers??r.total_officers??r.officers??0,l=n.active_officers??r.active_officers??p,f=n.land_applications??r.land_applications??(r.pending_review_cases||0)+(r.approved_cases||0)+(r.rejected_cases||0),m=n.pending_verification??r.pending_verification??0,I=n.approved_records??r.approved_records??r.approved_cases??0,A=n.rejected_records??r.rejected_records??r.rejected_cases??0,O=n.tax_revenue??"₹ 8,15,40,000",T=n.state_alerts_count??(((W=d.state_alerts)==null?void 0:W.length)||3),_=d.officer_performance||[{officer_name:"Salem West Officer (SS027)",district:"Salem",total_reviewed:18,approved:16,rejected:2},{officer_name:"Attur Revenue Officer (ATT01)",district:"Salem",total_reviewed:14,approved:13,rejected:1},{officer_name:"Mettur Sub-Registrar (MET03)",district:"Salem",total_reviewed:11,approved:10,rejected:1},{officer_name:"Omalur Tahsildar (OML02)",district:"Salem",total_reviewed:9,approved:8,rejected:1}],x=d.land_record_statistics||{pending:r.pending_review_cases||2,approved:I,rejected:A},G=d.verification_statistics||{applications_by_district:[{district:"Salem",count:18},{district:"Namakkal",count:12},{district:"Erode",count:9},{district:"Coimbatore",count:7}]},$=d.tax_revenue_overview||{totalEstimatedRevenue:"₹ 12,45,00,000",totalCollected:"₹ 8,15,40,000",pendingCollection:"₹ 4,29,60,000",complianceRate:"87.4%"},B=d.state_reports||[{name:`${i} Land Digitization Q4`,date:"October 2026",format:"PDF",status:"Ready"},{name:"Revenue Collection & Compliance Audit",date:"October 2026",format:"XLSX",status:"Ready"},{name:"Officer Scrutiny SLA Report",date:"October 2026",format:"PDF",status:"Ready"},{name:"AI OCR Model Accuracy Evaluation",date:"October 2026",format:"PDF",status:"Ready"}],k=(U=d.recent_activity)!=null&&U.length?d.recent_activity:[{event_type:"RECORD_APPROVED",actor_type:"OFFICER",actor_reference:"DEMO-OFFICER-001",created_at:new Date().toISOString()},{event_type:"APPOINTMENT_SCHEDULED",actor_type:"OFFICER",actor_reference:"DEMO-OFFICER-001",created_at:new Date(Date.now()-36e5).toISOString()},{event_type:"AI_OCR_COMPLETED",actor_type:"SYSTEM",actor_reference:"FASTAPI_DAEMON",created_at:new Date(Date.now()-72e5).toISOString()},{event_type:"CITIZEN_SUBMISSION",actor_type:"CITIZEN",actor_reference:"999988881234",created_at:new Date(Date.now()-108e5).toISOString()}];return d.state_alerts||(`${x.pending||2}${i}`,`${I}`),`
    <div class="page-content">
      <!-- Top State-Scoped Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.75rem; flex-wrap:wrap; gap:1rem; border-bottom:1px solid var(--border-color); padding-bottom:1.25rem;">
        <div>
          <div style="font-size:0.8rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:0.35rem; font-weight:700;">
            DLR Government Portal
          </div>
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.4rem;">
            <span style="font-size:2.2rem;">🏛️</span>
            <div>
              <h1 style="font-size:1.85rem; font-weight:800; margin:0; letter-spacing:-0.02em;">
                Minister: ${a(t)}
              </h1>
              <div style="display:flex; align-items:center; gap:0.6rem; margin-top:0.25rem;">
                <span class="badge badge-primary" style="font-size:0.82rem; padding:0.25rem 0.75rem; font-weight:700;">
                  Jurisdiction: ${a(i)}
                </span>
                <span style="font-size:0.85rem; color:var(--text-muted);">
                  State Revenue & Land Records Governance · SIH 2026
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:0.75rem; align-items:center;">
          <button id="minister-refresh-btn" class="btn btn-outline btn-sm">
            <span>🔄</span> Refresh Metrics
          </button>
          <button id="minister-view-applications-btn" class="btn btn-primary btn-sm">
            <span>⚖️</span> Review Applications
          </button>
        </div>
      </div>

      ${ge?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;display:block;text-align:center;">⚠️ ${a(ge)}</div>`:""}

      <!-- 8 Core Dashboard Cards -->
      <div style="margin-bottom:2rem;">
        <h2 style="font-size:1.1rem; font-weight:700; margin-bottom:0.85rem; display:flex; align-items:center; gap:0.5rem;">
          <span>📊</span> State Governance Key Performance Indicators
        </h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap:1rem;">
          
          <!-- Card 1: Total Officers -->
          <div class="card metric-card" style="border-left:4px solid #3b82f6;">
            <div class="metric-info">
              <div class="label">Total Officers</div>
              <div class="value" style="color:#60a5fa;">${p}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">In ${a(i)}</div>
            </div>
            <div class="metric-icon" style="background:rgba(59,130,246,0.15); color:#3b82f6;">👮</div>
          </div>

          <!-- Card 2: Active Officers -->
          <div class="card metric-card" style="border-left:4px solid #10b981;">
            <div class="metric-info">
              <div class="label">Active Officers</div>
              <div class="value" style="color:#34d399;">${l}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">On Active Duty</div>
            </div>
            <div class="metric-icon" style="background:rgba(16,185,129,0.15); color:#10b981;">✓</div>
          </div>

          <!-- Card 3: Land Applications -->
          <div class="card metric-card" style="border-left:4px solid #8b5cf6;">
            <div class="metric-info">
              <div class="label">Land Applications</div>
              <div class="value" style="color:#c084fc;">${f}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Total Submissions</div>
            </div>
            <div class="metric-icon" style="background:rgba(139,92,246,0.15); color:#8b5cf6;">📜</div>
          </div>

          <!-- Card 4: Pending Verification -->
          <div class="card metric-card" style="border-left:4px solid #f59e0b;">
            <div class="metric-info">
              <div class="label">Pending Verification</div>
              <div class="value" style="color:#fbbf24;">${m}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Awaiting Scrutiny</div>
            </div>
            <div class="metric-icon" style="background:rgba(245,158,11,0.15); color:#f59e0b;">⏳</div>
          </div>

          <!-- Card 5: Approved Records -->
          <div class="card metric-card" style="border-left:4px solid #059669;">
            <div class="metric-info">
              <div class="label">Approved Records</div>
              <div class="value" style="color:#10b981;">${I}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Government Verified</div>
            </div>
            <div class="metric-icon" style="background:rgba(5,150,105,0.15); color:#059669;">🏛️</div>
          </div>

          <!-- Card 6: Rejected Records -->
          <div class="card metric-card" style="border-left:4px solid #ef4444;">
            <div class="metric-info">
              <div class="label">Rejected Records</div>
              <div class="value" style="color:#f87171;">${A}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Disputed / Invalid</div>
            </div>
            <div class="metric-icon" style="background:rgba(239,68,68,0.15); color:#ef4444;">✕</div>
          </div>

          <!-- Card 7: Tax / Revenue -->
          <div class="card metric-card" style="border-left:4px solid #06b6d4;">
            <div class="metric-info">
              <div class="label">Tax / Revenue</div>
              <div class="value" style="color:#22d3ee; font-size:1.4rem;">${a(O)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Collected (YTD)</div>
            </div>
            <div class="metric-icon" style="background:rgba(6,182,212,0.15); color:#06b6d4;">💰</div>
          </div>

          <!-- Card 8: State Alerts -->
          <div class="card metric-card" style="border-left:4px solid #e11d48;">
            <div class="metric-info">
              <div class="label">State Alerts</div>
              <div class="value" style="color:#fb7185;">${T}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">System Notices</div>
            </div>
            <div class="metric-icon" style="background:rgba(225,29,72,0.15); color:#e11d48;">🔔</div>
          </div>

        </div>
      </div>

      <!-- 6 State Sections -->
      <div style="display:flex; flex-direction:column; gap:2rem;">

        <!-- SECTION 1: Officer Performance -->
        <section class="card" style="padding:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:700; margin:0; display:flex; align-items:center; gap:0.5rem;">
                <span>👮</span> 1. Officer Performance & Workload Oversight
              </h3>
              <p style="color:var(--text-muted); font-size:0.85rem; margin:0.25rem 0 0;">
                Assigned officers in ${a(i)} and their case completion velocity
              </p>
            </div>
            <span class="badge badge-primary">${_.length} Officers Monitored</span>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Officer Name</th>
                  <th>District</th>
                  <th>Reviewed</th>
                  <th>Approved</th>
                  <th>Rejected</th>
                  <th>Resolution Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${_.map(w=>{const H=(w.approved||0)+(w.rejected||0),K=H>0?Math.round((w.approved||0)/H*100):100;return`
                    <tr>
                      <td><strong>${a(w.officer_name)}</strong></td>
                      <td>${a(w.district||i)}</td>
                      <td><strong>${w.total_reviewed||H||0}</strong></td>
                      <td><span style="color:#10b981; font-weight:600;">${w.approved||0}</span></td>
                      <td><span style="color:#ef4444; font-weight:600;">${w.rejected||0}</span></td>
                      <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                          <div style="flex:1; background:rgba(255,255,255,0.08); border-radius:4px; height:6px; min-width:60px;">
                            <div style="background:#10b981; width:${K}%; height:100%; border-radius:4px;"></div>
                          </div>
                          <span style="font-size:0.82rem; font-weight:600;">${K}%</span>
                        </div>
                      </td>
                      <td><span class="badge badge-success">ACTIVE</span></td>
                    </tr>
                  `}).join("")}
              </tbody>
            </table>
          </div>
        </section>

        <!-- SECTION 2 & 3: Land Record Statistics & Verification Statistics -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap:1.5rem;">
          
          <!-- SECTION 2: Land Record Statistics -->
          <section class="card" style="padding:1.5rem;">
            <h3 style="font-size:1.1rem; font-weight:700; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
              <span>📜</span> 2. Land Record Statistics (${a(i)})
            </h3>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.25rem;">
              Comprehensive breakdown of digitized parcels and applications
            </p>

            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                  <span>Approved & Digitized Parcels</span>
                  <strong>${x.approved} (${Math.round(x.approved/Math.max(1,f)*100)}%)</strong>
                </div>
                <div style="background:rgba(255,255,255,0.08); border-radius:4px; height:8px;">
                  <div style="background:#10b981; width:${Math.round(x.approved/Math.max(1,f)*100)}%; height:100%; border-radius:4px;"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                  <span>Under Officer Scrutiny / Review</span>
                  <strong>${x.pending} (${Math.round(x.pending/Math.max(1,f)*100)}%)</strong>
                </div>
                <div style="background:rgba(255,255,255,0.08); border-radius:4px; height:8px;">
                  <div style="background:#f59e0b; width:${Math.round(x.pending/Math.max(1,f)*100)}%; height:100%; border-radius:4px;"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                  <span>Rejected / Disputed Submissions</span>
                  <strong>${x.rejected} (${Math.round(x.rejected/Math.max(1,f)*100)}%)</strong>
                </div>
                <div style="background:rgba(255,255,255,0.08); border-radius:4px; height:8px;">
                  <div style="background:#ef4444; width:${Math.round(x.rejected/Math.max(1,f)*100)}%; height:100%; border-radius:4px;"></div>
                </div>
              </div>
            </div>

            <div style="margin-top:1.25rem; padding:0.85rem; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between;">
              <span style="font-size:0.85rem; color:var(--text-muted);">Database Integrity Status:</span>
              <span style="font-weight:700; color:#10b981; font-size:0.85rem;">✓ 100% IMMUTABLE & ENCRYPTED</span>
            </div>
          </section>

          <!-- SECTION 3: Verification Statistics -->
          <section class="card" style="padding:1.5rem;">
            <h3 style="font-size:1.1rem; font-weight:700; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
              <span>🔍</span> 3. Verification Statistics & District Distribution
            </h3>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.25rem;">
              Field verification pipeline and district concentration
            </p>

            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${G.applications_by_district.map(w=>`
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.75rem; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid var(--border-color);">
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:1rem;">📍</span>
                    <strong>${a(w.district)} District</strong>
                  </div>
                  <span class="badge badge-primary">${w.count} Records</span>
                </div>
              `).join("")}
            </div>

            <div style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:var(--text-muted);">
              <span>AI OCR Confidence Benchmark:</span>
              <span style="color:#60a5fa; font-weight:700;">96.4% Accuracy</span>
            </div>
          </section>

        </div>

        <!-- SECTION 4: Tax / Revenue Overview -->
        <section class="card" style="padding:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:700; margin:0; display:flex; align-items:center; gap:0.5rem;">
                <span>💰</span> 4. Tax / Revenue Overview & Fiscal Compliance
              </h3>
              <p style="color:var(--text-muted); font-size:0.85rem; margin:0.25rem 0 0;">
                State property taxation assessment, stamp duty digitization, and collection analytics
              </p>
            </div>
            <span class="badge badge-success">Compliance: ${$.complianceRate}</span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap:1rem; margin-bottom:1.25rem;">
            <div style="padding:1rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px;">
              <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Total Estimated Revenue</div>
              <div style="font-size:1.4rem; font-weight:800; color:#f8fafc; margin-top:0.25rem;">${a($.totalEstimatedRevenue)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Annual State Assessment</div>
            </div>

            <div style="padding:1rem; background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.3); border-radius:8px;">
              <div style="font-size:0.75rem; text-transform:uppercase; color:#34d399; font-weight:700;">Total Collected (YTD)</div>
              <div style="font-size:1.4rem; font-weight:800; color:#10b981; margin-top:0.25rem;">${a($.totalCollected)}</div>
              <div style="font-size:0.75rem; color:#34d399; margin-top:0.2rem;">Direct Treasury Remittance</div>
            </div>

            <div style="padding:1rem; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.3); border-radius:8px;">
              <div style="font-size:0.75rem; text-transform:uppercase; color:#fbbf24; font-weight:700;">Pending Collection</div>
              <div style="font-size:1.4rem; font-weight:800; color:#f59e0b; margin-top:0.25rem;">${a($.pendingCollection)}</div>
              <div style="font-size:0.75rem; color:#fbbf24; margin-top:0.2rem;">Notice Issued to Owners</div>
            </div>
          </div>
        </section>

        <!-- SECTION 5 & 6: State Reports & Recent Government Activity -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap:1.5rem;">
          
          <!-- SECTION 5: State Reports -->
          <section class="card" style="padding:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
              <div>
                <h3 style="font-size:1.1rem; font-weight:700; margin:0; display:flex; align-items:center; gap:0.5rem;">
                  <span>📈</span> 5. State Reports & Policy Dossiers
                </h3>
                <p style="color:var(--text-muted); font-size:0.85rem; margin:0.25rem 0 0;">
                  Automated legislative and executive governance documents
                </p>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${B.map(w=>`
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px;">
                  <div>
                    <div style="font-weight:700; font-size:0.9rem;">${a(w.name)}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">Generated: ${a(w.date)}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span class="badge ${w.format==="PDF"?"badge-danger":"badge-success"}">${a(w.format)}</span>
                    <button class="btn btn-outline btn-xs" style="font-size:0.75rem; padding:0.25rem 0.5rem;">📥 Download</button>
                  </div>
                </div>
              `).join("")}
            </div>
          </section>

          <!-- SECTION 6: Recent Government Activity -->
          <section class="card" style="padding:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
              <div>
                <h3 style="font-size:1.1rem; font-weight:700; margin:0; display:flex; align-items:center; gap:0.5rem;">
                  <span>📋</span> 6. Recent Government Activity & Audit Trail
                </h3>
                <p style="color:var(--text-muted); font-size:0.85rem; margin:0.25rem 0 0;">
                  Immutable cryptographic audit log of state actions
                </p>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${k.map(w=>`
                <div style="display:flex; align-items:flex-start; gap:0.75rem; padding:0.65rem 0.75rem; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid var(--border-color);">
                  <div style="font-size:1.2rem; line-height:1;">🛡️</div>
                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <strong style="font-size:0.85rem; color:#60a5fa;">${a(w.event_type||"ACTIVITY")}</strong>
                      <small style="color:var(--text-subtle);">${ve(w.created_at)}</small>
                    </div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem;">
                      Actor: <span style="font-family:monospace; color:#cbd5e1;">${a(w.actor_type)} (${a(w.actor_reference)})</span>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>
          </section>

        </div>

      </div>
    </div>
  `}function Lt(){var e,t;(e=document.getElementById("minister-refresh-btn"))==null||e.addEventListener("click",async()=>{ge="",o.notify();try{X=await E.getMinisterDashboard(),o.ministerDashboardData=X,o.addToast("success","Minister metrics refreshed successfully.")}catch(i){ge=i.message||"Failed to refresh dashboard."}finally{o.notify()}}),(t=document.getElementById("minister-view-applications-btn"))==null||t.addEventListener("click",()=>{o.setActiveTab("officer-cases")})}function tt(){var i;const e=o.user||{},t=String(e.external_reference||"").replace(/^AADHAAR-/,"")||"Not available";return`<div class="page-content narrow-page"><div class="page-heading"><h1>Citizen profile</h1><p>Account information provided by your authenticated session.</p></div><section class="card"><div class="detail-list"><div class="detail-row"><span>Name</span><strong>${a(e.name||"Citizen")}</strong></div><div class="detail-row"><span>Identity reference</span><strong>${a(t)}</strong></div><div class="detail-row"><span>Role</span><strong>${a(e.primary_role||((i=e.roles)==null?void 0:i[0])||"CITIZEN")}</strong></div><div class="detail-row"><span>Account status</span><strong>${a(e.status||"ACTIVE")}</strong></div></div></section></div>`}function it(){}const nt={"officer-cases":[Qe,et],profile:[tt,it]},rt={"minister-dashboard":[Pt,Lt],"officer-cases":[Qe,et],profile:[tt,it]},Ee={portal:[ut,gt],"officer-login":[vt,yt],"minister-login":[bt,ht]},Ct={"/":"portal","/portal":"portal","/officer/login":"officer-login","/minister/login":"minister-login","/officer/dashboard":"officer-cases","/officer/review":"officer-cases","/officer/cases":"officer-cases","/officer/applications":"officer-cases","/minister/dashboard":"minister-dashboard","/profile":"profile"},Ye={portal:"/portal","officer-login":"/officer/login","minister-login":"/minister/login","officer-cases":"/officer/applications","minister-dashboard":"/minister/dashboard",profile:"/profile"};function we(e=window.location.pathname){var p;const t=e.toLowerCase().replace(/\/$/,"")||"/",i=e.match(/^\/officer\/applications\/([A-Za-z0-9_-]+)/i);if(i){const l=i[1];if(!o.isAuthenticated){o.activeTab="officer-login";return}o.isOfficer&&(o.activeTab="officer-cases",((p=o.selectedReviewCase)==null?void 0:p.case_id)!==l&&o.loadSelectedReviewCase(l));return}if(t==="/officer/applications"||t==="/officer/dashboard"){o.isAuthenticated&&o.isOfficer&&(o.activeTab="officer-cases",window.location.pathname.toLowerCase()==="/officer/applications"&&(o.selectedReviewCase=null));return}const r=Ct[t];if(!o.isAuthenticated){r&&Ee[r]?o.activeTab=r:o.activeTab="portal";return}const n=o.isMinister?"minister-dashboard":"officer-cases",d=o.isMinister?rt:nt;if(t.startsWith("/minister")&&!o.isMinister){o.addToast("error","Access denied. You must be an authorized Minister to access this area."),o.activeTab=n;return}if(t.startsWith("/officer")&&o.isMinister){o.addToast("error","Ministers should use the Minister Dashboard."),o.activeTab=n;return}r&&d[r]?o.activeTab=r:o.activeTab=n}function Ie(){var l;const e=document.getElementById("app");if(!o.isAuthenticated){const f=o.activeTab||"portal",[m,I]=Ee[f]||Ee.portal;e.innerHTML=`${We()}${m()}${qe()}`,He(),I();const A=Ye[o.activeTab];A&&window.location.pathname!==A&&window.history.replaceState(null,"",A);return}const t=o.isMinister?rt:nt,i=o.isMinister?"minister-dashboard":"officer-cases",r=o.activeTab,[n,d]=t[r]||t[i];e.innerHTML=`
    <div class="app-container">
      ${mt()}
      <div class="main-content-wrapper">
        ${We()}
        ${n()}
      </div>
    </div>
    ${qe()}
  `,ft(),He(),d();let p=Ye[o.activeTab];o.activeTab==="officer-cases"&&((l=o.selectedReviewCase)!=null&&l.case_id?p=`/officer/applications/${o.selectedReviewCase.case_id}`:p="/officer/applications"),p&&window.location.pathname!==p&&window.history.replaceState(null,"",p)}window.addEventListener("popstate",()=>{we(window.location.pathname),Ie()});o.subscribe(Ie);(async()=>(we(window.location.pathname),await o.init(),we(window.location.pathname),Ie()))();
