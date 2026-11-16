interface EndingReofferNoticeProps {
  due: boolean;
  busy: boolean;
  onPromptEnding: () => void;
}

export function EndingReofferNotice({ due, busy, onPromptEnding }: EndingReofferNoticeProps) {
  return <>
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {due ? '重大節點累積完成；你可以在主故事區重新選擇是否進入大結局。' : ''}
    </p>
    {due && <article className="panel notice finale-reoffer">
      <h2>人生仍在繼續；重大節點後可以重新考慮大結局。</h2>
      <p>你可以現在開啟結局選擇，也可以繼續目前人生。</p>
      <button className="quiet" disabled={busy} onClick={onPromptEnding}>進入大結局選擇（仍可選擇繼續）</button>
    </article>}
  </>;
}
