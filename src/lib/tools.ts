export interface ToolDefinition { name: string; app: string; icon: string; description: string; parameters: Record<string,{type:string;description:string;required?:boolean}>; execute: (p:Record<string,any>)=>Promise<ToolResult>; simulate: (p:Record<string,any>)=>string; }
export interface ToolResult { success: boolean; message: string; data?: any; }

const gmailSendEmail: ToolDefinition = { name:"gmail_send_email",app:"gmail",icon:"📧",description:"Envoie un email via Gmail",parameters:{to:{type:"string",description:"Destinataire",required:true},subject:{type:"string",description:"Sujet",required:true},body:{type:"string",description:"Corps",required:true}},execute:async p=>({success:true,message:`✅ Email envoyé à ${p.to}`,data:{to:p.to,subject:p.subject}}),simulate:p=>`📧 **Email envoyé avec succès !**
- À : **${p.to}**
- Sujet : **${p.subject}**
- Corps : ${(p.body||"").slice(0,200)}` };
const gmailReadEmails: ToolDefinition = { name:"gmail_read_emails",app:"gmail",icon:"📧",description:"Lit les emails récents",parameters:{max_results:{type:"number",description:"Nombre d'emails (défaut:5)"}},execute:async()=>({success:true,message:"5 emails récupérés",data:[]}),simulate:()=>`📧 **Boîte de réception :**
- alice@example.com — Réunion demain 14h (il y a 1h)
- bob@corp.com — Rapport Q3 (il y a 3h)
- news@tech.io — Nouveautés IA (il y a 5h)` };
const slackSendMessage: ToolDefinition = { name:"slack_send_message",app:"slack",icon:"💬",description:"Envoie un message Slack",parameters:{channel:{type:"string",description:"Canal (#général)",required:true},message:{type:"string",description:"Message",required:true}},execute:async p=>({success:true,message:`✅ Message envoyé dans ${p.channel}`}),simulate:p=>`💬 **Message Slack envoyé !**
- Canal : **${p.channel}**
- Message : ${p.message}` };
const githubCreateIssue: ToolDefinition = { name:"github_create_issue",app:"github",icon:"🐙",description:"Crée une issue GitHub",parameters:{repo:{type:"string",description:"Dépôt (user/repo)",required:true},title:{type:"string",description:"Titre",required:true},body:{type:"string",description:"Description"},labels:{type:"string",description:"Labels"}},execute:async p=>({success:true,message:`✅ Issue créée dans ${p.repo}`}),simulate:p=>`🐙 **Issue GitHub créée !**
- Dépôt : **${p.repo}**
- Titre : **${p.title}**
- Labels : ${p.labels||"aucun"}
- 🔗 https://github.com/${p.repo}/issues/1` };
const notionCreatePage: ToolDefinition = { name:"notion_create_page",app:"notion",icon:"📝",description:"Crée une page Notion",parameters:{title:{type:"string",description:"Titre",required:true},content:{type:"string",description:"Contenu"}},execute:async()=>({success:true,message:"✅ Page Notion créée"}),simulate:p=>`📝 **Page Notion créée !**
- Titre : **${p.title}**
- 🔗 https://notion.so/...` };
const calendarCreateEvent: ToolDefinition = { name:"calendar_create_event",app:"google_calendar",icon:"📅",description:"Crée un événement Calendar",parameters:{summary:{type:"string",description:"Titre",required:true},date:{type:"string",description:"Date"},time:{type:"string",description:"Heure"},attendees:{type:"string",description:"Participants"}},execute:async()=>({success:true,message:"✅ Événement créé"}),simulate:p=>`📅 **Événement créé !**
- **${p.summary}**
- Date : ${p.date||"Aujourd'hui"} ${p.time||""}
- Participants : ${p.attendees||"Aucun"}` };
const twitterPostTweet: ToolDefinition = { name:"twitter_post_tweet",app:"twitter",icon:"🐦",description:"Publie un tweet",parameters:{text:{type:"string",description:"Texte (max 280)",required:true}},execute:async()=>({success:true,message:"✅ Tweet publié"}),simulate:p=>`🐦 **Tweet publié !**
- ${p.text}
- 🔗 https://x.com/user/status/...` };
const linearCreateTask: ToolDefinition = { name:"linear_create_task",app:"linear",icon:"📋",description:"Crée une tâche Linear",parameters:{title:{type:"string",description:"Titre",required:true},priority:{type:"string",description:"Priorité"},assignee:{type:"string",description:"Assigné à"}},execute:async()=>({success:true,message:"✅ Tâche créée"}),simulate:p=>`📋 **Tâche Linear créée !**
- **${p.title}**
- Priorité : ${p.priority||"medium"}
- Assignée à : ${p.assignee||"vous"}` };

export const ALL_TOOLS = [gmailSendEmail,gmailReadEmails,slackSendMessage,githubCreateIssue,notionCreatePage,calendarCreateEvent,twitterPostTweet,linearCreateTask];
export function getToolsForApps(apps: string[]) { return apps.length?ALL_TOOLS.filter(t=>apps.includes(t.app)):[]; }
export function buildFunctionDefs(tools: ToolDefinition[]) { return tools.map(t=>({type:"function" as const,function:{name:t.name,description:`[${t.app}] ${t.description}`,parameters:{type:"object",properties:Object.fromEntries(Object.entries(t.parameters).map(([k,v])=>[k,{type:v.type,description:v.description}])),required:Object.entries(t.parameters).filter(([,v])=>v.required).map(([k])=>k)}}})); }
export async function executeToolCall(name: string, params: Record<string,any>): Promise<ToolResult> { const t=ALL_TOOLS.find(x=>x.name===name); if(!t)return{success:false,message:`Outil "${name}" non trouvé`}; try{return await t.execute(params);}catch(e:any){return{success:false,message:e.message};} }
export function getToolSimulation(name: string, params: Record<string,any>): string { const t=ALL_TOOLS.find(x=>x.name===name); return t?t.simulate(params):`❌ Outil non trouvé`; }
