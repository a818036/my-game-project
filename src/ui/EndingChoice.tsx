import { useEffect, useRef, type FormEvent } from 'react';

interface EndingChoiceProps {
  value: string;
  disabled?: boolean;
  onChange(value: string): void;
  onChoose(): void;
}

export function EndingChoice({ value, disabled = false, onChange, onChoose }: EndingChoiceProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && value.trim()) onChoose();
  }

  return <form className="ending-choice" onSubmit={submit}>
    <label htmlFor="ending-direction">你決定的結局方向</label>
    <input
      id="ending-direction"
      aria-describedby="ending-direction-help"
      value={value}
      maxLength={80}
      placeholder="例如：歸隱故里、安頓家人後巡行天下"
      onChange={(event) => onChange(event.currentTarget.value)}
      disabled={disabled}
    />
    <p id="ending-direction-help" className="caption">只有按下確認才會記錄你的結局選擇；留白或繼續人生都不會結束這條世界線。</p>
    <button type="submit" className="primary" disabled={disabled || !value.trim()}>確認選擇結局</button>
  </form>;
}

export function EndingResult({ ending }: { ending: string }) {
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { resultRef.current?.focus(); }, [ending]);
  return <p id="ending-result" ref={resultRef} tabIndex={-1}>玩家選擇結局：{ending}</p>;
}
