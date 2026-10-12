(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const p of a)if(p.type==="childList")for(const l of p.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function i(a){const p={};return a.integrity&&(p.integrity=a.integrity),a.referrerPolicy&&(p.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?p.credentials="include":a.crossOrigin==="anonymous"?p.credentials="omit":p.credentials="same-origin",p}function n(a){if(a.ep)return;a.ep=!0;const p=i(a);fetch(a.href,p)}})();function Pe(){var t;const e="http://localhost:4000";if(typeof window<"u"&&((t=window.location)!=null&&t.hostname)){const i=window.location.hostname;if(i!=="localhost"&&i!=="127.0.0.1"&&(e.includes("localhost")||e.includes("127.0.0.1")))return`${window.location.protocol||"http:"}//${i}:4000`}return e}const B=Pe();function U(){return localStorage.getItem("dlr_citizen_token")||null}function R(e){e?localStorage.setItem("dlr_citizen_token",e):localStorage.removeItem("dlr_citizen_token")}function _e(){let e=localStorage.getItem("dlr_browser_context_id");return e||(e="ctx-"+Math.random().toString(36).substring(2,10)+"-"+Date.now(),localStorage.setItem("dlr_browser_context_id",e)),e}const X=typeof window<"u"&&"BroadcastChannel"in window?new BroadcastChannel("dlr_browser_session_channel"):null;X&&(X.onmessage=e=>{var t,i;((t=e.data)==null?void 0:t.type)==="DLR_NEW_LOGIN"&&((i=e.data)==null?void 0:i.role)!=="CITIZEN"&&(R(null),window.dispatchEvent(new CustomEvent("dlr:session-replaced",{detail:{message:"Your DLR session was replaced by a new login.",newRole:e.data.role}})))});function ze(e){X&&e&&X.postMessage({type:"DLR_NEW_LOGIN",role:"CITIZEN",userId:e.id,timestamp:Date.now(),contextId:_e()})}async function o(e,t={}){var c,m,u,f;const i=`${B}${e}`,n=U(),a={...t.headers||{},"x-client-context-id":_e()};n&&(a.Authorization=`Bearer ${n}`),!t.isFormData&&!a["Content-Type"]&&(a["Content-Type"]="application/json");const p={method:t.method||"GET",headers:a,body:t.isFormData?t.body:t.body?JSON.stringify(t.body):void 0};let l;try{l=await fetch(i,p)}catch{throw new Error("Network error: Unable to communicate with DLR backend service.")}let d;try{d=await l.json()}catch{d=null}if(!l.ok){l.status===401&&(R(null),((c=d==null?void 0:d.error)==null?void 0:c.code)==="SESSION_REPLACED"?window.dispatchEvent(new CustomEvent("dlr:session-replaced",{detail:{message:d.error.message||"Your DLR session was replaced by a new login."}})):window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const y=((m=d==null?void 0:d.error)==null?void 0:m.message)||(d==null?void 0:d.message)||`API Error (${l.status})`,E=new Error(y);throw E.status=l.status,E.code=((u=d==null?void 0:d.error)==null?void 0:u.code)||"API_ERROR",E.details=((f=d==null?void 0:d.error)==null?void 0:f.details)||null,E}return(d==null?void 0:d.data)||d}const b={getStoredToken:U,setStoredToken:R,async requestOtp(e){return o("/api/auth/citizen/otp/request",{method:"POST",body:{aadhaarNumber:e}})},async citizenLogin(e){return this.requestOtp(e)},async citizenRegister(e){return o("/api/auth/citizen/register",{method:"POST",body:e})},async verifyOtp({aadhaarNumber:e,otp:t,sessionId:i}){const n=await o("/api/auth/citizen/otp/verify",{method:"POST",body:{aadhaarNumber:e,otp:t,sessionId:i}});return n!=null&&n.accessToken&&R(n.accessToken),n},async citizenVerifyOtp({aadhaarNumber:e,otp:t,sessionId:i}){return this.verifyOtp({aadhaarNumber:e,otp:t,sessionId:i})},async citizenVerifyRegistrationOtp({aadhaarNumber:e,otp:t,sessionId:i}){return this.verifyOtp({aadhaarNumber:e,otp:t,sessionId:i})},async officerLogin({username:e,identifier:t,password:i}){const n=e||t,a=await o("/api/auth/officer/login",{method:"POST",body:{username:n,identifier:n,password:i}});return a!=null&&a.accessToken&&R(a.accessToken),a},async ministerLogin({username:e,identifier:t,password:i}){const n=e||t,a=await o("/api/auth/minister/login",{method:"POST",body:{username:n,identifier:n,password:i}});return a!=null&&a.accessToken&&R(a.accessToken),a},async superAdminLogin({username:e,identifier:t,password:i}){var l,d;const n=e||t,a=await o("/api/auth/super-admin/login",{method:"POST",body:{username:n,identifier:n,password:i}}),p=(a==null?void 0:a.token)||(a==null?void 0:a.accessToken)||((l=a==null?void 0:a.data)==null?void 0:l.token)||((d=a==null?void 0:a.data)==null?void 0:d.accessToken);return p&&R(p),a},async stateAdminLogin({username:e,identifier:t,password:i}){var l,d;const n=e||t,a=await o("/api/auth/state-admin/login",{method:"POST",body:{username:n,identifier:n,password:i}}),p=(a==null?void 0:a.token)||(a==null?void 0:a.accessToken)||((l=a==null?void 0:a.data)==null?void 0:l.token)||((d=a==null?void 0:a.data)==null?void 0:d.accessToken);return p&&R(p),a},async getMe(){return o("/api/auth/me")},async logout(){try{await o("/api/auth/logout",{method:"POST"})}finally{R(null)}},async uploadDocument(e){const t=new FormData;return t.append("file",e),o("/api/documents/upload",{method:"POST",isFormData:!0,body:t})},async checkDuplicateRecord({surveyNumber:e,village:t,taluk:i,district:n}){return o("/api/documents/check-duplicate",{method:"POST",body:{surveyNumber:e,village:t,taluk:i,district:n}})},async submitCitizenApplication(e,{citizenData:t={}}={}){const i=new FormData;i.append("file",e);for(const[n,a]of Object.entries(t))a!=null&&a!==""&&i.append(n,String(a));return o("/api/documents",{method:"POST",isFormData:!0,body:i})},async processDocument(e,{language:t="eng",geometry:i=null,crs:n="",citizenData:a={}}={}){const p=new FormData;p.append("file",e),p.append("language",t),i&&p.append("geometry",typeof i=="string"?i:JSON.stringify(i)),n&&p.append("crs",n);for(const[l,d]of Object.entries(a))d!=null&&d!==""&&p.append(l,String(d));return o("/api/documents/process",{method:"POST",isFormData:!0,body:p})},async getMyDocuments(){const e=await o("/api/documents/mine");return(e==null?void 0:e.documents)||e||[]},async getDocumentById(e){return o(`/api/documents/${e}`)},async getDocumentFile(e){const t=await fetch(`${B}/api/documents/${encodeURIComponent(e)}/file`,{headers:U()?{Authorization:`Bearer ${U()}`}:{}});if(!t.ok){t.status===401&&(R(null),window.dispatchEvent(new CustomEvent("dlr:unauthorized")));const i=new Error(t.status===403?"You do not have access to this document.":"Unable to load the original document.");throw i.status=t.status,i}return t.blob()},getDocumentFileUrl(e){return`${B}/api/documents/${encodeURIComponent(e)}/file`},async getMyApplications(){const e=await o("/api/documents/applications/mine");return(e==null?void 0:e.applications)||[]},async getReviewCases(e={}){const t=new URLSearchParams;e.status&&t.set("status",e.status),e.priority&&t.set("priority",e.priority),e.limit&&t.set("limit",e.limit),e.offset&&t.set("offset",e.offset);const i=t.toString()?`?${t.toString()}`:"";return o(`/api/review/cases${i}`)},async getReviewCaseById(e){return o(`/api/review/cases/${e}`)},async triggerAiProcessCase(e,{language:t="eng"}={}){return o(`/api/review/cases/${e}/process-ai`,{method:"POST",body:{language:t}})},async startReviewCase(e){return o(`/api/review/cases/${e}/start`,{method:"POST"})},async getReviewStats(){return o("/api/review/stats")},async approveReviewCase(e,{notes:t=""}={}){return o(`/api/review/cases/${e}/approve`,{method:"POST",body:{officerNotes:t}})},async rejectReviewCase(e,{reason:t,notes:i=""}){return o(`/api/review/cases/${e}/reject`,{method:"POST",body:{reason:t,officerNotes:i}})},async requestCorrectionCase(e,{reason:t,notes:i=""}){return o(`/api/review/cases/${e}/request-correction`,{method:"POST",body:{reason:t,officerNotes:i}})},async holdReviewCase(e,{reason:t,notes:i=""}){return o(`/api/review/cases/${e}/hold`,{method:"POST",body:{reason:t}})},async createOfficerCorrection(e,{fieldName:t,originalValue:i,correctedValue:n,reason:a=""}){return o(`/api/review/cases/${e}/correction`,{method:"POST",body:{field:t,originalValue:i,correctedValue:n,reason:a}})},async addReviewNote(e,{noteText:t,isInternal:i=!0}){return o(`/api/review/cases/${e}/notes`,{method:"POST",body:{note:t}})},async resolveAnomaly(e,t,{resolutionType:i="OVERRIDDEN",notes:n=""}){return o(`/api/review/cases/${e}/anomalies/${t}/resolve`,{method:"POST",body:{resolutionType:i,notes:n}})},async getSuperAdminDashboard(){return o("/api/super-admin/dashboard")},async getSuperAdminOfficers(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/super-admin/officers${i?"?"+i:""}`)},async createOfficer(e){return o("/api/super-admin/officers",{method:"POST",body:e})},async updateOfficer(e,t){return o(`/api/super-admin/officers/${e}`,{method:"PATCH",body:t})},async setOfficerStatus(e,t){return o(`/api/super-admin/officers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetOfficerPassword(e,t){return o(`/api/super-admin/officers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getSuperAdminMinisters(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/super-admin/ministers${i?"?"+i:""}`)},async createMinister(e){return o("/api/super-admin/ministers",{method:"POST",body:e})},async updateMinister(e,t){return o(`/api/super-admin/ministers/${e}`,{method:"PATCH",body:t})},async setMinisterStatus(e,t){return o(`/api/super-admin/ministers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetMinisterPassword(e,t){return o(`/api/super-admin/ministers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getSuperAdminCitizens(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/super-admin/citizens${i?"?"+i:""}`)},async setCitizenStatus(e,t){return o(`/api/super-admin/citizens/${e}/status`,{method:"PATCH",body:{status:t}})},async getSuperAdminAuditLogs(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/super-admin/audit-logs${i?"?"+i:""}`)},async getSuperAdminLandRecords(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/super-admin/land-records${i?"?"+i:""}`)},async resetUserPassword(e,t){return o(`/api/super-admin/users/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStates(){return o("/api/super-admin/states")},async getSuperAdminStateAdmins(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/super-admin/state-admins${i?"?"+i:""}`)},async getSuperAdminStateAdmin(e){return o(`/api/super-admin/state-admins/${e}`)},async createStateAdmin(e){return o("/api/super-admin/state-admins",{method:"POST",body:e})},async updateStateAdmin(e,t){return o(`/api/super-admin/state-admins/${e}`,{method:"PATCH",body:t})},async setStateAdminStatus(e,t){return o(`/api/super-admin/state-admins/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminPassword(e,t){return o(`/api/super-admin/state-admins/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminDashboard(){return o("/api/state-admin/dashboard")},async getStateAdminOfficers(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/state-admin/officers${i?"?"+i:""}`)},async getStateAdminOfficer(e){return o(`/api/state-admin/officers/${e}`)},async createStateAdminOfficer(e){return o("/api/state-admin/officers",{method:"POST",body:e})},async updateStateAdminOfficer(e,t){return o(`/api/state-admin/officers/${e}`,{method:"PATCH",body:t})},async setStateAdminOfficerStatus(e,t){return o(`/api/state-admin/officers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminOfficerPassword(e,t){return o(`/api/state-admin/officers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminMinisters(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/state-admin/ministers${i?"?"+i:""}`)},async getStateAdminMinister(e){return o(`/api/state-admin/ministers/${e}`)},async createStateAdminMinister(e){return o("/api/state-admin/ministers",{method:"POST",body:e})},async updateStateAdminMinister(e,t){return o(`/api/state-admin/ministers/${e}`,{method:"PATCH",body:t})},async setStateAdminMinisterStatus(e,t){return o(`/api/state-admin/ministers/${e}/status`,{method:"PATCH",body:{status:t}})},async resetStateAdminMinisterPassword(e,t){return o(`/api/state-admin/ministers/${e}/reset-password`,{method:"POST",body:{newPassword:t}})},async getStateAdminCitizens(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/state-admin/citizens${i?"?"+i:""}`)},async getStateAdminCitizen(e){return o(`/api/state-admin/citizens/${e}`)},async getStateAdminLandRecords(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/state-admin/land-records${i?"?"+i:""}`)},async getStateAdminLandRecord(e){return o(`/api/state-admin/land-records/${e}`)},async getStateAdminApplications(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/state-admin/applications${i?"?"+i:""}`)},async getStateAdminApplication(e){return o(`/api/state-admin/applications/${e}`)},async getStateAdminReports(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/state-admin/reports${i?"?"+i:""}`)},async getSuperAdminOfficerWork(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/admin/work/officers${i?"?"+i:""}`)},async getSuperAdminOfficerProfile(e){return o(`/api/admin/work/officers/${encodeURIComponent(e)}`)},async getSuperAdminMinisterWork(e={}){const t=new URLSearchParams;for(const[n,a]of Object.entries(e))a!=null&&a!==""&&t.append(n,a);const i=t.toString();return o(`/api/admin/work/ministers${i?"?"+i:""}`)},async getSuperAdminMinisterProfile(e){return o(`/api/admin/work/ministers/${encodeURIComponent(e)}`)},async getSuperAdminReportsOverview(){return o("/api/admin/reports/overview")},async getSuperAdminReport(e,t={}){const i=new URLSearchParams({category:e});for(const[n,a]of Object.entries(t))a!=null&&a!==""&&i.append(n,a);return o(`/api/admin/reports/query?${i.toString()}`)},async getOfficerApplications(e={}){const t=new URLSearchParams;e.status&&t.set("status",e.status),e.page&&t.set("page",e.page),e.limit&&t.set("limit",e.limit);const i=t.toString()?`?${t.toString()}`:"";return o(`/api/officer/applications${i}`)},async getOfficerApplicationById(e){return o(`/api/officer/applications/${encodeURIComponent(e)}`)},async generateDigitalLandRecord(e,t={}){return o(`/api/officer/applications/${encodeURIComponent(e)}/generate`,{method:"POST",body:t})},async getDigitalRecordDraft(e){return o(`/api/officer/applications/${encodeURIComponent(e)}/digital-record`)},async updateDigitalRecordDraft(e,t){return o(`/api/officer/applications/${encodeURIComponent(e)}/digital-record`,{method:"PATCH",body:t})},async scheduleAppointment(e,t){return o(`/api/officer/applications/${encodeURIComponent(e)}/appointment`,{method:"POST",body:t})},async startVerification(e,t={}){return o(`/api/officer/applications/${encodeURIComponent(e)}/verification/start`,{method:"POST",body:t})},async sendVerificationOtp(e,t={}){return o(`/api/officer/applications/${encodeURIComponent(e)}/verification/otp/send`,{method:"POST",body:t})},async verifyVerificationOtp(e,t){return o(`/api/officer/applications/${encodeURIComponent(e)}/verification/otp/verify`,{method:"POST",body:t})},async uploadVerificationPhoto(e,t){return o(`/api/officer/applications/${encodeURIComponent(e)}/verification/photo`,{method:"POST",isFormData:!0,body:t})},async performFinalVerification(e,t={}){return o(`/api/officer/applications/${encodeURIComponent(e)}/final-verify`,{method:"POST",body:t})},async approveApplication(e,t={}){return o(`/api/officer/applications/${encodeURIComponent(e)}/approve`,{method:"POST",body:t})},async rejectApplication(e,t){return o(`/api/officer/applications/${encodeURIComponent(e)}/reject`,{method:"POST",body:t})},async submitLandRecordApplication(e){return o("/api/land-records/applications",{method:"POST",isFormData:!0,body:e})},async getMyLandApplications(){return o("/api/land-records/my-applications")},async getMyAppointments(){return o("/api/appointments")},async getApprovedLandRecords(){return o("/api/land-records/approved")},async getApprovedRecords(){return this.getApprovedLandRecords()},async getApprovedLandRecordById(e){return o(`/api/land-records/approved/${encodeURIComponent(e)}`)},async downloadApprovedLandRecordPdf(e){const t=U(),i=await fetch(`${B}/api/land-records/approved/${encodeURIComponent(e)}/pdf`,{headers:{...t?{Authorization:`Bearer ${t}`}:{}}});if(!i.ok)throw new Error(`Failed to download PDF certificate (${i.status})`);return i.blob()},async getNotifications(e={}){const t=new URLSearchParams;e.unreadOnly&&t.set("unreadOnly","true");const i=t.toString()?`?${t.toString()}`:"";return o(`/api/notifications${i}`)},async markNotificationRead(e){return o(`/api/notifications/${encodeURIComponent(e)}/read`,{method:"PATCH"})},async markAllNotificationsRead(){return o("/api/notifications/read-all",{method:"PATCH"})},getVerificationPhotoUrl(e){return`${B}/api/verification/photos/${encodeURIComponent(e)}`}};function Y(e){return e?(Array.isArray(e.roles)?e.roles:[e.primary_role||e.role||"CITIZEN"]).some(i=>String(i).toUpperCase()==="CITIZEN"):!1}class Le{constructor(){this.user=null,this.isAuthenticated=!1,this.activeTab="citizen-login",this.selectedRecordId=null,this.lastProcessResult=null,this.myDocuments=[],this.applications=[],this.applicationsLoading=!1,this.applicationsError="",this.selectedRecord=null,this.recordLoading=!1,this.recordError="",this.appointments=[],this.appointmentsLoading=!1,this.appointmentsError="",this.approvedRecords=[],this.approvedRecordsLoading=!1,this.notifications=[],this.unreadNotificationsCount=0,this.notificationsLoading=!1,this.toasts=[],this.loading=!1,this.listeners=new Set,window.addEventListener("dlr:unauthorized",()=>{this._resetSession(),this.addToast("error","Session expired. Please log in again."),this.notify()}),window.addEventListener("dlr:session-replaced",t=>{var n;this._resetSession();const i=((n=t.detail)==null?void 0:n.message)||"Your DLR session was replaced by a new login.";this.addToast("error",i),this.notify()})}_resetSession(){this.user=null,this.isAuthenticated=!1,this.activeTab="citizen-login",this.myDocuments=[],this.applications=[],this.appointments=[],this.approvedRecords=[],this.notifications=[],this.unreadNotificationsCount=0,this.selectedRecord=null,this.selectedRecordId=null}get isCitizen(){return Y(this.user)}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}notify(){for(const t of this.listeners)t(this)}addToast(t,i){const n=Date.now()+Math.random();this.toasts.push({id:n,type:t,message:i}),this.notify(),setTimeout(()=>{this.toasts=this.toasts.filter(a=>a.id!==n),this.notify()},4e3)}async init(){if(!b.getStoredToken()){this.notify();return}try{this.loading=!0,this.notify();const i=await b.getMe();if(!Y(i)){b.setStoredToken(null),this._resetSession();return}this.user=i,this.isAuthenticated=!0,this.activeTab="dashboard",await this._loadWorkspace()}catch{b.setStoredToken(null),this._resetSession()}finally{this.loading=!1,this.notify()}}async setAuthenticatedUser(t){if(!Y(t)){this.addToast("error","Access denied. This portal is for Citizens only.");return}this.user=t,this.isAuthenticated=!0,this.activeTab="dashboard",ze(t),await this._loadWorkspace(),this.notify()}async _loadWorkspace(){await Promise.all([this.loadMyDocuments(),this.loadApplications(),this.loadAppointments(),this.loadApprovedRecords(),this.loadNotifications()])}setActiveTab(t,i=null){const n=t==="records"?"my-records":t;if(n.startsWith("officer-")||n.startsWith("minister-")||n.startsWith("super-admin-")||n.startsWith("state-admin-")){this.addToast("error","Access denied. That area is restricted to Government / Admin portals.");return}this.activeTab=n,i&&(this.selectedRecordId=i),this.notify(),n==="record-details"&&this.loadSelectedRecord(),n==="applications"&&this.loadApplications(),n==="my-records"&&this.loadMyDocuments(),(n==="appointments"||n==="my-appointments")&&this.loadAppointments(),n==="approved-records"&&this.loadApprovedRecords(),n==="notifications"&&this.loadNotifications()}async loadMyDocuments(){try{const t=await b.getMyDocuments();this.myDocuments=Array.isArray(t)?t:(t==null?void 0:t.documents)||[],this.notify()}catch{}}async loadApplications(){this.applicationsLoading=!0,this.applicationsError="",this.notify();try{const t=await b.getMyApplications();this.applications=Array.isArray(t)?t:(t==null?void 0:t.applications)||[]}catch(t){this.applicationsError=t.message}finally{this.applicationsLoading=!1,this.notify()}}async loadAppointments(){this.appointmentsLoading=!0,this.appointmentsError="",this.notify();try{const t=await b.getAppointments();this.appointments=Array.isArray(t)?t:(t==null?void 0:t.appointments)||[]}catch(t){this.appointmentsError=t.message}finally{this.appointmentsLoading=!1,this.notify()}}async loadApprovedRecords(){this.approvedRecordsLoading=!0,this.notify();try{const t=await b.getApprovedRecords();this.approvedRecords=Array.isArray(t)?t:(t==null?void 0:t.records)||[]}catch{}finally{this.approvedRecordsLoading=!1,this.notify()}}async loadSelectedRecord(){if(this.selectedRecordId){this.recordLoading=!0,this.recordError="",this.notify();try{const t=await b.getDocument(this.selectedRecordId);this.selectedRecord=t}catch(t){this.recordError=t.message}finally{this.recordLoading=!1,this.notify()}}}async loadNotifications(){this.notificationsLoading=!0;try{const t=await b.getNotifications(),i=Array.isArray(t)?t:(t==null?void 0:t.notifications)||[];this.notifications=i,this.unreadNotificationsCount=i.filter(n=>!n.is_read).length}catch{}finally{this.notificationsLoading=!1,this.notify()}}async logout(){try{await b.logout()}catch{}finally{b.setStoredToken(null),this._resetSession(),this.addToast("success","Logged out successfully."),this.notify()}}}const r=new Le;function s(e){return String(e??"").replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[t])}function V(e){if(!e)return"—";const t=new Date(e);return Number.isNaN(t.getTime())?"—":t.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}function I(e){const t=String(e||"").toUpperCase();return["PROCESSED","APPROVED","PASS","VALID","COMPLETED"].includes(t)?"badge-success":["FAILED","REJECTED","CRITICAL","ERROR","INVALID"].includes(t)?"badge-danger":["WARNING","CORRECTION_REQUIRED","ON_HOLD","PENDING_REVIEW","IN_REVIEW","REVIEW_REQUIRED","PENDING_OFFICER_VERIFICATION"].includes(t)?"badge-warning":"badge-info"}function k(e,t="Officer Verification Required"){if(e==null)return t;if(typeof e=="string"){const i=e.trim();return!i||i==="—"||i==="null"||i==="undefined"||i==="NOT_DETECTED"||i==="[object Object]"?t:i}if(typeof e=="number")return String(e);if(typeof e=="boolean")return e?"Yes":"No";if(Array.isArray(e))return e.length===0?t:e.map(i=>k(i,"")).filter(Boolean).join(", ")||t;if(typeof e=="object"){if(e.value!==void 0&&e.value!==null)return k(e.value,t);if(e.text!==void 0&&e.text!==null)return k(e.text,t);if(e.name!==void 0&&e.name!==null)return k(e.name,t);const i=Object.keys(e);if(i.length===0)return t;const n=i.map(a=>`${a}: ${k(e[a],"")}`).filter(a=>!a.endsWith(": "));return n.length>0?n.join("; "):t}return String(e)||t}function Oe(e,t="—"){return k(e,t)}let N=!1;function ue(){const{user:e,isAuthenticated:t,notifications:i,unreadNotificationsCount:n}=r;if(!t||!e)return`
      <header class="app-header">
        <div class="header-left">
          <div class="emblem-badge">
            <div class="emblem-icon">🏛️</div>
            <div>
              <div style="font-weight:700;">DLR Citizen Portal</div>
              <div class="gov-tag">Government of India · SIH 2026 Problem 26018</div>
            </div>
          </div>
        </div>
      </header>
    `;const a=(e.fullName||e.external_reference||"CITIZEN-USER").replace("AADHAAR-","");return`
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display:none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">📜</div>
          <div>
            <div style="font-size:1.05rem; font-weight:700;">DLR Citizen Portal</div>
            <div class="gov-tag">Public Land Record Digitization & Validation</div>
          </div>
        </div>
      </div>

      <div class="header-right" style="display:flex; align-items:center; gap:0.75rem; position:relative;">
        <!-- Notification Bell Icon -->
        <div style="position:relative;">
          <button id="header-notif-btn" class="btn btn-outline btn-sm" title="Notifications" style="position:relative; font-size:1.1rem; padding:0.4rem 0.65rem;">
            🔔
            ${n>0?`<span style="position:absolute; top:-4px; right:-4px; background:#dc2626; color:#fff; border-radius:50%; width:18px; height:18px; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center;">${n}</span>`:""}
          </button>

          <!-- Notifications Dropdown -->
          ${N?`
            <div id="notifications-dropdown" style="position:absolute; right:0; top:calc(100% + 8px); width:340px; background:#1e293b; border:1px solid #334155; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.4); z-index:9999; overflow:hidden;">
              <div style="padding:0.75rem 1rem; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; font-size:0.9rem;">Notifications</span>
                <span style="font-size:0.75rem; color:#94a3b8;">${n} unread</span>
              </div>
              <div style="max-height:260px; overflow-y:auto;">
                ${i.length===0?'<div style="padding:1.5rem; text-align:center; color:#64748b; font-size:0.85rem;">No notifications at this time.</div>':i.slice(0,8).map(p=>`
                      <div class="notif-item ${p.is_read?"":"unread"}" data-id="${s(p.id)}" style="padding:0.65rem 1rem; border-bottom:1px solid #1e293b; cursor:pointer; background:${p.is_read?"transparent":"rgba(59,130,246,0.08)"};">
                        <div style="font-size:0.82rem; font-weight:600; color:${p.is_read?"#cbd5e1":"#60a5fa"};">${s(p.title)}</div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">${s(p.message)}</div>
                        <div style="font-size:0.7rem; color:#64748b; margin-top:3px;">${V(p.created_at)}</div>
                      </div>
                    `).join("")}
              </div>
              <div style="padding:0.5rem 1rem; border-top:1px solid #334155; text-align:center;">
                <button id="view-all-notifs-btn" class="btn btn-ghost btn-sm" style="font-size:0.75rem; width:100%;">View All in Notifications Tab</button>
              </div>
            </div>
          `:""}
        </div>

        <!-- User Identity Tag -->
        <div class="user-info">
          <div style="font-size:0.85rem; font-weight:600;">${s(a)}</div>
          <div style="font-size:0.7rem; color:#38bdf8;">Verified Citizen</div>
        </div>

        <button id="header-logout-btn" class="btn btn-outline btn-sm">Logout</button>
      </div>
    </header>
  `}function fe(){const e=document.getElementById("header-logout-btn");e&&e.addEventListener("click",()=>{r.logout()});const t=document.getElementById("header-notif-btn");t&&t.addEventListener("click",n=>{n.stopPropagation(),N=!N,r.notify()});const i=document.getElementById("view-all-notifs-btn");i&&i.addEventListener("click",()=>{N=!1,r.setActiveTab("notifications")}),document.addEventListener("click",n=>{N&&!n.target.closest("#header-notif-btn")&&!n.target.closest("#notifications-dropdown")&&(N=!1,r.notify())},{once:!0})}function xe(){const e=r.activeTab;return`
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">🏛️</div>
        <div>
          <div style="font-weight:700; font-size:1.05rem;">DLR Portal</div>
          <div style="font-size:0.7rem; color:#94a3b8;">Citizen Services</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">CITIZEN SERVICES</div>
        ${[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"upload",label:"Submit Land Record",icon:"📤"},{id:"my-records",label:"My Land Records",icon:"📜"},{id:"applications",label:"Applications",icon:"📋"},{id:"my-appointments",label:"Appointments",icon:"📅"},{id:"profile",label:"Profile",icon:"👤"}].map(i=>`
          <button
            class="sidebar-nav-item ${e===i.id?"active":""}"
            data-tab="${i.id}"
          >
            <span class="nav-icon">${i.icon}</span>
            <span>${i.label}</span>
          </button>
        `).join("")}
      </nav>

      <div class="sidebar-footer">
        <div style="font-size:0.75rem; color:#64748b; line-height:1.4;">
          Secure DLR Session<br />
          <span style="color:#22c55e;">● Authenticated</span>
        </div>
      </div>
    </aside>
  `}function ke(){document.querySelectorAll(".sidebar-nav-item").forEach(t=>{t.addEventListener("click",()=>{const i=t.getAttribute("data-tab");i&&r.setActiveTab(i)})})}function ge(){const{toasts:e}=r;return!e||e.length===0?"":`
    <div class="toast-container">
      ${e.map(t=>`
        <div class="toast toast-${t.type}">
          <span>${t.type==="error"?"⚠️":t.type==="success"?"✅":"ℹ️"}</span>
          <div>${t.message}</div>
        </div>
      `).join("")}
    </div>
  `}let C="",w={aadhaarNumber:"",fullName:"",dateOfBirth:"",gender:"",state:"",district:"",taluk:"",village:"",pincode:""},T=["","","","","",""],_="",H="",j="",h=!1,v="",M=!1,L=!1,x=45,$=null;function Ne(e){const t=Math.floor(e/60),i=e%60;return`${t<10?"0":""}${t}:${i<10?"0":""}${i}`}function Q(){$&&clearInterval($),x=45,$=setInterval(()=>{x-=1,x<=0&&(clearInterval($),$=null),r.notify()},1e3)}function ve(){C="",T=["","","","","",""],_="",H="",j="",h=!1,v="",M=!1,L=!1,$&&(clearInterval($),$=null)}function ye(){const e=r.activeTab==="citizen-register";return M?`
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📱</div>
            <h1>Verify Your Identity</h1>
            <p>OTP sent to mobile ending in ${s(H||"••••"+(_||"").slice(-4))}</p>
          </div>

          ${v?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${s(v)}</div>`:""}

          <form id="citizen-otp-form">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <label class="form-label" style="margin:0;">Verified Identity Reference</label>
              <span class="badge badge-info">${s(_)}</span>
            </div>

            <div class="otp-inputs-container" style="display:flex;gap:0.5rem;justify-content:center;margin:1.5rem 0;">
              ${[0,1,2,3,4,5].map(t=>`
                <input type="text" class="otp-box" data-index="${t}" maxlength="1" inputmode="numeric" pattern="[0-9]*" value="${s(T[t]||"")}" ${t===0?"autofocus":""} />
              `).join("")}
            </div>

            <button type="submit" id="citizen-otp-submit-btn" class="btn btn-primary" style="width:100%;font-size:1rem;padding:0.85rem;" ${h?"disabled":""}>
              ${h?'<div class="spinner"></div> Verifying...':L?"Verify & Register":"Verify OTP & Enter Portal"}
            </button>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;padding:0.75rem 1rem;background:rgba(0,0,0,0.2);border-radius:var(--radius-md);border:1px solid var(--border-color);">
              <button type="button" id="citizen-resend-otp-btn" class="btn btn-outline" style="font-size:0.85rem;padding:0.4rem 0.75rem;" ${x>0||h?"disabled":""}>
                Resend OTP
              </button>
              <span style="font-family:monospace;font-size:1.1rem;font-weight:700;color:${x>0?"var(--primary)":"var(--text-muted)"};">
                ${Ne(x)}
              </span>
            </div>

            <button type="button" id="citizen-otp-back-btn" class="btn btn-outline" style="width:100%;margin-top:1rem;">
              ← Back to ${L?"Registration":"Login"}
            </button>
          </form>

          <div style="margin-top:1.5rem;text-align:center;">
            <a href="#" id="back-to-portal-link-otp" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
          </div>
        </div>
      </div>
    `:e?`
      <div class="auth-container">
        <div class="auth-card wide-card">
          <div class="auth-header">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">📝</div>
            <h1>Create Citizen Account</h1>
            <p>Register your identity with official land records</p>
          </div>

          ${v?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${s(v)}</div>`:""}

          <form id="citizen-register-form">
            <div style="margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
              <h3 style="font-size:0.9rem;text-transform:uppercase;color:var(--primary);letter-spacing:0.05em;font-weight:700;">Identity Details</h3>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:1rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-aadhaar">Aadhaar Number *</label>
                <input type="text" id="reg-aadhaar" class="form-control" placeholder="12-digit number" maxlength="14" value="${s(w.aadhaarNumber)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-name">Full Name *</label>
                <input type="text" id="reg-name" class="form-control" placeholder="As per official documents" value="${s(w.fullName)}" required />
              </div>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:1.25rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-dob">Date of Birth *</label>
                <input type="date" id="reg-dob" class="form-control" value="${s(w.dateOfBirth)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-gender">Gender *</label>
                <select id="reg-gender" class="form-control" required style="appearance:auto;">
                  <option value="">Select Gender</option>
                  <option value="Male" ${w.gender==="Male"?"selected":""}>Male</option>
                  <option value="Female" ${w.gender==="Female"?"selected":""}>Female</option>
                  <option value="Other" ${w.gender==="Other"?"selected":""}>Other</option>
                  <option value="Prefer not to say" ${w.gender==="Prefer not to say"?"selected":""}>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
              <h3 style="font-size:0.9rem;text-transform:uppercase;color:var(--primary);letter-spacing:0.05em;font-weight:700;">Address Details</h3>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:0.75rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-state">State *</label>
                <input type="text" id="reg-state" class="form-control" placeholder="e.g. Tamil Nadu" value="${s(w.state)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-district">District *</label>
                <input type="text" id="reg-district" class="form-control" placeholder="e.g. Salem" value="${s(w.district)}" required />
              </div>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:1.25rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-taluk">Taluk *</label>
                <input type="text" id="reg-taluk" class="form-control" placeholder="e.g. Attur" value="${s(w.taluk)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-village">Village / Town *</label>
                <input type="text" id="reg-village" class="form-control" placeholder="e.g. Attur Town" value="${s(w.village)}" required />
              </div>
            </div>
            <div class="form-group" style="margin-bottom:1.5rem;">
              <label class="form-label" for="reg-pincode">Pincode *</label>
              <input type="text" id="reg-pincode" class="form-control" placeholder="6-digit pincode" maxlength="6" value="${s(w.pincode)}" required />
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;font-size:1rem;padding:0.85rem;" ${h?"disabled":""}>
              ${h?'<div class="spinner"></div> Processing Registration...':"Verify & Send OTP →"}
            </button>
          </form>

          <div style="margin-top:1.25rem;text-align:center;font-size:0.9rem;">
            <span style="color:var(--text-muted);">Already registered?</span>
            <a href="#" id="link-go-citizen-login" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Login here</a>
          </div>
          <div style="margin-top:0.75rem;text-align:center;">
            <a href="#" id="back-to-portal-link-reg" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
          </div>
        </div>
      </div>
    `:`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">👤</div>
          <h1>Citizen Land Portal</h1>
          <p>Aadhaar Identity Authentication</p>
        </div>

        ${v?`<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${s(v)}</div>`:""}

        <form id="citizen-otp-request-form">
          <div class="form-group">
            <label class="form-label" for="citizen-aadhaar-input">12-Digit Aadhaar Number</label>
            <input type="text" id="citizen-aadhaar-input" class="form-control" placeholder="e.g. 9999 8888 1234" maxlength="14" value="${s(C)}" required autocomplete="off" />
            <div style="font-size:0.75rem;color:var(--text-subtle);margin-top:0.35rem;">
              Your Aadhaar is used for identity verification only. Full Aadhaar is never stored or displayed.
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;" ${h?"disabled":""}>
            ${h?'<div class="spinner"></div> Requesting OTP...':"Send OTP →"}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.9rem;">
          <span style="color:var(--text-muted);">New citizen?</span>
          <a href="#" id="link-go-citizen-register" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Register Now</a>
        </div>
        <div style="margin-top:0.75rem;text-align:center;">
          <a href="#" id="back-to-portal-link" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>
      </div>
    </div>
  `}function be(){var e,t,i,n,a,p,l;["back-to-portal-link","back-to-portal-link-otp","back-to-portal-link-reg"].forEach(d=>{var c;(c=document.getElementById(d))==null||c.addEventListener("click",m=>{m.preventDefault(),ve(),r.activeTab="portal",r.notify()})}),(e=document.getElementById("link-go-citizen-register"))==null||e.addEventListener("click",d=>{d.preventDefault(),v="",r.activeTab="citizen-register",r.notify()}),(t=document.getElementById("link-go-citizen-login"))==null||t.addEventListener("click",d=>{d.preventDefault(),v="",r.activeTab="citizen-login",r.notify()}),(i=document.getElementById("citizen-otp-request-form"))==null||i.addEventListener("submit",async d=>{var u;d.preventDefault();const m=(((u=document.getElementById("citizen-aadhaar-input"))==null?void 0:u.value)||"").trim().replace(/[\s-]/g,"");if(m.length!==12||!/^\d{12}$/.test(m)){v="Please enter a valid 12-digit Aadhaar number.",r.notify();return}C=m,h=!0,v="",r.notify();try{const f=await b.citizenLogin(m);_=f.maskedAadhaar||`XXXX-XXXX-${m.slice(-4)}`,H=`••••${m.slice(-4)}`,j=f.sessionId,L=!1,T=["","","","","",""],M=!0,Q(),r.addToast("success",`OTP sent to mobile registered with ${_}.`)}catch(f){v=f.status===404||f.code==="CITIZEN_NOT_FOUND"?"Citizen account not found. Please register first.":f.message||"Failed to request OTP."}finally{h=!1,r.notify()}}),(n=document.getElementById("citizen-register-form"))==null||n.addEventListener("submit",async d=>{var ae,se,re,oe,de,ce,le,pe,me;d.preventDefault();const c=(((ae=document.getElementById("reg-aadhaar"))==null?void 0:ae.value)||"").trim().replace(/[\s-]/g,""),m=(((se=document.getElementById("reg-name"))==null?void 0:se.value)||"").trim(),u=(((re=document.getElementById("reg-dob"))==null?void 0:re.value)||"").trim(),f=(((oe=document.getElementById("reg-gender"))==null?void 0:oe.value)||"").trim(),y=(((de=document.getElementById("reg-state"))==null?void 0:de.value)||"").trim(),E=(((ce=document.getElementById("reg-district"))==null?void 0:ce.value)||"").trim(),A=(((le=document.getElementById("reg-taluk"))==null?void 0:le.value)||"").trim(),G=(((pe=document.getElementById("reg-village"))==null?void 0:pe.value)||"").trim(),J=(((me=document.getElementById("reg-pincode"))==null?void 0:me.value)||"").trim();if(w={aadhaarNumber:c,fullName:m,dateOfBirth:u,gender:f,state:y,district:E,taluk:A,village:G,pincode:J},c.length!==12||!/^\d{12}$/.test(c)){v="Aadhaar number must contain exactly 12 numeric digits.",r.notify();return}if(!m){v="Full Name is required.",r.notify();return}if(!u){v="Date of Birth is required.",r.notify();return}if(!f){v="Please select a Gender option.",r.notify();return}if(!y||!E||!A||!G){v="State, District, Taluk, and Village are all required.",r.notify();return}if(J.length!==6||!/^\d{6}$/.test(J)){v="Pincode must contain exactly 6 numeric digits.",r.notify();return}C=c,h=!0,v="",r.notify();try{const P=await b.citizenRegister(w);_=P.maskedAadhaar||`XXXX-XXXX-${c.slice(-4)}`,H=`••••${c.slice(-4)}`,j=P.sessionId,L=!0,T=["","","","","",""],M=!0,Q(),r.addToast("success",`Registration initiated! OTP sent for ${_}.`)}catch(P){v=P.status===409||P.code==="DUPLICATE_IDENTITY"||P.code==="CITIZEN_ALREADY_REGISTERED"?"This identity is already registered. Please use Citizen Login.":P.message||"Registration failed. Please try again."}finally{h=!1,r.notify()}}),document.querySelectorAll(".otp-box").forEach(d=>{d.addEventListener("input",c=>{var f;const m=parseInt(d.getAttribute("data-index"),10),u=c.target.value.replace(/\D/g,"");d.value=u?u.slice(-1):"",T[m]=d.value,u&&m<5&&((f=document.querySelector(`.otp-box[data-index="${m+1}"]`))==null||f.focus())}),d.addEventListener("keydown",c=>{const m=parseInt(d.getAttribute("data-index"),10);if(c.key==="Backspace"&&!d.value&&m>0){const u=document.querySelector(`.otp-box[data-index="${m-1}"]`);u&&(u.focus(),u.value="",T[m-1]="")}}),d.addEventListener("paste",c=>{var u;c.preventDefault();const m=(c.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"").slice(0,6).split("");m.forEach((f,y)=>{T[y]=f;const E=document.querySelector(`.otp-box[data-index="${y}"]`);E&&(E.value=f)}),(u=document.querySelector(`.otp-box[data-index="${Math.min(m.length,5)}"]`))==null||u.focus()})}),(a=document.getElementById("citizen-otp-form"))==null||a.addEventListener("submit",async d=>{d.preventDefault();const c=T.join("");if(c.length!==6||!/^\d{6}$/.test(c)){v="Please enter the complete 6-digit OTP code.",r.notify();return}h=!0,v="",r.notify();try{const m=await b.citizenVerifyOtp({aadhaarNumber:C,otp:c,sessionId:j});$&&clearInterval($),ve(),r.addToast("success",L?"Account created & verified! Welcome to the Citizen Portal.":"Authentication successful! Welcome to the Citizen Portal."),await r.setAuthenticatedUser(m.user)}catch(m){v=m.message||"Verification failed. Incorrect or expired OTP code.",h=!1,r.notify()}}),(p=document.getElementById("citizen-resend-otp-btn"))==null||p.addEventListener("click",async()=>{if(!(x>0||h)){h=!0,v="",r.notify();try{j=(L?await b.citizenRegister(w):await b.citizenLogin(C)).sessionId,T=["","","","","",""],Q(),r.addToast("success",`A new OTP has been sent for ${_}.`)}catch(d){v=d.message||"Failed to resend OTP."}finally{h=!1,r.notify()}}}),(l=document.getElementById("citizen-otp-back-btn"))==null||l.addEventListener("click",()=>{$&&clearInterval($),M=!1,v="",r.notify()})}function Ce(){const{user:e,myDocuments:t,approvedRecords:i,appointments:n}=r,a=t.length,p=(i||[]).length,l=(n||[]).filter(c=>c.status==="SCHEDULED"||c.status==="CONFIRMED").length,d=r.applications.filter(c=>["PENDING_REVIEW","PENDING_OFFICER_REVIEW","UNDER_OFFICER_REVIEW","IN_REVIEW","CORRECTION_REQUIRED","APPOINTMENT_SCHEDULED","CITIZEN_VERIFICATION"].includes(c.status)).length;return`
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem;">Citizen Dashboard</h1>
          <p style="color: var(--text-muted);">Welcome back, <strong>${s((e==null?void 0:e.name)||"Citizen")}</strong></p>
        </div>
        <button id="quick-upload-btn" class="btn btn-primary">
          <span>📤</span> Submit Land Record
        </button>
      </div>

      <!-- Metric Cards -->
      <div class="grid-metrics" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Submitted Applications</div>
            <div class="value">${a}</div>
          </div>
          <div class="metric-icon" style="background: rgba(79, 70, 229, 0.15); color: var(--primary);">📁</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Government Verified</div>
            <div class="value">${p}</div>
          </div>
          <div class="metric-icon" style="background: var(--success-bg); color: var(--success);">🏛️</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Active In Review</div>
            <div class="value">${d}</div>
          </div>
          <div class="metric-icon" style="background: var(--warning-bg); color: var(--warning);">⏳</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Upcoming Appointments</div>
            <div class="value">${l}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: var(--info);">📅</div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <h2 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">Quick Actions</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem;">
        <div class="card action-card" id="card-action-upload" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📄</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Submit Land Record</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Upload original deed document and declare land ownership details.</p>
          <div class="btn btn-outline btn-sm">Submit Record →</div>
        </div>

        <div class="card action-card" id="card-action-records" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📜</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">My Land Records</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Browse verified digital certificates, survey numbers, and download records.</p>
          <div class="btn btn-outline btn-sm">View Land Records →</div>
        </div>

        <div class="card action-card" id="card-action-applications" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Track Application Status</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Monitor officer review progress through the 8-stage verification lifecycle.</p>
          <div class="btn btn-outline btn-sm">Track Applications →</div>
        </div>

        <div class="card action-card" id="card-action-appointments" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📅</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">My Appointments</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">View scheduled government office visits for physical scrutiny & biometrics.</p>
          <div class="btn btn-outline btn-sm">View Appointments →</div>
        </div>
      </div>

      <!-- Recent Uploads Table -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 600;">Recent Document Submissions</h2>
          <button id="view-all-records-btn" class="btn btn-outline btn-sm">View All Records</button>
        </div>

        ${t.length===0?`
          <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
            <p>No land documents submitted yet.</p>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Submit Land Record" above to start the government verification workflow.</p>
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
                ${t.slice(0,5).map(c=>`
                  <tr>
                    <td><strong style="font-family: monospace;">${c.document_id}</strong></td>
                    <td>${c.original_filename}</td>
                    <td><span class="badge badge-info">${(c.file_type||"PDF").toUpperCase()}</span></td>
                    <td>
                      <span class="badge ${c.processing_status==="PROCESSED"?"badge-success":c.processing_status==="FAILED"?"badge-danger":"badge-warning"}">
                        ${c.processing_status}
                      </span>
                    </td>
                    <td>${new Date(c.uploaded_at||c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button class="btn btn-outline btn-sm view-doc-btn" data-id="${c.document_id}">
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
  `}function Ve(){var e,t,i,n,a,p;(e=document.getElementById("quick-upload-btn"))==null||e.addEventListener("click",()=>r.setActiveTab("upload")),(t=document.getElementById("card-action-upload"))==null||t.addEventListener("click",()=>r.setActiveTab("upload")),(i=document.getElementById("card-action-records"))==null||i.addEventListener("click",()=>r.setActiveTab("my-records")),(n=document.getElementById("card-action-applications"))==null||n.addEventListener("click",()=>r.setActiveTab("applications")),(a=document.getElementById("card-action-appointments"))==null||a.addEventListener("click",()=>r.setActiveTab("my-appointments")),(p=document.getElementById("view-all-records-btn"))==null||p.addEventListener("click",()=>r.setActiveTab("my-records")),document.querySelectorAll(".view-doc-btn").forEach(l=>{l.addEventListener("click",()=>{const d=l.getAttribute("data-id");r.setActiveTab("record-details",d)})})}const Be=["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];let S=null,F="idle",D="",O=null,Z=null;const g={owner_name:"",aadhaar_number:"",survey_number:"",subdivision_number:"",area:"",area_unit:"Acres",village:"",taluk:"",district:"",state:"Tamil Nadu",classification:"Agricultural (Ryotwari)",patta_number:"",document_type:"Sale Deed",document_date:"",description:""},Ue=["application/pdf","image/jpeg","image/png"],he=10*1024*1024;function je(e){return`${s(e.name)} · ${(e.size/1024/1024).toFixed(2)} MB · ${s(e.type||"unknown")}`}function Ee(e){D="",e&&(!Ue.includes(e.type)||e.size>he?(S=null,D=e.size>he?"File exceeds the 10 MB limit.":"Upload a PDF, JPG, JPEG, or PNG document."):S=e,r.notify())}async function Me(){Z&&clearTimeout(Z),Z=setTimeout(async()=>{var a,p,l,d;const e=(a=g.survey_number)==null?void 0:a.trim(),t=(p=g.village)==null?void 0:p.trim(),i=(l=g.taluk)==null?void 0:l.trim(),n=(d=g.district)==null?void 0:d.trim();if(e&&t&&i&&n)try{const c=await b.checkDuplicateRecord({surveyNumber:e,village:t,taluk:i,district:n});c!=null&&c.isDuplicate?O={message:c.message||`Survey Number ${e} is already registered for this location.`,warning:"⚠️ POSSIBLE DUPLICATE LAND RECORD"}:O=null,r.notify()}catch{}else O&&(O=null,r.notify())},400)}function Fe(){return`
    <div class="page-content narrow-page">
      <div class="page-heading">
        <div>
          <h1>Upload Land Document</h1>
          <p>Submit your property document and manual land details for official government verification.</p>
        </div>
      </div>
      <div class="notice notice-info">
        Note: AI document processing will only be initiated by the reviewing officer during official verification. Your document and details are securely stored directly in the government database.
      </div>
      <section class="card">
        <input id="document-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden />
        <div id="document-dropzone" class="dropzone" role="button" tabindex="0" aria-label="Choose a land document">
          <div class="dropzone-icon">📄</div>
          <h2>Drop your land document here</h2>
          <p>or click to select from your device</p>
          <button id="browse-document-btn" type="button" class="btn btn-outline">Browse files</button>
          <p class="helper-text">Supported: PDF, JPG, JPEG, PNG · Maximum 10 MB</p>
        </div>
        ${S?`<div class="file-row" style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div><strong>${s(S.name)}</strong><p style="margin: 0; font-size: 0.85rem; color: #64748b;">${je(S)}</p></div>
          <button id="remove-document-btn" class="btn btn-outline btn-sm">Remove</button>
        </div>`:""}
        ${D?`<div class="notice notice-error" style="margin-top: 1rem;">${s(D)}</div>`:""}

        <h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem; font-size: 1.1rem; color: #1e293b;">Citizen Land Details</h3>
        <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #64748b;">Enter manual details from your original deed. Aadhaar will be securely masked.</p>

        <div class="form-grid" style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
          <label class="field"><span>Owner Name *</span><input id="citizen-owner-name" class="form-control" value="${s(g.owner_name)}" placeholder="e.g. Varadhan" required /></label>
          <label class="field"><span>Aadhaar Number *</span><input id="citizen-aadhaar-number" class="form-control" inputmode="numeric" value="${s(g.aadhaar_number)}" placeholder="12-digit Aadhaar" required /></label>
          <label class="field"><span>Survey Number *</span><input id="citizen-survey-number" class="form-control" value="${s(g.survey_number)}" placeholder="e.g. 13/3B or 928/375A" required /></label>
          <label class="field"><span>Sub-Division Number</span><input id="citizen-subdivision-number" class="form-control" value="${s(g.subdivision_number)}" placeholder="e.g. 3B" /></label>
          <label class="field"><span>Area / Extent *</span><input id="citizen-area" class="form-control" value="${s(g.area)}" placeholder="e.g. 0.06 or 2.35" required /></label>
          <label class="field">
            <span>Area Unit *</span>
            <select id="citizen-area-unit" class="form-control">
              ${["Acres","Hectares","Cents","Sq. Feet","Sq. Meters","Guntha"].map(e=>`
                <option value="${e}" ${g.area_unit===e?"selected":""}>${e}</option>
              `).join("")}
            </select>
          </label>
          <label class="field"><span>Village *</span><input id="citizen-village" class="form-control" value="${s(g.village)}" placeholder="e.g. Alaputhur" required /></label>
          <label class="field"><span>Taluk *</span><input id="citizen-taluk" class="form-control" value="${s(g.taluk)}" placeholder="e.g. Salem" required /></label>
          <label class="field"><span>District *</span><input id="citizen-district" class="form-control" value="${s(g.district)}" placeholder="e.g. Salem" required /></label>
          <label class="field">
            <span>State *</span>
            <select id="citizen-state" class="form-control">
              ${Be.map(e=>`
                <option value="${e}" ${g.state===e?"selected":""}>${e}</option>
              `).join("")}
            </select>
          </label>
          <label class="field">
            <span>Land Classification *</span>
            <select id="citizen-classification" class="form-control">
              ${["Agricultural (Ryotwari)","Agricultural (Nanjai/Wet)","Agricultural (Punjai/Dry)","Residential","Commercial","Industrial","Grama Natham","Poramboke / Government"].map(e=>`
                <option value="${e}" ${g.classification===e?"selected":""}>${e}</option>
              `).join("")}
            </select>
          </label>
          <label class="field"><span>Patta Number (if available)</span><input id="citizen-patta-number" class="form-control" value="${s(g.patta_number)}" placeholder="e.g. 2104" /></label>
          <label class="field">
            <span>Document Type</span>
            <select id="citizen-document-type" class="form-control">
              ${["Sale Deed","Settlement Deed","Patta Passbook","Partition Deed","Gift Deed","Title Deed","Court Decree"].map(e=>`
                <option value="${e}" ${g.document_type===e?"selected":""}>${e}</option>
              `).join("")}
            </select>
          </label>
          <label class="field"><span>Document Date</span><input id="citizen-document-date" type="date" class="form-control" value="${s(g.document_date)}" /></label>
          <label class="field" style="grid-column: 1 / -1;"><span>Property Description / Remarks</span><input id="citizen-description" class="form-control" value="${s(g.description)}" placeholder="Optional deed or boundary remarks" /></label>
        </div>

        ${O?`
          <div class="notice notice-warning" style="margin-top: 1.25rem; border-left: 4px solid #f59e0b; background: #fffbeb; padding: 1rem; border-radius: 6px;">
            <div style="font-weight: 700; color: #b45309; font-size: 1.05rem;">${s(O.warning)}</div>
            <p style="margin: 0.25rem 0 0.5rem; color: #92400e; font-weight: 600;">${s(O.message)}</p>
            <small style="color: #78350f; display: block; line-height: 1.4;">
              Survey Number duplicate detected for this location. Possible reasons include ownership transfer, inheritance, mutation, subdivision, or duplicate data entry. Your application can still be submitted and will be flagged for Government Officer verification.
            </small>
          </div>
        `:""}

        <div class="upload-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button id="process-document-btn" class="btn btn-primary" ${!S||F==="processing"?"disabled":""}>
            ${F==="processing"?'<span class="spinner"></span> Submitting Application…':"Submit Land Application"}
          </button>
        </div>
      </section>
    </div>`}function qe(){const e=document.getElementById("document-file-input"),t=document.getElementById("document-dropzone"),i=document.getElementById("browse-document-btn"),n=document.getElementById("remove-document-btn"),a=document.getElementById("process-document-btn"),p=[["owner_name",document.getElementById("citizen-owner-name")],["aadhaar_number",document.getElementById("citizen-aadhaar-number")],["survey_number",document.getElementById("citizen-survey-number")],["subdivision_number",document.getElementById("citizen-subdivision-number")],["area",document.getElementById("citizen-area")],["area_unit",document.getElementById("citizen-area-unit")],["village",document.getElementById("citizen-village")],["taluk",document.getElementById("citizen-taluk")],["district",document.getElementById("citizen-district")],["state",document.getElementById("citizen-state")],["classification",document.getElementById("citizen-classification")],["patta_number",document.getElementById("citizen-patta-number")],["document_type",document.getElementById("citizen-document-type")],["document_date",document.getElementById("citizen-document-date")],["description",document.getElementById("citizen-description")]];for(const[l,d]of p){if(!d)continue;const c=m=>{g[l]=m.target.value,["survey_number","village","taluk","district"].includes(l)&&Me()};d.addEventListener("input",c),d.addEventListener("change",c)}i==null||i.addEventListener("click",l=>{l.stopPropagation(),e==null||e.click()}),t==null||t.addEventListener("click",()=>e==null?void 0:e.click()),t==null||t.addEventListener("keydown",l=>{(l.key==="Enter"||l.key===" ")&&(e==null||e.click())}),e==null||e.addEventListener("change",()=>{var l;return Ee((l=e.files)==null?void 0:l[0])});for(const l of["dragenter","dragover"])t==null||t.addEventListener(l,d=>{d.preventDefault(),t.classList.add("active")});for(const l of["dragleave","drop"])t==null||t.addEventListener(l,d=>{d.preventDefault(),t.classList.remove("active")});t==null||t.addEventListener("drop",l=>{var d,c;return Ee((c=(d=l.dataTransfer)==null?void 0:d.files)==null?void 0:c[0])}),n==null||n.addEventListener("click",()=>{S=null,D="",r.notify()}),a==null||a.addEventListener("click",async()=>{var l,d,c,m;if(S){if(!((l=g.owner_name)!=null&&l.trim())||!((d=g.survey_number)!=null&&d.trim())||!((c=g.village)!=null&&c.trim())||!((m=g.district)!=null&&m.trim())){D="Please provide Owner Name, Survey Number, Village, and District.",r.notify();return}F="processing",D="",r.notify();try{const u=Object.fromEntries(Object.entries(g).filter(([,y])=>y!=null&&String(y).trim()!=="")),f=await b.submitCitizenApplication(S,{citizenData:u});S=null,F="idle",O=null;for(const y of Object.keys(g))g[y]="";r.addToast("success","Land application submitted successfully! Status: PENDING OFFICER VERIFICATION."),await r.loadMyDocuments(),r.setActiveTab("records")}catch(u){u.status===413||u.code==="FILE_TOO_LARGE"?D="File exceeds the 10 MB limit.":D=u.status>=500?"Application submission failed. Please try again or upload a clearer document.":u.message,F="idle",r.notify()}}})}const Ge=["Document uploaded","OCR processing","Information extraction","AI validation","GIS validation","Officer review"];function We(e){return String(e).replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Xe(e,t){const i=typeof t=="object"?t.confidence:null,n=Oe(t);return`<div class="result-field"><dt>${s(We(e))}</dt><dd>${s(n??"Not extracted")}${typeof i=="number"?`<span>Confidence: ${Math.round(i*100)}%</span>`:""}${typeof i=="number"&&i<.8?'<small class="warning-text">Officer verification required</small>':""}</dd></div>`}function He(){var a,p,l,d,c,m,u;const e=r.lastProcessResult;if(!e)return'<div class="page-content"><div class="empty-state"><h1>No processing result selected</h1><p>Choose a document from My Land Records to view its results.</p><button id="go-records" class="btn btn-primary">My Land Records</button></div></div>';const t=(a=e.review)!=null&&a.required?e.review.status||"PENDING_REVIEW":"NO_REVIEW_REQUIRED",i=e.validation||{},n=i.issues||[];return`<div class="page-content">
    <div class="page-heading heading-actions"><div><h1>Processing result</h1><p>${s(((p=e.document)==null?void 0:p.filename)||"Land document")} · ${s(((l=e.document)==null?void 0:l.document_id)||"")}</p></div><button id="view-processed-record" class="btn btn-outline">View saved record</button></div>
    <div class="notice notice-info">Extraction and validation results support officer review. They are not a legal land-record determination.</div>
    <section class="card"><h2>Processing workflow</h2><div class="pipeline-steps">${Ge.map((f,y)=>`<div class="step-item completed"><span class="step-icon">✓</span><span>${f}</span>${y===5?`<span class="badge ${I(t)}">${s(t)}</span>`:""}</div>`).join("")}</div></section>
    <div class="two-column">
      <section class="card"><h2>Extracted land-record information</h2><dl class="result-grid">${Object.entries(e.extraction||{}).map(([f,y])=>Xe(f,y)).join("")||"<p>No structured fields were returned.</p>"}</dl></section>
      <section class="card"><h2>Validation summary</h2><p><span class="badge ${I(i.status)}">${s(i.status||"UNAVAILABLE")}</span></p><p class="metric-inline">Confidence score: <strong>${i.score??"—"}</strong></p>${n.length?`<ul class="issue-list">${n.map(f=>`<li><span class="badge ${I(f.severity)}">${s(f.severity||"WARNING")}</span> ${s(f.message||f.rule||"Validation issue")}</li>`).join("")}</ul>`:'<p class="muted">No validation issues were reported.</p>'}<h3>GIS validation</h3><p><span class="badge ${I((d=e.gis)==null?void 0:d.status)}">${s(((c=e.gis)==null?void 0:c.status)||"UNAVAILABLE")}</span></p><p class="muted">${((m=e.gis)==null?void 0:m.status)==="UNAVAILABLE"?"No geometry was supplied with this document.":`Area comparison: ${s(((u=e.gis)==null?void 0:u.area_match)||"Unavailable")}`}</p></section>
    </div>
  </div>`}function Je(){var e,t;(e=document.getElementById("go-records"))==null||e.addEventListener("click",()=>r.setActiveTab("my-records")),(t=document.getElementById("view-processed-record"))==null||t.addEventListener("click",()=>{var i,n;return r.setActiveTab("record-details",(n=(i=r.lastProcessResult)==null?void 0:i.document)==null?void 0:n.document_id)})}let K="",z="ALL",q=null,W=!1;function Ye(e){const t=String(e).trim();return t.includes("X")?t:t.length===12?`XXXX-XXXX-${t.slice(8)}`:t.replace(/\d(?=\d{4})/g,"X")}function we(e){const t=e.land_record,i=e.review_case;return(i==null?void 0:i.status)==="GOVERNMENT_APPROVED"||(t==null?void 0:t.status)==="GOVERNMENT_APPROVED"||(t==null?void 0:t.status)==="VERIFIED"||(i==null?void 0:i.status)==="APPROVED"?"GOVERNMENT APPROVED":(t==null?void 0:t.status)==="REJECTED"||(i==null?void 0:i.status)==="REJECTED"?"REJECTED":(i==null?void 0:i.status)==="CORRECTION_REQUIRED"?"CORRECTION REQUIRED":(i==null?void 0:i.status)||"PENDING OFFICER REVIEW"}function Qe(){if(!W||!q)return"";const e=q;return`
    <div class="modal-overlay" id="approved-record-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="max-width: 650px; width: 100%; max-height: 90vh; overflow-y: auto; background: var(--bg-surface); border: 2px solid var(--success); box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 2rem;">🏛️</div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--success); font-weight: 800; letter-spacing: 0.08em;">Government of India · Digital Land Record</div>
              <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main); margin: 0.15rem 0;">GOVERNMENT VERIFIED DIGITAL LAND RECORD</h2>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Record ID: <strong style="color: var(--text-main);">${s(e.record_id||e.id)}</strong></div>
            </div>
          </div>
          <button id="close-approved-modal-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Verification Status</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--success); display: flex; align-items: center; gap: 0.35rem;">
              <span>✓</span> GOVERNMENT APPROVED
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: var(--text-muted);">Approval Date</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main);">${V(e.approval_date||e.created_at)}</div>
          </div>
        </div>

        <div class="detail-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; margin-bottom: 1.25rem;">
          <div class="detail-row"><span>Application ID</span><strong>${s(e.case_id||"—")}</strong></div>
          <div class="detail-row"><span>Owner Name</span><strong>${s(e.owner_name||"—")}</strong></div>
          <div class="detail-row"><span>Survey Number</span><strong>${s(e.survey_number||"—")}</strong></div>
          <div class="detail-row"><span>Khasra Number</span><strong>${s(e.khasra_number||"—")}</strong></div>
          <div class="detail-row"><span>Khata Number</span><strong>${s(e.khata_number||"—")}</strong></div>
          <div class="detail-row"><span>Area</span><strong>${s(`${e.area_value||""} ${e.area_unit||""}`.trim()||"—")}</strong></div>
          <div class="detail-row"><span>Village</span><strong>${s(e.village||"—")}</strong></div>
          <div class="detail-row"><span>Taluk</span><strong>${s(e.taluk||"—")}</strong></div>
          <div class="detail-row"><span>District</span><strong>${s(e.district||"—")}</strong></div>
          <div class="detail-row"><span>State</span><strong>${s(e.state||"Tamil Nadu")}</strong></div>
          <div class="detail-row"><span>Classification</span><strong>${s(e.classification||"Agricultural")}</strong></div>
          <div class="detail-row"><span>Verified By</span><strong>${s(e.approved_by_officer_id||"Authorized Officer")}</strong></div>
        </div>

        <div class="notice notice-info" style="font-size: 0.82rem; margin-bottom: 1.25rem;">
          🔒 This record is cryptographically signed and stored in the central Land Records Registry database following physical document verification and biometrics.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button id="download-approved-btn" class="btn btn-primary">
            📥 Download Certificate
          </button>
          <button id="dismiss-approved-modal-btn" class="btn btn-outline">Close</button>
        </div>
      </div>
    </div>
  `}function $e(){const e=r.approvedRecords||[],t=r.myDocuments.filter(i=>{var c;const n=K.toLowerCase(),a=i.land_record||{},p=a.citizen_submitted_data||{},l=!n||[i.original_filename,i.document_id,(c=i.review_case)==null?void 0:c.case_id,a.owner_name,p.owner_name,a.survey_number,p.survey_number,a.village,p.village].some(m=>String(m||"").toLowerCase().includes(n)),d=we(i);return l&&(z==="ALL"||d===z)});return`
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>My Land Records</h1>
          <p>Digitized land records, official government verification certificates, and registered deeds.</p>
        </div>
        <button id="records-upload-btn" class="btn btn-primary">+ Submit Land Record</button>
      </div>

      <!-- Government Approved Records Section -->
      ${e.length?`
        <section class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--success); background: var(--bg-surface);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--success); font-weight: 800; letter-spacing: 0.05em;">Official Government Verified Records</div>
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-top: 0.2rem;">Approved Digital Land Records (${e.length})</h2>
            </div>
            <span class="badge badge-success" style="font-weight: 700;">✓ CERTIFIED BY GOVERNMENT</span>
          </div>

          <div style="display: grid; gap: 1rem;">
            ${e.map(i=>`
              <div class="card" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong style="color: var(--text-main); font-size: 1.05rem;">Survey No: ${s(i.survey_number)}</strong>
                    <span class="badge badge-success" style="font-size: 0.75rem;">GOVERNMENT APPROVED</span>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Record ID: <code>${s(i.record_id||i.id)}</code> · App: <strong>${s(i.case_id||"—")}</strong>
                  </div>
                  <div style="font-size: 0.82rem; color: var(--text-subtle); margin-top: 0.2rem;">
                    Area: <strong>${s(`${i.area_value||""} ${i.area_unit||""}`.trim()||"—")}</strong> · ${s(i.village||"")}, ${s(i.district||"")} · Approved ${V(i.approval_date||i.created_at)}
                  </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-primary btn-sm view-approved-record-btn" data-id="${s(i.id)}">
                    👁️ View Approved Record
                  </button>
                  <button class="btn btn-outline btn-sm download-approved-record-btn" data-id="${s(i.id)}">
                    📥 Download
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </section>
      `:""}

      <!-- All Submitted Applications Table -->
      <section class="card">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">All Applications & Land Documents</h2>
        <div class="toolbar" style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem;">
          <input id="record-search" class="form-control" style="flex: 1;" value="${s(K)}" placeholder="Search by survey number, owner name, village, or ID..." />
          <select id="record-status-filter" class="form-control" style="width: 250px;">
            <option value="ALL">All Application Statuses</option>
            <option value="GOVERNMENT APPROVED" ${z==="GOVERNMENT APPROVED"?"selected":""}>Government Approved</option>
            <option value="PENDING OFFICER REVIEW" ${z==="PENDING OFFICER REVIEW"?"selected":""}>Pending Officer Review</option>
            <option value="CORRECTION REQUIRED" ${z==="CORRECTION REQUIRED"?"selected":""}>Correction Required</option>
            <option value="REJECTED" ${z==="REJECTED"?"selected":""}>Rejected</option>
          </select>
        </div>

        ${t.length?`
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Application / Doc ID</th>
                  <th>Owner Name</th>
                  <th>Aadhaar</th>
                  <th>Survey No</th>
                  <th>Area</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${t.map(i=>{const n=i.land_record||{},a=i.review_case||{},p=n.citizen_submitted_data||{},l=p.owner_name||n.owner_name||"—",d=p.aadhaar_number||"—",c=p.survey_number||n.survey_number||"—",m=p.area||(n.area_value?`${n.area_value} ${n.area_unit||""}`.trim():"—"),u=p.village||n.village||"—",f=p.taluk||n.taluk||"—",y=p.district||n.district||"—",E=!!(n.is_duplicate||a.is_duplicate),A=we(i),G=a.case_id||`APP-${i.document_id.slice(-6)}`;return`
                    <tr>
                      <td>
                        <strong>${s(G)}</strong>
                        <div style="font-size: 0.8rem; color: #64748b;">${s(i.original_filename)}</div>
                      </td>
                      <td><strong>${s(l)}</strong></td>
                      <td><code>${s(Ye(d))}</code></td>
                      <td>
                        <strong>${s(c)}</strong>
                        ${E?`<br><span class="badge badge-warning" title="${s(n.duplicate_reason||"Survey number exists in this location")}">⚠️ Possible Duplicate</span>`:""}
                      </td>
                      <td>${s(m)}</td>
                      <td>
                        <div>${s(u)}</div>
                        <small style="color: #64748b;">${s(f)}, ${s(y)}</small>
                      </td>
                      <td>
                        <span class="badge ${I(A)}">${s(A)}</span>
                      </td>
                      <td>${V(i.uploaded_at)}</td>
                      <td>
                        <button class="btn btn-outline btn-sm open-record" data-id="${s(i.document_id)}">View Details</button>
                      </td>
                    </tr>
                  `}).join("")}
              </tbody>
            </table>
          </div>
        `:`
          <div class="empty-state">
            <h2>No land applications found</h2>
            <p>${r.myDocuments.length?"Try clearing your search query or changing filters.":"You have not submitted any land applications yet. Upload your first land document to get started."}</p>
          </div>
        `}
      </section>

      <!-- Modal View for Approved Record -->
      ${Qe()}
    </div>
  `}function Ae(){var e,t,i,n,a,p;(e=document.getElementById("records-upload-btn"))==null||e.addEventListener("click",()=>r.setActiveTab("upload")),(t=document.getElementById("record-search"))==null||t.addEventListener("input",l=>{K=l.target.value,r.notify()}),(i=document.getElementById("record-status-filter"))==null||i.addEventListener("change",l=>{z=l.target.value,r.notify()}),document.querySelectorAll(".open-record").forEach(l=>{l.addEventListener("click",()=>r.setActiveTab("record-details",l.dataset.id))}),document.querySelectorAll(".view-approved-record-btn").forEach(l=>{l.addEventListener("click",()=>{const d=l.dataset.id;q=(r.approvedRecords||[]).find(c=>c.id===d),W=!0,r.notify()})}),document.querySelectorAll(".download-approved-record-btn").forEach(l=>{l.addEventListener("click",()=>{const d=l.dataset.id,c=(r.approvedRecords||[]).find(m=>m.id===d);c&&Re(c)})}),(n=document.getElementById("close-approved-modal-btn"))==null||n.addEventListener("click",()=>{W=!1,r.notify()}),(a=document.getElementById("dismiss-approved-modal-btn"))==null||a.addEventListener("click",()=>{W=!1,r.notify()}),(p=document.getElementById("download-approved-btn"))==null||p.addEventListener("click",()=>{q&&Re(q)})}async function Re(e){try{r.addToast("info","Generating official Government Verified PDF Certificate...");const t=await b.downloadApprovedLandRecordPdf(e.id||e.record_id),i=URL.createObjectURL(t),n=document.createElement("a");n.href=i,n.download=`DLR_Verified_Land_Record_${(e.survey_number||e.record_id||e.id).replace(/[\/\\]/g,"_")}.pdf`,n.click(),URL.revokeObjectURL(i),r.addToast("success","Digital Land Record PDF downloaded successfully!")}catch(t){r.addToast("error",`Download failed: ${t.message}`)}}function Ze(e){return String(e).replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Ke(e){return Object.entries(e||{}).map(([t,i])=>`
    <div class="detail-row">
      <span>${s(Ze(t))}</span>
      <strong>${s(Oe(i)??"Not available")}</strong>
      ${typeof i=="object"&&typeof(i==null?void 0:i.confidence)=="number"?`<small>${Math.round(i.confidence*100)}% confidence</small>`:""}
    </div>
  `).join("")}function et(e){if(!e)return"—";const t=String(e).trim();return t.includes("X")?t:t.length===12?`XXXX-XXXX-${t.slice(8)}`:t.replace(/\d(?=\d{4})/g,"X")}function tt(){var u,f,y,E;if(r.recordLoading)return'<div class="page-content"><div class="loading-state"><span class="spinner"></span> Loading record details…</div></div>';if(r.recordError)return`<div class="page-content"><div class="notice notice-error">${s(r.recordError)}</div><button id="back-to-records" class="btn btn-outline">Back to records</button></div>`;const e=r.selectedRecord;if(!e)return'<div class="page-content"><div class="empty-state"><h1>Record unavailable</h1><p>Select a document from My Land Records.</p></div></div>';const t=e.processing_result,i=e.land_record,n=e.review_case,a=(i==null?void 0:i.status)||(i==null?void 0:i.verification_status),p=a==="VERIFIED"?"VERIFIED DIGITAL LAND RECORD":a==="REJECTED"||(n==null?void 0:n.status)==="REJECTED"?"REJECTED":(n==null?void 0:n.status)==="CORRECTION_REQUIRED"?"CORRECTION REQUIRED":"PENDING OFFICER VERIFICATION",l=(i==null?void 0:i.citizen_submitted_data)||((u=i==null?void 0:i.fields)==null?void 0:u.citizen_submitted_data)||{},d=!!(i!=null&&i.is_duplicate||n!=null&&n.is_duplicate),c=(n==null?void 0:n.ai_status)||(i==null?void 0:i.ai_status)||"NOT_STARTED",m=(i==null?void 0:i.ai_extracted_data)||(t==null?void 0:t.ai_extracted_data)||(t==null?void 0:t.extraction)||{};return`
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <button id="back-to-records" class="text-button" style="cursor: pointer; background: none; border: none; color: #2563eb; font-weight: 600; padding: 0; margin-bottom: 0.5rem;">← Back to My Land Records</button>
          <h1>${s(e.original_filename)}</h1>
          <p>${s(e.document_id)} · Application: ${s((n==null?void 0:n.case_id)||"—")} · Submitted ${V(e.uploaded_at)}</p>
        </div>
        <span class="badge ${I(a||(n==null?void 0:n.status)||"PENDING_OFFICER_VERIFICATION")}" style="font-size: 0.95rem; padding: 0.4rem 0.8rem;">
          ${s(p)}
        </span>
      </div>

      ${d?`
        <div class="notice notice-warning" style="margin-bottom: 1rem;">
          <strong>⚠️ POSSIBLE DUPLICATE LAND RECORD:</strong> ${s((i==null?void 0:i.duplicate_reason)||(n==null?void 0:n.duplicate_reason)||"Survey Number already registered for this location in MySQL.")}
        </div>
      `:""}

      <div class="two-column">
        <!-- CITIZEN SUBMITTED DATA -->
        <section class="card">
          <h2>Citizen Submitted Data</h2>
          <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">Manual land details entered during document submission.</p>
          <div class="detail-list">
            <div class="detail-row"><span>Owner Name</span><strong>${s(l.owner_name||(i==null?void 0:i.owner_name)||"—")}</strong></div>
            <div class="detail-row"><span>Aadhaar Number</span><code>${s(et(l.aadhaar_number))}</code></div>
            <div class="detail-row"><span>Survey Number</span><strong>${s(l.survey_number||(i==null?void 0:i.survey_number)||"—")}</strong></div>
            <div class="detail-row"><span>Area</span><strong>${s(l.area||(i!=null&&i.area_value?`${i.area_value} ${i.area_unit||""}`.trim():"—"))}</strong></div>
            <div class="detail-row"><span>Village</span><strong>${s(l.village||(i==null?void 0:i.village)||"—")}</strong></div>
            <div class="detail-row"><span>Taluk</span><strong>${s(l.taluk||(i==null?void 0:i.taluk)||"—")}</strong></div>
            <div class="detail-row"><span>District</span><strong>${s(l.district||(i==null?void 0:i.district)||"—")}</strong></div>
          </div>
        </section>

        <!-- DOCUMENT METADATA -->
        <section class="card">
          <div class="heading-actions" style="margin-bottom: 1rem;">
            <h2>Uploaded Document</h2>
            <button id="view-doc-file-btn" class="btn btn-outline btn-sm">👁️ View Document</button>
          </div>
          <div class="detail-list">
            <div class="detail-row"><span>Original Filename</span><strong>${s(e.original_filename)}</strong></div>
            <div class="detail-row"><span>File Type</span><strong>${s(e.file_type||"PDF").toUpperCase()}</strong></div>
            <div class="detail-row"><span>File Size</span><strong>${e.file_size?`${(e.file_size/1024/1024).toFixed(2)} MB`:"—"}</strong></div>
            <div class="detail-row"><span>Storage Reference</span><code>${s(e.storage_path)}</code></div>
            <div class="detail-row"><span>AI Processing Status</span><span class="badge ${c==="COMPLETED"?"badge-success":c==="FAILED"?"badge-error":"badge-neutral"}">${s(c)}</span></div>
            <div class="detail-row"><span>Officer Review Status</span><strong>${s((n==null?void 0:n.status)||"PENDING_REVIEW")}</strong></div>
            ${n!=null&&n.officer_notes?`<div class="detail-row"><span>Officer Remarks</span><strong>${s(n.officer_notes)}</strong></div>`:""}
            ${n!=null&&n.rejection_reason?`<div class="detail-row" style="color: #b91c1c;"><span>Rejection Reason</span><strong>${s(n.rejection_reason)}</strong></div>`:""}
          </div>
        </section>
      </div>

      ${c==="COMPLETED"?`
        <div class="two-column" style="margin-top: 1.5rem;">
          <section class="card">
            <h2>AI Extracted Data</h2>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">OCR & document understanding results for official review.</p>
            <div class="detail-list">${Ke(m)}</div>
          </section>

          <section class="card">
            <h2>AI Validation & Findings</h2>
            <p><span class="badge ${I(((f=t==null?void 0:t.validation)==null?void 0:f.status)||(i==null?void 0:i.validation_status))}">${s(((y=t==null?void 0:t.validation)==null?void 0:y.status)||(i==null?void 0:i.validation_status)||"PROCESSED")}</span> Score: <strong>${((E=t==null?void 0:t.validation)==null?void 0:E.score)??(n==null?void 0:n.validation_score)??"—"} / 100</strong></p>
            ${((n==null?void 0:n.anomalies)||[]).length?`
              <ul class="issue-list" style="margin-top: 1rem;">
                ${n.anomalies.map(A=>`
                  <li><span class="badge ${I(A.severity)}">${s(A.severity)}</span> ${s(A.message||A.title)}</li>
                `).join("")}
              </ul>
            `:'<p class="muted" style="margin-top: 1rem;">No validation issues reported.</p>'}
          </section>
        </div>
      `:`
        <section class="card" style="margin-top: 1.5rem; text-align: center; padding: 2rem; background: #f8fafc;">
          <h3>AI Processing: ${s(c)}</h3>
          <p style="color: #64748b; max-width: 500px; margin: 0.5rem auto 0;">
            ${c==="NOT_STARTED"?"AI document extraction is initiated by the reviewing officer during official government verification. Your document is safely persisted.":c==="PROCESSING"?"Document analysis is currently underway by the reviewing officer.":"Document processing can be retried by the reviewing officer."}
          </p>
        </section>
      `}
    </div>
  `}function it(){var e,t;(e=document.getElementById("back-to-records"))==null||e.addEventListener("click",()=>{r.setActiveTab("records")}),(t=document.getElementById("view-doc-file-btn"))==null||t.addEventListener("click",async()=>{var n;const i=(n=r.selectedRecord)==null?void 0:n.document_id;if(i)try{const a=await b.getDocumentFile(i),p=URL.createObjectURL(a);window.open(p,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(p),6e4)}catch(a){r.addToast("error",a.message)}})}const ee=[{key:"PENDING_OFFICER_REVIEW",label:"Submitted"},{key:"UNDER_OFFICER_REVIEW",label:"Officer Review"},{key:"AI_PROCESSING",label:"AI Processing"},{key:"AI_GENERATED",label:"AI Generated"},{key:"OFFICER_CORRECTION",label:"Correction"},{key:"APPOINTMENT_SCHEDULED",label:"Appointment"},{key:"CITIZEN_VERIFICATION",label:"Verification"},{key:"GOVERNMENT_APPROVED",label:"Govt Approved"}];function nt(e){const t=String(e||"").toUpperCase();if(t==="REJECTED")return-1;const i=ee.findIndex(n=>n.key===t);return i!==-1?i:t==="APPROVED"?ee.length-1:t==="IN_REVIEW"?1:0}function at(){if(r.applicationsLoading)return`
      <div class="page-content">
        <div class="loading-state"><span class="spinner"></span> Loading applications…</div>
      </div>
    `;if(r.applicationsError)return`
      <div class="page-content">
        <div class="notice notice-error">${s(r.applicationsError)}</div>
      </div>
    `;const e=r.applications||[];return`
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>Track Application Status</h1>
          <p>Real-time progress and government verification lifecycle of your land digitization applications.</p>
        </div>
        <button id="refresh-apps-btn" class="btn btn-outline btn-sm">Refresh Status</button>
      </div>

      <section class="card">
        ${e.length?`
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${e.map(t=>{const i=nt(t.status),n=t.status==="REJECTED",a=t.status==="GOVERNMENT_APPROVED"||t.status==="APPROVED";return`
                <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); padding: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Land Record Application</div>
                      <h2 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin: 0.2rem 0;">
                        ${s(t.application_id||t.case_id||"DLR-APP")}
                      </h2>
                      <div style="font-size: 0.82rem; color: var(--text-muted);">
                        Survey No: <strong>${s(t.survey_number||"—")}</strong> · ${s(t.village||"")} · Submitted ${V(t.submitted_at||t.created_at)}
                      </div>
                    </div>
                    <span class="badge ${I(t.status)}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                      ${s(t.status)}
                    </span>
                  </div>

                  <!-- Workflow Timeline Stepper -->
                  <div style="margin: 1.25rem 0; padding: 1rem 0.5rem; background: rgba(0,0,0,0.25); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; position: relative; gap: 0.25rem; overflow-x: auto;">
                      ${ee.map((p,l)=>{const d=!n&&i>=l,c=!n&&i===l;return`
                          <div style="flex: 1; min-width: 80px; text-align: center; position: relative;">
                            <div style="width: 26px; height: 26px; border-radius: 50%; margin: 0 auto 0.4rem; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: ${d?"var(--success)":c?"var(--primary)":"rgba(255,255,255,0.1)"}; color: #fff; border: 2px solid ${c?"#fff":"transparent"};">
                              ${d?"✓":l+1}
                            </div>
                            <div style="font-size: 0.7rem; font-weight: ${c?"700":"500"}; color: ${c?"var(--text-main)":d?"var(--success)":"var(--text-subtle)"}; line-height: 1.2;">
                              ${s(p.label)}
                            </div>
                          </div>
                        `}).join("")}
                    </div>
                  </div>

                  ${a?`
                    <div class="notice notice-info" style="margin-top: 0.75rem; margin-bottom: 0;">
                      🎉 <strong>Approved:</strong> This land record has been officially verified and approved by the Government Officer. You can view the verified digital certificate in <strong>My Land Records</strong>.
                    </div>
                  `:n?`
                    <div class="notice notice-error" style="margin-top: 0.75rem; margin-bottom: 0;">
                      ✕ <strong>Application Rejected:</strong> ${s(t.rejection_reason||"Document verification could not be completed.")}
                    </div>
                  `:`
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                      Current Stage: <strong>${s(t.status)}</strong>. The assigned Government Officer is processing your record.
                    </div>
                  `}

                  <div style="display: flex; justify-content: flex-end; margin-top: 1rem; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm application-record" data-id="${s(t.document_id||"")}">
                      View Document Details →
                    </button>
                  </div>
                </div>
              `}).join("")}
          </div>
        `:`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
            <h2>No Applications Found</h2>
            <p>You have not submitted any land applications requiring verification yet.</p>
            <button id="goto-upload-btn" class="btn btn-primary" style="margin-top: 1rem;">Submit Land Record</button>
          </div>
        `}
      </section>
    </div>
  `}function st(){var e,t;(e=document.getElementById("refresh-apps-btn"))==null||e.addEventListener("click",()=>{r.loadApplications()}),(t=document.getElementById("goto-upload-btn"))==null||t.addEventListener("click",()=>{r.setActiveTab("upload")}),document.querySelectorAll(".application-record").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.id;n&&r.setActiveTab("record-details",n)})})}function Ie(){if(r.appointmentsLoading)return`
      <div class="page-content">
        <div class="loading-state"><span class="spinner"></span> Loading appointments…</div>
      </div>
    `;if(r.appointmentsError)return`
      <div class="page-content">
        <div class="notice notice-error">${s(r.appointmentsError)}</div>
      </div>
    `;const e=r.appointments||[];return`
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>Land Record Verification Appointments</h1>
          <p>Scheduled government office appointments for physical document verification and biometrics.</p>
        </div>
        <button id="refresh-appointments-btn" class="btn btn-outline btn-sm">Refresh Appointments</button>
      </div>

      <section class="card">
        ${e.length?`
          <div style="display: grid; gap: 1.25rem;">
            ${e.map(t=>{const i=t.status==="SCHEDULED"||t.status==="CONFIRMED";return`
                <div class="card" style="background: var(--bg-surface); border: 1px solid ${i?"var(--primary)":"var(--border-color)"}; border-left: 4px solid ${i?"var(--primary)":"var(--border-color)"}; padding: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">Land Record Verification Appointment</span>
                      <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0.2rem 0; color: var(--text-main);">Application: ${s(t.case_id||"—")}</h2>
                    </div>
                    <span class="badge ${I(t.status)}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                      ${s(t.status)}
                    </span>
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Appointment Date</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        📅 ${s(t.appointment_date||"—")}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Time Slot</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        ⏰ ${s(t.appointment_time||"—")}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Government Office</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        🏛️ ${s(t.office_location||"Revenue Divisional Office")}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Verification Officer</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        👮 ${s(t.officer_id||"Assigned Officer")}
                      </div>
                    </div>
                  </div>

                  <div style="margin-top: 0.75rem; font-size: 0.88rem; color: var(--text-muted);">
                    <strong>Purpose:</strong> ${s(t.purpose||"Original document scrutiny and physical land owner verification.")}
                  </div>

                  ${t.notes?`
                    <div style="margin-top: 0.5rem; font-size: 0.82rem; color: var(--text-subtle);">
                      <strong>Instructions:</strong> ${s(t.notes)}
                    </div>
                  `:""}

                  <div class="notice notice-info" style="margin-top: 1rem; margin-bottom: 0; font-size: 0.85rem;">
                    💡 <strong>What to bring:</strong> Please bring your original land deeds/patta documents and government-issued photo identity proof (Aadhaar/Voter ID) to the designated office.
                  </div>
                </div>
              `}).join("")}
          </div>
        `:`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
            <h2>No Appointments Scheduled</h2>
            <p>When the reviewing officer initiates physical verification for your land record, your appointment details will appear here.</p>
          </div>
        `}
      </section>
    </div>
  `}function Se(){var e;(e=document.getElementById("refresh-appointments-btn"))==null||e.addEventListener("click",()=>{r.loadAppointments()})}function rt(){var i;const e=r.user||{},t=String(e.external_reference||"").replace(/^AADHAAR-/,"")||"Not available";return`<div class="page-content narrow-page"><div class="page-heading"><h1>Citizen profile</h1><p>Account information provided by your authenticated session.</p></div><section class="card"><div class="detail-list"><div class="detail-row"><span>Name</span><strong>${s(e.name||"Citizen")}</strong></div><div class="detail-row"><span>Identity reference</span><strong>${s(t)}</strong></div><div class="detail-row"><span>Role</span><strong>${s(e.primary_role||((i=e.roles)==null?void 0:i[0])||"CITIZEN")}</strong></div><div class="detail-row"><span>Account status</span><strong>${s(e.status||"ACTIVE")}</strong></div></div></section></div>`}function ot(){}const te={dashboard:[Ce,Ve],upload:[Fe,qe],"processing-result":[He,Je],"my-records":[$e,Ae],records:[$e,Ae],"record-details":[tt,it],applications:[at,st],"my-appointments":[Ie,Se],appointments:[Ie,Se],profile:[rt,ot]},Te={"citizen-login":[ye,be],"citizen-register":[ye,be]},dt={"/":"citizen-login","/login":"citizen-login","/citizen/login":"citizen-login","/citizen/register":"citizen-register","/register":"citizen-register","/dashboard":"dashboard","/citizen/dashboard":"dashboard","/upload":"upload","/citizen/upload":"upload","/my-records":"my-records","/records":"my-records","/citizen/records":"my-records","/applications":"applications","/citizen/applications":"applications","/appointments":"my-appointments","/citizen/appointments":"my-appointments","/profile":"profile","/citizen/profile":"profile"},De={"citizen-login":"/login","citizen-register":"/register",dashboard:"/dashboard",upload:"/upload","processing-result":"/dashboard","my-records":"/records",records:"/records","record-details":"/records",applications:"/applications","my-appointments":"/appointments",appointments:"/appointments",profile:"/profile"};function ie(e=window.location.pathname){const t=e.toLowerCase().replace(/\/$/,"")||"/",i=dt[t];if(!r.isAuthenticated){i==="citizen-register"?r.activeTab="citizen-register":r.activeTab="citizen-login";return}i&&te[i]?r.activeTab=i:r.activeTab="dashboard"}function ne(){const e=document.getElementById("app");if(!r.isAuthenticated){const p=r.activeTab||"citizen-login",[l,d]=Te[p]||Te["citizen-login"];e.innerHTML=`${ue()}${l()}${ge()}`,fe(),d();const c=De[r.activeTab];c&&window.location.pathname!==c&&window.history.replaceState(null,"",c);return}const t=r.activeTab,[i,n]=te[t]||te.dashboard;e.innerHTML=`
    <div class="app-container">
      ${xe()}
      <div class="main-content-wrapper">
        ${ue()}
        ${i()}
      </div>
    </div>
    ${ge()}
  `,ke(),fe(),n();const a=De[r.activeTab];a&&window.location.pathname!==a&&window.history.replaceState(null,"",a)}window.addEventListener("popstate",()=>{ie(window.location.pathname),ne()});r.subscribe(ne);(async()=>(ie(window.location.pathname),await r.init(),ie(window.location.pathname),ne()))();
