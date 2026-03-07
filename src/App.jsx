import { useState, useEffect } from "react";
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
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from "firebase/firestore";

import westLogo from "./assets/logo.png";

// ── Firebase 설정 ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCMooXGqenYr9SlbUPvD8Kbg0tHoV_rts0", // 새로 발급한 키로 교체
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

// ── 단기/중기/장기 기수 데이터 ────────────────────────────
const PROGRAM_TYPES = {
  단기: {
    label: "단기",
    duration: "최장 6개월",
    color: "#0369a1",
    lightBg: "#f0f9ff",
    gradient: "linear-gradient(135deg,#0369a1,#38bdf8)",
    cohorts: Array.from({ length: 22 }, (_, i) => ({
      id: i + 1,
      label: `${i + 1}기`,
      regions: ["뉴욕", "LA", "시카고"].slice(0, 1 + (i % 3)),
    })),
  },
  중기: {
    label: "중기",
    duration: "최장 12개월",
    color: "#1e3a6e",
    lightBg: "#eff4ff",
    gradient: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
    cohorts: Array.from({ length: 22 }, (_, i) => ({
      id: i + 1,
      label: `${i + 1}기`,
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
        ["뉴욕", "LA", "시카고", "워싱턴DC"],
        ["뉴욕", "LA", "시애틀", "보스턴"],
        ["뉴욕", "LA", "시카고", "워싱턴DC", "시애틀"],
        ["뉴욕", "LA", "보스턴", "시카고"],
        ["뉴욕", "LA", "시카고", "시애틀"],
        ["뉴욕", "LA", "워싱턴DC", "보스턴"],
        ["뉴욕", "LA", "시카고", "시애틀", "워싱턴DC"],
        ["뉴욕", "LA", "시카고", "시애틀", "보스턴", "워싱턴DC"],
      ][i],
    })),
  },
  장기: {
    label: "장기",
    duration: "최장 18개월",
    color: "#065f46",
    lightBg: "#f0fdf4",
    gradient: "linear-gradient(135deg,#065f46,#10b981)",
    cohorts: Array.from({ length: 22 }, (_, i) => ({
      id: i + 1,
      label: `${i + 1}기`,
      regions: ["뉴욕", "LA", "시카고"].slice(0, 1 + (i % 2)),
    })),
  },
};

const CATEGORIES = ["후기", "정보", "질문", "팁"];
const CAT_STYLE = {
  후기: { bg: "#d1fae5", text: "#065f46" },
  정보: { bg: "#dbeafe", text: "#1e3a8a" },
  질문: { bg: "#fef3c7", text: "#92400e" },
  팁: { bg: "#fce7f3", text: "#9d174d" },
};

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

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

// ── 히어로 배너 캐러셀 ────────────────────────────────────
const SLIDES = [
  {
    gradient: "linear-gradient(135deg,#1e3a6e,#1565c0,#2d5be3)",
    tag: "🇺🇸 WEST PROGRAM COMMUNITY",
    title: "WEST 정보,\n이제 한 곳에서 찾으세요",
    desc: "단기·중기·장기 기수별 합격 후기, 생활 정보, 꿀팁을\n선배들이 직접 공유하는 커뮤니티입니다",
    btn1: { label: "커뮤니티 보기 →", type: "community" },
    btn2: { label: "후기 작성하기", type: "write" },
  },
  {
    gradient: "linear-gradient(135deg,#065f46,#059669,#10b981)",
    tag: "📋 기수 정보",
    title: "단기·중기·장기\n기수별 정보 한눈에",
    desc: "1기부터 22기까지 기수별 파견 지역,\n어학원, 인턴 정보를 확인하세요",
    btn1: { label: "기수정보 보기 →", type: "info" },
    btn2: null,
  },
  {
    gradient: "linear-gradient(135deg,#7c3aed,#6d28d9,#4f46e5)",
    tag: "💡 꿀팁 모음",
    title: "선배들이 알려주는\nWEST 꿀팁",
    desc: "비자 준비부터 현지 생활까지\n실전 꿀팁을 모아봤어요",
    btn1: { label: "꿀팁 보러가기 →", type: "tips" },
    btn2: null,
  },
  {
    gradient: "linear-gradient(135deg,#b45309,#d97706,#f59e0b)",
    tag: "✅ WEST 인증",
    title: "참가자 인증으로\n신뢰도를 높이세요",
    desc: "합격 서류 인증을 받으면\n✅ WEST 인증 회원 뱃지가 부여돼요",
    btn1: { label: "프로필에서 신청", type: "profile" },
    btn2: null,
  },
];

