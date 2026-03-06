import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  where,
} from "firebase/firestore";

// ── Firebase 설정 ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD1cRE4xMYwwNXoWztZGjBEZNY9fZLLYvY",
  authDomain: "west-f026c.firebaseapp.com",
  projectId: "west-f026c",
  storageBucket: "west-f026c.firebasestorage.app",
  messagingSenderId: "1054028702682",
  appId: "1:1054028702682:web:32b75dd2bcd48f500ad6e3",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── 상수 ──────────────────────────────────────────────────
const COHORTS = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  label: `${i + 1}기`,
  year: 2009 + i,
  regions: [
    ["뉴욕", "LA", "시카고"],
    ["뉴욕", "LA", "시애틀"],
    ["뉴욕", "LA", "보스턴", "시카고"],
    ["뉴욕", "LA", "워싱턴DC"],
    ["뉴욕", "LA", "시카고", "시애틀"],
    ["뉴욕", "LA", "보스턴"],
    ["뉴욕", "LA", "시카고", "워싱턴DC"],
    ["뉴욕", "LA", "시애틀", "보스턴"],
    ["뉴욕", "LA", "시카고"],
    ["뉴욕", "LA", "워싱턴DC", "시애틀"],
    ["뉴욕", "LA", "보스턴", "시카고"],
    ["뉴욕", "LA", "시카고", "워싱턴DC"],
    ["뉴욕", "LA", "시애틀", "보스턴", "워싱턴DC"],
    ["뉴욕", "LA", "시카고", "시애틀", "보스턴", "워싱턴DC"],
  ][i],
}));

const CATEGORIES = ["후기", "정보", "질문", "팁"];
const CAT_STYLE = {
  후기: { bg: "#d1fae5", text: "#065f46" },
  정보: { bg: "#dbeafe", text: "#1e3a8a" },
  질문: { bg: "#fef3c7", text: "#92400e" },
  팁: { bg: "#fce7f3", text: "#9d174d" },
};

// ── 유틸 ──────────────────────────────────────────────────
const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

// ── 소형 컴포넌트 ─────────────────────────────────────────
function Avatar({ user, size = 32 }) {
  return user?.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {(user?.displayName || "?")[0]}
    </div>
  );
}

