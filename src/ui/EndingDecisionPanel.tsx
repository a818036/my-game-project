import { lazy, Suspense } from 'react';

const EndingChoice = lazy(() => import('./EndingChoice').then(({ EndingChoice }) => ({ default: EndingChoice })));
const EndingResult = lazy(() => import('./EndingChoice').then(({ EndingResult }) => ({ default: EndingResult })));

interface EndingDecisionPanelProps {
  unified: boolean;
  ending: 'pending' | 'continuing' | 'chosen' | 'complete';
  reofferDue: boolean;
  chosenEnding?: string;
  busy: boolean;
  endingDraft: string;
  onRecordUnification: () => void;
  onPromptEnding: () => void;
  onContinue: () => void;
  onEndingDraftChange: (value: string) => void;
  onChooseEnding: () => void;
}

export function EndingDecisionPanel({
  unified,
  ending,
  reofferDue,
  chosenEnding,
  busy,
  endingDraft,
  onRecordUnification,
  onPromptEnding,
  onContinue,
  onEndingDraftChange,
  onChooseEnding,
}: EndingDecisionPanelProps) {
  return <>
    {!unified && <button className="quiet" disabled={busy} onClick={onRecordUnification}>記錄完成統一（開啟善後，不自動結局）</button>}
    {unified && ending === 'continuing' && reofferDue && <button className="quiet" disabled={busy} onClick={onPromptEnding}>進入大結局（仍可選擇繼續）</button>}
    {ending === 'pending' && <>
      <p>天下已統一，善後與人生仍繼續。</p>
      <button className="quiet" disabled={busy} onClick={onContinue}>選擇繼續人生</button>
      <Suspense fallback={null}>
        <EndingChoice value={endingDraft} disabled={busy} onChange={onEndingDraftChange} onChoose={onChooseEnding}/>
      </Suspense>
    </>}
    {chosenEnding && <Suspense fallback={null}><EndingResult ending={chosenEnding}/></Suspense>}
  </>;
}
