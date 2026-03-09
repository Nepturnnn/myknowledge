import { useState, useRef, useEffect } from "react";

// ── API helper — calls OUR proxy, bukan Anthropic langsung ───────────────────
async function callClaude(messages, systemPrompt = "") {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: systemPrompt }),
  });
  const data = await res.json();
  return data.content?.map((b) => b.text || "").join("") || "";
}

const uid = () => Math.random().toString(36).slice(2, 9);

const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="8" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M21 21l-4.35-4.35" /></>,
    chat: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />,
    note: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    send: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    spark: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    brain: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
    summary: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h10" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {icons[name]}
    </svg>
  );
};

const TagPill = ({ label }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "rgba(234,179,8,0.12)", color: "#EAB308",
    border: "1px solid rgba(234,179,8,0.25)", borderRadius: 4,
    fontSize: 11, fontWeight: 600, padding: "2px 8px",
    letterSpacing: "0.04em", textTransform: "uppercase",
  }}>{label}</span>
);

const LoadingDots = () => (
  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width: 5, height: 5, borderRadius: "50%", background: "#EAB308",
        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
  </span>
);

export default function KnowledgeOS() {
  const [notes, setNotes] = useState([
    {
      id: uid(), title: "What is Knowledge Management?",
      content: "Knowledge management (KM) is the process of creating, sharing, using, and managing the knowledge and information of an organization or individual. It refers to a multidisciplinary approach to achieve organizational objectives by making the best use of knowledge.",
      tags: ["KM", "Productivity", "Organization"],
      summary: "KM is the systematic process of capturing, distributing, and effectively using knowledge to achieve goals.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: uid(), title: "Zettelkasten Method",
      content: "Zettelkasten is a note-taking and knowledge management method that uses a network of interconnected notes. Each note is an atomic idea — one thought, clearly written. Popularized by Niklas Luhmann who produced over 70 books using this system.",
      tags: ["Note-taking", "Zettelkasten", "Method"],
      summary: "Zettelkasten = atomic, interconnected notes forming a personal knowledge web.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  const [view, setView] = useState("notes");
  const [selectedNote, setSelectedNote] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hello! I have access to all your saved notes. Ask me anything from your knowledge base." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsProcessing(true);
    const noteBase = { id: uid(), title: newTitle, content: newContent, createdAt: new Date().toISOString() };
    try {
      setAiStatus("Generating tags...");
      const tagsRaw = await callClaude([{ role: "user", content: `Extract 3-5 concise topic tags for this note. Return ONLY a JSON array of strings, nothing else.\n\nTitle: ${newTitle}\n\nContent: ${newContent}` }],
        "You are a knowledge tagging assistant. Return ONLY valid JSON arrays. No explanation, no markdown, no code blocks.");
      let tags = [];
      try { const clean = tagsRaw.replace(/```json|```/g, "").trim(); tags = JSON.parse(clean); if (!Array.isArray(tags)) tags = []; } catch { tags = ["General"]; }

      setAiStatus("Summarizing...");
      const summary = await callClaude([{ role: "user", content: `Write a single-sentence summary (max 20 words):\n\nTitle: ${newTitle}\n\nContent: ${newContent}` }],
        "You are a concise summarization assistant. Return only the summary sentence, nothing else.");

      const note = { ...noteBase, tags, summary: summary.trim() };
      setNotes(prev => [note, ...prev]);
      setNewTitle(""); setNewContent(""); setView("notes"); setSelectedNote(note);
    } catch {
      setNotes(prev => [{ ...noteBase, tags: ["General"], summary: newContent.slice(0, 80) + "..." }, ...prev]);
      setView("notes");
    } finally { setIsProcessing(false); setAiStatus(""); }
  };

  const summarizeNote = async (note) => {
    setIsProcessing(true); setAiStatus("Summarizing...");
    try {
      const summary = await callClaude([{ role: "user", content: `Write a crisp 2-3 sentence summary:\n\nTitle: ${note.title}\n\nContent: ${note.content}` }], "You are a concise summarization assistant.");
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, summary: summary.trim() } : n));
      setSelectedNote(prev => ({ ...prev, summary: summary.trim() }));
    } finally { setIsProcessing(false); setAiStatus(""); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]); setChatInput(""); setIsChatLoading(true);
    const kb = notes.map(n => `## ${n.title}\nTags: ${n.tags.join(", ")}\n${n.content}`).join("\n\n---\n\n");
    try {
      const reply = await callClaude(
        [...chatMessages.filter((m, i) => i > 0), userMsg],
        `You are a helpful knowledge assistant. Answer questions based on these notes:\n\n${kb}\n\nIf the answer isn't in the notes, say so.`
      );
      setChatMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again." }]); }
    finally { setIsChatLoading(false); }
  };

  const searchNotes = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const listStr = notes.map((n, i) => `[${i}] ${n.title} | ${n.tags.join(", ")} | ${n.content.slice(0, 150)}`).join("\n");
      const raw = await callClaude([{ role: "user", content: `Query: "${searchQuery}"\nNotes:\n${listStr}\nReturn a JSON array of relevant indices (0-based). Max 5. Return ONLY the array.` }],
        "You are a semantic search engine. Return ONLY a valid JSON array of integers.");
      let indices = [];
      try { const clean = raw.replace(/```json|```/g, "").trim(); indices = JSON.parse(clean); if (!Array.isArray(indices)) indices = []; } catch { indices = []; }
      setSearchResults(indices.map(i => notes[i]).filter(Boolean));
    } finally { setIsSearching(false); }
  };

  const deleteNote = (id) => { setNotes(prev => prev.filter(n => n.id !== id)); if (selectedNote?.id === id) setSelectedNote(null); };
  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const S = {
    app: { minHeight: "100vh", background: "#0D0D0D", color: "#E8E0D5", fontFamily: "'Georgia', 'Times New Roman', serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
    header: { borderBottom: "1px solid #1E1E1E", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, flexShrink: 0 },
    logo: { display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "#E8E0D5" },
    logoIcon: { width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #EAB308, #CA8A04)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0D0D0D" },
    badge: { fontSize: 10, background: "rgba(234,179,8,0.15)", color: "#EAB308", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Courier New', monospace", fontWeight: 700 },
    body: { display: "flex", flex: 1, minHeight: 0, position: "relative", zIndex: 1 },
    sidebar: { width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0, borderRight: "1px solid #1A1A1A", background: "#0D0D0D", display: "flex", flexDirection: "column", transition: "width 0.25s ease, min-width 0.25s ease", overflow: "hidden", flexShrink: 0 },
    sidebarHeader: { padding: "16px 16px 12px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between" },
    sidebarTitle: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", fontFamily: "'Courier New', monospace" },
    navList: { flex: 1, overflowY: "auto", padding: "8px 0" },
    navItem: (active) => ({ padding: "10px 16px", cursor: "pointer", background: active ? "rgba(234,179,8,0.06)" : "transparent", borderLeft: active ? "2px solid #EAB308" : "2px solid transparent", display: "flex", flexDirection: "column", gap: 4, transition: "all 0.15s" }),
    navItemTitle: (active) => ({ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#E8E0D5" : "#888", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
    navItemMeta: { fontSize: 10, color: "#444", fontFamily: "'Courier New', monospace" },
    main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
    toolbar: { padding: "12px 24px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    toolBtn: (active) => ({ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", background: active ? "#EAB308" : "rgba(255,255,255,0.04)", color: active ? "#0D0D0D" : "#666", transition: "all 0.15s" }),
    content: { flex: 1, overflowY: "auto", padding: 32, maxWidth: 780, width: "100%" },
    noteTitle: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 12, color: "#E8E0D5" },
    noteBody: { fontSize: 15, lineHeight: 1.8, color: "#B0A898", marginBottom: 24 },
    summaryBox: { background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)", borderRadius: 8, padding: "16px 20px", marginBottom: 24 },
    summaryLabel: { fontSize: 10, color: "#EAB308", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Courier New', monospace", marginBottom: 8, fontWeight: 700 },
    summaryText: { fontSize: 14, color: "#C8BFB0", lineHeight: 1.6, fontStyle: "italic" },
    input: { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #222", color: "#E8E0D5", fontSize: 22, fontFamily: "'Georgia', serif", fontWeight: 700, padding: "8px 0 12px", outline: "none", letterSpacing: "-0.02em" },
    textarea: { width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid #1E1E1E", borderRadius: 8, color: "#C8BFB0", fontSize: 14, fontFamily: "'Georgia', serif", padding: "16px", outline: "none", resize: "vertical", lineHeight: 1.8, minHeight: 200 },
    primaryBtn: { display: "flex", alignItems: "center", gap: 8, background: "#EAB308", color: "#0D0D0D", border: "none", borderRadius: 7, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "0.04em", textTransform: "uppercase" },
    ghostBtn: { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", color: "#666", border: "1px solid #222", borderRadius: 7, padding: "11px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "0.04em", textTransform: "uppercase" },
    chatArea: { flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 },
    chatBubble: (role) => ({ maxWidth: "72%", alignSelf: role === "user" ? "flex-end" : "flex-start", background: role === "user" ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${role === "user" ? "rgba(234,179,8,0.2)" : "#1E1E1E"}`, borderRadius: role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", padding: "12px 16px", fontSize: 14, lineHeight: 1.7, color: role === "user" ? "#E8E0D5" : "#B0A898" }),
    chatInputWrap: { display: "flex", gap: 10, padding: "16px 32px", borderTop: "1px solid #1A1A1A", background: "rgba(13,13,13,0.9)", flexShrink: 0 },
    chatField: { flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid #222", borderRadius: 8, color: "#E8E0D5", fontSize: 14, fontFamily: "'Georgia', serif", padding: "11px 16px", outline: "none", resize: "none" },
    sendBtn: { background: "#EAB308", color: "#0D0D0D", border: "none", borderRadius: 8, width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" },
    searchBar: { display: "flex", gap: 10, marginBottom: 28, background: "rgba(255,255,255,0.03)", border: "1px solid #1E1E1E", borderRadius: 10, padding: "4px 4px 4px 16px", alignItems: "center" },
    searchInput: { flex: 1, background: "transparent", border: "none", color: "#E8E0D5", fontSize: 15, fontFamily: "'Georgia', serif", outline: "none", padding: "8px 0" },
    searchBtn: { background: "#EAB308", color: "#0D0D0D", border: "none", borderRadius: 7, padding: "9px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace", textTransform: "uppercase" },
    resultCard: { border: "1px solid #1A1A1A", borderRadius: 10, padding: "18px 20px", marginBottom: 14, cursor: "pointer", background: "rgba(255,255,255,0.02)" },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#333", padding: "60px 0", textAlign: "center" },
  };

  const renderNoteView = () => {
    const note = selectedNote;
    if (!note) return (
      <div style={S.emptyState}>
        <div style={{ color: "#2A2A2A" }}><Icon name="note" size={48} /></div>
        <div style={{ fontSize: 15, color: "#444" }}>Select a note or create a new one</div>
        <button style={S.primaryBtn} onClick={() => setView("new")}><Icon name="plus" size={14} /> New Note</button>
      </div>
    );
    return (
      <>
        <div style={{ marginBottom: 24, borderBottom: "1px solid #1A1A1A", paddingBottom: 20 }}>
          <div style={S.noteTitle}>{note.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>{formatDate(note.createdAt)}</span>
            {note.tags?.map(t => <TagPill key={t} label={t} />)}
            <button style={{ ...S.ghostBtn, padding: "5px 10px", fontSize: 11 }} onClick={() => summarizeNote(note)}><Icon name="summary" size={12} /> Re-summarize</button>
            <button style={{ ...S.ghostBtn, padding: "5px 10px", fontSize: 11, color: "#C53030", borderColor: "#2D1717" }} onClick={() => deleteNote(note.id)}><Icon name="trash" size={12} /></button>
          </div>
        </div>
        {note.summary && (
          <div style={S.summaryBox}>
            <div style={S.summaryLabel}><Icon name="spark" size={10} /> AI Summary</div>
            <div style={S.summaryText}>{note.summary}</div>
          </div>
        )}
        <div style={S.noteBody}>{note.content}</div>
      </>
    );
  };

  return (
    <div style={S.app}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; } @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } } button:disabled { opacity: 0.4; cursor: not-allowed; } textarea::placeholder, input::placeholder { color: #333; }`}</style>

      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 4 }}><Icon name="summary" size={18} /></button>
          <div style={S.logo}><div style={S.logoIcon}><Icon name="brain" size={14} /></div> KnowledgeOS</div>
          <span style={S.badge}>AI-Powered</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>{notes.length} notes</span>
          <button style={S.primaryBtn} onClick={() => { setView("new"); setSelectedNote(null); }}><Icon name="plus" size={14} /> New Note</button>
        </div>
      </header>

      <div style={S.body}>
        <aside style={S.sidebar}>
          <div style={S.sidebarHeader}><span style={S.sidebarTitle}>Notes</span></div>
          <div style={S.navList}>
            {notes.map(n => (
              <div key={n.id} style={S.navItem(selectedNote?.id === n.id)} onClick={() => { setSelectedNote(n); setView("notes"); }}>
                <div style={S.navItemTitle(selectedNote?.id === n.id)}>{n.title}</div>
                <div style={S.navItemMeta}>{formatDate(n.createdAt)}</div>
              </div>
            ))}
          </div>
        </aside>

        <main style={S.main}>
          <div style={S.toolbar}>
            {[{ id: "notes", icon: "note", label: "Notes" }, { id: "new", icon: "plus", label: "New" }, { id: "chat", icon: "chat", label: "Chat" }, { id: "search", icon: "search", label: "Search" }].map(({ id, icon, label }) => (
              <button key={id} style={S.toolBtn(view === id)} onClick={() => { setView(id); if (id !== "notes") setSelectedNote(null); }}><Icon name={icon} size={13} /> {label}</button>
            ))}
          </div>

          {view === "chat" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={S.chatArea}>
                {chatMessages.map((m, i) => <div key={i} style={S.chatBubble(m.role)}>{m.content}</div>)}
                {isChatLoading && <div style={{ ...S.chatBubble("assistant"), color: "#EAB308" }}><LoadingDots /></div>}
                <div ref={chatBottomRef} />
              </div>
              <div style={S.chatInputWrap}>
                <textarea style={S.chatField} rows={1} placeholder={`Ask anything across ${notes.length} notes...`} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
                <button style={S.sendBtn} onClick={sendChat} disabled={isChatLoading}><Icon name="send" size={16} /></button>
              </div>
            </div>
          ) : view === "search" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={S.content}>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 20, color: "#E8E0D5" }}>Find in your knowledge</h2>
                <div style={S.searchBar}>
                  <Icon name="search" size={16} />
                  <input style={S.searchInput} placeholder="Search by concept..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchNotes()} />
                  <button style={S.searchBtn} onClick={searchNotes} disabled={isSearching}>{isSearching ? <LoadingDots /> : <><Icon name="brain" size={14} /> Search</>}</button>
                </div>
                {searchResults.map(n => (
                  <div key={n.id} style={S.resultCard} onClick={() => { setSelectedNote(n); setView("notes"); }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#E8E0D5", marginBottom: 8 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 10 }}>{n.content.slice(0, 140)}...</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{n.tags?.map(t => <TagPill key={t} label={t} />)}</div>
                  </div>
                ))}
                {!searchQuery && (
                  <div>
                    <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>All Notes ({notes.length})</div>
                    {notes.map(n => (
                      <div key={n.id} style={S.resultCard} onClick={() => { setSelectedNote(n); setView("notes"); }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#E8E0D5", marginBottom: 6 }}>{n.title}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{n.tags?.map(t => <TagPill key={t} label={t} />)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : view === "new" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={S.content}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Title</div>
                  <input style={S.input} placeholder="Give your note a title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Content</div>
                  <textarea style={S.textarea} placeholder="Paste an article, write thoughts, or capture anything worth knowing..." value={newContent} onChange={e => setNewContent(e.target.value)} rows={10} />
                </div>
                {isProcessing && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "#EAB308", fontSize: 12, fontFamily: "monospace" }}><LoadingDots /> {aiStatus}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={S.primaryBtn} onClick={saveNote} disabled={isProcessing || !newTitle || !newContent}><Icon name="spark" size={14} /> {isProcessing ? "Processing..." : "Save with AI"}</button>
                  <button style={S.ghostBtn} onClick={() => setView("notes")}>Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={S.content}>{renderNoteView()}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
