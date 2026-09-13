import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSessionList,
  fetchSessionMessages,
  createSessionRow,
  updateSessionTitle,
  saveUserMessage,
  saveAgentMessage,
  saveReport,
} from '../lib/Sessionsapi';
import { getModelReply } from '../lib/modelAPI';
import { MODEL_META } from '../lib/Modelmeta';
import { generateSessionReport } from '../lib/Reportpdf';
import { uid, createSession, deriveTitle, isPersistedSessionId, readPersistedUi, persistUi, MODEL_OPTIONS } from '../lib/Sessionhelpers';
import { model1PlaceholderDataUrl } from '../lib/model1API';
import { IconCrosshair, IconAttach, IconSend, IconClose, IconImage, IconMenu } from './icons';

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function SatQueryChat({ onBack, onOpenProfile }) {
  const { user, displayName, avatarUrl } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [inputText, setInputText] = useState(() => readPersistedUi().inputText || '');
  const [pendingImages, setPendingImages] = useState([]);
  const [beforeImage, setBeforeImage] = useState(() => readPersistedUi().beforeImage || null);
  const [afterImage, setAfterImage] = useState(() => readPersistedUi().afterImage || null);
  const [isThinking, setIsThinking] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState(null);
  const [showChangeMap, setShowChangeMap] = useState(true);
  const [sliderPct, setSliderPct] = useState(50);
  const [notice, setNotice] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = readPersistedUi().selectedModel;
    return MODEL_OPTIONS.some((m) => m.id === saved) ? saved : null;
  });

  const draftsRef = useRef({});
  const fileInputRef = useRef(null);
  const viewportRef = useRef(null);
  const draggingRef = useRef(false);
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // On login, pull the user's past sessions and open the most recent one
  // so "log back in and see previous chats" works without extra clicks.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setIsHistoryLoading(true);
      try {
        const list = await fetchSessionList(user.id);
        if (cancelled) return;

        if (list.length === 0) {
          try {
            const created = await createSessionRow(user.id, 'New session');
            if (cancelled) return;
            setSessions([{ id: created.id, title: created.title, messages: [] }]);
            setActiveSessionId(created.id);
            persistUi({ activeSessionId: created.id, userId: user.id });
          } catch {
            if (cancelled) return;
            const local = createSession();
            setSessions([local]);
            setActiveSessionId(local.id);
            persistUi({ activeSessionId: local.id, userId: user.id });
            setNotice('Working locally \u2014 replies will show here but will not sync.');
          }
        } else {
          const savedId = readPersistedUi().userId === user.id ? readPersistedUi().activeSessionId : null;
          const openId = list.some((s) => s.id === savedId) ? savedId : list[0].id;
          let history = [];
          try {
            history = await fetchSessionMessages(openId);
          } catch {
            setNotice('Could not load older messages \u2014 you can still send a new query.');
          }
          if (cancelled) return;
          const hydrated = list.map((s) => (s.id === openId ? { ...s, messages: history } : s));
          setSessions(hydrated);
          setActiveSessionId(openId);
          persistUi({ activeSessionId: openId, userId: user.id });
          const lastAgent = [...history].reverse().find((m) => m.role === 'agent');
          if (lastAgent) {
            setActiveMessageId(lastAgent.id);
            setSelectedDetectionId(lastAgent.detections ? lastAgent.detections[0]?.id ?? null : null);
          }
        }
      } catch (e) {
        if (cancelled) return;
        const local = createSession();
        setSessions([local]);
        setActiveSessionId(local.id);
        setNotice('Could not load your previous chats \u2014 this session is local only.');
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally keyed on the user's id, not the `user` object itself —
    // this should only re-run on an actual sign-in/sign-out/account switch,
    // not whenever Supabase hands back a new (but same-identity) user
    // object after a background token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    persistUi({
      selectedModel,
      activeSessionId,
      userId: user?.id,
      inputText,
      beforeImage,
      afterImage,
    });
  }, [selectedModel, activeSessionId, user?.id, inputText, beforeImage, afterImage]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || createSession();
  const messages = activeSession.messages || [];

  const activeMessage = messages.find((m) => m.id === activeMessageId) || null;

  const resetTurnState = () => {
    setActiveMessageId(null);
    setSelectedDetectionId(null);
    setShowChangeMap(true);
    setSliderPct(50);
    setPendingImages([]);
    setBeforeImage(null);
    setAfterImage(null);
    setNotice('');
    setInputText('');
    setIsDragOver(false);
  };

  const captureDraft = (id) => {
    if (!id) return;
    draftsRef.current[id] = {
      inputText,
      pendingImages,
      beforeImage,
      afterImage,
      selectedModel,
      activeMessageId,
      selectedDetectionId,
      showChangeMap,
      sliderPct,
    };
  };

  const applyDraft = (id, sessionMessages) => {
    const draft = draftsRef.current[id];
    if (draft) {
      setInputText(draft.inputText);
      setPendingImages(draft.pendingImages);
      setBeforeImage(draft.beforeImage || null);
      setAfterImage(draft.afterImage || null);
      setSelectedModel(draft.selectedModel);
      setActiveMessageId(draft.activeMessageId);
      setSelectedDetectionId(draft.selectedDetectionId);
      setShowChangeMap(draft.showChangeMap ?? true);
      setSliderPct(draft.sliderPct ?? 50);
      setNotice('');
      setIsDragOver(false);
      return;
    }
    resetTurnState();
    const lastAgent = [...(sessionMessages || [])].reverse().find((m) => m.role === 'agent');
    if (lastAgent) {
      setActiveMessageId(lastAgent.id);
      setSelectedDetectionId(lastAgent.detections ? lastAgent.detections[0]?.id ?? null : null);
    }
  };

  const startNewSession = async () => {
    captureDraft(activeSessionId);
    resetTurnState();
    setIsSidebarOpen(false);
    try {
      const created = await createSessionRow(user.id, 'New session');
      setSessions((prev) => [{ id: created.id, title: created.title, messages: [] }, ...prev]);
      setActiveSessionId(created.id);
      persistUi({ activeSessionId: created.id, userId: user.id });
    } catch (e) {
      const local = createSession();
      setSessions((prev) => [local, ...prev]);
      setActiveSessionId(local.id);
      setNotice('Started a local chat \u2014 it will not sync to the cloud.');
      setTimeout(() => setNotice(''), 4200);
    }
  };

  const switchSession = async (id) => {
    setIsSidebarOpen(false);
    if (id === activeSessionId) return;
    captureDraft(activeSessionId);
    setActiveSessionId(id);
    persistUi({ activeSessionId: id, userId: user?.id });

    const session = sessions.find((s) => s.id === id);
    if (session && session.messages === null) {
      setIsSessionLoading(true);
      try {
        const loaded = await fetchSessionMessages(id);
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, messages: loaded } : s)));
        applyDraft(id, loaded);
      } catch (e) {
        setNotice('Could not load that chat \u2014 try again.');
        setTimeout(() => setNotice(''), 2600);
      } finally {
        setIsSessionLoading(false);
      }
    } else {
      applyDraft(id, session?.messages || []);
    }
  };

  /* ---- image attach handling ---- */

  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;

    setPendingImages((prev) => {
      const room = 2 - prev.length;
      if (room <= 0) {
        setNotice('Max 2 images per query — remove one to add another.');
        setTimeout(() => setNotice(''), 2600);
        return prev;
      }
      const accepted = files.slice(0, room).map((file) => {
        const demoName = String(file.name).match(/demo_\d+\.png/i);
        const imageId = demoName ? demoName[0].toLowerCase() : undefined;
        return {
          id: uid('img'),
          url: URL.createObjectURL(file),
          file,
          name: file.name,
          date: '',
          imageId,
        };
      });
      if (files.length > room) {
        setNotice('Max 2 images per query — remove one to add another.');
        setTimeout(() => setNotice(''), 2600);
      }
      return [...prev, ...accepted];
    });
  }, []);

  const removePendingImage = (id) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const updatePendingDate = (id, date) => {
    setPendingImages((prev) => prev.map((img) => (img.id === id ? { ...img, date } : img)));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  /* ---- send / receive ---- */

  const handleSend = () => {
    const text = inputText.trim();
    // Allow Model 2 to work with images only (no text required)
    if (!text && pendingImages.length === 0 && selectedModel !== 'bitcd') return;
    if (isThinking) return;
    if (!selectedModel) {
      setNotice('Select a model before sending a query.');
      setTimeout(() => setNotice(''), 3200);
      return;
    }
    
    const modelOpt = MODEL_OPTIONS.find((m) => m.id === selectedModel);
    const imageCount = selectedModel === 'bitcd' 
      ? (beforeImage && afterImage ? 2 : 0)
      : pendingImages.length;
      
    if (imageCount < (modelOpt?.images || 1)) {
      setNotice(
        selectedModel === 'bitcd'
          ? 'Change detection needs two images (Before and After).'
          : 'Attach an image first.'
      );
      setTimeout(() => setNotice(''), 3200);
      return;
    }
    // For Model 2, no text query is needed - only images
    const finalText = text || (selectedModel === 'bitcd' ? '' : '');
    
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = uid('session');
      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
    }
    
    // Use separate before/after images for Model 2, otherwise use pendingImages
    const images = selectedModel === 'bitcd' 
      ? (beforeImage && afterImage ? [beforeImage, afterImage] : pendingImages)
      : pendingImages;
      
    const wasNewSession = activeSession.title === 'New session';
    const userMessage = {
      id: uid('msg'),
      role: 'user',
      text: finalText || (selectedModel === 'bitcd' ? '' : (images.length > 1 ? 'Compare these two scenes.' : 'Analyze this scene.')),
      images,
    };
    const userSequence = (activeSession.messages || []).length;
    const nextTitle = wasNewSession ? deriveTitle(userMessage.text) : activeSession.title;

    setSessions((prev) => {
      const found = prev.some((s) => s.id === sessionId);
      if (!found) {
        return [{ id: sessionId, title: nextTitle, messages: [userMessage] }, ...prev];
      }
      return prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              title: s.title === 'New session' ? nextTitle : s.title,
              messages: [...(s.messages || []), userMessage],
            }
          : s
      );
    });
    setInputText('');
    setPendingImages([]);
    if (selectedModel === 'bitcd') {
      setBeforeImage(null);
      setAfterImage(null);
    }
    setIsThinking(true);

    const canPersist = isPersistedSessionId(sessionId);
    if (canPersist && wasNewSession) {
      updateSessionTitle(sessionId, nextTitle).catch(() => {});
    }

    const persistPromise = canPersist
      ? saveUserMessage({
          userId: user.id,
          sessionId,
          sequence: userSequence,
          message: userMessage,
        }).catch(() => {
          setNotice('Reply is in this chat, but it did not save to the cloud.');
          setTimeout(() => setNotice(''), 4200);
          return { uploadedImages: [] };
        })
      : Promise.resolve({ uploadedImages: [] });

    getModelReply(finalText, images, selectedModel)
      .then((reply) => {
        const agentMessage = {
          id: uid('msg'),
          role: 'agent',
          images,
          ...reply,
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, messages: [...(s.messages || []), agentMessage] } : s
          )
        );
        setIsThinking(false);
        if (sessionId === activeSessionIdRef.current) {
          setActiveMessageId(agentMessage.id);
          setSelectedDetectionId(reply.detections ? reply.detections[0]?.id ?? null : null);
          setShowChangeMap(true);
          setSliderPct(50);
        }

        persistPromise.then(({ uploadedImages }) => {
          if (!canPersist) return;
          saveAgentMessage({
            sessionId,
            sequence: userSequence + 1,
            reply,
            uploadedImages,
          }).catch(() => {
            setNotice('Reply is in this chat, but it did not save to the cloud.');
            setTimeout(() => setNotice(''), 4200);
          });
        });
      })
      .catch((e) => {
        console.error('Model API error:', e);
        setIsThinking(false);
        setNotice('The model did not respond \u2014 try again.');
        setTimeout(() => setNotice(''), 4200);
      });
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport || activeSession.messages.length === 0) return;
    setIsGeneratingReport(true);
    try {
      const { doc, refId } = await generateSessionReport(activeSession, displayName);
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`SkyLens_${refId}_${stamp}.pdf`);
      saveReport({ sessionId: activeSessionId, generatedBy: user.id, refId }).catch(() => {});
      setNotice('Report downloaded.');
      setTimeout(() => setNotice(''), 2600);
    } catch (e) {
      setNotice('Report generation failed \u2014 try again.');
      setTimeout(() => setNotice(''), 2600);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const useSuggestion = (text) => {
    setInputText(text);
  };

  /* ---- before/after slider drag ---- */

  const onDividerPointerDown = () => {
    draggingRef.current = true;
    const onMove = (e) => {
      if (!draggingRef.current || !viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSliderPct(Math.min(96, Math.max(4, pct)));
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  };

  /* ---- suggested queries by model context ---- */

  const suggestions = (() => {
    if (selectedModel === 'grounding' || activeMessage?.model === 'grounding') {
      return ['Where are the water bodies?', 'Locate built-up structures in this scene.'];
    }
    if (selectedModel === 'bitcd' || activeMessage?.model === 'bitcd') {
      return []; // No text suggestions for Model 2 - only images
    }
    if (selectedModel === 'geochat' || activeMessage?.model === 'geochat') {
      return ['Are there any water bodies here?', 'Is there evidence of built-up expansion?'];
    }
    if (selectedModel === 'fusion' || activeMessage?.model === 'fusion') {
      return ['Analyze the optical and SAR data fusion', 'Detect features using multi-sensor data'];
    }
    return [];
  })();

  const agentResponseCount = messages.filter((m) => m.role === 'agent').length;

  if (isHistoryLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <span className="font-['Space_Mono'] text-[12px] text-[#F2EDE6]/40 tracking-wider">
          LOADING YOUR CHATS…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F2EDE6] font-['Space_Grotesk'] antialiased selection:bg-[#D4A843] selection:text-[#0A0A0F]">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={switchSession}
        onNewChat={startNewSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onOpenProfile={onOpenProfile}
      />

      <div className="lg:pl-64">
      {/* Top bar */}
      <header className="h-14 border-b border-[rgba(212,168,67,0.15)] px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden w-7 h-7 flex items-center justify-center text-[#F2EDE6]/50 hover:text-[#D4A843] transition-colors -ml-1"
            aria-label="Open chat history"
          >
            <IconMenu className="w-4 h-4" />
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="w-7 h-7 flex items-center justify-center text-[#F2EDE6]/50 hover:text-[#D4A843] transition-colors -ml-1"
              aria-label="Back to landing page"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          )}
          <div className="w-7 h-7 rounded-[4px] border border-[rgba(212,168,67,0.4)] flex items-center justify-center text-[#D4A843]">
            <IconCrosshair className="w-4 h-4" />
          </div>
          <span className="font-['Space_Mono'] text-[13px] tracking-wider text-[#F2EDE6]">
            SKYLENS 
          </span>
        </div>
        <span className="hidden sm:block font-['Space_Mono'] text-[11px] text-[#F2EDE6]/40 truncate max-w-[220px]">
          {activeSession.title === 'New session'
            ? 'New session'
            : `${activeSession.title} · ${messages.length} msgs`}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={agentResponseCount === 0 || isGeneratingReport}
            onClick={handleGenerateReport}
            className="font-['Space_Mono'] text-[11px] tracking-wider px-3 py-1.5 rounded-[4px] border border-[rgba(212,168,67,0.4)] text-[#D4A843] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[rgba(212,168,67,0.08)] transition-colors whitespace-nowrap"
          >
            {isGeneratingReport ? 'GENERATING\u2026' : 'GENERATE REPORT'}
          </button>
        </div>
      </header>

      <div className="lg:flex lg:h-[calc(100vh-56px)]">
        {/* ---------------- Left: image viewport ---------------- */}
        <div className="lg:w-[58%] h-[420px] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-[rgba(212,168,67,0.15)]">
          <div
            ref={viewportRef}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            className="relative flex-1 overflow-hidden bg-[#0D0D12]"
          >
            {activeMessage && activeMessage.images.length > 0 ? (
              <ImageStage
                message={activeMessage}
                sliderPct={sliderPct}
                onDividerPointerDown={onDividerPointerDown}
                showChangeMap={showChangeMap}
                selectedDetectionId={selectedDetectionId}
                setSelectedDetectionId={setSelectedDetectionId}
              />
            ) : selectedModel === 'bitcd' ? (
              <div className="absolute inset-4 grid grid-cols-2 gap-4 p-4">
                {/* Before Image Upload */}
                <div
                  className={`relative rounded-[4px] border border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                    beforeImage
                      ? 'border-[#D4A843] bg-[rgba(212,168,67,0.05)]'
                      : 'border-[rgba(212,168,67,0.25)]'
                  }`}
                >
      {beforeImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={beforeImage.url}
                        alt="Before"
                        className="w-full h-full object-cover rounded-[3px]"
                      />
                      <button
                        type="button"
                        onClick={() => setBeforeImage(null)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0A0A0F]/80 flex items-center justify-center text-[#F2EDE6] hover:text-[#F47216] transition-colors"
                      >
                        <IconClose className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-[#0A0A0F]/80 px-2 py-1 rounded-[2px]">
                        <span className="font-['Space_Mono'] text-[9px] text-[#D4A843] uppercase tracking-wider">
                          BEFORE
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <IconImage className="w-6 h-6 text-[#D4A843]/60" />
                      <div className="text-center px-4">
                        <p className="text-xs text-[#F2EDE6]/70">Before Image</p>
                        <p className="mt-1 font-['Space_Mono'] text-[9px] text-[#F2EDE6]/40 uppercase tracking-wider">
                          Earlier date
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setBeforeImage({
                                  id: uid('img'),
                                  url: e.target.result,
                                  file,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="font-['Space_Mono'] text-[9px] uppercase tracking-wider px-2 py-1 rounded-[3px] border border-[rgba(212,168,67,0.35)] text-[#F2EDE6]/70 hover:text-[#D4A843]"
                      >
                        Upload
                      </button>
                    </>
                  )}
                </div>

                {/* After Image Upload */}
                <div
                  className={`relative rounded-[4px] border border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                    afterImage
                      ? 'border-[#D4A843] bg-[rgba(212,168,67,0.05)]'
                      : 'border-[rgba(212,168,67,0.25)]'
                  }`}
                >
                  {afterImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={afterImage.url}
                        alt="After"
                        className="w-full h-full object-cover rounded-[3px]"
                      />
                      <button
                        type="button"
                        onClick={() => setAfterImage(null)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0A0A0F]/80 flex items-center justify-center text-[#F2EDE6] hover:text-[#F47216] transition-colors"
                      >
                        <IconClose className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-[#0A0A0F]/80 px-2 py-1 rounded-[2px]">
                        <span className="font-['Space_Mono'] text-[9px] text-[#D4A843] uppercase tracking-wider">
                          AFTER
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <IconImage className="w-6 h-6 text-[#D4A843]/60" />
                      <div className="text-center px-4">
                        <p className="text-xs text-[#F2EDE6]/70">After Image</p>
                        <p className="mt-1 font-['Space_Mono'] text-[9px] text-[#F2EDE6]/40 uppercase tracking-wider">
                          Later date
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setAfterImage({
                                  id: uid('img'),
                                  url: e.target.result,
                                  file,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="font-['Space_Mono'] text-[9px] uppercase tracking-wider px-2 py-1 rounded-[3px] border border-[rgba(212,168,67,0.35)] text-[#F2EDE6]/70 hover:text-[#D4A843]"
                      >
                        Upload
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : pendingImages.length > 0 ? (
              <PendingStage images={pendingImages} />
            ) : (
              <div
                className={`absolute inset-4 rounded-[4px] border border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                  isDragOver
                    ? 'border-[#D4A843] bg-[rgba(212,168,67,0.05)]'
                    : 'border-[rgba(212,168,67,0.25)]'
                }`}
              >
                <IconImage className="w-8 h-8 text-[#D4A843]/60" />
                <div className="text-center px-6">
                  <p className="text-sm text-[#F2EDE6]/70">
                    {selectedModel
                      ? 'Drop a satellite scene, then ask your question'
                      : 'Select a model, then drop 1–2 images'}
                  </p>
                  <p className="mt-1.5 font-['Space_Mono'] text-[10px] text-[#F2EDE6]/40 uppercase tracking-wider">
                    {selectedModel
                      ? MODEL_OPTIONS.find((m) => m.id === selectedModel)?.hint
                      : 'VQA · Grounding · Change detection'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-['Space_Mono'] text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-[4px] border border-[rgba(212,168,67,0.35)] text-[#F2EDE6]/70 hover:text-[#D4A843]"
                >
                  Upload image
                </button>
              </div>
            )}

            {activeMessage?.model === 'bitcd' && (
              <button
                onClick={() => setShowChangeMap((v) => !v)}
                className="absolute top-3 right-3 font-['Space_Mono'] text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-[4px] border border-[rgba(212,168,67,0.4)] bg-[#141418]/90 text-[#D4A843]"
              >
                Change Map: {showChangeMap ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          {/* Detection chips */}
          {activeMessage?.detections && (
            <div className="px-4 py-2.5 border-t border-[rgba(212,168,67,0.15)] flex flex-wrap gap-2">
              {activeMessage.detections.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDetectionId(d.id)}
                  className={`font-['Space_Mono'] text-[10px] px-2.5 py-1 rounded-[3px] border flex items-center gap-1.5 transition-colors ${
                    selectedDetectionId === d.id
                      ? 'border-[#D4A843] text-[#D4A843] bg-[rgba(212,168,67,0.08)]'
                      : 'border-[rgba(212,168,67,0.2)] text-[#F2EDE6]/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedDetectionId === d.id ? 'bg-[#D4A843]' : 'bg-[#F2EDE6]/30'
                    }`}
                  />
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Fusion results chips */}
          {activeMessage?.fusionResults && (
            <div className="px-4 py-2.5 border-t border-[rgba(212,168,67,0.15)] flex flex-wrap gap-2">
              {activeMessage.fusionResults.map((f) => (
                <button
                  key={f.id}
                  className={`font-['Space_Mono'] text-[10px] px-2.5 py-1 rounded-[3px] border flex items-center gap-1.5 transition-colors border-[rgba(212,168,67,0.2)] text-[#F2EDE6]/60`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F2EDE6]/30" />
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Metadata bar */}
          <div className="px-4 py-2.5 border-t border-[rgba(212,168,67,0.15)] flex items-center justify-between font-['Space_Mono'] text-[10px] text-[#F2EDE6]/40 uppercase tracking-wider">
            <div className="flex gap-5">
              <span>RES {activeMessage ? '10 m/px' : '—'}</span>
              <span className="hidden sm:inline">CLOUD {activeMessage ? '3.2%' : '—'}</span>
              <span className="hidden md:inline">
                IMAGES {activeMessage ? activeMessage.images.length : 0}
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isThinking
                    ? 'bg-[#F47216] animate-pulse'
                    : activeMessage
                    ? 'bg-[#D4A843]'
                    : 'bg-[#F2EDE6]/20'
                }`}
              />
              {isThinking ? 'PROCESSING' : activeMessage ? 'AWAITING REVIEW' : 'AWAITING INPUT'}
            </span>
          </div>
        </div>

        {/* ---------------- Right: query terminal ---------------- */}
        <div className="lg:w-[42%] flex flex-col min-h-[520px] lg:min-h-0">
          <div className="px-4 py-2.5 border-b border-[rgba(212,168,67,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/40 uppercase tracking-wider">
                Query Terminal
              </span>
              {activeMessage && (
                <span className="font-['Space_Mono'] text-[10px] text-[#D4A843]">
                  {MODEL_META[activeMessage.model]?.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MODEL_OPTIONS.map((m) => {
                const active = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`rounded-[4px] border px-2 py-1.5 text-center transition-colors ${
                      active
                        ? 'border-[#D4A843] bg-[rgba(212,168,67,0.1)] text-[#D4A843]'
                        : 'border-[rgba(212,168,67,0.18)] text-[#F2EDE6]/45 hover:border-[rgba(212,168,67,0.4)] hover:text-[#F2EDE6]/80'
                    }`}
                  >
                    <span className="block font-['Space_Mono'] text-[9px] uppercase tracking-wider">
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {!selectedModel && (
              <p className="mt-2 font-['Space_Mono'] text-[9px] text-[#F47216]/80 uppercase tracking-wider">
                Select a model to begin
              </p>
            )}
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {isSessionLoading && (
              <div className="font-['Space_Mono'] text-[11px] text-[#D4A843]/70 tracking-wider">
                LOADING SESSION…
              </div>
            )}
            {!isSessionLoading && messages.length === 0 && (
              <div className="text-sm text-[#F2EDE6]/50 leading-relaxed">
                Choose VQA, Grounding, or Change detection, attach imagery, then send a query.
                Previous sessions stay in the sidebar and reload when you come back.
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble
                  key={m.id}
                  message={m}
                  onViewImages={() => setActiveMessageId(m.id)}
                />
              ) : (
                <AgentBubble
                  key={m.id}
                  message={m}
                  isActive={m.id === activeMessageId}
                  onFocus={() => {
                    setActiveMessageId(m.id);
                    setSelectedDetectionId(m.detections ? m.detections[0]?.id ?? null : null);
                  }}
                />
              )
            )}

            {isThinking && (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A843]/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A843]/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A843]/60 animate-bounce" />
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => useSuggestion(s)}
                className="text-left text-[11px] text-[#F2EDE6]/60 border border-[rgba(212,168,67,0.15)] rounded-[4px] px-3 py-1.5 hover:border-[rgba(212,168,67,0.35)] hover:text-[#F2EDE6]/90 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Pending image attachments */}
          {(pendingImages.length > 0 || notice) && (
            <div className="px-4 pb-2">
              {notice && (
                <p className="text-[11px] text-[#F47216] mb-2 font-['Space_Mono']">{notice}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {pendingImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative w-16 rounded-[4px] overflow-hidden border border-[rgba(212,168,67,0.3)]"
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-16 h-16 object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = model1PlaceholderDataUrl();
                      }}
                    />
                    <button
                      onClick={() => removePendingImage(img.id)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#0A0A0F]/80 flex items-center justify-center text-[#F2EDE6]"
                    >
                      <IconClose className="w-2.5 h-2.5" />
                    </button>
                    {pendingImages.length === 2 && (
                      <input
                        value={img.date}
                        onChange={(e) => updatePendingDate(img.id, e.target.value)}
                        placeholder="date"
                        className="w-full bg-[#141418] text-[9px] font-['Space_Mono'] text-[#D4A843] text-center py-0.5 outline-none placeholder:text-[#F2EDE6]/25"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input row */}
          <div className="p-4 border-t border-[rgba(212,168,67,0.15)]">
            <div className="flex items-center gap-2 bg-[#141418] border border-[rgba(212,168,67,0.2)] rounded-[4px] pl-2 pr-1.5 py-1.5 focus-within:border-[rgba(212,168,67,0.5)] transition-colors">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 flex items-center justify-center text-[#F2EDE6]/50 hover:text-[#D4A843] transition-colors shrink-0"
                aria-label="Attach image"
              >
                <IconAttach className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={
                  !selectedModel
                    ? 'Select a model first…'
                    : selectedModel === 'bitcd'
                    ? 'Upload two images and send (no text needed)'
                    : 'Ask about this scene…'
                }
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#F2EDE6]/30 min-w-0"
              />
              <button
                onClick={handleSend}
                disabled={
                  isThinking ||
                  !selectedModel ||
                  (selectedModel !== 'bitcd' && !inputText.trim() && pendingImages.length === 0) ||
                  (selectedModel === 'bitcd' && (!beforeImage || !afterImage))
                }
                className="w-8 h-8 rounded-[3px] bg-[#F47216] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#F2EDE6] shrink-0 transition-opacity"
                aria-label="Send"
              >
                <IconSend className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 font-['Space_Mono'] text-[9px] text-[#F2EDE6]/30 uppercase tracking-wider text-center">
              {selectedModel
                ? MODEL_OPTIONS.find((m) => m.id === selectedModel)?.hint
                : 'No model selected'}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  isOpen,
  onClose,
  displayName,
  avatarUrl,
  onOpenProfile,
}) {
  const initials =
    (displayName || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0A0A0F] border-r border-[rgba(212,168,67,0.15)] flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-[rgba(212,168,67,0.15)]">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 font-['Space_Mono'] text-[11px] tracking-wider uppercase px-3 py-2.5 rounded-[4px] border border-[rgba(212,168,67,0.4)] text-[#D4A843] hover:bg-[rgba(212,168,67,0.08)] transition-colors"
          >
            <IconAttach className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>

        <div className="px-4 pt-4 pb-2 font-['Space_Mono'] text-[10px] text-[#F2EDE6]/40 uppercase tracking-wider">
          Sessions
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {sessions.map((s) => {
            const active = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-left transition-colors ${
                  active ? 'bg-[rgba(212,168,67,0.08)]' : 'hover:bg-[#141418]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    active ? 'bg-[#F47216]' : 'border border-[#F2EDE6]/25'
                  }`}
                />
                <span
                  className={`text-[13px] truncate ${
                    active ? 'text-[#F2EDE6] font-medium' : 'text-[#F2EDE6]/55'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 px-4 py-3.5 border-t border-[rgba(212,168,67,0.15)] hover:bg-[#141418] transition-colors text-left"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[rgba(212,168,67,0.12)] border border-[rgba(212,168,67,0.3)] flex items-center justify-center font-['Space_Mono'] text-[10px] text-[#D4A843] shrink-0">
              {initials}
            </div>
          )}
          <span className="text-[13px] text-[#F2EDE6]/80 truncate">{displayName}</span>
        </button>
      </aside>
    </>
  );
}

function PendingStage({ images }) {
  if (images.length >= 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-2">
        {images.slice(0, 2).map((img) => (
          <img
            key={img.id}
            src={img.url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = model1PlaceholderDataUrl();
            }}
          />
        ))}
      </div>
    );
  }

  const img = images[0];
  return (
    <div className="absolute inset-0">
      <img
        src={img.url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = model1PlaceholderDataUrl();
        }}
      />
    </div>
  );
}

function ImageStage({
  message,
  sliderPct,
  onDividerPointerDown,
  showChangeMap,
  selectedDetectionId,
  setSelectedDetectionId,
}) {
  const [imgA, imgB] = message.images;

  if (message.model === 'bitcd' && imgA && imgB) {
    return (
      <div className="absolute inset-0 select-none">
        <img src={imgB.url} alt="After" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
        >
          <img src={imgA.url} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        {showChangeMap &&
          message.changeRegions?.map((r) => (
            <div
              key={r.id}
              className="absolute rounded-[3px] pointer-events-none"
              style={{
                top: `${r.top}%`,
                left: `${r.left}%`,
                width: `${r.width}%`,
                height: `${r.height}%`,
                background: 'rgba(212, 168, 67, 0.28)',
                boxShadow: '0 0 24px rgba(212, 168, 67, 0.5)',
                border: '1px solid rgba(212, 168, 67, 0.7)',
              }}
            >
              <span className="absolute -top-5 left-0 bg-[#141418] text-[#D4A843] font-['Space_Mono'] text-[9px] px-1.5 py-0.5 border border-[rgba(212,168,67,0.4)] rounded-[2px] whitespace-nowrap">
                {r.label}
              </span>
            </div>
          ))}

        <div
          onMouseDown={onDividerPointerDown}
          onTouchStart={onDividerPointerDown}
          className="absolute top-0 bottom-0 w-[2px] bg-[#D4A843] cursor-ew-resize"
          style={{ left: `${sliderPct}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full bg-[#D4A843] flex items-center justify-center text-[#0A0A0F] text-[10px] shadow-lg">
            ↔
          </div>
        </div>

        <span className="absolute bottom-3 left-3 font-['Space_Mono'] text-[9px] text-[#F2EDE6]/70 bg-[#0A0A0F]/60 px-2 py-1 rounded-[3px]">
          {imgA.date || 'BEFORE'}
        </span>
        <span className="absolute bottom-3 right-3 font-['Space_Mono'] text-[9px] text-[#F2EDE6]/70 bg-[#0A0A0F]/60 px-2 py-1 rounded-[3px]">
          {imgB.date || 'AFTER'}
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <img
        src={imgA.url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = model1PlaceholderDataUrl();
        }}
      />
      {message.detections?.map((d) => {
        const selected = d.id === selectedDetectionId;
        return (
          <div
            key={d.id}
            onClick={() => setSelectedDetectionId(d.id)}
            className="absolute rounded-[2px] cursor-pointer transition-all"
            style={{
              top: `${d.top}%`,
              left: `${d.left}%`,
              width: `${d.width}%`,
              height: `${d.height}%`,
              border: `2px solid ${selected ? '#D4A843' : 'rgba(212,168,67,0.55)'}`,
              boxShadow: selected ? '0 0 14px rgba(212,168,67,0.6)' : 'none',
            }}
          >
            <span className="absolute -top-5 left-0 bg-[#141418] text-[#D4A843] font-['Space_Mono'] text-[9px] px-1.5 py-0.5 border border-[rgba(212,168,67,0.4)] rounded-[2px] whitespace-nowrap">
              {d.label} · {d.confidence}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function UserBubble({ message, onViewImages }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-[#141418] border border-[rgba(212,168,67,0.2)] rounded-[4px] px-3.5 py-2.5">
        {message.images.length > 0 && (
          <button onClick={onViewImages} className="flex gap-1.5 mb-2">
            {message.images.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt=""
                className="w-10 h-10 object-cover rounded-[3px] border border-[rgba(212,168,67,0.25)]"
              />
            ))}
          </button>
        )}
        <p className="text-sm text-[#F2EDE6]">{message.text}</p>
      </div>
    </div>
  );
}

function AgentBubble({ message, isActive, onFocus }) {
  return (
    <div className="flex justify-start">
      <div
        onClick={onFocus}
        className={`max-w-[90%] rounded-[4px] px-3.5 py-2.5 border cursor-pointer transition-colors ${
          isActive
            ? 'border-[rgba(212,168,67,0.4)] bg-[rgba(212,168,67,0.04)]'
            : 'border-[rgba(212,168,67,0.12)]'
        }`}
      >
        <p className="text-sm text-[#F2EDE6] leading-relaxed">{message.text}</p>
        {message.evidence && (
          <p className="mt-2 font-['Space_Mono'] text-[10px] text-[#D4A843]/70 leading-snug">
            {message.evidence}
          </p>
        )}

        {message.detections && (
          <ul className="mt-2 space-y-1">
            {message.detections.map((d, i) => (
              <li key={d.id} className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60">
                {i + 1}. {d.label} · {d.confidence}% · {d.area} km²
              </li>
            ))}
          </ul>
        )}

        {message.changeRegions && (
          <ul className="mt-2 space-y-1">
            {message.changeRegions.map((r, i) => (
              <li key={r.id} className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60">
                {i + 1}. {r.label}
              </li>
            ))}
          </ul>
        )}

        {/* Model 2 detailed metrics - Structured Format */}
        {message.apiData && (
          <div className="mt-3 pt-3 border-t border-[rgba(212,168,67,0.15)]">
            {/* Header */}
            <div className="text-center mb-3">
              <span className="font-['Space_Mono'] text-[11px] text-[#D4A843] uppercase tracking-widest border border-[rgba(212,168,67,0.3)] px-3 py-1 rounded-[4px]">
                Satellite Change Detection
              </span>
            </div>

            {/* Uploaded Images with Change Mask Overlay */}
            {message.images && message.images.length >= 2 && (
              <div className="mb-3">
                <div className="font-['Space_Mono'] text-[9px] text-[#D4A843]/70 uppercase tracking-wider mb-2">
                  Images with Change Mask Overlay
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative h-40 bg-[#14141c] rounded-[3px] border border-[rgba(212,168,67,0.2)] overflow-hidden">
                    <img
                      src={message.images[0].url}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                    {message.changeMaskUrl && (
                      <img
                        src={message.changeMaskUrl}
                        alt="Change Mask"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-[#0A0A0F]/80 px-2 py-1">
                      <div className="font-['Space_Mono'] text-[9px] text-[#D4A843]/90 uppercase tracking-wider">
                        BEFORE
                      </div>
                    </div>
                  </div>
                  <div className="relative h-40 bg-[#14141c] rounded-[3px] border border-[rgba(212,168,67,0.2)] overflow-hidden">
                    <img
                      src={message.images[1].url}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                    {message.changeMaskUrl && (
                      <img
                        src={message.changeMaskUrl}
                        alt="Change Mask"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-[#0A0A0F]/80 px-2 py-1">
                      <div className="font-['Space_Mono'] text-[9px] text-[#D4A843]/90 uppercase tracking-wider">
                        AFTER
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Change Detection Summary - Grid */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="p-2 bg-[rgba(212,168,67,0.05)] rounded-[3px] border border-[rgba(212,168,67,0.15)] text-center">
                <div className="font-['Space_Mono'] text-[8px] text-[#D4A843]/70 uppercase tracking-wider mb-1">
                  Change Detected
                </div>
                <div className={`font-['Space_Mono'] text-[12px] font-bold ${message.changePercent > 0 ? 'text-[#F47216]' : 'text-[#F2EDE6]/50'}`}>
                  {message.changePercent > 0 ? 'YES' : 'NO'}
                </div>
              </div>
              <div className="p-2 bg-[rgba(212,168,67,0.05)] rounded-[3px] border border-[rgba(212,168,67,0.15)] text-center">
                <div className="font-['Space_Mono'] text-[8px] text-[#D4A843]/70 uppercase tracking-wider mb-1">
                  Change Area
                </div>
                <div className="font-['Space_Mono'] text-[12px] text-[#F2EDE6]">
                  {message.changePercent}%
                </div>
              </div>
            </div>

            {/* Change Mask Display */}
            {message.changeMaskUrl && (
              <div className="mb-3">
                <div className="font-['Space_Mono'] text-[9px] text-[#D4A843]/70 uppercase tracking-wider mb-2">
                  Change Detection Mask
                </div>
                <div className="relative h-48 bg-[#14141c] rounded-[3px] border border-[rgba(212,168,67,0.2)] overflow-hidden">
                  <img
                    src={message.changeMaskUrl}
                    alt="Change Mask"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Pixel Statistics */}
            {message.apiData.changedPixels !== undefined && (
              <div className="mb-3 p-2 bg-[rgba(212,168,67,0.03)] rounded-[3px] border border-[rgba(212,168,67,0.1)]">
                <div className="font-['Space_Mono'] text-[9px] text-[#D4A843]/70 uppercase tracking-wider mb-2">
                  Pixel Statistics
                </div>
                <div className="grid grid-cols-2 gap-2 font-['Space_Mono'] text-[10px] text-[#F2EDE6]/80">
                  <div>Changed Pixels: <span className="text-[#F2EDE6]">{message.apiData.changedPixels.toLocaleString()}</span></div>
                  <div>Total Pixels: <span className="text-[#F2EDE6]">{message.apiData.totalPixels?.toLocaleString() || 'N/A'}</span></div>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className="p-2 bg-[rgba(212,168,67,0.05)] rounded-[3px] border border-[rgba(212,168,67,0.15)]">
              <div className="font-['Space_Mono'] text-[9px] text-[#D4A843]/70 uppercase tracking-wider mb-1">
                AI Analysis
              </div>
              <div className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/80 leading-relaxed">
                {message.text}
              </div>
            </div>
          </div>
        )}

        {message.fusionResults && (
          <ul className="mt-2 space-y-1">
            {message.fusionResults.map((f, i) => (
              <li key={f.id} className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/60">
                {i + 1}. {f.label} · {f.confidence}%
                {f.area && ` · ${f.area} km²`}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span className="font-['Space_Mono'] text-[10px] text-[#D4A843] border border-[rgba(212,168,67,0.35)] rounded-[3px] px-1.5 py-0.5">
            {message.confidence}%
          </span>
          <span className="font-['Space_Mono'] text-[10px] text-[#F2EDE6]/35">
            {MODEL_META[message.model]?.name} · {message.responseTime}s
          </span>
        </div>
      </div>
    </div>
  );
}
