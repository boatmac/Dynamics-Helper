import{r as d,j as a,c as L}from"./index-CEymAP8w.js";function M(e){if(!e)return null;const t=Object.keys(e),o=t.find(n=>n.startsWith("__reactFiber$")),s=t.find(n=>n.startsWith("__reactProps$"));if(s)return e[s];if(o&&e[o]){const n=e[o];if(n.memoizedProps)return n.memoizedProps}return null}class F{static scanForErrors(){const t=document.querySelector('[data-automation-id="error-message"]');if(t){const n=M(t);return n&&n.children?{errorText:this.extractTextFromChildren(n.children),source:"fluent-automation-id"}:{errorText:t.textContent||"",source:"dom-text"}}const o=document.querySelectorAll('[role="alert"]');for(const n of Array.from(o))if(n.textContent&&n.textContent.toLowerCase().includes("error"))return{errorText:n.textContent,source:"aria-role-alert"};const s=window.getSelection();return s&&s.toString().length>5?{errorText:s.toString(),source:"user-selection"}:null}static extractTextFromChildren(t){return t?typeof t=="string"?t:typeof t=="number"?String(t):Array.isArray(t)?t.map(o=>this.extractTextFromChildren(o)).join(" "):typeof t=="object"&&t.props&&t.props.children?this.extractTextFromChildren(t.props.children):"":""}}function W(){const[e,t]=d.useState([]),[o,s]=d.useState([]),[n,p]=d.useState([]);d.useEffect(()=>{if(B().then(i=>{t(i),p(i)}),chrome?.storage?.onChanged){const i=(l,x)=>{if(x==="local"&&l.dh_items){const f=l.dh_items.newValue;Array.isArray(f)&&(t(f),s([]),p(f))}};return chrome.storage.onChanged.addListener(i),()=>chrome.storage.onChanged.removeListener(i)}},[]);const u=i=>{i.children&&(s(l=>[...l,n]),p(i.children))},h=()=>{if(o.length>0){const i=o[o.length-1];p(i),s(l=>l.slice(0,-1))}};return{currentItems:n,canGoBack:o.length>0,navigateTo:u,navigateBack:h}}async function B(){try{if(chrome?.storage?.local){const e=await new Promise(t=>{chrome.storage.local.get("dh_items",o=>t(o))});if(Array.isArray(e.dh_items)&&e.dh_items.length>0)return e.dh_items}}catch{}try{const e=chrome.runtime.getURL("items.json"),t=await fetch(e);if(t.ok){const o=await t.json();return Array.isArray(o)?o:o.items||[]}}catch(e){console.warn("[DH] Failed to load items.json",e)}return[{type:"folder",label:"Favorites",children:[{type:"link",label:"Dynamics Admin Center",url:"https://admin.powerplatform.microsoft.com/"}]},{type:"markdown",label:"About",content:`# Dynamics Helper
Loaded defaults.`}]}async function P(e){return!e||!e.includes("%s")?e:e.replace("%s","")}const $=()=>{const[e,t]=d.useState(!1),[o,s]=d.useState(""),[n,p]=d.useState(null),[u,h]=d.useState({primaryColor:"#2563eb",buttonText:"DH",offsetBottom:24,offsetRight:24}),{currentItems:i,canGoBack:l,navigateTo:x,navigateBack:f}=W();d.useEffect(()=>{if(chrome?.storage?.local){chrome.storage.local.get("dh_prefs",c=>{c.dh_prefs&&h(g=>({...g,...c.dh_prefs||{}}))});const r=(c,g)=>{if(g==="local"&&c.dh_prefs){const H=c.dh_prefs.newValue||{};h(O=>({...O,...H}))}};return chrome.storage.onChanged.addListener(r),()=>chrome.storage.onChanged.removeListener(r)}},[]),d.useEffect(()=>{if(e){const r=F.scanForErrors();p(r)}},[e]);const R=async()=>{try{const r=await chrome.runtime.sendMessage({type:"NATIVE_MSG",payload:{action:"ping",requestId:crypto.randomUUID()}});s(JSON.stringify(r,null,2))}catch(r){s(`Error: ${r.message}`)}},N=async()=>{if(n?.errorText){s("Analyzing...");try{const r=await chrome.runtime.sendMessage({type:"NATIVE_MSG",payload:{action:"analyze_error",payload:{text:n.errorText,context:n.source||"Unknown Context"},requestId:crypto.randomUUID()}});s(JSON.stringify(r,null,2))}catch(r){s(`Error: ${r.message}`)}}},z=()=>{chrome.runtime.sendMessage({type:"OPEN_OPTIONS"}),t(!1)},_=async r=>{if(r.type==="folder")x(r);else if(r.type==="link"&&r.url){const c=await P(r.url);c&&window.open(c,r.target||"_blank"),t(!1)}else r.type==="markdown"&&(alert(r.content),t(!1))};return a.jsxs("div",{className:"dh-container",children:[e&&a.jsxs("div",{className:"dh-menu",children:[a.jsxs("div",{className:"dh-header",children:[a.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px"},children:[l&&a.jsx("button",{onClick:f,className:"dh-item","data-type":"back",title:"Back",style:{padding:"0",border:"none",margin:"0",width:"auto"}}),a.jsx("h3",{className:"dh-title",children:"Dynamics Helper"})]}),a.jsx("button",{onClick:z,title:"Settings",className:"dh-settings-btn",children:"⚙️"})]}),a.jsxs("div",{style:{maxHeight:"320px",overflowY:"auto"},children:[i.map((r,c)=>a.jsxs("button",{onClick:()=>_(r),className:"dh-item","data-type":r.type,children:[a.jsx("span",{className:"dh-item-icon",children:r.type==="folder"?"📁":r.type==="link"?"🔗":"📝"}),a.jsx("span",{className:"dh-item-label",children:r.label})]},c)),i.length===0&&a.jsx("div",{style:{padding:"12px",textAlign:"center",color:"#9ca3af",fontSize:"12px"},children:"No items found"})]}),a.jsxs("div",{style:{borderTop:"1px solid #f0f0f0",padding:"8px 4px 4px 4px",marginTop:"4px"},children:[n&&n.errorText&&a.jsx("div",{style:{marginBottom:"8px",padding:"8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"4px"},children:a.jsx("p",{style:{margin:"0",fontSize:"10px",color:"#991b1b",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:"2",WebkitBoxOrient:"vertical"},children:n.errorText})}),a.jsxs("div",{style:{display:"flex",gap:"8px"},children:[a.jsx("button",{onClick:R,style:{flex:1,padding:"4px 8px",background:"#fff",border:"1px solid #d1d5db",color:"#4b5563",fontSize:"11px",borderRadius:"4px",cursor:"pointer"},children:"Ping"}),a.jsx("button",{onClick:N,disabled:!n?.errorText,style:{flex:1,padding:"4px 8px",fontSize:"11px",borderRadius:"4px",border:"none",color:"#fff",background:n?.errorText?"#2563eb":"#d1d5db",cursor:n?.errorText?"pointer":"not-allowed"},children:"Analyze"})]})]})]}),a.jsx("button",{onClick:()=>t(!e),className:"dh-btn",style:{backgroundColor:u.primaryColor},children:e?a.jsx("span",{style:{fontSize:"24px",fontWeight:"bold"},children:"×"}):a.jsx("span",{style:{fontSize:"18px",fontWeight:"bold"},children:u.buttonText})})]})};function D(e){console.log("[DH] Toast:",e);const t=new CustomEvent("DH_TOAST",{detail:{text:e}});window.dispatchEvent(t)}function j(e,t="error"){console.log(`[DH] Notification (${t}):`,e);const o=new CustomEvent("DH_NOTIFICATION",{detail:{text:e,type:t}});window.dispatchEvent(o)}let k="";function G(e){const t=/subscriptions\/([^\/]+)\/resourceGroups\/([^\/]+)\/providers\/([^\/]+)\/([^\/]+)\/([^\/]+)/i,o=e.match(t);return o?{subscription:o[1],resourceGroup:o[2],provider:`${o[3]}/${o[4]}`,resourceName:o[5]}:null}async function C(){if(document.hasFocus())try{const e=await navigator.clipboard.readText();if(e&&e!==k){k=e;const t=G(e);if(t){const o=`Azure Resource Detected:

Subscription: ${t.subscription}
Resource Group: ${t.resourceGroup}
Provider: ${t.provider}
Name: ${t.resourceName}`;j(o,"info"),D("Azure Resource detected in clipboard")}}}catch{}}function V(){setInterval(C,2e3),window.addEventListener("focus",C),console.log("[DH] Clipboard listener started")}const b="sapTextAreaId",S="Azure/Mooncake Support Escalation",E=new WeakSet,T=new WeakMap,w=new WeakSet;function Y(e){if(e){if(console.log("[DH] Applying RED highlight to element:",e),e.style.cssText+="; outline: 4px solid #dc2626 !important; outline-offset: 2px !important; background-color: #fef2f2 !important; border: 3px solid #ef4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.2) !important;",!document.getElementById("dh-pulse-style")){const t=document.createElement("style");t.id="dh-pulse-style",t.textContent=`
            @keyframes dh-pulse {
                0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
                100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
            }
        `,document.head.appendChild(t)}e.style.animation="dh-pulse 2s infinite";try{e.scrollIntoView({block:"center",behavior:"smooth"})}catch{}}}function m(e){try{return w.has(e)?!0:(e.value||e.textContent||"").includes(S)?(console.log("[DH] ✓✓✓ KEYWORD DETECTED! ✓✓✓"),w.add(e),Y(e),j("⚠️ Azure/Mooncake Support Escalation Detected!"),D(`Detected "${S}"`),!0):!1}catch(t){return console.error("[DH] Error checking value:",t),!1}}function y(e){if(E.has(e)){m(e);return}if(E.add(e),console.log("[DH] Setting up NEW monitoring on element:",e.id),m(e))return;e.style.outline="2px dashed #3b82f6",["input","change","blur","paste","focus"].forEach(s=>{e.addEventListener(s,()=>m(e))});let t=0;const o=setInterval(()=>{if(!document.contains(e)||w.has(e)){clearInterval(o);return}t++;const s=e.value||"",n=T.get(e)||"";if(s!==n&&(T.set(e,s),m(e))){clearInterval(o);return}t>=100&&clearInterval(o)},3e3)}function v(){const e=document.getElementById(b);e&&e.tagName==="TEXTAREA"&&y(e),document.querySelectorAll("textarea").forEach(t=>{t.id===b&&y(t)}),document.querySelectorAll("*").forEach(t=>{if(t.shadowRoot){const o=t.shadowRoot.getElementById(b);o&&o.tagName==="TEXTAREA"&&y(o)}})}function U(){console.log("[DH] SAP Watcher Initialized"),[0,500,2e3].forEach(t=>setTimeout(v,t));const e=new MutationObserver(t=>{v()});document.body&&e.observe(document.body,{childList:!0,subtree:!0}),setInterval(v,5e3)}const q=`
/* Dynamics Helper - isolated styles with \`dh-\` prefix to avoid collisions */
.dh-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647; /* ensure above Dynamics overlays */
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Segoe UI Emoji", "Segoe UI Symbol";
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none; /* Let clicks pass through container, children re-enable */
}

/* Floating button */
.dh-btn {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #2563eb; /* blue */
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
  pointer-events: auto; /* Re-enable clicks */
  font-size: 16px;
  z-index: 2;
}

.dh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.18), 0 3px 8px rgba(0,0,0,0.14);
  background: #1e56d6;
}

.dh-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.12);
  background: #184abe;
}

.dh-btn:focus {
  outline: 3px solid rgba(37, 99, 235, 0.35);
  outline-offset: 2px;
}

/* Menu panel */
.dh-menu {
  position: absolute;
  right: 0;
  bottom: 60px; /* show above the button */
  min-width: 220px;
  max-width: 280px;
  background: #ffffff;
  color: #1f2937; /* gray-800 */
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.12);
  padding: 8px;
  display: block; /* Managed by React */
  pointer-events: auto; /* Re-enable clicks */
  margin-bottom: 8px;
  animation: dh-fade-in-up 0.2s ease-out;
}

@keyframes dh-fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Menu items */
.dh-item {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.25;
  user-select: none;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  display: flex;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  width: 100%;
  color: inherit;
}

.dh-item-icon {
    margin-right: 8px;
    font-size: 16px;
    width: 20px;
    text-align: center;
}

.dh-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dh-item:hover {
  background: #f3f6fb;
}

.dh-item:active {
  background: #e9eef8;
}

.dh-item:focus {
  outline: 2px solid rgba(37, 99, 235, 0.45);
  outline-offset: 2px;
}

/* Type affordances */
.dh-item[data-type="folder"]::after {
  content: '›';
  float: right;
  color: #6b7280; /* gray-500 */
  font-weight: 700;
  margin-left: 8px;
}

.dh-item[data-type="back"] {
  color: #374151; /* gray-700 */
  border-bottom: 1px solid #eee;
  margin-bottom: 4px;
  padding-bottom: 8px;
}

.dh-item[data-type="back"] .dh-item-icon {
    display: none;
}
.dh-item[data-type="back"]::before {
  content: '← ';
  margin-right: 8px;
  font-weight: bold;
}

/* Header actions */
.dh-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px 8px 8px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 4px;
}
.dh-title {
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.dh-settings-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;
    color: #9ca3af;
}
.dh-settings-btn:hover {
    background: #f3f4f6;
    color: #4b5563;
}
`;console.log("[DH] Content Script Loaded");const I="dh-extension-root";function A(){try{V(),U()}catch(u){console.error("[DH] Failed to init legacy features:",u)}if(document.getElementById(I))return;const e=document.createElement("div");e.id=I,e.style.position="fixed",e.style.top="0",e.style.left="0",e.style.width="100vw",e.style.height="100vh",e.style.zIndex="2147483647",e.style.pointerEvents="none",document.body.appendChild(e);const t=e.attachShadow({mode:"open"}),o=document.createElement("style");o.textContent=q,t.appendChild(o);const s=document.createElement("style");s.textContent=`
        :host { all: initial; }
    `,t.appendChild(s);const n=document.createElement("div");n.id="root",t.appendChild(n),L.createRoot(n).render(a.jsx($,{})),console.log("[DH] React App Mounted in Shadow DOM with Inline CSS")}document.body?A():document.addEventListener("DOMContentLoaded",A);
