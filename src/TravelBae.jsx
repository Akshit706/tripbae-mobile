

// /* ═══════════════════════════════════════════════════════
//    CLUB PAGE — shared for both solo & group users
//    Solo users get an extra "Solos / Groups / Both" filter
// ═══════════════════════════════════════════════════════ */
// function ClubPage({ trips, isSoloUser }){
//   const [subTab,setSubTab]=useState('discover');
//   const [groups,setGroups]=useState(DEMO_GROUPS);
//   const [chatGroup,setChatGroup]=useState(null);
//   const [chatMsg,setChatMsg]=useState('');
//   const [sendingReq,setSendingReq]=useState(null);
//   const [joinForm,setJoinForm]=useState({from:'',age:'',gender:'M',groupSize:1,msg:''});
//   const [showFilters,setShowFilters]=useState(false);
//   const messagesEndRef=useRef(null);

//   // Standard group filters
//   const [filterGender,setFilterGender]=useState('all');
//   const [filterAgeMin,setFilterAgeMin]=useState(18);
//   const [filterAgeMax,setFilterAgeMax]=useState(45);
//   const [filterMaxDist,setFilterMaxDist]=useState(1000);
//   const [filterOpenOnly,setFilterOpenOnly]=useState(false);
//   // Solo-user extra filter: show solos, groups, or both
//   const [filterShowType,setFilterShowType]=useState('both'); // 'solos' | 'groups' | 'both'

//   const myGroup=groups.find(g=>g.isMyGroup);
//   const discoverGroups=groups.filter(g=>!g.isMyGroup);
//   const pendingRequests=myGroup?.requests?.filter(r=>r.status==='pending')||[];

//   // Build combined discover list: groups + solo travellers (when solo user)
//   const allDiscoverItems = isSoloUser
//     ? [
//         ...(filterShowType==='solos' ? [] : discoverGroups.map(g=>({...g,_kind:'group'}))),
//         ...(filterShowType==='groups' ? [] : SOLO_TRAVELLERS.map(s=>({...s,_kind:'solo'}))),
//       ]
//     : discoverGroups.map(g=>({...g,_kind:'group'}));

//   const filteredDiscover = allDiscoverItems.filter(item => {
//     if (item._kind === 'group') {
//       if ((item.distanceKm||0) > filterMaxDist) return false;
//       if (filterOpenOnly && item.openSlots === 0) return false;
//       if (filterGender !== 'all') {
//         const genders = item.members.map(m => m.gender);
//         const hasMale = genders.includes('M');
//         const hasFemale = genders.includes('F');
//         if (filterGender === 'M' && (hasFemale || !hasMale)) return false;
//         if (filterGender === 'F' && (hasMale || !hasFemale)) return false;
//         if (filterGender === 'coed' && !(hasMale && hasFemale)) return false;
//       }
//       const ages = item.members.map(m => parseInt(m.age)||25);
//       const avgAge = ages.reduce((a,b)=>a+b,0)/ages.length;
//       if (avgAge < filterAgeMin || avgAge > filterAgeMax) return false;
//     } else {
//       // solo traveller filters
//       if ((item.distanceKm||0) > filterMaxDist) return false;
//       if (filterGender !== 'all' && filterGender !== 'coed') {
//         if (item.gender !== filterGender) return false;
//       }
//       if (item.age < filterAgeMin || item.age > filterAgeMax) return false;
//     }
//     return true;
//   });

//   const activeFilterCount = [
//     filterGender !== 'all',
//     filterMaxDist < 1000,
//     filterOpenOnly,
//     filterAgeMin > 18 || filterAgeMax < 45,
//     isSoloUser && filterShowType !== 'both',
//   ].filter(Boolean).length;

//   const groupCount = filteredDiscover.filter(i=>i._kind==='group').length;
//   const soloCount  = filteredDiscover.filter(i=>i._kind==='solo').length;

//   useEffect(()=>{if(messagesEndRef.current)messagesEndRef.current.scrollIntoView({behavior:'smooth'});},[chatGroup,groups]);
//   const sendChat=()=>{if(!chatMsg.trim()) return;setGroups(gs=>gs.map(g=>g.id===chatGroup?{...g,messages:[...g.messages,{id:Date.now(),from:'You',text:chatMsg.trim(),time:'Now',isMe:true}]}:g));setChatMsg('');};
//   const sendJoinRequest=()=>{if(!joinForm.from.trim()||!joinForm.msg.trim()) return;setGroups(gs=>gs.map(g=>g.id===sendingReq?{...g,requests:[...(g.requests||[]),{id:Date.now(),...joinForm,status:'pending'}],requested:true}:g));setSendingReq(null);setJoinForm({from:'',age:'',gender:'M',groupSize:1,msg:''});};
//   const handleReq=(gId,rId,action)=>{setGroups(gs=>gs.map(g=>{if(g.id!==gId) return g;const reqs=g.requests.map(r=>r.id===rId?{...r,status:action}:r);let members=g.members;if(action==='accepted'){const req=g.requests.find(r=>r.id===rId);if(req)members=[...g.members,{name:req.from,age:req.age,gender:req.gender}];}return{...g,requests:reqs,members};}));};

//   // Group chat view
//   if(chatGroup!==null){
//     const grp=groups.find(g=>g.id===chatGroup);
//     return(
//       <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 200px)',minHeight:300}}>
//         <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:12,marginBottom:10,borderBottom:'0.5px solid rgba(0,0,0,0.09)'}}>
//           <button style={S.btn} onClick={()=>setChatGroup(null)}>← Back</button>
//           <div style={{fontSize:20}}>{grp.emoji}</div>
//           <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{grp.name}</div><div style={{fontSize:11,color:'#a8a8a5'}}>{grp.members.length} members · {grp.dest}</div></div>
//         </div>
//         <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
//           {grp.messages.length===0&&<div style={{textAlign:'center',padding:'2rem',fontSize:13,color:'#a8a8a5'}}>No messages yet. Say hi! 👋</div>}
//           {grp.messages.map(m=>(<div key={m.id} style={{display:'flex',gap:8,alignItems:'flex-end',flexDirection:m.isMe?'row-reverse':'row'}}>{!m.isMe&&<Avatar name={m.from} size={28}/>}<div>{!m.isMe&&<div style={{fontSize:10,fontWeight:700,color:'#0F6E56',marginBottom:3}}>{m.from}</div>}<div style={{maxWidth:280,padding:'9px 13px',borderRadius:16,fontSize:13,lineHeight:1.5,background:m.isMe?'#1D9E75':'#fff',color:m.isMe?'#fff':'#1a1a18',border:m.isMe?'none':'0.5px solid rgba(0,0,0,0.09)',borderBottomRightRadius:m.isMe?4:16,borderBottomLeftRadius:m.isMe?16:4}}>{m.text}<span style={{fontSize:10,color:m.isMe?'rgba(255,255,255,0.7)':'#a8a8a5',display:'block',marginTop:3,textAlign:m.isMe?'right':'left'}}>{m.time}</span></div></div></div>))}
//           <div ref={messagesEndRef}/>
//         </div>
//         <div style={{display:'flex',gap:8,paddingTop:10,borderTop:'0.5px solid rgba(0,0,0,0.06)'}}>
//           <input style={{...S.input,flex:1,borderRadius:24}} value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Type a message…"/>
//           <button style={{...S.btn,...S.btnP,borderRadius:'50%',width:40,height:40,padding:0,justifyContent:'center',flexShrink:0}} onClick={sendChat}>➤</button>
//         </div>
//       </div>
//     );
//   }

//   // Join request form
//   if(sendingReq!==null){
//     const grp=groups.find(g=>g.id===sendingReq);
//     return(
//       <div>
//         <button style={{...S.btn,marginBottom:'1rem'}} onClick={()=>setSendingReq(null)}>← Back</button>
//         <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,marginBottom:4}}>Send Join Request</div>
//         <div style={{fontSize:13,color:'#6b6b68',marginBottom:'1.25rem'}}>{grp?.emoji} {grp?.name} · {grp?.dest}</div>
//         <div style={S.card}>
//           <label style={S.label}>Your name / group name</label>
//           <input style={S.input} value={joinForm.from} onChange={e=>setJoinForm(f=>({...f,from:e.target.value}))} placeholder="e.g. Karan or Karan & Friends"/>
//           <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:10}}>
//             <div><label style={S.label}>Age</label><input style={S.input} type="number" value={joinForm.age} onChange={e=>setJoinForm(f=>({...f,age:e.target.value}))} placeholder="25"/></div>
//             <div><label style={S.label}>Gender</label><select style={S.input} value={joinForm.gender} onChange={e=>setJoinForm(f=>({...f,gender:e.target.value}))}><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
//             <div><label style={S.label}>Group size</label><input style={S.input} type="number" min={1} value={joinForm.groupSize} onChange={e=>setJoinForm(f=>({...f,groupSize:parseInt(e.target.value)||1}))}/></div>
//           </div>
//           <label style={{...S.label,marginTop:12}}>Message to the group</label>
//           <textarea style={{...S.input,resize:'vertical',minHeight:72}} value={joinForm.msg} onChange={e=>setJoinForm(f=>({...f,msg:e.target.value}))} placeholder="Tell them a bit about yourself…"/>
//           <button style={{...S.btn,...S.btnOrange,width:'100%',justifyContent:'center',padding:'11px',fontSize:15,borderRadius:12,marginTop:14}} onClick={sendJoinRequest} disabled={!joinForm.from.trim()||!joinForm.msg.trim()}>➤ Send Request</button>
//         </div>
//       </div>
//     );
//   }

//   const totalTravellers=groups.reduce((s,g)=>s+g.members.length,0);

//   return (
//     <div>
//       <div style={{background:'linear-gradient(135deg,#1D9E75,#0F6E56)',borderRadius:14,padding:'1.5rem',marginBottom:'1.25rem',overflow:'hidden',position:'relative'}}>
//         <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:'#fff',marginBottom:5}}>
//           {isSoloUser ? '🌏 TravelBae Club' : '✈️ TravelBae Club'}
//         </div>
//         <div style={{fontSize:13,color:'rgba(255,255,255,0.8)',lineHeight:1.5,marginBottom:14}}>
//           {isSoloUser
//             ? 'Find travel groups to join, or connect with other solo travellers at your destination.'
//             : 'Find travel companions, join groups, and make new friends on the road.'}
//         </div>
//         <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
//           {[[groups.length,'Groups'],[SOLO_TRAVELLERS.length,'Solo Travellers'],[totalTravellers,'Travellers']].slice(0,isSoloUser?3:2).map(([v,l])=>(
//             <div key={l} style={{background:'rgba(255,255,255,0.15)',borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
//               <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:'#fff'}}>{v}</div>
//               <div style={{fontSize:10,color:'rgba(255,255,255,0.75)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginTop:2}}>{l}</div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Tabs */}
//       <div style={{display:'flex',gap:0,marginBottom:'1.25rem',background:'#fff',border:'0.5px solid rgba(0,0,0,0.09)',borderRadius:14,padding:4}}>
//         {[
//           {id:'discover',label:'🌍 Discover'},
//           {id:'my',label:'👥 My Group'},
//           {id:'requests',label:`🔔 Requests${pendingRequests.length>0?` (${pendingRequests.length})`:''}`}
//         ].map(t=>(
//           <button key={t.id} onClick={()=>setSubTab(t.id)}
//             style={{flex:1,padding:'8px 10px',fontSize:12,fontWeight:500,borderRadius:10,border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",background:subTab===t.id?'#1D9E75':'transparent',color:subTab===t.id?'#fff':'#6b6b68',transition:'all .15s',whiteSpace:'nowrap'}}>
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {/* ── DISCOVER TAB ── */}
//       {subTab==='discover' && (
//         <div>
//           {/* Filter bar */}
//           <div style={{marginBottom:'1rem'}}>
//             <div style={{display:'flex',alignItems:'center',gap:8,marginBottom: showFilters ? '1rem' : 0}}>
//               <button
//                 onClick={()=>setShowFilters(v=>!v)}
//                 style={{...S.btn,fontSize:12,padding:'6px 14px',position:'relative',background:activeFilterCount>0?'#E1F5EE':'#fff',border:activeFilterCount>0?'0.5px solid #9FE1CB':'0.5px solid rgba(0,0,0,0.17)',color:activeFilterCount>0?'#085041':'#1a1a18'}}>
//                 🎛️ Filters
//                 {activeFilterCount>0&&<span style={{position:'absolute',top:-6,right:-6,background:'#1D9E75',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{activeFilterCount}</span>}
//               </button>
//               {activeFilterCount>0&&<button style={{...S.btn,fontSize:11,padding:'4px 10px',color:'#993C1D',borderColor:'#F5C4B3'}} onClick={()=>{setFilterGender('all');setFilterAgeMin(18);setFilterAgeMax(45);setFilterMaxDist(1000);setFilterOpenOnly(false);setFilterShowType('both');}}>✕ Clear all</button>}
//               <span style={{fontSize:12,color:'#6b6b68',marginLeft:'auto'}}>
//                 {isSoloUser
//                   ? `${groupCount} group${groupCount!==1?'s':''} · ${soloCount} solo${soloCount!==1?'s':''}`
//                   : `${filteredDiscover.length} group${filteredDiscover.length!==1?'s':''}`}
//               </span>
//             </div>

//             {showFilters && (
//               <div style={{...S.card,border:'0.5px solid #9FE1CB',background:'#f9fffe',marginBottom:'1rem'}}>

//                 {/* Solo-user only: show type selector */}
//                 {isSoloUser && (
//                   <>
//                     <label style={S.label}>Show me</label>
//                     <div style={{display:'flex',gap:0,background:'#F1EFE8',borderRadius:12,padding:3,marginBottom:4}}>
//                       {[['both','👥🎒 Both'],['groups','👥 Groups only'],['solos','🎒 Solos only']].map(([val,label])=>(
//                         <button key={val} onClick={()=>setFilterShowType(val)}
//                           style={{flex:1,padding:'8px 6px',fontSize:12,fontWeight:500,borderRadius:9,border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",background:filterShowType===val?'#1D9E75':'transparent',color:filterShowType===val?'#fff':'#6b6b68',transition:'all .15s',whiteSpace:'nowrap'}}>
//                           {label}
//                         </button>
//                       ))}
//                     </div>
//                   </>
//                 )}

//                 {/* Group type (gender) */}
//                 <label style={S.label}>Group type</label>
//                 <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:4}}>
//                   {[['all','👥 Any'],['M','👦 Boys only'],['F','👧 Girls only'],['coed','🤝 Co-ed']].map(([val,label])=>(
//                     <button key={val} onClick={()=>setFilterGender(val)}
//                       style={{...S.btn,fontSize:12,padding:'5px 12px',borderRadius:20,...(filterGender===val?S.btnP:{})}}>
//                       {label}
//                     </button>
//                   ))}
//                 </div>

//                 {/* Age range */}
//                 <label style={S.label}>Age range: {filterAgeMin}–{filterAgeMax} yrs</label>
//                 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:4}}>
//                   <div>
//                     <div style={{fontSize:11,color:'#6b6b68',marginBottom:4}}>Min: {filterAgeMin}</div>
//                     <input type="range" min={18} max={50} value={filterAgeMin}
//                       onChange={e=>setFilterAgeMin(Math.min(parseInt(e.target.value),filterAgeMax-1))}
//                       style={{width:'100%',accentColor:'#1D9E75'}}/>
//                   </div>
//                   <div>
//                     <div style={{fontSize:11,color:'#6b6b68',marginBottom:4}}>Max: {filterAgeMax}</div>
//                     <input type="range" min={18} max={60} value={filterAgeMax}
//                       onChange={e=>setFilterAgeMax(Math.max(parseInt(e.target.value),filterAgeMin+1))}
//                       style={{width:'100%',accentColor:'#1D9E75'}}/>
//                   </div>
//                 </div>

//                 {/* Distance */}
//                 <label style={S.label}>Max distance: {filterMaxDist>=1000?'Any':`${filterMaxDist} km`}</label>
//                 <input type="range" min={50} max={1000} step={50} value={filterMaxDist}
//                   onChange={e=>setFilterMaxDist(parseInt(e.target.value))}
//                   style={{width:'100%',accentColor:'#1D9E75',marginBottom:8}}/>
//                 <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#a8a8a5',marginBottom:10}}>
//                   <span>50 km</span><span>500 km</span><span>1000+ km</span>
//                 </div>

//                 {/* Open slots (only relevant for groups) */}
//                 {filterShowType!=='solos' && (
//                   <div style={{display:'flex',alignItems:'center',gap:10}}>
//                     <div onClick={()=>setFilterOpenOnly(v=>!v)}
//                       style={{width:42,height:24,borderRadius:12,background:filterOpenOnly?'#1D9E75':'#D3D1C7',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
//                       <div style={{position:'absolute',top:3,left:filterOpenOnly?20:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
//                     </div>
//                     <span style={{fontSize:13,fontWeight:500}}>Open spots only (groups)</span>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* Results */}
//           {filteredDiscover.length===0 ? (
//             <div style={{textAlign:'center',padding:'2.5rem',color:'#6b6b68'}}>
//               <div style={{fontSize:40,marginBottom:10}}>🔍</div>
//               <p style={{fontSize:14}}>No results match your filters.</p>
//               <button style={{...S.btn,marginTop:12,fontSize:13}} onClick={()=>{setFilterGender('all');setFilterAgeMin(18);setFilterAgeMax(45);setFilterMaxDist(1000);setFilterOpenOnly(false);setFilterShowType('both');}}>Clear filters</button>
//             </div>
//           ) : (
//             <div>
//               {/* Group cards */}
//               {filteredDiscover.filter(i=>i._kind==='group').map(grp=>(
//                 <div key={grp.id} style={{...S.card,padding:0,overflow:'hidden',marginBottom:12}}>
//                   <div style={{padding:'1rem 1.1rem',display:'flex',gap:14,alignItems:'flex-start'}}>
//                     <img src={grp.coverUrl} style={{width:56,height:56,borderRadius:12,objectFit:'cover',flexShrink:0,border:'0.5px solid rgba(0,0,0,0.09)'}} alt="" onError={e=>{e.target.style.display='none';}}/>
//                     <div style={{flex:1,minWidth:0}}>
//                       <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
//                         <div style={{fontSize:15,fontWeight:600,flex:1}}>{grp.name}</div>
//                         <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:8,background:'#E1F5EE',color:'#085041'}}>Group</span>
//                       </div>
//                       <div style={{fontSize:12,color:'#0F6E56',fontWeight:500,marginBottom:6}}>📍 {grp.dest}</div>
//                       <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
//                         <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:10,fontSize:11,fontWeight:500,background:'#F1EFE8',color:'#6b6b68',border:'0.5px solid rgba(0,0,0,0.09)'}}>📅 {grp.dates}</span>
//                         <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:10,fontSize:11,fontWeight:500,background:grp.openSlots>0?'#E1F5EE':'#FAECE7',color:grp.openSlots>0?'#085041':'#993C1D',border:`0.5px solid ${grp.openSlots>0?'#9FE1CB':'#F5C4B3'}`}}>{grp.openSlots>0?`${grp.openSlots} spots open`:'Full'}</span>
//                         {grp.distanceKm>0&&<span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:10,fontSize:11,fontWeight:500,background:'#E6F1FB',color:'#378ADD',border:'0.5px solid #B8D5F5'}}>📍 {grp.distanceKm} km away</span>}
//                       </div>
//                     </div>
//                   </div>
//                   <div style={{height:'0.5px',background:'rgba(0,0,0,0.09)',margin:'0 1.1rem'}}/>
//                   <div style={{padding:'10px 1.1rem',display:'flex',gap:6,flexWrap:'wrap'}}>
//                     {grp.members.slice(0,5).map((m,i)=>(
//                       <div key={i} style={{display:'flex',alignItems:'center',gap:5,background:'#f7f6f2',border:'0.5px solid rgba(0,0,0,0.09)',borderRadius:16,padding:'3px 8px 3px 4px',fontSize:11,fontWeight:500}}>
//                         <Avatar name={m.name} size={18}/>{m.name}{m.age?`, ${m.age}`:''}
//                       </div>
//                     ))}
//                   </div>
//                   {grp.description&&<div style={{padding:'0 1.1rem 10px',fontSize:12,color:'#6b6b68',lineHeight:1.5,fontStyle:'italic'}}>"{grp.description}"</div>}
//                   <div style={{height:'0.5px',background:'rgba(0,0,0,0.09)',margin:'0 1.1rem'}}/>
//                   <div style={{padding:'10px 1.1rem',display:'flex',gap:8}}>
//                     {grp.requested
//                       ? <span style={{fontSize:12,color:'#6b6b68',display:'flex',alignItems:'center',gap:5}}>⏳ Request sent</span>
//                       : <button style={{...S.btn,...S.btnOrange,fontSize:12}} onClick={()=>setSendingReq(grp.id)} disabled={grp.openSlots===0}>➤ {grp.openSlots===0?'Full':'Send join request'}</button>}
//                     <button style={{...S.btn,fontSize:12,marginLeft:'auto'}} onClick={()=>setChatGroup(grp.id)}>💬 Chat</button>
//                   </div>
//                 </div>
//               ))}

//               {/* Solo traveller cards (solo user only) */}
//               {filteredDiscover.filter(i=>i._kind==='solo').map(t=>(
//                 <div key={t.id} style={{...S.card,marginBottom:12,padding:0,overflow:'hidden'}}>
//                   <div style={{padding:'1rem 1.1rem',display:'flex',gap:14,alignItems:'flex-start'}}>
//                     <div style={{position:'relative',flexShrink:0}}>
//                       <SoloAvatar initials={t.avatar} size={52}/>
//                       {t.verified && (
//                         <div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,background:'#1D9E75',borderRadius:'50%',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700}}>✓</div>
//                       )}
//                     </div>
//                     <div style={{flex:1,minWidth:0}}>
//                       <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:2}}>
//                         <div style={{fontSize:15,fontWeight:600}}>{t.name}</div>
//                         <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:8,background:'#EEEDFE',color:'#534AB7'}}>Solo</span>
//                         <span style={{fontSize:11,color:'#6b6b68'}}>{t.gender==='M'?'👦':'👧'} {t.age} · {t.location}</span>
//                       </div>
//                       <div style={{fontSize:12,color:'#0F6E56',fontWeight:500,marginBottom:5}}>📍 {t.dest} · {t.dates}</div>
//                       <div style={{fontSize:12,color:'#6b6b68',fontStyle:'italic',lineHeight:1.4,marginBottom:8}}>"{t.vibe}"</div>
//                       {t.distanceKm===0&&<div style={{fontSize:11,color:'#0F6E56',fontWeight:500,marginBottom:6,display:'flex',alignItems:'center',gap:4}}><div style={{width:6,height:6,borderRadius:'50%',background:'#1D9E75',flexShrink:0}}/>Same destination!</div>}
//                       <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
//                         {t.interests.map(i=><span key={i} style={{fontSize:10,padding:'2px 7px',borderRadius:8,background:'#EEEDFE',color:'#534AB7',fontWeight:500}}>{i}</span>)}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── MY GROUP TAB ── */}
//       {subTab==='my'&&(!myGroup
//         ? <div style={{textAlign:'center',padding:'2.5rem'}}><div style={{fontSize:48,marginBottom:12}}>👥</div><p style={{marginBottom:'1.25rem',fontSize:14,color:'#6b6b68'}}>No group listed yet.</p><button style={{...S.btn,...S.btnP}}>+ List my group</button></div>
//         : <div style={{...S.card,padding:0,overflow:'hidden'}}>
//             <div style={{padding:'1rem 1.1rem',display:'flex',gap:14}}>
//               <img src={myGroup.coverUrl} style={{width:56,height:56,borderRadius:12,objectFit:'cover',flexShrink:0}} alt="" onError={e=>{e.target.style.display='none';}}/>
//               <div style={{flex:1}}>
//                 <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:15,fontWeight:600,flex:1}}>{myGroup.name}</div><span style={{fontSize:10,fontWeight:700,background:'#1D9E75',color:'#fff',borderRadius:8,padding:'2px 8px'}}>Admin</span></div>
//                 <div style={{fontSize:12,color:'#0F6E56',fontWeight:500,marginBottom:6}}>📍 {myGroup.dest}</div>
//               </div>
//             </div>
//             <div style={{height:'0.5px',background:'rgba(0,0,0,0.09)',margin:'0 1.1rem'}}/>
//             <div style={{padding:'10px 1.1rem'}}>
//               {myGroup.members.map((m,i)=>(
//                 <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
//                   <Avatar name={m.name} size={32}/>
//                   <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{m.name}</div><div style={{fontSize:11,color:'#a8a8a5'}}>{m.gender==='M'?'Male':'Female'}{m.age?`, ${m.age} yrs`:''}</div></div>
//                   {i===0&&<span style={{fontSize:10,fontWeight:600,color:'#0F6E56',background:'#E1F5EE',border:'0.5px solid #9FE1CB',borderRadius:10,padding:'2px 8px'}}>You</span>}
//                 </div>
//               ))}
//             </div>
//             <div style={{height:'0.5px',background:'rgba(0,0,0,0.09)',margin:'0 1.1rem'}}/>
//             <div style={{padding:'10px 1.1rem',display:'flex',gap:8}}>
//               <button style={{...S.btn,fontSize:12,position:'relative'}} onClick={()=>setSubTab('requests')}>
//                 🔔 Requests
//                 {pendingRequests.length>0&&<span style={{position:'absolute',top:-6,right:-6,background:'#FF6B35',color:'#fff',borderRadius:12,padding:'2px 6px',fontSize:10,fontWeight:700}}>{pendingRequests.length}</span>}
//               </button>
//               <button style={{...S.btn,...S.btnP,fontSize:12,marginLeft:'auto'}} onClick={()=>setChatGroup(myGroup.id)}>💬 Group Chat</button>
//             </div>
//           </div>
//       )}

//       {/* ── REQUESTS TAB ── */}
//       {subTab==='requests'&&(!myGroup
//         ? <div style={{textAlign:'center',padding:'2rem',fontSize:14,color:'#6b6b68'}}>List a group first.</div>
//         : <>
//             <div style={{fontSize:16,fontWeight:700,fontFamily:"'Sora',sans-serif",marginBottom:4}}>{myGroup.name}</div>
//             <div style={{fontSize:12,color:'#6b6b68',marginBottom:'1.25rem'}}>{pendingRequests.length} pending request{pendingRequests.length!==1?'s':''}</div>
//             {pendingRequests.length===0&&<div style={{textAlign:'center',padding:'2rem',fontSize:14,color:'#6b6b68'}}><div style={{fontSize:36,marginBottom:8}}>📭</div><p>No pending requests</p></div>}
//             {pendingRequests.map(req=>(
//               <div key={req.id} style={{...S.card,display:'flex',gap:12}}>
//                 <Avatar name={req.from} size={44}/>
//                 <div style={{flex:1,minWidth:0}}>
//                   <div style={{fontSize:14,fontWeight:600}}>{req.from}</div>
//                   <div style={{fontSize:12,color:'#6b6b68',marginTop:3}}>{req.gender==='M'?'👦':'👧'} {req.age} yrs · Group of {req.groupSize}</div>
//                   <div style={{fontSize:13,color:'#6b6b68',marginTop:6,fontStyle:'italic'}}>"{req.msg}"</div>
//                   <div style={{display:'flex',gap:6,marginTop:10}}>
//                     <button style={{...S.btn,...S.btnP,fontSize:12}} onClick={()=>handleReq(myGroup.id,req.id,'accepted')}>✓ Accept</button>
//                     <button style={{...S.btn,fontSize:12,color:'#993C1D',borderColor:'#F5C4B3'}} onClick={()=>handleReq(myGroup.id,req.id,'declined')}>✕ Decline</button>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </>
//       )}
//     </div>
//   );
// }



