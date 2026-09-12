import React, { useMemo, useState } from 'react';
import { isModel1Mcq, model1SceneLabel } from '../lib/model1Catalog';

export default function Model1ScenePicker({ pairs, onSelect, onClose }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    return (pairs || []).filter((p) => {
      if (filter === 'binary') return !isModel1Mcq(p.question);
      if (filter === 'mcq') return isModel1Mcq(p.question);
      return true;
    });
  }, [pairs, filter]);

  return (
    <div className="absolute inset-0 z-10 bg-[#0D0D12] flex flex-col">
      <div className="px-4 py-3 border-b border-[rgba(212,168,67,0.15)] flex items-center justify-between gap-3">
        <div>
          <p className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#D4A843]">
            Model 1 · VQA catalog
          </p>
          <p className="text-[12px] text-[#F2EDE6]/55 mt-0.5">
            40 BigEarthNet ground-truth pairs. Pick a scene, then send its verified question.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#F2EDE6]/50 hover:text-[#D4A843]"
        >
          Close
        </button>
      </div>

      <div className="px-4 py-2 flex gap-2 border-b border-[rgba(212,168,67,0.1)]">
        {[
          ['all', 'All'],
          ['binary', 'Yes / No'],
          ['mcq', 'Multiple choice'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`font-['Space_Mono'] text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-[3px] border ${
              filter === id
                ? 'border-[#D4A843] text-[#D4A843] bg-[rgba(212,168,67,0.08)]'
                : 'border-[rgba(212,168,67,0.2)] text-[#F2EDE6]/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.map((p) => (
          <button
            key={p.image_id}
            type="button"
            onClick={() => onSelect(p)}
            className="w-full text-left px-3 py-2.5 rounded-[4px] border border-[rgba(212,168,67,0.15)] hover:border-[rgba(212,168,67,0.4)] hover:bg-[rgba(212,168,67,0.05)] transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-['Space_Mono'] text-[10px] text-[#D4A843] tracking-wider">
                {model1SceneLabel(p.image_id)}
              </span>
              <span className="font-['Space_Mono'] text-[9px] uppercase text-[#F2EDE6]/35">
                {isModel1Mcq(p.question) ? 'MCQ' : 'Binary'} · {p.image_id}
              </span>
            </div>
            <p className="text-[12px] text-[#F2EDE6]/80 leading-snug">{p.question}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
