'use client';

import { Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { PARTICIPANT_NAME_MAX_LENGTH } from '@/features/recommendation/limits';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

interface GroupSetupProps {
  audience?: 'duo' | 'group';
  groupNames: string[];
  onGroupNamesChange: (names: string[]) => void;
  onBack: () => void;
  onStart: () => void;
}

type GroupSetupCopy = ReturnType<typeof useLanguage>['t']['quiz']['groupSetup'];
type GroupSetupAudience = NonNullable<GroupSetupProps['audience']>;

export function GroupSetup({
  audience = 'group',
  groupNames,
  onGroupNamesChange,
  onBack,
  onStart,
}: GroupSetupProps) {
  const { t } = useLanguage();
  const state = getGroupSetupState(audience, groupNames);
  const copy = state.isDuo ? t.quiz.duoSetup : t.quiz.groupSetup;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GroupSetupHeader copy={copy} namedPeopleCount={state.namedPeople.length} />
        <ParticipantRows
          copy={copy}
          groupNames={groupNames}
          isDuo={state.isDuo}
          onGroupNamesChange={onGroupNamesChange}
          visibleNames={state.visibleNames}
        />
        <AddParticipantButton
          copy={copy}
          groupNames={groupNames}
          maxPeople={state.maxPeople}
          onGroupNamesChange={onGroupNamesChange}
          show={!state.isDuo}
        />
        <SpeakingOrderPreview copy={copy} namedPeople={state.namedPeople} />
        <StartHint canStart={state.canStart} copy={copy} />
        <GroupSetupActions
          canStart={state.canStart}
          copy={copy}
          onBack={onBack}
          onStart={onStart}
        />
      </motion.div>
    </div>
  );
}

function GroupSetupHeader({
  copy,
  namedPeopleCount,
}: {
  copy: GroupSetupCopy;
  namedPeopleCount: number;
}) {
  return (
    <div className="text-center mb-8">
      <div className="text-4xl mb-4">👥</div>
      <h2
        style={{
          color: 'var(--pc-t1)',
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontSize: '2rem',
          fontWeight: '600',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {copy.title}
      </h2>
      <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', marginTop: 6 }}>{copy.subtitle}</p>
      <p
        className="mt-4 inline-flex rounded-full px-3 py-1 text-xs"
        style={{
          background: 'var(--pc-gold-wash)',
          border: '1px solid var(--pc-gold-bd)',
          color: 'var(--pc-gold-text)',
          fontWeight: 700,
        }}
      >
        {copy.countLabel.replace('{count}', String(namedPeopleCount))}
      </p>
    </div>
  );
}

function ParticipantRows({
  copy,
  groupNames,
  isDuo,
  onGroupNamesChange,
  visibleNames,
}: {
  copy: GroupSetupCopy;
  groupNames: string[];
  isDuo: boolean;
  onGroupNamesChange: (names: string[]) => void;
  visibleNames: string[];
}) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      {visibleNames.map((name, index) => (
        <ParticipantRow
          key={index}
          copy={copy}
          groupNames={groupNames}
          index={index}
          isRemovable={!isDuo && groupNames.length > 2}
          name={name}
          onGroupNamesChange={onGroupNamesChange}
        />
      ))}
    </div>
  );
}

function ParticipantRow({
  copy,
  groupNames,
  index,
  isRemovable,
  name,
  onGroupNamesChange,
}: {
  copy: GroupSetupCopy;
  groupNames: string[];
  index: number;
  isRemovable: boolean;
  name: string;
  onGroupNamesChange: (names: string[]) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <ParticipantIndex index={index} />
      <input
        value={name}
        maxLength={PARTICIPANT_NAME_MAX_LENGTH}
        onChange={(event) =>
          onGroupNamesChange(replaceNameAtIndex(groupNames, index, event.target.value))
        }
        placeholder={copy.personPlaceholder.replace('{n}', String(index + 1))}
        className="flex-1 px-4 py-3 rounded-xl outline-none transition-all duration-200"
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t1)',
          fontSize: '0.95rem',
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = `${palette.purple}80`;
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = 'var(--pc-bd2)';
        }}
      />
      {isRemovable && (
        <RemoveParticipantButton
          onClick={() => onGroupNamesChange(removeNameAtIndex(groupNames, index))}
        />
      )}
    </div>
  );
}