function HeroBanner({ user, onCommunity, onWrite }) {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % total), 4000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);
  const slide = SLIDES[current];

  const handleBtn = (type) => {
    if (type === "community") onCommunity();
    else if (type === "write") onWrite();
    else if (type === "info")
      document.querySelector?.('[data-tab="info"]')?.click();
    else if (type === "tips")
      document.querySelector?.('[data-tab="tips"]')?.click();
  };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 32,
      }}
    >
      {/* 슬라이드 */}
      <div
        style={{
          background: slide.gradient,
          padding: "48px 40px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.5s ease",
          minHeight: 200,
        }}
      >
        {/* 배경 원 */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 220,
            height: 220,
            background: "rgba(255,255,255,0.04)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 60,
            bottom: -60,
            width: 150,
            height: 150,
            background: "rgba(255,255,255,0.03)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        {/* 태그 */}
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.2em",
            opacity: 0.7,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          {slide.tag}
        </div>
        {/* 제목 */}
        <div
          style={{
            fontWeight: 900,
            fontSize: "clamp(22px,4vw,34px)",
            lineHeight: 1.25,
            marginBottom: 14,
            whiteSpace: "pre-line",
          }}
        >
          {slide.title}
        </div>
        {/* 설명 */}
        <div
          style={{
            fontSize: 15,
            opacity: 0.85,
            lineHeight: 1.75,
            marginBottom: 28,
            whiteSpace: "pre-line",
          }}
        >
          {slide.desc}
        </div>
        {/* 버튼 */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => handleBtn(slide.btn1.type)}
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
            {slide.btn1.label}
          </button>
          {slide.btn2 && (
            <button
              onClick={() => handleBtn(slide.btn2.type)}
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
              {user ? slide.btn2.label : "Google로 시작하기"}
            </button>
          )}
        </div>

        {/* 페이지 표시 + 화살표 */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            onClick={prev}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
            {current + 1} / {total}
          </span>
          <button
            onClick={next}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* 하단 도트 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          padding: "10px 0",
          background: "rgba(0,0,0,0.03)",
        }}
      >
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === current ? "#1e3a6e" : "#cbd5e1",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── 관리자 UID (본인 uid로 교체) ──────────────────────────
const ADMIN_UID = "6CgsiLklPVWTa2eyL911DgAmG6g1"; // Firebase Auth에서 본인 uid 복사해서 넣기