import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from './supabase';
import {
  aiChat,
  getTrips,
  createTrip,
  joinTrip,
  addExpense,
  deleteExpense,
  addContact,
  deleteContact,
  addPhoto,
  deletePhoto,
  deleteAccount,
  getClubHub,
  upsertClubProfile,
  updateClubStatus,
  sendClubRequest,
  respondClubRequest
} from './api';

// Add these two to your api.js:
// export const deleteTrip = (id) => apiFetch(`/trips/${id}`, { method: 'DELETE' });
// export const updateTrip = (id, data) => apiFetch(`/trips/${id}`, { method: 'PATCH', body: data });

/* ─── CONSTANTS ─────────────────────────────────────── */
const MCOLORS = ['#1D9E75','#D85A30','#BA7517','#7F77DD','#378ADD','#D4537E','#0F6E56','#993C1D'];
const CATS = [
  {id:'food',icon:'🍽️',label:'Food',bg:'#FAEEDA'},
  {id:'transport',icon:'🚗',label:'Transport',bg:'#E1F5EE'},
  {id:'stay',icon:'🏠',label:'Stay',bg:'#E6F1FB'},
  {id:'activity',icon:'🎟️',label:'Activity',bg:'#EEEDFE'},
  {id:'shopping',icon:'🛍️',label:'Shopping',bg:'#FAECE7'},
  // {id:'other',icon:'•••',label:'Other',bg:'#F1EFE8'},
];
const CONTACT_CATS = [
  {id:'guardian',icon:'🛡️',label:'Guardian',bg:'#EEEDFE',color:'#534AB7'},
  {id:'driver',icon:'🚗',label:'Driver',bg:'#E1F5EE',color:'#0F6E56'},
  {id:'hotel',icon:'🏨',label:'Hotel Staff',bg:'#E6F1FB',color:'#378ADD'},
  {id:'guide',icon:'🗺️',label:'Guide',bg:'#FAEEDA',color:'#854F0B'},
  {id:'medical',icon:'🏥',label:'Medical',bg:'#FAECE7',color:'#993C1D'},
  {id:'emergency',icon:'🚨',label:'Emergency',bg:'#FFF3CD',color:'#856404'},
  {id:'other',icon:'👤',label:'Other',bg:'#F1EFE8',color:'#6b6b68'},
];
const INTERESTS = ['🏖️ Beaches','🛕 Temples','🌿 Nature','🍽️ Food','🧗 Adventure','🎭 Culture','🛍️ Shopping','🌙 Nightlife','🏛️ History','💆 Wellness'];





/* ─── HELPERS ───────────────────────────────────────── */
function nickName(m) {
  if (!m) return '?';
  if (typeof m === 'string') return m;
  if (typeof m === 'object') return m.nickname || m.name || '?';
  return '?';
}

function normalizeMembers(members) {
  if (!Array.isArray(members)) return [];
  return members.map(nickName);
}

function mcolor(n) {
  const name = nickName(n);
  const code = Math.abs(Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return MCOLORS[code % MCOLORS.length];
}

function Avatar({ name, size = 26 }) {
  const display = nickName(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: mcolor(display),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * .38), fontWeight: 700,
      flexShrink: 0, fontFamily: "'Sora',sans-serif"
    }}>
      {display.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SoloAvatar({ initials, size = 26 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#7F77DD,#534AB7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * .38), fontWeight: 700,
      flexShrink: 0, fontFamily: "'Sora',sans-serif"
    }}>
      {(initials || 'ME').slice(0, 2).toUpperCase()}
    </div>
  );
}

function Spinner({ text, solo }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={solo ? S.soloSpinner : S.spinner} />
      <p style={{ fontSize: 14, color: '#6b6b68' }}>{text || 'Loading…'}</p>
    </div>
  );
}

function Stars({ n, rating }) {
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#BA7517' : '#D3D1C7', fontSize: 11 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#6b6b68', marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

function formatDateRange(arrival, departure) {
  const a = new Date(arrival); const d = new Date(departure);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (a.getMonth() === d.getMonth()) return `${a.getDate()}–${d.getDate()} ${months[a.getMonth()]}`;
  return `${a.getDate()} ${months[a.getMonth()]} – ${d.getDate()} ${months[d.getMonth()]}`;
}

function tripDuration(arrival, departure) {
  return Math.max(1, Math.round((new Date(departure) - new Date(arrival)) / 86400000));
}

// Used ONLY for the status badge label/color — does NOT control active/past split
function tripStatusInfo(arrival, departure, completed) {
  if (completed) {
    return { label: 'Completed', color: '#6b6b68', bg: '#F1EFE8', border: '#D3D1C7', isPast: true };
  }
  const now = new Date(); const a = new Date(arrival); const d = new Date(departure);
  if (now < a) {
    const daysLeft = Math.ceil((a - now) / 86400000);
    return { label: `In ${daysLeft}d`, color: '#0F6E56', bg: '#E1F5EE', border: '#9FE1CB', isPast: false };
  } else if (now <= d) {
    return { label: 'Ongoing', color: '#854F0B', bg: '#FAEEDA', border: '#FAC775', isPast: false };
  }
  return { label: 'Past', color: '#6b6b68', bg: '#F1EFE8', border: '#D3D1C7', isPast: false };
}

async function callClaude(prompt) {
  const { reply } = await aiChat(null, [{ role: 'user', content: prompt }]);
  return reply;
}

async function callClaudeJSON(prompt) {
  const text = await callClaude(prompt);
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function callClaudeWithSystem(system, messages) {
  const { reply } = await aiChat(system, messages);
  return reply;
}

/* ─── CONFIRM DIALOG ─────────────────────────────────── */
function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '1.75rem', maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>{confirmStyle === 'danger' ? '🗑️' : '✅'}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.6, marginBottom: 22 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn, flex: 1, justifyContent: 'center', padding: '11px' }} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...S.btn, flex: 1, justifyContent: 'center', padding: '11px', fontWeight: 600,
              ...(confirmStyle === 'danger' ? S.btnDanger : S.btnP),
              background: confirmStyle === 'danger' ? '#993C1D' : undefined,
              color: confirmStyle === 'danger' ? '#fff' : undefined }}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── STYLES ─────────────────────────────────────────── */