function ParticipantIndex({ index }: { index: number }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs"
      style={{
        background: `${palette.purple}33`,
        color: palette.purpleLight,
        fontWeight: 700,
      }}
    >
      {index + 1}
    </div>
  );
}

function RemoveParticipantButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
      style={{ color: 'var(--pc-t3)' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = `${palette.red}1a`;
        event.currentTarget.style.color = palette.red;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
        event.currentTarget.style.color = 'var(--pc-t3)';
      }}
    >
      <Trash2 size={15} />
    </button>
  );
}

function AddParticipantButton({
  copy,
  groupNames,
  maxPeople,
  onGroupNamesChange,
  show,
}: {
  copy: GroupSetupCopy;
  groupNames: string[];
  maxPeople: number;
  onGroupNamesChange: (names: string[]) => void;
  show: boolean;
}) {
  if (!show || groupNames.length >= maxPeople) {
    return null;
  }

  return (
    <button
      onClick={() => onGroupNamesChange([...groupNames, ''])}
      className="w-full flex items-center gap-2 justify-center py-3 rounded-xl mb-6 text-sm transition-all duration-200"
      style={{
        border: '1px dashed var(--pc-bd4)',
        color: 'var(--pc-t3)',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = `${palette.purple}66`;
        event.currentTarget.style.color = palette.purpleLight;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'var(--pc-bd4)';
        event.currentTarget.style.color = 'var(--pc-t3)';
      }}
    >
      <Plus size={15} /> {copy.addPerson}
    </button>
  );
}

function SpeakingOrderPreview({
  copy,
  namedPeople,
}: {
  copy: GroupSetupCopy;
  namedPeople: string[];
}) {
  if (namedPeople.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p
          style={{
            color: 'var(--pc-t3)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {copy.orderTitle}
        </p>
        <p style={{ color: 'var(--pc-t4)', fontSize: '0.72rem' }}>{copy.orderHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {namedPeople.map((name, index) => (
          <span
            key={`${name}-${index}`}
            className="rounded-full px-3 py-1 text-xs"
            style={getSpeakingOrderPillStyle(index)}
          >
            {index + 1}. {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function StartHint({ canStart, copy }: { canStart: boolean; copy: GroupSetupCopy }) {
  if (canStart) {
    return null;
  }

  return (
    <p className="mb-4 text-center text-xs" style={{ color: 'var(--pc-t4)' }}>
      {copy.twoNamesHint}
    </p>
  );
}

function GroupSetupActions({
  canStart,
  copy,
  onBack,
  onStart,
}: {
  canStart: boolean;
  copy: GroupSetupCopy;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
        style={{
          background: 'var(--pc-ghost)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t2)',
        }}
      >
        {copy.back}
      </button>
      <button
        onClick={onStart}
        disabled={!canStart}
        className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
        style={{
          background: 'var(--pc-cta)',
          color: 'var(--pc-cta-text)',
          cursor: canStart ? 'pointer' : 'not-allowed',
          fontWeight: 700,
          opacity: canStart ? 1 : 0.5,
        }}
      >
        {copy.letsGo}
      </button>
    </div>
  );
}

function getGroupSetupState(audience: GroupSetupAudience, groupNames: string[]) {
  const isDuo = audience === 'duo';
  const maxPeople = isDuo ? 2 : 6;
  const minPeople = isDuo ? 2 : 3;
  const visibleNames = isDuo ? groupNames.slice(0, 2) : groupNames;
  const namedPeople = visibleNames.map((name) => name.trim()).filter(Boolean);

  return {
    canStart: namedPeople.length >= minPeople,
    isDuo,
    maxPeople,
    namedPeople,
    visibleNames,
  };
}

function getSpeakingOrderPillStyle(index: number) {
  const isFirst = index === 0;

  return {
    background: isFirst ? 'var(--pc-gold-wash)' : 'var(--pc-ghost)',
    border: isFirst ? '1px solid var(--pc-gold-bd)' : '1px solid var(--pc-bd2)',
    color: isFirst ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
    fontWeight: 700,
  };
}

function replaceNameAtIndex(names: string[], index: number, nextName: string) {
  return names.map((name, currentIndex) => (currentIndex === index ? nextName : name));
}

function removeNameAtIndex(names: string[], index: number) {
  return names.filter((_, currentIndex) => currentIndex !== index);
}