// ── 프로필 모달 ───────────────────────────────────────────
// targetUid: 볼 대상 uid / currentUser: 로그인한 사람
function ProfileModal({ currentUser, targetUid, onClose }) {
  const isMyProfile = currentUser?.uid === targetUid;
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    bio: "",
    programType: "중기",
    cohort: "",
    region: "",
    langSchool: "",
    internCompany: "",
  });
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const currentProgram = PROGRAM_TYPES[form.programType];
  const cohort = currentProgram?.cohorts.find(
    (c) => c.id === Number(form.cohort),
  );

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "users", targetUid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setForm({
          nickname: data.nickname || data.displayName || "",
          bio: data.bio || "",
          programType: data.programType || "중기",
          cohort: data.cohort?.toString() || "",
          region: data.region || "",
          langSchool: data.langSchool || "",
          internCompany: data.internCompany || "",
        });
      } else if (isMyProfile) {
        setEditing(true);
      }
    };
    load();
  }, [targetUid]);

  const save = async () => {
    if (!form.programType || !form.cohort || !form.region) {
      alert("기수와 지역을 선택해주세요");
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, "users", targetUid), {
        uid: targetUid,
        displayName: currentUser.displayName,
        nickname: form.nickname || currentUser.displayName,
        photoURL: currentUser.photoURL,
        bio: form.bio,
        programType: form.programType,
        cohort: Number(form.cohort),
        region: form.region,
        langSchool: form.langSchool,
        internCompany: form.internCompany,
        isVerified: profile?.isVerified || false,
        verifyStatus: profile?.verifyStatus || null,
        updatedAt: serverTimestamp(),
        createdAt: profile?.createdAt || serverTimestamp(),
      });
      const snap = await getDoc(doc(db, "users", targetUid));
      setProfile(snap.data());
      setEditing(false);
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
    setLoading(false);
  };

  const requestVerify = async () => {
    if (profile?.verifyStatus === "pending") {
      alert("이미 인증 신청 중이에요!");
      return;
    }
    if (profile?.isVerified) {
      alert("이미 인증된 계정이에요!");
      return;
    }
    if (!profile?.cohort) {
      alert("먼저 프로필을 저장해주세요!");
      return;
    }
    setVerifyLoading(true);
    try {
      await updateDoc(doc(db, "users", targetUid), { verifyStatus: "pending" });
      await addDoc(collection(db, "verifyRequests"), {
        uid: targetUid,
        displayName: profile.nickname || profile.displayName,
        programType: profile.programType,
        cohort: profile.cohort,
        region: profile.region,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setProfile((p) => ({ ...p, verifyStatus: "pending" }));
      alert("인증 신청 완료! 관리자 검토 후 승인돼요 😊");
    } catch (e) {
      alert("신청 실패: " + e.message);
    }
    setVerifyLoading(false);
  };

  const pt = profile?.programType ? PROGRAM_TYPES[profile.programType] : null;
  const displayName = profile?.nickname || profile?.displayName || "알 수 없음";
  const photoURL = profile?.photoURL || currentUser?.photoURL;

  // 프로필 항목 행 컴포넌트
  const InfoRow = ({ icon, label, value }) =>
    value ? (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "12px 0",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            fontSize: 18,
            width: 24,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 14, color: "#1a2340", fontWeight: 500 }}>
            {value}
          </div>
        </div>
      </div>
    ) : null;

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
          maxWidth: 480,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
            borderRadius: "24px 24px 0 0",
            padding: "28px",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              margin: "0 auto 12px",
              border: "3px solid rgba(255,255,255,0.4)",
              overflow: "hidden",
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 900,
                }}
              >
                {displayName[0]}
              </div>
            )}
          </div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{displayName}</div>
          {isMyProfile && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>
              {currentUser.email}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            {profile?.isVerified ? (
              <span
                style={{
                  background: "rgba(16,185,129,0.3)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✅ WEST 인증 회원
              </span>
            ) : profile?.verifyStatus === "pending" ? (
              <span
                style={{
                  background: "rgba(245,158,11,0.3)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ⏳ 인증 심사 중
              </span>
            ) : null}
            {isMyProfile && (
              <span
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                }}
              >
                나의 프로필
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {!editing ? (
            <>
              {/* 한줄 소개 */}
              {profile?.bio && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 16,
                    fontSize: 14,
                    color: "#475569",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  "{profile.bio}"
                </div>
              )}

              {/* 정보 항목들 */}
              {profile ? (
                <div style={{ marginBottom: 16 }}>
                  <InfoRow
                    icon="🎓"
                    label="프로그램"
                    value={
                      profile.programType
                        ? `${profile.programType} (${profile.programType === "단기" ? "최장 6개월" : profile.programType === "중기" ? "최장 12개월" : "최장 18개월"})`
                        : null
                    }
                  />
                  <InfoRow
                    icon="🔢"
                    label="기수"
                    value={profile.cohort ? `${profile.cohort}기` : null}
                  />
                  <InfoRow icon="📍" label="파견 지역" value={profile.region} />
                  <InfoRow
                    icon="🏫"
                    label="어학원"
                    value={profile.langSchool}
                  />
                  <InfoRow
                    icon="🏢"
                    label="인턴 기업"
                    value={profile.internCompany}
                  />
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 0",
                    color: "#94a3b8",
                    fontSize: 14,
                  }}
                >
                  {isMyProfile
                    ? "프로필을 작성해주세요!"
                    : "아직 프로필이 없어요"}
                </div>
              )}

              {/* 본인만 수정/인증 신청 버튼 */}
              {isMyProfile && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 12,
                      border: "1.5px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ✏️ 프로필 수정
                  </button>
                  {!profile?.isVerified && (
                    <button
                      onClick={requestVerify}
                      disabled={
                        verifyLoading || profile?.verifyStatus === "pending"
                      }
                      style={{
                        flex: 2,
                        padding: "10px",
                        borderRadius: 12,
                        border: "none",
                        background:
                          profile?.verifyStatus === "pending"
                            ? "#94a3b8"
                            : "linear-gradient(135deg,#f59e0b,#d97706)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor:
                          profile?.verifyStatus === "pending"
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {profile?.verifyStatus === "pending"
                        ? "⏳ 인증 심사 중"
                        : "🎓 WEST 인증 신청"}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── 편집 모드 (본인만) ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>닉네임</label>
                <input
                  value={form.nickname}
                  onChange={(e) => set("nickname", e.target.value)}
                  placeholder="표시될 이름"
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>한줄 소개</label>
                <input
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="예: 중기 14기 LA 파견, 현재 취업 준비 중"
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>프로그램 유형 *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(PROGRAM_TYPES).map(([type, val]) => (
                    <button
                      key={type}
                      onClick={() => {
                        set("programType", type);
                        set("cohort", "");
                        set("region", "");
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 6px",
                        borderRadius: 12,
                        border: "1.5px solid",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: form.programType === type ? 800 : 400,
                        borderColor:
                          form.programType === type ? val.color : "#e2e8f0",
                        background:
                          form.programType === type ? val.lightBg : "#fff",
                        color:
                          form.programType === type ? val.color : "#64748b",
                        textAlign: "center",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>기수 *</label>
                  <select
                    value={form.cohort}
                    onChange={(e) => {
                      set("cohort", e.target.value);
                      set("region", "");
                    }}
                    style={inputStyle}
                  >
                    <option value="">선택</option>
                    {currentProgram.cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>파견 지역 *</label>
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
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>어학원</label>
                <input
                  value={form.langSchool}
                  onChange={(e) => set("langSchool", e.target.value)}
                  placeholder="예: EC New York, Kaplan LA"
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>인턴 기업</label>
                <input
                  value={form.internCompany}
                  onChange={(e) => set("internCompany", e.target.value)}
                  placeholder="예: Google, 한국 무역관"
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {profile && (
                  <button
                    onClick={() => setEditing(false)}
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
                )}
                <button
                  onClick={save}
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
                  {loading ? "저장 중..." : "저장하기 ✅"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              marginTop: 16,
              padding: "10px",
              borderRadius: 12,
              border: "1.5px solid #e2e8f0",
              background: "#f8fafc",
              color: "#94a3b8",
              fontSize: 13,
              cursor: "pointer",
              width: "100%",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 관리자 인증 페이지 ────────────────────────────────────
function AdminPage({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "verifyRequests"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const approve = async (req) => {
    try {
      await updateDoc(doc(db, "users", req.uid), {
        isVerified: true,
        verifyStatus: "verified",
      });
      await updateDoc(doc(db, "verifyRequests", req.id), {
        status: "verified",
      });
      alert(`${req.displayName} 인증 승인 완료!`);
    } catch (e) {
      alert("오류: " + e.message);
    }
  };

  const reject = async (req) => {
    try {
      await updateDoc(doc(db, "users", req.uid), { verifyStatus: null });
      await updateDoc(doc(db, "verifyRequests", req.id), {
        status: "rejected",
      });
      alert(`${req.displayName} 인증 거절됨`);
    } catch (e) {
      alert("오류: " + e.message);
    }
  };

  if (user?.uid !== ADMIN_UID)
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "80px auto",
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          관리자만 접근 가능해요
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
        🔐 관리자 - 인증 승인
      </div>
      <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
        WEST 참가 인증 신청 목록이에요
      </div>
      {loading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "#94a3b8",
            background: "#fff",
            borderRadius: 16,
            border: "1.5px solid #e8ecf3",
          }}
        >
          신청 내역이 없어요
        </div>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "20px 24px",
              border: "1.5px solid #e8ecf3",
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#1a2340",
                  marginBottom: 6,
                }}
              >
                {req.displayName}
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#1e3a6e",
                    color: "#fff",
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  {req.programType}
                </span>
                <span
                  style={{
                    background: "#f0f4ff",
                    color: "#3b5bdb",
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  {req.cohort}기
                </span>
                <span
                  style={{
                    background: "#f0fdf4",
                    color: "#065f46",
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  📍{req.region}
                </span>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    background:
                      req.status === "pending"
                        ? "#fef3c7"
                        : req.status === "verified"
                          ? "#d1fae5"
                          : "#fee2e2",
                    color:
                      req.status === "pending"
                        ? "#92400e"
                        : req.status === "verified"
                          ? "#065f46"
                          : "#991b1b",
                  }}
                >
                  {req.status === "pending"
                    ? "⏳ 대기중"
                    : req.status === "verified"
                      ? "✅ 승인됨"
                      : "❌ 거절됨"}
                </span>
              </div>
            </div>
            {req.status === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => approve(req)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg,#065f46,#10b981)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  승인
                </button>
                <button
                  onClick={() => reject(req)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  거절
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── 글쓰기 모달 ───────────────────────────────────────────
function WriteModal({ user, onClose, editPost = null }) {
  const [form, setForm] = useState({
    programType: editPost?.programType || "중기",
    cohort: editPost?.cohort?.toString() || "",
    region: editPost?.region || "",
    category: editPost?.category || "후기",
    title: editPost?.title || "",
    content: editPost?.content || "",
    tags: editPost?.tags?.join(", ") || "",
  });
  const [isAnonymous, setIsAnonymous] = useState(
    editPost?.isAnonymous || false,
  );
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const currentProgram = PROGRAM_TYPES[form.programType];
  const cohort = currentProgram.cohorts.find(
    (c) => c.id === Number(form.cohort),
  );

  const submit = async () => {
    if (
      !form.cohort ||
      !form.region ||
      !form.title.trim() ||
      !form.content.trim()
    ) {
      alert("모든 항목을 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const data = {
        programType: form.programType,
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
        authorName: isAnonymous ? "익명" : user.displayName,
        authorPhoto: isAnonymous ? null : user.photoURL,
        isAnonymous,
      };
      if (editPost) {
        await updateDoc(doc(db, "posts", editPost.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "posts"), {
          ...data,
          likes: 0,
          commentCount: 0,
          createdAt: serverTimestamp(),
        });
      }
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
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {editPost ? "✏️ 글 수정" : "✏️ 새 글 작성"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            {editPost
              ? "내용을 수정하고 저장하세요"
              : "경험과 정보를 공유해 후배들에게 도움을 주세요"}
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
          <div>
            <label style={labelStyle}>프로그램 유형 *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(PROGRAM_TYPES).map(([type, val]) => (
                <button
                  key={type}
                  onClick={() => {
                    set("programType", type);
                    set("cohort", "");
                    set("region", "");
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 6px",
                    borderRadius: 12,
                    border: "1.5px solid",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: form.programType === type ? 800 : 400,
                    borderColor:
                      form.programType === type ? val.color : "#e2e8f0",
                    background:
                      form.programType === type ? val.lightBg : "#fff",
                    color: form.programType === type ? val.color : "#64748b",
                    textAlign: "center",
                  }}
                >
                  {type}
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                    {val.duration}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>기수 *</label>
              <select
                value={form.cohort}
                onChange={(e) => {
                  set("cohort", e.target.value);
                  set("region", "");
                }}
                style={inputStyle}
              >
                <option value="">선택</option>
                {currentProgram.cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>지역 *</label>
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
              </select>
            </div>
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
          {/* 익명 선택 */}
          <div
            onClick={() => setIsAnonymous(!isAnonymous)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1.5px solid ${isAnonymous ? "#f59e0b" : "#e2e8f0"}`,
              background: isAnonymous ? "#fffbeb" : "#f8fafc",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                border: `2px solid ${isAnonymous ? "#f59e0b" : "#cbd5e1"}`,
                background: isAnonymous ? "#f59e0b" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isAnonymous && (
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>
                  ✓
                </span>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isAnonymous ? "#92400e" : "#475569",
                }}
              >
                익명으로 게시
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                작성자 이름과 프로필 사진이 숨겨져요
              </div>
            </div>
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
              {loading
                ? "저장 중..."
                : editPost
                  ? "수정 완료 ✅"
                  : "게시하기 🚀"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 게시글 카드 ───────────────────────────────────────────
function PostCard({ post, user, onClick, onEdit, onProfileClick }) {
  const cat = CAT_STYLE[post.category] || {};
  const pt = PROGRAM_TYPES[post.programType];
  const [liked, setLiked] = useState(false);
  const isAuthor = user?.uid === post.authorId;

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
        {pt && (
          <Badge bg={pt.color} color="#fff">
            {post.programType}
          </Badge>
        )}
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
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!post.isAnonymous) onProfileClick?.(post.authorId);
            }}
            style={{ cursor: post.isAnonymous ? "default" : "pointer" }}
          >
            <Avatar
              user={{
                photoURL: post.isAnonymous ? null : post.authorPhoto,
                displayName: post.authorName,
              }}
              size={24}
            />
          </div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (!post.isAnonymous) onProfileClick?.(post.authorId);
            }}
            style={{
              fontSize: 12,
              color: "#94a3b8",
              cursor: post.isAnonymous ? "default" : "pointer",
            }}
          >
            {post.authorName} · {timeAgo(post.createdAt)}
            {post.updatedAt && (
              <span style={{ color: "#cbd5e1" }}> (수정됨)</span>
            )}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isAuthor && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(post);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 12,
                padding: 0,
              }}
            >
              수정
            </button>
          )}
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
          <span style={{ color: "#94a3b8" }}>💬 {post.commentCount || 0}</span>
        </div>
      </div>
    </div>
  );
}

// ── 상세 모달 ─────────────────────────────────────────────
function PostModal({ post, user, onClose, onEdit }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const cat = CAT_STYLE[post.category] || {};
  const pt = PROGRAM_TYPES[post.programType];

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
            {pt && (
              <Badge bg={pt.color} color="#fff">
                {post.programType}
              </Badge>
            )}
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
                photoURL: post.isAnonymous ? null : post.authorPhoto,
                displayName: post.authorName,
              }}
              size={32}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                {post.authorName}
                {post.isAnonymous && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#f59e0b",
                      marginLeft: 6,
                      background: "#fffbeb",
                      padding: "1px 7px",
                      borderRadius: 8,
                    }}
                  >
                    익명
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {timeAgo(post.createdAt)}
                {post.updatedAt && (
                  <span style={{ color: "#cbd5e1" }}> · 수정됨</span>
                )}
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 14,
                fontSize: 13,
                color: "#94a3b8",
                alignItems: "center",
              }}
            >
              {user?.uid === post.authorId && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(post);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✏️ 수정
                </button>
              )}
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
                  ? "댓글 입력... (Enter로 등록)"
                  : "로그인 후 댓글 작성 가능"
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

// ── 커뮤니티 사이드바 ─────────────────────────────────────
function Sidebar({
  selectedProgramType,
  setSelectedProgramType,
  selectedCohort,
  setSelectedCohort,
  selectedRegion,
  setSelectedRegion,
}) {
  const program = selectedProgramType
    ? PROGRAM_TYPES[selectedProgramType]
    : null;
  const cohort = program?.cohorts.find((c) => c.id === selectedCohort);

  const menuItem = (
    label,
    active,
    onClick,
    color = "#2d5be3",
    lightBg = "#eff4ff",
  ) => (
    <div
      onClick={onClick}
      style={{
        padding: "9px 18px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        color: active ? color : "#475569",
        background: active ? lightBg : "transparent",
        borderLeft: `3px solid ${active ? color : "transparent"}`,
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
          }}
        >
          프로그램 유형
        </div>
        <div style={{ padding: "6px 0" }}>
          {menuItem("전체", !selectedProgramType, () => {
            setSelectedProgramType(null);
            setSelectedCohort(null);
            setSelectedRegion(null);
          })}
          {Object.entries(PROGRAM_TYPES).map(([key, val]) =>
            menuItem(
              `${key} · ${val.duration}`,
              selectedProgramType === key,
              () => {
                setSelectedProgramType(key);
                setSelectedCohort(null);
                setSelectedRegion(null);
              },
              val.color,
              val.lightBg,
            ),
          )}
        </div>
      </div>
      {program && (
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
              background: program.gradient,
              padding: "14px 18px",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {selectedProgramType} 기수
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "6px 0" }}>
            {menuItem(
              "전체 기수",
              !selectedCohort,
              () => {
                setSelectedCohort(null);
                setSelectedRegion(null);
              },
              program.color,
              program.lightBg,
            )}
            {program.cohorts.map((c) =>
              menuItem(
                c.label,
                selectedCohort === c.id,
                () => {
                  setSelectedCohort(c.id);
                  setSelectedRegion(null);
                },
                program.color,
                program.lightBg,
              ),
            )}
          </div>
        </div>
      )}
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
              background: program.gradient,
              padding: "14px 18px",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {selectedCohort}기 지역
          </div>
          <div style={{ padding: "6px 0" }}>
            {menuItem(
              "전체 지역",
              !selectedRegion,
              () => setSelectedRegion(null),
              program.color,
              program.lightBg,
            )}
            {cohort.regions.map((r) =>
              menuItem(
                `📍 ${r}`,
                selectedRegion === r,
                () => setSelectedRegion(r),
                program.color,
                program.lightBg,
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 기수정보 3열 컬럼 ─────────────────────────────────────
function CohortColumn({ type, posts, onSelect }) {
  const program = PROGRAM_TYPES[type];
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          background: program.gradient,
          borderRadius: "16px 16px 0 0",
          padding: "20px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 20 }}>{type}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
          {program.duration}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          1기 ~ 22기
        </div>
      </div>
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #e8ecf3",
          borderTop: "none",
          borderRadius: "0 0 16px 16px",
          overflow: "hidden",
        }}
      >
        {program.cohorts.map((c, idx) => {
          const count = posts.filter(
            (p) => p.programType === type && p.cohort === c.id,
          ).length;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(type, c.id)}
              style={{
                padding: "11px 16px",
                borderBottom:
                  idx < program.cohorts.length - 1
                    ? "1px solid #f1f5f9"
                    : "none",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = program.lightBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div>
                <div
                  style={{ fontWeight: 700, fontSize: 13, color: "#1a2340" }}
                >
                  {c.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    flexWrap: "wrap",
                    marginTop: 3,
                  }}
                >
                  {c.regions.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 10,
                        color: program.color,
                        background: program.lightBg,
                        padding: "1px 5px",
                        borderRadius: 5,
                      }}
                    >
                      📍{r}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 3,
                }}
              >
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      background: program.color,
                      color: "#fff",
                      padding: "1px 7px",
                      borderRadius: 8,
                      fontWeight: 700,
                    }}
                  >
                    {count}개
                  </span>
                )}
                <span style={{ fontSize: 11, color: program.color }}>→</span>
              </div>
            </div>
          );
        })}
      </div>
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
  const [selectedProgramType, setSelectedProgramType] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [showWrite, setShowWrite] = useState(false);
  const [showProfile, setShowProfile] = useState(null); // uid 저장
  const [editPost, setEditPost] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const handleEdit = (post) => {
    setEditPost(post);
    setShowWrite(true);
  };

  // 반응형 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

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
    if (selectedProgramType && p.programType !== selectedProgramType)
      return false;
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

  const handleCohortSelect = (type, cohortId) => {
    setSelectedProgramType(type);
    setSelectedCohort(cohortId);
    setSelectedRegion(null);
    setTab("community");
  };

  if (authLoading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
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
      {/* 반응형 스타일 */}
      <style>{`
        @media (max-width: 640px) {
          .nav-subtitle {
            display: none !important;
          }
        }
        
        /* 모바일에서 버튼 텍스트 크기 조정 */
        @media (max-width: 480px) {
          button {
            font-size: 12px !important;
          }
        }
      `}</style>

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
            maxWidth: 1200,
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
            <img
              src={westLogo}
              alt="WEST 로고"
              style={{
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: isMobile ? 14 : 16,
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
                  display: isMobile ? "none" : "block",
                }}
                className="nav-subtitle"
              >
                Work & English Study in the US
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {[
              ["home", "🏠", "홈"],
              ["community", "💬", "커뮤니티"],
              ["info", "📋", "기수정보"],
              ["tips", "💡", "꿀팁"],
              ...(user?.uid === ADMIN_UID ? [["admin", "🔐", "관리자"]] : []),
            ].map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: isMobile ? "7px 10px" : "7px 13px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: tab === key ? 700 : 400,
                  background: tab === key ? "#eff4ff" : "transparent",
                  color: tab === key ? "#1e3a6e" : "#64748b",
                }}
              >
                {isMobile ? icon : `${icon} ${label}`}
              </button>
            ))}
          </div>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setShowWrite(true)}
                style={{
                  padding: isMobile ? "8px 12px" : "8px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#1e3a6e,#2d5be3)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {isMobile ? "✏️" : "✏️ 글쓰기"}
              </button>
              <div
                onClick={() => setShowProfile(user.uid)}
                style={{ cursor: "pointer" }}
                title="프로필"
              >
                <Avatar user={user} size={isMobile ? 32 : 34} />
              </div>
              {!isMobile && (
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
              )}
            </div>
          ) : (
            <button
              onClick={login}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: isMobile ? "8px 12px" : "8px 18px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                fontWeight: 700,
                fontSize: isMobile ? 12 : 13,
                cursor: "pointer",
              }}
            >
              <img
                src="https://www.google.com/favicon.ico"
                width={16}
                height={16}
                alt=""
              />
              {isMobile ? "로그인" : "Google 로그인"}
            </button>
          )}
        </div>
      </nav>

      {/* HOME */}
      {tab === "home" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
          <div
            style={{
              background: "linear-gradient(135deg,#1e3a6e,#1565c0,#2d5be3)",
              borderRadius: isMobile ? 16 : 24,
              padding: isMobile ? "32px 20px" : "48px 40px",
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
                fontSize: isMobile ? 10 : 12,
                letterSpacing: "0.2em",
                opacity: 0.7,
                marginBottom: 12,
                fontWeight: 600,
              }}
            >
              🇺🇸 WEST PROGRAM COMMUNITY
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
                fontSize: isMobile ? 13 : 15,
                opacity: 0.85,
                lineHeight: 1.75,
                marginBottom: 28,
              }}
            >
              {isMobile ? (
                "단기·중기·장기 기수별 합격 후기, 생활 정보, 꿀팁을 선배들이 직접 공유하는 커뮤니티입니다"
              ) : (
                <>
                  단기·중기·장기 기수별 합격 후기, 생활 정보, 꿀팁을
                  <br />
                  선배들이 직접 공유하는 커뮤니티입니다
                </>
              )}
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
              <button
                onClick={() => (user ? setShowWrite(true) : login())}
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
                {user ? "후기 작성하기" : "Google로 시작하기"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
              gap: 14,
              marginBottom: 32,
            }}
          >
            {[
              ["📝", posts.length, "총 게시글"],
              ["🎓", "단기 10기 · 중기 14기 · 장기 10기", "진행중인 기수"],
              ["📍", "파견지역", "뉴욕, LA, 시카고, 시애틀, 보스턴, 워싱턴DC"],
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

          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
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
                onEdit={handleEdit}
                onProfileClick={setShowProfile}
              />
            ))
          )}
        </div>
      )}

      {/* COMMUNITY */}
      {tab === "community" && (
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile ? "20px 16px" : "32px 20px",
            display: "flex",
            gap: 22,
            alignItems: "flex-start",
          }}
        >
          {!isMobile && (
            <Sidebar
              selectedProgramType={selectedProgramType}
              setSelectedProgramType={setSelectedProgramType}
              selectedCohort={selectedCohort}
              setSelectedCohort={setSelectedCohort}
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
            />
          )}
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
                  onEdit={handleEdit}
                  onProfileClick={setShowProfile}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* INFO - 단기/중기/장기 3열 */}
      {tab === "info" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
            📋 기수별 정보
          </div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            단기·중기·장기 프로그램별로 1기부터 22기까지 확인하세요. 기수를
            클릭하면 해당 게시판으로 이동해요.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: 20,
            }}
          >
            {["단기", "중기", "장기"].map((type) => (
              <CohortColumn
                key={type}
                type={type}
                posts={posts}
                onSelect={handleCohortSelect}
              />
            ))}
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
                  onEdit={handleEdit}
                  onProfileClick={setShowProfile}
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

      {/* ADMIN */}
      {tab === "admin" && <AdminPage user={user} />}

      {showWrite && (
        <WriteModal
          user={user}
          editPost={editPost}
          onClose={() => {
            setShowWrite(false);
            setEditPost(null);
          }}
        />
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
          onEdit={handleEdit}
          onProfileClick={setShowProfile}
        />
      )}
      {showProfile && (
        <ProfileModal
          currentUser={user}
          targetUid={showProfile}
          onClose={() => setShowProfile(null)}
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
        <div>
          Work & English Study in the US · 단기·중기·장기 비공식 커뮤니티
        </div>
        <div style={{ marginTop: 6, fontSize: 11 }}>
          Firebase Firestore 실시간 연동 · Google 소셜 로그인
        </div>
      </footer>
    </div>
  );
}