const S = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#f7f6f2', color: '#1a1a18', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' },
  topBar: { background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.09)', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' },
  logoText: { fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: '-0.4px' },
  tripPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#085041', fontWeight: 500, cursor: 'pointer' },
  soloPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,#EEEDFE,#E6F1FB)', border: '0.5px solid #AFA9EC', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#534AB7', fontWeight: 500, cursor: 'pointer' },
  navTabs: { background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.09)', display: 'flex', padding: '0 1rem', overflowX: 'auto' },
  navTab: { display: 'flex', alignItems: 'center', gap: 5, padding: '12px 12px', fontSize: 12, fontWeight: 400, color: '#6b6b68', borderBottom: '2px solid transparent', cursor: 'pointer', background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' },
  navTabActive: { color: '#0F6E56', borderBottom: '2px solid #1D9E75', fontWeight: 600 },
  soloNavTabActive: { color: '#534AB7', borderBottom: '2px solid #7F77DD', fontWeight: 600 },
  page: { padding: '1.25rem', flex: 1, paddingBottom: '6rem' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '0.5px solid rgba(0,0,0,0.17)', background: '#fff', color: '#1a1a18', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' },
  btnP: { background: '#1D9E75', color: '#fff', border: '0.5px solid #1D9E75' },
  btnSolo: { background: 'linear-gradient(135deg,#7F77DD,#534AB7)', color: '#fff', border: 'none' },
  btnOrange: { background: '#FF6B35', color: '#fff', border: '0.5px solid #FF6B35' },
  btnDanger: { background: '#fff', color: '#993C1D', border: '0.5px solid #F5C4B3' },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '1rem 1.1rem', marginBottom: 10 },
  input: { fontFamily: "'DM Sans',sans-serif", padding: '9px 12px', border: '0.5px solid rgba(0,0,0,0.17)', borderRadius: 10, fontSize: 14, background: '#fff', color: '#1a1a18', width: '100%', outline: 'none', boxSizing: 'border-box' },
  label: { fontSize: 11, color: '#6b6b68', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', display: 'block', marginBottom: 5, marginTop: 10 },
  spinner: { width: 36, height: 36, border: '3px solid #E1F5EE', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 12px' },
  soloSpinner: { width: 36, height: 36, border: '3px solid #EEEDFE', borderTopColor: '#7F77DD', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 12px' },
};

function HomePage({ trips, onOpenTrip, onCreateTrip, onJoinTrip, onDeleteTrip, onMarkComplete, onMarkActive }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(null);
  const [copied, setCopied] = useState(null);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const [showDestPicker, setShowDestPicker] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const destDebounce = useRef(null);

  const searchDest = useCallback(async (text) => {
    if (text.length < 2) { setDestSuggestions([]); return; }
    setDestLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=7&accept-language=en`,
        { headers: { 'User-Agent': 'TravelBae/1.0', 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const TYPES = ['city','town','village','suburb','county','state','district','region'];
      const seen = new Set();
      const filtered = data.filter(p => {
        const ok = TYPES.includes(p.type) || TYPES.includes(p.addresstype);
        const key = formatDestName(p);
        if (!ok || seen.has(key)) return false;
        seen.add(key); return true;
      });
      setDestSuggestions(filtered);
    } catch { setDestSuggestions([]); }
    setDestLoading(false);
  }, []);

  const formatDestName = (item) => {
    const a = item.address || {};
    const city = a.city || a.town || a.village || a.county || a.state_district || a.suburb || '';
    const state = a.state || '';
    const country = a.country || '';
    if (city && state && country) return `${city}, ${state}, ${country}`;
    if (city && country) return `${city}, ${country}`;
    if (state && country) return `${state}, ${country}`;
    return item.display_name.split(',').slice(0, 2).join(',').trim();
  };

  const getDestIcon = (item) => {
    const t = item.type || item.addresstype || '';
    if (['city','town'].includes(t)) return '🏙️';
    if (['village','suburb','district'].includes(t)) return '🏘️';
    if (['state','region','county'].includes(t)) return '🗺️';
    if (t === 'country') return '🌏';
    return '📍';
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();

  const [form, setForm] = useState({
    groupName: '', destination: '', emoji: '✈️', arrival: today, departure: '',
    arrivalSlot: 'morning', departureSlot: 'morning',
    people: 2, createdBy: '', budget: '',
  });

  const EMOJI_OPTIONS_GROUP = ['✈️','🏖️','🏔️','🏰','🌴','🗺️','🎡','🛕','🌅','🌿','🎭','🏛️'];
  const EMOJI_OPTIONS_SOLO  = ['🎒','🧳','🛺','🚂','🏍️','🌏','🪂','🧗','🌄','☕','📖','🦋'];

  const activeTrips = trips.filter(t => !t.completed);
  const pastTrips   = trips.filter(t =>  t.completed);

  const handleCreate = async () => {
    if (!form.groupName || !form.destination || !form.arrival || !form.departure || !form.createdBy) return;
    setCreating(true);
    try {
      await onCreateTrip({
        groupName: form.groupName,
        destination: form.destination,
        emoji: form.emoji,
        arrival: form.arrival,
        departure: form.departure,
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        isSolo: isSoloMode,
        people: isSoloMode ? 1 : parseInt(form.people),
        budget: form.budget ? parseFloat(form.budget) : null,
        nickname: form.createdBy,
      });
      setShowCreate(false);
      setForm({ groupName: '', destination: '', emoji: '✈️', arrival: today, departure: '', people: 2, createdBy: '', budget: '' });
    } catch (err) {
      alert('Could not create trip: ' + err.message);
    }
    setCreating(false);
  };

  const handleJoin = async () => {
    setJoinError('');
    if (!joinCode.trim()) { setJoinError('Please enter a share code.'); return; }
    if (!joinName.trim()) { setJoinError('Please enter your name.'); return; }
    setJoining(true);
    try {
      const result = await onJoinTrip(joinCode.trim().toUpperCase(), joinName.trim());
      setJoinSuccess(result);
      setJoinCode(''); setJoinName('');
    } catch (err) {
      setJoinError(err.message || 'Invalid code. Please check and try again.');
    }
    setJoining(false);
  };

  const copyCode = (code, id) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  if (showPast) {
    return (
      <div>
        {confirmDelete && (
          <ConfirmDialog
            title="Delete Trip"
            message={`Are you sure you want to delete "${confirmDelete.groupName}"? This cannot be undone.`}
            confirmLabel="🗑️ Delete"
            confirmStyle="danger"
            onConfirm={() => { onDeleteTrip(confirmDelete.id); setConfirmDelete(null); }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <button style={S.btn} onClick={() => setShowPast(false)}>← Back</button>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700 }}>Past Trips</div>
          <span style={{ fontSize: 12, color: '#6b6b68', background: '#F1EFE8', border: '0.5px solid #D3D1C7', borderRadius: 10, padding: '3px 10px' }}>
            {pastTrips.length} trip{pastTrips.length !== 1 ? 's' : ''}
          </span>
        </div>
        {pastTrips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b6b68' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
            <p>No completed trips yet.</p>
          </div>
        )}
        {pastTrips.map(trip => {
          const days = tripDuration(trip.arrival, trip.departure);
          const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
          return (
            <div key={trip.id} style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ position: 'relative', height: 90, overflow: 'hidden', borderRadius: '14px 14px 0 0', cursor: 'pointer' }}
                onClick={() => { setShowPast(false); onOpenTrip(trip.id); }}>
                {trip.coverUrl && <img src={trip.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%)' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.55) 100%)' }} />
                <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 24 }}>{trip.emoji}</div>
                <div style={{ position: 'absolute', top: 9, right: 11, display: 'flex', gap: 6 }}>
                  {trip.isSolo && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: '#EEEDFE', color: '#534AB7', border: '0.5px solid #AFA9EC' }}>Solo</span>}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#F1EFE8', color: '#6b6b68', border: '0.5px solid #D3D1C7' }}>Completed</span>
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>{trip.groupName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>📍 {trip.destination}</div>
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {[['📅', formatDateRange(trip.arrival, trip.departure)], ['🌙', `${days} nights`], ['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')}`]].map(([icon, val]) => (
                  <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b6b68' }}>
                    <span>{icon}</span><span>{val}</span>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => onMarkActive(trip.id)}
                    style={{ ...S.btn, fontSize: 11, padding: '4px 10px', color: '#0F6E56', borderColor: '#9FE1CB', background: '#E1F5EE' }}>
                    ↩ Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete(trip)}
                    style={{ ...S.btn, fontSize: 11, padding: '4px 10px', color: '#993C1D', borderColor: '#F5C4B3', background: '#FAECE7' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>{joinSuccess.emoji}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're in! 🎉</div>
        <div style={{ fontSize: 14, color: '#6b6b68', marginBottom: 24 }}>
          You've joined <strong>{joinSuccess.groupName}</strong> → {joinSuccess.destination}
        </div>
        <button style={{ ...S.btn, ...S.btnP, padding: '10px 24px', fontSize: 14 }}
          onClick={() => { setJoinSuccess(null); onOpenTrip(joinSuccess.id); }}>
          Open Trip →
        </button>
      </div>
    );
  }

  const emojiOptions = isSoloMode ? EMOJI_OPTIONS_SOLO : EMOJI_OPTIONS_GROUP;

  return (
    <div>
      {/* Confirm dialogs */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Are you sure you want to delete "${confirmDelete.groupName}"? All expenses, contacts and photos will be lost. This cannot be undone.`}
          confirmLabel="🗑️ Delete"
          confirmStyle="danger"
          onConfirm={() => { onDeleteTrip(confirmDelete.id); setConfirmDelete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmDelete(null); setMenuOpen(null); }}
        />
      )}
      {confirmComplete && (
        <ConfirmDialog
          title="Mark as Completed?"
          message={`"${confirmComplete.groupName}" will be moved to Past Trips. You can restore it anytime.`}
          confirmLabel="✅ Mark Complete"
          confirmStyle="primary"
          onConfirm={() => { onMarkComplete(confirmComplete.id); setConfirmComplete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmComplete(null); setMenuOpen(null); }}
        />
      )}

      <div style={{ background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 18, padding: '1.75rem 1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 90, opacity: 0.12 }}>✈️</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.2 }}>Your Trips</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', marginBottom: 20, lineHeight: 1.5 }}>Plan, split, explore — together.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={{ ...S.btn, background: '#fff', color: '#0F6E56', border: 'none', fontWeight: 600, fontSize: 13, padding: '9px 16px', borderRadius: 12 }}
            onClick={() => { setShowCreate(true); setShowJoin(false); }}>
            + New Trip
          </button>
          <button style={{ ...S.btn, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.3)', fontSize: 13, padding: '9px 16px', borderRadius: 12 }}
            onClick={() => { setShowJoin(true); setShowCreate(false); }}>
            🔗 Join with Code
          </button>
        </div>
      </div>

      {showJoin && (
        <div style={{ ...S.card, border: '0.5px solid #9FE1CB', background: '#f9fffe', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#0F6E56', marginBottom: 12 }}>🔗 Join a Trip</div>
          <label style={S.label}>Share Code</label>
          <input style={{ ...S.input, letterSpacing: 2, fontFamily: "'Sora',sans-serif", fontWeight: 600, textTransform: 'uppercase' }}
            value={joinCode} onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
            placeholder="e.g. JAI-4820" maxLength={10} />
          <label style={S.label}>Your Name</label>
          <input style={S.input} value={joinName} onChange={e => { setJoinName(e.target.value); setJoinError(''); }} placeholder="e.g. Rahul" />
          {joinError && <div style={{ fontSize: 12, color: '#993C1D', marginTop: 8, padding: '7px 10px', background: '#FAECE7', borderRadius: 8 }}>⚠️ {joinError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnP, flex: 1, justifyContent: 'center', padding: '10px', opacity: joining ? 0.6 : 1 }}
              onClick={handleJoin} disabled={!joinCode.trim() || !joinName.trim() || joining}>
              {joining ? 'Joining…' : '✓ Join Trip'}
            </button>
            <button style={S.btn} onClick={() => { setShowJoin(false); setJoinError(''); }}>✕</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ ...S.card, border: `0.5px solid ${isSoloMode ? '#AFA9EC' : '#9FE1CB'}`, background: isSoloMode ? '#fdfcff' : '#f9fffe', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: isSoloMode ? '#534AB7' : '#0F6E56', marginBottom: 14 }}>
            {isSoloMode ? '🎒 New Solo Adventure' : '✈️ Create New Group Trip'}
          </div>
          <div style={{ display: 'flex', gap: 0, background: '#F1EFE8', borderRadius: 12, padding: 3, marginBottom: 16 }}>
            {[{ val: false, label: '👥 Group', desc: 'Travel with friends' }, { val: true, label: '🎒 Solo', desc: 'Just me, myself & I' }].map(opt => (
              <button key={String(opt.val)} onClick={() => { setIsSoloMode(opt.val); setForm(f => ({ ...f, emoji: opt.val ? '🎒' : '✈️', people: opt.val ? 1 : 2 })); }}
                style={{ flex: 1, padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                  background: isSoloMode === opt.val ? (opt.val ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75') : 'transparent',
                  color: isSoloMode === opt.val ? '#fff' : '#6b6b68', fontWeight: 500, fontSize: 13, transition: 'all .2s' }}>
                {opt.label}
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
          <label style={S.label}>Trip Emoji</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '6px 0 10px' }}>
            {emojiOptions.map(e => (
              <div key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer',
                  border: form.emoji === e ? `2px solid ${isSoloMode ? '#7F77DD' : '#1D9E75'}` : '0.5px solid rgba(0,0,0,0.12)',
                  background: form.emoji === e ? (isSoloMode ? '#EEEDFE' : '#E1F5EE') : '#fff', transition: 'all .12s' }}>
                {e}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>{isSoloMode ? 'Adventure Name *' : 'Group Name *'}</label>
              <input style={S.input} value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))}
                placeholder={isSoloMode ? 'e.g. My Jaipur Chapter' : 'e.g. Pink City Explorers'} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>Destination *</label>

              {/* Tappable field — opens picker */}
              <div
                onClick={() => { setShowDestPicker(true); setDestQuery(form.destination); setDestSuggestions([]); }}
                style={{ ...S.input, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: form.destination ? '#111' : '#aaa', userSelect: 'none' }}
              >
                <span>📍</span>
                <span style={{ flex: 1 }}>{form.destination || 'Search city or place…'}</span>
                {form.destination && (
                  <span
                    onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, destination: '' })); }}
                    style={{ fontSize: 13, color: '#aaa', padding: '0 2px', cursor: 'pointer' }}>✕</span>
                )}
              </div>

              {/* Inline fullscreen picker overlay */}
              {showDestPicker && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#fff', display: 'flex', flexDirection: 'column' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', flexShrink: 0 }}>
                    <button
                      onClick={() => { setShowDestPicker(false); setDestSuggestions([]); }}
                      style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>
                      ←
                    </button>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Destination</div>
                  </div>

                  {/* Search box */}
                  <div style={{ padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F3', borderRadius: 12, padding: '0 12px', border: '0.5px solid #e0e0e0' }}>
                      <span style={{ fontSize: 15 }}>🔍</span>
                      <input
                        autoFocus
                        style={{ ...S.input, border: 'none', background: 'transparent', flex: 1, padding: '10px 0', fontSize: 15, outline: 'none' }}
                        value={destQuery}
                        onChange={e => {
                          setDestQuery(e.target.value);
                          clearTimeout(destDebounce.current);
                          destDebounce.current = setTimeout(() => searchDest(e.target.value), 350);
                        }}
                        placeholder="Search city or place…"
                      />
                      {destLoading && <div style={{ width: 18, height: 18, border: '2px solid #E1F5EE', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .75s linear infinite', flexShrink: 0 }} />}
                      {destQuery && !destLoading && (
                        <span onClick={() => { setDestQuery(''); setDestSuggestions([]); }} style={{ fontSize: 16, color: '#aaa', cursor: 'pointer', flexShrink: 0 }}>✕</span>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {destSuggestions.length > 0 && destSuggestions.map((item, i) => {
                      const a = item.address || {};
                      const mainText = a.city || a.town || a.village || a.state_district || a.county || a.state || item.display_name.split(',')[0];
                      const subText = [a.state, a.country].filter(Boolean).join(', ');
                      return (
                        <div key={item.osm_id + item.osm_type}
                          onClick={() => {
                            const name = formatDestName(item);
                            setForm(f => ({ ...f, destination: name }));
                            setShowDestPicker(false);
                            setDestSuggestions([]);
                            setDestQuery('');
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f7f6f2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                            {getDestIcon(item)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mainText}</div>
                            {subText && <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subText}</div>}
                          </div>
                          <span style={{ fontSize: 18, color: '#ccc' }}>›</span>
                        </div>
                      );
                    })}

                    {/* No results */}
                    {destQuery.length >= 2 && !destLoading && destSuggestions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#6b6b68' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No results for "{destQuery}"</div>
                        <div style={{ fontSize: 13 }}>Try a different spelling or nearby city</div>
                      </div>
                    )}

                    {/* Hint */}
                    {destQuery.length < 2 && (
                      <div style={{ textAlign: 'center', paddingTop: 40, color: '#bbb', fontSize: 13 }}>
                        Start typing to search destinations…
                      </div>
                    )}
                  </div>

                  {/* OSM attribution — required */}
                  <div style={{ padding: '10px', textAlign: 'center', borderTop: '0.5px solid #f0f0f0', fontSize: 11, color: '#bbb', flexShrink: 0 }}>
                    © OpenStreetMap contributors
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={S.label}>Date of Arrival *</label>
              <input
                style={S.input}
                type="date"
                value={form.arrival}
                min={today}
                max={maxDate}
                onChange={e => setForm(f => ({
                  ...f,
                  arrival: e.target.value,
                  departure: f.departure && f.departure < e.target.value ? '' : f.departure,
                }))}
                onBlur={e => {
                  const v = e.target.value;
                  if (v && v < today) setForm(f => ({ ...f, arrival: today }));
                }}
              />
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {[
                  { id: 'night', label: '🌙 12AM–6AM' },
                  { id: 'morning', label: '🌅 6AM–12PM' },
                  { id: 'afternoon', label: '☀️ 12–6PM' },
                  { id: 'evening', label: '🌆 6PM–12AM' },
                ].map(slot => (
                  <button key={slot.id} type="button"
                    onClick={() => setForm(f => ({ ...f, arrivalSlot: slot.id }))}
                    style={{ flex: 1, padding: '5px 4px', borderRadius: 8, border: `1.5px solid ${form.arrivalSlot === slot.id ? (isSoloMode ? '#7F77DD' : '#1D9E75') : 'rgba(0,0,0,0.12)'}`, background: form.arrivalSlot === slot.id ? (isSoloMode ? '#EEEDFE' : '#E1F5EE') : '#fff', color: form.arrivalSlot === slot.id ? (isSoloMode ? '#534AB7' : '#0F6E56') : '#6b6b68', fontSize: 10, fontWeight: form.arrivalSlot === slot.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .12s', whiteSpace: 'nowrap' }}>
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Date of Departure *</label>
              <input
                style={S.input}
                type="date"
                value={form.departure}
                min={form.arrival || today}
                max={maxDate}
                onChange={e => setForm(f => ({ ...f, departure: e.target.value }))}
                onBlur={e => {
                  const v = e.target.value;
                  const minDep = form.arrival || today;
                  if (v && v < minDep) setForm(f => ({ ...f, departure: minDep }));
                }}
              />
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {[
                  { id: 'night', label: '🌙 12AM–6AM' },
                  { id: 'morning', label: '🌅 6AM–12PM' },
                  { id: 'afternoon', label: '☀️ 12–6PM' },
                  { id: 'evening', label: '🌆 6PM–12AM' },
                ].map(slot => (
                  <button key={slot.id} type="button"
                    onClick={() => setForm(f => ({ ...f, departureSlot: slot.id }))}
                    style={{ flex: 1, padding: '5px 4px', borderRadius: 8, border: `1.5px solid ${form.departureSlot === slot.id ? (isSoloMode ? '#7F77DD' : '#1D9E75') : 'rgba(0,0,0,0.12)'}`, background: form.departureSlot === slot.id ? (isSoloMode ? '#EEEDFE' : '#E1F5EE') : '#fff', color: form.departureSlot === slot.id ? (isSoloMode ? '#534AB7' : '#0F6E56') : '#6b6b68', fontSize: 10, fontWeight: form.departureSlot === slot.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .12s', whiteSpace: 'nowrap' }}>
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            {!isSoloMode && (
              <div>
                <label style={S.label}>Number of People</label>
                <input style={S.input} type="number" min={1} max={50} value={form.people} onChange={e => setForm(f => ({ ...f, people: e.target.value }))} />
              </div>
            )}
            <div style={{ gridColumn: isSoloMode ? '1/-1' : 'auto' }}>
              <label style={S.label}>Budget ₹ (optional)</label>
              <input style={S.input} type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. 50000" />
            </div>
            <div style={{ gridColumn: isSoloMode ? '1/-1' : 'auto' }}>
              <label style={S.label}>Your Name *</label>
              <input style={S.input} value={form.createdBy} onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))} placeholder="e.g. Arjun" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              style={{ ...S.btn, ...(isSoloMode ? S.btnSolo : S.btnP), flex: 1, justifyContent: 'center', padding: '11px', fontSize: 14, borderRadius: 12, opacity: creating ? 0.6 : 1 }}
              onClick={handleCreate}
              disabled={!form.groupName || !form.destination || !form.arrival || !form.departure || !form.createdBy || creating}>
              {creating ? 'Creating…' : isSoloMode ? '🎒 Start Solo Adventure' : '🚀 Create & Get Share Code'}
            </button>
            <button style={S.btn} onClick={() => setShowCreate(false)}>✕</button>
          </div>
        </div>
      )}

      {activeTrips.length === 0 && !showCreate && !showJoin && (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🗺️</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No upcoming trips!</div>
          <div style={{ fontSize: 13, color: '#6b6b68', marginBottom: 24 }}>Create your first trip or join one with a code.</div>
          <button style={{ ...S.btn, ...S.btnP, padding: '10px 24px', fontSize: 14 }} onClick={() => setShowCreate(true)}>+ New Trip</button>
        </div>
      )}

      {activeTrips.map(trip => {
        const status = tripStatusInfo(trip.arrival, trip.departure, trip.completed);
        const days = tripDuration(trip.arrival, trip.departure);
        const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
        const memberNames = normalizeMembers(trip.members);
        const budgetPct = trip.isSolo && trip.budget ? Math.min(100, Math.round(totalSpend / trip.budget * 100)) : null;
        const isMenuOpen = menuOpen === trip.id;

        return (
          <div key={trip.id} style={{ ...S.card, padding: 0, overflow: 'visible', marginBottom: 14, position: 'relative' }}>
            <div style={{ overflow: 'hidden', borderRadius: '14px 14px 0 0', cursor: 'pointer' }} onClick={() => onOpenTrip(trip.id)}>
              <div style={{ position: 'relative', height: 110, background: trip.coverUrl ? 'transparent' : (trip.isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)'), overflow: 'hidden' }}>
                {trip.coverUrl && <img src={trip.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.06) 0%,rgba(0,0,0,0.45) 100%)' }} />
                <div style={{ position: 'absolute', top: 12, left: 14, fontSize: 28 }}>{trip.emoji}</div>
                <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6 }}>
                  {trip.isSolo && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(127,119,221,0.9)', color: '#fff', backdropFilter: 'blur(4px)' }}>Solo</span>}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: status.bg, color: status.color, border: `0.5px solid ${status.border}` }}>{status.label}</span>
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{trip.groupName}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>📍 {trip.destination}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', gap: 16, flexWrap: 'wrap', borderBottom: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }} onClick={() => onOpenTrip(trip.id)}>
              {[
                ['📅', formatDateRange(trip.arrival, trip.departure)],
                ['🌙', `${days} nights`],
                trip.isSolo ? ['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')} spent`] : ['👥', `${memberNames.length} members`],
                ...(totalSpend > 0 && !trip.isSolo ? [['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')}`]] : []),
              ].map(([icon, val]) => (
                <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#444' }}>
                  <span>{icon}</span><span>{val}</span>
                </div>
              ))}
            </div>

            {trip.isSolo && trip.budget && (
              <div style={{ padding: '8px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }} onClick={() => onOpenTrip(trip.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6b68', marginBottom: 5 }}>
                  <span>Budget used</span>
                  <span style={{ fontWeight: 600, color: budgetPct > 85 ? '#993C1D' : '#0F6E56' }}>
                    {budgetPct}% · ₹{Math.round(trip.budget - totalSpend).toLocaleString('en-IN')} left
                  </span>
                </div>
                <div style={{ height: 5, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${budgetPct}%`, borderRadius: 4, background: budgetPct > 85 ? '#D85A30' : '#7F77DD', transition: 'width .5s' }} />
                </div>
              </div>
            )}

            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '0 0 14px 14px' }}>
              {trip.isSolo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }} onClick={() => onOpenTrip(trip.id)}>
                  <SoloAvatar initials={(memberNames[0] || 'ME').slice(0, 2)} size={28} />
                  <span style={{ fontSize: 12, color: '#534AB7', fontWeight: 500 }}>Solo adventure by {memberNames[0] || 'You'}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', cursor: 'pointer', flex: 1 }} onClick={() => onOpenTrip(trip.id)}>
                  {memberNames.slice(0, 5).map((m, i) => (
                    <div key={m + i} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid #fff', borderRadius: '50%', zIndex: 5 - i }}>
                      <Avatar name={m} size={28} />
                    </div>
                  ))}
                  {memberNames.length > 5 && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1EFE8', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6b6b68', marginLeft: -8 }}>
                      +{memberNames.length - 5}
                    </div>
                  )}
                </div>
              )}

              <div onClick={e => { e.stopPropagation(); copyCode(trip.shareCode, trip.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, color: '#3C3489', letterSpacing: 1 }}>{trip.shareCode}</span>
                <span style={{ fontSize: 11, color: copied === trip.id ? '#0F6E56' : '#534AB7' }}>{copied === trip.id ? '✓ Copied!' : '📋'}</span>
              </div>

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : trip.id); }}
                  style={{ ...S.btn, padding: '6px 10px', fontSize: 16, color: '#6b6b68', borderColor: 'rgba(0,0,0,0.12)', lineHeight: 1 }}>
                  ⋯
                </button>
                {isMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setMenuOpen(null)} />
                    <div style={{ position: 'absolute', bottom: '110%', right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 101, minWidth: 180, overflow: 'hidden' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmComplete(trip); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#0F6E56', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                        ✅ Mark as Completed
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmDelete(trip); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#993C1D', fontFamily: "'DM Sans',sans-serif" }}>
                        🗑️ Delete Trip
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {pastTrips.length > 0 && (
        <div onClick={() => setShowPast(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', marginTop: 8, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗂️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Past Trips</div>
            <div style={{ fontSize: 12, color: '#6b6b68' }}>{pastTrips.length} completed trip{pastTrips.length !== 1 ? 's' : ''} · tap to view memories</div>
          </div>
          <div style={{ fontSize: 16, color: '#a8a8a5' }}>›</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARE CODE MODAL
═══════════════════════════════════════════════════════ */
function ShareCodeModal({ trip, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(trip.shareCode).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const isSolo = trip.isSolo;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '2rem 1.75rem', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{trip.emoji}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{isSolo ? 'Adventure Ready! 🎒' : 'Trip Created! 🎉'}</div>
        <div style={{ fontSize: 13, color: '#6b6b68', marginBottom: 24, lineHeight: 1.6 }}>
          {isSolo
            ? <>Your solo trip <strong>{trip.groupName}</strong> is set up. Save your code to find it again.</>
            : <>Share this code with your friends so they can join <strong>{trip.groupName}</strong></>}
        </div>
        <div style={{ background: isSolo ? 'linear-gradient(135deg,#EEEDFE,#E6F1FB)' : '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: 14, padding: '18px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: '#534AB7', fontWeight: 600, letterSpacing: .4, textTransform: 'uppercase', marginBottom: 8 }}>Your {isSolo ? 'Trip' : 'Share'} Code</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: '#26215C', letterSpacing: 3 }}>{trip.shareCode}</div>
        </div>
        <button style={{ ...S.btn, ...(copied ? { background: '#E1F5EE', color: '#0F6E56', border: '0.5px solid #9FE1CB' } : (isSolo ? S.btnSolo : S.btnP)), width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, borderRadius: 12, marginBottom: 10 }} onClick={copy}>
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </button>
        <button style={{ ...S.btn, width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, borderRadius: 12 }} onClick={onDismiss}>
          {isSolo ? 'Start Exploring →' : 'Open Trip →'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SOLO EXPENSES PAGE
═══════════════════════════════════════════════════════ */
function SoloExpensesPage({ trip, myNickname, onTripUpdate }) {
  const [expenses, setExpenses] = useState(trip.expenses || []);
  const [budget, setBudget] = useState(trip.budget || null);
  const [showForm, setShowForm] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [editBudget, setEditBudget] = useState(String(budget || ''));
  const [filterCat, setFilterCat] = useState('all');
  const [section, setSection] = useState('log');
  const [saving, setSaving] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ desc: '', amount: '', cat: 'food', date: todayStr, note: '' });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const days = tripDuration(trip.arrival, trip.departure);
  const dailyAvg = total / Math.max(1, days);
  const budgetLeft = budget ? budget - total : null;
  const budgetPct = budget ? Math.min(100, Math.round(total / budget * 100)) : null;

  const catTotals = {};
  CATS.forEach(c => { catTotals[c.id] = 0; });
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.cat === filterCat);
  const sortedFiltered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleAdd = async () => {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    try {
      const data = await addExpense(trip.id, {
        desc: form.desc,
        amount: parseFloat(form.amount),
        paidBy: myNickname || 'Me',
        cat: form.cat,
        split: [myNickname || 'Me'],
        note: form.note,
        date: form.date,
      });
      setExpenses(es => [data.expense, ...es]);
      setForm({ desc: '', amount: '', cat: 'food', date: todayStr, note: '' });
      setShowForm(false);
    } catch (err) {
      alert('Could not save expense: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (expId) => {
    try {
      await deleteExpense(trip.id, expId);
      setExpenses(es => es.filter(x => x.id !== expId));
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  const CAT_COLORS = { food: '#BA7517', transport: '#0F6E56', stay: '#378ADD', activity: '#7F77DD', shopping: '#D4537E'};

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#26215C,#534AB7)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -15, right: -15, fontSize: 80, opacity: 0.08 }}>💰</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 4 }}>Total Spent</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 700, color: '#fff' }}>₹{Math.round(total).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>₹{Math.round(dailyAvg).toLocaleString('en-IN')}/day avg · {expenses.length} entries</div>
          </div>
          {budget && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', marginBottom: 4 }}>Budget Left</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: budgetLeft < 0 ? '#FCA5A5' : '#86EFAC' }}>
                {budgetLeft < 0 ? '-' : ''}₹{Math.abs(Math.round(budgetLeft)).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>of ₹{budget.toLocaleString('en-IN')}</div>
            </div>
          )}
        </div>
        {budget && (
          <div>
            <div style={{ height: 7, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${budgetPct}%`, background: budgetPct > 85 ? '#FCA5A5' : '#86EFAC', transition: 'width .6s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              <span>{budgetPct}% used</span><span>{100 - budgetPct}% remaining</span>
            </div>
          </div>
        )}
        {!budget && (
          <button onClick={() => setShowBudgetEdit(true)} style={{ ...S.btn, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.2)', fontSize: 12, marginTop: 8 }}>
            + Set a budget
          </button>
        )}
        {budget && (
          <button onClick={() => { setEditBudget(String(budget)); setShowBudgetEdit(true); }} style={{ ...S.btn, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.15)', fontSize: 11, marginTop: 8 }}>
            ✏️ Edit budget
          </button>
        )}
      </div>

      {showBudgetEdit && (
        <div style={{ ...S.card, border: '0.5px solid #AFA9EC', background: '#fdfcff', marginBottom: '1rem' }}>
          <label style={S.label}>Total trip budget ₹</label>
          <input style={S.input} type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)} placeholder="e.g. 15000" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btn, ...S.btnSolo, flex: 1, justifyContent: 'center', padding: '9px' }} onClick={() => { const v = parseFloat(editBudget); if (!isNaN(v) && v > 0) setBudget(v); setShowBudgetEdit(false); }}>✓ Save</button>
            <button style={S.btn} onClick={() => setShowBudgetEdit(false)}>✕</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          ['📅', `${days}d trip`, formatDateRange(trip.arrival, trip.departure)],
          ['🏆', CATS.find(c => c.id === topCat?.[0])?.label || '—', `₹${Math.round(topCat?.[1] || 0).toLocaleString('en-IN')}`],
          ['📝', `${expenses.length} entries`, 'logged'],
        ].map(([icon, label, val]) => (
          <div key={label} style={S.card}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.1rem', alignItems: 'center' }}>
        {[{ id: 'log', label: '📋 Log' }, { id: 'breakdown', label: '📊 Breakdown' }].map(sec => (
          <button key={sec.id} style={{ ...S.btn, ...(section === sec.id ? S.btnSolo : {}) }} onClick={() => setSection(sec.id)}>{sec.label}</button>
        ))}
        <button style={{ ...S.btn, marginLeft: 'auto', background: '#EEEDFE', color: '#534AB7', border: '0.5px solid #AFA9EC' }} onClick={() => setShowForm(v => !v)}>+ Add</button>
      </div>

      {showForm && (
        <div style={{ ...S.card, border: '0.5px solid #AFA9EC', background: '#fdfcff', marginBottom: '1rem' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#534AB7', marginBottom: 12 }}>Add expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={S.label}>What was it?</label>
              <input style={S.input} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="e.g. Amber Fort ticket" />
            </div>
            <div>
              <label style={S.label}>Amount ₹</label>
              <input style={S.input} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={S.label}>Category</label>
              <select style={S.input} value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Date</label>
              <input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <label style={S.label}>Note (optional)</label>
          <input style={S.input} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Amazing views!" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnSolo, flex: 1, justifyContent: 'center', padding: '10px', opacity: saving ? 0.6 : 1 }}
              onClick={handleAdd} disabled={!form.desc || !form.amount || saving}>
              {saving ? 'Saving…' : '✓ Add expense'}
            </button>
            <button style={S.btn} onClick={() => setShowForm(false)}>✕</button>
          </div>
        </div>
      )}

      {section === 'log' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={() => setFilterCat('all')} style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, ...(filterCat === 'all' ? S.btnSolo : {}) }}>All</button>
            {CATS.filter(c => catTotals[c.id] > 0).map(c => (
              <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: filterCat === c.id ? c.bg : '#fff', color: filterCat === c.id ? CAT_COLORS[c.id] : '#6b6b68', border: `0.5px solid ${filterCat === c.id ? CAT_COLORS[c.id] + '44' : 'rgba(0,0,0,0.12)'}` }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          {sortedFiltered.length === 0 && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b6b68', fontSize: 14 }}><div style={{ fontSize: 40, marginBottom: 10 }}>📝</div><p>No expenses yet. Add your first one!</p></div>}
          {sortedFiltered.map(exp => {
            const cat = CATS.find(c => c.id === exp.cat) || CATS[5];
            return (
              <div key={exp.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, flexShrink: 0, fontSize: 18 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{exp.desc}</div>
                  <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 2 }}>
                    {cat.label} · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {exp.note && <span style={{ fontStyle: 'italic' }}> · {exp.note}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700 }}>₹{exp.amount.toLocaleString('en-IN')}</div>
                  <button onClick={() => handleDelete(exp.id)} style={{ ...S.btn, padding: '2px 7px', fontSize: 11, color: '#a8a8a5', borderColor: 'transparent', background: 'transparent' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section === 'breakdown' && (
        <div>
          {CATS.filter(c => catTotals[c.id] > 0).map(c => {
            const pct = Math.round(catTotals[c.id] / total * 100);
            return (
              <div key={c.id} style={{ ...S.card, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: CAT_COLORS[c.id] || '#534AB7' }}>₹{Math.round(catTotals[c.id]).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                      <div style={{ flex: 1, height: 6, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: CAT_COLORS[c.id] || '#7F77DD', transition: 'width .5s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b6b68', width: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONTACTS PAGE
═══════════════════════════════════════════════════════ */
function ContactsPage({ trip, myNickname, isSolo }) {
  const memberNames = normalizeMembers(trip.members);
  const [contacts, setContacts] = useState(trip.contacts || []);
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', role: '', cat: 'driver', phone: '', note: '' });
  const [emergencyBannerDismissed, setEmergencyBannerDismissed] = useState(
    () => localStorage.getItem(`travelbae_contacts_emg_dismissed_${trip.id}`) === '1'
  );

  const handleAdd = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (form._editId) {
        // Edit existing
        setContacts(cs => cs.map(c => c.id === form._editId
          ? { ...c, name: form.name, role: form.role, cat: form.cat, phone: form.phone, note: form.note }
          : c
        ));
      } else {
        const data = await addContact(trip.id, { ...form, addedBy: myNickname || 'Me' });
        setContacts(cs => [...cs, data.contact]);
      }
      setForm({ name: '', role: '', cat: 'driver', phone: '', note: '' });
      setShowForm(false);
    } catch (err) {
      alert('Could not save contact: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (cid) => {
    try {
      await deleteContact(trip.id, cid);
      setContacts(cs => cs.filter(x => x.id !== cid));
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  const catCounts = {};
  contacts.forEach(c => { catCounts[c.cat] = (catCounts[c.cat] || 0) + 1; });
  const getCat = id => CONTACT_CATS.find(c => c.id === id) || CONTACT_CATS[CONTACT_CATS.length - 1];
  const filtered = contacts.filter(c => {
    const mc = filterCat === 'all' || c.cat === filterCat;
    const ms = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.role || '').toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  /* ── Fullscreen add form ── */
  if (showForm) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 400, display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button onClick={() => { setShowForm(false); setForm({ name: '', role: '', cat: 'driver', phone: '', note: '' }); }}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>
          {form._editId ? 'Edit Contact' : 'Add Contact'}
        </div>
        <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.phone.trim()}
          style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !form.name.trim() || !form.phone.trim()) ? 0.4 : 1 }}>
          {saving ? 'Saving…' : form._editId ? 'Update' : 'Save'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Category header band */}
        <div style={{ background: isSolo ? 'linear-gradient(135deg,#26215C,#534AB7)' : 'linear-gradient(135deg,#0F6E56,#1D9E75)', padding: '1.5rem 1.25rem 2rem' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 12 }}>Category</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CONTACT_CATS.map(c => (
              <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, fontSize: 13, border: `1.5px solid ${form.cat === c.id ? '#fff' : 'rgba(255,255,255,0.25)'}`, background: form.cat === c.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: form.cat === c.id ? 700 : 400, transition: 'all .12s' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* White card body */}
        <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '1.5rem 1.25rem 3rem' }}>

          {/* Name + Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
            <div>
              <label style={S.label}>Full Name *</label>
              <input style={{ ...S.input, marginTop: 6 }} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar" autoFocus />
            </div>
            <div>
              <label style={S.label}>Role</label>
              <input style={{ ...S.input, marginTop: 6 }} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Hotel Manager" />
            </div>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Phone *</label>
            <input style={{ ...S.input, fontSize: 16, padding: '12px 14px', marginTop: 6, letterSpacing: .5 }}
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210" type="tel" />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Note <span style={{ color: '#a8a8a5', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea style={{ ...S.input, resize: 'none', minHeight: 72, marginTop: 6, lineHeight: 1.5 }}
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Any useful info — language spoken, hours, etc." />
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: '5rem' }}>

      {/* Header summary */}
      <div style={{ background: isSolo ? 'linear-gradient(135deg,#EEEDFE,#E6F1FB)' : 'linear-gradient(135deg,#E1F5EE,#E6F1FB)', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 34 }}>📒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            {isSolo ? 'My Contacts' : 'Trip Contacts'}
          </div>
          <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>
            {isSolo ? 'Personal contacts for this trip.' : 'Shared by the group — drivers, hotel, guides & emergency.'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 700, color: isSolo ? '#534AB7' : '#0F6E56' }}>{contacts.length}</div>
          <div style={{ fontSize: 11, color: '#6b6b68' }}>saved</div>
        </div>
      </div>

      {/* Emergency / guardian contact reminder */}
      {(() => {
        const dismissKey = `travelbae_contacts_emg_dismissed_${trip.id}`;
        if (emergencyBannerDismissed) return null;
        const isEmg = c => c.cat === 'guardian' || c.cat === 'emergency';
        const membersMissing = isSolo
          ? (contacts.some(isEmg) ? [] : [myNickname || 'You'])
          : memberNames.filter(m => {
              const ml = (m || '').toLowerCase();
              return !contacts.some(c => isEmg(c) && (c.addedBy || '').toLowerCase() === ml);
            });
        if (membersMissing.length === 0) return null;
        return (
          <div style={{ background: 'linear-gradient(135deg,#FFF6E0,#FFEAD6)', border: '0.5px solid #F2C679', borderRadius: 16, padding: '12px 14px', marginBottom: '1.1rem', display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FFE0A8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>🚨</div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 18 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#7A4A0B', marginBottom: 2 }}>
                Add a guardian or emergency contact
              </div>
              <div style={{ fontSize: 12, color: '#7A4A0B', lineHeight: 1.5, opacity: 0.85 }}>
                {isSolo
                  ? 'Save at least one trusted contact we can reach in an emergency.'
                  : `Each traveller should add at least one. Still pending: ${membersMissing.slice(0, 3).join(', ')}${membersMissing.length > 3 ? ` +${membersMissing.length - 3} more` : ''}.`}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setForm({ name: '', role: '', cat: 'guardian', phone: '', note: '' }); setShowForm(true); }}
                  style={{ background: '#7A4A0B', color: '#fff', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                >
                  + Add guardian
                </button>
                <button
                  onClick={() => { setForm({ name: '', role: '', cat: 'emergency', phone: '', note: '' }); setShowForm(true); }}
                  style={{ background: '#fff', color: '#7A4A0B', border: '0.5px solid #F2C679', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                >
                  🚨 Add emergency
                </button>
              </div>
            </div>
            <button
              onClick={() => { localStorage.setItem(dismissKey, '1'); setEmergencyBannerDismissed(true); }}
              aria-label="Dismiss"
              style={{ position: 'absolute', top: 8, right: 10, width: 22, height: 22, border: 'none', background: 'transparent', fontSize: 16, color: '#7A4A0B', cursor: 'pointer', lineHeight: 1, opacity: 0.6 }}
            >
              ×
            </button>
          </div>
        );
      })()}

      {/* Search */}
      <div style={{ marginBottom: '0.75rem' }}>
        <input style={{ ...S.input, background: '#fff' }} placeholder="🔍  Search by name or role…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setFilterCat('all')}
          style={{ ...S.btn, fontSize: 11, padding: '4px 12px', borderRadius: 20, ...(filterCat === 'all' ? (isSolo ? S.btnSolo : S.btnP) : {}) }}>
          All · {contacts.length}
        </button>
        {CONTACT_CATS.filter(c => catCounts[c.id] > 0).map(c => (
          <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
            style={{ ...S.btn, fontSize: 11, padding: '4px 12px', borderRadius: 20, background: filterCat === c.id ? c.color : '#fff', color: filterCat === c.id ? '#fff' : c.color, border: `0.5px solid ${c.color}55` }}>
            {c.icon} {c.label} · {catCounts[c.id]}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b6b68' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No contacts yet</p>
          <p style={{ fontSize: 13 }}>Tap + to add your first one</p>
        </div>
      )}

      {/* Contact cards */}
      {filtered.map(c => {
        const cm = getCat(c.cat);
        return (
          <div key={c.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: 3, background: cm.color }} />
            <div style={{ padding: '14px 16px' }}>

              {/* Row 1: icon + name + tag + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: cm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>👤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cm.bg, color: cm.color }}>{cm.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setForm({ name: c.name, role: c.role || '', cat: c.cat, phone: c.phone, note: c.note || '', _editId: c.id }); setShowForm(true); }}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.1)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✏️</button>
                <button onClick={() => handleDelete(c.id)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.1)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#a8a8a5', flexShrink: 0 }}>✕</button>
              </div>

              {/* Detail rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 2 }}>

                {c.role && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0 }}>Role</span>
                    <span style={{ fontSize: 13, color: '#1a1a18', fontWeight: 500 }}>{c.role}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0 }}>Contact</span>
                  <a href={`tel:${c.phone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 600, color: isSolo ? '#534AB7' : '#0F6E56', textDecoration: 'none' }}>
                    📞 {c.phone}
                  </a>
                </div>

                {c.note && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0, paddingTop: 1 }}>Note</span>
                    <span style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.55 }}>{c.note}</span>
                  </div>
                )}

                {!isSolo && c.addedBy && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6, marginTop: 2, borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0 }}>By</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Avatar name={c.addedBy} size={16} />
                      <span style={{ fontSize: 12, color: '#a8a8a5' }}>{c.addedBy}</span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })}

      {/* Emergency quick-dial */}
      {contacts.filter(c => c.cat === 'emergency' || c.cat === 'medical').length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#FFF3CD,#fff8e7)', border: '0.5px solid #ffc107', borderRadius: 14, padding: '1rem 1.25rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#856404', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .4 }}>🚨 Quick-dial emergency</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {contacts.filter(c => c.cat === 'emergency' || c.cat === 'medical').map(c => (
              <a key={c.id} href={`tel:${c.phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '0.5px solid #ffc107', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#1a1a18', textDecoration: 'none' }}>
                📞 {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowForm(true)}
        style={{ position: 'fixed', bottom: 24, right: 20, width: 58, height: 58, borderRadius: '50%', background: isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)', border: 'none', boxShadow: `0 4px 20px ${isSolo ? 'rgba(127,119,221,0.45)' : 'rgba(15,110,86,0.45)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 300, transition: 'transform .15s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        +
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOCAL TASTE PAGE
═══════════════════════════════════════════════════════ */
function LocalTastePage({ destination, isSolo, autoData, autoStep, onRetry }) {
  const [step, setStep] = useState(autoStep || 'idle');
  const [data, setData] = useState(autoData || null);
  const [dest, setDest] = useState(destination || '');
  const [doneItems, setDoneItems] = useState(new Set());

  // Sync if parent finishes loading after mount
  useEffect(() => {
    if (autoStep && autoStep !== step) setStep(autoStep);
    if (autoData && !data) setData(autoData);
  }, [autoStep, autoData]);

  const generate = async () => {
    if (!dest.trim()) return;
    if (onRetry && dest === destination) { onRetry(); return; }
    setStep('loading');
    setDoneItems(new Set());
    try {
      const { generateLocalTaste } = await import('./api');
      const r = await generateLocalTaste({ destination: dest });
      setData(r);
      setStep('result');
    } catch {
      setData({ headline: `${dest} — Local Flavours`, tagline: 'Curated picks', dishes: [], places: [], experiences: [], tip: '' });
      setStep('result');
    }
  };

  const toggleDone = (key) => setDoneItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const tagBg = t => {
    if (['must-try','must-do','iconic'].includes(t)) return { bg: '#FAECE7', color: '#993C1D' };
    if (['heritage','scenic','culture','offbeat'].includes(t)) return { bg: '#E6F1FB', color: '#378ADD' };
    return { bg: '#FAEEDA', color: '#854F0B' };
  };
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';
  const Sec = ({ icon, title, items, iconBg, secKey, dest, startIndex = 0 }) => {
    const doneCount = items.filter((_, i) => doneItems.has(`${secKey}-${i}`)).length;
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: .4, textTransform: 'uppercase', color: '#6b6b68' }}>{title}</span>
          <span style={{ fontSize: 11, color: '#a8a8a5' }}>{items.length} picks</span>
          {doneCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: accentColor, background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 10, padding: '2px 8px', marginLeft: 'auto' }}>✓ {doneCount}/{items.length} done</span>}
        </div>
        {items.map((item, i) => {
          const key = `${secKey}-${i}`;
          const isDone = doneItems.has(key);
          return (
            <div key={i} style={{ ...S.card, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: isDone ? 0.45 : 1, transition: 'all .25s' }}>
              <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, filter: isDone ? 'grayscale(1)' : 'none' }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#a8a8a5' : '#1a1a18' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>{item.desc}</div>
                <div style={{ margin: '10px 0 4px' }}>
                  <PlacePhoto query={`${item.name} ${dest} photo`} style={{ height: 110 }} delay={(startIndex + i) * 600} />
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                  {(item.tags || []).map(t => { const c = tagBg(t); return <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: .3, background: isDone ? '#F1EFE8' : c.bg, color: isDone ? '#a8a8a5' : c.color }}>{t}</span>; })}
                </div>
              </div>
              <button onClick={() => toggleDone(key)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: isDone ? `2px solid ${accentColor}` : '1.5px solid rgba(0,0,0,0.15)', background: isDone ? accentColor : '#fff', color: isDone ? '#fff' : '#a8a8a5', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>{isDone ? '✓' : '○'}</button>
            </div>
          );
        })}
      </div>
    );
  };

  if (step === 'loading') return <Spinner text={`Discovering local flavours of ${dest}…`} solo={isSolo} />;

  if (step === 'result' && data) return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#fff9f0,#fff0e5)', border: '0.5px solid #FAC775', borderRadius: 14, padding: '1.1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ fontSize: 36 }}>🗺️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#854F0B', marginBottom: 3 }}>{data.headline}</div>
          <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>{data.tagline}</div>
        </div>
        {/* <button style={{ ...S.btn, fontSize: 12, flexShrink: 0 }} onClick={() => { setStep('idle'); setData(null); setDoneItems(new Set()); }}>↺</button> */}
      </div>
      <Sec icon="🍴" iconBg="#FAEEDA" title="Must-eat dishes" items={data.dishes || []} secKey="dishes" dest={dest} startIndex={0} />
      <PlacePhotosStrip queries={[`${dest} food`]} style={{ marginBottom: '1rem' }} />
      <Sec icon="📍" iconBg="#E6F1FB" title="Unmissable places" items={data.places || []} secKey="places" dest={dest} startIndex={4} />
      <PlacePhotosStrip queries={[`${dest} landmarks`]} style={{ marginBottom: '1rem' }} />
      <Sec icon="✨" iconBg="#EEEDFE" title="Local experiences" items={data.experiences || []} secKey="exp" dest={dest} startIndex={8} />
      {data.tip && <div style={{ background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 10, padding: '.75rem 1rem', display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: '1rem', fontSize: 12, color: isSolo ? '#26215C' : '#085041', lineHeight: 1.5 }}>💡 <span><strong>Local tip:</strong> {data.tip}</span></div>}
    </div>
  );

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#FAEEDA,#FAECE7)', border: '0.5px solid #FAC775', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Local Taste Guide</div>
        <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.6 }}>Discover what to eat, where to go, and what to do like a local.</div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Destination</label>
        <input style={S.input} value={dest} onChange={e => setDest(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="e.g. Jaipur, Rajasthan" />
        <button style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), width: '100%', justifyContent: 'center', marginTop: 12, padding: '11px', fontSize: 14, borderRadius: 12 }} onClick={generate} disabled={!dest.trim()}>✨ Discover local flavours</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {['Jaipur','Udaipur','Goa','Varanasi','Mumbai','Coorg','Hampi'].map(c => (
          <button key={c} style={{ ...S.btn, fontSize: 12, padding: '5px 12px', borderRadius: 20 }} onClick={() => setDest(c)}>{c}</button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GROUP SPLIT PAGE — REVAMPED v2
═══════════════════════════════════════════════════════ */
function SplitPage({ trip, myNickname }) {
  const memberNames = normalizeMembers(trip.members);
  const [expenses, setExpenses] = useState(trip.expenses || []);
  const [showForm, setShowForm] = useState(false);
  const [section, setSection] = useState('expenses');
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [chartReady, setChartReady] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [localBudget, setLocalBudget] = useState(trip.budget || null);
  const [budgetInput, setBudgetInput] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    desc: '', amount: '', paidBy: myNickname || memberNames[0] || '',
    cat: 'food', date: todayStr,
    splitMode: 'all',
    splitWith: [...memberNames],
    _splitOpen: false,
  });

  const donutRef = useRef(null);
  const barRef = useRef(null);
  const chartInstances = useRef({});

  const MCOLORS_LIST = ['#1D9E75','#D85A30','#7F77DD','#BA7517','#378ADD','#D4537E','#0F6E56','#993C1D'];
  const mcolor = (name) => {
    const code = Math.abs(Array.from(name || '').reduce((a, c) => a + c.charCodeAt(0), 0));
    return MCOLORS_LIST[code % MCOLORS_LIST.length];
  };
  const CAT_COLORS = { food:'#BA7517', transport:'#0F6E56', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E'};

  const budget = localBudget;

  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = () => setChartReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (section !== 'insights' || !chartReady) return;
    const t = setTimeout(renderCharts, 80);
    return () => clearTimeout(t);
  }, [section, chartReady, expenses]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const days = Math.max(1, Math.round((new Date(trip.departure) - new Date(trip.arrival)) / 86400000));
  const today = new Date();
  const daysElapsed = Math.max(1, Math.min(days, Math.round((today - new Date(trip.arrival)) / 86400000)));
  const daysLeft = Math.max(0, Math.round((new Date(trip.departure) - today) / 86400000));
  const tsr = total / daysElapsed;
  const projected = Math.round(tsr * days);
  const budgetLeft = budget ? budget - total : null;
  const budgetPct = budget ? Math.min(100, Math.round(total / budget * 100)) : null;
  const perPerson = memberNames.length > 0 ? total / memberNames.length : 0;

  const catTotals = {};
  CATS.forEach(c => { catTotals[c.id] = 0; });
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });

  const payTotal = {};
  memberNames.forEach(m => { payTotal[m] = 0; });
  expenses.forEach(e => { payTotal[e.paidBy] = (payTotal[e.paidBy] || 0) + e.amount; });
  const maxPay = Math.max(...memberNames.map(m => payTotal[m] || 0), 1);

  const balances = {};
  memberNames.forEach(m => { balances[m] = 0; });
  expenses.forEach(e => {
    const splitNames = Array.isArray(e.split) && e.split.length > 0 ? e.split : memberNames;
    const sh = e.amount / splitNames.length;
    splitNames.forEach(m => { if (balances[m] !== undefined) balances[m] -= sh; });
    if (balances[e.paidBy] !== undefined) balances[e.paidBy] += e.amount;
  });

  const settlements = [];
  const bal = { ...balances };
  const ds = memberNames.filter(m => bal[m] < -0.01).sort((a, b) => bal[a] - bal[b]);
  const cs = memberNames.filter(m => bal[m] > 0.01).sort((a, b) => bal[b] - bal[a]);
  let di = 0, ci = 0;
  while (di < ds.length && ci < cs.length) {
    const d = ds[di], c = cs[ci], amt = Math.min(-bal[d], bal[c]);
    settlements.push({ from: d, to: c, amt });
    bal[d] += amt; bal[c] -= amt;
    if (Math.abs(bal[d]) < 0.01) di++;
    if (Math.abs(bal[c]) < 0.01) ci++;
  }

  const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);

  function renderCharts() {
    Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch (_) {} });
    chartInstances.current = {};
    const textColor = 'rgba(0,0,0,0.4)';
    const gridColor = 'rgba(0,0,0,0.05)';

    if (donutRef.current && budget) {
      chartInstances.current.donut = new window.Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          datasets: [{ data: [Math.min(total, budget), Math.max(0, budget - total)], backgroundColor: [budgetPct > 85 ? '#D85A30' : '#1D9E75', '#E1F5EE'], borderWidth: 0, hoverOffset: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '74%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataIndex === 0 ? ` Spent: ₹${Math.round(Math.min(total, budget)).toLocaleString('en-IN')}` : ` Left: ₹${Math.round(Math.max(0, budget - total)).toLocaleString('en-IN')}` } } } },
        plugins: [{ id: 'center', afterDraw(chart) { const { ctx, chartArea: { width, height, left, top } } = chart; const cx = left + width / 2, cy = top + height / 2; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 17px system-ui'; ctx.fillStyle = '#1a1a18'; ctx.fillText(`${budgetPct}%`, cx, cy - 9); ctx.font = '12px system-ui'; ctx.fillStyle = textColor; ctx.fillText('used', cx, cy + 9); ctx.restore(); } }]
      });
    }

    if (barRef.current) {
      const activeCats = CATS.filter(c => catTotals[c.id] > 0);
      if (activeCats.length === 0) return;
      const BAR_COLORS = { food:'#BA7517', transport:'#1D9E75', stay:'#378ADD', activity:'#7F77DD', shopping:'#D4537E'};
      chartInstances.current.bar = new window.Chart(barRef.current, {
        type: 'bar',
        data: { labels: activeCats.map(c => c.label), datasets: [{ data: activeCats.map(c => catTotals[c.id]), backgroundColor: activeCats.map(c => BAR_COLORS[c.id] || '#888780'), borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${Math.round(ctx.raw).toLocaleString('en-IN')}` } } }, scales: { x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: textColor, font: { size: 11 }, callback: v => `₹${v >= 1000 ? Math.round(v / 1000) + 'k' : v}` }, grid: { color: gridColor }, border: { display: false } } } }
      });
    }
  }

  const handleAdd = async () => {
    if (!form.desc || !form.amount) return;
    const splitWith = form.splitMode === 'all' ? memberNames : form.splitWith;
    if (splitWith.length === 0) { alert('Select at least one person to split with.'); return; }
    setSaving(true);
    try {
      const data = await addExpense(trip.id, {
        desc: form.desc, amount: parseFloat(form.amount),
        paidBy: form.paidBy, cat: form.cat,
        split: splitWith, date: form.date,
      });
      setExpenses(es => [data.expense, ...es]);
      setForm({ desc: '', amount: '', paidBy: myNickname || memberNames[0] || '', cat: 'food', date: todayStr, splitMode: 'all', splitWith: [...memberNames], _splitOpen: false });
      setShowForm(false);
    } catch (err) { alert('Could not save: ' + err.message); }
    setSaving(false);
  };

  const handleDelete = async (expId) => {
    try { await deleteExpense(trip.id, expId); setExpenses(es => es.filter(x => x.id !== expId)); }
    catch (err) { alert('Could not delete: ' + err.message); }
  };

  const filteredExpenses = filterCat === 'all' ? expenses : expenses.filter(e => e.cat === filterCat);
  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  const SECTION_TABS = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'shares',   label: 'Shares' },
    { id: 'balances', label: 'Balances' },
    { id: 'insights', label: 'Insights' },
  ];

  /* ── Fullscreen expense form ── */
  if (showForm) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 400, display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button onClick={() => setShowForm(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Add Expense</div>
        <button onClick={handleAdd} disabled={saving || !form.desc || !form.amount}
          style={{ ...S.btn, ...S.btnP, padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !form.desc || !form.amount) ? 0.4 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Amount block */}
        <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1D9E75)', padding: '2rem 1.5rem 2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 12 }}>How much?</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>₹</span>
            <input
              type="number" placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              autoFocus
              style={{ fontFamily: "'Sora',sans-serif", fontSize: 56, fontWeight: 700, color: '#fff', border: 'none', background: 'transparent', outline: 'none', width: '65%', textAlign: 'center', padding: 0, caretColor: 'rgba(255,255,255,0.8)' }}
            />
          </div>
        </div>

        {/* White card body */}
        <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '1.5rem 1.25rem 2rem', minHeight: '100%' }}>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>What was it?</label>
            <input style={{ ...S.input, fontSize: 15, padding: '12px 14px', marginTop: 6 }}
              placeholder="e.g. Hotel checkout, dinner, cab…"
              value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          </div>

          {/* Category */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {CATS.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 18, fontSize: 12, border: `1.5px solid ${form.cat === c.id ? '#1D9E75' : 'rgba(0,0,0,0.09)'}`, background: form.cat === c.id ? '#E1F5EE' : '#fafafa', color: form.cat === c.id ? '#0F6E56' : '#6b6b68', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: form.cat === c.id ? 600 : 400, transition: 'all .12s' }}>
                  <span style={{ fontSize: 13 }}>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
              <button
                onClick={() => { const tag = prompt('New tag name:'); if (tag?.trim()) { const id = 'custom_' + tag.trim().toLowerCase().replace(/\s+/g,'_'); if (!CATS.find(c => c.id === id)) CATS.push({ id, icon: '🏷️', label: tag.trim(), bg: '#F1EFE8' }); setForm(f => ({ ...f, cat: id })); } }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 18, fontSize: 12, border: '1.5px dashed rgba(0,0,0,0.15)', background: '#fafafa', color: '#a8a8a5', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                + tag
              </button>
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={S.label}>Date</label>
            <input style={{ ...S.input, marginTop: 6 }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>

          {/* Paid by + Split — Splitwise style */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={S.label}>Paid by & Split</label>
            <div style={{ marginTop: 8, background: '#f7f6f2', borderRadius: 14, padding: '4px' }}>

              {/* Single-line Splitwise row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: '#6b6b68' }}>Paid by</span>

                {/* Paid by pill */}
                <button
                  onClick={() => setForm(f => ({ ...f, _paidByOpen: !f._paidByOpen, _splitOpen: false }))}
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', background: '#fff', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: mcolor(form.paidBy), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>{form.paidBy.slice(0,2).toUpperCase()}</div>
                  {form.paidBy}
                  <span style={{ fontSize: 10, color: '#a8a8a5' }}>▾</span>
                </button>

                <span style={{ fontSize: 14, color: '#6b6b68' }}>and split</span>

                {/* Split pill */}
                <button
                  onClick={() => setForm(f => ({ ...f, _splitOpen: !f._splitOpen, _paidByOpen: false }))}
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', background: '#fff', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {form.splitMode === 'all' ? 'equally' : `${form.splitWith.length} people`}
                  <span style={{ fontSize: 10, color: '#a8a8a5' }}>▾</span>
                </button>
              </div>

              {/* Paid by sheet */}
              {form._paidByOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '8px 6px' }}>
                  <div style={{ fontSize: 11, color: '#a8a8a5', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', padding: '4px 8px 8px' }}>Who paid?</div>
                  {memberNames.map(m => (
                    <button key={m}
                      onClick={() => setForm(f => ({ ...f, paidBy: m, _paidByOpen: false }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: form.paidBy === m ? '#E1F5EE' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: form.paidBy === m ? '#0F6E56' : '#1a1a18', marginBottom: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.slice(0,2).toUpperCase()}</div>
                      <span style={{ flex: 1, fontWeight: form.paidBy === m ? 600 : 400 }}>{m}</span>
                      {form.paidBy === m && <span style={{ fontSize: 16, color: '#1D9E75' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Split sheet */}
              {form._splitOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '8px 6px' }}>
                  <div style={{ fontSize: 11, color: '#a8a8a5', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', padding: '4px 8px 8px' }}>Split between</div>

                  {/* Everyone row */}
                  <button
                    onClick={() => setForm(f => ({
                      ...f,
                      splitMode: 'all',
                      splitWith: [...memberNames],
                    }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: form.splitMode === 'all' ? '#E1F5EE' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: form.splitMode === 'all' ? '#0F6E56' : '#1a1a18', marginBottom: 2 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: form.splitMode === 'all' ? '#1D9E75' : '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</div>
                    <span style={{ flex: 1, fontWeight: form.splitMode === 'all' ? 600 : 400 }}>Everyone equally</span>
                    <span style={{ fontSize: 12, color: '#a8a8a5', marginRight: 8 }}>÷{memberNames.length}</span>
                    <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${form.splitMode === 'all' ? '#1D9E75' : '#D3D1C7'}`, background: form.splitMode === 'all' ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
                      {form.splitMode === 'all' ? '✓' : ''}
                    </div>
                  </button>

                  <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '4px 0' }} />

                  {/* Individual members */}
                  {memberNames.map(m => {
                    const sel = form.splitWith.includes(m);
                    return (
                      <button key={m}
                        onClick={() => setForm(f => {
                          const already = f.splitWith.includes(m);
                          const newWith = already
                            ? f.splitWith.filter(n => n !== m)
                            : [...f.splitWith, m];
                          if (newWith.length === 0) return f;
                          // if all members selected, switch back to 'all' mode
                          const isAll = newWith.length === memberNames.length;
                          return { ...f, splitMode: isAll ? 'all' : 'select', splitWith: newWith };
                        })}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', background: sel ? '#E1F5EE' : 'transparent', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: sel ? '#0F6E56' : '#1a1a18', marginBottom: 2 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.slice(0,2).toUpperCase()}</div>
                        <span style={{ flex: 1, fontWeight: sel ? 600 : 400 }}>{m}</span>
                        {form.amount && parseFloat(form.amount) > 0 && sel && (
                          <span style={{ fontSize: 12, color: '#6b6b68', marginRight: 8 }}>
                            ₹{(parseFloat(form.amount) / form.splitWith.length).toFixed(0)}
                          </span>
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${sel ? '#1D9E75' : '#D3D1C7'}`, background: sel ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
                          {sel ? '✓' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Per person preview — shown when amount entered */}
              {form.amount && parseFloat(form.amount) > 0 && !form._paidByOpen && !form._splitOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(form.splitMode === 'all' ? memberNames : form.splitWith).map(m => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '0.5px solid #9FE1CB', borderRadius: 20, padding: '4px 10px 4px 5px', fontSize: 12 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>{m.slice(0,2).toUpperCase()}</div>
                      <span style={{ color: '#444' }}>{m}</span>
                      <span style={{ color: '#0F6E56', fontWeight: 700 }}>₹{(parseFloat(form.amount) / (form.splitMode === 'all' ? memberNames.length : form.splitWith.length)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1D9E75)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 90, opacity: 0.07 }}>₹</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: budget ? 14 : 0 }}>
          {[
            { label: 'Total spent', value: `₹${Math.round(total).toLocaleString('en-IN')}`, sub: `${expenses.length} expenses` },
            { label: 'Per person',  value: `₹${Math.round(perPerson).toLocaleString('en-IN')}`, sub: 'equal share' },
            { label: 'Days left',   value: daysLeft, sub: `of ${days} nights` },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: i === 1 ? 'center' : i === 2 ? 'right' : 'left' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        
        {!budget && (
          <button onClick={() => setShowBudgetEdit(true)}
            style={{ ...S.btn, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.2)', fontSize: 12, marginTop: 8 }}>
            + Set a budget
          </button>
        )}
      </div>

      {showBudgetEdit && (
        <div style={{ ...S.card, border: '0.5px solid #9FE1CB', background: '#f9fffe', marginBottom: '0.75rem' }}>
          <label style={S.label}>Total trip budget ₹</label>
          <input style={S.input} type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="e.g. 50000" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btn, ...S.btnP, flex: 1, justifyContent: 'center', padding: '9px' }}
              onClick={async () => {
                const v = parseFloat(budgetInput);
                if (!isNaN(v) && v > 0) {
                  setLocalBudget(v);
                  try { const { updateTrip } = await import('./api'); await updateTrip(trip.id, { budget: v }); } catch (_) {}
                }
                setShowBudgetEdit(false);
              }}>✓ Save</button>
            {budget && (
              <button style={{ ...S.btn, color: '#993C1D', borderColor: '#F5C4B3' }}
                onClick={async () => {
                  setLocalBudget(null);
                  try { const { updateTrip } = await import('./api'); await updateTrip(trip.id, { budget: null }); } catch (_) {}
                  setShowBudgetEdit(false);
                }}>Remove</button>
            )}
            <button style={S.btn} onClick={() => setShowBudgetEdit(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Member pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {memberNames.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 20, padding: '4px 12px 4px 5px', fontSize: 13 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{m.slice(0, 2).toUpperCase()}</div>
            {m}
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 13, padding: 3, marginBottom: '1rem' }}>
        {SECTION_TABS.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            style={{ flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: section === t.id ? 600 : 400, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: section === t.id ? '#1D9E75' : 'transparent', color: section === t.id ? '#fff' : '#6b6b68', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ EXPENSES TAB ══ */}
      {section === 'expenses' && (
        <div style={{ paddingBottom: '5rem' }}>
          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {[{ id: 'all', label: 'All', icon: '' }, ...CATS.filter(c => catTotals[c.id] > 0)].map(c => (
              <button key={c.id} onClick={() => setFilterCat(c.id)}
                style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: filterCat === c.id ? (c.id === 'all' ? '#1D9E75' : CATS.find(x => x.id === c.id)?.bg || '#E1F5EE') : '#fff', color: filterCat === c.id ? (c.id === 'all' ? '#fff' : CAT_COLORS[c.id] || '#1D9E75') : '#6b6b68', border: `0.5px solid ${filterCat === c.id ? (c.id === 'all' ? '#1D9E75' : (CAT_COLORS[c.id] || '#1D9E75') + '44') : 'rgba(0,0,0,0.12)'}` }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {sortedExpenses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b6b68' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🧾</div>
              <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No expenses yet</p>
              <p style={{ fontSize: 13 }}>Tap + to add your first one</p>
            </div>
          )}

          {sortedExpenses.map(exp => {
            const cat = CATS.find(c => c.id === exp.cat) || CATS[5];
            const splitArr = Array.isArray(exp.split) && exp.split.length > 0 ? exp.split : memberNames;
            return (
              <div key={exp.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, borderLeft: `3px solid ${CAT_COLORS[exp.cat] || '#ccc'}`, borderRadius: '0 14px 14px 0', padding: '12px 14px 12px 12px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, flexShrink: 0, fontSize: 20 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{exp.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: mcolor(exp.paidBy), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 700 }}>{exp.paidBy.slice(0, 2).toUpperCase()}</div>
                      <span style={{ fontSize: 12, color: '#6b6b68' }}>{exp.paidBy}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#D3D1C7' }}>·</span>
                    <div style={{ display: 'flex' }}>
                      {splitArr.slice(0, 4).map((m, i) => (
                        <div key={m} style={{ width: 16, height: 16, borderRadius: '50%', background: mcolor(m), border: '1.5px solid #fff', marginLeft: i > 0 ? -5 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>{m.slice(0, 1).toUpperCase()}</div>
                      ))}
                      {splitArr.length > 4 && <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#D3D1C7', border: '1.5px solid #fff', marginLeft: -5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#6b6b68', fontWeight: 700 }}>+{splitArr.length - 4}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: '#D3D1C7' }}>·</span>
                    <span style={{ fontSize: 11, color: '#a8a8a5' }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700 }}>₹{Math.round(exp.amount).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 2 }}>₹{Math.round(exp.amount / splitArr.length).toLocaleString('en-IN')} each</div>
                  <button onClick={() => handleDelete(exp.id)} style={{ ...S.btn, padding: '2px 6px', fontSize: 11, color: '#ccc', border: 'none', background: 'transparent', marginTop: 2 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ SHARES TAB ══ */}
      {section === 'shares' && (
        <div>
          <div style={{ ...S.card, background: 'linear-gradient(135deg,#E1F5EE,#E6F1FB)', border: '0.5px solid #9FE1CB', marginBottom: '1rem' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: '#085041' }}>₹{Math.round(total).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 3 }}>{memberNames.length} members · {expenses.length} expenses · {days} days</div>
          </div>
          <div style={{ ...S.card, marginBottom: '0.75rem' }}>
            {memberNames.map((m, i) => {
              const paid = expenses.filter(e => e.paidBy === m).reduce((s, e) => s + e.amount, 0);
              const owes = expenses.reduce((s, e) => {
                const sp = Array.isArray(e.split) && e.split.length > 0 ? e.split : memberNames;
                return sp.includes(m) ? s + e.amount / sp.length : s;
              }, 0);
              const net = paid - owes;
              return (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < memberNames.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{m.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m}</div>
                    <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 1 }}>paid ₹{Math.round(paid).toLocaleString('en-IN')} · share ₹{Math.round(owes).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: net >= 0 ? '#0F6E56' : '#993C1D' }}>{net >= 0 ? '+' : '−'}₹{Math.abs(Math.round(net)).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 1 }}>{net > 0.5 ? 'gets back' : net < -0.5 ? 'owes' : 'settled'}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Who pays whom</div>
          {settlements.length === 0
            ? <div style={{ background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 12, padding: '1rem 1.25rem', fontSize: 14, color: '#085041', fontWeight: 500 }}>✅ Everyone is squared up!</div>
            : settlements.map((s, i) => (
              <div key={i} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(s.from), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.from.slice(0, 2).toUpperCase()}</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.from}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ height: 1, flex: 1, background: 'rgba(0,0,0,0.09)' }} />
                  <span style={{ fontSize: 11, color: '#D85A30', padding: '2px 6px', background: '#FAECE7', borderRadius: 8, fontWeight: 600 }}>→</span>
                  <div style={{ height: 1, flex: 1, background: 'rgba(0,0,0,0.09)' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.to}</span>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(s.to), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.to.slice(0, 2).toUpperCase()}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0F6E56', marginLeft: 6 }}>₹{Math.round(s.amt).toLocaleString('en-IN')}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ BALANCES TAB ══ */}
      {section === 'balances' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {memberNames.map(m => {
            const b = balances[m];
            const isPos = b >= 0.5, isNeg = b < -0.5;
            return (
              <div key={m} style={{ ...S.card, borderTop: `3px solid ${isPos ? '#1D9E75' : isNeg ? '#D85A30' : '#D3D1C7'}`, borderRadius: '0 0 14px 14px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{m.slice(0, 2).toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</div>
                </div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: isPos ? '#0F6E56' : isNeg ? '#993C1D' : '#6b6b68' }}>
                  {isPos ? '+' : ''}₹{Math.abs(Math.round(b)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPos ? '#1D9E75' : isNeg ? '#D85A30' : '#D3D1C7', display: 'inline-block', marginRight: 4 }} />
                  {isPos ? 'gets back' : isNeg ? 'owes' : 'all settled'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ INSIGHTS TAB ══ */}
      {section === 'insights' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Avg/day', value: `₹${Math.round(tsr).toLocaleString('en-IN')}`, sub: 'burn rate' },
              { label: 'Projected', value: `₹${projected.toLocaleString('en-IN')}`, sub: 'at current rate', warn: budget && projected > budget },
              { label: 'Days left', value: daysLeft, sub: `${daysElapsed}d elapsed` },
            ].map(s => (
              <div key={s.label} style={{ background: s.warn ? '#FAECE7' : '#f7f6f2', borderRadius: 12, padding: '10px 12px', border: s.warn ? '0.5px solid #F5C4B3' : 'none' }}>
                <div style={{ fontSize: 11, color: s.warn ? '#993C1D' : '#6b6b68', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: s.warn ? '#993C1D' : '#1a1a18' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.warn ? '#D85A30' : '#a8a8a5', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: budget ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
            {budget && (
              <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.25rem 1rem' }}>
                <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Budget health</div>
                <div style={{ position: 'relative', width: 130, height: 130 }}>
                  <canvas ref={donutRef} role="img" aria-label={`${budgetPct}% of budget spent`}>{budgetPct}% used.</canvas>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11, color: '#6b6b68' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: budgetPct > 85 ? '#D85A30' : '#1D9E75', display: 'inline-block' }} />Spent</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#E1F5EE', border: '0.5px solid #9FE1CB', display: 'inline-block' }} />Left</span>
                </div>
              </div>
            )}
            <div style={{ ...S.card }}>
              <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>TSR projection</div>
              <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 4 }}>Daily burn rate</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 10 }}>₹{Math.round(tsr).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 4 }}>Trip-end projection</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: budget && projected > budget ? '#993C1D' : '#1a1a18', marginBottom: 10 }}>₹{projected.toLocaleString('en-IN')}</div>
              {budget && (
                <div style={{ padding: '8px 10px', background: projected > budget ? '#FAECE7' : '#E1F5EE', borderRadius: 8, fontSize: 11, color: projected > budget ? '#993C1D' : '#0F6E56', lineHeight: 1.4 }}>
                  {projected > budget ? `⚠️ Over by ₹${(projected - budget).toLocaleString('en-IN')}` : `✅ ₹${(budget - projected).toLocaleString('en-IN')} under budget`}
                </div>
              )}
              {!budget && <div style={{ fontSize: 12, color: '#a8a8a5', fontStyle: 'italic' }}>No trip budget set</div>}
            </div>
          </div>
          {top3.length > 0 && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Top expenses</div>
              {top3.map((exp, idx) => {
                const cat = CATS.find(c => c.id === exp.cat) || CATS[5];
                const pct = total > 0 ? Math.round(exp.amount / total * 100) : 0;
                return (
                  <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: idx < top3.length - 1 ? '0 0 10px' : '0', borderBottom: idx < top3.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', marginBottom: idx < top3.length - 1 ? 10 : 0 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{['🥇','🥈','🥉'][idx]}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cat.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.desc}</div>
                      <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2 }}>{exp.paidBy} · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 5 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[exp.cat] || '#1D9E75', borderRadius: 4, transition: 'width .5s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700 }}>₹{Math.round(exp.amount).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: 11, color: '#a8a8a5' }}>{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Who's carrying the trip</div>
            {[...memberNames].sort((a, b) => (payTotal[b] || 0) - (payTotal[a] || 0)).map((m, i) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < memberNames.length - 1 ? 10 : 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{m.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{m}</span>
                    <span style={{ color: '#6b6b68' }}>₹{Math.round(payTotal[m] || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((payTotal[m] || 0) / maxPay * 100)}%`, background: mcolor(m), borderRadius: 4, transition: 'width .5s' }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, flexShrink: 0, background: balances[m] >= 0.5 ? '#E1F5EE' : balances[m] <= -0.5 ? '#FAECE7' : '#F1EFE8', color: balances[m] >= 0.5 ? '#0F6E56' : balances[m] <= -0.5 ? '#993C1D' : '#6b6b68' }}>
                  {balances[m] >= 0.5 ? '+' : ''}₹{Math.abs(Math.round(balances[m])).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
          {Object.values(catTotals).some(v => v > 0) && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Category breakdown</div>
              <div style={{ position: 'relative', height: 160 }}>
                <canvas ref={barRef} role="img" aria-label="Spending by category">Category breakdown chart.</canvas>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {memberNames.length > 0 && (() => {
              const topPayer = memberNames.reduce((a, b) => (payTotal[a] || 0) > (payTotal[b] || 0) ? a : b);
              const topCat = CATS.filter(c => catTotals[c.id] > 0).sort((a, b) => catTotals[b.id] - catTotals[a.id])[0];
              return (
                <>
                  <div style={{ ...S.card }}>
                    <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 8 }}>Most generous</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: mcolor(topPayer), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{topPayer.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{topPayer}</div>
                        <div style={{ fontSize: 11, color: '#a8a8a5' }}>₹{Math.round(payTotal[topPayer] || 0).toLocaleString('en-IN')} paid</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ ...S.card }}>
                    <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 8 }}>Top category</div>
                    {topCat ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: topCat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{topCat.icon}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{topCat.label}</div>
                          <div style={{ fontSize: 11, color: '#a8a8a5' }}>₹{Math.round(catTotals[topCat.id]).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    ) : <div style={{ fontSize: 14, color: '#a8a8a5' }}>—</div>}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Floating Add button — only on expenses tab ── */}
      {section === 'expenses' && (
        <button
          onClick={() => setShowForm(true)}
          style={{ position: 'fixed', bottom: 24, right: 20, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', border: 'none', boxShadow: '0 4px 20px rgba(15,110,86,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 300, transition: 'transform .15s', fontWeight: 300 }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          +
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PHOTOS PAGE
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   PHOTOS PAGE — Redesigned
   - Each member has their own folder
   - You can only upload as yourself (myNickname)
   - Others see your folder; you see theirs
   - Glassmorphic dark-film aesthetic
═══════════════════════════════════════════════════════ */

function PhotosPage({ trip, myNickname }) {
  const memberNames = normalizeMembers(trip.members);
  const me = myNickname || memberNames[0] || 'Me';

  const initialPhotos = trip.photos || [];
  const [allPhotos, setAllPhotos] = useState(initialPhotos);
  const [activeFolder, setActiveFolder] = useState(me);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // ── NEW: confirm dialog state ──
  const [confirmDelete, setConfirmDelete] = useState(null); // null | 'single' | 'bulk'
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState(null); // single photo

  const byMember = useMemo(() => {
    const map = {};
    memberNames.forEach(m => { map[m] = []; });
    allPhotos.forEach(p => {
      if (map[p.uploader]) map[p.uploader].push(p);
      else map[p.uploader] = [p];
    });
    return map;
  }, [allPhotos, memberNames]);

  const folderPhotos = byMember[activeFolder] || [];
  const isMyFolder = activeFolder === me;

  /* ── upload ── */
  const processFiles = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${trip.id}/${me}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from('trip-photos')
        .upload(fileName, file);

      if (error) { console.error('Upload error:', error.message); continue; }

      const { data: { publicUrl } } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(fileName);

      try {
        const res = await addPhoto(trip.id, publicUrl);
        setAllPhotos(p => [...p, res.photo || { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
      } catch {
        setAllPhotos(p => [...p, { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setUploading(false);
    setUploadProgress(0);
    setActiveFolder(me);
  };

  const handleUpload = (e) => processFiles(Array.from(e.target.files));
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) processFiles(files);
  };

  /* ── delete (single) ── */
  const doDeleteSingle = async (photo) => {
    const fileName = `${trip.id}/${me}/${photo.url.split('/').pop()}`;
    await supabase.storage.from('trip-photos').remove([fileName]);
    
    await deletePhoto(trip.id, photo.id); // ← replaces the silent try/catch fetch

    setAllPhotos(p => p.filter(x => x.id !== photo.id));
    setSelected(s => { const n = new Set(s); n.delete(photo.id); return n; });
    setPendingDeletePhoto(null);
    setConfirmDelete(null);
  };

  /* ── delete (bulk) ── */
  const doDeleteBulk = async () => {
    const toDelete = folderPhotos.filter(p => selected.has(p.id));
    for (const photo of toDelete) {
      const fileName = `${trip.id}/${me}/${photo.url.split('/').pop()}`;
      await supabase.storage.from('trip-photos').remove([fileName]);
      await deletePhoto(trip.id, photo.id); // ← same fix
    }
    const deletedIds = new Set(toDelete.map(p => p.id));
    setAllPhotos(p => p.filter(x => !deletedIds.has(x.id)));
    setSelected(new Set());
    setConfirmDelete(null);
  };

  /* ── confirm delete flow ── */
  const askDeleteSingle = (photo, e) => {
    e.stopPropagation();
    setPendingDeletePhoto(photo);
    setConfirmDelete('single');
  };
  const askDeleteBulk = () => setConfirmDelete('bulk');

  const cancelDelete = () => {
    setConfirmDelete(null);
    setPendingDeletePhoto(null);
  };

  const confirmDeleteAction = () => {
    if (confirmDelete === 'single' && pendingDeletePhoto) doDeleteSingle(pendingDeletePhoto);
    else if (confirmDelete === 'bulk') doDeleteBulk();
  };

  /* ── selection ── */
  const toggle = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const clearSel = () => setSelected(new Set());

  /* ── download selected (fixed: fetch → blob → anchor) ── */
  const downloadSelected = async () => {
    const photos = folderPhotos.filter(p => selected.has(p.id));
    for (const p of photos) {
      try {
        const res = await fetch(p.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = p.url.split('/').pop() || `photo-${p.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        // Fallback: open in new tab if CORS blocks the fetch
        window.open(p.url, '_blank');
      }
    }
  };

  /* ── lightbox ── */
  const openLightbox = (idx) => setLightbox({ photos: folderPhotos, index: idx });
  const lbPrev = () => setLightbox(l => ({ ...l, index: Math.max(0, l.index - 1) }));
  const lbNext = () => setLightbox(l => ({ ...l, index: Math.min(l.photos.length - 1, l.index + 1) }));

  useEffect(() => {
    const onKey = (e) => {
      if (confirmDelete) {
        if (e.key === 'Escape') cancelDelete();
        if (e.key === 'Enter') confirmDeleteAction();
        return;
      }
      if (!lightbox) return;
      if (e.key === 'ArrowLeft') lbPrev();
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, confirmDelete, pendingDeletePhoto]);

  const initials = (name) => name.slice(0, 2).toUpperCase();

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

    .pr { font-family:'DM Sans',sans-serif; background:#0c0c0f; color:#e2e0da; display:block; padding-bottom:7rem; min-height:100vh; }

    /* ── folders bar ── */
    .fb { display:flex; gap:12px; overflow-x:auto; padding:1.25rem 1.25rem 1rem; scrollbar-width:none; }
    .fb::-webkit-scrollbar { display:none; }

    .ft { display:flex; flex-direction:column; align-items:center; gap:7px; cursor:pointer; flex-shrink:0; }

    .fi {
      width:62px; height:54px; border-radius:14px; position:relative;
      display:flex; align-items:center; justify-content:center;
      font-size:15px; font-weight:700; letter-spacing:.5px;
      background:#1c1c20; border:1.5px solid rgba(255,255,255,0.06);
      transition:all .2s; color:#9e9c96;
    }
    .ft:hover .fi { border-color:rgba(255,255,255,0.14); transform:translateY(-2px); }
    .ft.active .fi {
      background:linear-gradient(135deg,#1D9E75,#0f6e56);
      border-color:rgba(29,158,117,0.5);
      color:#fff;
      box-shadow:0 6px 24px rgba(29,158,117,0.3);
      transform:translateY(-2px);
    }
    .ft.mine .fi { background:linear-gradient(135deg,#1e1e23,#161619); }
    .ft.mine.active .fi { background:linear-gradient(135deg,#1D9E75,#0f6e56); }

    .fc {
      position:absolute; top:-6px; right:-6px;
      background:#1D9E75; color:#fff; font-size:9px; font-weight:700;
      min-width:18px; height:18px; border-radius:9px;
      display:flex; align-items:center; justify-content:center;
      padding:0 4px; border:2px solid #0c0c0f;
    }

    .fl { font-size:10px; font-weight:500; color:#6e6c66; max-width:66px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color .2s; letter-spacing:.2px; }
    .ft.active .fl { color:#c8c6c0; }

    /* ── divider ── */
    .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent); margin:0 1.25rem; }

    /* ── section header ── */
    .sh { display:flex; align-items:baseline; gap:10px; padding:1.25rem 1.25rem 1rem; }
    .st { font-family:'DM Serif Display',serif; font-size:24px; color:#e2e0da; margin:0; line-height:1; }
    .st em { font-style:italic; color:#1D9E75; }
    .ss { font-size:11px; color:#4a4845; letter-spacing:.3px; }

    /* ── privacy notice ── */
    .pn {
      display:flex; align-items:center; gap:10px;
      margin:0 1.25rem 1rem; padding:10px 14px;
      background:linear-gradient(135deg,rgba(29,158,117,0.08),rgba(29,158,117,0.03));
      border:1px solid rgba(29,158,117,0.18);
      border-radius:12px;
      font-size:11.5px; color:#9ec9b9; letter-spacing:.2px; line-height:1.45;
    }
    .pn-ic { font-size:15px; flex-shrink:0; }
    .pn strong { color:#1D9E75; font-weight:600; }

    /* ── upload zone ── */
    .uz {
      margin:0 1.25rem 1.25rem;
      border-radius:18px; padding:2rem 1.5rem;
      text-align:center; cursor:pointer;
      position:relative; z-index:1; display:block; width:auto;
      overflow:hidden; transition:all .3s;
      background:#141418;
      border:1.5px dashed rgba(255,255,255,0.1);
    }
    .uz:hover { border-color:rgba(29,158,117,0.5); background:#161a18; }
    .uz.drag { border-color:#1D9E75; background:#0f1a16; box-shadow:0 0 40px rgba(29,158,117,0.1); }

    .ui { font-size:40px; margin-bottom:12px; display:block; animation:bob 3s ease-in-out infinite; }
    @keyframes bob { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-6px) rotate(3deg)} }

    .ut { font-size:14px; font-weight:500; color:#b8b6b0; margin:0 0 5px; }
    .usub { font-size:12px; color:#4a4845; margin:0; }

    .ubadge {
      display:inline-flex; align-items:center; gap:6px;
      background:rgba(29,158,117,0.1); border:1px solid rgba(29,158,117,0.2);
      color:#1D9E75; font-size:11px; font-weight:600;
      padding:4px 12px; border-radius:99px; margin-top:12px; letter-spacing:.2px;
    }

    /* uploading overlay */
    .upl-overlay {
      position:absolute; inset:0; background:rgba(12,12,15,0.75);
      backdrop-filter:blur(4px); border-radius:16px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
      z-index:10;
    }
    .upl-spin {
      width:32px; height:32px; border:3px solid rgba(29,158,117,0.2);
      border-top-color:#1D9E75; border-radius:50%;
      animation:spin .7s linear infinite;
    }
    @keyframes spin { to{transform:rotate(360deg)} }
    .upl-text { font-size:12px; color:#1D9E75; font-weight:600; }

    /* ── view banner ── */
    .vb {
      margin:0 1.25rem 1.25rem;
      background:#141418; border:1px solid rgba(255,255,255,0.05);
      border-radius:16px; padding:.9rem 1.25rem;
      display:flex; align-items:center; gap:12px;
    }
    .vba {
      width:38px; height:38px; border-radius:50%;
      background:linear-gradient(135deg,#252529,#1a1a1e);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:#9e9c96;
      border:1.5px solid rgba(255,255,255,0.07); flex-shrink:0;
    }
    .vbt { font-size:13px; color:#6e6c66; line-height:1.5; }
    .vbt strong { color:#c8c6c0; }

    /* ── photo grid ── */
    .pg {
      display:grid; clear:both;
      grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
      gap:4px; padding:0 1.25rem;
    }

    .pc {
      position:relative; border-radius:10px; overflow:hidden;
      aspect-ratio:1; cursor:pointer;
      transition:transform .2s, box-shadow .2s;
      border:2px solid transparent;
      background:#1c1c20;
    }
    .pc:hover { transform:scale(1.02); box-shadow:0 10px 30px rgba(0,0,0,0.6); }
    .pc.sel { border-color:#1D9E75; box-shadow:0 0 0 2px rgba(29,158,117,0.3); }

    .pc img { width:100%; height:100%; object-fit:cover; display:block; transition:filter .2s; }
    .pc:hover img { filter:brightness(.8); }

    /* checkmark */
    .pck {
      position:absolute; top:7px; right:7px;
      width:22px; height:22px; border-radius:50%;
      background:rgba(0,0,0,0.55); border:2px solid rgba(255,255,255,0.4);
      display:flex; align-items:center; justify-content:center;
      font-size:11px; color:#fff; transition:all .15s; z-index:3;
      backdrop-filter:blur(4px);
    }
    .pc.sel .pck { background:#1D9E75; border-color:#1D9E75; }

    /* expand — hover only */
    .pex {
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .2s;
      pointer-events:none; z-index:2;
    }
    .pc:hover .pex { opacity:1; pointer-events:all; }
    .pexi {
      background:rgba(0,0,0,0.6); backdrop-filter:blur(6px);
      border-radius:50%; width:36px; height:36px;
      display:flex; align-items:center; justify-content:center;
      font-size:16px; border:1px solid rgba(255,255,255,0.15);
      transition:transform .15s;
    }
    .pexi:hover { transform:scale(1.1); }

    /* delete btn — my folder hover only */
    .pdel {
      position:absolute; top:7px; left:7px;
      width:26px; height:26px; border-radius:50%;
      background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.1);
      color:#fff; font-size:12px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .15s, background .15s;
      z-index:3; backdrop-filter:blur(4px);
    }
    .pc:hover .pdel { opacity:1; }
    .pdel:hover { background:rgba(153,60,29,0.85) !important; }

    /* ── empty state ── */
    .es { text-align:center; padding:4rem 1.25rem; color:#4a4845; }
    .ei { font-size:56px; margin-bottom:16px; display:block; opacity:.5; }
    .etit { font-size:16px; font-weight:500; color:#6e6c66; margin:0 0 6px; }
    .esub { font-size:13px; margin:0; }

    /* ── action bar ── */
    .ab {
      position:fixed; bottom:0; left:50%;
      transform:translateX(-50%);
      width:100%; max-width:880px;
      background:rgba(12,12,15,0.96);
      backdrop-filter:blur(24px);
      border-top:1px solid rgba(255,255,255,0.07);
      padding:14px 1.25rem;
      display:flex; align-items:center; gap:10px;
      z-index:190;
      animation:slideUp .2s ease-out;
    }
    @keyframes slideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }

    .al { flex:1; font-size:13px; color:#6e6c66; }
    .al strong { color:#e2e0da; font-size:15px; }

    .bgh {
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      color:#9e9c96; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:500;
      padding:9px 16px; border-radius:10px; cursor:pointer; transition:all .15s;
    }
    .bgh:hover { background:rgba(255,255,255,0.1); color:#e2e0da; }

    .bpr {
      background:linear-gradient(135deg,#1D9E75,#0f6e56); border:none;
      color:#fff; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:9px 18px; border-radius:10px; cursor:pointer;
      transition:all .15s; box-shadow:0 4px 16px rgba(29,158,117,0.35);
      display:flex; align-items:center; gap:7px;
    }
    .bpr:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(29,158,117,0.45); }

    /* NEW: red delete button in action bar */
    .bdel {
      background:rgba(220,60,40,0.12); border:1px solid rgba(220,60,40,0.3);
      color:#e8604a; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:9px 18px; border-radius:10px; cursor:pointer;
      transition:all .15s;
      display:flex; align-items:center; gap:7px;
    }
    .bdel:hover { background:rgba(220,60,40,0.22); border-color:rgba(220,60,40,0.5); transform:translateY(-1px); }

    .dl-count {
      background:rgba(255,255,255,0.2); border-radius:99px;
      padding:1px 7px; font-size:12px; font-weight:700;
    }
    .del-count {
      background:rgba(220,60,40,0.25); border-radius:99px;
      padding:1px 7px; font-size:12px; font-weight:700; color:#e8604a;
    }

    /* ── confirm dialog overlay ── */
    .conf-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.7);
      backdrop-filter:blur(8px); z-index:700;
      display:flex; align-items:center; justify-content:center;
      padding:1.25rem;
      animation:fadeIn .15s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }

    .conf-box {
      background:#18181c; border:1px solid rgba(255,255,255,0.1);
      border-radius:20px; padding:1.75rem 1.5rem 1.5rem;
      width:100%; max-width:340px;
      box-shadow:0 32px 80px rgba(0,0,0,0.8);
      animation:popIn .18s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes popIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }

    .conf-icon { font-size:36px; display:block; text-align:center; margin-bottom:14px; }

    .conf-title {
      font-family:'DM Serif Display',serif; font-size:20px;
      color:#e2e0da; text-align:center; margin:0 0 8px;
    }
    .conf-sub {
      font-size:13px; color:#6e6c66; text-align:center;
      margin:0 0 1.5rem; line-height:1.55;
    }
    .conf-sub strong { color:#c8c6c0; }

    .conf-actions { display:flex; gap:10px; }
    .conf-cancel {
      flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      color:#9e9c96; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:500;
      padding:11px; border-radius:12px; cursor:pointer; transition:all .15s;
    }
    .conf-cancel:hover { background:rgba(255,255,255,0.1); color:#e2e0da; }

    .conf-confirm {
      flex:1; background:linear-gradient(135deg,#c0392b,#922b21); border:none;
      color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:11px; border-radius:12px; cursor:pointer;
      transition:all .15s; box-shadow:0 4px 16px rgba(192,57,43,0.4);
    }
    .conf-confirm:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(192,57,43,0.55); }

    /* ── lightbox ── */
    .lbo {
      position:fixed; inset:0; background:rgba(0,0,0,0.96);
      z-index:600; display:flex; align-items:center;
      justify-content:center; flex-direction:column;
      animation:fadeIn .18s ease;
    }

    .lbi {
      max-width:92vw; max-height:78vh; object-fit:contain;
      border-radius:10px; box-shadow:0 30px 100px rgba(0,0,0,0.8);
    }
    .lbnav { display:flex; align-items:center; gap:20px; margin-top:20px; }
    .lbb {
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
      color:#e2e0da; width:42px; height:42px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:18px; transition:all .15s;
    }
    .lbb:hover { background:rgba(255,255,255,0.14); }
    .lbb:disabled { opacity:.2; cursor:default; }
    .lbc { font-size:12px; color:#4a4845; min-width:55px; text-align:center; letter-spacing:.5px; }
    .lbclose {
      position:absolute; top:16px; right:16px;
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
      color:#e2e0da; width:38px; height:38px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:16px; transition:all .15s;
    }
    .lbclose:hover { background:rgba(255,255,255,0.14); }
  `;

  return (
    <div className="pr">
      <style>{styles}</style>

      {/* ── Folder tabs ── */}
      <div className="fb">
        {memberNames.map(m => {
          const count = (byMember[m] || []).length;
          const isActive = activeFolder === m;
          const isMe = m === me;
          return (
            <div
              key={m}
              className={`ft ${isActive ? 'active' : ''} ${isMe ? 'mine' : ''}`}
              onClick={() => { setActiveFolder(m); setSelected(new Set()); }}
            >
              <div className="fi">
                {isMe ? '👤' : initials(m)}
                {count > 0 && <span className="fc">{count}</span>}
              </div>
              <span className="fl">{isMe ? 'Mine' : m}</span>
            </div>
          );
        })}
      </div>

      <div className="divider" />

      {/* ── Section header ── */}
      <div className="sh">
        <h2 className="st">
          {isMyFolder ? <>Your <em>shots</em></> : <><em>{activeFolder}</em>'s shots</>}
        </h2>
        <span className="ss">{folderPhotos.length} photo{folderPhotos.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Privacy reassurance ── */}
      <div className="pn">
        <span className="pn-ic">🔒</span>
        <span>
          Your photos are <strong>end-to-end encrypted</strong> and visible only to you and your trip mates — Upload freely.
        </span>
      </div>

      {/* ── Upload zone / View banner ── */}
      {isMyFolder ? (
        <label
          className={`uz ${dragging ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />

          {uploading && (
            <div className="upl-overlay">
              <div className="upl-spin" />
              <div className="upl-text">Uploading… {uploadProgress}%</div>
              <div style={{ width: '60%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#1D9E75', borderRadius: 4, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          <span className="ui">{dragging ? '🎯' : '📷'}</span>
          <p className="ut">{dragging ? 'Release to upload' : 'Drop photos or tap to pick'}</p>
          <p className="usub">JPG · PNG · HEIC · WebP</p>
          <div className="ubadge">
            <span>👤</span> {me}
          </div>
        </label>
      ) : (
        <div className="vb">
          <div className="vba">{initials(activeFolder)}</div>
          <div className="vbt">
            Viewing <strong>{activeFolder}'s</strong> collection — tap to select, then download.
          </div>
        </div>
      )}

      {/* ── Photo grid ── */}
      {folderPhotos.length === 0 ? (
        <div className="es">
          <span className="ei">{isMyFolder ? '🌄' : '🫙'}</span>
          <p className="etit">{isMyFolder ? 'Your roll is empty' : `${activeFolder} hasn't shared yet`}</p>
          <p className="esub">{isMyFolder ? 'Tap above to add your first memory' : 'Check back soon!'}</p>
        </div>
      ) : (
        <div className="pg">
          {folderPhotos.map((p, idx) => (
            <div
              key={p.id}
              className={`pc ${selected.has(p.id) ? 'sel' : ''}`}
              onClick={() => toggle(p.id)}
            >
              <img src={p.url} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />

              {/* Checkmark */}
              <div className="pck">{selected.has(p.id) ? '✓' : ''}</div>

              {/* Expand to fullscreen — hover only */}
              <div className="pex" onClick={(e) => { e.stopPropagation(); openLightbox(idx); }}>
                <div className="pexi">⛶</div>
              </div>

              {/* Single-photo delete — my folder only, hover only */}
              {isMyFolder && (
                <button
                  className="pdel"
                  onClick={(e) => askDeleteSingle(p, e)}
                  title="Delete photo"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Selection action bar — always rendered when selection > 0 ── */}
      {selected.size > 0 && (
        <div className="ab">
          <div className="al">
            <strong>{selected.size}</strong> selected
          </div>
          <button className="bgh" onClick={clearSel}>Clear</button>
          <button className="bpr" onClick={downloadSelected}>
            ⬇ Download
            <span className="dl-count">{selected.size}</span>
          </button>
          {/* Delete selected — only shown in own folder */}
          {isMyFolder && (
            <button className="bdel" onClick={askDeleteBulk}>
              🗑 Delete
              <span className="del-count">{selected.size}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <div className="conf-overlay" onClick={cancelDelete}>
          <div className="conf-box" onClick={e => e.stopPropagation()}>
            <span className="conf-icon">🗑️</span>
            <h3 className="conf-title">
              {confirmDelete === 'bulk'
                ? `Delete ${selected.size} photo${selected.size > 1 ? 's' : ''}?`
                : 'Delete this photo?'}
            </h3>
            <p className="conf-sub">
              {confirmDelete === 'bulk'
                ? <>This will permanently remove <strong>{selected.size} photo{selected.size > 1 ? 's' : ''}</strong> from your trip. This can't be undone.</>
                : <>This photo will be permanently removed from your trip. This can't be undone.</>
              }
            </p>
            <div className="conf-actions">
              <button className="conf-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="conf-confirm" onClick={confirmDeleteAction}>
                {confirmDelete === 'bulk' ? `Delete ${selected.size}` : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="lbo" onClick={() => setLightbox(null)}>
          <button className="lbclose" onClick={() => setLightbox(null)}>✕</button>
          <img
            className="lbi"
            src={lightbox.photos[lightbox.index]?.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lbnav" onClick={(e) => e.stopPropagation()}>
            <button className="lbb" onClick={lbPrev} disabled={lightbox.index === 0}>‹</button>
            <span className="lbc">{lightbox.index + 1} / {lightbox.photos.length}</span>
            <button className="lbb" onClick={lbNext} disabled={lightbox.index === lightbox.photos.length - 1}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}


function PlacePhoto({ query, style, delay = 0 }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => {
      import('./api').then(({ fetchPlacePhotos }) => {
        fetchPlacePhotos(query)
          .then(data => {
            const urls = data.urls || [];
            if (urls.length > 0) setUrl(urls[0]);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  if (loading) return (
    <div style={{ width: '100%', height: 140, borderRadius: 12, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, ...style }}>
      🌍
    </div>
  );

  if (!url) return null;

  return (
    <img
      src={url}
      alt={query}
      style={{ width: '100%', height: 140, borderRadius: 12, objectFit: 'cover', display: 'block', ...style }}
      onError={e => e.target.style.display = 'none'}
    />
  );
}


function PlacePhotosStrip({ queries, style }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    if (!queries?.length) return;
    import('./api').then(({ fetchPlacePhotos }) => {
      fetchPlacePhotos(queries.join(' '))
        .then(data => setUrls(data.urls || []))
        .catch(() => {});
    });
  }, [queries?.join(',')]);

  if (urls.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, ...style }}>
      {urls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          style={{ width: 140, height: 100, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
          onError={e => e.target.style.display = 'none'}
        />
      ))}
    </div>
  );
}




/* ═══════════════════════════════════════════════════════
   ITINERARY PAGE
═══════════════════════════════════════════════════════ */
const SLOT_LABELS = {
  night: '12AM–6AM',
  morning: '6AM–12PM',
  afternoon: '12PM–6PM',
  evening: '6PM–12AM',
};

const SLOT_ORDER = ['morning', 'afternoon', 'evening'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTripDate(arrivalStr, dayIndex) {
  // dayIndex: 0 = arrival day
  const base = new Date(arrivalStr);
  base.setDate(base.getDate() + dayIndex);
  return `${base.getDate()} ${MONTH_NAMES[base.getMonth()]}`;
}

function ItineraryPage({ trip, onCacheUpdate }) {
  const isSolo = trip.isSolo;
  const [iTab, setITab] = useState('planner');

  const [form] = useState({
    dest: trip.destination || '',
    arrival: trip.arrival ? new Date(trip.arrival).toISOString().split('T')[0] : '',
    departure: trip.departure ? new Date(trip.departure).toISOString().split('T')[0] : '',
    arrivalSlot: trip.arrivalSlot || 'morning',
    departureSlot: trip.departureSlot || 'morning',
    budget: trip.budget ? String(trip.budget) : '',
    people: String(normalizeMembers(trip.members).length || 1),
  });

  const days = form.arrival && form.departure
    ? Math.max(1, Math.round((new Date(form.departure) - new Date(form.arrival)) / 86400000))
    : 1;

  const [step, setStep] = useState(trip._cachedItin ? 'result' : 'loading');
  const [itin, setItin] = useState(trip._cachedItin?.itinerary || null);
  const [sources, setSources] = useState(trip._cachedItin?.sources || []);
  const [localTasteData, setLocalTasteData] = useState(trip._cachedTaste || null);
  const [localTasteStep, setLocalTasteStep] = useState(trip._cachedTaste ? 'result' : 'loading');
  const hasGenerated = useRef(false);
  const [customDesc, setCustomDesc] = useState('');
  const [showDescBox, setShowDescBox] = useState(false);

  const accentStyle = isSolo ? S.btnSolo : S.btnP;
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';
  const headerBg = isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)';

  const TYPE_ICONS = {
    attraction: '🏛️', food: '🍽️', experience: '✨',
    transport: '🚗', hotel: '🏨', shopping: '🛍️',
  };

  const firstActivitySlot = () => {
    const idx = SLOT_ORDER.indexOf(form.arrivalSlot);
    return SLOT_ORDER[Math.min(idx + 1, SLOT_ORDER.length - 1)];
  };

  useEffect(() => {
    // If we already have cached data from the trip prop, show it immediately
    if (trip._cachedItin) {
      setItin(trip._cachedItin.itinerary);
      setSources(trip._cachedItin.sources || []);
      setStep('result');
    }
    if (trip._cachedTaste) {
      setLocalTasteData(trip._cachedTaste);
      setLocalTasteStep('result');
    }

    // Only generate what's missing
    if (!hasGenerated.current) {
      hasGenerated.current = true;
      if (!trip._cachedItin) runGenerateItinerary();
      if (!trip._cachedTaste) runGenerateLocalTaste();
    }
  }, [trip._cachedItin, trip._cachedTaste]);

  const runGenerateItinerary = async (descOverride) => {
    setStep('loading');
    try {
      const { generateItinerary } = await import('./api');
      const result = await generateItinerary({
        destination: form.dest,
        days,
        budget: form.budget ? parseFloat(form.budget) : null,
        people: parseInt(form.people) || 1,
        interests: ['🛕 Temples', '🍽️ Food', '🛍️ Shopping'],
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        firstActivitySlot: firstActivitySlot(),
        arrival: form.arrival,
        customDescription: descOverride ?? customDesc,
      });
      setItin(result.itinerary);
      setSources(result.sources || []);
      setStep('result');
      // ── Save back to parent trips state so it persists across tab switches ──
      onCacheUpdate?.({ _cachedItin: result });
    } catch {
      setStep('error');
    }
  };

  const runGenerateLocalTaste = async () => {
    setLocalTasteStep('loading');
    try {
      const { generateLocalTaste } = await import('./api');
      const r = await generateLocalTaste({ destination: form.dest });
      setLocalTasteData(r);
      setLocalTasteStep('result');
      // ── Save back to parent ──
      onCacheUpdate?.({ _cachedTaste: r });
    } catch {
      setLocalTasteStep('error');
    }
  };

  const handleRedo = () => {
    onCacheUpdate?.({ _cachedItin: null });
    setShowDescBox(true);
  };

  const SlotBadge = ({ slot, label }) => (
    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#fff' }}>
      {label} {SLOT_LABELS[slot]}
    </div>
  );

  const ITABS = [{ id: 'planner', label: '🗺️ Day Planner' }, { id: 'taste', label: '🍜 Local Taste' }];

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 13, padding: 3, marginBottom: '1.1rem' }}>
        {ITABS.map(t => (
          <button key={t.id} onClick={() => setITab(t.id)}
            style={{ flex: 1, padding: '8px 8px', fontSize: 12, fontWeight: 500, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: iTab === t.id ? (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75') : 'transparent', color: iTab === t.id ? '#fff' : '#6b6b68', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {iTab === 'planner' && (
        <div>
        {/* Description / customize box */}
          <div style={{ marginBottom: '1rem' }}>
            {!showDescBox && step === 'result' && (
              <button
                style={{ ...S.btn, width: '100%', justifyContent: 'center', fontSize: 13, color: isSolo ? '#534AB7' : '#0F6E56', background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}` }}
                onClick={() => setShowDescBox(true)}>
                ✏️ Customize & regenerate itinerary
              </button>
            )}
            {(showDescBox || step === 'error' || (!trip._cachedItin && step !== 'loading')) && (
              <div style={{ ...S.card, border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, background: isSolo ? '#fdfcff' : '#f9fffe' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: isSolo ? '#534AB7' : '#0F6E56', marginBottom: 4 }}>
                  ✏️ Customize your itinerary
                </div>
                <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 10 }}>
                  Describe what you want — pace, priorities, special interests. Leave blank for a balanced itinerary.
                </div>
                <textarea
                  style={{ ...S.input, resize: 'none', minHeight: 80, lineHeight: 1.55, fontSize: 13 }}
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  placeholder={`e.g. "Focus on heritage sites and street food. Avoid malls. We prefer a relaxed morning pace."`}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), flex: 1, justifyContent: 'center', padding: '10px', fontSize: 13 }}
                    onClick={() => {
                      setShowDescBox(false);
                      onCacheUpdate?.({ _cachedItin: null });
                      runGenerateItinerary(customDesc);
                    }}>
                    🗺️ Generate itinerary
                  </button>
                  {step === 'result' && (
                    <button style={S.btn} onClick={() => setShowDescBox(false)}>✕</button>
                  )}
                </div>
              </div>
            )}
          </div>
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
              <div style={isSolo ? S.soloSpinner : S.spinner} />
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Building your itinerary…
              </div>
              <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.7 }}>
                🔍 Scanning TripAdvisor, Lonely Planet & travel blogs<br />
                📊 Ranking attractions by ratings & reviews<br />
                🗓️ Scheduling from your {SLOT_LABELS[firstActivitySlot()]} arrival slot
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Couldn't generate itinerary</div>
              <button style={{ ...S.btn, ...accentStyle, padding: '10px 24px' }} onClick={runGenerateItinerary}>Try Again</button>
            </div>
          )}

          {step === 'result' && itin && (
            <div style={{ paddingBottom: '2rem' }}>
              <div style={{ background: headerBg, borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.08 }}>✈️</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  {itin.headline || `${days}-Day ${form.dest} Itinerary`}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 12 }}>{itin.summary}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <SlotBadge slot={form.arrivalSlot} label="✈️ Arrives" />
                  <SlotBadge slot={form.departureSlot} label="🛫 Departs" />
                  {itin.totalEstimatedCost && (
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#fff' }}>
                      💰 {itin.totalEstimatedCost}
                    </div>
                  )}
                  
                </div>
              </div>

              {itin.quickTips?.length > 0 && (
                <div style={{ ...S.card, marginBottom: '1rem', background: '#FAEEDA', border: '0.5px solid #FAC775' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#854F0B', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>💡 Quick Tips</div>
                  {itin.quickTips.map((tip, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#5a3a0a', lineHeight: 1.5, marginBottom: i < itin.quickTips.length - 1 ? 5 : 0 }}>· {tip}</div>
                  ))}
                </div>
              )}

              <PlacePhotosStrip
                queries={[form.dest, `${form.dest} landmarks`, `${form.dest} travel`]}
                style={{ marginBottom: '1rem' }}
              />

              {(() => {
                let photoIndex = 0;
                return (itin.days || []).map((d, dayIndex) => {
                  const dateLabel = form.arrival ? formatTripDate(form.arrival, dayIndex) : `Day ${d.day}`;
                  const isArrivalDay = dayIndex === 0;
                  const isDepartureDay = dayIndex === (itin.days.length - 1);
                  return (
                    <div key={d.day} style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ background: headerBg, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, fontFamily: "'Sora',sans-serif", flexShrink: 0 }}>
                          {dateLabel}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{d.title}</div>
                          {d.theme && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{d.theme}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                          {isArrivalDay && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                              ✈️ Arrives {SLOT_LABELS[form.arrivalSlot]}
                            </span>
                          )}
                          {isDepartureDay && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                              🛫 Departs {SLOT_LABELS[form.departureSlot]}
                            </span>
                          )}
                          {d.weather && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                              {d.weather.high > 30 ? '☀️' : d.weather.high > 18 ? '⛅' : '🧊'} {d.weather.high}°/{d.weather.low}°
                            </div>
                          )}
                          {d.estimatedCost && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{d.estimatedCost}</div>}
                        </div>
                      </div>
                      {d.weather?.tip && (
                        <div style={{ padding: '6px 16px', background: isSolo ? '#f4f3ff' : '#f0faf6', borderBottom: `0.5px solid ${isSolo ? '#c9c5f5' : '#c8ecd8'}`, fontSize: 11, color: isSolo ? '#534AB7' : '#0F6E56' }}>
                          💡 {d.weather.tip}
                        </div>
                      )}
                      <div style={{ padding: '10px 16px' }}>
                        {(d.activities || []).map((a, i) => {
                          const showPhoto = a.type === 'attraction' || a.type === 'food' || a.type === 'experience' || a.type === 'shopping';
                          const currentDelay = showPhoto ? photoIndex++ * 600 : 0;
                          return (
                            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < d.activities.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.mustDo ? accentColor : '#D3D1C7', marginTop: 4, flexShrink: 0, border: a.mustDo ? `2px solid ${accentColor}33` : 'none', boxSizing: 'border-box' }} />
                                {i < d.activities.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(0,0,0,0.06)', marginTop: 3 }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontSize: 11, color: '#a8a8a5', width: 58, flexShrink: 0, paddingTop: 2 }}>{a.time}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 16 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{a.name}</span>
                                      {a.mustDo && (
                                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: isSolo ? '#EEEDFE' : '#E1F5EE', color: accentColor, textTransform: 'uppercase', letterSpacing: .3 }}>Must do</span>
                                      )}
                                    </div>
                                    {a.note && <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 3, lineHeight: 1.5 }}>{a.note}</div>}
                                    <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                                      {a.duration && <span style={{ fontSize: 11, color: '#a8a8a5' }}>⏱ {a.duration}</span>}
                                      {a.cost && <span style={{ fontSize: 11, color: '#a8a8a5' }}>💰 {a.cost}</span>}
                                      {a.rating && <span style={{ fontSize: 11, color: '#BA7517' }}>{a.rating}</span>}
                                    </div>
                                    {showPhoto && (
                                      <div style={{ marginTop: 10 }}>
                                        <PlacePhoto query={`${a.name} ${form.dest}`} style={{ height: 120 }} delay={currentDelay} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              {sources.length > 0 && (
                <div style={{ ...S.card, marginBottom: '1rem' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 10 }}>🔍 Researched from</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: isSolo ? '#534AB7' : '#0F6E56', background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 8, padding: '4px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        🔗 {s.title?.slice(0, 28) || new URL(s.url).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {iTab === 'taste' && (
        <LocalTastePage
          destination={form.dest}
          isSolo={isSolo}
          autoData={localTasteData}
          autoStep={localTasteStep}
          onRetry={runGenerateLocalTaste}
        />
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════
   TRIP AI CHATBOT
═══════════════════════════════════════════════════════ */
function TripChatbot({ trip, myNickname }) {
  const isSolo = trip?.isSolo;
  const memberNames = normalizeMembers(trip?.members || []);
  const expenses = trip?.expenses || [];
  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  const buildSystem = () => {
    const expLines = expenses.slice(0, 10).map(e =>
      `• ${e.desc}: ₹${e.amount} — paid by ${e.paidBy}, split ${Array.isArray(e.split) ? e.split.length : memberNames.length} ways`
    ).join('\n');
    if (isSolo) {
      return `You are a friendly solo travel AI inside TravelBae.\nTRIP: ${trip.groupName} | ${trip.destination} | ${new Date(trip.arrival).toDateString()} – ${new Date(trip.departure).toDateString()}\nBUDGET: ₹${trip.budget || 'not set'} | SPENT: ₹${Math.round(totalSpend)} | REMAINING: ₹${Math.round((trip.budget || 0) - totalSpend)}\nEXPENSES:\n${expLines || 'None yet.'}\nBe encouraging, friendly, practical. Give solo travel tips. Keep answers under 150 words.`;
    }
    return `You are a friendly AI inside TravelBae, a group travel app.\nTRIP: ${trip.groupName} | ${trip.destination} | ${new Date(trip.arrival).toDateString()} – ${new Date(trip.departure).toDateString()} | Members: ${memberNames.join(', ')}\nTOTAL SPENT: ₹${Math.round(totalSpend)}\nEXPENSES:\n${expLines || 'None yet.'}\nBe warm, concise, helpful. Use ₹. Keep answers under 150 words.`;
  };

  const SYSTEM = buildSystem();
  const SUGGESTIONS = isSolo
    ? ["Budget left?","What to do tomorrow?","Best street food?","Safety tips?"]
    : ["Who owes the most?","What to eat here?","Budget per person?","Trip summary?"];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, role: 'assistant', text: isSolo ? "Hey adventurer! 🎒 I'm your solo travel AI.\nAsk me about your budget, what to do next, or local tips!" : "Hey! I'm your TravelBae AI 🧳\nAsk me anything — expenses, who owes what, or local tips!" }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { if (endRef.current && open) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, open, loading]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    const newMsgs = [...messages, { id: Date.now(), role: 'user', text: q }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const history = newMsgs.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
      const reply = await callClaudeWithSystem(SYSTEM, history);
      setMessages(ms => [...ms, { id: Date.now() + 1, role: 'assistant', text: reply }]);
    } catch {
      setMessages(ms => [...ms, { id: Date.now() + 1, role: 'assistant', text: "Sorry, I hit an error. Try again!" }]);
    }
    setLoading(false);
  };

  const fabBg = isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)';
  const headerBg = isSolo ? 'linear-gradient(135deg,#26215C,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)';

  return (
    <>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <button onClick={() => setOpen(v => !v)} style={{ position: 'fixed', bottom: 22, right: 18, width: 56, height: 56, borderRadius: '50%', background: fabBg, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, zIndex: 300, transition: 'transform .2s', transform: open ? 'scale(0.88)' : 'scale(1)' }}>{open ? '✕' : isSolo ? '🎒' : '🤖'}</button>
      {open && (
        <div style={{ position: 'fixed', bottom: 92, right: 14, width: 345, maxWidth: 'calc(100vw - 28px)', background: '#fff', borderRadius: 20, boxShadow: '0 10px 48px rgba(0,0,0,0.18)', border: '0.5px solid rgba(0,0,0,0.09)', zIndex: 299, display: 'flex', flexDirection: 'column', maxHeight: '68vh', overflow: 'hidden', animation: 'fadeUp .2s ease-out' }}>
          <div style={{ background: headerBg, borderRadius: '20px 20px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{isSolo ? '🎒' : '🤖'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>{isSolo ? 'Solo Travel AI' : 'TravelBae AI'}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{trip.groupName} · {trip.destination}</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                {m.role === 'assistant' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSolo ? '#EEEDFE' : '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{isSolo ? '🎒' : '🤖'}</div>}
                <div style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: 16, fontSize: 13, lineHeight: 1.55, background: m.role === 'user' ? (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75') : '#f4f3f0', color: m.role === 'user' ? '#fff' : '#1a1a18', borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'user' ? 16 : 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSolo ? '#EEEDFE' : '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{isSolo ? '🎒' : '🤖'}</div>
                <div style={{ padding: '10px 14px', background: '#f4f3f0', borderRadius: 16, borderBottomLeftRadius: 4 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: isSolo ? '#AFA9EC' : '#9FE1CB', animation: `bounce .9s ease-in-out ${i * 0.22}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          {messages.length <= 2 && !loading && (
            <div style={{ padding: '4px 14px 8px', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ ...S.btn, fontSize: 11, padding: '4px 10px', borderRadius: 16, background: isSolo ? '#EEEDFE' : '#E1F5EE', color: isSolo ? '#534AB7' : '#085041', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}` }}>{s}</button>
              ))}
            </div>
          )}
          <div style={{ padding: '10px 14px 14px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input style={{ ...S.input, flex: 1, borderRadius: 22, padding: '9px 14px', fontSize: 13 }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && send()} placeholder={isSolo ? 'Ask your solo travel AI…' : 'Ask anything about the trip…'} />
            <button onClick={() => send()} disabled={!input.trim() || loading} style={{ ...S.btn, background: isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, padding: 0, justifyContent: 'center', flexShrink: 0, opacity: (!input.trim() || loading) ? 0.45 : 1 }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PROFILE — name, avatar & travel badges
═══════════════════════════════════════════════════════ */
const BADGE_DEFS = [
  { id: 'early_bird',     name: 'Early Bird',      emoji: '🌅', desc: 'Joined the TravelBae crew',           check: () => true },
  { id: 'first_flight',   name: 'First Flight',    emoji: '✈️', desc: 'Created your very first trip',         check: s => s.tripCount >= 1 },
  { id: 'group_leader',   name: 'Group Leader',    emoji: '👥', desc: 'Set off on a group adventure',         check: s => s.groupCount >= 1 },
  { id: 'solo_voyager',   name: 'Solo Voyager',    emoji: '🎒', desc: 'Embraced a solo journey',              check: s => s.soloCount >= 1 },
  { id: 'globe_trotter',  name: 'Globe Trotter',   emoji: '🌍', desc: 'Visited 3+ different destinations',    check: s => s.uniqueDests >= 3, progress: s => `${Math.min(s.uniqueDests, 3)}/3` },
  { id: 'budget_pro',     name: 'Budget Pro',      emoji: '💰', desc: 'Tracked expenses on 3+ trips',         check: s => s.tripsWithExpenses >= 3, progress: s => `${Math.min(s.tripsWithExpenses, 3)}/3` },
  { id: 'photographer',   name: 'Photographer',    emoji: '📸', desc: 'Uploaded 10+ trip photos',             check: s => s.photoCount >= 10, progress: s => `${Math.min(s.photoCount, 10)}/10` },
  { id: 'trail_blazer',   name: 'Trail Blazer',    emoji: '🔥', desc: 'Completed 5+ trips',                   check: s => s.completedCount >= 5, progress: s => `${Math.min(s.completedCount, 5)}/5` },
  { id: 'social_butterfly', name: 'Social Butterfly', emoji: '🦋', desc: 'Saved 5+ trip contacts',           check: s => s.contactCount >= 5, progress: s => `${Math.min(s.contactCount, 5)}/5` },
  { id: 'master_planner', name: 'Master Planner',  emoji: '🗺️', desc: 'Built itineraries for 3+ trips',       check: s => s.itineraryCount >= 3, progress: s => `${Math.min(s.itineraryCount, 3)}/3` },
  { id: 'globe_elite',    name: 'Globe Elite',     emoji: '🌟', desc: 'Visited 7+ destinations',              check: s => s.uniqueDests >= 7, progress: s => `${Math.min(s.uniqueDests, 7)}/7` },
  { id: 'shutterbug',     name: 'Shutterbug',      emoji: '🎞️', desc: 'Uploaded 50+ trip photos',             check: s => s.photoCount >= 50, progress: s => `${Math.min(s.photoCount, 50)}/50` },
];

function computeProfileStats(trips) {
  const ts = trips || [];
  const dests = new Set();
  let photoCount = 0, contactCount = 0, soloCount = 0, groupCount = 0;
  let completedCount = 0, tripsWithExpenses = 0, itineraryCount = 0;
  ts.forEach(t => {
    if (t.destination) dests.add(t.destination.trim().toLowerCase());
    photoCount   += (t.photos   || []).length;
    contactCount += (t.contacts || []).length;
    if (t.isSolo) soloCount++; else groupCount++;
    if (t.completed) completedCount++;
    if ((t.expenses || []).length > 0) tripsWithExpenses++;
    if (t._cachedItin) itineraryCount++;
  });
  return {
    tripCount: ts.length,
    uniqueDests: dests.size,
    photoCount, contactCount,
    soloCount, groupCount,
    completedCount, tripsWithExpenses, itineraryCount,
  };
}

function ProfilePage({ profile, onSave, onClose, onLogout, onDeleteAccount, trips }) {
  const [view, setView] = useState('hub'); // 'hub' | 'badges' | 'stats' | 'history' | 'notifications' | 'currency' | 'privacy' | 'help' | 'about'
  const [name, setName] = useState(profile.name || '');
  const [avatar, setAvatar] = useState(profile.avatar || null);
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const [rateModal, setRateModal] = useState(false);
  const [rateStars, setRateStars] = useState(() => {
    const saved = parseInt(localStorage.getItem('travelbae_rating') || '0', 10);
    return Number.isFinite(saved) ? saved : 0;
  });
  const [rateHover, setRateHover] = useState(0);
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem('travelbae_prefs');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      currency: 'INR',
      units: 'metric',
      notifications: true,
      notifTripReminders: true,
      notifGroupUpdates: true,
      notifTips: false,
    };
  });
  const fileRef = useRef(null);

  // Full currency list — code, symbol, name
  const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  ];

  // Migrate legacy currency strings like "₹ INR" → "INR"
  useEffect(() => {
    if (prefs.currency && prefs.currency.length > 4) {
      const match = CURRENCIES.find(c => prefs.currency.includes(c.code));
      if (match) setPrefs(p => ({ ...p, currency: match.code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currencyMeta = CURRENCIES.find(c => c.code === prefs.currency) || CURRENCIES[0];

  const stats = computeProfileStats(trips);
  const earned = BADGE_DEFS.filter(b => b.check(stats));
  const locked = BADGE_DEFS.filter(b => !b.check(stats));
  const earnedPct = Math.round((earned.length / BADGE_DEFS.length) * 100);

  const persist = (next) => {
    onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const savePrefs = (next) => {
    setPrefs(next);
    try { localStorage.setItem('travelbae_prefs', JSON.stringify(next)); } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 240;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        setAvatar(dataUrl);
        persist({ name, avatar: dataUrl });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveName = () => {
    const n = name.trim();
    if (!n) return;
    setEditingName(false);
    persist({ name: n, avatar });
  };

  const removeAvatar = () => {
    setAvatar(null);
    persist({ name, avatar: null });
  };

  const initials = (name || '?').trim().slice(0, 2).toUpperCase();

  // ── Derived stats for Travel Stats view ──
  const tripList = trips || [];
  const totalSpend = tripList.reduce((s, t) => s + (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0), 0);

  const destFreq = {};
  tripList.forEach(t => {
    if (t.destination) {
      const k = t.destination.trim();
      destFreq[k] = (destFreq[k] || 0) + 1;
    }
  });
  const topDests = Object.entries(destFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalTravelDays = tripList.reduce((sum, t) => {
    if (!t.arrival || !t.departure) return sum;
    try { return sum + tripDuration(t.arrival, t.departure); } catch { return sum; }
  }, 0);

  // Unique travel companions across all trips (excluding self)
  const selfKey = (name || '').trim().toLowerCase();
  const companionSet = new Set();
  tripList.forEach(t => {
    if (t.isSolo) return;
    (normalizeMembers(t.members) || []).forEach(m => {
      const key = (m || '').trim().toLowerCase();
      if (key && key !== selfKey) companionSet.add(key);
    });
  });
  const companionCount = companionSet.size;

  const fmtMoney = (n) => `${currencyMeta.symbol}${Math.round(n).toLocaleString('en-IN')}`;

  const handleShare = async () => {
    const shareData = {
      title: 'TravelBae',
      text: 'Plan trips, split expenses & explore together — try TravelBae with me!',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link copied to clipboard');
      } else {
        showToast(shareData.url);
      }
    } catch { /* user cancelled */ }
  };

  const handleRate = () => {
    setRateHover(0);
    setRateModal(true);
  };

  const submitRating = (stars) => {
    if (!stars) return;
    setRateStars(stars);
    localStorage.setItem('travelbae_rating', String(stars));
    setRateModal(false);
    const msgs = {
      1: 'Thanks — we’ll do better. 💚',
      2: 'Got it. We’ll keep improving. 💚',
      3: 'Thanks for the feedback! 💚',
      4: 'Glad you’re enjoying it! 💚',
      5: 'You just made our day! 💚',
    };
    showToast(msgs[stars] || 'Thanks for rating! 💚');
  };

  const handleFeedback = () => {
    window.location.href = 'mailto:feedback@travelbae.app?subject=TravelBae%20feedback';
  };

  const titleByView = {
    hub: 'My Profile',
    badges: 'Travel Badges',
    stats: 'Travel Stats',
    history: 'Trip History',
    notifications: 'Notifications',
    currency: 'Default Currency',
    privacy: 'Privacy & Safety',
    help: 'Help & Support',
    policy: 'Privacy Policy',
    terms: 'Terms of Service',
    about: 'About TravelBae',
  };

  // Menu rendered in grouped sections
  const MENU_SECTIONS = [
    {
      title: 'Your travels',
      items: [
        { id: 'badges',  icon: '🏆', label: 'Badges',       sub: `${earned.length}/${BADGE_DEFS.length} earned · ${earnedPct}%`,                          accent: '#1D9E75', action: 'view' },
        { id: 'stats',   icon: '📊', label: 'Travel Stats', sub: `${stats.uniqueDests} places · ${totalTravelDays} days`,                                  accent: '#7F77DD', action: 'view' },
        { id: 'history', icon: '🧳', label: 'Trip History', sub: `${stats.completedCount} completed · ${Math.max(0, stats.tripCount - stats.completedCount)} active`, accent: '#FF6B35', action: 'view' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { id: 'notifications', icon: '🔔', label: 'Notifications',    sub: 'Trip reminders & updates',                          accent: '#FF6B35', action: 'view' },
        { id: 'currency',      icon: '💱', label: 'Default Currency', sub: `${currencyMeta.code} — ${currencyMeta.name}`,       accent: '#0F6E56', action: 'view' },
        { id: 'help',          icon: '❓', label: 'Help & Support',   sub: 'FAQs and contact us',                              accent: '#1D9E75', action: 'view' },
      ],
    },
    {
      title: 'Support TravelBae',
      items: [
        { id: 'feedback', icon: '💌', label: 'Send feedback',   sub: 'Tell us what you love or hate',     accent: '#D85A30', action: 'feedback' },
        { id: 'rate',     icon: '⭐', label: 'Rate TravelBae',  sub: 'Love the app? Let us know!',        accent: '#BA7517', action: 'rate' },
        { id: 'share',    icon: '📤', label: 'Share TravelBae', sub: 'Invite friends to plan together',   accent: '#7F77DD', action: 'share' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { id: 'policy', icon: '📄', label: 'Privacy policy',    sub: 'What we do and don\'t collect', accent: '#534AB7', action: 'view' },
        { id: 'terms',  icon: '📖', label: 'Terms of service',  sub: 'How we keep things fair',       accent: '#6b6b68', action: 'view' },
        { id: 'about',  icon: 'ℹ️', label: 'About TravelBae',   sub: 'Our story & version info',      accent: '#1D9E75', action: 'view' },
      ],
    },
  ];

  const handleMenuClick = (item) => {
    if (item.action === 'view')     setView(item.id);
    if (item.action === 'rate')     handleRate();
    if (item.action === 'share')    handleShare();
    if (item.action === 'feedback') handleFeedback();
  };

  const headerTitle = titleByView[view] || 'My Profile';
  const goBack = () => (view === 'hub' ? onClose() : setView('hub'));

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 500, overflowY: 'auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes pfFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pfBadgePop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes pfSlideIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        .pf-badge:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(29,158,117,0.18); }
        .pf-badge-locked:hover { transform: translateY(-2px); }
        .pf-avatar-edit:hover { background: #0F6E56 !important; }
        .pf-row:hover { background: #faf9f5 !important; }
        .pf-row:active { transform: scale(0.995); }
      `}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.09)', padding: '13px 1.25rem', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <button style={{ ...S.btn, padding: '5px 8px', fontSize: 16 }} onClick={goBack}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700 }}>{headerTitle}</div>
        {saved && <div style={{ marginLeft: 'auto', fontSize: 11, color: '#0F6E56', background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 10, padding: '4px 10px', fontWeight: 600, animation: 'pfFadeIn .2s' }}>✓ Saved</div>}
      </div>

      {/* Floating toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1a18', color: '#fff', padding: '10px 16px', borderRadius: 22, fontSize: 13, fontWeight: 500, zIndex: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'pfFadeIn .2s' }}>
          {toast}
        </div>
      )}

      {/* Rate TravelBae modal */}
      {rateModal && (
        <div
          onClick={() => setRateModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,18,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: '1rem', animation: 'pfFadeIn .15s' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 22, padding: '1.75rem 1.5rem 1.5rem', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center', animation: 'pfSlideIn .2s ease-out', position: 'relative' }}
          >
            <button
              onClick={() => setRateModal(false)}
              aria-label="Close"
              style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, border: 'none', background: 'transparent', fontSize: 20, color: '#9a9a96', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ fontSize: 38, marginBottom: 8 }}>✨</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>
              Enjoying TravelBae?
            </div>
            <div style={{ fontSize: 13, color: '#6b6b68', marginBottom: 18, lineHeight: 1.5 }}>
              Tap a star to rate your experience.
            </div>
            <div
              onMouseLeave={() => setRateHover(0)}
              style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}
            >
              {[1, 2, 3, 4, 5].map(n => {
                const active = (rateHover || rateStars) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setRateHover(n)}
                    onFocus={() => setRateHover(n)}
                    onClick={() => submitRating(n)}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    style={{
                      width: 46, height: 46, border: 'none', background: 'transparent',
                      fontSize: 34, lineHeight: 1, cursor: 'pointer',
                      color: active ? '#F5B301' : '#E4E2D9',
                      transform: active ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform .12s, color .12s',
                      padding: 0,
                    }}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#9a9a96', minHeight: 16, marginBottom: 16 }}>
              {(rateHover || rateStars)
                ? ['', 'Not great', 'Could be better', 'It’s okay', 'Pretty good!', 'Loved it!'][rateHover || rateStars]
                : (rateStars ? `You rated ${rateStars}★` : 'Pick a rating')}
            </div>
            <button
              onClick={() => setRateModal(false)}
              style={{ width: '100%', padding: '11px', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf6', color: '#6b6b68', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* ════════ HUB VIEW ════════ */}
      {view === 'hub' && (
        <div style={{ animation: 'pfFadeIn .25s ease-out' }}>
          {/* Identity card */}
          <div style={{ padding: '1.5rem 1.25rem 0' }}>
            <div style={{ background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 22, padding: '1.75rem 1.25rem', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(29,158,117,0.25)' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
                <div style={{ width: 110, height: 110, borderRadius: '50%', background: avatar ? `url(${avatar}) center/cover` : 'rgba(255,255,255,0.18)', border: '3px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  {!avatar && initials}
                </div>
                <button
                  type="button"
                  className="pf-avatar-edit"
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', bottom: 2, right: 2, width: 34, height: 34, borderRadius: '50%', background: '#1D9E75', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#fff', transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                  title="Upload photo"
                >
                  📷
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPick} />
              </div>

              {avatar && (
                <div style={{ marginBottom: 10 }}>
                  <button onClick={removeAvatar} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Remove photo</button>
                </div>
              )}

              {editingName ? (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', maxWidth: 260, margin: '0 auto' }}>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(profile.name || ''); setEditingName(false); } }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, textAlign: 'center', fontFamily: "'Sora',sans-serif", outline: 'none', background: 'rgba(255,255,255,0.95)', color: '#0F6E56' }}
                    placeholder="Your name"
                    maxLength={30}
                  />
                  <button onClick={saveName} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#fff', color: '#0F6E56', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>✓</button>
                </div>
              ) : (
                <div onClick={() => setEditingName(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
                    {name || 'Tap to add name'}
                  </div>
                  <span style={{ fontSize: 13, opacity: 0.75 }}>✎</span>
                </div>
              )}
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, position: 'relative', zIndex: 1 }}>
                {stats.tripCount} trip{stats.tripCount === 1 ? '' : 's'} · {stats.uniqueDests} destination{stats.uniqueDests === 1 ? '' : 's'} · {earned.length} badge{earned.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* Quick stats strip */}
          <div style={{ padding: '1rem 1.25rem 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Trips',  val: stats.tripCount },
              { label: 'Places', val: stats.uniqueDests },
              { label: 'Photos', val: stats.photoCount },
              { label: 'Badges', val: earned.length },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Menu list — grouped sections */}
          {MENU_SECTIONS.map(section => (
            <div key={section.title} style={{ padding: '1.25rem 1.25rem 0' }}>
              <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
                {section.title}
              </div>
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, overflow: 'hidden' }}>
                {section.items.map((m, idx) => (
                  <button
                    key={m.id}
                    className="pf-row"
                    onClick={() => handleMenuClick(m)}
                    style={{
                      width: '100%', background: '#fff', border: 'none',
                      borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
                      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif",
                      transition: 'background .15s, transform .1s',
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${m.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {m.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{m.label}</div>
                      <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>{m.sub}</div>
                    </div>
                    <div style={{ fontSize: 18, color: '#c8c6c0', flexShrink: 0 }}>
                      {m.action === 'view' ? '›' : (m.action === 'share' ? '↗' : '★')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Log out + Delete account */}
          {(onLogout || onDeleteAccount) && (
            <div style={{ padding: '1rem 1.25rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    border: '0.5px solid #F5C4B3', background: '#fff', color: '#993C1D',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  🚪 Log out
                </button>
              )}
              {onDeleteAccount && (
                <button
                  onClick={onDeleteAccount}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    border: '0.5px solid #C44545', background: '#C44545', color: '#fff',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  🗑️ Delete account
                </button>
              )}
              <div style={{ fontSize: 11, color: '#9a9a96', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                Deleting your account permanently wipes your profile and any trips where you're the only member.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ BADGES VIEW ════════ */}
      {view === 'badges' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.5rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700 }}>🏆 Travel Badges</div>
            <div style={{ fontSize: 12, color: '#6b6b68' }}>{earned.length}/{BADGE_DEFS.length} · {earnedPct}%</div>
          </div>
          <div style={{ padding: '0 1.25rem' }}>
            <div style={{ height: 6, background: '#E8E6DE', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${earnedPct}%`, height: '100%', background: 'linear-gradient(90deg,#1D9E75,#0F6E56)', transition: 'width .4s' }} />
            </div>
          </div>

          {earned.length > 0 && (
            <>
              <div style={{ padding: '1.25rem 1.25rem 0.5rem', fontSize: 11, color: '#0F6E56', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Earned</div>
              <div style={{ padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {earned.map((b, i) => (
                  <div key={b.id} className="pf-badge" style={{
                    background: 'linear-gradient(135deg,#fff,#F0FAF5)',
                    border: '0.5px solid #9FE1CB',
                    borderRadius: 14, padding: '14px 10px', textAlign: 'center',
                    cursor: 'default', transition: 'all .18s',
                    animation: `pfBadgePop .3s ease-out ${i * 0.04}s both`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, color: '#0F6E56', background: '#E1F5EE', padding: '2px 6px', borderRadius: 6 }}>✓</div>
                    <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1 }}>{b.emoji}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#0F6E56', marginBottom: 3 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: '#6b6b68', lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {locked.length > 0 && (
            <>
              <div style={{ padding: '1.5rem 1.25rem 0.5rem', fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>In progress</div>
              <div style={{ padding: '0 1.25rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {locked.map(b => (
                  <div key={b.id} className="pf-badge-locked" style={{
                    background: '#fff', border: '0.5px dashed rgba(0,0,0,0.15)',
                    borderRadius: 14, padding: '14px 10px', textAlign: 'center',
                    transition: 'all .18s', opacity: 0.78, position: 'relative',
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1, filter: 'grayscale(0.7)', opacity: 0.55 }}>{b.emoji}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#6b6b68', marginBottom: 3 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: '#9a9a96', lineHeight: 1.4 }}>{b.desc}</div>
                    {b.progress && (
                      <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#1D9E75', background: '#F1EFE8', borderRadius: 8, padding: '2px 8px', display: 'inline-block' }}>
                        {b.progress(stats)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ TRAVEL STATS VIEW ════════ */}
      {view === 'stats' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          {/* Hero metrics — 4 key numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Countries & cities explored', val: stats.uniqueDests,                                 icon: '🌍', tint: '#E1F5EE', accent: '#1D9E75' },
              { label: 'Total travel days',           val: totalTravelDays,                                   icon: '📅', tint: '#EEEDFE', accent: '#7F77DD' },
              { label: `Total spent (${currencyMeta.symbol})`, val: fmtMoney(totalSpend),                     icon: '💰', tint: '#FFF1E0', accent: '#FF6B35' },
              { label: 'Travel companions',           val: companionCount,                                    icon: '👥', tint: '#E6F1FB', accent: '#534AB7' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '14px 14px 16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: s.accent, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 6, lineHeight: 1.35 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '8px 0 8px 4px' }}>Breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Total trips',       val: stats.tripCount,         icon: '🧳', tint: '#E1F5EE' },
              { label: 'Completed',         val: stats.completedCount,    icon: '✅', tint: '#E6F1FB' },
              { label: 'Active',            val: Math.max(0, stats.tripCount - stats.completedCount), icon: '⚡', tint: '#FFF1E0' },
              { label: 'Solo journeys',     val: stats.soloCount,         icon: '🎒', tint: '#EEEDFE' },
              { label: 'Group trips',       val: stats.groupCount,        icon: '👥', tint: '#E1F5EE' },
              { label: 'Photos uploaded',   val: stats.photoCount,        icon: '📸', tint: '#FAECE7' },
              { label: 'Contacts saved',    val: stats.contactCount,      icon: '📒', tint: '#F1EFE8' },
              { label: 'Itineraries built', val: stats.itineraryCount,    icon: '🗺️', tint: '#E6F1FB' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: s.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#1a1a18' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 1 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {topDests.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: '2rem' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📍 Most visited</div>
              {topDests.map(([dest, count]) => {
                const max = topDests[0][1];
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={dest} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#1a1a18', fontWeight: 500 }}>{dest}</span>
                      <span style={{ color: '#6b6b68' }}>{count} trip{count === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ height: 5, background: '#F1EFE8', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#1D9E75,#0F6E56)', borderRadius: 5 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════ TRIP HISTORY VIEW ════════ */}
      {view === 'history' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          {tripList.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px dashed rgba(0,0,0,0.15)', borderRadius: 14, padding: '2rem 1rem', textAlign: 'center', color: '#6b6b68' }}>
              <div style={{ fontSize: 38, marginBottom: 6 }}>🗺️</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>No trips yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Create one from your home screen to start your travel log.</div>
            </div>
          ) : (
            tripList.map(t => {
              const spend = (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);
              return (
                <div key={t.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: t.isSolo ? 'linear-gradient(135deg,#EEEDFE,#E6F1FB)' : '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {t.emoji || (t.isSolo ? '🎒' : '✈️')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.groupName || 'Untitled trip'}</div>
                      {t.completed && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#E1F5EE', color: '#0F6E56' }}>DONE</span>}
                      {t.isSolo && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#EEEDFE', color: '#534AB7' }}>SOLO</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 {t.destination || '—'}
                      {spend > 0 && <> · ₹{Math.round(spend).toLocaleString('en-IN')}</>}
                      {(t.photos || []).length > 0 && <> · {(t.photos || []).length} 📸</>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════ NOTIFICATIONS VIEW ════════ */}
      {view === 'notifications' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>All notifications</div>
                <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>Master switch for all alerts</div>
              </div>
              <button
                onClick={() => savePrefs({ ...prefs, notifications: !prefs.notifications })}
                style={{ width: 44, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer', background: prefs.notifications ? '#1D9E75' : '#d1cfc8', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 3, left: prefs.notifications ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '4px 0 8px 4px' }}>Categories</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', opacity: prefs.notifications ? 1 : 0.45, pointerEvents: prefs.notifications ? 'auto' : 'none', transition: 'opacity .2s' }}>
            {[
              { key: 'notifTripReminders', icon: '📅', label: 'Trip reminders',     sub: 'Upcoming arrivals, departures & itinerary' },
              { key: 'notifGroupUpdates',  icon: '👥', label: 'Group updates',      sub: 'Expenses, contacts & photos added by mates' },
              { key: 'notifTips',          icon: '💡', label: 'Tips & inspiration', sub: 'Occasional travel ideas — never spammy' },
            ].map((row, idx) => (
              <div key={row.key} style={{ padding: '14px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{row.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 1 }}>{row.sub}</div>
                </div>
                <button
                  onClick={() => savePrefs({ ...prefs, [row.key]: !prefs[row.key] })}
                  style={{ width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: prefs[row.key] ? '#1D9E75' : '#d1cfc8', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 3, left: prefs[row.key] ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ CURRENCY VIEW ════════ */}
      {view === 'currency' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#E1F5EE,#F0FAF5)', border: '0.5px solid #9FE1CB', borderRadius: 14, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '0.5px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontFamily: "'Sora',sans-serif", fontWeight: 700, color: '#0F6E56' }}>{currencyMeta.symbol}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>Currently using {currencyMeta.code}</div>
              <div style={{ fontSize: 11.5, color: '#0F6E56', opacity: 0.85, marginTop: 2 }}>{currencyMeta.name}</div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden' }}>
            {CURRENCIES.map((c, idx) => {
              const active = prefs.currency === c.code;
              return (
                <button
                  key={c.code}
                  className="pf-row"
                  onClick={() => savePrefs({ ...prefs, currency: c.code })}
                  style={{
                    width: '100%', background: active ? '#F0FAF5' : '#fff', border: 'none',
                    borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif",
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? '#1D9E75' : '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: active ? '#fff' : '#1a1a18', flexShrink: 0 }}>
                    {c.symbol}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 600, color: '#1a1a18' }}>{c.code}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 1 }}>{c.name}</div>
                  </div>
                  {active && <div style={{ fontSize: 14, color: '#1D9E75', fontWeight: 700 }}>✓</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ HELP VIEW ════════ */}
      {view === 'help' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 0 8px 4px' }}>Frequently asked</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { q: 'How does expense splitting work?',     a: 'Add an expense, pick who paid and how to split. We crunch the balances and show who owes whom — settle anytime.' },
              { q: 'Are my photos private?',                a: 'Yes. Photos are end-to-end encrypted and only visible to you and your trip mates. We never share or train on them.' },
              { q: 'Can I edit a trip after creating it?',  a: 'Tap the menu inside any trip → Edit Trip. You can change dates, budget, destination, or members.' },
              { q: 'How do I invite friends to a trip?',    a: 'Open a group trip → tap the share code at the top → send it to friends. They join with that code + a nickname.' },
              { q: 'What happens if I delete a trip?',      a: 'Everything tied to the trip — expenses, contacts, photos, itinerary — is permanently removed. This cannot be undone.' },
            ].map((it, idx) => (
              <details key={it.q} style={{ padding: '12px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#1D9E75', fontWeight: 700 }}>›</span> {it.q}
                </summary>
                <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.55, marginTop: 8, paddingLeft: 16 }}>{it.a}</div>
              </details>
            ))}
          </div>

          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 0 8px 4px' }}>Contact us</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden' }}>
            <a href="mailto:support@travelbae.app" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontSize: 18, width: 22, textAlign: 'center' }}>✉️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>Email support</div>
                <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 1 }}>support@travelbae.app — usually replies within a day</div>
              </div>
              <div style={{ fontSize: 14, color: '#c8c6c0' }}>↗</div>
            </a>
          </div>
        </div>
      )}

      {/* ════════ PRIVACY VIEW ════════ */}
      {view === 'privacy' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#E1F5EE,#F0FAF5)', border: '0.5px solid #9FE1CB', borderRadius: 14, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10 }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>🔒</div>
            <div style={{ fontSize: 12.5, color: '#0F6E56', lineHeight: 1.5 }}>
              Your photos, expenses and trip data are <strong>end-to-end encrypted</strong> and visible only to you and your trip mates. We never share, sell, or use your content to train any models.
            </div>
          </div>
          {[
            { icon: '📸', title: 'Photos', body: 'Stored encrypted in your private trip bucket. Only your trip mates can view them.' },
            { icon: '💰', title: 'Expenses & contacts', body: 'Synced privately to your account. Visible only inside the specific trip.' },
            { icon: '📍', title: 'Location', body: 'We never track your real-time location. Destinations come from what you type.' },
            { icon: '🗑️', title: 'Right to delete', body: 'Delete a trip and all its photos, expenses and contacts disappear permanently.' },
          ].map(it => (
            <div key={it.title} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 12 }}>
              <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{it.icon}</div>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 600, color: '#1a1a18', marginBottom: 3 }}>{it.title}</div>
                <div style={{ fontSize: 11.5, color: '#6b6b68', lineHeight: 1.5 }}>{it.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ PRIVACY POLICY VIEW ════════ */}
      {view === 'policy' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 14 }}>Last updated · May 2026</div>
          {[
            { h: 'What we collect',  p: 'Only what you give us: your name, email, trip details, expenses, contacts, photos and itinerary notes. Nothing else.' },
            { h: 'How we use it',    p: 'Strictly to make TravelBae work — render your trips, sync them across devices, and let your trip mates see shared data. We do not run analytics on your trip content.' },
            { h: 'What we never do', p: 'We never sell your data, share it with advertisers, or use your photos, expenses, or messages to train any AI model — ours or anyone else\'s.' },
            { h: 'Encryption',       p: 'All trip data is encrypted in transit. Photos sit in your private storage bucket, accessible only to you and the trip mates you invited.' },
            { h: 'Your rights',      p: 'Edit or delete anything anytime. Deleting a trip permanently removes its expenses, contacts, photos and itinerary. Deleting your account wipes everything we have on you.' },
            { h: 'Cookies',          p: 'We use a single auth token in localStorage to keep you signed in. No third-party tracking cookies.' },
            { h: 'Contact',          p: 'Privacy questions? Email privacy@travelbae.app and a real human will reply.' },
          ].map(s => (
            <div key={s.h} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>{s.h}</div>
              <div style={{ fontSize: 12.5, color: '#6b6b68', lineHeight: 1.6 }}>{s.p}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', marginTop: '1.25rem' }}>© 2026 TravelBae</div>
        </div>
      )}

      {/* ════════ TERMS OF SERVICE VIEW ════════ */}
      {view === 'terms' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 14 }}>Last updated · May 2026</div>
          {[
            { h: 'The deal',          p: 'TravelBae is a tool to help you plan trips, split expenses and share memories with people you travel with. By using it, you agree to keep things friendly and lawful.' },
            { h: 'Your account',      p: 'You\'re responsible for what happens under your account. Keep your password secret. One human, one account.' },
            { h: 'Your content',      p: 'Your trips, photos and notes belong to you. You grant us only the minimum permission needed to store and display them inside your trips.' },
            { h: 'Acceptable use',    p: 'Don\'t upload anything illegal, hateful, or that isn\'t yours to share. Don\'t try to reverse-engineer, scrape, or break TravelBae.' },
            { h: 'Group trips',       p: 'When you join a group trip, the other members can see the trip\'s expenses, contacts and photos. Only share share-codes with people you trust.' },
            { h: 'No warranty',       p: 'TravelBae is provided "as is" — we try hard, but life and code happen. We aren\'t liable for indirect damages from app downtime or data loss.' },
            { h: 'Changes',           p: 'We may tweak these terms occasionally. We\'ll surface changes inside the app. Continuing to use TravelBae means you accept the latest version.' },
          ].map(s => (
            <div key={s.h} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>{s.h}</div>
              <div style={{ fontSize: 12.5, color: '#6b6b68', lineHeight: 1.6 }}>{s.p}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', marginTop: '1.25rem' }}>© 2026 TravelBae</div>
        </div>
      )}

      {/* ════════ ABOUT VIEW — informational only ════════ */}
      {view === 'about' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', padding: '1rem 1rem 1.5rem' }}>
            <div style={{ width: 78, height: 78, background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 14px', boxShadow: '0 10px 28px rgba(29,158,117,0.35)' }}>✈️</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Travel<span style={{ color: '#1D9E75' }}>Bae</span>
            </div>
            <div style={{ fontSize: 13, color: '#6b6b68', marginTop: 4, fontStyle: 'italic' }}>Plan, split, explore — together.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '4px 12px', borderRadius: 12, background: '#E1F5EE', border: '0.5px solid #9FE1CB', fontSize: 11, color: '#0F6E56', fontWeight: 600 }}>
              <span>v1.0.0</span> · <span>Build 2026.05</span>
            </div>
          </div>

          {/* What is TravelBae */}
          <div style={{ background: 'linear-gradient(135deg,#fff,#F0FAF5)', border: '0.5px solid #9FE1CB', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0F6E56', marginBottom: 8 }}>What is TravelBae?</div>
            <div style={{ fontSize: 13, color: '#1a1a18', lineHeight: 1.65 }}>
              TravelBae is a calm, all-in-one companion for travellers who'd rather spend their energy on the journey than the logistics. From the first spark of an idea to the photos you scroll through years later, every part of a trip — planning, money, people, memories — lives in one place. No spreadsheets, no scattered group chats, no awkward "who owes whom" maths.
            </div>
          </div>

          {/* Why we built it */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>Why we built it</div>
            <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.65 }}>
              Every group trip we'd taken ended the same way — endless screenshots of bills, a forgotten itinerary buried in someone's notes app, photos drifting across five different cloud folders. We wanted one quiet home for it all. So we built one, designed around the people we actually travel with.
            </div>
          </div>

          {/* What you can do */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px 14px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 12 }}>What you can do</div>
            {[
              { icon: '🗺️', title: 'Plan',    body: 'Generate AI itineraries, pin must-see places, and shape each day around your pace.' },
              { icon: '💳', title: 'Split',   body: 'Add expenses on the go. Balances and settle-up suggestions appear instantly.' },
              { icon: '🎒', title: 'Solo or together', body: 'Spin up a solo journey or a group trip — TravelBae adapts to either mode.' },
              { icon: '📸', title: 'Remember', body: 'Private photo folders per traveller, encrypted and visible only to your trip mates.' },
            ].map((f, idx) => (
              <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: idx === 0 ? 0 : 10, paddingBottom: 10, borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0FAF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{f.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#1a1a18', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.55 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 10 }}>What we stand for</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { icon: '🔒', t: 'Privacy first',    s: 'Your data is yours. Encrypted, never sold.' },
                { icon: '🧘', t: 'Calm by design',    s: 'No dark patterns. No noise. Just clarity.' },
                { icon: '🤝', t: 'Built for groups',  s: 'Travelling together should feel easy.' },
                { icon: '🌱', t: 'Made by travellers', s: 'Crafted by people who love going places.' },
              ].map(v => (
                <div key={v.t} style={{ padding: '10px 12px', background: '#fafaf6', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{v.icon}</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 12.5, fontWeight: 700, color: '#1a1a18' }}>{v.t}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2, lineHeight: 1.45 }}>{v.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Built with */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>Built with</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['React', 'Vite', 'Node.js', 'Prisma', 'Supabase', 'Gemini AI'].map(t => (
                <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: '#F1EFE8', color: '#1a1a18', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 12, color: '#6b6b68', marginTop: '1.25rem', paddingBottom: '0.5rem', lineHeight: 1.6 }}>
            Made with <span style={{ color: '#1D9E75' }}>💚</span> for travellers, everywhere.
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', paddingBottom: '1rem' }}>
            © 2026 TravelBae · All rights reserved
          </div>
        </div>
      )}

      <div style={{ height: '2rem' }} />
    </div>
  );
}

function ClubPage({ trip }){
  const [clubLoading, setClubLoading] = useState(true);
  const [clubBusy, setClubBusy] = useState(false);
  const [hub, setHub] = useState({ myProfile: null, discover: [], incomingRequests: [], outgoingRequests: [] });
  const [profileForm, setProfileForm] = useState({ title: '', about: '', lookingFor: '' });
  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  const loadHub = useCallback(async () => {
    setClubLoading(true);
    try {
      const data = await getClubHub(trip.id);
      setHub(data);
      setProfileForm({
        title: data.myProfile?.title || trip.groupName,
        about: data.myProfile?.about || '',
        lookingFor: data.myProfile?.lookingFor || '',
      });
    } catch (err) {
      alert('Could not load club: ' + err.message);
    }
    setClubLoading(false);
  }, [trip.id, trip.groupName]);

  useEffect(() => { loadHub(); }, [loadHub]);

  const listed = (hub.myProfile?.status || 'snooze') === 'listed';

  const handleToggle = async () => {
    setClubBusy(true);
    try {
      await updateClubStatus(trip.id, listed ? 'snooze' : 'listed');
      await loadHub();
    } catch (err) {
      alert('Could not change status: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.title.trim() || !profileForm.about.trim()) {
      alert('Please fill title and about.');
      return;
    }
    setClubBusy(true);
    try {
      await upsertClubProfile(trip.id, profileForm);
      await loadHub();
    } catch (err) {
      alert('Could not save profile: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleSendRequest = async () => {
    if (!requestFor || !requestMessage.trim()) return;
    setClubBusy(true);
    try {
      await sendClubRequest(trip.id, requestFor, requestMessage.trim());
      setRequestFor(null);
      setRequestMessage('');
      await loadHub();
    } catch (err) {
      alert('Could not send request: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleRequestAction = async (requestId, action) => {
    setClubBusy(true);
    try {
      await respondClubRequest(trip.id, requestId, action);
      await loadHub();
    } catch (err) {
      alert('Could not update request: ' + err.message);
    }
    setClubBusy(false);
  };

  if (clubLoading) return <Spinner text="Loading Club…" solo={trip.isSolo} />;

  return (
    <div>
      <div style={{ background: trip.isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🧭 TravelBae Club</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12 }}>List your group profile, discover others, and handle incoming requests.</div>
        <button
          onClick={handleToggle}
          disabled={clubBusy}
          style={{ ...S.btn, border: 'none', background: '#fff', color: listed ? '#085041' : '#6b6b68', fontWeight: 600 }}>
          {listed ? '🟢 Listed' : '🌙 Snooze'}
        </button>
      </div>

      <div style={S.card}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>My Group Profile</div>
        <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 10 }}>This profile is visible to other groups in Club.</div>
        <label style={S.label}>Profile title</label>
        <input
          style={S.input}
          value={profileForm.title}
          onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Delhi Foodie Squad"
        />
        <label style={S.label}>About</label>
        <textarea
          style={{ ...S.input, resize: 'vertical', minHeight: 84 }}
          value={profileForm.about}
          onChange={e => setProfileForm(f => ({ ...f, about: e.target.value }))}
          placeholder="Tell other groups about your travel vibe."
        />
        <label style={S.label}>Looking for (optional)</label>
        <input
          style={S.input}
          value={profileForm.lookingFor}
          onChange={e => setProfileForm(f => ({ ...f, lookingFor: e.target.value }))}
          placeholder="e.g. Cafe hopping + local walks"
        />
        <button style={{ ...S.btn, ...S.btnP, marginTop: 12 }} onClick={handleSaveProfile} disabled={clubBusy}>💾 Save profile</button>
      </div>

      <div style={S.card}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Incoming Requests</div>
        {hub.incomingRequests.length === 0 && <div style={{ fontSize: 12, color: '#6b6b68' }}>No pending requests right now.</div>}
        {hub.incomingRequests.map(req => (
          <div key={req.id} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{req.requesterTrip.groupName}</div>
            <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2 }}>📍 {req.requesterTrip.destination} · {req.requesterTrip.members.length} members</div>
            {req.requesterTrip.clubProfile?.about && <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 5, fontStyle: 'italic' }}>"{req.requesterTrip.clubProfile.about}"</div>}
            <div style={{ fontSize: 12, marginTop: 6 }}>{req.message}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button style={{ ...S.btn, ...S.btnP, fontSize: 12 }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>✓ Accept</button>
              <button style={{ ...S.btn, fontSize: 12 }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>✕ Decline</button>
            </div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Discover Groups</div>
        {hub.discover.length === 0 && <div style={{ fontSize: 12, color: '#6b6b68' }}>No active listed groups found.</div>}
        {hub.discover.map(item => {
          const alreadySent = hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending');
          return (
            <div key={item.id} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 22 }}>{item.trip.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.trip.groupName}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68' }}>📍 {item.trip.destination} · {item.trip.members.length} members</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 7 }}>{item.about}</div>
              {item.lookingFor && <div style={{ fontSize: 12, marginTop: 5 }}>Looking for: {item.lookingFor}</div>}
              {requestFor === item.tripId ? (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    style={{ ...S.input, resize: 'vertical', minHeight: 70 }}
                    value={requestMessage}
                    onChange={e => setRequestMessage(e.target.value)}
                    placeholder="Write a short request for this group"
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button style={{ ...S.btn, ...S.btnOrange, fontSize: 12 }} onClick={handleSendRequest} disabled={clubBusy || !requestMessage.trim()}>➤ Send request</button>
                    <button style={{ ...S.btn, fontSize: 12 }} onClick={() => { setRequestFor(null); setRequestMessage(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  style={{ ...S.btn, ...S.btnOrange, fontSize: 12, marginTop: 10, opacity: alreadySent ? 0.65 : 1 }}
                  disabled={alreadySent || clubBusy}
                  onClick={() => setRequestFor(item.tripId)}>
                  {alreadySent ? '⏳ Request sent' : '➤ Send request'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP SHELL
═══════════════════════════════════════════════════════ */
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('travelbae_token'));
  const [authScreen, setAuthScreen] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [myNickname, setMyNickname] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [newTripModal, setNewTripModal] = useState(null);
  const [tab, setTab] = useState('main');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('travelbae_profile');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { name: '', avatar: null };
  });

  const saveProfile = (next) => {
    setProfile(next);
    try { localStorage.setItem('travelbae_profile', JSON.stringify(next)); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!authToken) return;
    setTripsLoading(true);
    getTrips()
      .then(d => setTrips(d.trips || []))
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (!activeTrip) { setActiveTripData(null); setMyNickname(null); return; }
    setTripLoading(true);
    import('./api').then(({ getTrip }) => {
      getTrip(activeTrip)
        .then(d => {
          // Always prefer the locally cached itin/taste over server (server doesn't store these)
          const localTrip = trips.find(x => x.id === activeTrip);
          setActiveTripData({
            ...d.trip,
            _cachedItin: localTrip?._cachedItin ?? d.trip._cachedItin ?? null,
            _cachedTaste: localTrip?._cachedTaste ?? d.trip._cachedTaste ?? null,
          });
          setMyNickname(d.myNickname);
        })
        .catch(() => {
          const t = trips.find(x => x.id === activeTrip);
          setActiveTripData(t || null);
          setMyNickname(normalizeMembers(t?.members || [])[0] || 'Me');
        })
        .finally(() => setTripLoading(false));
    });
  }, [activeTrip, trips]); // ← ADD trips as dependency

  const isSolo = activeTripData?.isSolo || false;

  const handleAuth = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const endpoint = authScreen === 'signup' ? '/auth/signup' : '/auth/login';
      const body = authScreen === 'signup'
        ? { name: authForm.name, email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password };
      const res = await fetch(`https://travelbae-backend.onrender.com${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      localStorage.setItem('travelbae_token', data.token);
      setAuthToken(data.token);
    } catch (err) {
      setAuthError(err.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = () => { localStorage.removeItem('travelbae_token'); setAuthToken(null); setTrips([]); setActiveTrip(null); };

  const handleDeleteAccount = async () => {
    const first = window.confirm('Delete your TravelBae account?\n\nThis permanently removes your profile, trip memberships, and any trips where you were the only member (along with their expenses, contacts, photos and itinerary).\n\nThis cannot be undone.');
    if (!first) return;
    const typed = window.prompt('Type DELETE to confirm permanent account deletion.');
    if (typed !== 'DELETE') return;
    try {
      await deleteAccount();
      localStorage.removeItem('travelbae_token');
      localStorage.removeItem('travelbae_profile');
      localStorage.removeItem('travelbae_prefs');
      setAuthToken(null);
      setTrips([]);
      setActiveTrip(null);
      window.alert('Your account has been deleted.');
    } catch (err) {
      window.alert('Could not delete account: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCreateTrip = async (tripData) => {
    const { trip } = await createTrip(tripData);
    setTrips(ts => [trip, ...ts]);
    setNewTripModal(trip);
    // Kick off itinerary generation in background immediately
    if (trip.destination) {
      import('./api').then(async ({ generateItinerary, generateLocalTaste }) => {
        const days = trip.arrival && trip.departure
          ? Math.max(1, Math.round((new Date(trip.departure) - new Date(trip.arrival)) / 86400000))
          : 1;
        const SLOT_ORDER = ['morning', 'afternoon', 'evening'];
        const arrivalIdx = SLOT_ORDER.indexOf(trip.arrivalSlot || 'morning');
        const firstSlot = SLOT_ORDER[Math.min(arrivalIdx + 1, SLOT_ORDER.length - 1)];
        try {
          const [itinResult, tasteResult] = await Promise.all([
            generateItinerary({
              destination: trip.destination,
              days,
              budget: trip.budget || null,
              people: trip.people || 1,
              interests: ['🛕 Temples', '🍽️ Food', '🛍️ Shopping'],
              arrivalSlot: trip.arrivalSlot || 'morning',
              departureSlot: trip.departureSlot || 'morning',
              firstActivitySlot: firstSlot,
              arrival: trip.arrival,
            }),
            generateLocalTaste({ destination: trip.destination }),
          ]);
          setTrips(ts => ts.map(t => t.id === trip.id
            ? { ...t, _cachedItin: itinResult, _cachedTaste: tasteResult }
            : t
          ));
        } catch (e) {
          console.warn('Background itinerary generation failed:', e);
        }
      });
    }
  };

  const handleJoinTrip = async (shareCode, nickname) => {
    const { trip } = await joinTrip(shareCode, nickname);
    setTrips(ts => [trip, ...ts]);
    return trip;
  };

  const handleOpenTrip = (tripId) => { setActiveTrip(tripId); setTab('main'); };

  const handleShareCodeDismiss = () => {
    const id = newTripModal.id;
    setNewTripModal(null);
    setActiveTrip(id);
    setTab('main');
  };

  // ── DELETE TRIP ──
  const handleDeleteTrip = async (tripId) => {
    try {
      // Call API — import deleteTrip from api.js (add it there)
      const { deleteTrip } = await import('./api');
      await deleteTrip(tripId);
    } catch (err) {
      // If backend doesn't support it yet, still remove from local state
      console.warn('Delete API error (removing locally):', err.message);
    }
    setTrips(ts => ts.filter(t => t.id !== tripId));
    // If currently viewing this trip, go back home
    if (activeTrip === tripId) {
      setActiveTrip(null);
      setActiveTripData(null);
    }
  };

  // ── MARK TRIP AS COMPLETED (move to past) ──
  const handleMarkComplete = async (tripId) => {
    try {
      const { updateTrip } = await import('./api');
      await updateTrip(tripId, { completed: true });
    } catch (err) {
      console.warn('Update API error (updating locally):', err.message);
    }
    setTrips(ts => ts.map(t => t.id === tripId ? { ...t, completed: true } : t));
    // If currently in this trip, update activeTripData too and go back home
    if (activeTrip === tripId) {
      setActiveTripData(d => d ? { ...d, completed: true } : d);
      setActiveTrip(null);
      setActiveTripData(null);
    }
  };

  // ── RESTORE TRIP TO ACTIVE ──
  const handleMarkActive = async (tripId) => {
    try {
      const { updateTrip } = await import('./api');
      await updateTrip(tripId, { completed: false });
    } catch (err) {
      console.warn('Update API error (updating locally):', err.message);
    }
    setTrips(ts => ts.map(t => t.id === tripId ? { ...t, completed: false } : t));
  };
  const handleItineraryCache = useCallback((tripId, update) => {
    setTrips(ts => ts.map(t => t.id === tripId ? { ...t, ...update } : t));
    setActiveTripData(d => d ? { ...d, ...update } : d);
  }, []);




  const groupTabs = [
    { id: 'main', label: '💳 Split' },
    { id: 'contacts', label: '📒 Contacts' },
    { id: 'itinerary', label: '🗺️ Itinerary' },
    { id: 'photos', label: '📸 Photos' },
    { id: 'club', label: '🧭 Club' },
  ];
  const soloTabs = [
    { id: 'main', label: '💰 Expenses' },
    { id: 'contacts', label: '📒 Contacts' },
    { id: 'itinerary', label: '🗺️ Itinerary' },
    { id: 'club', label: '🧭 Club' },
  ];
  const tabs = isSolo ? soloTabs : groupTabs;

  // ── AUTH SCREEN ──
  if (!authToken) return (
    <div style={{ ...S.root, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: '#1D9E75', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>✈️</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 700 }}>Travel<span style={{ color: '#1D9E75' }}>Bae</span></div>
          <div style={{ fontSize: 13, color: '#6b6b68', marginTop: 4 }}>Plan, split, explore — together.</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.09)' }}>
          <div style={{ display: 'flex', gap: 0, background: '#F1EFE8', borderRadius: 12, padding: 3, marginBottom: '1.5rem' }}>
            {['login', 'signup'].map(s => (
              <button key={s} onClick={() => { setAuthScreen(s); setAuthError(''); }}
                style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 500, borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: authScreen === s ? '#1D9E75' : 'transparent', color: authScreen === s ? '#fff' : '#6b6b68', transition: 'all .2s' }}>
                {s === 'login' ? '🔑 Log In' : '✨ Sign Up'}
              </button>
            ))}
          </div>
          {authScreen === 'signup' && (
            <>
              <label style={S.label}>Your Name</label>
              <input style={{ ...S.input, marginBottom: 10 }} value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Arjun" />
            </>
          )}
          <label style={S.label}>Email</label>
          <input style={{ ...S.input, marginBottom: 10 }} type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" />
          <label style={S.label}>Password</label>
          <input style={{ ...S.input, marginBottom: 10 }} type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Min 6 characters" />
          {authError && <div style={{ fontSize: 13, color: '#993C1D', background: '#FAECE7', border: '0.5px solid #F5C4B3', borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>⚠️ {authError}</div>}
          <button style={{ ...S.btn, ...S.btnP, width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, borderRadius: 12, marginTop: 4, opacity: authLoading ? 0.6 : 1 }}
            onClick={handleAuth} disabled={authLoading}>
            {authLoading ? 'Please wait…' : authScreen === 'login' ? '🔑 Log In' : '🚀 Create Account'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}} *{box-sizing:border-box;margin:0;padding:0} a{color:inherit;text-decoration:none} input[type=range]{-webkit-appearance:none;height:4px;border-radius:4px;background:#E1F5EE;outline:none} input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#1D9E75;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)}`}</style>

      {newTripModal && <ShareCodeModal trip={newTripModal} onDismiss={handleShareCodeDismiss} />}

      {/* Top Bar */}
      <div style={S.topBar}>
        {/* Profile button — always top-left */}
        <button
          onClick={() => setProfileOpen(true)}
          title="My profile"
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            border: '1.5px solid rgba(0,0,0,0.09)', background: profile.avatar ? `url(${profile.avatar}) center/cover` : (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)'),
            color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: "'Sora',sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, marginRight: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          {!profile.avatar && (profile.name ? profile.name.trim().slice(0, 2).toUpperCase() : '👤')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0' }}>
          {activeTrip && <button style={{ ...S.btn, padding: '5px 8px', marginRight: 2, fontSize: 16 }} onClick={() => { setActiveTrip(null); setActiveTripData(null); }}>←</button>}
          <div style={{ width: 34, height: 34, background: isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
            {isSolo ? '🎒' : '✈️'}
          </div>
          <div style={S.logoText}>Travel<span style={{ color: isSolo ? '#7F77DD' : '#1D9E75' }}>Bae</span></div>
        </div>
        {activeTrip && activeTripData ? (
          /* Top-bar pill with trip name + inline Mark Complete / Delete actions */
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={isSolo ? S.soloPill : S.tripPill} onClick={() => { setActiveTrip(null); setActiveTripData(null); }}>
              {activeTripData.emoji} {activeTripData.groupName}
              {isSolo && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, background: 'rgba(127,119,221,0.2)', borderRadius: 8, padding: '1px 6px' }}>Solo</span>}
            </div>
            {/* Quick action menu inside a trip */}
            <TripActionMenu
              trip={activeTripData}
              onMarkComplete={() => handleMarkComplete(activeTripData.id)}
              onDelete={() => handleDeleteTrip(activeTripData.id)}
              onEditTrip={(updates) => {
                setActiveTripData(d => d ? { ...d, ...updates, _cachedItin: null, _cachedTaste: null } : d);
                setTrips(ts => ts.map(t => t.id === activeTripData.id 
                  ? { ...t, ...updates, _cachedItin: null, _cachedTaste: null } 
                  : t
                ));
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <div style={S.tripPill}>🏠 My Trips</div>
            <button style={{ ...S.btn, fontSize: 12, padding: '5px 10px', color: '#993C1D', borderColor: '#F5C4B3' }} onClick={handleLogout}>Log out</button>
          </div>
        )}
      </div>

      {/* Nav Tabs */}
      {activeTrip && activeTripData && (
        <div style={{ ...S.navTabs, borderBottom: isSolo ? '0.5px solid rgba(127,119,221,0.2)' : '0.5px solid rgba(0,0,0,0.09)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...S.navTab, ...(tab === t.id ? (isSolo ? S.soloNavTabActive : S.navTabActive) : {}) }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={S.page}>
        {!activeTrip && (
          tripsLoading
            ? <Spinner text="Loading your trips…" />
            : <HomePage
                trips={trips}
                onOpenTrip={handleOpenTrip}
                onCreateTrip={handleCreateTrip}
                onJoinTrip={handleJoinTrip}
                onDeleteTrip={handleDeleteTrip}
                onMarkComplete={handleMarkComplete}
                onMarkActive={handleMarkActive}
              />
        )}

        {activeTrip && (
          tripLoading || !activeTripData
            ? <Spinner text="Loading trip…" />
            : (
              <div style={{ animation: 'slideIn .2s ease-out' }}>
                {isSolo ? (
                  <>
                    {tab === 'main' && <SoloExpensesPage trip={activeTripData} myNickname={myNickname} />}
                    {tab === 'contacts' && <ContactsPage trip={activeTripData} myNickname={myNickname} isSolo={true} />}
                    {tab === 'itinerary' && <ItineraryPage trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />}
                    {tab === 'club' && <ClubPage trip={activeTripData} />}
                  </>
                ) : (
                  <>
                    {tab === 'main' && <SplitPage trip={activeTripData} myNickname={myNickname} />}
                    {tab === 'contacts' && <ContactsPage trip={activeTripData} myNickname={myNickname} isSolo={false} />}
                    {tab === 'itinerary' && <ItineraryPage trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />}
                    {tab === 'photos' && (
                      <div style={{ margin: '-1.25rem', marginBottom: '-6rem' }}>
                        <PhotosPage trip={activeTripData} myNickname={myNickname} />
                      </div>
                    )}
                    {tab === 'club' && <ClubPage trip={activeTripData} />}
                  </>
                )}
              </div>
            )
        )}
      </div>

      {/* {activeTrip && activeTripData && <TripChatbot trip={activeTripData} myNickname={myNickname} />} */}

      {profileOpen && (
        <ProfilePage
          profile={profile}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
          onLogout={() => { setProfileOpen(false); handleLogout(); }}
          onDeleteAccount={() => { setProfileOpen(false); handleDeleteAccount(); }}
          trips={trips}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TRIP ACTION MENU — shown in top bar when inside a trip
═══════════════════════════════════════════════════════ */
function TripActionMenu({ trip, onMarkComplete, onDelete, onEditTrip }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isSolo = trip?.isSolo;

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; })();
  const EMOJI_OPTIONS = isSolo
    ? ['🎒','🧳','🛺','🚂','🏍️','🌏','🪂','🧗','🌄','☕','📖','🦋']
    : ['✈️','🏖️','🏔️','🏰','🌴','🗺️','🎡','🛕','🌅','🌿','🎭','🏛️'];

  const [editForm, setEditForm] = useState({
    groupName: trip?.groupName || '',
    destination: trip?.destination || '',
    emoji: trip?.emoji || '✈️',
    arrival: trip?.arrival ? new Date(trip.arrival).toISOString().split('T')[0] : today,
    departure: trip?.departure ? new Date(trip.departure).toISOString().split('T')[0] : '',
    budget: trip?.budget ? String(trip.budget) : '',
    people: String(normalizeMembers(trip?.members || []).length || 2),
  });
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editForm.groupName || !editForm.destination || !editForm.arrival || !editForm.departure) return;
    setSaving(true);
    try {
      const { updateTrip } = await import('./api');
      const updates = {
        groupName: editForm.groupName,
        destination: editForm.destination,
        emoji: editForm.emoji,
        arrival: editForm.arrival,
        departure: editForm.departure,
        budget: editForm.budget ? parseFloat(editForm.budget) : null,
      };
      await updateTrip(trip.id, updates);
      onEditTrip?.(updates);
      setShowEdit(false);
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Delete "${trip.groupName}"? All expenses, contacts and photos will be lost. This cannot be undone.`}
          confirmLabel="🗑️ Delete"
          confirmStyle="danger"
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmComplete && (
        <ConfirmDialog
          title="Mark as Completed?"
          message={`"${trip.groupName}" will be moved to Past Trips. You can restore it anytime.`}
          confirmLabel="✅ Mark Complete"
          confirmStyle="primary"
          onConfirm={() => { setConfirmComplete(false); onMarkComplete(); }}
          onCancel={() => setConfirmComplete(false)}
        />
      )}

      {/* Edit Trip Modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ background: '#f7f6f2', borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 1, borderRadius: '20px 20px 0 0' }}>
              <button onClick={() => setShowEdit(false)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Edit Trip Details</div>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.groupName || !editForm.destination || !editForm.arrival || !editForm.departure}
                style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !editForm.groupName || !editForm.destination) ? 0.4 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {/* Emoji */}
              <label style={S.label}>Trip Emoji</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '6px 0 14px' }}>
                {EMOJI_OPTIONS.map(e => (
                  <div key={e} onClick={() => setEditForm(f => ({ ...f, emoji: e }))}
                    style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer',
                      border: editForm.emoji === e ? `2px solid ${isSolo ? '#7F77DD' : '#1D9E75'}` : '0.5px solid rgba(0,0,0,0.12)',
                      background: editForm.emoji === e ? (isSolo ? '#EEEDFE' : '#E1F5EE') : '#fff' }}>
                    {e}
                  </div>
                ))}
              </div>

              {/* Name */}
              <label style={S.label}>{isSolo ? 'Adventure Name *' : 'Group Name *'}</label>
              <input style={{ ...S.input, marginBottom: 14 }} value={editForm.groupName}
                onChange={e => setEditForm(f => ({ ...f, groupName: e.target.value }))} />

              {/* Destination */}
              <label style={S.label}>Destination *</label>
              <input style={{ ...S.input, marginBottom: 14 }} value={editForm.destination}
                onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="e.g. Jaipur, Rajasthan" />

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>Arrival *</label>
                  <input style={S.input} type="date" value={editForm.arrival} min={today} max={maxDate}
                    onChange={e => setEditForm(f => ({ ...f, arrival: e.target.value, departure: f.departure && f.departure < e.target.value ? '' : f.departure }))} />
                </div>
                <div>
                  <label style={S.label}>Departure *</label>
                  <input style={S.input} type="date" value={editForm.departure} min={editForm.arrival || today} max={maxDate}
                    onChange={e => setEditForm(f => ({ ...f, departure: e.target.value }))} />
                </div>
              </div>

              {/* Budget */}
              <label style={S.label}>Budget ₹ (optional)</label>
              <input style={{ ...S.input, marginBottom: 14 }} type="number" value={editForm.budget}
                onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. 50000" />
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ ...S.btn, padding: '5px 9px', fontSize: 15, color: '#6b6b68', borderColor: 'rgba(0,0,0,0.12)' }}>
          ⋯
        </button>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 198 }} onClick={() => setOpen(false)} />
            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 199, minWidth: 190, overflow: 'hidden' }}>
              <button
                onClick={() => { setOpen(false); setShowEdit(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#378ADD', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)', textAlign: 'left' }}>
                ✏️ Edit Trip Details
              </button>
              {!trip.completed && (
                <button
                  onClick={() => { setOpen(false); setConfirmComplete(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#0F6E56', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)', textAlign: 'left' }}>
                  ✅ Mark as Completed
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setConfirmDelete(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#993C1D', fontFamily: "'DM Sans',sans-serif", textAlign: 'left' }}>
                🗑️ Delete Trip
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}