function Badge({ children, bg = "#e2e8f0", color = "#475569" }) {
  return (
    <span
      style={{
        background: bg,
        color,
        padding: "2px 9px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #e2e8f0",
          borderTopColor: "#2d5be3",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── 글쓰기 모달 ───────────────────────────────────────────
function WriteModal({ user, onClose }) {
  const [form, setForm] = useState({
    cohort: "",
    region: "",
    category: "후기",
    title: "",
    content: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);
  const cohort = COHORTS.find((c) => c.id === Number(form.cohort));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (
      !form.cohort ||
      !form.region ||
      !form.title.trim() ||
      !form.content.trim()
    ) {
      alert("기수, 지역, 제목, 내용을 모두 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "posts"), {
        cohort: Number(form.cohort),
        region: form.region,
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,20,50,0.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
            borderRadius: "24px 24px 0 0",
            padding: "24px 28px",
            color: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 20 }}>✏️ 새 글 작성</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            경험과 정보를 공유해 후배들에게 도움을 주세요
          </div>
        </div>
        <div
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {[
              [
                "기수",
                <select
                  value={form.cohort}
                  onChange={(e) => {
                    set("cohort", e.target.value);
                    set("region", "");
                  }}
                  style={inputStyle}
                >
                  <option value="">선택</option>
                  {COHORTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.year})
                    </option>
                  ))}
                </select>,
              ],
              [
                "지역",
                <select
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  style={inputStyle}
                  disabled={!cohort}
                >
                  <option value="">선택</option>
                  {(cohort?.regions || []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>,
              ],
            ].map(([label, el]) => (
              <div key={label}>
                <label style={labelStyle}>{label} *</label>
                {el}
              </div>
            ))}
          </div>
          <div>
            <label style={labelStyle}>카테고리</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => set("category", cat)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: "1.5px solid",
                    borderColor: form.category === cat ? "#2d5be3" : "#e2e8f0",
                    background: form.category === cat ? "#eff4ff" : "#fff",
                    color: form.category === cat ? "#1e3a6e" : "#64748b",
                    fontWeight: form.category === cat ? 700 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>제목 *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="제목을 입력하세요"
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={labelStyle}>내용 *</label>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="내용을 자유롭게 작성해주세요..."
              rows={6}
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>태그 (쉼표로 구분)</label>
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="예: 합격후기, 비자, LA"
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: "1.5px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={loading}
              style={{
                flex: 2,
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: loading
                  ? "#94a3b8"
                  : "linear-gradient(135deg,#1e3a6e,#2d5be3)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "저장 중..." : "게시하기 🚀"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  color: "#1a2340",
  background: "#f8fafc",
  width: "100%",
};
const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  display: "block",
  marginBottom: 6,
};

// ── 게시글 카드 ───────────────────────────────────────────
function PostCard({ post, user, onClick }) {
  const cat = CAT_STYLE[post.category] || {};
  const [liked, setLiked] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert("좋아요는 로그인 후 가능해요!");
      return;
    }
    if (liked) return;
    setLiked(true);
    await updateDoc(doc(db, "posts", post.id), { likes: increment(1) });
  };

  return (
    <div
      onClick={() => onClick(post)}
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        border: "1.5px solid #e8ecf3",
        cursor: "pointer",
        marginBottom: 12,
        transition: "all 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(30,60,120,0.10)";
        e.currentTarget.style.borderColor = "#b9c6e0";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "#e8ecf3";
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 7,
          marginBottom: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Badge bg="#1e3a6e" color="#fff">
          {post.cohort}기
        </Badge>
        <Badge bg="#f0f4ff" color="#3b5bdb">
          {post.region}
        </Badge>
        <Badge bg={cat.bg} color={cat.text}>
          {post.category}
        </Badge>
      </div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 15,
          color: "#1a2340",
          marginBottom: 7,
          lineHeight: 1.4,
        }}
      >
        {post.title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#64748b",
          lineHeight: 1.65,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        {post.content}
      </div>
      {post.tags?.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {post.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                color: "#6b82b5",
                background: "#f0f4ff",
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar
            user={{ photoURL: post.authorPhoto, displayName: post.authorName }}
            size={24}
          />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {post.authorName} · {timeAgo(post.createdAt)}
          </span>
        </div>
        <div
          style={{ display: "flex", gap: 14, fontSize: 13, color: "#94a3b8" }}
        >
          <button
            onClick={handleLike}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: liked ? "#e11d48" : "#94a3b8",
              fontSize: 13,
              padding: 0,
              fontWeight: liked ? 700 : 400,
            }}
          >
            {liked ? "❤️" : "🤍"} {post.likes + (liked ? 1 : 0)}
          </button>
          <span>💬 {post.commentCount || 0}</span>
        </div>
      </div>
    </div>
  );
}

// ── 상세 모달 ─────────────────────────────────────────────
function PostModal({ post, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const cat = CAT_STYLE[post.category] || {};

  useEffect(() => {
    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt"),
    );
    const unsub = onSnapshot(q, (snap) =>
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return unsub;
  }, [post.id]);

  const addComment = async () => {
    if (!user) {
      alert("댓글은 로그인 후 가능해요!");
      return;
    }
    if (!text.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        text: text.trim(),
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), {
        commentCount: increment(1),
      });
      setText("");
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,20,50,0.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 660,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ padding: "28px 32px 0" }}>
          <div
            style={{
              display: "flex",
              gap: 7,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <Badge bg="#1e3a6e" color="#fff">
              {post.cohort}기
            </Badge>
            <Badge bg="#f0f4ff" color="#3b5bdb">
              {post.region}
            </Badge>
            <Badge bg={cat.bg} color={cat.text}>
              {post.category}
            </Badge>
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 20,
              color: "#1a2340",
              lineHeight: 1.4,
              marginBottom: 12,
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              paddingBottom: 20,
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <Avatar
              user={{
                photoURL: post.authorPhoto,
                displayName: post.authorName,
              }}
              size={32}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                {post.authorName}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {timeAgo(post.createdAt)}
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 14,
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              <span>❤️ {post.likes}</span>
              <span>💬 {post.commentCount || 0}</span>
            </div>
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#334155",
              lineHeight: 1.85,
              whiteSpace: "pre-wrap",
              marginBottom: 20,
            }}
          >
            {post.content}
          </div>
          {post.tags?.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 7,
                flexWrap: "wrap",
                paddingBottom: 20,
                borderBottom: "1px solid #f1f5f9",
                marginBottom: 20,
              }}
            >
              {post.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    color: "#6b82b5",
                    background: "#f0f4ff",
                    padding: "3px 10px",
                    borderRadius: 8,
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: "#1a2340",
              marginBottom: 14,
            }}
          >
            댓글 {comments.length}개
          </div>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#f8fafc",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 7,
                }}
              >
                <Avatar
                  user={{ photoURL: c.authorPhoto, displayName: c.authorName }}
                  size={26}
                />
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}
                >
                  {c.authorName}
                </span>
                <span
                  style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}
                >
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: 14, color: "#475569", paddingLeft: 34 }}>
                {c.text}
              </div>
            </div>
          ))}
          <div
            style={{ display: "flex", gap: 8, marginTop: 14, marginBottom: 28 }}
          >
            {user && <Avatar user={user} size={36} />}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && addComment()
              }
              placeholder={
                user
                  ? "댓글을 입력하세요... (Enter로 등록)"
                  : "로그인 후 댓글을 작성할 수 있어요"
              }
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                fontSize: 14,
              }}
            />
            <button
              onClick={addComment}
              disabled={loading || !user}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "#1e3a6e",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
                opacity: !user || loading ? 0.5 : 1,
              }}
            >
              등록
            </button>
          </div>
        </div>
        <div
          style={{
            padding: "0 32px 24px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              background: "#f8fafc",
              color: "#64748b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 사이드바 ──────────────────────────────────────────────
function Sidebar({
  selectedCohort,
  setSelectedCohort,
  selectedRegion,
  setSelectedRegion,
}) {
  const cohort = COHORTS.find((c) => c.id === selectedCohort);
  const menuItem = (label, active, onClick, sub) => (
    <div
      onClick={onClick}
      style={{
        padding: "9px 18px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        color: active ? (sub ? "#0369a1" : "#1e3a6e") : "#475569",
        background: active ? (sub ? "#f0f9ff" : "#eff4ff") : "transparent",
        borderLeft: `3px solid ${active ? (sub ? "#38bdf8" : "#2d5be3") : "transparent"}`,
        transition: "all 0.15s",
      }}
    >
      {label}
    </div>
  );
  return (
    <div style={{ width: 210, flexShrink: 0 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1.5px solid #e8ecf3",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
            padding: "14px 18px",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.06em",
          }}
        >
          기수 선택
        </div>
        <div style={{ maxHeight: 280, overflowY: "auto", padding: "6px 0" }}>
          {menuItem("전체 기수", !selectedCohort, () => {
            setSelectedCohort(null);
            setSelectedRegion(null);
          })}
          {COHORTS.map((c) =>
            menuItem(`${c.label}  (${c.year})`, selectedCohort === c.id, () => {
              setSelectedCohort(c.id);
              setSelectedRegion(null);
            }),
          )}
        </div>
      </div>
      {cohort && (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1.5px solid #e8ecf3",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg,#0f4c8a,#38bdf8)",
              padding: "14px 18px",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {cohort.label} 지역
          </div>
          <div style={{ padding: "6px 0" }}>
            {menuItem(
              "전체 지역",
              !selectedRegion,
              () => setSelectedRegion(null),
              true,
            )}
            {cohort.regions.map((r) =>
              menuItem(
                `📍 ${r}`,
                selectedRegion === r,
                () => setSelectedRegion(r),
                true,
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 APP ──────────────────────────────────────────────
export default function WestApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [showWrite, setShowWrite] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Auth 상태 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // 게시글 실시간 구독
  useEffect(() => {
    setPostsLoading(true);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPostsLoading(false);
    });
    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const filtered = posts.filter((p) => {
    if (selectedCohort && p.cohort !== selectedCohort) return false;
    if (selectedRegion && p.region !== selectedRegion) return false;
    if (selectedCategory !== "전체" && p.category !== selectedCategory)
      return false;
    if (
      search &&
      !p.title?.includes(search) &&
      !p.content?.includes(search) &&
      !p.authorName?.includes(search)
    )
      return false;
    return true;
  });

  const topPosts = [...posts]
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 3);

  if (authLoading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f4f7fb",
        }}
      >
        <Spinner />
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        minHeight: "100vh",
        background: "#f4f7fb",
        color: "#1a2340",
      }}
    >
      {/* NAV */}
      <nav
        style={{
          background: "#fff",
          borderBottom: "1.5px solid #e8ecf3",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 16px rgba(30,58,110,0.07)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            height: 62,
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginRight: "auto",
              cursor: "pointer",
            }}
            onClick={() => setTab("home")}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              W
            </div>
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 16,
                  color: "#1e3a6e",
                  lineHeight: 1.1,
                }}
              >
                WEST 커뮤니티
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  letterSpacing: "0.04em",
                }}
              >
                Work & English Study in the US
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {[
              ["home", "🏠 홈"],
              ["community", "💬 커뮤니티"],
              ["info", "📋 기수정보"],
              ["tips", "💡 꿀팁"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: tab === key ? 700 : 400,
                  background: tab === key ? "#eff4ff" : "transparent",
                  color: tab === key ? "#1e3a6e" : "#64748b",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setShowWrite(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ✏️ 글쓰기
              </button>
              <Avatar user={user} size={34} />
              <button
                onClick={logout}
                style={{
                  padding: "7px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "#1a2340",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <img
                src="https://www.google.com/favicon.ico"
                width={16}
                height={16}
                alt=""
              />
              Google 로그인
            </button>
          )}
        </div>
      </nav>

      {/* HOME */}
      {tab === "home" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
          <div
            style={{
              background:
                "linear-gradient(135deg,#1e3a6e 0%,#1565c0 50%,#2d5be3 100%)",
              borderRadius: 24,
              padding: "48px 40px",
              color: "#fff",
              marginBottom: 32,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -40,
                top: -40,
                width: 220,
                height: 220,
                background: "rgba(255,255,255,0.04)",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 60,
                bottom: -60,
                width: 160,
                height: 160,
                background: "rgba(255,255,255,0.04)",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.2em",
                opacity: 0.7,
                marginBottom: 12,
                fontWeight: 600,
              }}
            >
              🇺🇸 WEST PROGRAM COMMUNITY · 1기~14기
            </div>
            <div
              style={{
                fontWeight: 900,
                fontSize: "clamp(22px,4vw,34px)",
                lineHeight: 1.25,
                marginBottom: 14,
              }}
            >
              WEST 정보,
              <br />
              이제 한 곳에서 찾으세요
            </div>
            <div
              style={{
                fontSize: 15,
                opacity: 0.85,
                lineHeight: 1.75,
                marginBottom: 28,
              }}
            >
              기수별·지역별 합격 후기, 생활 정보, 꿀팁을
              <br />
              선배들이 직접 공유하는 커뮤니티입니다
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => setTab("community")}
                style={{
                  padding: "11px 26px",
                  borderRadius: 12,
                  background: "#fff",
                  color: "#1e3a6e",
                  fontWeight: 800,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                커뮤니티 보기 →
              </button>
              {user ? (
                <button
                  onClick={() => setShowWrite(true)}
                  style={{
                    padding: "11px 26px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    border: "1.5px solid rgba(255,255,255,0.3)",
                    cursor: "pointer",
                  }}
                >
                  후기 작성하기
                </button>
              ) : (
                <button
                  onClick={login}
                  style={{
                    padding: "11px 26px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    border: "1.5px solid rgba(255,255,255,0.3)",
                    cursor: "pointer",
                  }}
                >
                  Google로 시작하기
                </button>
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 14,
              marginBottom: 36,
            }}
          >
            {[
              ["📝", posts.length, "총 게시글"],
              ["🎓", "14기", "최신 기수"],
              ["📍", "6개", "파견 지역"],
              ["👥", "무제한", "커뮤니티"],
            ].map(([icon, val, label]) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "20px 16px",
                  textAlign: "center",
                  border: "1.5px solid #e8ecf3",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                <div
                  style={{ fontWeight: 900, fontSize: 20, color: "#1e3a6e" }}
                >
                  {val}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 16,
              color: "#1a2340",
            }}
          >
            🔥 인기 글
          </div>
          {postsLoading ? (
            <Spinner />
          ) : topPosts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#94a3b8",
                background: "#fff",
                borderRadius: 16,
                border: "1.5px solid #e8ecf3",
              }}
            >
              아직 게시글이 없어요. 첫 번째 글을 작성해보세요! 🚀
            </div>
          ) : (
            topPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                user={user}
                onClick={setSelectedPost}
              />
            ))
          )}
        </div>
      )}

      {/* COMMUNITY */}
      {tab === "community" && (
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "32px 20px",
            display: "flex",
            gap: 22,
            alignItems: "flex-start",
          }}
        >
          <Sidebar
            selectedCohort={selectedCohort}
            setSelectedCohort={setSelectedCohort}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "16px 18px",
                border: "1.5px solid #e8ecf3",
                marginBottom: 14,
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 제목, 내용, 작성자 검색..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  fontSize: 14,
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {["전체", ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 20,
                      border: "1.5px solid",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: selectedCategory === cat ? 700 : 400,
                      borderColor:
                        selectedCategory === cat ? "#2d5be3" : "#e2e8f0",
                      background: selectedCategory === cat ? "#eff4ff" : "#fff",
                      color: selectedCategory === cat ? "#1e3a6e" : "#64748b",
                    }}
                  >
                    {cat}
                  </button>
                ))}
                <span
                  style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}
                >
                  {filtered.length}개의 글
                </span>
              </div>
            </div>
            {postsLoading ? (
              <Spinner />
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#94a3b8",
                  background: "#fff",
                  borderRadius: 16,
                  border: "1.5px solid #e8ecf3",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 600 }}>게시글이 없어요</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  첫 번째 글을 작성해보세요!
                </div>
              </div>
            ) : (
              filtered.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  user={user}
                  onClick={setSelectedPost}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* INFO */}
      {tab === "info" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
            📋 기수별 정보
          </div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            1기(2009)부터 14기까지 파견 지역과 게시글을 확인하세요
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(270px,1fr))",
              gap: 16,
            }}
          >
            {COHORTS.map((c) => {
              const count = posts.filter((p) => p.cohort === c.id).length;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCohort(c.id);
                    setSelectedRegion(null);
                    setTab("community");
                  }}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1.5px solid #e8ecf3",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 32px rgba(30,60,120,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <div
                    style={{
                      background: `linear-gradient(135deg, hsl(${210 + c.id * 5},65%,28%), hsl(${220 + c.id * 5},75%,48%))`,
                      padding: "18px 20px",
                      color: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 24 }}>
                        {c.label}
                      </div>
                      <div
                        style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}
                      >
                        {c.year}년
                      </div>
                    </div>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      게시판 →
                    </div>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        fontWeight: 700,
                        marginBottom: 10,
                        letterSpacing: "0.04em",
                      }}
                    >
                      파견 지역
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {c.regions.map((r) => (
                        <span
                          key={r}
                          style={{
                            fontSize: 12,
                            background: "#f0f4ff",
                            color: "#3b5bdb",
                            padding: "3px 9px",
                            borderRadius: 8,
                          }}
                        >
                          📍{r}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      <span>게시글 {count}개</span>
                      <span style={{ color: "#3b5bdb", fontWeight: 600 }}>
                        자세히 보기 →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIPS */}
      {tab === "tips" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
            💡 꿀팁 & 합격 후기
          </div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            WEST 선배들이 직접 공유한 팁과 후기만 모았어요
          </div>
          {postsLoading ? (
            <Spinner />
          ) : (
            posts
              .filter((p) => p.category === "팁" || p.category === "후기")
              .sort((a, b) => (b.likes || 0) - (a.likes || 0))
              .map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  user={user}
                  onClick={setSelectedPost}
                />
              ))
          )}
          <div
            style={{
              background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
              borderRadius: 20,
              padding: "32px",
              color: "#fff",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 10 }}>🙋</div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
              당신의 경험을 나눠주세요!
            </div>
            <div style={{ opacity: 0.85, fontSize: 14, marginBottom: 20 }}>
              후배 지원자들에게 큰 힘이 됩니다
            </div>
            <button
              onClick={() => (user ? setShowWrite(true) : login())}
              style={{
                padding: "12px 28px",
                borderRadius: 12,
                background: "#fff",
                color: "#1e3a6e",
                fontWeight: 800,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              {user ? "꿀팁 공유하기" : "로그인 후 공유하기"}
            </button>
          </div>
        </div>
      )}

      {showWrite && (
        <WriteModal user={user} onClose={() => setShowWrite(false)} />
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
        />
      )}

      <footer
        style={{
          borderTop: "1.5px solid #e8ecf3",
          background: "#fff",
          marginTop: 60,
          padding: "24px 20px",
          textAlign: "center",
          fontSize: 12,
          color: "#94a3b8",
        }}
      >
        <div style={{ fontWeight: 800, color: "#1e3a6e", marginBottom: 4 }}>
          WEST 커뮤니티
        </div>
        <div>Work & English Study in the US · 1기~14기 비공식 커뮤니티</div>
        <div style={{ marginTop: 6, fontSize: 11 }}>
          Firebase Firestore 실시간 연동 · Google 소셜 로그인
        </div>
      </footer>
    </div>
  );
}
